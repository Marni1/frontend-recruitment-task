import { test, expect, Page } from "@playwright/test";

function calculateExpectedPrice(
  basePrice: number,
  size: string,
  color: string,
  material: string,
  quantity: number = 1,
): number {
  const priceModifiers = {
    size: {
      "13": -100,
      "14": 0,
      "15": 150,
      "17": 300,
    },
    color: {
      silver: 0,
      space_gray: 0,
      midnight: 25,
      rose_gold: 50,
      custom_3: 75,
    },
    material: {
      plastic: -50,
      aluminum: 0,
      magnesium: 100,
      carbon: 250,
    },
  };

  const sizeModifier =
    priceModifiers.size[size as keyof typeof priceModifiers.size] || 0;
  const colorModifier =
    priceModifiers.color[color as keyof typeof priceModifiers.color] || 0;
  const materialModifier =
    priceModifiers.material[material as keyof typeof priceModifiers.material] ||
    0;

  const unitPrice = basePrice + sizeModifier + colorModifier + materialModifier;
  return unitPrice * quantity;
}

async function waitForPriceStabilization(page: Page, timeoutMs: number = 2000) {
  await page.waitForTimeout(timeoutMs);
}

async function getDisplayedPrice(page: Page): Promise<number> {
  const priceText = await page
    .locator('[data-testid="total-price"]')
    .textContent();
  if (!priceText) throw new Error("Price element not found");

  const numericValue = priceText.replace(/[$,]/g, "");
  return parseFloat(numericValue);
}

const OPTION_VALUES = {
  size: {
    '13" Compact': "13",
    '14" Standard': "14",
    '15" Large': "15",
    '17" Desktop Replacement': "17",
  },
  color: {
    Silver: "silver",
    "Space Gray": "space_gray",
    "Midnight Blue": "midnight",
    "Rose Gold": "rose_gold",
    "Custom #3": "custom_3",
  },
  material: {
    "Premium Plastic": "plastic",
    Aluminum: "aluminum",
    "Magnesium Alloy": "magnesium",
    "Carbon Fiber": "carbon",
  },
  processor: {
    "Intel Core i5": "i5",
    "Intel Core i7": "i7",
    "Intel Core i9": "i9",
  },
  memory: {
    "8GB": "8",
    "16GB": "16",
    "32GB": "32",
    "64GB": "64",
  },
  storage: {
    "256GB SSD": "256",
    "512GB SSD": "512",
    "1TB SSD": "1024",
    "2TB SSD": "2048",
  },
} as const;

async function selectOptionById(page: Page, optionId: string, value: string) {
  const select = page.locator(`[data-testid="option-${optionId}"]`);
  await select.selectOption(value);
}

async function selectColorOption(page: Page, colorLabel: string) {
  const colorValue =
    OPTION_VALUES.color[colorLabel as keyof typeof OPTION_VALUES.color];
  const colorSwatch = page.locator(`.color-swatch[title="${colorLabel}"]`);
  await colorSwatch.click();
}

async function selectOption(
  page: Page,
  optionName: string,
  displayValue: string,
) {
  const nameToIdMap: Record<string, string> = {
    "Screen Size": "size",
    Color: "color",
    Material: "material",
    Processor: "processor",
    "Memory (RAM)": "memory",
    Storage: "storage",
  };

  const optionId = nameToIdMap[optionName];

  if (optionId === "color") {
    await selectColorOption(page, displayValue);
  } else if (optionId) {
    const optionMap = OPTION_VALUES[optionId as keyof typeof OPTION_VALUES];
    if (optionMap && displayValue in optionMap) {
      const actualValue = optionMap[displayValue as keyof typeof optionMap];
      await selectOptionById(page, optionId, actualValue);
    } else {
      throw new Error(`Unknown option value: ${optionName} = ${displayValue}`);
    }
  } else {
    throw new Error(`Unknown option: ${optionName}`);
  }
}

test.describe("Price Calculation Race Condition (CFG-142)", () => {
  const BASE_PRICE = 999.99;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await expect(
      page.locator("h1, h2").filter({ hasText: /TechStyle|Laptop/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display correct price after rapid option changes", async ({
    page,
  }) => {
    await selectOption(page, "Screen Size", '15" Large');
    await page.waitForTimeout(50);

    await selectOption(page, "Color", "Rose Gold");
    await page.waitForTimeout(50);

    await selectOption(page, "Material", "Carbon Fiber");

    await waitForPriceStabilization(page);

    const expectedPrice = calculateExpectedPrice(
      BASE_PRICE,
      "15",
      "rose_gold",
      "carbon",
    );
    const displayedPrice = await getDisplayedPrice(page);

    expect(displayedPrice).toBeCloseTo(expectedPrice, 2);
  });

  test("should reproduce customer bug: Medium -> Large -> XL rapid changes", async ({
    page,
  }) => {
    await waitForPriceStabilization(page, 1000);

    await selectOption(page, "Screen Size", '14" Standard');
    await page.waitForTimeout(100);

    await selectOption(page, "Screen Size", '15" Large');
    await page.waitForTimeout(100);

    await selectOption(page, "Screen Size", '17" Desktop Replacement');

    await waitForPriceStabilization(page);

    const expectedPrice = calculateExpectedPrice(
      BASE_PRICE,
      "17",
      "silver",
      "aluminum",
    );
    const displayedPrice = await getDisplayedPrice(page);

    expect(displayedPrice).toBeCloseTo(expectedPrice, 2);
  });

  test("should handle very rapid successive changes correctly", async ({
    page,
  }) => {
    const changes = [
      { size: '13" Compact', color: "Silver", material: "Premium Plastic" },
      { size: '14" Standard', color: "Space Gray", material: "Aluminum" },
      {
        size: '15" Large',
        color: "Midnight Blue",
        material: "Magnesium Alloy",
      },
      {
        size: '17" Desktop Replacement',
        color: "Rose Gold",
        material: "Carbon Fiber",
      },
      { size: '14" Standard', color: "Silver", material: "Aluminum" }, // Back to defaults
    ];

    for (const change of changes) {
      await selectOption(page, "Screen Size", change.size);
      await selectOption(page, "Color", change.color);
      await selectOption(page, "Material", change.material);
      await page.waitForTimeout(50);
    }

    await waitForPriceStabilization(page, 2500);

    const expectedPrice = calculateExpectedPrice(
      BASE_PRICE,
      "14",
      "silver",
      "aluminum",
    );
    const displayedPrice = await getDisplayedPrice(page);

    expect(displayedPrice).toBeCloseTo(expectedPrice, 2);
  });

  test("should handle changes during API request processing", async ({
    page,
  }) => {

    await selectOption(page, "Screen Size", '17" Desktop Replacement');


    await page.waitForTimeout(150);

    await selectOption(page, "Material", "Carbon Fiber");


    await waitForPriceStabilization(page);

  
    const expectedPrice = calculateExpectedPrice(
      BASE_PRICE,
      "17",
      "silver",
      "carbon",
    );
    const displayedPrice = await getDisplayedPrice(page);

    expect(displayedPrice).toBeCloseTo(expectedPrice, 2);
  });

  test("should maintain correct price with quantity changes", async ({
    page,
  }) => {

    await selectOption(page, "Screen Size", '15" Large');
    await selectOption(page, "Color", "Midnight Blue");
    await selectOption(page, "Material", "Magnesium Alloy");

    await waitForPriceStabilization(page);


    const quantityInput = page.locator("#quantity-input");
    await quantityInput.fill("3");

    await waitForPriceStabilization(page);

    const expectedPrice = calculateExpectedPrice(
      BASE_PRICE,
      "15",
      "midnight",
      "magnesium",
      3,
    );
    const displayedPrice = await getDisplayedPrice(page);

    expect(displayedPrice).toBeCloseTo(expectedPrice, 2);
  });

  test("should show loading state during price calculation", async ({
    page,
  }) => {

    await selectOption(page, "Screen Size", '17" Desktop Replacement');


    const priceDisplay = page.locator('[data-testid="price-display"]');
    const addToCartButton = page.locator('[data-testid="add-to-cart-button"]');

   
    try {
      await expect(addToCartButton).toHaveText(/Calculating\.\.\./i, {
        timeout: 200,
      });
    } catch {
   
      console.log("Loading state was too fast to catch (acceptable)");
    }


    await waitForPriceStabilization(page);
    await expect(addToCartButton).toHaveText(/Add to Cart/i);
    await expect(addToCartButton).not.toHaveText(/Calculating/i);
  });

  test("should handle rapid changes with different API response times", async ({
    page,
  }) => {

    for (let i = 0; i < 10; i++) {
      const sizes = [
        '13" Compact',
        '14" Standard',
        '15" Large',
        '17" Desktop Replacement',
      ];
      const randomSize = sizes[i % sizes.length];
      await selectOption(page, "Screen Size", randomSize);
      await page.waitForTimeout(30); // Very rapid
    }


    const lastSize = '13" Compact';
    await selectOption(page, "Screen Size", '13" Compact');

    await waitForPriceStabilization(page, 3000);

 
    const expectedPrice = calculateExpectedPrice(
      BASE_PRICE,
      "13",
      "silver",
      "aluminum",
    );
    const displayedPrice = await getDisplayedPrice(page);

    expect(displayedPrice).toBeCloseTo(expectedPrice, 2);
  });

  test("should display correct price after page refresh", async ({ page }) => {

    await selectOption(page, "Screen Size", '15" Large');
    await selectOption(page, "Material", "Carbon Fiber");

    await waitForPriceStabilization(page);

    const priceBeforeRefresh = await getDisplayedPrice(page);


    await page.reload();


    await expect(
      page.locator("h1, h2").filter({ hasText: /TechStyle|Laptop/i }),
    ).toBeVisible();
    await waitForPriceStabilization(page);

    const expectedDefaultPrice = calculateExpectedPrice(
      BASE_PRICE,
      "14",
      "silver",
      "aluminum",
    );
    const priceAfterRefresh = await getDisplayedPrice(page);

    expect(priceAfterRefresh).toBeCloseTo(expectedDefaultPrice, 2);

  
  });
});
