# Hora Google Contacts

A dynamic, agent-driven repository to programmatically manage, clean, standardize, and deduplicate Google Contacts using the People API.

## Architecture & Approach

Instead of relying on hard-coded monolith scripts to manage contacts, this project uses a **Dynamic Scripting** approach. The Gemini CLI agent uses the repository's rules to dynamically generate targeted Node.js scripts to accomplish specific tasks, executes them, and then cleans up.

This allows for highly customized, one-off contact management workflows (e.g., "Find all contacts from my old job and add 'Old Job' to their notes" or "Delete duplicate contacts with the exact same name and email").

## Features Supported by Domain Rules
When the agent generates scripts, it applies the following domain rules:
- **Phone Number Formatting**: Cleans and formats phone numbers to a uniform structure (digits and `+` only).
- **Context Tag Extraction**: Extracts context tags (like companies, locations, and relationships) and timestamps from contact names, moving them into the contact's Notes (Biographies) field.
- **Name Standardization**: Standardizes First Name and Last Name into Title Case.
- **Duplicate Merging**: Safely merges duplicates by aggregating unique phones, emails, and notes into the richest contact profile and safely deleting the others without data loss.

## Repository Skills
This repository contains reusable Gemini CLI skills that guide the agent:
- `dynamic-scripting`: Instructions on how to generate single-purpose Node.js scripts for contact management and references the domain rules.
- `google-contacts-updater`: Quirks and solutions for updating Google Contact names (specifically clearing `unstructuredName`).
- `api-rate-limiter`: Patterns for handling Google API quotas and 502 errors during batch updates.
- `duplicate-merger`: A pattern and strategy for merging Google Contacts without data loss by identifying a primary contact and aggregating data.
- `session-closer`: A workflow skill for effectively closing out dev sessions and capturing knowledge.

## Usage
1. Ensure `credentials.json` is present.
2. Ensure you have the `googleapis` package installed.
3. Ask the agent to perform a specific task, such as:
   - "Analyze my contacts for duplicates based on email."
   - "Standardize the names and format the phone numbers for all my contacts."
   - "Merge duplicate contacts using the repository's duplicate merging strategy."
4. The agent will generate a throwaway script, verify the logic, execute the script, and then push the updated knowledge or documentation back to the repository.
