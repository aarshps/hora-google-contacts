---
name: api-rate-limiter
description: Handles rate limits, quota errors, and 502s when batch updating Google APIs in Node.js using sleep and backoff strategies.
---
# API Rate Limiter

When making bulk updates to Google APIs (like People API), you must respect quotas and handle temporary server errors.

## Implementation Pattern
```javascript
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let count = 0;
for (const item of items) {
  let retries = 3;
  while (retries > 0) {
    try {
      await api.update(item);
      count++;
      // Sleep slightly between every request
      await sleep(500); 
      // Sleep longer after a batch
      if (count % 50 === 0) await sleep(3000);
      break;
    } catch (err) {
      if (err.message && (err.message.includes('Quota') || err.message.includes('502'))) {
        retries--;
        await sleep(10000); // 10s backoff
      } else {
        throw err;
      }
    }
  }
}
```