/**
 * scheduler.js - Determines which channels to post to based on current date/time
 *
 * Intervals:
 * - reply: manual/on-demand only
 * - daily: every day
 * - weekly: every Sunday
 * - monthly: 1st of each month
 * - seasonal: Mar 20, Jun 21, Sep 22, Dec 21 (equinoxes/solstices)
 * - yearly: January 1st
 * - decadic: January 1st of years ending in 0 (2020, 2030, etc.)
 */

require('dotenv').config();
const { postToDiscord, getConfiguredChannels } = require('./discord');
const { getGematriaPhrase } = require('./scraper');

// Seasonal dates (approximate equinoxes and solstices)
const SEASONAL_DATES = [
    { month: 3, day: 20 },  // Spring equinox
    { month: 6, day: 21 },  // Summer solstice
    { month: 9, day: 22 },  // Fall equinox
    { month: 12, day: 21 }  // Winter solstice
];

/**
 * Check which channels should post today
 */
function getChannelsToPost(date = new Date()) {
    const channels = [];
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();

    // Daily - always posts
    channels.push('daily');

    // Weekly - Sundays
    if (dayOfWeek === 0) {
        channels.push('weekly');
    }

    // Monthly - 1st of month
    if (dayOfMonth === 1) {
        channels.push('monthly');
    }

    // Seasonal - equinoxes and solstices
    const isSeasonal = SEASONAL_DATES.some(d => d.month === month && d.day === dayOfMonth);
    if (isSeasonal) {
        channels.push('seasonal');
    }

    // Yearly - January 1st
    if (month === 1 && dayOfMonth === 1) {
        channels.push('yearly');
    }

    // Decadic - January 1st of years ending in 0
    if (month === 1 && dayOfMonth === 1 && year % 10 === 0) {
        channels.push('decadic');
    }

    return channels;
}

/**
 * Format message for a specific channel
 */
function formatMessage(channel, gematriaData) {
    const { phrase, value } = gematriaData;

    if (!phrase || !value) {
        return `🔢 Gematria Bot is running! Configure the scraper to start posting real content.`;
    }

    const prefixes = {
        reply: '🔢 Reply Gematria',
        daily: '🔢 Daily Gematria',
        weekly: '🔢 Weekly Gematria',
        monthly: '🔢 Monthly Gematria',
        seasonal: '🔢 Seasonal Gematria',
        yearly: '🔢 Yearly Gematria',
        decadic: '🔢 Decadic Gematria'
    };

    return `${prefixes[channel] || '🔢 Gematria'}

"${phrase}"

= ${value}

#gematria #numerology`;
}

/**
 * Run the scheduler - posts to all channels that should post today
 */
async function runScheduler(options = {}) {
    const forceChannels = options.channels || null; // Override: post to specific channels
    const date = options.date || new Date();

    console.log('═══════════════════════════════════════════');
    console.log('    🔢 Gematria Scheduler');
    console.log('═══════════════════════════════════════════\n');
    console.log(`📅 Date: ${date.toDateString()}\n`);

    // Determine which channels to post to
    const channelsToPost = forceChannels || getChannelsToPost(date);
    console.log('📋 Channels to post today:', channelsToPost.join(', ') || 'none');

    // Show configured channels
    const configured = getConfiguredChannels();
    console.log('✅ Configured webhooks:', configured.map(c => c.name).join(', ') || 'none');
    console.log('');

    if (channelsToPost.length === 0) {
        console.log('No channels scheduled for today.');
        return { posted: [] };
    }

    // Get gematria data
    console.log('📡 Fetching gematria phrase...');
    let gematriaData;
    try {
        gematriaData = await getGematriaPhrase();
        console.log('   Got:', gematriaData.phrase ? `"${gematriaData.phrase}" = ${gematriaData.value}` : '(scraper needs configuration)');
    } catch (err) {
        console.log('   ⚠️  Scraper error:', err.message);
        gematriaData = { phrase: null, value: null };
    }

    // Post to each scheduled channel
    console.log('\n📤 Posting to channels...\n');
    const results = {};

    for (const channel of channelsToPost) {
        const message = formatMessage(channel, gematriaData);
        results[channel] = await postToDiscord(channel, message, {
            embed: {
                title: `🔢 ${channel.charAt(0).toUpperCase() + channel.slice(1)} Gematria`,
                description: message,
                color: 0x9B59B6
            }
        });
    }

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('    📊 Results');
    console.log('═══════════════════════════════════════════');

    const posted = [];
    const failed = [];

    Object.entries(results).forEach(([channel, result]) => {
        if (result.success) {
            posted.push(channel);
            console.log(`   ✅ ${channel}`);
        } else {
            failed.push({ channel, error: result.error });
            console.log(`   ❌ ${channel}: ${result.error}`);
        }
    });

    console.log(`\n   Posted: ${posted.length}, Failed: ${failed.length}`);
    console.log('\n✨ Done!\n');

    return { posted, failed, results };
}

/**
 * Post to a specific channel manually (for reply or testing)
 */
async function postToChannel(channel) {
    console.log(`📤 Manual post to ${channel}...\n`);

    let gematriaData;
    try {
        gematriaData = await getGematriaPhrase();
    } catch (err) {
        gematriaData = { phrase: null, value: null };
    }

    const message = formatMessage(channel, gematriaData);
    return postToDiscord(channel, message, {
        embed: {
            title: `🔢 ${channel.charAt(0).toUpperCase() + channel.slice(1)} Gematria`,
            description: message,
            color: 0x9B59B6
        }
    });
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: node scheduler.js [options]

Options:
  --channel <name>   Post to a specific channel (reply, daily, weekly, monthly, seasonal, yearly, decadic)
  --all              Post to all configured channels
  --check            Just show what would be posted today (no actual posting)
  --help             Show this help

Examples:
  node scheduler.js              # Run scheduled posts for today
  node scheduler.js --channel daily    # Post only to daily channel
  node scheduler.js --all              # Post to all channels
  node scheduler.js --check            # Show what would post today
`);
        process.exit(0);
    }

    if (args.includes('--check')) {
        const channels = getChannelsToPost();
        console.log('Channels scheduled for today:', channels.join(', ') || 'none');
        console.log('Configured:', getConfiguredChannels().map(c => c.name).join(', ') || 'none');
        process.exit(0);
    }

    const channelIndex = args.indexOf('--channel');
    if (channelIndex !== -1 && args[channelIndex + 1]) {
        postToChannel(args[channelIndex + 1])
            .then(result => {
                process.exit(result.success ? 0 : 1);
            });
    } else if (args.includes('--all')) {
        runScheduler({ channels: ['daily', 'weekly', 'monthly', 'seasonal', 'yearly', 'decadic'] })
            .then(() => process.exit(0))
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    } else {
        runScheduler()
            .then(() => process.exit(0))
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    }
}

module.exports = { runScheduler, postToChannel, getChannelsToPost, formatMessage };
