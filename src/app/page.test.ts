import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("main page layout", () => {
  it("does not mount the removed mini sidebar", () => {
    expect(pageSource).not.toContain("MiniSidebar");
    expect(pageSource).not.toContain("sidebar=");
  });
});
