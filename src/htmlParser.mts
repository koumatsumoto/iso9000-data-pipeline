import * as fs from "node:fs";

export interface TermDefinition {
  id: string;
  term: string;
  englishTerm?: string;
  definition: string;
  category: string;
  notes?: string[];
  examples?: string[];
}

export interface Iso9000Document {
  title: string;
  version: string;
  categories: Record<string, TermDefinition[]>;
}

export class HtmlParser {
  /**
   * Parse the ISO 9000 HTML file and extract term definitions
   */
  public parseIso9000Html(htmlContent: string): Iso9000Document {
    const result: Iso9000Document = {
      title: "JISQ9000:2015 品質マネジメントシステム－基本及び用語",
      version: "2015",
      categories: {},
    };

    // Extract terms and definitions using regex patterns
    const termSections = this.extractTermSections(htmlContent);

    for (const section of termSections) {
      const categoryName = this.extractCategoryName(section);
      const terms = this.extractTerms(section);

      if (categoryName && terms.length > 0) {
        // Set category for each term
        terms.forEach((term) => {
          term.category = categoryName;
        });
        result.categories[categoryName] = terms;
      }
    }

    return result;
  }

  /**
   * Extract term sections from HTML content
   */
  private extractTermSections(htmlContent: string): string[] {
    const sections: string[] = [];

    // Find all sections that contain term categories (3.1, 3.2, etc.) - not in TOC
    const categoryPattern = /<p[^>]*class="ft03"[^>]*>\s*(3\.\d+)\s*<\/p>\s*<p[^>]*class="ft03"[^>]*>\s*([^<]*用語[^<]*)\s*<\/p>/gi;
    const categoryMatches = [...htmlContent.matchAll(categoryPattern)];

    for (let i = 0; i < categoryMatches.length; i++) {
      const match = categoryMatches[i];
      if (!match || match.index === undefined) continue;

      // Extract the content between this section and the next major section
      const sectionStart = match.index;

      // Find the next category or end section
      const nextMatch = categoryMatches[i + 1];
      const nextSectionPattern = /<p[^>]*class="ft03"[^>]*>\s*(4\.|附属書|参考文献)/gi;
      nextSectionPattern.lastIndex = sectionStart + match[0].length;
      const endMatch = nextSectionPattern.exec(htmlContent);

      let sectionEnd: number;
      if (nextMatch && nextMatch.index !== undefined) {
        sectionEnd = nextMatch.index;
      } else if (endMatch && endMatch.index !== undefined) {
        sectionEnd = endMatch.index;
      } else {
        sectionEnd = htmlContent.length;
      }

      const sectionContent = htmlContent.slice(sectionStart, sectionEnd);
      sections.push(sectionContent);
    }

    return sections;
  }

  /**
   * Extract category name from section content
   */
  private extractCategoryName(sectionContent: string): string | null {
    const categoryPattern = /<p[^>]*class="ft03"[^>]*>\s*3\.\d+\s*<\/p>\s*<p[^>]*class="ft03"[^>]*>\s*([^<]*用語[^<]*)\s*<\/p>/i;
    const match = categoryPattern.exec(sectionContent);
    return match?.[1]?.trim() ?? null;
  }

  /**
   * Extract individual terms from a section
   */
  private extractTerms(sectionContent: string): TermDefinition[] {
    const terms: TermDefinition[] = [];

    // Pattern to match individual term definitions (3.X.Y) with class="ft03"
    const termIdPattern = /<p[^>]*class="ft03"[^>]*>\s*(3\.\d+\.\d+)\s*<\/p>/gi;
    const termIdMatches = [...sectionContent.matchAll(termIdPattern)];

    for (let i = 0; i < termIdMatches.length; i++) {
      const termMatch = termIdMatches[i];
      if (!termMatch || !termMatch[1] || termMatch.index === undefined) continue;

      const id = termMatch[1].trim();
      const termStart = termMatch.index + termMatch[0].length;

      // Find the next term or end of section
      const nextMatch = termIdMatches[i + 1];
      const termEnd = nextMatch && nextMatch.index !== undefined ? nextMatch.index : sectionContent.length;
      const termContent = sectionContent.slice(termStart, termEnd);

      // Extract term name (first ft03 paragraph after ID)
      const termNamePattern = /<p[^>]*class="ft03"[^>]*>\s*([^<]+)\s*<\/p>/i;
      const nameMatch = termNamePattern.exec(termContent);
      if (!nameMatch || !nameMatch[1]) continue;

      const termText = nameMatch[1].trim();

      // Extract definition (second ft03 paragraph, usually starts with specific words or Japanese)
      const allParagraphs = [...termContent.matchAll(/<p[^>]*class="ft03"[^>]*>\s*([^<]+)\s*<\/p>/gi)];
      let definition = "";

      // Look for a definition paragraph (usually contains Japanese explanatory text)
      for (let j = 1; j < allParagraphs.length; j++) {
        const paragraph = allParagraphs[j];
        if (!paragraph || !paragraph[1]) continue;

        const paragraphText = paragraph[1].trim();
        // Skip if it's likely a note (starts with 注記) or reference
        if (!paragraphText.startsWith("注記") && !paragraphText.startsWith("例") && !paragraphText.match(/^\d+\.\d+/) && paragraphText.length > 10) {
          definition = paragraphText;
          break;
        }
      }

      if (!definition) continue;

      // Extract English term if present (in parentheses)
      const englishMatch = termText.match(/^([^（(]+)\s*[（(]([^）)]+)[）)]/);

      let term: string;
      let englishTerm: string | undefined;

      if (englishMatch && englishMatch[1] && englishMatch[2]) {
        term = englishMatch[1].trim();
        englishTerm = englishMatch[2].trim();
      } else {
        term = termText;
      }

      // Extract notes and examples
      const notes = this.extractNotes(termContent, id);
      const examples = this.extractExamples(termContent, id);

      const termDef: TermDefinition = {
        id,
        term,
        definition,
        category: "", // Will be set by calling function
        notes,
        examples,
      };

      if (englishTerm) {
        termDef.englishTerm = englishTerm;
      }

      terms.push(termDef);
    }

    return terms;
  }

  /**
   * Extract notes for a specific term
   */
  private extractNotes(content: string, termId: string): string[] {
    // Simplified extraction of notes - look for "注記" patterns
    const notePattern = new RegExp(`${termId}[\\s\\S]*?注記\\d*[：:]?\\s*([^<]+)`, "gi");
    const notes: string[] = [];
    let match;

    while ((match = notePattern.exec(content)) !== null) {
      if (match[1]) {
        notes.push(match[1].trim());
      }
    }

    return notes;
  }

  /**
   * Extract examples for a specific term
   */
  private extractExamples(content: string, termId: string): string[] {
    // Simplified extraction of examples - look for "例" patterns
    const examplePattern = new RegExp(`${termId}[\\s\\S]*?例\\s*([^<]+)`, "gi");
    const examples: string[] = [];
    let match;

    while ((match = examplePattern.exec(content)) !== null) {
      if (match[1]) {
        examples.push(match[1].trim());
      }
    }

    return examples;
  }

  /**
   * Load and parse HTML file
   */
  public static async parseFile(filePath: string): Promise<Iso9000Document> {
    const htmlContent = await fs.promises.readFile(filePath, "utf-8");
    const parser = new HtmlParser();
    return parser.parseIso9000Html(htmlContent);
  }
}
