const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function authorize() {
  const content = await fs.readFile(TOKEN_PATH);
  const credentials = JSON.parse(content);
  return google.auth.fromJSON(credentials);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDigitOnly(phone) {
  return phone.replace(/[^\d+]/g, '').replace(/^\+91/, ''); // remove +91 for comparison if needed, or just digits
}

function normalizePhone(phone) {
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+91')) p = p.slice(3);
  if (p.startsWith('0') && p.length > 10) p = p.slice(1);
  return p;
}

async function mergeContacts(authClient, dryRun = true) {
  const service = google.people({version: 'v1', auth: authClient});
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts for merging...');
  try {
    do {
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        pageToken: nextPageToken,
        personFields: 'names,emailAddresses,phoneNumbers,biographies',
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Found ${allConnections.length} contacts.`);

    // Maps to find duplicates
    const phoneMap = new Map();
    const emailMap = new Map();
    const nameMap = new Map();

    const graph = new Map(); // resourceName -> Set of resourceNames

    allConnections.forEach(person => {
      const id = person.resourceName;
      if (!graph.has(id)) graph.set(id, new Set());

      // Map phones
      if (person.phoneNumbers) {
        person.phoneNumbers.forEach(p => {
          const norm = normalizePhone(p.value);
          if (norm.length >= 7) {
            if (!phoneMap.has(norm)) phoneMap.set(norm, []);
            phoneMap.get(norm).push(id);
          }
        });
      }

      // Map emails
      if (person.emailAddresses) {
        person.emailAddresses.forEach(e => {
          const norm = e.value.toLowerCase().trim();
          if (!emailMap.has(norm)) emailMap.set(norm, []);
          emailMap.get(norm).push(id);
        });
      }

      // Map names
      if (person.names && person.names.length > 0) {
        const name = person.names[0].displayName;
        if (name) {
          const norm = name.toLowerCase().trim();
          if (!nameMap.has(norm)) nameMap.set(norm, []);
          nameMap.get(norm).push(id);
        }
      }
    });

    // Build edges
    const addEdges = (map) => {
      for (const ids of map.values()) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            graph.get(ids[i]).add(ids[j]);
            graph.get(ids[j]).add(ids[i]);
          }
        }
      }
    };

    addEdges(phoneMap);
    addEdges(emailMap);
    addEdges(nameMap);

    // Find connected components
    const visited = new Set();
    const components = [];

    for (const [id, _] of graph.entries()) {
      if (!visited.has(id)) {
        const comp = [];
        const queue = [id];
        visited.add(id);

        while (queue.length > 0) {
          const curr = queue.shift();
          comp.push(curr);
          for (const neighbor of graph.get(curr)) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        if (comp.length > 1) {
          components.push(comp);
        }
      }
    }

    console.log(`Found ${components.length} groups of duplicate contacts.`);

    const contactsById = new Map();
    allConnections.forEach(c => contactsById.set(c.resourceName, c));

    let totalMerged = 0;
    let totalDeleted = 0;
    const actions = []; // { type: 'UPDATE' | 'DELETE', payload: object }

    for (const compIds of components) {
      const compContacts = compIds.map(id => contactsById.get(id));
      
      // Calculate richness
      compContacts.forEach(c => {
        let score = 0;
        if (c.names && c.names.length > 0) score += 10 + (c.names[0].displayName ? c.names[0].displayName.length / 100 : 0);
        if (c.emailAddresses && c.emailAddresses.length > 0) score += 5 * c.emailAddresses.length;
        if (c.phoneNumbers && c.phoneNumbers.length > 0) score += 5 * c.phoneNumbers.length;
        if (c.biographies && c.biographies.length > 0) score += 2 * c.biographies.length;
        c._score = score;
      });

      compContacts.sort((a, b) => b._score - a._score);
      const primary = compContacts[0];
      const secondaries = compContacts.slice(1);

      // Deep copy primary to avoid mutating original which might cause issues
      const merged = JSON.parse(JSON.stringify(primary));
      merged.phoneNumbers = merged.phoneNumbers || [];
      merged.emailAddresses = merged.emailAddresses || [];
      merged.biographies = merged.biographies || [];
      merged.names = merged.names || [];

      const existPhones = new Set(merged.phoneNumbers.map(p => normalizePhone(p.value)));
      const existEmails = new Set(merged.emailAddresses.map(e => e.value.toLowerCase().trim()));
      let bioText = merged.biographies.length > 0 ? merged.biographies[0].value : '';
      const primaryName = merged.names.length > 0 ? merged.names[0].displayName : '';

      secondaries.forEach(sec => {
        // Merge phones
        if (sec.phoneNumbers) {
          sec.phoneNumbers.forEach(p => {
            const norm = normalizePhone(p.value);
            if (!existPhones.has(norm)) {
              existPhones.add(norm);
              merged.phoneNumbers.push({ value: p.value }); // Only take value, skip metadata to avoid API errors
            }
          });
        }
        
        // Merge emails
        if (sec.emailAddresses) {
          sec.emailAddresses.forEach(e => {
            const norm = e.value.toLowerCase().trim();
            if (!existEmails.has(norm)) {
              existEmails.add(norm);
              merged.emailAddresses.push({ value: e.value });
            }
          });
        }

        // Merge bio
        if (sec.biographies) {
          sec.biographies.forEach(b => {
            if (b.value && !bioText.includes(b.value)) {
              bioText += (bioText ? '\\n' : '') + b.value;
            }
          });
        }

        // Merge name diff into bio
        if (sec.names && sec.names.length > 0) {
          const secName = sec.names[0].displayName;
          if (secName && secName !== primaryName && !bioText.includes(`Also known as: ${secName}`)) {
            bioText += (bioText ? '\\n' : '') + `Also known as: ${secName}`;
          }
        }
      });

      if (bioText) {
        if (merged.biographies.length === 0) merged.biographies.push({ value: bioText });
        else merged.biographies[0].value = bioText;
      }

      // Cleanup merged object for update (remove metadata, etc. if needed, but keeping resourceName and etag is critical)
      const updatePayload = {
        resourceName: merged.resourceName,
        etag: merged.etag,
        names: merged.names.map(n => ({ givenName: n.givenName, familyName: n.familyName, unstructuredName: n.unstructuredName })),
        phoneNumbers: merged.phoneNumbers.map(p => ({ value: p.value })),
        emailAddresses: merged.emailAddresses.map(e => ({ value: e.value })),
        biographies: merged.biographies.map(b => ({ value: b.value }))
      };

      actions.push({ type: 'UPDATE', payload: updatePayload, originalPrimary: primary, secondaries });
      secondaries.forEach(sec => {
        actions.push({ type: 'DELETE', payload: { resourceName: sec.resourceName } });
      });

      totalMerged++;
      totalDeleted += secondaries.length;
    }

    if (dryRun) {
      console.log('\\n--- DRY RUN MODE: MERGE STRATEGY ---');
      console.log(`Would merge ${totalMerged} groups of contacts.`);
      console.log(`Would update ${totalMerged} primary contacts and delete ${totalDeleted} secondary contacts.\\n`);

      actions.filter(a => a.type === 'UPDATE').slice(0, 5).forEach((action, idx) => {
        const primName = action.originalPrimary.names && action.originalPrimary.names.length > 0 ? action.originalPrimary.names[0].displayName : 'Unnamed';
        console.log(`Group ${idx + 1}: Primary Contact "${primName}"`);
        console.log(`  Merging with ${action.secondaries.length} secondary contact(s).`);
        action.secondaries.forEach(s => {
          const sName = s.names && s.names.length > 0 ? s.names[0].displayName : 'Unnamed';
          console.log(`  - Secondary: "${sName}" (will be deleted)`);
        });
        console.log(`  Resulting Phone Numbers: ${action.payload.phoneNumbers.map(p => p.value).join(', ')}`);
        console.log(`  Resulting Emails: ${action.payload.emailAddresses.map(e => e.value).join(', ')}`);
        console.log(`  Resulting Bio: ${action.payload.biographies.length > 0 ? action.payload.biographies[0].value.replace(/\\n/g, ' | ') : ''}`);
        console.log('---');
      });
      if (actions.filter(a => a.type === 'UPDATE').length > 5) {
          console.log(`... and ${actions.filter(a => a.type === 'UPDATE').length - 5} more groups.`);
      }
      return;
    }

    // Apply updates and deletes
    console.log('\\nApplying merges...');
    let successUpdates = 0;
    let successDeletes = 0;

    for (const action of actions) {
      let retries = 3;
      while (retries > 0) {
        try {
          if (action.type === 'UPDATE') {
            await service.people.updateContact({
              resourceName: action.payload.resourceName,
              updatePersonFields: 'names,emailAddresses,phoneNumbers,biographies',
              requestBody: action.payload,
            });
            successUpdates++;
            process.stdout.write('U');
          } else if (action.type === 'DELETE') {
            await service.people.deleteContact({
              resourceName: action.payload.resourceName,
            });
            successDeletes++;
            process.stdout.write('D');
          }
          await sleep(500); // rate limiting
          break;
        } catch (err) {
          if (err.message && (err.message.includes('Quota exceeded') || err.message.includes('502') || err.message.includes('429'))) {
            retries--;
            console.log(`\\nRate limit hit. Retries left: ${retries}. Sleeping 10s...`);
            await sleep(10000);
          } else {
            console.error(`\\nError processing action ${action.type} for ${action.payload.resourceName}:`, err);
            // If it's a 404 (Not Found), maybe it was already deleted, skip it
            if (err.message && err.message.includes('404')) {
                break;
            }
            throw err;
          }
        }
      }
    }

    console.log(`\\n\\nMerge complete. Successfully updated ${successUpdates} contacts and deleted ${successDeletes} contacts.`);

  } catch (err) {
    console.error('API Error:', err);
  }
}

async function main() {
  const auth = await authorize();
  const mode = process.argv[2] || 'dry-run';
  
  if (mode === 'dry-run') {
    await mergeContacts(auth, true);
  } else if (mode === 'apply') {
    await mergeContacts(auth, false);
  } else {
    console.log('Usage: node merge_contacts.js [dry-run|apply]');
  }
}

main().catch(console.error);
