const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function authorize() {
  const content = await fs.readFile(TOKEN_PATH);
  return google.auth.fromJSON(JSON.parse(content));
}

async function inspect() {
  const authClient = await authorize();
  const service = google.people({version: 'v1', auth: authClient});

  try {
    const res = await service.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,biographies',
    });
    
    for (const c of res.data.connections) {
      if (c.names && c.names[0].displayName && c.names[0].displayName.includes('Akhil CSE Jr VAST')) {
        console.log(JSON.stringify(c, null, 2));
        return;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

inspect().catch(console.error);
