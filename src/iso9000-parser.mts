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
        const term = this.parseSingleTermWithId(line);
        if (term) {
          terms.push(term);
        }
        // parseSingleTermWithId handles currentIndex increment
      } else {
        this.currentIndex++;
      }
    }

    return terms;
  }

  private parseSingleTermWithId(termId: string): TermDefinition | null {
    // Move to next line (term name)
    this.currentIndex++;

    // Parse term name (always exactly one line after term ID)
    const { term, englishTerm } = this.parseTermName();

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

  private parseTermName(): { term: string; englishTerm?: string } {
    if (this.currentIndex >= this.lines.length) {
      return { term: "" };
    }

    const termNameLine = this.lines[this.currentIndex]?.trim() || "";
    this.currentIndex++;

    // Handle complex cases with multiple terms and parentheses
    // Pattern: "term1（english1），term2（english2），term3（english3）..."
    const hasMultipleTermsWithParentheses = /（[^）]+），[^（]+（[^）]+）/.test(termNameLine);

    if (hasMultipleTermsWithParentheses) {
      const { japaneseTerms, englishTerms } = this.parseMultipleTermsWithParentheses(termNameLine);
      return {
        term: japaneseTerms.join("，"),
        englishTerm: englishTerms.join(", "),
      };
    }

    // Standard pattern: "japanese（english）"
    const englishMatch = termNameLine.match(/^([^（]+)（([^）]+)）/);
    if (englishMatch && englishMatch[1] && englishMatch[2]) {
      const japanesePart = englishMatch[1].trim();
      const englishPart = englishMatch[2].trim();

      // Handle comma-separated terms within parentheses
      const processedJapanese = this.processCommaSeparatedTerms(japanesePart);
      const processedEnglish = this.processCommaSeparatedTerms(englishPart);

      return {
        term: processedJapanese,
        englishTerm: processedEnglish,
      };
    }

    // Handle comma-separated terms even without English part
    const processedTerm = this.processCommaSeparatedTerms(termNameLine);
    return { term: processedTerm };
  }

  private parseMultipleTermsWithParentheses(input: string): { japaneseTerms: string[]; englishTerms: string[] } {
    const japaneseTerms: string[] = [];
    const englishTerms: string[] = [];

    // Split by full-width comma and process each part
    const parts = input.split("，");

    for (const part of parts) {
      const trimmedPart = part.trim();

      // Check if this part has parentheses
      const match = trimmedPart.match(/^([^（]+)（([^）]+)）/);
      if (match && match[1] && match[2]) {
        japaneseTerms.push(match[1].trim());
        // Clean up English term by removing extra whitespace and newlines
        const englishTerm = match[2].trim().replace(/\s+/g, " ");
        englishTerms.push(englishTerm);
      } else {
        // If no parentheses, treat as Japanese term only
        japaneseTerms.push(trimmedPart);
      }
    }

    return { japaneseTerms, englishTerms };
  }

  private processCommaSeparatedTerms(input: string): string {
    // Check if the input contains comma separators
    if (input.includes("，")) {
      // Split by full-width comma and clean up each part
      const parts = input.split("，").map((part) => part.trim());
      return parts.join("，");
    } else if (input.includes(",")) {
      // Split by regular comma and clean up each part
      const parts = input.split(",").map((part) => part.trim());
      return parts.join(", ");
    }

    return input;
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
        if (currentState === "definition" && currentContent.trim()) {
          definition = currentContent.trim();
        } else if (currentState === "note" && currentContent.trim()) {
          notes.push(currentContent.trim());
        } else if (currentState === "example" && currentContent.trim()) {
          examples.push(currentContent.trim());
        }
        remark = this.cleanRemarkContent(line);
        currentContent = "";
        this.currentIndex++;
        continue;
      }

      // Check for special content types
      if (line.startsWith("注記")) {
        // Save previous content and start new note
        if (currentState === "definition" && currentContent.trim()) {
          definition = currentContent.trim();
        } else if (currentState === "note" && currentContent.trim()) {
          notes.push(this.cleanNoteContent(currentContent.trim()));
        } else if (currentState === "example" && currentContent.trim()) {
          examples.push(this.cleanExampleContent(currentContent.trim()));
        }
        currentState = "note";
        currentContent = line;
      } else if (line.startsWith("例")) {
        // Save previous content and start new example
        if (currentState === "definition" && currentContent.trim()) {
          definition = currentContent.trim();
        } else if (currentState === "note" && currentContent.trim()) {
          notes.push(this.cleanNoteContent(currentContent.trim()));
        } else if (currentState === "example" && currentContent.trim()) {
          examples.push(this.cleanExampleContent(currentContent.trim()));
        }
        currentState = "example";
        currentContent = line;
      } else {
        // Continue current content - concatenate with space if needed
        if (currentContent) {
          currentContent += line;
        } else {
          currentContent = line;
        }
      }

      this.currentIndex++;
    }

    // Save final content
    if (currentState === "definition" && currentContent.trim()) {
      definition = currentContent.trim();
    } else if (currentState === "note" && currentContent.trim()) {
      notes.push(this.cleanNoteContent(currentContent.trim()));
    } else if (currentState === "example" && currentContent.trim()) {
      examples.push(this.cleanExampleContent(currentContent.trim()));
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

  private cleanNoteContent(content: string): string {
    // Remove "注記 ", "注記1 ", "注記2 ", etc. from the beginning
    return content.replace(/^注記\d*\s+/, "");
  }

  private cleanExampleContent(content: string): string {
    // Remove "例 " from the beginning
    return content.replace(/^例\s+/, "");
  }

  private cleanRemarkContent(content: string): string {
    // Remove "（" from the beginning and "）" from the end
    return content.replace(/^（/, "").replace(/）$/, "");
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
