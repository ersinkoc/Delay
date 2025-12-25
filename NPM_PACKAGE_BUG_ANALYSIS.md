# Zero-Dependency NPM Package Bug Analysis Report

**Package**: @oxog/delay
**Version**: 1.0.3
**Analysis Date**: 2025-12-25
**Analyst**: Claude Code

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Bugs Found** | 9 |
| **Critical** | 0 |
| **High** | 2 |
| **Medium** | 5 |
| **Low** | 2 |
| **Code Quality Issues** | 2 |

---

## Critical Bugs

### None Found ✅

The package passes all existing tests and TypeScript strict mode checks.

---

## High Priority Bugs

### BUG-001: Incorrect Drift Calculation in Timer Compensation
**Severity**: HIGH
**Category**: Logic Error
**Location**: `src/core/scheduler.ts:158-160`

**Problem**:
The drift compensation logic contains a mathematical error that causes `adjustedDrift` to always equal 0.

**Current Code**:
```typescript
const newStart = current - count * interval;
const adjustedTarget = newStart + count * interval;
const adjustedDrift = current - adjustedTarget;
```

**Mathematical Analysis**:
```
adjustedTarget = (current - count * interval) + count * interval
adjustedTarget = current
adjustedDrift = current - current = 0
```

**Expected**: The drift compensation should actually adjust the next interval based on time jumps.

**Root Cause**: Incorrect mathematical formula. The calculation cancels itself out.

**Impact**: When system time jumps backwards, the drift compensation doesn't work correctly, leading to inaccurate timing.

**Fix Required**: Revise the drift calculation logic.

---

### BUG-002: Incorrect maxWait Timeout Calculation in Debounce
**Severity**: HIGH
**Category**: Logic Error
**Location**: `src/utils/throttle-debounce.ts:237`

**Problem**:
When `maxWait` is used with debounce, the `maxTimerId` is set with the full `maxWait` duration from the current time, not from the first call time.

**Current Code**:
```typescript
if (maxWait !== undefined) {
  timerId = setTimeout(timerExpired, ms);
  maxTimerId = setTimeout(timerExpired, maxWait);  // BUG: Should be maxWait - timeSinceLastInvoke
  return leading ? invokeFunc(lastCallTime) : result;
}
```

**Expected**: The maxWait timer should account for time already elapsed since the first call.

**Root Cause**: The timeout uses `maxWait` directly instead of calculating remaining time.

**Impact**: The debounced function may not invoke at the correct maxWait interval, especially with rapid repeated calls.

**Fix Required**:
```typescript
maxTimerId = setTimeout(timerExpired, maxWait - (time - lastInvokeTime));
```

---

## Medium Priority Bugs

### BUG-003: Inconsistent Error Type in parser.ts (Line 32)
**Severity**: MEDIUM
**Category**: API Consistency
**Location**: `src/core/parser.ts:32`

**Problem**: Throws generic `Error` instead of `DelayError`.

**Current Code**:
```typescript
throw new Error('Invalid target type for until delay');
```

**Expected**:
```typescript
throw new DelayError(
  'Invalid target type for until delay',
  DelayErrorCode.INVALID_OPTIONS,
  { target }
);
```

**Impact**: Inconsistent error handling, consumers can't catch specific delay errors.

---

### BUG-004: Inconsistent Error Type in parser.ts (Line 51)
**Severity**: MEDIUM
**Category**: API Consistency
**Location**: `src/core/parser.ts:51`

**Problem**: Throws generic `Error` instead of `DelayError`.

**Current Code**:
```typescript
reject(new Error('Delay was aborted'));
```

**Expected**:
```typescript
reject(new DelayError('Delay was aborted', DelayErrorCode.CANCELLED));
```

**Impact**: Inconsistent error handling.

---

### BUG-005: Inconsistent Error Type in parser.ts (Line 76)
**Severity**: MEDIUM
**Category**: API Consistency
**Location**: `src/core/parser.ts:76`

**Problem**: Throws generic `Error` instead of `DelayError`.

**Current Code**:
```typescript
reject(new Error('Delay was cancelled'));
```

**Expected**:
```typescript
reject(new DelayError('Delay was cancelled', DelayErrorCode.CANCELLED));
```

**Impact**: Inconsistent error handling.

---

### BUG-006: Inconsistent Error Type in parser.ts (Line 101)
**Severity**: MEDIUM
**Category**: API Consistency
**Location**: `src/core/parser.ts:101`

**Problem**: Throws generic `Error` instead of `DelayError`.

**Current Code**:
```typescript
reject(new Error('Delay was cancelled'));
```

**Expected**:
```typescript
reject(new DelayError('Delay was cancelled', DelayErrorCode.CANCELLED));
```

**Impact**: Inconsistent error handling.

---

### BUG-007: Inconsistent Error Type in plugin-manager.ts (Line 13)
**Severity**: MEDIUM
**Category**: API Consistency
**Location**: `src/plugins/plugin-manager.ts:13`

**Problem**: Throws generic `Error` instead of `DelayError`.

**Current Code**:
```typescript
throw new Error(`Plugin with name "${plugin.name}" is already registered`);
```

**Expected**:
```typescript
throw new DelayError(
  `Plugin with name "${plugin.name}" is already registered`,
  DelayErrorCode.INVALID_OPTIONS,
  { pluginName: plugin.name }
);
```

**Impact**: Inconsistent error handling across the library.

---

## Low Priority Bugs

### BUG-008: Inconsistent Error Type in plugin-manager.ts (Line 26)
**Severity**: LOW
**Category**: API Consistency
**Location**: `src/plugins/plugin-manager.ts:26`

**Problem**: Throws generic `Error` instead of `DelayError`.

**Current Code**:
```typescript
throw new Error(`Plugin with name "${pluginName}" is not registered`);
```

**Expected**:
```typescript
throw new DelayError(
  `Plugin with name "${pluginName}" is not registered`,
  DelayErrorCode.INVALID_OPTIONS,
  { pluginName }
);
```

**Impact**: Minor API inconsistency.

---

### BUG-009: Inconsistent Error Type in plugin-manager.ts (Line 63)
**Severity**: LOW
**Category**: API Consistency
**Location**: `src/plugins/plugin-manager.ts:63`

**Problem**: Throws generic `Error` instead of `DelayError`.

**Current Code**:
```typescript
throw new Error('Delay instance not set');
```

**Expected**:
```typescript
throw new DelayError(
  'Delay instance not set',
  DelayErrorCode.INVALID_OPTIONS
);
```

**Impact**: Minor API inconsistency.

---

## Code Quality Issues

### QUALITY-001: Dead Code in time.ts (Lines 131-137)
**Severity**: INFO
**Category**: Code Quality
**Location**: `src/utils/time.ts:131-137`

**Problem**: Redundant null check for regex capture groups.

**Code**:
```typescript
if (!match[1] || !match[2]) {
  throw new DelayError(
    `Invalid time format: ${target}. Missing hours or minutes`,
    DelayErrorCode.INVALID_TIME_STRING,
    { target, match }
  );
}
```

**Analysis**: The regex pattern `/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i` guarantees that if `match` is truthy, then `match[1]` and `match[2]` will exist and contain strings. This check can never fail.

**Impact**: Minor - adds unnecessary code but doesn't affect functionality.

**Recommendation**: Remove dead code or add a comment explaining defensive programming.

---

### QUALITY-002: Inconsistent Logging
**Severity**: INFO
**Category**: Code Quality
**Locations**: Multiple files

**Problem**: Direct `console.log/warn/error` calls scattered throughout the codebase.

**Files Affected**:
- `src/core/cancellable.ts:71`
- `src/core/retry.ts:56`
- `src/core/repeat.ts:33, 37, 108, 112`
- `src/core/scheduler.ts:156`
- `src/core/parser.ts:21`
- `src/plugins/plugin-manager.ts:54, 71, 88, 94, 100, 180`

**Impact**: Makes it difficult to control logging in production environments.

**Recommendation**: Consider using a logging abstraction or making logging configurable.

---

## Bug Summary Table

| ID | Severity | Category | File | Line | Status |
|----|----------|----------|------|------|--------|
| BUG-001 | HIGH | Logic | scheduler.ts | 158-160 | 🔴 Not Fixed |
| BUG-002 | HIGH | Logic | throttle-debounce.ts | 237 | 🔴 Not Fixed |
| BUG-003 | MEDIUM | API | parser.ts | 32 | 🔴 Not Fixed |
| BUG-004 | MEDIUM | API | parser.ts | 51 | 🔴 Not Fixed |
| BUG-005 | MEDIUM | API | parser.ts | 76 | 🔴 Not Fixed |
| BUG-006 | MEDIUM | API | parser.ts | 101 | 🔴 Not Fixed |
| BUG-007 | MEDIUM | API | plugin-manager.ts | 13 | 🔴 Not Fixed |
| BUG-008 | LOW | API | plugin-manager.ts | 26 | 🔴 Not Fixed |
| BUG-009 | LOW | API | plugin-manager.ts | 63 | 🔴 Not Fixed |

---

## Positive Findings ✅

1. **Zero Vulnerabilities**: `npm audit` reports 0 vulnerabilities
2. **Type Safety**: Passes TypeScript strict mode with all strict flags enabled
3. **Test Coverage**: All 484 tests pass successfully
4. **Zero Dependencies**: Successfully maintains zero-dependency constraint
5. **Code Quality**: ESLint passes with no errors
6. **Modern Build**: Proper ESM/CJS dual package setup

---

## Recommendations

### Immediate Actions (High Priority)
1. Fix BUG-001: Correct drift compensation calculation in scheduler
2. Fix BUG-002: Fix maxWait timeout calculation in debounce

### Short Term (Medium Priority)
3. Standardize all error throwing to use `DelayError` (BUG-003 through BUG-009)
4. Add tests to verify error types are correct

### Long Term (Low Priority)
5. Remove dead code in time.ts
6. Consider adding a logging abstraction
7. Add comprehensive edge case tests for drift compensation
8. Document the intended behavior of debounce maxWait

---

## Testing Strategy

Each bug fix should include:

1. **Regression Test**: A test that would have caught the bug
2. **Edge Case Tests**: Related boundary conditions
3. **Type Test**: Verify correct TypeScript types (where applicable)

### Example Test for BUG-001:
```typescript
describe('BUG-001: Drift compensation calculation', () => {
  it('should correctly calculate drift when time jumps backwards', () => {
    // Mock time jumping backwards
    // Verify drift compensation doesn't result in 0
  });
});
```

---

## Conclusion

The @oxog/delay package is overall **well-structured and functional**, with:
- ✅ Strong type safety
- ✅ Comprehensive test coverage
- ✅ Zero dependencies
- ✅ Modern build configuration

The bugs found are primarily:
- **2 logic errors** (HIGH priority) in edge case handling
- **7 API consistency issues** (MEDIUM/LOW) with error types
- **2 code quality** improvements

**All bugs are fixable** without breaking changes to the public API.

**Estimated Fix Time**: 2-4 hours for all bugs + tests
