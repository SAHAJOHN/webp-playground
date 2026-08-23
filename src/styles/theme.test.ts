import { describe, expect, it } from "vitest";
import { theme } from "@/styles/theme";

describe("Blue Ocean control theme", () => {
  it("exposes the approved control tokens from one source", () => {
    expect(theme.colors.control).toEqual({
      accent: "#3282b8",
      accentHover: "#5aa1cf",
      surface: "rgba(15, 76, 117, 0.30)",
      surfaceHover: "rgba(15, 76, 117, 0.50)",
      surfaceSelected: "rgba(50, 130, 184, 0.34)",
      popup: "#0f4c75",
      border: "rgba(50, 130, 184, 0.34)",
      borderStrong: "rgba(50, 130, 184, 0.58)",
      text: "#bbe1fa",
      textMuted: "rgba(187, 225, 250, 0.68)",
      focusRing: "rgba(50, 130, 184, 0.36)",
    });
    expect(theme.colors.accent.primary).toBe(theme.colors.control.accent);
    expect(theme.colors.accent.primaryHover).toBe(
      theme.colors.control.accentHover
    );
  });
});
