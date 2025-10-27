---
description: Run tests, commit changes, and update documentation
---

Execute the following workflow to commit changes with proper testing and documentation:

## Step 1: Run Tests

Run the test suite to ensure all tests pass:
```bash
npm test
```

If tests fail, report the failures and STOP. Do not proceed with the commit.

## Step 2: Check Git Status

Check what files have been modified:
```bash
git status
```

Show the user a summary of changes to be committed.

## Step 3: Create Commit

If tests pass and the user approves:
1. Stage the appropriate files (exclude `ai.prof/` directory unless explicitly requested)
2. Create a commit message following the project's conventions:
   - Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
   - Include detailed description
   - Add footer with Claude Code attribution:
     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     ```
3. Execute the commit

## Step 4: Update COMPLETED-WORK.md

After successfully committing:
1. Get the latest commit information with `git log -1 --stat`
2. Update `ai.prof/COMPLETED-WORK.md` with:
   - New section or update to existing section
   - Commit hash and message
   - Date of completion
   - Summary of changes made
   - Files modified with line counts
   - Any new features, fixes, or improvements
   - Testing results (if applicable)

## Step 5: Summary

Provide a concise summary to the user:
- Commit hash and message
- Number of files changed
- Brief description of what was accomplished
- Confirmation that COMPLETED-WORK.md was updated

**Note:** This workflow does NOT push to remote. User must explicitly request push operations.
