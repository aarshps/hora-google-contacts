const CONTEXT_TAGS = new Set([
  'vast', 'gmg', 'cse', 'bbb', 'optum', 'cdm', 'inc', 'kkm', 'hr', 'qa', 'manager', 'support', 'tdp', 'builders', 'ich', 'zoho', 'hdfc', 'ce', 'carestack', 'jio', 'honda', 'truemeds', 'pe', 'noc', 'brocode', 'app', 'bank', 'med', 'hospital', 'clinic', 'pharma', 'muthoot', 'lic', 'byjus', 'accenture', 'cogni', 'cognizant', 'infosys', 'tcs', 'wipro', 'ibm', 'amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'uber', 'ola', 'revv', 'pepperfry', 'furlenco', 'srm', 'tcr', 'tvm', 'chennai', 'che', 'velachery', 'pudussery', 'thailand', 'choondal', 'viviana', 'kilpok', 'pkd', 'cok', 'kannur', 'calicut', 'trivandrum', 'bangalore', 'mumbai', 'delhi', 'hyd', 'hyderabad', 'pune', 'kochi', 'ernakulam', 'thrissur', 'palakkad', 'kollam', 'alappuzha', 'kottayam', 'wayanad', 'kasaragod', 'idukki', 'malappuram', 'pathanamthitta', 'uae', 'dubai', 'uk', 'us', 'usa', 'aus', 'australia', 'canada', 'singapore', 'malaysia', 'philippines', 'chinese', 'pak', 'pakistan', 'gvr', 'guruvayoor', 'girl', 'friend', 'tinder', 'batch', 'chechi', 'doctor', 'bumble', 'chettan', 'sir', 'guy', 'driver', 'owner', 'uncle', 'aunty', 'brother', 'sister', 'mom', 'dad', 'mother', 'father', 'wife', 'husband', 'son', 'daughter', 'cousin', 'nephew', 'niece', 'grandpa', 'grandma', 'roommate', 'flatmate', 'neighbor', 'colleague', 'boss', 'tl', 'lead', 'senior', 'junior', 'jr', 'sr', 'service', 'pokemon', 'pokémon', 'go', 'football', 'delivery', 'villa', 'shop', 'bike', 'car', 'auto', 'cab', 'repair', 'electrician', 'plumber', 'mechanic', 'carpenter', 'painter', 'caterer', 'catering', 'event', 'wedding', 'planner', 'cake', 'bakery', 'restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'mart', 'store', 'mall', 'boutique', 'tailor', 'textile', 'jewellery', 'watch', 'mobile', 'laptop', 'pc', 'real', 'estate', 'broker', 'builder', 'contractor', 'architect', 'interior', 'designer', 'engineer', 'lawyer', 'advocate', 'legal', 'police', 'courier', 'transport', 'logistics', 'travel', 'tour', 'ticket', 'visa', 'immigration', 'abroad', 'study', 'education', 'college', 'school', 'tuition', 'class', 'institute', 'academy', 'university', 'hostel', 'pg', 'room', 'rent', 'lease', 'sale', 'buy', 'sell', 'customer', 'care', 'helpline', 'tech', 'software', 'hardware', 'it', 'bpo', 'kpo', 'sales', 'marketing', 'exec', 'executive', 'mgr', 'vp', 'ceo', 'coo', 'cfo', 'cto', 'cmo', 'chro', 'dr', 'prof', 'mr', 'mrs', 'ms', 'miss', 'lady', 'boy', 'man', 'woman', 'kid', 'child', 'baby', 'impl', 'boys', 'science', 'maths', 'physics', 'chemistry', 'biology', 'arts', 'commerce', 'accountant', 'accounts'
]);

function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => {
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}

function extractNameAndNotes(displayName) {
  const words = displayName.split(/\s+/);
  let nameWords = [];
  let noteWords = [];
  let foundContext = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    
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

const tests = [
  "Neha Impl Tvm GMG Girl",
  "Athul Sathananthan QA Brocode",
  "Helen Of Troy Tinder Girl",
  "Priyanka HDFC Relationship Manager Girl",
  "Sajan Xavier Antony Man Folk Kkm",
  "Mahesh B Catalunya City Onwer",
  "Rocsan Philippenes +1:30 Tinder Girl Singer",
  "Sangeeth Student Counter Photostat Kkm",
  "Babu Uncle Usha Aunty Mas",
  "Vidya Nijin CSE VAST Girl",
  "Amal Athul GMG",
  "Dr Pilla Pokémon GO Tcr",
  "Achu Aus",
  "Anjana B Batch VAST",
  "Jinto Pc Kkm BBB",
  "Mridula CSE VAST Girl",
  "Deepz CDM Jr VAST",
  "Manu Prasad CSE VAST"
];

tests.forEach(t => {
  const res = extractNameAndNotes(t);
  console.log(`Original: "${t}"`);
  console.log(`  Given:  "${res.givenName}"`);
  console.log(`  Family: "${res.familyName}"`);
  console.log(`  Note:   "${res.note}"`);
  console.log('---');
});
