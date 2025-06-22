import * as path from "node:path";
import { HtmlParser } from "./htmlParser.mts";
import { JsonConverter } from "./jsonConverter.mts";

export async function main(): Promise<void> {
  console.log("ISO 9000 Data Pipeline is starting...");

  try {
    // Input and output file paths
    const inputFile = path.join(process.cwd(), "input", "Q9000-2015-01-raw.html");
    const outputFile = path.join(process.cwd(), "output", "iso9000-terms.json");

    console.log(`Parsing HTML file: ${inputFile}`);

    // Parse the HTML file
    const document = await HtmlParser.parseFile(inputFile);

    console.log(`Parsed document: ${document.title}`);
    console.log(`Found ${Object.keys(document.categories).length} categories`);

    // Convert to JSON
    const converter = new JsonConverter();
    const jsonOptions = {
      indent: 2,
      includeMetadata: true,
      sortTerms: true,
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    await import("node:fs").then((fs) => fs.promises.mkdir(outputDir, { recursive: true }));

    // Save JSON output
    await converter.saveToFile(document, outputFile, jsonOptions);

    console.log(`JSON output saved to: ${outputFile}`);

    // Generate and display summary
    const summary = converter.generateSummary(document);
    console.log("Summary:", JSON.stringify(summary, null, 2));

    console.log("ISO 9000 Data Pipeline completed successfully!");
  } catch (error) {
    console.error("Error during pipeline execution:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
