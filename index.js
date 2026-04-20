const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const readline = require('readline');
const { authenticate } = require('@google/local-auth');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/contacts'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Prompt for user input.
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

/**
 * Load or request or authorization to call APIs.
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  
  // Custom flow for CLI
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  
  const oAuth2Client = new google.auth.OAuth2(
      key.client_id, key.client_secret, key.redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  
  const code = await askQuestion('Enter the code from that page here: ');
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  await saveCredentials(oAuth2Client);
  return oAuth2Client;
}

/**
 * List all contacts, clean them according to a uniform structure, and update them.
 */
async function syncContacts(authClient, dryRun = true) {
  const service = google.people({version: 'v1', auth: authClient});
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts...');
  try {
    do {
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        pageToken: nextPageToken,
        personFields: 'names,emailAddresses,phoneNumbers,metadata',
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Found ${allConnections.length} contacts.`);

    const updates = [];
    for (const person of allConnections) {
      const cleaned = cleanPerson(person);
      if (cleaned.hasChanges) {
        updates.push(cleaned.person);
      }
    }

    console.log(`Identified ${updates.length} contacts needing updates.`);

    if (dryRun) {
      console.log('--- DRY RUN MODE (No changes made) ---');
      updates.slice(0, 5).forEach(p => {
        const name = p.names ? p.names[0].displayName : 'No Name';
        console.log(`Would update: ${name}`);
      });
      if (updates.length > 5) console.log(`... and ${updates.length - 5} more.`);
      return;
    }

    if (updates.length === 0) {
      console.log('All contacts are already uniform.');
      return;
    }

    console.log('Starting updates...');
    for (const person of updates) {
      await service.people.updateContact({
        resourceName: person.resourceName,
        updatePersonFields: 'names,emailAddresses,phoneNumbers',
        requestBody: person,
      });
      process.stdout.write('.');
    }
    console.log('\nUpdates complete.');

  } catch (err) {
    console.error('The API returned an error: ' + err);
  }
}

/**
 * Normalizes a person's data to a uniform structure.
 */
function cleanPerson(person) {
  let hasChanges = false;
  const updatedPerson = {
    resourceName: person.resourceName,
    etag: person.metadata ? person.metadata.etag : undefined,
    names: person.names || [],
    emailAddresses: person.emailAddresses || [],
    phoneNumbers: person.phoneNumbers || [],
  };

  // 1. Uniform Names (Title Case)
  if (updatedPerson.names.length > 0) {
    const name = updatedPerson.names[0];
    const originalDisplay = name.displayName;
    
    // Example: capitalize first letter of each word
    if (name.givenName) {
      const newGiven = titleCase(name.givenName);
      if (newGiven !== name.givenName) {
        name.givenName = newGiven;
        hasChanges = true;
      }
    }
    if (name.familyName) {
      const newFamily = titleCase(name.familyName);
      if (newFamily !== name.familyName) {
        name.familyName = newFamily;
        hasChanges = true;
      }
    }
  }

  // 2. Uniform Phone Numbers (Remove non-digits or format consistently)
  // This is a simple example; you might want E.164
  if (updatedPerson.phoneNumbers.length > 0) {
    updatedPerson.phoneNumbers.forEach(phone => {
      const original = phone.value;
      const cleaned = original.replace(/[^\d+]/g, ''); // Keep only digits and '+'
      if (cleaned !== original) {
        phone.value = cleaned;
        hasChanges = true;
      }
    });
  }

  return { person: updatedPerson, hasChanges };
}

function titleCase(str) {
  return str.toLowerCase().split(' ').map(word => {
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}

async function main() {
  const auth = await authorize();
  // Change second argument to false to actually perform updates
  await syncContacts(auth, true);
}

main().catch(console.error);
