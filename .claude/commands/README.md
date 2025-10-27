# Claude Code Commands

Custom slash commands for Issue #14 migration and general development workflow.

## General Commands

### `/understand` - Analyze Current Request
**Purpose**: Explain understanding of user's request before starting work

**What it does**:
1. Restates request in own words
2. Identifies objectives and requirements
3. Flags assumptions being made
4. Asks clarifying questions if unclear
5. Defines scope (in/out)
6. Waits for user confirmation

**When to use**: Complex requests, before significant work, verify understanding

**Output**: Formatted analysis with goals, requirements, assumptions, clarifications

---

### `/plan` - Create Implementation Plan
**Purpose**: Generate detailed step-by-step plan for completing request

**What it does**:
1. Breaks work into phases
2. Creates detailed steps (action, files, commands, testing)
3. Identifies risks and challenges
4. Lists files to create/modify
5. Defines testing strategy
6. Creates TodoWrite tracking list
7. Waits for approval

**When to use**: Complex tasks, user stories, want organized approach

**Output**: Phased plan with time estimates, steps, testing strategy, todo list

---

### `/start-story` - Begin User Story Workflow
**Purpose**: Complete setup for starting work on GitHub issue

**What it does**:
1. Lists/selects GitHub issue
2. Checks git status and handles cleanup
3. Moves issue to "In Progress"
4. Creates feature branch
5. Displays issue details
6. Creates TodoWrite list from issue
7. Provides next steps

**When to use**: Beginning work on any GitHub issue/user story

**Output**: Clean branch ready for work, formatted issue details, todo list

---

## Migration-Specific Commands

### `/start-todo` - Start a Migration TODO
**Purpose**: Begin a new migration TODO using TDD approach

**What it does**:
1. Shows available TODOs from migration plan
2. Creates test file FIRST (TDD approach)
3. Verifies test fails (RED)
4. Creates todo list for tracking
5. Guides through implementation
6. **STOPS at end of TODO** and asks for user confirmation

**When to use**: Starting work on any TODO from the migration plan

**Example**:
```
> /start-todo
Which TODO are you starting? (e.g., 1.1, 1.2)
> 1.1
```

---

### `/tdd-cycle` - One TDD Iteration
**Purpose**: Guide through a single Red-Green-Refactor cycle

**What it does**:
1. **RED**: Write failing test
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code (optional)
4. **VERIFY**: Run full test suite
5. Ask if ready to continue or commit

**When to use**: During development, for each small piece of functionality

**TDD Steps**:
- Write test first (fails)
- Write code (passes)
- Refactor if needed
- Verify no regressions

---

### `/run-tests` - Execute Test Suite
**Purpose**: Run appropriate tests for current work

**What it does**:
1. Asks which test scope (specific, phase, regression, full, coverage)
2. Runs appropriate Maven command
3. Reports results (pass/fail, timing)
4. Offers to help triage failures

**When to use**: After making changes, before committing

**Test Scopes**:
- `specific` - Single test class
- `phase` - All tests for Phase 1, 2, 3, or 4
- `regression` - All existing tests
- `full` - Complete test suite
- `coverage` - With coverage report

---

### `/check-coverage` - Test Coverage Report
**Purpose**: Generate and analyze test coverage

**What it does**:
1. Runs `mvn clean test jacoco:report`
2. Opens coverage report in browser
3. Analyzes coverage for migrated code
4. Compares against targets (80-100%)
5. Identifies gaps and suggests tests

**When to use**: Before committing, to ensure adequate coverage

**Coverage Targets**:
- Event Records: 100%
- Pattern Matching: 100%
- Dual-Mode Firing: 100%
- UI Components: 80-90%

---

### `/migration-status` - Check Progress
**Purpose**: Show progress through migration

**What it does**:
1. Reads migration plan
2. Checks which TODOs are complete
3. Shows progress per phase
4. Shows overall progress (X/18 TODOs)
5. Identifies next TODO to work on
6. Checks for blockers

**When to use**: At start of work session, or to see what's left

**Output Example**:
```
Phase 1: 33% (2/6 complete)
Phase 2: 0% (0/6 complete)
Overall: 11% (2/18 TODOs complete)

Next TODO: 1.3 - Update ProjectManager (dual mode)
```

---

### `/commit-todo` - Commit Completed TODO
**Purpose**: Create git commit for completed TODO

**What it does**:
1. Verifies TODO is complete (all tests pass)
2. Reviews changes with `git status` and `git diff`
3. Stages files (code + tests)
4. Creates detailed commit message
5. Commits changes
6. Updates migration checklist
7. Asks if ready to push or continue

**When to use**: After TODO is complete and all tests pass

**Commit Message Format**:
```
Complete TODO X.X: [Brief description]

Issue #14 - Event system migration

## Changes
- [List changes]

## Testing
- [X] New tests added: N tests
- [X] All tests pass: X/Y

Related: #14
```

---

## Typical Workflows

### Starting New User Story
```bash
/start-story        # Set up issue, branch, and todos
/understand         # Verify understanding (if complex)
/plan               # Create implementation plan
# [Review and approve]
# [Begin implementation]
```

### Starting Migration TODO
```bash
/start-todo         # Choose TODO, creates test, guides setup
/tdd-cycle          # Write test → implement → verify (repeat)
/run-tests          # Run phase tests
/check-coverage     # Ensure adequate coverage
/commit-todo        # Commit when complete
```

### During Development
```bash
/tdd-cycle          # For each small feature
/run-tests          # After each change
```

### For Complex Tasks
```bash
/understand         # Clarify requirements first
/plan               # Create detailed plan
# [Get approval]
/tdd-cycle          # Implement step by step
```

### Checking Progress
```bash
/migration-status   # See migration progress (Issue #14 specific)
```

---

## Command Reference Files

All commands reference these documentation files:
- `docs/migration/sealed-classes-records-migration-plan.md` - 18 TODOs with coding standards
- `docs/testing/event-migration-testing-strategy.md` - Test templates and requirements
- `docs/testing/testing-procedures-and-ci.md` - TDD procedures and CI config
- `docs/testing/migration-testing-checklist.md` - Phase-by-phase verification

---

## TDD Philosophy

All commands follow Test-Driven Development:

1. ✅ **Write test FIRST** (it fails - RED)
2. ✅ **Write minimal code** to pass (GREEN)
3. ✅ **Refactor** if needed
4. ✅ **Verify no regressions** (run full suite)
5. ✅ **Commit** when complete

**Never write code before tests!**

---

## Tips

- Use `/start-todo` at the beginning of each TODO
- Use `/tdd-cycle` frequently during development (every 15-30 min)
- Use `/run-tests` after every change
- Use `/check-coverage` before committing
- Use `/migration-status` to stay oriented
- Use `/commit-todo` when TODO is fully complete and tested

---

## Getting Help

If a command doesn't work as expected:
1. Check that you're in the project root directory
2. Ensure Maven is installed: `mvn --version`
3. Ensure all documentation files exist in `docs/` directory
4. Check command file syntax in `.claude/commands/`

---

**Created**: 2024-10-24
**For**: Issue #14 - Event System Migration
**Related**: Issue #15 - Testing Strategy
