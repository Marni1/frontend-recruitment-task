# Backlog: ProductConfigurator

These tickets were pulled from our Jira board. They're in rough priority order based on the last sprint planning, but use your judgment—some priorities may have changed.

---

## CFG-142: Price shows wrong value after rapid option changes

**Reporter:** Customer Success (Jamie)
**Created:** 3 days ago

### Description

Multiple customers have reported that the price display sometimes shows incorrect values. It seems to happen when users quickly change several options in succession.

### Steps to Reproduce

1. Open the configurator with a complex product
2. Rapidly change multiple dropdown options (e.g., size, then color, then material)
3. The displayed price sometimes doesn't match what it should be

### Customer Quote

> "I selected Medium, then changed to Large, then to XL. The price showed the Medium price even though XL was selected. When I refreshed the page, it fixed itself."

### Notes

This is blocking for the TechStyle demo. They configure high-volume orders and will definitely hit this.

---

## CFG-143: App becomes sluggish after extended use

**Reporter:** QA (Alex)
**Created:** 5 days ago

### Description

During testing sessions, the configurator becomes noticeably slower after 15-20 minutes of use. Browser dev tools show increasing memory usage over time.

### Steps to Reproduce

1. Open the configurator
2. Make various configuration changes over ~20 minutes
3. Resize the browser window several times during the session
4. Notice increasing lag in UI responses

### Notes

Hard to reproduce consistently. Might be related to the preview image generation? Or something with the resize handling for responsive layout.

---

## CFG-144: Remove the "Quick Add" feature

**Reporter:** Product (Sarah)
**Created:** 1 week ago

### Description

Per discussion in the product sync, we've decided to sunset the Quick Add feature. It's confusing users and the analytics show only 2% usage.

Please remove the Quick Add button and all related code.

### Acceptance Criteria

- Quick Add button should not be visible
- Related state and handlers should be removed
- No console errors after removal

---

## CFG-145: Improve Quick Add feature with keyboard shortcut

**Reporter:** Customer Success (Jamie)
**Created:** 4 days ago

### Description

Enterprise customers love the Quick Add feature! TechStyle specifically asked if we can add a keyboard shortcut for it (Ctrl+Enter or similar).

### Customer Quote

> "The Quick Add feature is a huge time saver for our team. Would be even better with a hotkey."

### Notes

This came from the TechStyle account review. They're a key customer for the upcoming demo.

---

## CFG-146: "Last saved" timestamp shows wrong time

**Reporter:** QA (Alex)
**Created:** 2 days ago

### Description

The "Last saved at" timestamp in the draft saving feature shows times that are off by several hours for some users.

### Steps to Reproduce

1. Save a draft configuration
2. Note the displayed "Last saved at" time
3. Compare with actual current time

### Notes

Seems to happen for users not in UTC timezone. Low priority since it's just cosmetic, but might confuse users.

---

## CFG-147: Share link broken for some configurations

**Reporter:** Customer Success (Jamie)
**Created:** 6 days ago

### Description

Some customers report that shared configuration links don't work. When clicked, they either show an error or load the wrong configuration.

### Steps to Reproduce

Unable to reproduce consistently. Customer provided this example configuration that breaks:

- Size: 10" Large
- Color: Blue (Custom #3)
- Quantity: 5

### Notes

The customer's configuration name included special characters. Not sure if that's related. Jamie has the customer's contact if we need more info.

---

## CFG-148: Crash when deselecting "Include Packaging"

**Reporter:** QA (Alex)
**Created:** 1 day ago

### Description

The configurator crashes completely when you deselect "Include Packaging" after selecting certain options.

### Steps to Reproduce

1. Start a new configuration
2. Select "Premium Material" upgrade
3. Check "Include Packaging"
4. Select "Gift Wrap" add-on (which requires packaging)
5. Uncheck "Include Packaging"
6. **CRASH** - white screen, console shows React error

### Error Message

```
Cannot read properties of undefined (reading 'price')
```

### Notes

This is a blocker. We can't ship with a crash bug.

---

## CFG-149: Add loading indicator during price calculation

**Reporter:** UX (Morgan)
**Created:** 1 week ago

### Description

When the price is being calculated (after changing options), the old price stays visible. This could confuse users into thinking their selection didn't change anything.

### Acceptance Criteria

- Show a subtle loading state while price is being calculated
- Could be a spinner, skeleton, or just dim the price text

### Notes

Nice to have for polish. The price calculation is usually fast enough that it might not be noticeable.

---

## CFG-150: Fix the CSS alignment on the color picker

**Reporter:** UX (Morgan)
**Created:** 3 days ago

### Description

The color picker swatches are misaligned on mobile viewports. The last row wraps awkwardly.

### Attached Screenshot

[screenshot_mobile_colors.png - not available in this export]

### Notes

Morgan mentioned this is actually a JavaScript issue with how we calculate the grid, not CSS. Something about the column count calculation.

---

## CFG-151: Error messages are too technical

**Reporter:** Customer Success (Jamie)
**Created:** 2 days ago

### Description

When something goes wrong, users see technical error codes like "ERR_PRICE_CALC_FAILED" or "VALIDATION_CONFLICT_47". These mean nothing to end users.

### Customer Quote

> "I got an error that said 'ERR_NETWORK_TIMEOUT_PRICE'. I have no idea what that means or what to do about it."

### Acceptance Criteria

- Error messages should be user-friendly
- Include actionable next steps (e.g., "Please try again" or "Contact support")

---

## CFG-152: Accessibility - Can't navigate with keyboard only

**Reporter:** QA (Alex)
**Created:** 4 days ago

### Description

Users who rely on keyboard navigation cannot fully use the configurator. Some elements are unreachable without a mouse.

### Affected Areas (from audit)

1. Color picker swatches not focusable
2. Quantity increment/decrement buttons missing focus styles
3. After closing a modal with Escape, focus goes to body instead of trigger
4. Custom dropdown options not navigable with arrow keys

### Notes

We have an accessibility audit coming up for TechStyle (they have compliance requirements). This should probably be prioritized higher than Low.

---

## CFG-153: Implement "Compare Configurations" feature

**Reporter:** Product (Sarah)
**Created:** 1 week ago

### Description

As discussed with the enterprise team, we need to add the ability to compare two saved configurations side-by-side.

### User Story

As a buyer, I want to compare two configurations so that I can decide which option better fits my needs.

### Acceptance Criteria

- User can select two saved configurations
- Side-by-side view shows differences highlighted
- Price difference should be prominently displayed

### Notes

This is a significant feature. Estimate was 2-3 weeks. Not sure why it's in this sprint.

---

## CFG-154: Quantity discount not applying correctly

**Reporter:** Customer Success (Jamie)
**Created:** 2 days ago

### Description

The quantity discount tiers seem to be off by one. Users need to enter 51 items to get the "50+ items" discount.

### Steps to Reproduce

1. Configure any product
2. Set quantity to exactly 50
3. Notice the discount doesn't apply
4. Change to 51, discount appears

### Notes

As per Sarah's Slack message last week, this is actually the intended behavior due to how our pricing engine works. But maybe we should update the UI to say "51+" instead?

Wait, I just re-read Sarah's message. She was talking about a different threshold. Can someone clarify?

---

## CFG-155: Add dark mode support

**Reporter:** Product (Sarah)
**Created:** 2 weeks ago

### Description

Several customers have requested dark mode support. Our widget should respect the parent site's color scheme.

### Acceptance Criteria

- Detect `prefers-color-scheme` media query
- Alternatively, accept a `theme` prop from parent
- All colors should have dark mode variants

### Notes

Nice to have. Would be great for the TechStyle demo since their site uses dark mode, but not critical.

---

## CFG-156: Console warnings about missing keys in lists

**Reporter:** QA (Alex)
**Created:** 5 days ago

### Description

React dev tools shows warnings about missing `key` props in several list renders. Not causing visible issues but should be cleaned up.

### Locations Noted

- Option list rendering
- Color swatch mapping
- Add-on checkboxes

---

## CFG-157: Discard unsaved changes confirmation

**Reporter:** UX (Morgan)
**Created:** 1 week ago

### Description

When a user has unsaved changes and tries to navigate away or close the configurator, they should get a confirmation dialog. Currently, changes are silently lost.

### Acceptance Criteria

- Detect when there are unsaved changes
- Show confirmation dialog on close/navigate
- "Save & Close" and "Discard" options

### Notes

Standard UX pattern. Surprised we don't have this already.
