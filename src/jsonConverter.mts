import * as fs from "node:fs";
import type { Iso9000Document, TermDefinition } from "./htmlParser.mts";

export interface JsonOutputOptions {
  indent?: number;
  includeMetadata?: boolean;
  sortTerms?: boolean;
}

export class JsonConverter {
  /**
   * Convert ISO 9000 document to JSON format
   */
  public convertToJson(document: Iso9000Document, options: JsonOutputOptions = {}): string {
    const { indent = 2, includeMetadata = true, sortTerms = true } = options;

    let output: Record<string, unknown> = {};

    if (includeMetadata) {
      output = {
        metadata: {
          title: document.title,
          version: document.version,
          extractedAt: new Date().toISOString(),
          totalTerms: this.countTotalTerms(document),
          categories: Object.keys(document.categories).length,
        },
        ...output,
      };
    }

    // Process categories and terms
    const processedCategories: Record<string, unknown> = {};

    for (const [categoryName, terms] of Object.entries(document.categories)) {
      const processedTerms = sortTerms ? this.sortTerms(terms) : terms;

      processedCategories[categoryName] = {
        count: terms.length,
        terms: processedTerms.map((term: TermDefinition) => this.formatTerm(term)),
      };
    }

    output["categories"] = processedCategories;

    return JSON.stringify(output, null, indent);
  }

  /**
   * Format individual term for JSON output
   */
  private formatTerm(term: TermDefinition): Record<string, unknown> {
    const formatted: Record<string, unknown> = {
      id: term.id,
      term: term.term,
      definition: term.definition,
    };

    if (term.englishTerm) {
      formatted["englishTerm"] = term.englishTerm;
    }

    if (term.notes && term.notes.length > 0) {
      formatted["notes"] = term.notes;
    }

    if (term.examples && term.examples.length > 0) {
      formatted["examples"] = term.examples;
    }

    return formatted;
  }

  /**
   * Sort terms by their ID (numerical order)
   */
  private sortTerms(terms: TermDefinition[]): TermDefinition[] {
    return [...terms].sort((a, b) => {
      const aNumbers = a.id.split(".").map(Number);
      const bNumbers = b.id.split(".").map(Number);

      for (let i = 0; i < Math.max(aNumbers.length, bNumbers.length); i++) {
        const aNum = aNumbers[i] || 0;
        const bNum = bNumbers[i] || 0;

        if (aNum !== bNum) {
          return aNum - bNum;
        }
      }

      return 0;
    });
  }

  /**
   * Count total terms across all categories
   */
  private countTotalTerms(document: Iso9000Document): number {
    return Object.values(document.categories).reduce((total, terms) => total + (terms as TermDefinition[]).length, 0);
  }

  /**
   * Save JSON to file
   */
  public async saveToFile(document: Iso9000Document, outputPath: string, options: JsonOutputOptions = {}): Promise<void> {
    const jsonString = this.convertToJson(document, options);
    await fs.promises.writeFile(outputPath, jsonString, "utf-8");
  }

  /**
   * Create flat list of all terms (useful for search/indexing)
   */
  public createFlatTermList(document: Iso9000Document): TermDefinition[] {
    const allTerms: TermDefinition[] = [];

    for (const [categoryName, terms] of Object.entries(document.categories)) {
      for (const term of terms as TermDefinition[]) {
        allTerms.push({
          ...term,
          category: categoryName,
        });
      }
    }

    return this.sortTerms(allTerms);
  }

  /**
   * Generate summary statistics
   */
  public generateSummary(document: Iso9000Document): Record<string, unknown> {
    const allTerms = this.createFlatTermList(document);
    const termsWithEnglish = allTerms.filter((term) => term.englishTerm);
    const termsWithNotes = allTerms.filter((term) => term.notes && term.notes.length > 0);
    const termsWithExamples = allTerms.filter((term) => term.examples && term.examples.length > 0);

    return {
      title: document.title,
      version: document.version,
      totalTerms: allTerms.length,
      totalCategories: Object.keys(document.categories).length,
      termsWithEnglishTranslation: termsWithEnglish.length,
      termsWithNotes: termsWithNotes.length,
      termsWithExamples: termsWithExamples.length,
      categoryBreakdown: Object.fromEntries(Object.entries(document.categories).map(([name, terms]) => [name, (terms as TermDefinition[]).length])),
    };
  }
}
