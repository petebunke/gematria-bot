/**
 * test-webhooks.js - Test all Discord webhooks
 * Run with: node test-webhooks.js
 */

const {
    postToDiscordWeekly,
    postToDiscordMonthly,
    postToDiscordSeasonal,
    postToDiscordYearly
} = require('./discord.js');

const testData = {
    phrase: 'Test phrase',
    definitions: [
        'English: 1111',
        'Hebrew: 666',
        'Simple: 111',
        'Reduced: 99'
    ]
};

async function testAllWebhooks() {
    console.log('Testing all Discord webhooks...\n');

    const results = await Promise.all([
        postToDiscordWeekly(testData),
        postToDiscordMonthly(testData),
        postToDiscordSeasonal(testData),
        postToDiscordYearly(testData)
    ]);

    console.log('\n=== Results ===');
    console.log('Weekly:', results[0]);
    console.log('Monthly:', results[1]);
    console.log('Seasonal:', results[2]);
    console.log('Yearly:', results[3]);
}

testAllWebhooks();
