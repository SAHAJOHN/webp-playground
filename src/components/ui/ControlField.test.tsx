// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ControlField } from "@/components/ui/ControlField";

afterEach(cleanup);

describe("ControlField", () => {
  it("associates its label, helper, and error with the control", () => {
    render(
      <ControlField
        id="audio-bitrate"
        label="Audio bitrate"
        value="64 kbps"
        helperText="Lower bitrate creates a lighter file."
        error="Choose a bitrate"
      >
        {({ controlId, describedBy }) => (
          <input id={controlId} aria-describedby={describedBy} />
        )}
      </ControlField>
    );

    const input = screen.getByLabelText("Audio bitrate");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("audio-bitrate-helper");
    expect(describedBy).toContain("audio-bitrate-error");
    expect(screen.getByText("64 kbps")).not.toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "Choose a bitrate"
    );
  });

  it("omits description IDs when no helper or error exists", () => {
    render(
      <ControlField label="Quality">
        {({ controlId, describedBy }) => (
          <input id={controlId} aria-describedby={describedBy} />
        )}
      </ControlField>
    );

    expect(screen.getByLabelText("Quality").getAttribute("aria-describedby")).toBeNull();
  });
});
