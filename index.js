const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/contacts'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const CONTEXT_TAGS = new Set([
  'vast', 'gmg', 'cse', 'bbb', 'optum', 'cdm', 'inc', 'kkm', 'hr', 'qa', 'manager', 'support', 'tdp', 'builders', 'ich', 'zoho', 'hdfc', 'ce', 'carestack', 'jio', 'honda', 'truemeds', 'pe', 'noc', 'brocode', 'app', 'bank', 'med', 'hospital', 'clinic', 'pharma', 'muthoot', 'lic', 'byjus', 'accenture', 'cogni', 'cognizant', 'infosys', 'tcs', 'wipro', 'ibm', 'amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'uber', 'ola', 'revv', 'pepperfry', 'furlenco', 'srm', 'tcr', 'tvm', 'chennai', 'che', 'velachery', 'pudussery', 'thailand', 'choondal', 'viviana', 'kilpok', 'pkd', 'cok', 'kannur', 'calicut', 'trivandrum', 'bangalore', 'mumbai', 'delhi', 'hyd', 'hyderabad', 'pune', 'kochi', 'ernakulam', 'thrissur', 'palakkad', 'kollam', 'alappuzha', 'kottayam', 'wayanad', 'kasaragod', 'idukki', 'malappuram', 'pathanamthitta', 'uae', 'dubai', 'uk', 'us', 'usa', 'aus', 'australia', 'canada', 'singapore', 'malaysia', 'philippines', 'philippenes', 'chinese', 'pak', 'pakistan', 'gvr', 'guruvayoor', 'city', 'girl', 'friend', 'tinder', 'batch', 'chechi', 'doctor', 'bumble', 'chettan', 'sir', 'guy', 'driver', 'owner', 'onwer', 'uncle', 'aunty', 'brother', 'sister', 'mom', 'dad', 'mother', 'father', 'wife', 'husband', 'son', 'daughter', 'cousin', 'nephew', 'niece', 'grandpa', 'grandma', 'roommate', 'flatmate', 'neighbor', 'colleague', 'boss', 'tl', 'lead', 'senior', 'junior', 'jr', 'sr', 'service', 'pokemon', 'pokmon', 'go', 'football', 'delivery', 'villa', 'shop', 'bike', 'car', 'auto', 'cab', 'repair', 'electrician', 'plumber', 'mechanic', 'carpenter', 'painter', 'caterer', 'catering', 'event', 'wedding', 'planner', 'cake', 'bakery', 'restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'mart', 'store', 'mall', 'boutique', 'tailor', 'textile', 'jewellery', 'watch', 'mobile', 'laptop', 'pc', 'real', 'estate', 'broker', 'builder', 'contractor', 'architect', 'interior', 'designer', 'engineer', 'lawyer', 'advocate', 'legal', 'police', 'courier', 'transport', 'logistics', 'travel', 'tour', 'ticket', 'visa', 'immigration', 'abroad', 'study', 'education', 'college', 'school', 'tuition', 'class', 'institute', 'academy', 'university', 'hostel', 'pg', 'room', 'rent', 'lease', 'sale', 'buy', 'sell', 'customer', 'care', 'helpline', 'tech', 'software', 'hardware', 'it', 'bpo', 'kpo', 'sales', 'marketing', 'exec', 'executive', 'mgr', 'vp', 'ceo', 'coo', 'cfo', 'cto', 'cmo', 'chro', 'dr', 'prof', 'mr', 'mrs', 'ms', 'miss', 'lady', 'boy', 'man', 'woman', 'kid', 'child', 'baby', 'impl', 'boys', 'science', 'maths', 'physics', 'chemistry', 'biology', 'arts', 'commerce', 'accountant', 'accounts', 'singer', 'photostat'
]);

function extractNameAndNotes(displayName) {
  const words = displayName.split(/\s+/);
  let nameWords = [];
  let noteWords = [];
  let foundContext = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const cleanWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    
    const isTag = CONTEXT_TAGS.has(cleanWord) || /\d/.test(word) || (cleanWord === 'th');
    
    if (foundContext) {
      noteWords.push(word);
    } else if (isTag && i > 0) { 
      foundContext = true;
      noteWords.push(word);
    } else {
      nameWords.push(word);
    }
  }
  
  if (nameWords.length === 0) {
    nameWords = words;
    noteWords = [];
  }
  
  let givenName = '';
  let familyName = '';
  
  if (nameWords.length === 1) {
    givenName = nameWords[0];
  } else if (nameWords.length > 1) {
    givenName = nameWords[0];
    familyName = nameWords.slice(1).join(' ');
  }
  
  return {
    givenName: titleCase(givenName),
    familyName: titleCase(familyName),
    note: noteWords.join(' ')
  };
}

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
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
        personFields: 'names,emailAddresses,phoneNumbers,biographies,metadata',
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
      updates.slice(0, 10).forEach(p => {
        const name = p.names ? p.names[0] : null;
        const displayName = name ? `${name.givenName || ''} ${name.familyName || ''}`.trim() : 'No Name';
        let bio = 'None';
        if (p.biographies && p.biographies.length > 0) bio = p.biographies[0].value;
        console.log(`Would update: "${displayName}" | Note: "${bio.replace(/\n/g, ' \\n ')}"`);
      });
      if (updates.length > 10) console.log(`... and ${updates.length - 10} more.`);
      return;
    }

    if (updates.length === 0) {
      console.log('All contacts are already uniform.');
      return;
    }

    console.log('Starting updates...');
    let count = 0;
    for (const person of updates) {
      let retries = 3;
      while (retries > 0) {
        try {
          await service.people.updateContact({
            resourceName: person.resourceName,
            updatePersonFields: 'names,emailAddresses,phoneNumbers,biographies',
            requestBody: person,
          });
          process.stdout.write('.');
          count++;
          if (count % 50 === 0) {
             console.log(`\nUpdated ${count} contacts. Sleeping to respect rate limit...`);
             await sleep(3000); // Sleep 3 seconds every 50 contacts
          }
          await sleep(500); // 500ms delay per request (~2 per second)
          break; // Success, break retry loop
        } catch (err) {
          if (err.message && (err.message.includes('Quota exceeded') || err.message.includes('502'))) {
            retries--;
            console.log(`\nRate limit or 502 hit. Retries left: ${retries}. Sleeping 10s...`);
            await sleep(10000);
          } else {
             throw err; // Re-throw other errors
          }
        }
      }
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
    etag: person.etag,
    names: person.names || [],
    emailAddresses: person.emailAddresses || [],
    phoneNumbers: person.phoneNumbers || [],
    biographies: person.biographies || [],
  };

  // 0. Extract Timestamps from Names to Notes
  if (updatedPerson.names.length > 0) {
    const name = updatedPerson.names[0];
    const originalDisplay = name.displayName;
    const timestampRegex = /[,\s]+(\d{8})\s*$/; // Added \s* to handle trailing spaces
    const exactTimestampRegex = /^(\d{8})$/;
    
    let foundTimestamp = null;

    if (name.honorificSuffix) {
      const match = name.honorificSuffix.trim().match(exactTimestampRegex);
      if (match) {
        foundTimestamp = match[1];
        name.honorificSuffix = '';
        hasChanges = true;
      }
    }
    
    if (!foundTimestamp && name.givenName) {
      const match = name.givenName.match(timestampRegex);
      if (match) {
        foundTimestamp = match[1];
        name.givenName = name.givenName.replace(timestampRegex, '').trim();
        hasChanges = true;
      }
    }
    
    if (!foundTimestamp && name.familyName) {
      const match = name.familyName.match(timestampRegex);
      if (match) {
        foundTimestamp = match[1];
        name.familyName = name.familyName.replace(timestampRegex, '').trim();
        hasChanges = true;
      }
    }

    if (foundTimestamp) {
      const noteText = `Timestamp: ${foundTimestamp}`;
      let bioUpdated = false;
      
      if (updatedPerson.biographies.length > 0) {
        const bio = updatedPerson.biographies[0];
        if (!bio.value.includes(noteText)) {
           bio.value = bio.value ? `${bio.value}\n${noteText}` : noteText;
           bioUpdated = true;
        }
      } else {
        updatedPerson.biographies.push({ value: noteText });
        bioUpdated = true;
      }
      
      if (bioUpdated) {
        hasChanges = true;
      }
    }
  }

  // 1. Uniform Names (Title Case & Extract Context to Notes)
  if (updatedPerson.names.length > 0) {
    const name = updatedPerson.names[0];
    const currentNameText = `${name.givenName || ''} ${name.familyName || ''}`.trim();
    
    if (currentNameText) {
      const extracted = extractNameAndNotes(currentNameText);
      
      if (name.givenName !== extracted.givenName || name.familyName !== extracted.familyName) {
        name.givenName = extracted.givenName;
        name.familyName = extracted.familyName;
        hasChanges = true;
      }
      
      if (extracted.note) {
        const noteText = extracted.note;
        let bioUpdated = false;
        
        if (updatedPerson.biographies.length > 0) {
          const bio = updatedPerson.biographies[0];
          if (!bio.value.includes(noteText)) {
             bio.value = bio.value ? `${bio.value}\n${noteText}` : noteText;
             bioUpdated = true;
          }
        } else {
          updatedPerson.biographies.push({ value: noteText });
          bioUpdated = true;
        }
        
        if (bioUpdated) {
          hasChanges = true;
        }
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

/**
 * Analyzes contacts and prints a summary report of data quality and patterns.
 */
async function analyzeContacts(authClient) {
  const service = google.people({version: 'v1', auth: authClient});
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts for analysis...');
  try {
    do {
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        pageToken: nextPageToken,
        personFields: 'names,emailAddresses,phoneNumbers',
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    const total = allConnections.length;
    const stats = {
      total,
      hasNames: 0,
      namesWithNumbers: [],
      hasPhones: 0,
      hasEmails: 0,
      lowercaseNames: 0,
      uppercaseNames: 0,
      phoneFormats: {},
      potentialDuplicates: {
        byName: new Map(),
        byPhone: new Map()
      }
    };

    allConnections.forEach(person => {
      if (person.names && person.names.length > 0) {
        stats.hasNames++;
        const name = person.names[0].displayName;
        if (name === name.toLowerCase() && name !== name.toUpperCase()) stats.lowercaseNames++;
        if (name === name.toUpperCase() && name !== name.toLowerCase()) stats.uppercaseNames++;
        
        // Look for names ending in numbers or date-like patterns
        if (/\d+/.test(name)) {
           // just collect names that have digits to see what they look like
           stats.namesWithNumbers.push(name);
        }

        const count = stats.potentialDuplicates.byName.get(name.toLowerCase()) || 0;
        stats.potentialDuplicates.byName.set(name.toLowerCase(), count + 1);
      }

      if (person.phoneNumbers && person.phoneNumbers.length > 0) {
        stats.hasPhones++;
        person.phoneNumbers.forEach(p => {
          const val = p.value;
          const format = val.replace(/\d/g, '#');
          stats.phoneFormats[format] = (stats.phoneFormats[format] || 0) + 1;
          
          const digitOnly = val.replace(/\D/g, '');
          if (digitOnly) {
            const count = stats.potentialDuplicates.byPhone.get(digitOnly) || 0;
            stats.potentialDuplicates.byPhone.set(digitOnly, count + 1);
          }
        });
      }

      if (person.emailAddresses && person.emailAddresses.length > 0) stats.hasEmails++;
    });

    console.log('\n--- CONTACTS ANALYSIS REPORT ---');
    console.log(`Total Contacts: ${total}`);
    
    console.log('\n--- NAMES WITH NUMBERS/TIMESTAMPS ---');
    console.log(`Found ${stats.namesWithNumbers.length} names containing digits.`);
    console.log('Sample (up to 20):');
    stats.namesWithNumbers.slice(0, 20).forEach(n => console.log(` - ${n}`));

  } catch (err) {
    console.error('The API returned an error: ' + err);
  }
}

async function main() {
  const auth = await authorize();
  
  const mode = process.argv[2] || 'analyze';
  
  if (mode === 'analyze') {
    await analyzeContacts(auth);
  } else if (mode === 'sync') {
    await syncContacts(auth, true); // dryRun = true
  } else if (mode === 'apply') {
    await syncContacts(auth, false); // dryRun = false
  } else {
    console.log('Usage: node index.js [analyze|sync|apply]');
  }
}

main().catch(console.error);
