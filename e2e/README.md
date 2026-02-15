# E2E Tests - Price Calculation Race Condition (CFG-142)

## Overview

These end-to-end tests verify the fix for **CFG-142**: Price calculation race condition when rapidly changing multiple dropdown options.

## Bug Description

**Issue**: When users rapidly change multiple dropdown options (e.g., size, color, material), the displayed price sometimes doesn't match the selected configuration.

**Root Cause**: The API has variable latency (100-600ms simulated), which can cause responses to arrive out of order. Without proper request tracking, an older response can overwrite a newer one, showing incorrect prices.

**Customer Quote**: 
> "I selected Medium, then changed to Large, then to XL. The price showed the Medium price even though XL was selected. When I refreshed the page, it fixed itself."

## Test Coverage

The test suite covers the following scenarios:

1. **Rapid Option Changes** - Quickly change multiple options and verify correct final price
2. **Customer Bug Reproduction** - Exact reproduction of the reported bug (Medium → Large → XL)
3. **Very Rapid Successive Changes** - 5+ rapid changes with minimal delays
4. **Changes During API Processing** - Making changes while previous requests are still pending
5. **Quantity Changes** - Verify price updates correctly with configuration + quantity changes
6. **Loading State** - Verify loading indicators display correctly during calculation
7. **Multiple Race Conditions** - 10+ rapid changes to maximize out-of-order response probability
8. **Page Refresh** - Verify configuration/price reset behavior

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers (first time only)
pnpm exec playwright install
```

### Run Tests

```bash
# Run all E2E tests
pnpm run test:e2e

# Run with UI mode (interactive)
pnpm run test:e2e:ui

# Run in headed mode (see browser)
pnpm run test:e2e:headed

# Run in debug mode
pnpm run test:e2e:debug

# Run specific test file
pnpm exec playwright test price-calculation-race-condition

# Run specific test by name
pnpm exec playwright test -g "should display correct price after rapid option changes"
```

### View Test Report

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

## Test Architecture

### Helper Functions

- `calculateExpectedPrice()` - Calculates the expected price based on configuration
- `waitForPriceStabilization()` - Waits for debounce and API responses to complete
- `getDisplayedPrice()` - Extracts the numeric price from the displayed text
- `selectOption()` / `selectOptionById()` - Helper for selecting dropdown options

### Price Calculation Logic

The tests use the same pricing logic as the application:

- **Base Price**: $999.99
- **Size Modifiers**: 13" (-$100), 14" ($0), 15" (+$150), 17" (+$300)
- **Color Modifiers**: Silver/Space Gray ($0), Midnight (+$25), Rose Gold (+$50), Custom (+$75)
- **Material Modifiers**: Plastic (-$50), Aluminum ($0), Magnesium (+$100), Carbon (+$250)

## Key Test Selectors

The tests use `data-testid` attributes for reliable element selection:

- `[data-testid="total-price"]` - Main price display
- `[data-testid="price-display"]` - Price container (has loading class)
- `[data-testid="option-size"]` - Size dropdown
- `[data-testid="option-color"]` - Color dropdown (note: color picker, not select)
- `[data-testid="option-material"]` - Material dropdown
- `[data-testid="add-to-cart-button"]` - Add to cart button (shows loading state)
- `#quantity-input` - Quantity input field

## Expected Behavior

✅ **Correct Behavior** (with fix):
- Price updates to match the LAST selected configuration
- Loading state shows during calculation
- Old responses are discarded if a newer request is pending
- No race conditions regardless of API response order

❌ **Incorrect Behavior** (bug):
- Price shows configuration from a previous selection
- Out-of-order API responses overwrite newer selections
- Price doesn't match the visible configuration

## Debugging Failed Tests

If tests fail:

1. **Run in UI mode** to see exactly where it fails:
   ```bash
   pnpm run test:e2e:ui
   ```

2. **Check screenshots** in `test-results/` folder

3. **Run in headed mode** to watch the browser:
   ```bash
   pnpm run test:e2e:headed
   ```

4. **Increase stabilization time** if tests are flaky:
   ```typescript
   await waitForPriceStabilization(page, 3000); // Increase from 2000ms
   ```

5. **Check console logs** - The dev server output will show request IDs and timing

## CI/CD Integration

The tests are configured to run in CI environments:

- Automatic retries (2x) on CI
- HTML reporter for test results
- Screenshots on failure
- Traces on first retry

To run in CI mode:
```bash
CI=true pnpm run test:e2e
```

## Notes

- Tests use a 300ms debounce delay (same as production)
- API latency is simulated at 100-600ms (variable)
- Tests wait 2 seconds for stabilization by default
- Price comparisons use `toBeCloseTo()` for floating-point safety
