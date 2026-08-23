// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OptionCardGroup } from "@/components/ui/OptionCardGroup";

beforeEach(() => {
  vi.stubGlobal("CSS", {
    escape: (value: string) => value.replaceAll(/[^a-zA-Z0-9_-]/g, "\\$&"),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const AUDIO_OPTIONS = [
  { value: "m4a", label: "M4A", description: "Smaller AAC audio" },
  { value: "mp3", label: "MP3", description: "Widest compatibility" },
] as const;

const AudioGroupHarness = ({ disabled = false }: { disabled?: boolean }) => {
  const [value, setValue] = React.useState<"m4a" | "mp3">("m4a");

  return (
    <OptionCardGroup
      label="Output format"
      name="audio-format"
      value={value}
      options={AUDIO_OPTIONS}
      onValueChange={setValue}
      variant="descriptive"
      disabled={disabled}
    />
  );
};

describe("OptionCardGroup", () => {
  it("renders descriptive radios and changes the controlled value", async () => {
    const user = userEvent.setup();
    render(<AudioGroupHarness />);

    const mp3 = screen.getByRole("radio", {
      name: "MP3 Widest compatibility",
    });
    await user.click(mp3);

    expect(mp3).toHaveProperty("checked", true);
    expect(screen.getByText("Smaller AAC audio")).not.toBeNull();
  });

  it("uses native arrow-key radio navigation", async () => {
    const user = userEvent.setup();
    render(<AudioGroupHarness />);
    const m4a = screen.getByRole("radio", { name: "M4A Smaller AAC audio" });

    m4a.focus();
    await user.keyboard("{ArrowRight}");

    expect(
      screen.getByRole("radio", { name: "MP3 Widest compatibility" })
    ).toHaveProperty("checked", true);
  });

  it("supports compact cards without description copy", () => {
    render(
      <OptionCardGroup
        label="Image format"
        name="image-format"
        value="jpeg"
        options={[
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
        ]}
        onValueChange={vi.fn()}
        variant="compact"
      />
    );

    expect(screen.getByRole("radio", { name: "JPEG" })).not.toBeNull();
    expect(document.querySelectorAll('[data-slot="option-description"]')).toHaveLength(0);
  });

  it("disables every option at the group level", () => {
    render(<AudioGroupHarness disabled />);

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveProperty("disabled", true);
    }
  });
});
