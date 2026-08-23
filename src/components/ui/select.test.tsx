// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

const SelectHarness = ({ disabled = false }: { disabled?: boolean }) => {
  const [value, setValue] = React.useState("64");

  return (
    <Select value={value} onValueChange={setValue} disabled={disabled}>
      <SelectTrigger aria-label="Audio bitrate">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="64">64 kbps</SelectItem>
        <SelectItem value="96">96 kbps</SelectItem>
      </SelectContent>
    </Select>
  );
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("PointerEvent", MouseEvent);
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(() => false),
  });
  Object.defineProperty(Element.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Select", () => {
  it("selects an option and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<SelectHarness />);
    const trigger = screen.getByRole("combobox", { name: "Audio bitrate" });

    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "96 kbps" }));

    expect(trigger.textContent).toContain("96 kbps");
    expect(document.activeElement).toBe(trigger);
  });

  it("supports keyboard selection", async () => {
    const user = userEvent.setup();
    render(<SelectHarness />);
    const trigger = screen.getByRole("combobox", { name: "Audio bitrate" });

    trigger.focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");

    expect(trigger.textContent).toContain("96 kbps");
  });

  it("cannot open while disabled", async () => {
    const user = userEvent.setup();
    render(<SelectHarness disabled />);

    await user.click(screen.getByRole("combobox", { name: "Audio bitrate" }));

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("uses the approved default target size and control text token", () => {
    render(<SelectHarness />);
    const trigger = screen.getByRole("combobox", { name: "Audio bitrate" });

    expect(trigger.getAttribute("data-size")).toBe("default");
    expect(getComputedStyle(trigger).minHeight).toBe("44px");
    expect(getComputedStyle(trigger).color).toBe("rgb(187, 225, 250)");
  });
});
