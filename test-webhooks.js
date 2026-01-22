/**
 * test-webhooks.js - Test all Discord webhooks with real scraped data
 * Run with: node test-webhooks.js
 */

const { getGematriaPhrase } = require('./scraper');
const {
    postToDiscord,
    postToDiscordWeekly,
    postToDiscordMonthly,
    postToDiscordSeasonal,
    postToDiscordYearly
} = require('./discord');

async function testAllWebhooks() {
    console.log('🔢 Fetching gematria phrase...\n');

    try {
        const gematriaData = await getGematriaPhrase();

        console.log('Scraped data:', gematriaData);
        console.log('\n--- Posting to all webhooks ---\n');

        // Post to all channels
        const results = await Promise.all([
            postToDiscord(gematriaData.phrase || 'Test', {
                embed: {
                    title: '🔢 Daily Gematria',
                    description: gematriaData.phrase
                }
            }),
            postToDiscordWeekly(gematriaData),
            postToDiscordMonthly(gematriaData),
            postToDiscordSeasonal(gematriaData),
            postToDiscordYearly(gematriaData)
        ]);

        console.log('\n=== Results ===');
        console.log('Daily:', results[0]);
        console.log('Weekly:', results[1]);
        console.log('Monthly:', results[2]);
        console.log('Seasonal:', results[3]);
        console.log('Yearly:', results[4]);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAllWebhooks();
