/**
 * bluesky.js - Post to Bluesky (100% FREE, no approval needed)
 * 
 * SETUP:
 * 1. Create a Bluesky account at https://bsky.app
 * 2. Go to Settings → App Passwords → Add App Password
 * 3. Copy the generated password to your .env file
 * 
 * That's it! No developer approval, no waiting.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;      // e.g., "yourname.bsky.social"
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

async function postToBluesky(text) {
    if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
        console.log('⚠️  Bluesky credentials not configured. Skipping.');
        return { success: false, error: 'Missing credentials' };
    }

    try {
        // Step 1: Create a session (login)
        const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: BLUESKY_HANDLE,
                password: BLUESKY_APP_PASSWORD
            })
        });

        if (!sessionResponse.ok) {
            const err = await sessionResponse.text();
            throw new Error(`Login failed: ${err}`);
        }

        const session = await sessionResponse.json();
        console.log('🔑 Bluesky: Logged in as', session.handle);

        // Step 2: Create the post
        const postResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.accessJwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                repo: session.did,
                collection: 'app.bsky.feed.post',
                record: {
                    text: text,
                    createdAt: new Date().toISOString()
                }
            })
        });

        if (!postResponse.ok) {
            const err = await postResponse.text();
            throw new Error(`Post failed: ${err}`);
        }

        const result = await postResponse.json();
        console.log('✅ Bluesky: Posted successfully!');
        console.log('   URI:', result.uri);

        return { success: true, uri: result.uri, cid: result.cid };

    } catch (error) {
        console.error('❌ Bluesky error:', error.message);
        return { success: false, error: error.message };
    }
}

// Test if run directly
if (require.main === module) {
    const testMessage = `🔢 Test post from Gematria Poster - ${new Date().toLocaleString()}`;
    postToBluesky(testMessage).then(console.log);
}

module.exports = { postToBluesky };
