export function main(): void {
  console.log("ISO 9000 Data Pipeline is starting...");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}