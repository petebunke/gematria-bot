/**
 * test-webhooks.js - Test all Discord webhooks with real scraped data
 * Run with: node test-webhooks.js
 */

const { getGematriaPhrase } = require('./scraper');
const {
    postToDiscordDaily,
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

        // Post to all channels sequentially to see each result
        console.log('Posting to Daily...');
        const daily = await postToDiscordDaily(gematriaData);
        console.log('Daily result:', daily);

        console.log('\nPosting to Weekly...');
        const weekly = await postToDiscordWeekly(gematriaData);
        console.log('Weekly result:', weekly);

        console.log('\nPosting to Monthly...');
        const monthly = await postToDiscordMonthly(gematriaData);
        console.log('Monthly result:', monthly);

        console.log('\nPosting to Seasonal...');
        const seasonal = await postToDiscordSeasonal(gematriaData);
        console.log('Seasonal result:', seasonal);

        console.log('\nPosting to Yearly...');
        const yearly = await postToDiscordYearly(gematriaData);
        console.log('Yearly result:', yearly);

        console.log('\n=== Summary ===');
        console.log('Daily:', daily.success ? '✅' : '❌');
        console.log('Weekly:', weekly.success ? '✅' : '❌');
        console.log('Monthly:', monthly.success ? '✅' : '❌');
        console.log('Seasonal:', seasonal.success ? '✅' : '❌');
        console.log('Yearly:', yearly.success ? '✅' : '❌');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAllWebhooks();
