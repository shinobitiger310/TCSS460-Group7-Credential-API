---
description: Start a migration TODO using TDD approach
---

Begin a new migration TODO from the migration plan using Test-Driven Development.

## Steps

1. **Show available TODOs** from `docs/migration/sealed-classes-records-migration-plan.md`
2. **Ask user**: "Which TODO number are you starting? (e.g., 1.1, 1.2)"
3. **Create test file FIRST** (TDD approach):
   - Determine test file name based on TODO
   - Use templates from `docs/testing/event-migration-testing-strategy.md`
   - Write failing test for TODO functionality
4. **Verify test fails** (RED): Run `mvn test -Dtest=[TestClassName]`
5. **Create todo list**: Break TODO into 3-5 subtasks using TodoWrite
6. **Guide implementation**:
   - Tell user what code file to create/modify
   - Explain minimal code needed to pass test
   - Reference coding standards from migration plan
7. **When TODO complete**:
   - Run full test suite: `mvn test`
   - Verify all tests pass
   - Mark all subtasks completed
   - **STOP and ask**: "TODO [X.X] is complete. Ready to commit, or continue to next TODO?"
   - Wait for user confirmation

## TDD Cycle

- Write test first (RED)
- Write minimal code (GREEN)
- Refactor if needed
- Run full suite (no regressions)
- STOP at end for confirmation

References: `docs/migration/sealed-classes-records-migration-plan.md`, `docs/testing/event-migration-testing-strategy.md`
