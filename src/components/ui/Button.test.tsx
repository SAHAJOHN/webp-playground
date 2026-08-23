// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, ButtonLink } from "@/components/ui/Button";

afterEach(cleanup);

describe("Button", () => {
  it("uses the primary medium variant by default", () => {
    render(<Button>Convert</Button>);
    const button = screen.getByRole("button", { name: "Convert" });

    expect(button.getAttribute("data-variant")).toBe("primary");
    expect(button.getAttribute("data-size")).toBe("md");
    expect(getComputedStyle(button).minHeight).toBe("44px");
  });

  it("preserves secondary and danger semantics", () => {
    render(
      <>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Clear All</Button>
      </>
    );

    expect(
      screen.getByRole("button", { name: "Cancel" }).getAttribute("data-variant")
    ).toBe("secondary");
    expect(
      screen.getByRole("button", { name: "Clear All" }).getAttribute("data-variant")
    ).toBe("danger");
  });

  it("disables and exposes busy state while loading", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button isLoading onClick={onClick}>
        Converting
      </Button>
    );
    const button = screen.getByRole("button", { name: "Converting" });

    await user.click(button);

    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders a link action without nesting interactive elements", () => {
    render(
      <ButtonLink href="/audio.m4a" download="audio.m4a">
        Download
      </ButtonLink>
    );
    const link = screen.getByRole("link", { name: "Download" });

    expect(link.getAttribute("href")).toBe("/audio.m4a");
    expect(link.getAttribute("download")).toBe("audio.m4a");
    expect(link.getAttribute("data-variant")).toBe("primary");
    expect(link.querySelector("button")).toBeNull();
  });
});
