/**
 * mastodon.js - Post to Mastodon (100% FREE, no approval needed)
 * 
 * SETUP:
 * 1. Log into your Mastodon instance (e.g., mastodon.social)
 * 2. Go to Preferences → Development → New Application
 * 3. Give it a name, check "write:statuses" permission
 * 4. Click Submit, then click your app name
 * 5. Copy "Your access token" to your .env file
 * 
 * That's it! Works with any Mastodon instance.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const MASTODON_INSTANCE = process.env.MASTODON_INSTANCE;     // e.g., "https://mastodon.social"
const MASTODON_ACCESS_TOKEN = process.env.MASTODON_ACCESS_TOKEN;

async function postToMastodon(text) {
    if (!MASTODON_INSTANCE || !MASTODON_ACCESS_TOKEN) {
        console.log('⚠️  Mastodon credentials not configured. Skipping.');
        return { success: false, error: 'Missing credentials' };
    }

    try {
        // Clean up instance URL
        const baseUrl = MASTODON_INSTANCE.replace(/\/$/, '');

        const response = await fetch(`${baseUrl}/api/v1/statuses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MASTODON_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: text,
                visibility: 'public'  // or 'unlisted', 'private', 'direct'
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Post failed: ${err}`);
        }

        const result = await response.json();
        console.log('✅ Mastodon: Posted successfully!');
        console.log('   URL:', result.url);

        return { success: true, id: result.id, url: result.url };

    } catch (error) {
        console.error('❌ Mastodon error:', error.message);
        return { success: false, error: error.message };
    }
}

// Test if run directly
if (require.main === module) {
    const testMessage = `🔢 Test post from Gematria Poster - ${new Date().toLocaleString()}`;
    postToMastodon(testMessage).then(console.log);
}

module.exports = { postToMastodon };
