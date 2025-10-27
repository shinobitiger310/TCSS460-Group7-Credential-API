---
description: Execute test suite for current work
---

Run appropriate test suite based on current migration phase or scope.

## Steps

1. **Ask user which test scope**:
   - `specific` - Just the test I'm currently working on
   - `phase` - All tests for current phase (Phase 1, 2, 3, or 4)
   - `regression` - All existing tests to check for regressions
   - `full` - Complete test suite
   - `coverage` - Run with coverage report

2. **Run appropriate command**:

   **Specific test**:
   ```bash
   mvn test -Dtest=[TestClassName]
   ```

   **Phase 1 tests** (ProjectEvent, ProjectManager, StatusBar):
   ```bash
   mvn test -Dtest='**/ProjectEventTest.java,**/DualModeEventTest.java,**/ProjectManager*Test.java,**/StatusBar*Test.java'
   ```

   **Phase 2 tests** (ChartEvent, Chart components):
   ```bash
   mvn test -Dtest='**/ChartEventTest.java,**/ChartPanel*Test.java,**/InfluenceChart*Test.java'
   ```

   **Phase 3 tests** (Remaining UI):
   ```bash
   mvn test -Dtest='**/StatusBar*Test.java,**/FactorPanel*Test.java,**/EdgePanel*Test.java,**/SearchPage*Test.java'
   ```

   **Phase 4 tests** (Integration + Performance):
   ```bash
   mvn test -Dtest='**/*IntegrationTest.java,**/*Benchmark.java'
   ```

   **Regression tests**:
   ```bash
   mvn test
   ```

   **With coverage**:
   ```bash
   mvn clean test jacoco:report
   open target/site/jacoco/index.html
   ```

3. **Report results**:
   - Show pass/fail count
   - Highlight any failures
   - Show execution time

4. **If failures**: Offer to help triage using failure patterns from `docs/testing/testing-procedures-and-ci.md`

5. **Ask**: Continue working, fix failures, or review coverage?

Reference: `docs/testing/testing-procedures-and-ci.md`
