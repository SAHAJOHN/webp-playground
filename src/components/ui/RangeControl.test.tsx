// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RangeControl } from "@/components/ui/RangeControl";

afterEach(cleanup);

const RangeHarness = () => {
  const [value, setValue] = React.useState(80);
  return (
    <RangeControl
      label="Quality"
      value={value}
      valueText={`${value}%`}
      helperText="Higher quality creates a larger file."
      min={1}
      max={100}
      onChange={(event) => setValue(Number(event.target.value))}
    />
  );
};

describe("RangeControl", () => {
  it("associates copy and updates a controlled numeric value", () => {
    render(<RangeHarness />);
    const slider = screen.getByRole("slider", { name: "Quality" });

    fireEvent.change(slider, { target: { value: "60" } });

    expect(slider).toHaveProperty("value", "60");
    expect(screen.getByText("60%")).not.toBeNull();
    expect(slider.getAttribute("aria-describedby")).not.toBeNull();
  });

  it("preserves disabled state", () => {
    render(
      <RangeControl
        label="Effort"
        value={4}
        min={0}
        max={9}
        disabled
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("slider", { name: "Effort" })).toHaveProperty(
      "disabled",
      true
    );
  });
});
