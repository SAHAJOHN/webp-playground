// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToggleControl } from "@/components/ui/ToggleControl";

afterEach(cleanup);

const ToggleHarness = () => {
  const [pressed, setPressed] = React.useState(false);
  return (
    <ToggleControl pressed={pressed} onClick={() => setPressed(!pressed)}>
      Progressive JPEG
    </ToggleControl>
  );
};

describe("ToggleControl", () => {
  it("exposes and updates aria-pressed", async () => {
    const user = userEvent.setup();
    render(<ToggleHarness />);
    const toggle = screen.getByRole("button", { name: "Progressive JPEG" });

    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await user.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("data-pressed")).toBe("true");
  });

  it("does not invoke a disabled toggle", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ToggleControl pressed={false} disabled onClick={onClick}>
        Palette
      </ToggleControl>
    );

    await user.click(screen.getByRole("button", { name: "Palette" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
