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
  'vast', 'gmg', 'cse', 'bbb', 'optum', 'cdm', 'inc', 'kkm', 'hr', 'qa', 'manager', 'support', 'tdp', 'builders', 'ich', 'zoho', 'hdfc', 'ce', 'carestack', 'jio', 'honda', 'truemeds', 'pe', 'noc', 'brocode', 'app', 'bank', 'med', 'hospital', 'clinic', 'pharma', 'muthoot', 'lic', 'byjus', 'accenture', 'cogni', 'cognizant', 'infosys', 'tcs', 'wipro', 'ibm', 'amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'uber', 'ola', 'revv', 'pepperfry', 'furlenco', 'srm', 'tcr', 'tvm', 'chennai', 'che', 'velachery', 'pudussery', 'thailand', 'choondal', 'viviana', 'kilpok', 'pkd', 'cok', 'kannur', 'calicut', 'trivandrum', 'bangalore', 'mumbai', 'delhi', 'hyd', 'hyderabad', 'pune', 'kochi', 'ernakulam', 'thrissur', 'palakkad', 'kollam', 'alappuzha', 'kottayam', 'wayanad', 'kasaragod', 'idukki', 'malappuram', 'pathanamthitta', 'uae', 'dubai', 'uk', 'us', 'usa', 'aus', 'australia', 'canada', 'singapore', 'malaysia', 'philippines', 'philippenes', 'chinese', 'pak', 'pakistan', 'gvr', 'guruvayoor', 'city', 'girl', 'friend', 'tinder', 'batch', 'chechi', 'doctor', 'bumble', 'chettan', 'sir', 'guy', 'driver', 'owner', 'onwer', 'uncle', 'aunty', 'brother', 'sister', 'mom', 'dad', 'mother', 'father', 'wife', 'husband', 'son', 'daughter', 'cousin', 'nephew', 'niece', 'grandpa', 'grandma', 'roommate', 'flatmate', 'neighbor', 'colleague', 'boss', 'tl', 'lead', 'senior', 'junior', 'jr', 'sr', 'service', 'pokemon', 'pokmon', 'go', 'football', 'delivery', 'villa', 'shop', 'bike', 'car', 'auto', 'cab', 'repair', 'electrician', 'plumber', 'mechanic', 'carpenter', 'painter', 'caterer', 'catering', 'event', 'wedding', 'planner', 'cake', 'bakery', 'restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'mart', 'store', 'mall', 'boutique', 'tailor', 'textile', 'jewellery', 'watch', 'mobile', 'laptop', 'pc', 'real', 'estate', 'broker', 'builder', 'contractor', 'architect', 'interior', 'designer', 'engineer', 'lawyer', 'advocate', 'legal', 'police', 'courier', 'transport', 'logistics', 'travel', 'tour'
]);

function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => {
    if (!word) return ''; // Handle empty strings from split
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}

function extractNameAndNotes(displayName) {
  const words = displayName.split(/\s+/).filter(w => w.length > 0); // Filter out empty strings
  let nameWords = [];
  let noteWords = [];
  let foundContext = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Normalize word: remove accents, convert to lowercase, remove non-alphanumeric
    const cleanWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    
    // Check if the clean word is a known context tag, a number, or 'th' (common abbreviation)
    const isTag = CONTEXT_TAGS.has(cleanWord) || /\d/.test(word) || (cleanWord === 'th');
    
    if (foundContext) {
      noteWords.push(word);
    } else if (isTag && i > 0) { // If it's a tag and not the very first word (to avoid tag-like first words)
      foundContext = true;
      noteWords.push(word);
    } else {
      nameWords.push(word);
    }
  }
  
  // If no tags were found, assume all words are part of the name
  if (nameWords.length === 0 && words.length > 0) {
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
    // console.warn(`Could not load saved credentials from ${TOKEN_PATH}:`, err.message);
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
  try {
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
    console.log(`Credentials saved to ${TOKEN_PATH}`);
  } catch (err) {
    console.error(`Failed to save credentials to ${TOKEN_PATH}:`, err);
  }
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
    // console.log('Loaded saved credentials.');
    return client;
  }
  
  // Custom flow for CLI
  let credentials;
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    credentials = JSON.parse(content);
  } catch (err) {
    console.error(`Error reading credentials file ${CREDENTIALS_PATH}:`, err);
    console.error('Please ensure you have a valid "credentials.json" file.');
    process.exit(1); // Exit if credentials file is missing or invalid
  }
  
  const key = credentials.installed || credentials.web;
  if (!key) {
      console.error('Invalid credentials.json format. Missing "installed" or "web" key.');
      process.exit(1);
  }
  
  const oAuth2Client = new google.auth.OAuth2(
      key.client_id, key.client_secret, key.redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  
  let code;
  try {
    code = await askQuestion('Enter the code from that page here: ');
  } catch (err) {
    console.error('Error reading authorization code:', err);
    process.exit(1);
  }
  
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    await saveCredentials(oAuth2Client);
    return oAuth2Client;
  } catch (err) {
    console.error('Error retrieving token:', err);
    process.exit(1);
  }
}

/**
 * Helper function for rate limiting delay.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalizes a person's data to a uniform structure.
 * Also extracts contextual notes and timestamps into biography.
 */
function cleanPerson(person) {
  let hasChanges = false;
  const updatedPerson = {
    resourceName: person.resourceName,
    etag: person.etag,
    names: person.names ? [...person.names] : [], // Clone arrays
    emailAddresses: person.emailAddresses ? [...person.emailAddresses] : [],
    phoneNumbers: person.phoneNumbers ? [...person.phoneNumbers] : [],
    biographies: person.biographies ? [...person.biographies] : [],
  };

  const originalBioValue = updatedPerson.biographies[0]?.value || '';
  let currentBioNotes = [];

  // 1. Process Names: Title case, extract context to notes, handle potential timestamps
  if (updatedPerson.names.length > 0) {
    const name = updatedPerson.names[0];
    const currentDisplayName = (name.givenName || '') + ' ' + (name.familyName || '');
    const cleanedCurrentDisplayName = currentDisplayName.trim();

    if (cleanedCurrentDisplayName) {
      const extracted = extractNameAndNotes(cleanedCurrentDisplayName);
      
      // Check if name fields need updating
      if (name.givenName !== extracted.givenName || name.familyName !== extracted.familyName) {
        name.givenName = extracted.givenName;
        name.familyName = extracted.familyName;
        // Clear unstructuredName if it was used to derive structured names, 
        // to let Google's API properly use the structured names.
        if (name.unstructuredName && name.unstructuredName.trim() === cleanedCurrentDisplayName) {
            name.unstructuredName = ''; 
        }
        hasChanges = true;
      }
      
      // Add extracted notes to biography if not already present
      if (extracted.note && !originalBioValue.includes(extracted.note)) {
        currentBioNotes.push(extracted.note);
      }
    }
    
    // Also look for explicit timestamps if not captured by name parsing
    const timestampRegex = /[,\s]+(\d{8})\s*$/; // Pattern for YYYYMMDD at the end of a string
    const exactTimestampRegex = /^(\d{8})$/; // Pattern for exactly YYYYMMDD
    let foundTimestamp = null;

    // Check honorificSuffix first
    if (name.honorificSuffix && exactTimestampRegex.test(name.honorificSuffix.trim())) {
      foundTimestamp = name.honorificSuffix.trim();
      name.honorificSuffix = ''; // Clear it
      hasChanges = true;
    }
    // Check if timestamp is part of given name
    if (!foundTimestamp && name.givenName) {
      const match = name.givenName.match(timestampRegex);
      if (match) {
        foundTimestamp = match[1];
        name.givenName = name.givenName.replace(timestampRegex, '').trim();
        hasChanges = true;
      }
    }
    // Check if timestamp is part of family name
    if (!foundTimestamp && name.familyName) {
      const match = name.familyName.match(timestampRegex);
      if (match) {
        foundTimestamp = match[1];
        name.familyName = name.familyName.replace(timestampRegex, '').trim();
        hasChanges = true;
      }
    }

    if (foundTimestamp && !originalBioValue.includes(`Timestamp: ${foundTimestamp}`)) {
      currentBioNotes.push(`Timestamp: ${foundTimestamp}`);
    }
  }

  // Consolidate notes into biography
  if (currentBioNotes.length > 0) {
    const combinedNotes = currentBioNotes.join('\\n');
    const newBioValue = originalBioValue ? `${originalBioValue}\\n${combinedNotes}` : combinedNotes;
    
    if (updatedPerson.biographies.length === 0) {
      updatedPerson.biographies.push({ value: newBioValue });
    } else {
      updatedPerson.biographies[0].value = newBioValue;
    }
    hasChanges = true;
  }


  // 2. Normalize Phone Numbers (keep only digits and '+', remove spaces/hyphens)
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
  
  // 3. Ensure name fields are properly cleared if they become empty after cleaning
  if (updatedPerson.names.length > 0) {
    const name = updatedPerson.names[0];
    if (!name.givenName && !name.familyName && !name.unstructuredName && cleanedCurrentDisplayName) {
      // If after cleaning, all name fields are empty but there was a display name
      // this might indicate an issue or a name that was entirely context tags.
      // For now, we won't force deletion of names if they become empty,
      // but it's something to be aware of.
    }
  }


  return { person: updatedPerson, hasChanges };
}

/**
 * Lists all contacts, cleans them according to a uniform structure, and optionally updates them.
 * @param {OAuth2Client} authClient - Authorized Google API client.
 * @param {boolean} dryRun - If true, only report changes without applying them.
 */
async function syncContacts(authClient, dryRun = true) {
  const service = google.people({version: 'v1', auth: authClient});
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts...');
  try {
    do {
      // Fetching fields that are used for cleaning and analysis
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100, // Fetch in batches
        pageToken: nextPageToken,
        personFields: 'names,emailAddresses,phoneNumbers,biographies,metadata', // Include biographies to potentially store extracted notes
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Found ${allConnections.length} contacts.`);

    const contactsToUpdate = [];
    for (const person of allConnections) {
      const cleaned = cleanPerson(person);
      if (cleaned.hasChanges) {
        contactsToUpdate.push(cleaned.person);
      }
    }

    console.log(`Identified ${contactsToUpdate.length} contacts needing updates.`);

    if (dryRun) {
      console.log('\\n--- DRY RUN MODE (No changes will be made) ---');
      console.log('The following contacts would be updated:');
      // Display up to 10 contacts that would be updated
      contactsToUpdate.slice(0, 10).forEach(p => {
        const name = p.names && p.names.length > 0 ? p.names[0] : null;
        const displayName = name ? `${name.givenName || ''} ${name.familyName || ''}`.trim() : 'No Name';
        let bio = 'None';
        if (p.biographies && p.biographies.length > 0) bio = p.biographies[0].value.replace(/\\n/g, ' \\\\n ');
        console.log(`- "${displayName}" | Note: "${bio}"`);
      });
      if (contactsToUpdate.length > 10) console.log(`... and ${contactsToUpdate.length - 10} more.`);
      console.log('\\nTo apply these changes, run the script with the "apply" command.');
      return;
    }

    if (contactsToUpdate.length === 0) {
      console.log('All contacts are already uniform and up-to-date.');
      return;
    }

    console.log('\\nStarting updates. This may take a while and respects Google API rate limits.');
    let count = 0;
    // Process updates with rate limiting
    for (const person of contactsToUpdate) {
      let retries = 3; // Number of retries for rate limiting/transient errors
      while (retries > 0) {
        try {
          await service.people.updateContact({
            resourceName: person.resourceName,
            // Specify fields to update. Use person.keys() if more dynamic updating is needed.
            updatePersonFields: 'names,emailAddresses,phoneNumbers,biographies', 
            requestBody: person,
          });
          process.stdout.write('.');
          count++;
          
          // Sleep to manage API rate limits. Approx 2 requests/sec is safe.
          // Add longer sleep for every 50 contacts to be more conservative.
          if (count % 50 === 0) {
             console.log(`\\nUpdated ${count} contacts. Sleeping for 5 seconds to respect rate limits.`);
             await sleep(5000); 
          } else {
             await sleep(500); // 500ms delay per request
          }
          break; // Success, exit retry loop for this contact
        } catch (err) {
          // Check for common rate limit or server errors
          if (err.message && (err.message.includes('Quota exceeded') || err.message.includes('502') || err.message.includes('500'))) {
            retries--;
            console.log(`\\nRate limit or server error encountered. Retries left: ${retries}. Sleeping for 15 seconds...`);
            await sleep(15000); // Longer sleep for rate limiting
          } else {
             // Log unexpected errors and re-throw to stop the process
             console.error(`\\nError updating contact ${person.resourceName}:`, err);
             throw err; 
          }
        }
      }
      if (retries === 0) {
          console.error(`\\nFailed to update contact ${person.resourceName} after multiple retries.`);
          // Decide whether to continue or stop. For now, we log and continue.
      }
    }
    console.log(`\\nUpdate process finished. ${count} contacts were successfully updated.`);

  } catch (err) {
    console.error('An error occurred during contact synchronization: ' + err);
  }
}

/**
 * Analyzes contacts and prints a detailed report of data quality and potential duplicates.
 * @param {OAuth2Client} authClient - Authorized Google API client.
 */
async function analyzeContacts(authClient) {
  const service = google.people({version: 'v1', auth: authClient});
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts for analysis...');
  try {
    // Fetching fields necessary for analysis and duplicate detection
    do {
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        pageToken: nextPageToken,
        personFields: 'names,emailAddresses,phoneNumbers,biographies', // Ensure all relevant fields are fetched
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    const totalContacts = allConnections.length;
    const stats = {
      total: totalContacts,
      hasNames: 0,
      namesWithDigits: [], // Renamed from namesWithNumbers for clarity
      hasPhones: 0,
      hasEmails: 0,
      lowercaseNames: 0,
      uppercaseNames: 0,
      phoneFormats: {},
      // Structures to store potential duplicates, mapping a normalized value to its occurrences and examples
      potentialDuplicates: {
        byName: new Map(), // Map<string, { count: number, names: string[] }>
        byPhone: new Map(), // Map<string, { count: number, phones: string[] }>
        byEmail: new Map()  // Map<string, { count: number, emails: string[] }>
      }
    };

    // --- Data Collection and Analysis Loop ---
    allConnections.forEach(person => {
      const personDisplayName = person.names && person.names.length > 0 && person.names[0].displayName
        ? person.names[0].displayName
        : 'Unnamed';

      // --- Name Analysis ---
      if (person.names && person.names.length > 0) {
        stats.hasNames++;
        const nameObj = person.names[0];
        const displayName = nameObj.displayName || personDisplayName; // Use actual display name
        const lowerDisplayName = displayName.toLowerCase();

        // Count occurrences of names for duplicate detection
        const nameEntry = stats.potentialDuplicates.byName.get(lowerDisplayName) || { count: 0, names: [] };
        nameEntry.count++;
        nameEntry.names.push(displayName); // Store the actual display name
        stats.potentialDuplicates.byName.set(lowerDisplayName, nameEntry);

        // Check for names that are all lowercase or all uppercase
        if (displayName === displayName.toLowerCase() && displayName !== displayName.toUpperCase()) stats.lowercaseNames++;
        if (displayName === displayName.toUpperCase() && displayName !== displayName.toLowerCase()) stats.uppercaseNames++;
        
        // Collect names containing digits (potential timestamps, codes, etc.)
        if (/\d/.test(displayName)) {
           stats.namesWithDigits.push(displayName);
        }
      }

      // --- Phone Number Analysis ---
      if (person.phoneNumbers && person.phoneNumbers.length > 0) {
        stats.hasPhones++;
        person.phoneNumbers.forEach(p => {
          const val = p.value;
          // Normalize phone number to digit-only string for comparison
          const digitOnly = val.replace(/[^\d+]/g, ''); 
          if (digitOnly) {
            // Count occurrences of digit-only phone numbers for duplicate detection
            const phoneEntry = stats.potentialDuplicates.byPhone.get(digitOnly) || { count: 0, phones: [] };
            phoneEntry.count++;
            phoneEntry.phones.push(val); // Store the actual phone number value
            stats.potentialDuplicates.byPhone.set(digitOnly, phoneEntry);
          }
          // Analyze phone number formats (e.g., ###-###-####, +## #########)
          const format = val.replace(/\d/g, '#'); // Replace digits with '#' to represent format
          stats.phoneFormats[format] = (stats.phoneFormats[format] || 0) + 1;
        });
      }

      // --- Email Address Analysis ---
      if (person.emailAddresses && person.emailAddresses.length > 0) {
        stats.hasEmails++;
        person.emailAddresses.forEach(emailObj => {
          const email = emailObj.value;
          if (email) {
            const lowerEmail = email.toLowerCase();
            // Count occurrences of emails for duplicate detection
            const emailEntry = stats.potentialDuplicates.byEmail.get(lowerEmail) || { count: 0, emails: [] };
            emailEntry.count++;
            emailEntry.emails.push(email); // Store the actual email value
            stats.potentialDuplicates.byEmail.set(lowerEmail, emailEntry);
          }
        });
      }
    });

    // --- Reporting Summary Statistics ---
    console.log('\\n--- CONTACTS ANALYSIS REPORT ---');
    console.log(`Total Contacts Analyzed: ${totalContacts}`);
    console.log(`Contacts with Names: ${stats.hasNames} (${((stats.hasNames / totalContacts) * 100).toFixed(1)}%)`);
    console.log(`Contacts with Phone Numbers: ${stats.hasPhones} (${((stats.hasPhones / totalContacts) * 100).toFixed(1)}%)`);
    console.log(`Contacts with Email Addresses: ${stats.hasEmails} (${((stats.hasEmails / totalContacts) * 100).toFixed(1)}%)`);
    
    if (stats.lowercaseNames > 0) console.log(`Names entirely in lowercase: ${stats.lowercaseNames}`);
    if (stats.uppercaseNames > 0) console.log(`Names entirely in uppercase: ${stats.uppercaseNames}`);

    console.log(`\\nFound ${stats.namesWithDigits.length} names containing digits.`);
    if (stats.namesWithDigits.length > 0) {
      console.log('Sample names with digits (up to 10):');
      stats.namesWithDigits.slice(0, 10).forEach(n => console.log(` - ${n}`));
    }

    console.log('\\nCommon Phone Number Formats (normalized):');
    const sortedPhoneFormats = Object.entries(stats.phoneFormats).sort(([, a], [, b]) => b - a);
    sortedPhoneFormats.slice(0, 5).forEach(([format, count]) => console.log(` - ${format}: ${count} occurrences`));
    if (sortedPhoneFormats.length > 5) console.log(`... and ${sortedPhoneFormats.length - 5} more formats.`);

    // --- Reporting Detailed Duplicate Analysis ---
    console.log('\\n--- DETAILED DUPLICATE ANALYSIS ---');

    // Helper to sort and print duplicate entries
    const printDuplicates = (title, map, exampleField) => {
      console.log(`\\nPotential Duplicates by ${title}:`);
      let foundDuplicates = false;
      // Sort by count descending to show most frequent duplicates first
      const sortedEntries = Array.from(map.entries()).sort(([, a], [, b]) => b.count - a.count);

      for (const [key, data] of sortedEntries) {
        if (data.count > 1) {
          foundDuplicates = true;
          console.log(`- ${title}: "${key}" (appears ${data.count} times)`);
          // Display up to 5 examples of the actual values
          const examples = data[exampleField].slice(0, 5).join(', ');
          console.log(`  Examples: ${examples}${data[exampleField].length > 5 ? '...' : ''}`);
        }
      }
      if (!foundDuplicates) console.log(`  No ${title.toLowerCase()} duplicates found.`);
    };

    printDuplicates('Name', stats.potentialDuplicates.byName, 'names');
    printDuplicates('Phone (Digit-only)', stats.potentialDuplicates.byPhone, 'phones');
    printDuplicates('Email', stats.potentialDuplicates.byEmail, 'emails');

  } catch (err) {
    console.error('An error occurred during contact analysis: ' + err);
  }
}

/**
 * Main function to handle command-line arguments and orchestrate operations.
 */
async function main() {
  // Ensure credentials are set up before proceeding
  const auth = await authorize();
  
  const mode = process.argv[2] || 'analyze'; // Default to 'analyze' if no argument is provided
  
  if (mode === 'analyze') {
    await analyzeContacts(auth);
  } else if (mode === 'sync') {
    // Sync mode performs cleaning but only reports changes (dry run)
    await syncContacts(auth, true); // dryRun = true
  } else if (mode === 'apply') {
    // Apply mode performs cleaning and applies the changes
    await syncContacts(auth, false); // dryRun = false
  } else {
    console.log('Usage: node index.js [analyze|sync|apply]');
    console.log('  analyze: Performs a detailed analysis of contacts and reports duplicates.');
    console.log('  sync:    Shows what changes would be made to standardize contact data (dry run).');
    console.log('  apply:   Applies standardization changes to your contacts.');
  }
}

// Execute the main function and catch any top-level errors
main().catch(console.error);
