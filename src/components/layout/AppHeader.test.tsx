import React from "react";
import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import { describe, expect, it } from "vitest";
import { AppHeader } from "@/components/layout/AppHeader";

const renderHeaderStyles = () => {
  const sheet = new ServerStyleSheet();

  try {
    renderToString(sheet.collectStyles(<AppHeader />));
    return sheet.getStyleTags();
  } finally {
    sheet.seal();
  }
};

describe("AppHeader", () => {
  it("positions converter navigation at the exact header center", () => {
    const css = renderHeaderStyles();
    const rules = css.match(/[^{}]+\{[^{}]+\}/g) ?? [];
    const centeredNavigationRule = rules.find(
      (rule) =>
        rule.includes("position:absolute") &&
        rule.includes("left:50%") &&
        rule.includes("top:50%") &&
        /transform:translate\(-50%,\s*-50%\)/.test(rule)
    );

    expect(centeredNavigationRule).toBeDefined();
  });
});
