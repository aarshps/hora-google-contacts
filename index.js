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
 * Print the display name if available for 10 connections.
 *
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listConnectionNames(authClient) {
  const service = google.people({version: 'v1', auth: authClient});
  try {
    const res = await service.people.connections.list({
      resourceName: 'people/me',
      pageSize: 10,
      personFields: 'names,emailAddresses,phoneNumbers',
    });
    const connections = res.data.connections;
    if (!connections || connections.length === 0) {
      console.log('No connections found.');
      return;
    }
    console.log('Connections:');
    connections.forEach((person) => {
      const name = person.names && person.names.length > 0 ? person.names[0].displayName : 'No Name';
      const phone = person.phoneNumbers && person.phoneNumbers.length > 0 ? person.phoneNumbers[0].value : 'No Phone';
      console.log(`${name} - ${phone}`);
    });
  } catch (err) {
    console.error('The API returned an error: ' + err);
  }
}

async function main() {
  const auth = await authorize();
  await listConnectionNames(auth);
}

main().catch(console.error);
