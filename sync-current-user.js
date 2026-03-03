#!/usr/bin/env node

/**
 * One-time user sync script
 * Usage: node sync-current-user.js "your-jwt-token"
 */

const https = require('https');

const token = process.argv[2];

if (!token) {
  console.error('❌ Error: JWT token required');
  console.log('\nUsage:');
  console.log('  node sync-current-user.js "your-jwt-token"\n');
  console.log('To get your JWT token:');
  console.log('  1. Sign in at https://interview-king.taobowen.com');
  console.log('  2. Open DevTools → Application → Cookies');
  console.log('  3. Find amplify access token');
  console.log('  4. Or check Local Storage for tokens\n');
  process.exit(1);
}

const postData = JSON.stringify({});

const options = {
  hostname: 'interview-king.taobowen.com',
  port: 443,
  path: '/api/users/sync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Content-Length': postData.length,
  },
};

console.log('Syncing user to database...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ User synced successfully!\n');
      console.log(JSON.stringify(response, null, 2));
      console.log('\nYou can now use the application API endpoints.');
    } else {
      console.log('❌ Sync failed\n');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
