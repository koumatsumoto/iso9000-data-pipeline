import { describe, it, expect, vi } from "vitest";
import { main } from "./main.mjs";

describe("main", () => {
  it("should log the startup message", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    main();

    expect(consoleSpy).toHaveBeenCalledWith("ISO 9000 Data Pipeline is starting...");
    consoleSpy.mockRestore();
  });
});
