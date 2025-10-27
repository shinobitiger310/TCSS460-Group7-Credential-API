---
description: Session startup - show project status, context, and next steps
---

Welcome to new Claude Code session! Provide startup information and context.

## Steps

1. **Read project instructions**: `docs/collaboration/instructions.md`

2. **Show current git status**:
   ```bash
   git branch --show-current
   git status --short
   ```

3. **Check recent work**:
   ```bash
   git log --oneline -5
   ```

4. **Check for in-progress issues**:
   ```bash
   gh issue list --state open --label in-progress --limit 5
   ```

5. **Check all open issues**:
   ```bash
   gh issue list --state open --limit 10
   ```

6. **Display session startup info**:

   ```
   ═══════════════════════════════════════════════════════
   🚀 CLAUDE CODE SESSION START
   ═══════════════════════════════════════════════════════

   👋 Hello Professor Bryan!

   📁 PROJECT: OWS Local Search GUI
   🎯 PURPOSE: Systems analysis tool for Civil Engineering research
   🌿 CURRENT BRANCH: [branch-name]
   📊 GIT STATUS: [clean / uncommitted changes / etc]

   ───────────────────────────────────────────────────────
   📚 PROJECT CONTEXT
   ───────────────────────────────────────────────────────

   [Brief summary from instructions.md:
   - Tech stack (Java 21, Swing, Maven)
   - Current status/phase
   - Recent achievements
   - Test status (234 tests)]

   ───────────────────────────────────────────────────────
   📝 RECENT COMMITS
   ───────────────────────────────────────────────────────

   [Last 5 commits with short descriptions]

   ───────────────────────────────────────────────────────
   🎯 IN-PROGRESS WORK
   ───────────────────────────────────────────────────────

   [Issues with "in-progress" label, or "None"]

   ───────────────────────────────────────────────────────
   📋 OPEN ISSUES
   ───────────────────────────────────────────────────────

   [List of open issues with numbers, titles, labels]

   ───────────────────────────────────────────────────────
   📖 KEY DOCUMENTATION
   ───────────────────────────────────────────────────────

   Core docs to reference:
   - docs/collaboration/journal.md - Deep analysis and reflections
   - docs/collaboration/system-questions.md - 12 key Q&A
   - docs/collaboration/BUGS.md - Bug tracking process
   - docs/collaboration/DEVELOPMENT_NOTES.md - Implementation roadmaps
   - GitHub Project Board: https://github.com/orgs/OWS-PFMS/projects/4

   ───────────────────────────────────────────────────────
   ⚡ AVAILABLE COMMANDS
   ───────────────────────────────────────────────────────

   **General:**
   /understand - Analyze and clarify request
   /plan - Create implementation plan
   /start-story - Begin work on GitHub issue
   /start - This command (session startup)

   **Migration (Issue #14):**
   /start-todo - Start migration TODO with TDD
   /tdd-cycle - TDD Red-Green-Refactor cycle
   /run-tests - Execute test suites
   /check-coverage - Generate coverage report
   /migration-status - Check migration progress
   /commit-todo - Commit completed work

   **Other:**
   /explain - Educational explanations

   ───────────────────────────────────────────────────────
   💡 SUGGESTED NEXT STEPS
   ───────────────────────────────────────────────────────

   [Context-specific suggestions based on current state:]

   **If on feature branch:**
   - Continue work on current issue
   - Review git status: `git status`
   - Check what's left: [relevant command for current work]

   **If on master with in-progress issues:**
   - Resume work: /start-story [issue-number]

   **If on master, clean slate:**
   - Review open issues above
   - Start new work: /start-story
   - Or check migration progress: /migration-status

   **If uncommitted changes:**
   - Review changes: `git diff`
   - Run tests: /run-tests
   - Commit when ready: /commit-todo

   ───────────────────────────────────────────────────────
   ✅ READY
   ───────────────────────────────────────────────────────

   What would you like to work on, Professor Bryan?
   ```

7. **Provide context-aware suggestions** based on:
   - Current branch (master vs feature)
   - Git status (clean vs uncommitted)
   - In-progress issues
   - Recent commits

## Key Information Sources

- `docs/collaboration/instructions.md` - Full project context
- Git status and log - Current state
- GitHub issues - Active work
- Available slash commands - Workflow tools

Remember: Address as "Professor Bryan", provide clear context, suggest actionable next steps.
