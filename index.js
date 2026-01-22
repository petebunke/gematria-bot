/**
 * Gematria Phrase Poster
 * 
 * Generates a gematria phrase from gematriagenerator.app
 * and posts it to your configured social media platforms.
 */

require('dotenv').config();

const { getGematriaPhrase } = require('./src/scraper');
const { postToBluesky } = require('./src/platforms/bluesky');
const { postToMastodon } = require('./src/platforms/mastodon');
const { postToDiscord } = require('./src/platforms/discord');
const { postToTelegram } = require('./src/platforms/telegram');
const { postToFacebook } = require('./src/platforms/facebook');

// Configure which platforms to post to
const ENABLED_PLATFORMS = {
    bluesky: !!process.env.BLUESKY_HANDLE,
    mastodon: !!process.env.MASTODON_ACCESS_TOKEN,
    discord: !!process.env.DISCORD_WEBHOOK_URL,
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
    facebook: !!process.env.FACEBOOK_ACCESS_TOKEN
};

async function formatMessage(gematriaData) {
    // Customize your message format here
    const { phrase, value } = gematriaData;
    
    if (!phrase || !value) {
        // Fallback for testing when scraper isn't configured yet
        return `🔢 Gematria Phrase Poster is running! Configure the scraper to start posting real content.`;
    }

    return `🔢 Today's Gematria

"${phrase}"

= ${value}

#gematria #numerology`;
}

async function run() {
    console.log('═══════════════════════════════════════════');
    console.log('    🔢 Gematria Phrase Poster');
    console.log('═══════════════════════════════════════════\n');

    // Show which platforms are configured
    console.log('📋 Configured platforms:');
    Object.entries(ENABLED_PLATFORMS).forEach(([platform, enabled]) => {
        console.log(`   ${enabled ? '✅' : '⬜'} ${platform}`);
    });
    console.log('');

    // Step 1: Get gematria phrase
    console.log('📡 Step 1: Fetching gematria phrase...');
    let gematriaData;
    try {
        gematriaData = await getGematriaPhrase();
        console.log('   Got:', gematriaData.phrase ? `"${gematriaData.phrase}" = ${gematriaData.value}` : '(scraper needs configuration)');
    } catch (err) {
        console.log('   ⚠️  Scraper error:', err.message);
        gematriaData = { phrase: null, value: null };
    }

    // Step 2: Format the message
    console.log('\n📝 Step 2: Formatting message...');
    const message = await formatMessage(gematriaData);
    console.log('   Message preview:', message.substring(0, 100) + '...');

    // Step 3: Post to all enabled platforms
    console.log('\n📤 Step 3: Posting to platforms...\n');
    
    const results = {};

    if (ENABLED_PLATFORMS.bluesky) {
        console.log('→ Bluesky...');
        results.bluesky = await postToBluesky(message);
    }

    if (ENABLED_PLATFORMS.mastodon) {
        console.log('→ Mastodon...');
        results.mastodon = await postToMastodon(message);
    }

    if (ENABLED_PLATFORMS.discord) {
        console.log('→ Discord...');
        results.discord = await postToDiscord(message, {
            embed: {
                title: '🔢 Daily Gematria',
                description: message
            }
        });
    }

    if (ENABLED_PLATFORMS.telegram) {
        console.log('→ Telegram...');
        results.telegram = await postToTelegram(message.replace(/\n/g, '\n'));
    }

    if (ENABLED_PLATFORMS.facebook) {
        console.log('→ Facebook...');
        results.facebook = await postToFacebook(message);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('    📊 Results Summary');
    console.log('═══════════════════════════════════════════');
    
    let successCount = 0;
    let failCount = 0;
    
    Object.entries(results).forEach(([platform, result]) => {
        if (result.success) {
            successCount++;
            console.log(`   ✅ ${platform}`);
        } else {
            failCount++;
            console.log(`   ❌ ${platform}: ${result.error}`);
        }
    });

    if (Object.keys(results).length === 0) {
        console.log('   ⚠️  No platforms configured. Check your .env file.');
    } else {
        console.log(`\n   Total: ${successCount} succeeded, ${failCount} failed`);
    }

    console.log('\n✨ Done!\n');
    return results;
}

// Run
run().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
