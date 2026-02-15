import { test, expect, Page, CDPSession } from "@playwright/test";

/**
 * CFG-143: App becomes sluggish after extended use
 *
 * Root causes identified in ProductConfigurator.tsx:
 *
 * 1. RESIZE LISTENER LEAK (line ~197-211)
 *    useEffect adds `window.addEventListener("resize", handleResize)` but
 *    never returns a cleanup function. The listener is never removed.
 *    Comment from Marcus: "Resize handler might have a leak"
 *
 * 2. PREVIEW URL ACCUMULATION
 *    Every config change calls `generatePreview()` which creates a unique
 *    URL with a cache-busting `?t=${Date.now()}` param. Over many changes,
 *    old image references accumulate in browser memory.
 *
 * 3. UNSTABLE currentConfig REFERENCE
 *    The useMemo for `currentConfig` includes `new Date().toISOString()` in
 *    createdAt/updatedAt, so every re-render produces a new object identity.
 *    This triggers cascading effects: validateConfiguration + generatePreview
 *    fire on every re-render, not just on actual config changes.
 *
 * These tests detect the symptoms via CDP event listener inspection,
 * heap memory measurement, and UI response-time measurement.
 */

// ============================================================================
// Helpers
// ============================================================================

async function waitForAppReady(page: Page): Promise<void> {
  await expect(
    page.locator("h1, h2").filter({ hasText: /TechStyle|Laptop/i }),
  ).toBeVisible({ timeout: 10000 });
}

const SIZES = [
  '13" Compact',
  '14" Standard',
  '15" Large',
  '17" Desktop Replacement',
] as const;

const COLORS = ["Silver", "Space Gray", "Midnight Blue", "Rose Gold"] as const;

const MATERIALS = [
  "Premium Plastic",
  "Aluminum",
  "Magnesium Alloy",
  "Carbon Fiber",
] as const;

const OPTION_VALUE_MAP: Record<string, Record<string, string>> = {
  size: {
    '13" Compact': "13",
    '14" Standard': "14",
    '15" Large': "15",
    '17" Desktop Replacement': "17",
  },
  material: {
    "Premium Plastic": "plastic",
    Aluminum: "aluminum",
    "Magnesium Alloy": "magnesium",
    "Carbon Fiber": "carbon",
  },
};

async function selectOption(
  page: Page,
  optionName: string,
  displayValue: string,
): Promise<void> {
  const nameToId: Record<string, string> = {
    "Screen Size": "size",
    Color: "color",
    Material: "material",
  };
  const optionId = nameToId[optionName];
  if (!optionId) throw new Error(`Unknown option: ${optionName}`);

  if (optionId === "color") {
    await page.locator(`.color-swatch[title="${displayValue}"]`).click();
  } else {
    const value = OPTION_VALUE_MAP[optionId]?.[displayValue];
    if (!value)
      throw new Error(`Unknown value "${displayValue}" for ${optionName}`);
    await page
      .locator(`[data-testid="option-${optionId}"]`)
      .selectOption(value);
  }
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function performRandomConfigChange(page: Page): Promise<void> {
  await selectOption(page, "Screen Size", pickRandom(SIZES));
  await selectOption(page, "Color", pickRandom(COLORS));
  await selectOption(page, "Material", pickRandom(MATERIALS));
}

/**
 * Use CDP DOMDebugger.getEventListeners to count how many 'resize'
 * listeners are attached to `window`. This is the same API Chrome
 * DevTools uses when you call `getEventListeners(window)` in the console.
 */
async function getResizeListenerCount(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { result } = await cdp.send("Runtime.evaluate", {
      expression: "window",
      returnByValue: false,
    });

    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", {
      objectId: result.objectId!,
    });

    return listeners.filter((l) => l.type === "resize").length;
  } finally {
    await cdp.detach();
  }
}

/**
 * Force garbage collection via CDP and return used JS heap in MB.
 */
async function getHeapUsageMB(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  try {
    // Run GC twice to give weak refs a chance to be collected
    await cdp.send("HeapProfiler.collectGarbage");
    await cdp.send("HeapProfiler.collectGarbage");
    const { usedSize } = await cdp.send("Runtime.getHeapUsage");
    return usedSize / (1024 * 1024);
  } finally {
    await cdp.detach();
  }
}

/**
 * Measure how long it takes from triggering an option change until the
 * price display settles (button no longer says "Calculating...").
 */
async function measureInteractionLatency(page: Page): Promise<number> {
  // Reset to a known state first
  await selectOption(page, "Screen Size", '14" Standard');
  await page.waitForTimeout(800);

  const start = Date.now();

  await selectOption(page, "Screen Size", '17" Desktop Replacement');

  // Wait for debounce (300ms) + simulated API (100-600ms) + render
  await page
    .locator('[data-testid="add-to-cart-button"]')
    .filter({ hasNotText: /Calculating/i })
    .waitFor({ timeout: 5000 });

  return Date.now() - start;
}

// ============================================================================
// Tests
// ============================================================================

test.describe("CFG-143: App becomes sluggish after extended use", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    // Let initial async effects settle (validation, preview, price calc)
    await page.waitForTimeout(1500);
  });

  // --------------------------------------------------------------------------
  // Resize listener leak
  // --------------------------------------------------------------------------

  test.describe("Resize event listener leak", () => {
    test("should have exactly one resize listener after initial mount", async ({
      page,
    }) => {
      const count = await getResizeListenerCount(page);

      // ProductConfigurator adds one resize listener in useEffect([], ...).
      // If it's more than 1, something is adding duplicates.
      expect(count).toBe(1);
    });

    test("resize listener count should stay stable after many configuration changes", async ({
      page,
    }) => {
      const countBefore = await getResizeListenerCount(page);

      // Simulate extended use: 30 rounds of random config changes.
      // Each change triggers re-renders, effect re-runs, async calls, etc.
      for (let i = 0; i < 30; i++) {
        await performRandomConfigChange(page);
        await page.waitForTimeout(50);
      }

      await page.waitForTimeout(2000);
      const countAfter = await getResizeListenerCount(page);

      // Re-renders should NOT cause new resize listeners to pile up.
      expect(countAfter).toBe(countBefore);
    });

    test("resize listener count should stay stable after many viewport changes", async ({
      page,
    }) => {
      const countBefore = await getResizeListenerCount(page);

      // Simulate the "resize the browser window several times" scenario.
      const viewports = [
        { width: 1280, height: 720 },
        { width: 800, height: 600 },
        { width: 1920, height: 1080 },
        { width: 375, height: 812 }, // mobile
        { width: 1024, height: 768 },
        { width: 1440, height: 900 },
      ];

      for (let cycle = 0; cycle < 5; cycle++) {
        for (const vp of viewports) {
          await page.setViewportSize(vp);
          await page.waitForTimeout(30);
        }
      }

      await page.waitForTimeout(1000);
      const countAfter = await getResizeListenerCount(page);

      expect(countAfter).toBe(countBefore);
    });

    test("resize listener should be removed when component unmounts", async ({
      page,
    }) => {
      // Instrument addEventListener/removeEventListener BEFORE loading the app
      // so we can track whether cleanup was called.
      await page.addInitScript(() => {
        const tracker = { added: 0, removed: 0 };
        (window as any).__resizeTracker = tracker;

        const origAdd = EventTarget.prototype.addEventListener;
        const origRemove = EventTarget.prototype.removeEventListener;

        EventTarget.prototype.addEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions,
        ) {
          if (this === window && type === "resize") tracker.added++;
          return origAdd.call(this, type, listener, options);
        };

        EventTarget.prototype.removeEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | EventListenerOptions,
        ) {
          if (this === window && type === "resize") tracker.removed++;
          return origRemove.call(this, type, listener, options);
        };
      });

      // Fresh navigation so the init script runs
      await page.goto("/");
      await waitForAppReady(page);

      const afterMount = await page.evaluate(
        () => (window as any).__resizeTracker,
      );

      expect(afterMount.added).toBeGreaterThanOrEqual(1);

      // Trigger React unmount by replacing the root DOM.
      // This is the closest E2E equivalent of unmounting the component tree.
      await page.evaluate(() => {
        const root = document.getElementById("root");
        if (root) {
          // Unmount React tree — ReactDOM will run all effect cleanups
          // @ts-ignore - access React internals via createRoot reference
          (window as any).__REACT_ROOT__?.unmount?.();

          // Fallback: clear the container which also triggers cleanup in React 18
          root.innerHTML = "";
        }
      });

      await page.waitForTimeout(500);

      const afterUnmount = await page.evaluate(
        () => (window as any).__resizeTracker,
      );

      // BUG DETECTION: If cleanup is missing, `removed` will still be 0
      // even though `added` >= 1. A properly written effect would call
      // removeEventListener in its cleanup, so removed should match added.
      expect(afterUnmount.removed).toBeGreaterThanOrEqual(afterUnmount.added);
    });
  });

  // --------------------------------------------------------------------------
  // Memory stability
  // --------------------------------------------------------------------------

  test.describe("Memory stability during extended use", () => {
    test("memory should not grow unboundedly after many configuration changes", async ({
      page,
    }) => {
      const baselineMemory = await getHeapUsageMB(page);

      // Simulate extended use: 50 configuration change cycles.
      // Each change triggers: debounced price calc, validate, generatePreview.
      for (let i = 0; i < 50; i++) {
        await performRandomConfigChange(page);
        await page.waitForTimeout(80);
      }

      // Let all pending async work finish
      await page.waitForTimeout(3000);

      const afterMemory = await getHeapUsageMB(page);
      const growthMB = afterMemory - baselineMemory;

      // With proper cleanup, 50 cycles should not add more than ~10 MB.
      // Unbounded leaks (e.g. accumulated preview URLs, closures from
      // un-cancelled async operations) will push this well beyond 10 MB.
      expect(growthMB).toBeLessThan(10);
    });

    test("memory should remain stable with combined resize and configuration changes", async ({
      page,
    }) => {
      const baselineMemory = await getHeapUsageMB(page);

      // Reproduce the exact scenario from the bug report:
      // "Make various configuration changes" + "Resize the browser window
      // several times during the session"
      const viewports = [
        { width: 1280, height: 720 },
        { width: 800, height: 600 },
        { width: 1920, height: 1080 },
        { width: 375, height: 812 },
        { width: 1024, height: 768 },
        { width: 1440, height: 900 },
      ];

      for (let cycle = 0; cycle < 8; cycle++) {
        // Configuration changes
        for (let i = 0; i < 5; i++) {
          await performRandomConfigChange(page);
          await page.waitForTimeout(50);
        }

        // Resize
        const vp = viewports[cycle % viewports.length];
        await page.setViewportSize(vp);
        await page.waitForTimeout(150);
      }

      await page.waitForTimeout(3000);
      const afterMemory = await getHeapUsageMB(page);
      const growthMB = afterMemory - baselineMemory;

      expect(growthMB).toBeLessThan(15);
    });
  });

  // --------------------------------------------------------------------------
  // UI responsiveness
  // --------------------------------------------------------------------------

  test.describe("UI responsiveness should remain stable", () => {
    test("interaction latency should not degrade after extended use", async ({
      page,
    }) => {
      // Measure baseline latency (average of 3 runs)
      const baselineSamples: number[] = [];
      for (let i = 0; i < 3; i++) {
        baselineSamples.push(await measureInteractionLatency(page));
        await page.waitForTimeout(300);
      }
      const baselineAvg =
        baselineSamples.reduce((a, b) => a + b, 0) / baselineSamples.length;

      // Simulate extended use: many changes + resizes
      for (let i = 0; i < 40; i++) {
        await performRandomConfigChange(page);
        await page.waitForTimeout(50);

        if (i % 8 === 0) {
          await page.setViewportSize({
            width: 800 + i * 15,
            height: 600 + i * 10,
          });
        }
      }

      await page.waitForTimeout(2000);

      // Measure latency again after extended use
      const afterSamples: number[] = [];
      for (let i = 0; i < 3; i++) {
        afterSamples.push(await measureInteractionLatency(page));
        await page.waitForTimeout(300);
      }
      const afterAvg =
        afterSamples.reduce((a, b) => a + b, 0) / afterSamples.length;

      // Response time should not degrade more than 3× baseline.
      // (generous threshold to account for async API jitter)
      const degradationRatio = afterAvg / baselineAvg;
      expect(degradationRatio).toBeLessThan(3.0);
    });

    test("UI should remain responsive after many rapid resize events", async ({
      page,
    }) => {
      // Fire 50 rapid resize events
      for (let i = 0; i < 50; i++) {
        await page.setViewportSize({
          width: 600 + Math.floor(Math.random() * 1000),
          height: 400 + Math.floor(Math.random() * 600),
        });
        await page.waitForTimeout(20);
      }

      // Reset to a reasonable viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      // Verify the app is still functional
      const priceDisplay = page.locator('[data-testid="total-price"]');
      await expect(priceDisplay).toBeVisible({ timeout: 3000 });

      // Measure that interaction still completes in reasonable time
      const latency = await measureInteractionLatency(page);

      // Should complete within 4 s even with API jitter (debounce 300ms + API up to 600ms)
      expect(latency).toBeLessThan(4000);
    });
  });
});
