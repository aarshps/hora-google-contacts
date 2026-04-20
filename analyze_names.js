const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function main() {
  const authClient = await loadSavedCredentialsIfExist();
  if (!authClient) {
    console.log('No auth client');
    return;
  }
  
  const service = google.people({version: 'v1', auth: authClient});
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts for word analysis...');
  try {
    do {
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        pageToken: nextPageToken,
        personFields: 'names',
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    const wordCounts = {};
    allConnections.forEach(person => {
      if (person.names && person.names.length > 0) {
        const name = person.names[0].displayName || '';
        // Clean timestamp
        const cleanName = name.replace(/[,\s]+(\d{8})\s*$/, '');
        const words = cleanName.split(/\s+/);
        words.forEach(w => {
          const lowerW = w.toLowerCase().replace(/[^a-z]/g, '');
          if (lowerW.length > 0) {
            wordCounts[lowerW] = (wordCounts[lowerW] || 0) + 1;
          }
        });
      }
    });

    const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
    console.log('--- TOP 100 WORDS IN NAMES ---');
    sortedWords.slice(0, 100).forEach(([word, count]) => {
      console.log(`${word}: ${count}`);
    });

  } catch (err) {
    console.error('API Error:', err);
  }
}

main().catch(console.error);
