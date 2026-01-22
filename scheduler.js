/**
 * scheduler.js - Scheduled posting for all Discord channels
 *
 * Schedules:
 * - Nonstop: Every 30 minutes
 * - Daily: Every day at 9:00 AM
 * - Weekly: Mondays at 9:00 AM
 * - Monthly: 1st of every month at 9:00 AM
 * - Seasonal: Start of each season (Mar 20, Jun 21, Sep 22, Dec 21) at 9:00 AM
 * - Yearly: January 1st at 9:00 AM
 *
 * Usage:
 *   npm run scheduler
 *
 * Or with cron (run this script as a daemon):
 *   node scheduler.js
 */

require('dotenv').config();
const cron = require('node-cron');
const { getGematriaPhrase } = require('./scraper');
const {
    postToDiscordNonstop,
    postToDiscordDaily,
    postToDiscordWeekly,
    postToDiscordMonthly,
    postToDiscordSeasonal,
    postToDiscordYearly
} = require('./discord');

/**
 * Get gematria data and post to the specified channel
 */
async function fetchAndPost(postFunction, label) {
    console.log(`\n[${new Date().toISOString()}] Starting ${label} post...`);

    try {
        const gematriaData = await getGematriaPhrase();

        if (!gematriaData.phrase) {
            console.log(`⚠️  No phrase data available for ${label} post`);
            return;
        }

        const result = await postFunction(gematriaData);

        if (result.success) {
            console.log(`✅ ${label} post completed successfully`);
        } else {
            console.log(`❌ ${label} post failed: ${result.error}`);
        }
    } catch (error) {
        console.error(`❌ Error during ${label} post:`, error.message);
    }
}

/**
 * Check if today is a seasonal start date
 */
function isSeasonStart() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    // Season start dates (approximate)
    const seasonStarts = [
        { month: 2, day: 20 },   // Spring: March 20
        { month: 5, day: 21 },   // Summer: June 21
        { month: 8, day: 22 },   // Autumn: September 22
        { month: 11, day: 21 }   // Winter: December 21
    ];

    return seasonStarts.some(s => s.month === month && s.day === day);
}

console.log('═══════════════════════════════════════════');
console.log('    Gematria Discord Scheduler');
console.log('═══════════════════════════════════════════\n');
console.log('Scheduled posts:');
console.log('  Nonstop:   Every 30 minutes');
console.log('  Daily:     Every day at 9:00 AM');
console.log('  Weekly:    Every Monday at 9:00 AM');
console.log('  Monthly:   1st of every month at 9:00 AM');
console.log('  Seasonal:  Mar 20, Jun 21, Sep 22, Dec 21 at 9:00 AM');
console.log('  Yearly:    January 1st at 9:00 AM');
console.log('\nScheduler started. Waiting for scheduled times...\n');

// Nonstop: Every 30 minutes
cron.schedule('*/30 * * * *', () => {
    fetchAndPost(postToDiscordNonstop, 'Nonstop');
}, {
    timezone: 'America/New_York'
});

// Daily: Every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
    fetchAndPost(postToDiscordDaily, 'Daily');
}, {
    timezone: 'America/New_York'
});

// Weekly: Every Monday at 9:00 AM
// Cron format: minute hour day-of-month month day-of-week
cron.schedule('0 9 * * 1', () => {
    fetchAndPost(postToDiscordWeekly, 'Weekly');
}, {
    timezone: 'America/New_York'
});

// Monthly: 1st of every month at 9:00 AM
cron.schedule('0 9 1 * *', () => {
    fetchAndPost(postToDiscordMonthly, 'Monthly');
}, {
    timezone: 'America/New_York'
});

// Seasonal: Check daily at 9:00 AM if it's a season start
cron.schedule('0 9 * * *', () => {
    if (isSeasonStart()) {
        fetchAndPost(postToDiscordSeasonal, 'Seasonal');
    }
}, {
    timezone: 'America/New_York'
});

// Yearly: January 1st at 9:00 AM
cron.schedule('0 9 1 1 *', () => {
    fetchAndPost(postToDiscordYearly, 'Yearly');
}, {
    timezone: 'America/New_York'
});

// Keep the process running
process.on('SIGINT', () => {
    console.log('\n\nScheduler stopped.');
    process.exit(0);
});

// Optional: Test run on startup (uncomment to test)
// fetchAndPost(postToDiscordWeekly, 'Weekly (Test)');
