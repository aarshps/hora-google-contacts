# Hora Google Contacts

A Node.js script to programmatically manage, clean, standardize, and deduplicate Google Contacts using the People API.

## Features
- Fetches all Google Contacts with pagination.
- Cleans and formats phone numbers to a uniform structure.
- Extracts context tags (like companies, locations, and relationships) and timestamps from contact names.
- Moves extracted context into the contact's Notes (Biographies) field.
- Standardizes First Name and Last Name into Title Case.
- Clears legacy `unstructuredName` fields to force UI updates.
- Identifies potential duplicates based on identical phone numbers, emails, or names.
- Merges duplicates by aggregating all unique phones, emails, and notes into the richest contact profile and safely deleting the others.
- Implements robust rate-limiting and error handling (exponential backoff) for Google API quotas.

## Repository Skills
This repository contains reusable Gemini CLI skills derived from learnings during the development process:
- `google-contacts-updater`: Quirks and solutions for updating Google Contact names (specifically clearing `unstructuredName`).
- `api-rate-limiter`: Patterns for handling Google API quotas and 502 errors during batch updates.
- `session-closer`: A workflow skill for effectively closing out dev sessions and capturing knowledge.
- `duplicate-merger`: A pattern and strategy for merging Google Contacts without data loss by identifying a primary contact and aggregating data.

## Usage
1. Ensure `credentials.json` is present.
2. Run `node index.js analyze` to see a detailed report of contacts and potential duplicates.
3. Run `node index.js sync` to see proposed cleaning changes (dry run).
4. Run `node index.js apply` to push cleaning changes to Google.
5. Run `node merge_contacts.js dry-run` to see proposed duplicate merging strategy.
6. Run `node merge_contacts.js apply` to execute the duplicate merging strategy.
