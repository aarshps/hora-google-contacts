---
name: google-contacts-noop-workaround
description: Workaround for Google People API ignoring name updates when only clearing unstructuredName without changing givenName or familyName.
---
# Google Contacts No-Op Workaround

When using the People API (`people.updateContact`) to clear a messy `unstructuredName`, the API will silently ignore the request (treat it as a No-Op) if the `givenName` and `familyName` exactly match what is already on file.

## The Workaround
To force the API to accept the update and clear the `unstructuredName`, you must introduce a structural change to the name fields. 

Append a single invisible space to the `givenName`.

```javascript
// If the core name hasn't changed but we need to drop unstructuredName
let finalGivenName = parsed.givenName;
if (!hasNameChanged) {
  finalGivenName += ' '; // Force a change
}

const updatedPerson = {
  resourceName: person.resourceName,
  etag: person.etag,
  names: [{
    metadata: originalNameObj.metadata,
    givenName: finalGivenName,
    familyName: parsed.familyName,
    unstructuredName: '' // Now this will successfully apply
  }]
};
```
