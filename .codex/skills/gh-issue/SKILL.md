---
name: gh-issue
description: "Pull a GitHub issue from bini59/317_gbc_seoko, read its body and comments, clarify the scope, then hand off to planning. Use when the user wants to start from an issue, says '이슈 가져와', or provides an issue number or URL."
---

# GitHub Issue Intake

Pull a GitHub issue, clarify it, and hand the resolved scope to planning. Track work entirely in GitHub issues in `bini59/317_gbc_seoko`.

## 1. Pick or create the issue

- For a named issue, run `gh issue view <number> --repo bini59/317_gbc_seoko --comments`.
- To browse, run `gh issue list --repo bini59/317_gbc_seoko --assignee @me --state open`; if empty, list all open issues.
- Before creating an issue, show the proposed title and body and obtain user confirmation. Then run `gh issue create --repo bini59/317_gbc_seoko`.

## 2. Read it fully

Read the body and every comment. Summarize the requested outcome, constraints, acceptance criteria, and unresolved questions.

## 3. Resolve the scope

Run `$grill-with-docs` using the issue discussion as the starting point. Use `graphify-out/graph.json` and the codebase to answer repository questions before asking the user. Update `CONTEXT.md` or an ADR only when the domain-modeling rules call for it.

Post material conclusions with `gh issue comment <number> --repo bini59/317_gbc_seoko --body "..."` only after confirming the comment with the user.

## 4. Hand off

Continue with `$dev-flow`, providing the issue link, resolved scope, acceptance criteria, and likely touched modules. Do not implement inside this intake skill.
