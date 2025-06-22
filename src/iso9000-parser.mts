import * as fs from "node:fs";
import * as path from "node:path";

export interface TermDefinition {
  id: string;
  term: string;
  englishTerm?: string;
  definition: string;
  notes?: string[];
  examples?: string[];
  remark?: string;
}

export interface CategoryData {
  id: string;
  name: string;
  terms: TermDefinition[];
}

export interface Iso9000Document {
  metadata: {
    title: string;
    extractedAt: string;
    totalTerms: number;
    totalCategories: number;
  };
  categories: CategoryData[];
}

export class Iso9000Parser {
  private lines: string[] = [];
  private currentIndex = 0;

  public async parseHtmlFile(filePath: string): Promise<Iso9000Document> {
    const htmlContent = await fs.promises.readFile(filePath, "utf-8");
    return this.parseHtml(htmlContent);
  }

  public parseHtml(htmlContent: string): Iso9000Document {
    // Extract all <p> tag contents
    this.lines = this.extractParagraphs(htmlContent);
    this.currentIndex = 0;

    const categories: CategoryData[] = [];
    let totalTerms = 0;

    // Find title from HTML
    const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch?.[1]?.trim() || "ISO 9000 Terms";

    while (this.currentIndex < this.lines.length) {
      const categoryInfo = this.findNextCategory();
      if (!categoryInfo) break;

      const terms = this.parseTermsInCategory();
      if (terms.length > 0) {
        categories.push({
          id: categoryInfo.id,
          name: categoryInfo.title,
          terms,
        });
        totalTerms += terms.length;
      }
    }

    return {
      metadata: {
        title,
        extractedAt: new Date().toISOString(),
        totalTerms,
        totalCategories: categories.length,
      },
      categories,
    };
  }

  private extractParagraphs(htmlContent: string): string[] {
    const paragraphPattern = /<p[^>]*>([^<]*)<\/p>/gi;
    const paragraphs: string[] = [];
    let match;

    while ((match = paragraphPattern.exec(htmlContent)) !== null) {
      const content = match[1]?.trim();
      if (content) {
        paragraphs.push(content);
      }
    }

    return paragraphs;
  }

  private findNextCategory(): { id: string; title: string } | null {
    // Look for category ID pattern (3.x)
    const categoryIdPattern = /^3\.(\d+)$/;

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex]?.trim();
      if (!line) {
        this.currentIndex++;
        continue;
      }

      const match = categoryIdPattern.exec(line);

      if (match) {
        const categoryId = line;
        this.currentIndex++;

        // Next line should be the category title
        if (this.currentIndex < this.lines.length) {
          const categoryTitle = this.lines[this.currentIndex]?.trim();
          if (categoryTitle) {
            this.currentIndex++;
            return { id: categoryId, title: categoryTitle };
          }
        }
      }
      this.currentIndex++;
    }

    return null;
  }

  private parseTermsInCategory(): TermDefinition[] {
    const terms: TermDefinition[] = [];
    const termIdPattern = /^3\.(\d+)\.(\d+)$/;

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex]?.trim();
      if (!line) {
        this.currentIndex++;
        continue;
      }

      // Check for next category (3.x pattern)
      if (/^3\.(\d+)$/.test(line)) {
        // Found next category, stop parsing terms
        break;
      }

      // Check for term ID (3.x.y pattern)
      const termMatch = termIdPattern.exec(line);
      if (termMatch) {
        const term = this.parseSingleTerm();
        if (term) {
          terms.push(term);
        }
      } else {
        this.currentIndex++;
      }
    }

    return terms;
  }

  private parseSingleTerm(): TermDefinition | null {
    if (this.currentIndex >= this.lines.length) return null;

    const termId = this.lines[this.currentIndex]?.trim();
    if (!termId) return null;
    this.currentIndex++;

    // Parse term name (could span multiple lines)
    const { term, englishTerm } = this.parseTermNameMultiLine();

    // Parse definition and additional content
    const { definition, notes, examples, remark } = this.parseTermContent();

    if (!definition) return null;

    const termDef: TermDefinition = {
      id: termId,
      term,
      definition,
    };

    if (englishTerm) termDef.englishTerm = englishTerm;
    if (notes.length > 0) termDef.notes = notes;
    if (examples.length > 0) termDef.examples = examples;
    if (remark) termDef.remark = remark;

    return termDef;
  }

  private parseTermNameMultiLine(): { term: string; englishTerm?: string } {
    let termNameContent = "";

    // Collect term name lines until we hit a definition or next term
    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex]?.trim();
      if (!line) {
        this.currentIndex++;
        continue;
      }

      // Check if this looks like a definition (contains Japanese text with periods)
      // or is a new term/category ID
      if (/^3\.(\d+)\.(\d+)$/.test(line) || /^3\.(\d+)$/.test(line)) {
        // This is a new term/category, stop
        break;
      }

      // Check if this line contains definitive definition markers
      if (this.isDefinitionLine(line)) {
        break;
      }

      // Add to term name content
      if (termNameContent) {
        termNameContent += line;
      } else {
        termNameContent = line;
      }

      this.currentIndex++;
    }

    return this.parseTermName(termNameContent);
  }

  private isDefinitionLine(line: string): boolean {
    // Heuristic to detect if a line is part of definition rather than term name
    // Definition lines typically contain specific Japanese grammatical patterns
    const definitionPatterns = [
      /を|に|が|の|で|は|と|より|から|まで|について|に関して|において|によって/, // Japanese particles
      /である|です|だ|する|される|できる|もつ|ある|いる|なる|つ|。/, // Japanese verbs/endings
      /組織\(|システム\(|プロセス\(|活動\(|状況\(|情報\(/, // References to other terms
    ];

    return definitionPatterns.some((pattern) => pattern.test(line));
  }

  private parseTermName(termNameLine: string): { term: string; englishTerm?: string } {
    // Check for English term in parentheses
    const englishMatch = termNameLine.match(/^([^（(]+)\s*[（(]([^）)]+)[）)]/);

    if (englishMatch && englishMatch[1] && englishMatch[2]) {
      return {
        term: englishMatch[1].trim(),
        englishTerm: englishMatch[2].trim(),
      };
    }

    return { term: termNameLine };
  }

  private parseTermContent(): {
    definition: string;
    notes: string[];
    examples: string[];
    remark?: string;
  } {
    let definition = "";
    const notes: string[] = [];
    const examples: string[] = [];
    let remark: string | undefined;

    let currentState: "definition" | "note" | "example" = "definition";
    let currentContent = "";

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex]?.trim();
      if (!line) {
        this.currentIndex++;
        continue;
      }

      // Check for next term or category
      if (/^3\.(\d+)\.(\d+)$/.test(line) || /^3\.(\d+)$/.test(line)) {
        break;
      }

      // Check for remark (must be fully enclosed in parentheses or brackets)
      if (this.isRemarkLine(line)) {
        // Save previous content
        if (currentState === "definition" && currentContent) {
          definition = currentContent.trim();
        } else if (currentState === "note" && currentContent) {
          notes.push(currentContent.trim());
        } else if (currentState === "example" && currentContent) {
          examples.push(currentContent.trim());
        }

        remark = line; // Remark is always a single line
        currentContent = "";
        this.currentIndex++;
        continue;
      }

      // Check for special content types
      if (line.startsWith("注記")) {
        // Save previous content
        if (currentState === "definition" && currentContent) {
          definition = currentContent.trim();
        } else if (currentState === "note" && currentContent) {
          notes.push(currentContent.trim());
        } else if (currentState === "example" && currentContent) {
          examples.push(currentContent.trim());
        }

        currentState = "note";
        currentContent = line;
      } else if (line.startsWith("例")) {
        // Save previous content
        if (currentState === "definition" && currentContent) {
          definition = currentContent.trim();
        } else if (currentState === "note" && currentContent) {
          notes.push(currentContent.trim());
        } else if (currentState === "example" && currentContent) {
          examples.push(currentContent.trim());
        }

        currentState = "example";
        currentContent = line;
      } else {
        // Continue current content
        if (currentContent) {
          currentContent += line;
        } else {
          currentContent = line;
        }
      }

      this.currentIndex++;
    }

    // Save final content
    if (currentState === "definition" && currentContent) {
      definition = currentContent.trim();
    } else if (currentState === "note" && currentContent) {
      notes.push(currentContent.trim());
    } else if (currentState === "example" && currentContent) {
      examples.push(currentContent.trim());
    }

    const result: { definition: string; notes: string[]; examples: string[]; remark?: string } = {
      definition,
      notes,
      examples,
    };

    if (remark) {
      result.remark = remark;
    }

    return result;
  }

  private isRemarkLine(line: string): boolean {
    // Check if line is fully enclosed in parentheses or brackets
    return (line.startsWith("（") && line.endsWith("）")) || (line.startsWith("［") && line.endsWith("］"));
  }

  public async saveToJsonFile(document: Iso9000Document, outputPath: string): Promise<void> {
    const jsonString = JSON.stringify(document, null, 2);
    await fs.promises.writeFile(outputPath, jsonString, "utf-8");
  }

  public static async parseAndSave(inputPath: string, outputPath: string): Promise<void> {
    const parser = new Iso9000Parser();
    const document = await parser.parseHtmlFile(inputPath);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, { recursive: true });

    await parser.saveToJsonFile(document, outputPath);
    console.log(`Parsed ${document.metadata.totalTerms} terms from ${document.metadata.totalCategories} categories`);
    console.log(`Output saved to: ${outputPath}`);
  }
}
