// @vitest-environment jsdom

import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { ScrollShadow } from "@/components/layout/ScrollShadow";

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

const DynamicScrollTarget = ({ contentHeight }: { contentHeight: number }) => {
  const setTargetRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      Object.defineProperty(element, "clientHeight", {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(element, "scrollHeight", {
        configurable: true,
        value: contentHeight,
      });
    },
    [contentHeight]
  );

  return (
    <div className="scroll-target" ref={setTargetRef}>
      Content height: {contentHeight}
    </div>
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("scroll effects", () => {
  it("removes the same scroll listener that ScrollShadow registered", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const addEventListenerSpy = vi.spyOn(
      HTMLElement.prototype,
      "addEventListener"
    );
    const removeEventListenerSpy = vi.spyOn(
      HTMLElement.prototype,
      "removeEventListener"
    );

    const { container, unmount } = render(
      <ScrollShadow selectors={["scroll-target"]}>
        <div className="scroll-target">Scrollable content</div>
      </ScrollShadow>
    );
    const scrollTarget = container.querySelector(".scroll-target");
    const listenerIndex = addEventListenerSpy.mock.instances.findIndex(
      (instance, index) =>
        instance === scrollTarget &&
        addEventListenerSpy.mock.calls[index]?.[0] === "scroll"
    );
    const registeredListener = addEventListenerSpy.mock.calls[listenerIndex]?.[1];

    expect(listenerIndex).toBeGreaterThanOrEqual(0);
    unmount();

    const removedWithSameListener = removeEventListenerSpy.mock.instances.some(
      (instance, index) =>
        instance === scrollTarget &&
        removeEventListenerSpy.mock.calls[index]?.[0] === "scroll" &&
        removeEventListenerSpy.mock.calls[index]?.[1] === registeredListener
    );
    expect(removedWithSameListener).toBe(true);
  });

  it("renders safely when ResizeObserver is unavailable", () => {
    Reflect.deleteProperty(globalThis, "ResizeObserver");

    expect(() =>
      render(
        <div data-scroll-render-target="true">
          <ScrollProgress selectors={["scroll-target"]}>
            <ScrollShadow selectors={["scroll-target"]}>
              <div className="scroll-target">Scrollable content</div>
            </ScrollShadow>
          </ScrollProgress>
        </div>
      )
    ).not.toThrow();
  });

  it("shows the bottom shadow when mounted content becomes scrollable", async () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container, rerender } = render(
      <ScrollShadow selectors={["scroll-target"]}>
        <DynamicScrollTarget contentHeight={100} />
      </ScrollShadow>
    );
    const shadow = container.querySelector('[data-scroll-shadow="true"]');

    expect(shadow?.getAttribute("data-bottom-shadow")).toBe("hidden");

    rerender(
      <ScrollShadow selectors={["scroll-target"]}>
        <DynamicScrollTarget contentHeight={200} />
      </ScrollShadow>
    );

    await waitFor(() => {
      expect(shadow?.getAttribute("data-bottom-shadow")).toBe("visible");
    });
  });
});
