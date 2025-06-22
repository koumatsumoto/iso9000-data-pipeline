import { JSDOM } from "jsdom";
import fs from "fs/promises";
import path from "path";

export async function flattenHtml(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Read the input HTML file
    const htmlContent = await fs.readFile(inputPath, "utf-8");

    // Parse HTML with jsdom
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Get the body element
    const body = document.body;
    if (!body) {
      throw new Error("No body element found in HTML");
    }

    // Collect all p tags from all div elements
    const allPTags: Element[] = [];
    const divElements = body.querySelectorAll("div");

    divElements.forEach((div) => {
      const pTags = div.querySelectorAll("p");
      pTags.forEach((p) => {
        // Remove class="ft03" attribute
        p.removeAttribute("class");
        allPTags.push(p);
      });
    });

    // Remove all div elements from body
    divElements.forEach((div) => div.remove());

    // Remove all a tags from body
    const aTags = body.querySelectorAll("a");
    aTags.forEach((a) => a.remove());

    // Remove all comment nodes from body
    const walker = document.createTreeWalker(body, dom.window.NodeFilter.SHOW_COMMENT);

    const commentsToRemove: Comment[] = [];
    let node;
    while ((node = walker.nextNode())) {
      commentsToRemove.push(node as Comment);
    }

    commentsToRemove.forEach((comment) => comment.remove());

    // Add all p tags directly to body
    allPTags.forEach((p) => {
      body.appendChild(p);
    });

    // Write the flattened HTML to output file
    let serializedHtml = dom.serialize();

    // Replace &nbsp; with regular spaces
    serializedHtml = serializedHtml.replace(/&nbsp;/g, " ");

    await fs.writeFile(outputPath, serializedHtml, "utf-8");

    console.log(`Successfully flattened HTML from ${inputPath} to ${outputPath}`);
  } catch (error) {
    console.error("Error flattening HTML:", error);
    throw error;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const inputPath = path.resolve("input/Q9000-2015-01-vocabulary.html");
  const outputPath = path.resolve("input/Q9000-2025-01-vocabulary-flat.html");

  flattenHtml(inputPath, outputPath).catch(console.error);
}
