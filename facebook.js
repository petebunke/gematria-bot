/**
 * facebook.js - Post to Facebook Page (requires developer app)
 * 
 * SETUP (more involved than other platforms):
 * 1. Go to https://developers.facebook.com/
 * 2. Create an app (choose "Business" or "None" type)
 * 3. Add "Facebook Login" product
 * 4. Go to Tools → Graph API Explorer
 * 5. Select your app
 * 6. Add permissions: pages_manage_posts, pages_read_engagement
 * 7. Generate User Access Token
 * 8. Exchange for Page Access Token:
 *    - Call: GET /me/accounts with user token
 *    - Find your page and copy its access_token
 * 9. Get your Page ID from your Facebook Page → About
 * 
 * NOTE: You can only post to Pages you manage, NOT personal profiles.
 * NOTE: Page tokens expire - you may need to generate long-lived tokens.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

async function postToFacebook(text, options = {}) {
    if (!FACEBOOK_PAGE_ID || !FACEBOOK_ACCESS_TOKEN) {
        console.log('⚠️  Facebook credentials not configured. Skipping.');
        return { success: false, error: 'Missing credentials' };
    }

    try {
        const apiUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/feed`;

        const payload = {
            message: text,
            access_token: FACEBOOK_ACCESS_TOKEN
        };

        // Optional: Add a link
        if (options.link) {
            payload.link = options.link;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(`Facebook API error: ${result.error.message}`);
        }

        console.log('✅ Facebook: Posted successfully!');
        console.log('   Post ID:', result.id);

        return { success: true, postId: result.id };

    } catch (error) {
        console.error('❌ Facebook error:', error.message);
        return { success: false, error: error.message };
    }
}

// Test if run directly
if (require.main === module) {
    const testMessage = `🔢 Test post from Gematria Poster - ${new Date().toLocaleString()}`;
    postToFacebook(testMessage).then(console.log);
}

module.exports = { postToFacebook };
