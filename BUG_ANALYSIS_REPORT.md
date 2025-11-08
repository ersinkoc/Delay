# Comprehensive Bug Analysis Report
**Repository:** @oxog/delay
**Date:** 2025-11-08
**Analysis Type:** Comprehensive Repository Bug Analysis
**Total Bugs Found:** 20

---

## Executive Summary

This analysis identified **20 verifiable bugs** across critical categories:
- **4 CRITICAL** resource leak bugs causing memory leaks and test hangs
- **6 HIGH** severity bugs including type safety and logic errors
- **7 MEDIUM** severity bugs including dead code and race conditions
- **3 LOW** severity bugs including deprecated APIs and edge cases
- **2 CONFIGURATION** bugs breaking linting and type checking

**Key Findings:**
- Resource leaks in event listener and timer management causing test suite to hang
- TypeScript type errors preventing type checking from passing
- ESLint configuration incompatible with installed ESLint v9
- Uninitialized variables causing undefined return values
- Dead code repetition across multiple files

---

## CRITICAL SEVERITY BUGS

### BUG-001: Event Listener Memory Leak
**Severity:** CRITICAL
**Category:** Functional / Resource Leak
**File:** `src/core/cancellable.ts`
**Lines:** 36-39

**Description:**
Event listener added to original abort signal is never removed when delay completes normally, causing memory leak.

**Current Behavior:**
```typescript
options.signal?.addEventListener('abort', () => {
  isCancelled = true;
  controller.abort();
});
```

**Expected Behavior:**
Event listener should be removed when promise settles.

**Root Cause:**
No cleanup logic for event listeners when the delay completes successfully.

**Impact Assessment:**
- **User Impact:** Memory leaks in applications using cancellable delays repeatedly
- **System Impact:** Growing memory consumption, potential OOM crashes
- **Business Impact:** Poor performance, reliability issues

**Reproduction:**
```typescript
const controller = new AbortController();
for (let i = 0; i < 1000; i++) {
  await delay.cancellable(10, { signal: controller.signal });
}
// Memory leak: 1000 event listeners remain attached
```

**Verification:**
Test suite shows: "A worker process has failed to exit gracefully... tests leaking due to improper teardown"

**Dependencies:**
- Related to BUG-002 (similar pattern)

---

### BUG-002: Timer and Event Listener Leak in Conditional Delay
**Severity:** CRITICAL
**Category:** Functional / Resource Leak
**File:** `src/core/parser.ts`
**Lines:** 67, 74

**Description:**
1. `setTimeout` in recursive `check()` function is never stored, preventing cleanup
2. Abort event listener is never removed when condition becomes true

**Current Behavior:**
```typescript
const check = (): void => {
  // ...
  setTimeout(check, checkInterval); // Not stored!
};

signal?.addEventListener('abort', handleAbort); // Never removed on success
```

**Expected Behavior:**
- Store timeout ID to enable cleanup
- Remove event listener when condition is met or promise settles

**Root Cause:**
Missing resource management for timers and event listeners.

**Impact Assessment:**
- **User Impact:** Memory and timer leaks when using `delay.until()` or `delay.while()`
- **System Impact:** Accumulating timers and listeners causing performance degradation
- **Business Impact:** Application instability, increased resource costs

**Reproduction:**
```typescript
for (let i = 0; i < 100; i++) {
  await delay.until(() => true);
}
// 100+ event listeners and potential timer leaks
```

**Verification:**
Test suite hangs and requires force exit due to active timers.

---

### BUG-003: Timeout Promise Resource Leak
**Severity:** CRITICAL
**Category:** Functional / Resource Leak
**File:** `src/utils/promise.ts`
**Lines:** 19-33

**Description:**
Timeout created in `createTimeoutPromise` is never stored or cleared. If used in a race and another promise wins, setTimeout continues and eventually rejects, causing unhandled rejection.

**Current Behavior:**
```typescript
export function createTimeoutPromise<T>(ms: number, error?: Error): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {  // Never stored or cleared!
      const timeoutError = error || new DelayError(/*...*/);
      reject(timeoutError);
    }, ms);
  });
}
```

**Expected Behavior:**
Should return cancellable timeout that can be cleaned up when no longer needed.

**Root Cause:**
Missing timeout management in promise utilities.

**Impact Assessment:**
- **User Impact:** Unhandled promise rejections in race conditions
- **System Impact:** Timer leaks and unnecessary timer callbacks
- **Business Impact:** Application crashes from unhandled rejections

**Reproduction:**
```typescript
const fast = Promise.resolve('fast');
const slow = createTimeoutPromise(5000);
await Promise.race([fast, slow]);
// Timeout still fires after 5 seconds causing unhandled rejection
```

---

### BUG-004: Idle Callback Timeout Resource Leak
**Severity:** CRITICAL
**Category:** Functional / Resource Leak
**File:** `src/utils/browser.ts`
**Lines:** 61-77

**Description:**
The setTimeout used for idle callback timeout handling is never stored or cleared. If idle callback fires before timeout, the timeout continues and tries to cancel/reject an already-resolved promise.

**Current Behavior:**
```typescript
return new Promise<IdleDeadline>((resolve, reject) => {
  const id = requestIdleCallback(resolve, options);

  if (options.timeout) {
    setTimeout(() => {  // Never stored!
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(id);
      }
      reject(new DelayError(/*...*/));
    }, options.timeout);
  }
});
```

**Expected Behavior:**
Store timeout ID and clear it when idle callback fires first.

**Root Cause:**
Missing coordination between idle callback and timeout timer.

**Impact Assessment:**
- **User Impact:** Timer leaks and potential errors when using `delay.idle()`
- **System Impact:** Accumulating timers in browser environments
- **Business Impact:** Poor UX due to memory leaks

---

## HIGH SEVERITY BUGS

### BUG-005: Infinite Loop Potential in Busy Wait
**Severity:** HIGH
**Category:** Functional / Logic Error
**File:** `src/core/scheduler.ts`
**Lines:** 116-118

**Description:**
No escape mechanism if `getHighResolutionTime()` malfunctions, time goes backwards, or if `ms` is very large. Could freeze entire application.

**Current Behavior:**
```typescript
while (getHighResolutionTime() - startTime < ms) {
  // Busy wait - this is intentionally blocking for precision
}
```

**Expected Behavior:**
Add safety limit to prevent infinite loops.

**Root Cause:**
No bounds checking or iteration limits on busy wait loop.

**Impact Assessment:**
- **User Impact:** Complete application freeze
- **System Impact:** CPU pinned at 100%, application unresponsive
- **Business Impact:** Application crashes, user data loss

---

### BUG-006: Uninitialized Variable Returns Undefined
**Severity:** HIGH
**Category:** Type Safety / Logic Error
**File:** `src/utils/throttle-debounce.ts`
**Lines:** 15, 31, 113

**Description:**
Variable `result` is declared but never initialized. When `leading = false` or function hasn't been invoked yet, returns `undefined` despite type signature claiming `ReturnType<T>`.

**Current Behavior:**
```typescript
let result: ReturnType<T>;  // Never initialized!

function leadingEdge(time: number): ReturnType<T> {
  return leading ? invokeFunc(time) : result;  // Returns undefined if !leading
}

function throttled(...args: Parameters<T>): ReturnType<T> {
  // ...
  return result;  // Returns undefined!
}
```

**Expected Behavior:**
Either initialize with default value or change return type to `ReturnType<T> | undefined`.

**Root Cause:**
Type system bypass allowing undefined to be returned as non-undefined type.

**Impact Assessment:**
- **User Impact:** Unexpected undefined values causing runtime errors
- **System Impact:** Type safety violations, unpredictable behavior
- **Business Impact:** Data corruption, logic errors

---

### BUG-007: Array Index Out of Bounds
**Severity:** HIGH
**Category:** Logic Error
**File:** `src/utils/promise.ts`
**Lines:** 79-94

**Description:**
The `errors` array is sized based on original `promises` array, but timeout promise may be added to `racePromises`, causing index mismatch.

**Current Behavior:**
```typescript
const errors: Error[] = [];  // Wrong size!
racePromises.forEach((promise, index) => {
  promise.catch(error => {
    errors[index] = error;  // If timeout added, index wrong!
    // ...
  });
});
```

**Expected Behavior:**
Size `errors` array based on `racePromises.length` after timeout is potentially added.

**Root Cause:**
Array initialization doesn't account for dynamically added timeout promise.

---

### BUG-008: TypeScript Configuration - Missing NodeJS Types
**Severity:** HIGH
**Category:** Configuration / Type Safety
**File:** `tsconfig.json`

**Description:**
TypeScript cannot find `NodeJS` namespace despite `@types/node` being installed. Type checking fails with 11 errors.

**Current Errors:**
```
src/core/delay.ts(35,20): error TS2503: Cannot find namespace 'NodeJS'.
src/core/delay.ts(36,29): error TS2503: Cannot find namespace 'NodeJS'.
... (9 more similar errors)
src/utils/time.ts(175,14): error TS2580: Cannot find name 'process'.
```

**Expected Behavior:**
`npm run typecheck` should pass without errors.

**Root Cause:**
TypeScript compiler not properly resolving `@types/node` package types.

**Impact Assessment:**
- **User Impact:** Cannot verify type safety before publishing
- **System Impact:** Potential type-related bugs in production
- **Business Impact:** Risk of shipping broken types to consumers

---

### BUG-009: Undefined Variable in Retry Error Handling
**Severity:** HIGH
**Category:** Type Safety
**File:** `src/core/retry.ts`
**Line:** 82

**Description:**
If `attempts` is 0 or negative, loop never executes and `lastError` is undefined.

**Current Behavior:**
```typescript
throw lastError!;  // Could be undefined!
```

**Expected Behavior:**
Provide fallback error message.

**Root Cause:**
Reliance on non-null assertion without validation.

---

### BUG-010: Non-null Assertions on Regex Captures
**Severity:** HIGH
**Category:** Type Safety
**File:** `src/utils/time.ts`
**Lines:** 59, 60, 123, 124

**Description:**
Using non-null assertion on regex capture groups without validating they exist.

**Current Behavior:**
```typescript
const value = parseFloat(match[1]!);  // Could be undefined!
const unitStr = match[2]!;            // Could be undefined!
```

**Expected Behavior:**
Validate capture groups exist before accessing.

---

## MEDIUM SEVERITY BUGS

### BUG-011: Dead Code - Redundant Type Checks
**Severity:** MEDIUM
**Category:** Code Quality
**Files:**
- `src/core/scheduler.ts` (lines 71-75, 83-87, 160-165)
- `src/core/repeat.ts` (lines 41-45, 95-99)
- `src/core/delay.ts` (lines 40-44, 47-51, 85-90)
- `src/utils/throttle-debounce.ts` (lines 76-80, 198-202, 206-210)

**Description:**
Both branches of type check do exactly the same thing. `clearTimeout` works identically for both `number` and `NodeJS.Timeout`.

**Current Behavior:**
```typescript
if (typeof batchTimeoutId === 'number') {
  clearTimeout(batchTimeoutId);
} else {
  clearTimeout(batchTimeoutId);  // Exact same code!
}
```

**Expected Behavior:**
```typescript
clearTimeout(batchTimeoutId);
```

**Impact Assessment:**
- **User Impact:** None (functional)
- **System Impact:** Code bloat, harder to maintain
- **Business Impact:** Technical debt

**Total Occurrences:** 10+ instances across 4 files

---

### BUG-012: Race Condition in Batch Processing
**Severity:** MEDIUM
**Category:** Race Condition
**File:** `src/core/scheduler.ts`
**Lines:** 17-23

**Description:**
TOCTOU (Time-of-Check-Time-of-Use) race condition between checking `isProcessing` and setting it.

**Current Behavior:**
```typescript
if (isProcessing || pendingDelays.length === 0) {
  return;
}
isProcessing = true;  // Another call could have happened between check and set
```

---

### BUG-013: Error Swallowing in Repeat Functions
**Severity:** MEDIUM
**Category:** Error Handling
**File:** `src/core/repeat.ts`
**Lines:** 21-26, 80-86

**Description:**
Errors completely swallowed with just `console.error`. No way for users to handle errors or stop on error.

**Current Behavior:**
```typescript
try {
  await fn();
} catch (error) {
  console.error('Error in repeat function:', error);
}
```

**Expected Behavior:**
Add error callback option for user error handling.

---

### BUG-014: ESLint v9 Configuration Incompatibility
**Severity:** MEDIUM
**Category:** Configuration
**File:** `.eslintrc.js`

**Description:**
Project uses `.eslintrc.js` (old format) but ESLint 9.39.1 requires new `eslint.config.js` format.

**Current Error:**
```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
From ESLint v9.0.0, the default configuration file is now eslint.config.js.
```

**Expected Behavior:**
`npm run lint` should execute successfully.

**Impact Assessment:**
- **User Impact:** Cannot run linting
- **System Impact:** Code quality checks disabled
- **Business Impact:** Risk of shipping poor quality code

---

### BUG-015: Edge Case - Time Going Backwards
**Severity:** MEDIUM
**Category:** Edge Case
**File:** `src/core/scheduler.ts`
**Lines:** 145-155

**Description:**
If system time goes backwards, drift calculation could cause very large or very small next intervals.

---

### BUG-016: Missing Timeout Cleanup in Race
**Severity:** MEDIUM
**Category:** Resource Leak
**File:** `src/utils/promise.ts`
**Lines:** 9-13

**Description:**
Timeout promise created but never cleaned up when other promise wins race.

---

### BUG-017: Broken Plugin Function Override
**Severity:** MEDIUM
**Category:** Functional
**File:** `src/plugins/plugin-manager.ts`
**Lines:** 78-99

**Description:**
Logging plugin's function override approach is fundamentally flawed. Uses `delay.bind({})` and `Object.assign` which don't work correctly.

---

## LOW SEVERITY BUGS

### BUG-018: Deprecated API Usage
**Severity:** LOW
**Category:** Code Quality
**File:** `src/utils/time.ts`
**Lines:** 175-178

**Description:**
`process.hrtime()` is deprecated in Node.js 10.7.0+. Should use `process.hrtime.bigint()`.

**Current Behavior:**
```typescript
if (typeof process !== 'undefined' && process.hrtime) {
  const hr = process.hrtime();
  return hr[0] * 1000 + hr[1] / 1000000;
}
```

---

### BUG-019: Edge Case - Past Date Handling
**Severity:** LOW
**Category:** Edge Case
**File:** `src/core/parser.ts`
**Line:** 19

**Description:**
If target date is in the past, resolves immediately without warning.

---

### BUG-020: Type Safety - Unsafe Type Assertions
**Severity:** LOW
**Category:** Type Safety
**File:** `src/index.ts`
**Lines:** 183, 190

**Description:**
Using `as any` to bypass type system completely.

**Current Behavior:**
```typescript
(delay as any)[name] = descriptor.value.bind(instance);
```

---

## Summary by Category

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Resource Leak | 5 | 4 | 0 | 1 | 0 |
| Type Safety | 5 | 0 | 3 | 0 | 2 |
| Logic Error | 3 | 0 | 2 | 1 | 0 |
| Configuration | 2 | 0 | 1 | 1 | 0 |
| Code Quality | 3 | 0 | 0 | 2 | 1 |
| Error Handling | 1 | 0 | 0 | 1 | 0 |
| Edge Cases | 2 | 0 | 0 | 1 | 1 |

---

## Priority Matrix

### Immediate (Must Fix)
1. BUG-001 - Event listener leak (breaks tests)
2. BUG-002 - Timer and event listener leak (breaks tests)
3. BUG-003 - Timeout resource leak
4. BUG-004 - Idle callback leak
5. BUG-008 - TypeScript configuration
6. BUG-014 - ESLint configuration

### High Priority (Should Fix)
7. BUG-005 - Infinite loop potential
8. BUG-006 - Uninitialized variable
9. BUG-007 - Array index out of bounds
10. BUG-009 - Undefined error variable
11. BUG-010 - Non-null assertions

### Medium Priority (Should Fix Soon)
12. BUG-011 - Dead code (10+ occurrences)
13. BUG-012 - Race condition
14. BUG-013 - Error swallowing

### Low Priority (Nice to Fix)
15. BUG-015 through BUG-020

---

## Testing Evidence

**Test Suite Status:** ✅ All 479 tests pass BUT with resource leaks
```
Test Suites: 20 passed, 20 total
Tests:       479 passed, 479 total
```

**Resource Leak Evidence:**
```
A worker process has failed to exit gracefully and has been force exited.
This is likely caused by tests leaking due to improper teardown.
Force exiting Jest: Have you considered using `--detectOpenHandles`
to detect async operations that kept running after all tests finished?
```

**Type Checking Status:** ❌ FAILS with 11 errors
```
error TS2503: Cannot find namespace 'NodeJS'. (9 occurrences)
error TS2580: Cannot find name 'process'. (2 occurrences)
```

**Linting Status:** ❌ FAILS - Configuration incompatible
```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

**Security Audit:** ✅ No vulnerabilities
```
found 0 vulnerabilities
```

---

## Next Steps

1. Fix critical resource leaks (BUG-001 through BUG-004)
2. Fix configuration issues (BUG-008, BUG-014)
3. Fix high-priority type safety issues
4. Remove dead code
5. Add comprehensive tests for each fix
6. Re-run full test suite
7. Verify no resource leaks remain
8. Generate final report
