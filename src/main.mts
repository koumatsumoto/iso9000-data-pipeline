import { Iso9000Parser } from "./iso9000-parser.mts";

export async function main(): Promise<void> {
  console.log("ISO 9000 Data Pipeline is starting...");

  try {
    // Input and output file paths
    const inputFile = "./input/Q9000-2025-01-vocabulary-flat.html";
    const outputFile = "./output/iso9000-vocabulary-terms.json";

    console.log(`Parsing HTML file: ${inputFile}`);

    // Parse and save the HTML file
    await Iso9000Parser.parseAndSave(inputFile, outputFile);

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
