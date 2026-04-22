const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function authorize() {
  const content = await fs.readFile(TOKEN_PATH);
  return google.auth.fromJSON(JSON.parse(content));
}

function normalizePhone(phone) {
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+91')) p = p.slice(3);
  if (p.startsWith('0') && p.length > 10) p = p.slice(1);
  return p;
}

async function analyzeForMerging() {
  const authClient = await authorize();
  const service = google.people({version: 'v1', auth: authClient});
  
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts to find merging scope...');
  try {
    do {
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        pageToken: nextPageToken,
        personFields: 'names,emailAddresses,phoneNumbers',
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Total Contacts: ${allConnections.length}`);

    const phoneMap = new Map();
    const emailMap = new Map();
    const nameMap = new Map();

    allConnections.forEach(person => {
      const id = person.resourceName;
      let displayName = 'Unnamed';

      if (person.names && person.names.length > 0) {
        displayName = person.names[0].displayName || 'Unnamed';
        const nameKey = displayName.toLowerCase().trim();
        if (nameKey && nameKey !== 'unnamed') {
          if (!nameMap.has(nameKey)) nameMap.set(nameKey, []);
          nameMap.get(nameKey).push({ id, name: displayName });
        }
      }

      if (person.phoneNumbers) {
        person.phoneNumbers.forEach(p => {
          const norm = normalizePhone(p.value);
          if (norm.length >= 7) {
            if (!phoneMap.has(norm)) phoneMap.set(norm, []);
            phoneMap.get(norm).push({ id, name: displayName, phone: p.value });
          }
        });
      }

      if (person.emailAddresses) {
        person.emailAddresses.forEach(e => {
          const norm = e.value.toLowerCase().trim();
          if (!emailMap.has(norm)) emailMap.set(norm, []);
          emailMap.get(norm).push({ id, name: displayName, email: e.value });
        });
      }
    });

    let duplicatePhonesCount = 0;
    let duplicateEmailsCount = 0;
    let duplicateNamesCount = 0;

    console.log('\n--- Potential Duplicates by Phone Number ---');
    for (const [phone, entries] of phoneMap.entries()) {
      if (entries.length > 1) {
        duplicatePhonesCount++;
        // Print only first few to avoid massive logs
        if (duplicatePhonesCount <= 5) {
          console.log(`Phone: ${phone} shared by:`);
          entries.forEach(e => console.log(`  - ${e.name} (${e.phone})`));
        }
      }
    }
    if (duplicatePhonesCount > 5) console.log(`... and ${duplicatePhonesCount - 5} more phone number duplicates.`);

    console.log('\n--- Potential Duplicates by Email ---');
    for (const [email, entries] of emailMap.entries()) {
      if (entries.length > 1) {
        duplicateEmailsCount++;
        if (duplicateEmailsCount <= 5) {
          console.log(`Email: ${email} shared by:`);
          entries.forEach(e => console.log(`  - ${e.name} (${e.email})`));
        }
      }
    }
    if (duplicateEmailsCount > 5) console.log(`... and ${duplicateEmailsCount - 5} more email duplicates.`);

    console.log('\n--- Potential Duplicates by Exact Name ---');
    for (const [name, entries] of nameMap.entries()) {
      if (entries.length > 1) {
        // Group by exact id to avoid counting the same contact multiple times if it has multiple name entries
        const uniqueIds = new Set(entries.map(e => e.id));
        if (uniqueIds.size > 1) {
            duplicateNamesCount++;
            if (duplicateNamesCount <= 5) {
              console.log(`Name: "${name}" shared by ${uniqueIds.size} different contacts.`);
            }
        }
      }
    }
    if (duplicateNamesCount > 5) console.log(`... and ${duplicateNamesCount - 5} more exact name duplicates.`);

    console.log('\n--- Summary ---');
    console.log(`Groups with shared phones: ${duplicatePhonesCount}`);
    console.log(`Groups with shared emails: ${duplicateEmailsCount}`);
    console.log(`Groups with shared names: ${duplicateNamesCount}`);

    if (duplicatePhonesCount > 0 || duplicateEmailsCount > 0 || duplicateNamesCount > 0) {
      console.log('\nThere is scope for merging duplicates based on the primary/secondary strategy.');
    } else {
      console.log('\nNo obvious duplicates found. Contacts seem to be deduplicated.');
    }

  } catch (err) {
    console.error('API Error:', err.message);
  }
}

analyzeForMerging().catch(console.error);
