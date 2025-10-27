---
description: Guide through one TDD Red-Green-Refactor cycle
---

Guide through a single Test-Driven Development iteration following Red-Green-Refactor pattern.

## Steps

### Step 1: RED - Write Failing Test

1. Ask: "What functionality are you adding?"
2. Identify test file (existing or create new)
3. Write test method:
   - Clear name: `test[WhatIsBeingTested]`
   - Arrange-Act-Assert pattern
   - Use templates from `docs/testing/event-migration-testing-strategy.md`
4. Run test: `mvn test -Dtest=[TestClass]`
5. Verify it FAILS (RED state)
6. Show failure message

### Step 2: GREEN - Implement Minimal Code

1. Identify what code to write
2. Guide implementation:
   - Create/edit necessary file
   - Write simplest code that passes test
   - Follow coding standards from migration plan
3. Run test: `mvn test -Dtest=[TestClass]`
4. Verify it PASSES (GREEN state)
5. "✅ Test passes!"

### Step 3: REFACTOR - Improve Code (Optional)

1. Ask: "Does the code need refactoring?"
2. If yes:
   - Identify what to refactor
   - Make improvements
   - Re-run test: `mvn test -Dtest=[TestClass]`
   - Verify still passes
3. If no: Skip to next step

### Step 4: VERIFY - No Regressions

1. Run full test suite: `mvn test`
2. Check all tests pass
3. If failures: Help investigate and fix
4. If all pass: "✅ No regressions!"

### Step 5: NEXT ACTION

Ask user:
- "Continue with another TDD cycle?"
- "Ready to commit? (use /commit-todo)"
- "Check coverage? (use /run-tests with coverage)"

## TDD Rules

- ALWAYS write test before code
- Run test and see it fail (RED)
- Write simplest code to pass (GREEN)
- Refactor only when tests pass
- Run full suite to catch regressions

Reference: `docs/testing/testing-procedures-and-ci.md` (section: "Daily Development Testing Procedures")
