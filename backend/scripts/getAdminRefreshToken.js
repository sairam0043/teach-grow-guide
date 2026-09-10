// Helper script to get Google OAuth refresh token for Admin Calendar
// Usage: node backend/scripts/getAdminRefreshToken.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const readline = require('readline');
const { google } = require('googleapis');

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
// Use the configured redirect URI or fallback
const redirectURI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/google-callback';

if (!clientID || !clientSecret) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in backend/.env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientID,
  clientSecret,
  redirectURI
);

const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // Forces Google to provide a refresh token
  scope: scopes
});

console.log('\n================================================================');
console.log('GOOGLE OAUTH ADMIN REFRESH TOKEN GENERATOR');
console.log('================================================================');
console.log('1. Open the following URL in your browser to sign in as cuvasoltpl@gmail.com:');
console.log('\n' + authUrl + '\n');
console.log('2. After approving permissions, you will be redirected.');
console.log('   The page might fail to load if your app is not running, but that is OK.');
console.log('3. Look at the browser address bar, copy the "code" query parameter value.');
console.log('   Example: If the URL is http://localhost:8080/google-callback?code=4/0AdQt8q...&scope=...');
console.log('   Copy everything starting from "4/" up to the next "&" character.');
console.log('================================================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Please paste the authorization code here: ', async (code) => {
  rl.close();
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    console.error('Error: Code cannot be empty.');
    process.exit(1);
  }

  try {
    console.log('\nExchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(trimmedCode);
    
    if (!tokens.refresh_token) {
      console.warn('\n⚠️  WARNING: No refresh_token returned!');
      console.warn('Google only returns a refresh token the FIRST time you consent.');
      console.warn('To fix this, go to your Google Account security settings, remove access for this app, and run this script again.');
    } else {
      console.log('\nSUCCESS! Copy the following Refresh Token and add it to backend/.env:\n');
      console.log(`ADMIN_GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\nAnd set the admin email:\n');
      console.log(`ADMIN_EMAIL=cuvasoltpl@gmail.com`);
    }
  } catch (error) {
    console.error('\nError exchanging code for tokens:', error.message);
    process.exit(1);
  }
});
