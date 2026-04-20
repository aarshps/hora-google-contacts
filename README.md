# Hora Google Contacts

A Node.js script to programmatically manage, clean, and standardize Google Contacts using the People API.

## Features
- Fetches all Google Contacts with pagination.
- Cleans and formats phone numbers to a uniform structure.
- Extracts context tags (like companies, locations, and relationships) and timestamps from contact names.
- Moves extracted context into the contact's Notes (Biographies) field.
- Standardizes First Name and Last Name into Title Case.
- Clears legacy `unstructuredName` fields to force UI updates.
- Implements robust rate-limiting and error handling (exponential backoff) for Google API quotas.

## Repository Skills
This repository contains reusable Gemini CLI skills derived from learnings during the development process:
- `google-contacts-updater`: Quirks and solutions for updating Google Contact names (specifically clearing `unstructuredName`).
- `api-rate-limiter`: Patterns for handling Google API quotas and 502 errors during batch updates.
- `session-closer`: A workflow skill for effectively closing out dev sessions and capturing knowledge.

## Usage
1. Ensure `credentials.json` is present.
2. Run `node index.js analyze` for a dry run summary.
3. Run `node index.js sync` to see proposed changes.
4. Run `node index.js apply` to push changes to Google.