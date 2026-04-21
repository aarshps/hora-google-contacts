# Contact Cleaning Domain Rules

When writing a throwaway script to clean or standardize contacts, apply these domain-specific rules:

## 1. Context Tags
The following tags often appear in contact names (especially for service providers or colleagues) but should be extracted and moved to the Notes (Biographies) field:

`vast, gmg, cse, bbb, optum, cdm, inc, kkm, hr, qa, manager, support, tdp, builders, ich, zoho, hdfc, ce, carestack, jio, honda, truemeds, pe, noc, brocode, app, bank, med, hospital, clinic, pharma, muthoot, lic, byjus, accenture, cogni, cognizant, infosys, tcs, wipro, ibm, amazon, flipkart, myntra, swiggy, zomato, uber, ola, revv, pepperfry, furlenco, srm, tcr, tvm, chennai, che, velachery, pudussery, thailand, choondal, viviana, kilpok, pkd, cok, kannur, calicut, trivandrum, bangalore, mumbai, delhi, hyd, hyderabad, pune, kochi, ernakulam, thrissur, palakkad, kollam, alappuzha, kottayam, wayanad, kasaragod, idukki, malappuram, pathanamthitta, uae, dubai, uk, us, usa, aus, australia, canada, singapore, malaysia, philippines, philippenes, chinese, pak, pakistan, gvr, guruvayoor, city, girl, friend, tinder, batch, chechi, doctor, bumble, chettan, sir, guy, driver, owner, onwer, uncle, aunty, brother, sister, mom, dad, mother, father, wife, husband, son, daughter, cousin, nephew, niece, grandpa, grandma, roommate, flatmate, neighbor, colleague, boss, tl, lead, senior, junior, jr, sr, service, pokemon, pokmon, go, football, delivery, villa, shop, bike, car, auto, cab, repair, electrician, plumber, mechanic, carpenter, painter, caterer, catering, event, wedding, planner, cake, bakery, restaurant, cafe, food, grocery, supermarket, mart, store, mall, boutique, tailor, textile, jewellery, watch, mobile, laptop, pc, real, estate, broker, builder, contractor, architect, interior, designer, engineer, lawyer, advocate, legal, police, courier, transport, logistics, travel, tour`

## 2. Name Parsing Logic
1. Split the raw contact name into words. Normalize each word by converting it to lowercase, removing accents, and stripping non-alphanumeric characters.
2. Check if a word is a context tag (from the list above), purely digits, or 'th'. If it is, and it's not the very first word, consider it and all subsequent words as "context/notes".
3. Assign the first remaining word as `givenName`. If there are more words, join them with a space and assign as `familyName`.
4. Standardize `givenName` and `familyName` to Title Case.
5. Join the words identified as context with a space and append them to the contact's `biographies` field.

## 3. Timestamp Extraction
Contacts sometimes contain timestamps (e.g., exactly 8 digits like `YYYYMMDD`).
- Check `honorificSuffix` or the end of `givenName`/`familyName` for the pattern `[,\s]+(\d{8})\s*$`.
- If found, remove it from the name fields and append `Timestamp: YYYYMMDD` to the `biographies` field.

## 4. Phone Number Formatting
- Normalize phone numbers by stripping everything except digits and the `+` sign (`val.replace(/[^\d+]/g, '')`).
- Ensure the formatted string is saved back to `phoneNumbers[].value`.
