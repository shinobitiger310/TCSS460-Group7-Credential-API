---
description: Commit completed TODO with detailed message
---

Create git commit for a completed migration TODO following project workflow.

## Steps

1. **Verify TODO complete**:
   - Ask: "Which TODO are you committing? (e.g., 1.1, 1.2)"
   - Run full test suite: `mvn test`
   - Ensure all tests pass
   - If tests fail: STOP and tell user to fix first

2. **Review changes**:
   - Run: `git status`
   - Run: `git diff`
   - Show user what files changed
   - Confirm changes match TODO scope

3. **Stage files**:
   - Run: `git add [files]`
   - Stage only files related to this TODO
   - Include both implementation AND test files

4. **Create commit with detailed message**:

   Format:
   ```
   Complete TODO [X.X]: [Brief description]

   Issue #14 - Event system migration to Sealed Classes + Records

   ## Changes
   - [List specific changes]
   - [New classes/records created]
   - [Tests added]

   ## Testing
   - [X] New tests added: [count] tests
   - [X] All tests pass: [pass count] / [total count]
   - [X] No regressions detected

   ## Phase Progress
   Phase [N]: [X]/[Y] TODOs complete

   Related: #14

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

5. **Execute commit**:
   - Run git commit with message
   - Verify: `git log -1 --oneline`

6. **Update checklist**:
   - Open: `docs/testing/migration-testing-checklist.md`
   - Check off completed items
   - Commit checklist update

7. **Ask user**: "Commit complete! Ready to push, or continue with next TODO?"

## Important

- Only commit when all tests pass
- Include both code AND test files
- Reference Issue #14
- Keep commits focused on single TODO

Reference: `docs/testing/testing-procedures-and-ci.md` (section: "Pre-Commit Testing Procedures")
