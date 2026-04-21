---
name: dynamic-scripting
description: Guidelines for managing Google Contacts dynamically. Use when asked to perform a contact management task (like cleaning, analyzing, merging, updating). Instead of using hard-coded scripts, generate throwaway Node.js scripts.
---

# Dynamic Scripting for Contact Management

This skill provides instructions for managing, analyzing, and cleaning Google Contacts. Instead of relying on hard-coded scripts in the repository, you will dynamically generate single-purpose Node.js scripts using the `googleapis` library for any requested task, run them, and push the results.

## Workflow

1. **Understand Request**: Analyze the user's request to determine what contact management task is needed (e.g., standardizing names, extracting context to notes, formatting phones, or merging duplicates).
2. **Generate Script**: Write a focused, targeted Node.js script in the project root to perform the specific task.
   - Use `credentials.json` and `token.json` for authentication.
   - For specific cleaning logic and constants (like `CONTEXT_TAGS` and parsing rules), read `references/domain_rules.md`.
   - Ensure the script implements proper rate limiting (refer to the `api-rate-limiter` skill).
   - If updating contacts, explicitly set `unstructuredName = ''` (refer to the `google-contacts-updater` skill).
   - If merging contacts, use the primary/secondary aggregation strategy (refer to the `duplicate-merger` skill).
3. **Run & Verify**: Execute the script using `node <script_name>.js`. Verify the output and handle any errors. Use dry-run logic before pushing actual changes if the user requests it.
4. **Cleanup**: Once the script runs successfully and the user's request is fulfilled, remove the throwaway script.
5. **Push to Main**: Add and commit any updated documentation or acquired knowledge (such as new skills or refined domain rules) and push the changes directly to the `main` branch.

## References

- Read [domain_rules.md](references/domain_rules.md) for data cleaning rules (e.g., Context Tags, Name Parsing, Phone Formatting).
