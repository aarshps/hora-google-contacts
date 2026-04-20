---
name: session-closer
description: Procedure for closing a session by reflecting on learnings, creating granular repo skills (max 60 lines), updating docs, and pushing to main.
---
# Session Closer

Use this skill when the user asks to close a session and capture learnings.

## Workflow
1. **Reflect**: Identify 1-3 distinct, reusable technical learnings or workflow patterns from the current session.
2. **Create Granular Skills**: For each learning, create a new skill directory in the project's `skills/` folder.
   - Write a `SKILL.md` file.
   - Keep it extremely focused and **under 60 lines**.
   - Include clear frontmatter (name, description).
3. **Update Docs**: Summarize the completed work and new skills in the project's `README.md` or relevant documentation files.
4. **Commit & Push**: Commit the new skills and doc updates, then push to the `main` branch.
5. **Close**: Inform the user that the session has been closed and changes pushed.