# Contact Cleaning Domain Rules

When writing a throwaway script to clean or standardize contacts, apply these domain-specific rules:

## 1. Context Tags
The following tags often appear in contact names (especially for service providers or colleagues) but should be extracted and moved to the Notes (Biographies) field:

`vast, gmg, cse, bbb, optum, cdm, inc, kkm, hr, qa, manager, support, tdp, builders, ich, zoho, hdfc, ce, carestack, jio, honda, truemeds, pe, noc, brocode, app, bank, med, hospital, clinic, pharma, muthoot, lic, byjus, accenture, cogni, cognizant, infosys, tcs, wipro, ibm, amazon, flipkart, myntra, swiggy, zomato, uber, ola, revv, pepperfry, furlenco, srm, tcr, tvm, chennai, che, velachery, pudussery, thailand, choondal, viviana, kilpok, pkd, cok, kannur, calicut, trivandrum, bangalore, mumbai, delhi, hyd, hyderabad, pune, kochi, ernakulam, thrissur, palakkad, kollam, alappuzha, kottayam, wayanad, kasaragod, idukki, malappuram, pathanamthitta, uae, dubai, uk, us, usa, aus, australia, canada, singapore, malaysia, philippines, philippenes, chinese, pak, pakistan, gvr, guruvayoor, city, girl, friend, tinder, batch, doctor, bumble, guy, driver, owner, onwer, roommate, flatmate, neighbor, colleague, boss, tl, lead, senior, junior, jr, sr, service, pokemon, pokmon, go, football, delivery, villa, shop, bike, car, auto, cab, repair, electrician, plumber, mechanic, carpenter, painter, caterer, catering, event, wedding, planner, cake, bakery, restaurant, cafe, food, grocery, supermarket, mart, store, mall, boutique, tailor, textile, jewellery, watch, mobile, laptop, pc, real, estate, broker, builder, contractor, architect, interior, designer, engineer, lawyer, advocate, legal, police, courier, transport, logistics, travel, tour, kayaking, nalumanikkatu, catalunya, muthamayee, relationship, floor, folk`

## 2. Honorifics
These are common Malayalam/Indian honorifics that usually imply the preceding words are the core name, and subsequent words are context:

`ikka, chettan, chetan, chechi, bro, uncle, aunty, anna, aliya, aliyan, machan, muthe, sir, madam, dr, prof, adv, maman, mami, ammavan, ammayi, mon, mole`

## 3. Name Parsing Logic
1. Split the raw contact name into words. Normalize each word by converting it to lowercase, removing accents, and stripping non-alphanumeric characters.
2. The first word is generally assumed to be part of the name (unless it's 'dr' or 'prof', which are kept in the name as a prefix).
3. If a word is an honorific, a context tag, contains purely digits, is a purely uppercase acronym (e.g., HDFC, CSE), or represents a date (8 digits), **it triggers the start of context**.
4. If a contact name exceeds 3 words (and the words are longer than 1 character), the 4th word and everything after **automatically triggers the start of context**.
5. Once "context" starts, all subsequent words are appended to the contact's `biographies` (Notes) field. The preceding words form the `givenName` and `familyName`.
6. Standardize `givenName` and `familyName` to Title Case.

## 4. Timestamp Extraction
Contacts sometimes contain timestamps (e.g., exactly 8 digits like `YYYYMMDD`). These will automatically trigger the context logic in the parsing rules above, so they will correctly move to the `biographies` field.

## 5. Phone Number Formatting
- Normalize phone numbers by stripping everything except digits and the `+` sign (`val.replace(/[^\d+]/g, '')`).
- Ensure the formatted string is saved back to `phoneNumbers[].value`.
