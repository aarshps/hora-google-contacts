const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(process.cwd(), 'token.json');

const CONTEXT_TAGS = new Set([
  'vast', 'gmg', 'cse', 'bbb', 'optum', 'cdm', 'inc', 'kkm', 'hr', 'qa', 'manager', 'support', 'tdp', 'builders', 'ich', 'zoho', 'hdfc', 'ce', 'carestack', 'jio', 'honda', 'truemeds', 'pe', 'noc', 'brocode', 'app', 'bank', 'med', 'hospital', 'clinic', 'pharma', 'muthoot', 'lic', 'byjus', 'accenture', 'cogni', 'cognizant', 'infosys', 'tcs', 'wipro', 'ibm', 'amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'uber', 'ola', 'revv', 'pepperfry', 'furlenco', 'srm', 'tcr', 'tvm', 'chennai', 'che', 'velachery', 'pudussery', 'thailand', 'choondal', 'viviana', 'kilpok', 'pkd', 'cok', 'kannur', 'calicut', 'trivandrum', 'bangalore', 'mumbai', 'delhi', 'hyd', 'hyderabad', 'pune', 'kochi', 'ernakulam', 'thrissur', 'palakkad', 'kollam', 'alappuzha', 'kottayam', 'wayanad', 'kasaragod', 'idukki', 'malappuram', 'pathanamthitta', 'uae', 'dubai', 'uk', 'us', 'usa', 'aus', 'australia', 'canada', 'singapore', 'malaysia', 'philippines', 'philippenes', 'chinese', 'pak', 'pakistan', 'gvr', 'guruvayoor', 'city', 'girl', 'friend', 'tinder', 'batch', 'doctor', 'bumble', 'guy', 'driver', 'owner', 'onwer', 'roommate', 'flatmate', 'neighbor', 'colleague', 'boss', 'tl', 'lead', 'senior', 'junior', 'jr', 'sr', 'service', 'pokemon', 'pokmon', 'go', 'football', 'delivery', 'villa', 'shop', 'bike', 'car', 'auto', 'cab', 'repair', 'electrician', 'plumber', 'mechanic', 'carpenter', 'painter', 'caterer', 'catering', 'event', 'wedding', 'planner', 'cake', 'bakery', 'restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'mart', 'store', 'mall', 'boutique', 'tailor', 'textile', 'jewellery', 'watch', 'mobile', 'laptop', 'pc', 'real', 'estate', 'broker', 'builder', 'contractor', 'architect', 'interior', 'designer', 'engineer', 'lawyer', 'advocate', 'legal', 'police', 'courier', 'transport', 'logistics', 'travel', 'tour', 'kayaking', 'nalumanikkatu', 'catalunya', 'muthamayee', 'relationship', 'floor', 'folk', 'daddict', 'imessage', 'teacher', 'world', 'centre', 'vava', 'misscall', 'friendzchat', 'cricket', 'resort', 'update', 'returns', 'contact', 'loan', 'nurse', 'poovath', 'uidai', 'returns', 'sbi', 'medical', 'meals', 'unknown'
]);

const HONORIFICS = new Set(['ikka', 'chettan', 'chechi', 'bro', 'uncle', 'aunty', 'anna', 'aliya', 'aliyan', 'machan', 'muthe', 'sir', 'madam', 'dr', 'prof', 'adv', 'maman', 'mami', 'ammavan', 'ammayi']);

function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => {
    if (!word) return '';
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}

function parseName(displayName) {
  const rawWords = displayName.split(/\s+/).filter(w => w.length > 0);
  let nameWords = [];
  let noteWords = [];
  let isContextStarted = false;

  for (let i = 0; i < rawWords.length; i++) {
    const rawWord = rawWords[i];
    const cleanWord = rawWord.toLowerCase().replace(/[^a-z0-9]/g, '');

    const isHonorific = HONORIFICS.has(cleanWord);
    const isTag = CONTEXT_TAGS.has(cleanWord);
    const hasDigits = /\d/.test(rawWord);
    const isPureUppercase = rawWord === rawWord.toUpperCase() && rawWord.match(/[A-Z]/) && rawWord.length > 1;
    const isDate = /^\d{8}$/.test(cleanWord);
    const hasPlus = rawWord.includes('+');
    
    if (i === 0 && (cleanWord === 'dr' || cleanWord === 'prof')) {
        nameWords.push(titleCase(rawWord));
        continue;
    }

    if (isContextStarted) {
      noteWords.push(rawWord);
    } else if (i > 0 && (isHonorific || isTag || hasDigits || isPureUppercase || isDate || hasPlus)) {
      isContextStarted = true;
      noteWords.push(rawWord);
    } else if (i >= 3 && rawWord.length > 1) { 
      isContextStarted = true;
      noteWords.push(rawWord);
    } else {
      nameWords.push(titleCase(rawWord));
    }
  }

  let givenName = '';
  let familyName = '';
  
  if (nameWords.length > 0) {
    givenName = nameWords[0];
    if (nameWords.length > 1) {
      familyName = nameWords.slice(1).join(' ');
    }
  }

  return { givenName, familyName, note: noteWords.join(' ') };
}

async function authorize() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.error('Error loading token.json:', err.message);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function forceClean() {
  const authClient = await authorize();
  const service = google.people({version: 'v1', auth: authClient});
  
  let allConnections = [];
  let nextPageToken = null;

  console.log('Fetching contacts...');
  try {
    do {
      const res = await service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        pageToken: nextPageToken,
        personFields: 'names,biographies,emailAddresses,phoneNumbers',
      });
      if (res.data.connections) {
        allConnections = allConnections.concat(res.data.connections);
      }
      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Found ${allConnections.length} contacts.`);

    const contactsToUpdate = [];
    
    for (const person of allConnections) {
      if (!person.names || person.names.length === 0) continue;
      
      const originalNameObj = person.names[0];
      const displayName = originalNameObj.displayName;
      if (!displayName) continue;

      const words = displayName.split(/\s+/).filter(w => w.length > 0);
      const isSuspicious = words.length > 3 || /\d/.test(displayName) || words.some(w => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w));

      if (!isSuspicious) continue;

      const parsed = parseName(displayName);

      let bioChanged = false;
      const originalBioObj = (person.biographies && person.biographies.length > 0) ? person.biographies[0] : null;
      let newBioValue = originalBioObj ? originalBioObj.value : '';
      
      if (parsed.note) {
        if (!newBioValue.includes(parsed.note)) {
          newBioValue = newBioValue ? `${newBioValue}\n${parsed.note}` : parsed.note;
          bioChanged = true;
        }
      }

      // ALWAYS append a space to force Google API to accept the update and clear unstructuredName!
      const finalGivenName = parsed.givenName + ' ';

      const updatedPerson = {
        resourceName: person.resourceName,
        etag: person.etag,
        names: [{
          metadata: originalNameObj.metadata,
          givenName: finalGivenName,
          familyName: parsed.familyName,
          unstructuredName: ''
        }]
      };
      
      if (person.emailAddresses) updatedPerson.emailAddresses = person.emailAddresses;
      if (person.phoneNumbers) updatedPerson.phoneNumbers = person.phoneNumbers;
      
      if (bioChanged || originalBioObj) {
        updatedPerson.biographies = [{ value: newBioValue }];
      }
      
      contactsToUpdate.push({ originalDisplayName: displayName, person: updatedPerson });
    }

    console.log(`Identified ${contactsToUpdate.length} suspicious contacts needing forced updates.`);
    
    // Apply updates
    console.log('\nApplying updates...');
    let count = 0;
    for (const item of contactsToUpdate) {
      const { person } = item;
      let retries = 3;
      while (retries > 0) {
        try {
          await service.people.updateContact({
            resourceName: person.resourceName,
            updatePersonFields: 'names,biographies',
            requestBody: person,
          });
          process.stdout.write('.');
          count++;
          
          if (count % 50 === 0) {
             console.log(`\nUpdated ${count} contacts. Sleeping for 3 seconds.`);
             await sleep(3000); 
          } else {
             await sleep(500);
          }
          break;
        } catch (err) {
          if (err.message && (err.message.includes('Quota') || err.message.includes('502') || err.message.includes('429'))) {
            retries--;
            console.log(`\nRate limit. Retries left: ${retries}. Sleeping for 10s...`);
            await sleep(10000);
          } else {
             console.error(`\nError updating ${person.resourceName}:`, err.message);
             break;
          }
        }
      }
    }
    console.log(`\nFinished updating ${count} contacts.`);

  } catch (err) {
    console.error('API Error:', err.message);
  }
}

forceClean().catch(console.error);
