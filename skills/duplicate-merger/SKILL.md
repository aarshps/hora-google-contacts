# Google Contacts Duplicate Merger Skill

This skill explains how to effectively and safely merge duplicate Google Contacts using the People API.

## Problem
Over time, users can accumulate duplicate contacts representing the same person. These duplicates might share a phone number, an email address, or have exactly the same name. Directly deleting contacts can lead to data loss if one duplicate has a work email and another has a home address.

## The Strategy

To safely merge duplicate contacts, you must use a "Primary/Secondary" consolidation approach.

### 1. Grouping Duplicates (Graph approach)
Contacts don't always have a single key to group by. A contact might share an email with a second contact, and a phone number with a third. By treating each contact as a node and shared identifiers (phone, email, exact name) as edges, you can find connected components.
- **Normalization:** Before matching, normalize phone numbers (e.g., strip non-digits, drop country codes if comparing local numbers), emails (trim, lower-case), and names.

### 2. Identifying the Primary Contact
For each group of connected duplicates, one contact must become the primary source of truth.
- **Richness Scoring:** Calculate a "score" for each contact based on the amount of data it holds. For instance, a contact with a name, two phone numbers, and a biography gets a higher score than a contact with just a name.
- Sort the group by this score. The highest score becomes the `primary` contact, while the others are `secondary`.

### 3. Aggregating Data
Iterate through all `secondary` contacts and extract any information missing from the `primary`:
- **Unique Phone Numbers:** Add them to the primary.
- **Unique Email Addresses:** Add them to the primary.
- **Biographies (Notes):** Append unique notes to the primary's biography field.
- **Alternate Names:** If a secondary has a slightly different name (e.g., "Mike" vs "Michael"), append it to the primary's biography as "Also known as: Mike".

### 4. API Execution
1. Deep-copy the primary contact object to safely mutate it.
2. Use `service.people.updateContact` to update the primary contact with the newly aggregated data.
3. Once the update is successful, use `service.people.deleteContact` to remove all secondary contacts.

## Rate Limiting Note
Updating and deleting multiple contacts in quick succession will trigger Google's API quotas (`429 Too Many Requests` or `502 Bad Gateway`). Implement a sleep delay (e.g., 500ms between calls) and catch rate-limit exceptions to back off dynamically.

## Example

An implementation of this strategy can be found in `merge_contacts.js` at the root of this repository.
