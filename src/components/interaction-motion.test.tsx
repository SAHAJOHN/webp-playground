import React from "react";
import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import { describe, expect, it } from "vitest";
import { PreviewGrid } from "@/components/conversion/PreviewGrid";
import { ProgressIndicator } from "@/components/feedback/ProgressIndicator";

const renderInteractiveStyles = () => {
  const sheet = new ServerStyleSheet();

  try {
    renderToString(
      sheet.collectStyles(
        <>
          <PreviewGrid
            items={[
              {
                id: "preview-1",
                name: "preview.webp",
                originalUrl: "/original.png",
                convertedUrl: "/converted.webp",
                originalSize: "10 KB",
                convertedSize: "8 KB",
                compressionRatio: 20,
                status: "done",
              },
            ]}
          />
          <ProgressIndicator
            progress={0}
            fileName="preview.png"
            status="pending"
            onCancel={() => undefined}
          />
        </>
      )
    );
    return sheet.getStyleTags();
  } finally {
    sheet.seal();
  }
};

describe("interaction motion", () => {
  it("does not scale interactive surfaces on hover", () => {
    const css = renderInteractiveStyles();
    const hoverRules = css.match(/[^{}]*:hover[^{}]*\{[^{}]*\}/g) ?? [];
    const hoverScaleRules = hoverRules.filter((rule) =>
      /transform:scale\(/.test(rule)
    );

    expect(hoverScaleRules).toEqual([]);
  });
});
