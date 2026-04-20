---
name: google-contacts-updater
description: Updates Google Contacts via People API, properly handling names and unstructuredName to ensure display names update correctly.
---
# Google Contacts Updater

When modifying a Google Contact's name via the People API (`people.updateContact`), setting `givenName` and `familyName` is not enough to update the Display Name if `unstructuredName` exists.

## Key Steps
1. Fetch contact with `personFields: 'names'`.
2. Extract the `names[0]` object.
3. Update `givenName` and `familyName`.
4. **CRITICAL**: Explicitly set `unstructuredName = ''` (empty string). If you do not do this, Google Contacts will continue to display the old `unstructuredName` in the UI.
5. Provide the `etag` from the contact object (e.g., `person.etag`, NOT `person.metadata.etag`) in the update request.