# Submission: [Marcin Wawrzczak]

## Time Spent

Total time: **5H** (approximate)

## Ticket Triage

### Tickets I Addressed

List the ticket numbers you worked on, in the order you addressed them:

1. **CFG-142: Price shows wrong value after rapid option change**:
   I replaced the function with the existing debounced one from the project and fixed its behavior so that configuration changes always display the correct price. Write e2e test

2. **CFG-148: Crash when deselecting "Include Packaging"**:
   I had to make an assumption because I couldn’t reproduce the bug.
   Fixed the function’s behavior and improved its readability.

3. **CFG-152: Accessibility - Can't navigate with keyboard only**:
   I added keyboard navigation support in the missing areas and implemented proper focus handling for modals.

4. **CFG-147: Share link broken for some configurations**:
   Fixed crashing when encoding and decoding functions were provided with Polish letters.

5. **CFG-143: App becomes sluggish after extended use**
   Wrote an E2E test to catch a memory leak and fixed the resize useEffect by clearing unused event listeners on unmount

### Tickets I Deprioritized

List tickets you intentionally skipped and why:

| Ticket  | Reason                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------- |
| CFG-149 | It has an indicator, but it’s purely cosmetic.                                                    |
| CFG-150 | It’s purely cosmetic.                                                                             |
| CFG-151 | Not business-related.                                                                             |
| CFG-155 | Easy on the eyes for night browsing, but not business-related.                                    |
| CFG-156 | For now, these are static lists and don’t cause issues, but they should be updated in the future. |
| CFG-157 | Good for UX, but there were more important things.                                                |

### Tickets That Need Clarification

List any tickets where you couldn't proceed due to ambiguity:

| Ticket  | Question                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------- |
| CFG-145 | Conflicting tickets—would like to clarify which one is more important?                               |
| CFG-144 | I’d prioritize adding the shortcut since Quick Add exists.                                           |
|         |                                                                                                      |
| CFG-153 | Worth asking about, but it would take extra work, so not doable in 4 hours at the moment             |
|         |
| CFG-154 | Hey, I need clarification on how the discount works ASAP because it's important for client business. |
|         | I’ve found a fix, but I’d like confirmation.                                                         |
|         |                                                                                                      |

---

## Technical Write-Up

### Critical Issues Found

Describe the most important bugs you identified:

#### Issue 1: Price shows wrong value after rapid option change

**Ticket(s):** CFG-142

**What was the bug?**

useCalculationPrice without debounce never had a chance to run because its requestID was incrementing by one, and new Date() returns a very large number, so the condition for setting the price was never met.

**How did you find it?**

First, I watched it live, then went to the code to see what triggered it. I added console logs in the if statements, and finally used AI to confirm my choices. Wrote a fast E2E test with AI to help test it because it’s important for the business.

**How did you fix it?**

Since there was little time, I switched to the debounced version that was already nearby.

**Why this approach?**

I think changing the function to a debounced version was the fastest option, and in production it will also reduce the number of API calls.

---

#### Issue 2: Price shows wrong value after rapid option change

**Ticket(s):** CFG-142

**What was the bug?**

The results came in randomly depending on the API response, so the one that arrived last always won. They weren’t cancelled when requests were aborted or the component was closed. Additionally, the request was sent with the previous configuration because the code was out of order: the calculation ran first, and only afterwards was the configuration set.

**How did you find it?**

First, I watched it live, then went to the code to see what triggered it. I added console logs in the if statements, and finally used AI to confirm my choices. Wrote a fast E2E test with AI to help test it because it’s important for the business.

**How did you fix it?**

Refactor the function to ensure the correct order: cancel previous requests if a new one is sent, and remove requests when the component unmounts.

**Why this approach?**

It’s critical for the business, so it needed some kind of test to prevent failures in production or financial loss for the client.

#### Issue 3: Crash when deselecting "Include Packaging"

**Ticket(s):** CFG-148

**What was the bug?**

The app didn’t crash, yet the state in the code was being mutated directly rather than through the setter.

**How did you find it?**

I traced the path of the ticket and found the functions that are used for this action.

**How did you fix it?**

Refactored the function to be clearer and use the state setter instead of mutating it directly. Consulted AI to confirm my logic and ensure it won’t crash.

**Why this approach?**

I had to improvise and couldn’t reproduce the bug, but I’d like to ask someone who can for more detailed guidance, since it’s important that it doesn’t crash during the demo.

#### Issue 4: Share link broken for some configurations

**Ticket(s):** CFG-147

**What was the bug?**

The URL encoding and decoding functions were only accepting ASCII characters and were crashing when non-ASCII characters were provided.

**How did you find it?**

I changed it to a simple product, and in the mock I modified the color value to include letters like ‘ś’ and ‘ć’ because inputs for engravings or custom text were not available.

**How did you fix it?**

Replaced it with TextEncoder/TextDecoder, which first converts the string into UTF-8 bytes. Thanks to this, the encode/decode process now works with any characters, not just ASCII.

### Other Changes Made

Add validation to quickAdd button
Added rounding in price.ts because unrounded numbers can lead to unexpected results in calculations sent to the backend (JS bug floating-point precision).

---

## Code Quality Notes

### Things I Noticed But Didn't Fix

List any issues you noticed but intentionally left:

| Issue      | Why I Left it                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
|            | Not enough time, and it's not business-breaking                                                                  |
| [eslint]   | We're using any types, which is bad practice, clear empty catch blocks to avoid silent errors.                   |
| [errors]   | Display state bug. The error is never cleared.                                                                   |
| [cleanups] | Certain useEffects don’t have cleanup functions; they should be properly cleaned up when the component unmounts. |

### Potential Improvements for the Future

If you had more time, what would you improve?

1. I would move inline styles to css files.

2. The components could be separated from the business logic by extracting custom hooks.

3. More tests are needed — every change introduces a risk of breaking something, and issues can easily go unnoticed.

4. The component itself needs some cleanup, and helper functions should be moved outside of it.

5. It would be better to debounce selection changes to avoid re-rendering on every config change

6. Using a state manager would make state handling more predictable and easier to maintain

---

## Questions for the Team

Questions you would ask in a real scenario:

1. How does the prioritization process work, and is it mainly based on business priorities, or are technical aspects also considered? Code like this can be problematic in the long term due to issues such as missing tests, duplicated code, overcomplicated implementations, and similar problems.

---

## Assumptions Made

List any assumptions you made to proceed:

1. I assumed that the most important aspect of this demo is the business flow. Ensuring that everything works for the user and allows adding configurations to the cart.

---

## Self-Assessment

### What went well?

I think it went well because I managed to complete some of the high-priority tasks, get familiar with the repo, and prepare a plan for the next tasks.

### What was challenging?

The codebase is hard to jump into at the start because the files are very long, there’s little help navigating it, and multiple responsibilities and business logic are mixed within the UI components.
Reproducing some bugs without anyone to ask for more details.
Lack of tests, which can lead to bugs

### What would you do differently with more time?

I would reach out to the team sooner for clarifications instead of making assumptions, since unclear requirements slow down the process. Introduce a test to improve the scalability and predictability of the code.

---
