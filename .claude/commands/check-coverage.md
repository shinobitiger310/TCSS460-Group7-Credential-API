---
description: Generate and analyze test coverage report
---

Generate test coverage report and analyze against migration targets.

## Steps

1. **Generate coverage**:
   ```bash
   mvn clean test jacoco:report
   ```

2. **Open report**:
   ```bash
   open target/site/jacoco/index.html
   ```

3. **Analyze coverage for migration code**:

   Check these packages/files:
   - `com.owspfm.ui.model.events` (Event records) - **TARGET: 100%**
   - `com.owspfm.ui.model.ProjectManager` (Dual-mode firing) - **TARGET: 100%**
   - `com.owspfm.ui.view.statusbar.StatusBar` (Pattern matching) - **TARGET: 100%**
   - Chart event components - **TARGET: >80%**
   - Other migrated UI components - **TARGET: >80%**

4. **Report findings**:
   ```
   ## Coverage Report

   ### Event Records (Target: 100%)
   - ProjectEvent: [X]% ✅/❌
   - ChartEvent: [X]% ✅/❌

   ### Pattern Matching Logic (Target: 100%)
   - StatusBar.propertyChange(): [X]% ✅/❌
   - StatusManager.propertyChange(): [X]% ✅/❌

   ### Dual-Mode Firing (Target: 100%)
   - ProjectManager event firing: [X]% ✅/❌

   ### Overall Migration Coverage: [X]%
   ```

5. **Identify gaps**:
   - List uncovered lines/branches
   - Suggest which tests to add
   - Reference test templates

6. **Check requirements**:
   Compare against `docs/testing/event-migration-testing-strategy.md` requirements

7. **Next steps**:
   - Add tests for uncovered lines (use /tdd-cycle)
   - Once coverage meets targets, use /commit-todo

## Coverage Requirements

| Code Type | Minimum | Target |
|-----------|---------|--------|
| Event Records | 100% | 100% |
| Pattern Matching Logic | 100% | 100% |
| Dual-Mode Firing | 100% | 100% |
| Migrated UI Components | 80% | 90% |

Reference: `docs/testing/event-migration-testing-strategy.md` (section: "Test Coverage Requirements")
