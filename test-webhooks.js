/**
 * test-webhooks.js - Test all Discord webhooks
 * Run with: node test-webhooks.js
 */

const {
    postToDiscordDaily,
    postToDiscordWeekly,
    postToDiscordMonthly,
    postToDiscordSeasonal,
    postToDiscordYearly
} = require('./discord');

// Test data (use this instead of scraper for testing webhooks)
const testData = {
    phrase: 'test phrase (1111/666/111/55)',
    definitions: [
        'English: 1111',
        'Hebrew: 666',
        'Simple: 111',
        'Reduced: 55'
    ]
};

async function testAllWebhooks() {
    console.log('🔢 Testing all Discord webhooks...\n');
    console.log('Test data:', testData);
    console.log('\n--- Posting to all webhooks ---\n');

    // Post to all channels sequentially
    console.log('1. Posting to Daily...');
    const daily = await postToDiscordDaily(testData);
    console.log('   Result:', daily);

    console.log('\n2. Posting to Weekly...');
    const weekly = await postToDiscordWeekly(testData);
    console.log('   Result:', weekly);

    console.log('\n3. Posting to Monthly...');
    const monthly = await postToDiscordMonthly(testData);
    console.log('   Result:', monthly);

    console.log('\n4. Posting to Seasonal...');
    const seasonal = await postToDiscordSeasonal(testData);
    console.log('   Result:', seasonal);

    console.log('\n5. Posting to Yearly...');
    const yearly = await postToDiscordYearly(testData);
    console.log('   Result:', yearly);

    console.log('\n=== Summary ===');
    console.log('Daily:', daily.success ? '✅' : '❌', daily.error || '');
    console.log('Weekly:', weekly.success ? '✅' : '❌', weekly.error || '');
    console.log('Monthly:', monthly.success ? '✅' : '❌', monthly.error || '');
    console.log('Seasonal:', seasonal.success ? '✅' : '❌', seasonal.error || '');
    console.log('Yearly:', yearly.success ? '✅' : '❌', yearly.error || '');
}

testAllWebhooks();
