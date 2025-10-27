---
description: Begin work on GitHub issue - setup branch, move to In Progress, create todos
---

Set up everything needed to begin work on a GitHub issue: move to "In Progress", handle git state, create feature branch, display details, create todos.

## Steps

1. **Select issue**: Run `gh issue list --state open --label enhancement --limit 20` and ask user which issue number
2. **Get details**: Run `gh issue view [NUMBER]`
3. **Check git status**:
   - Run `git branch --show-current` and `git status --short`
   - Handle scenarios:
     - Clean master → proceed
     - Uncommitted changes → ask to commit/stash/discard
     - Different branch → ask to switch/finish/cancel
   - Get to clean master: `git checkout master && git pull origin master`
4. **Move issue**: Run `gh issue edit [NUMBER] --add-label "in-progress"`
5. **Create branch**: `git checkout -b feature/issue-[NUMBER]-[short-description]`
6. **Display formatted issue**:
   ```
   ═══════════════════════════════════════════════════════
   📋 ISSUE #[N]: [Title]
   ═══════════════════════════════════════════════════════
   
   🏷️  Labels: [labels]
   📅 Milestone: [milestone]
   🔗 URL: [url]
   
   [Description]
   
   ✅ ACCEPTANCE CRITERIA
   [List criteria]
   
   📝 TASKS
   [Extract checkboxes]
   ```
7. **Create todo list**: Use TodoWrite to convert issue checkboxes to todos
8. **Provide next steps**:
   ```
   🚀 READY TO START!
   
   ✅ On branch: feature/issue-[N]-[desc]
   ✅ Issue moved to "In Progress"
   
   Next: Review criteria above, start first TODO
   Use /start-todo for TDD workflow (if applicable)
   ```

**Safety**: Never discard changes without confirmation. Stop on any git error. Verify branch doesn't already exist.
