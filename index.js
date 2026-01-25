/**
 * Gematria Phrase Poster
 *
 * Generates a gematria phrase from gematriagenerator.app
 * and posts it to Discord channels on scheduled intervals.
 *
 * Usage:
 *   node index.js              # Run scheduled posts for today
 *   node index.js --channel daily   # Post to specific channel
 *   node index.js --all             # Post to all channels
 *   node index.js --check           # Show what would post today
 */

const { runScheduler } = require('./scheduler');

// Pass CLI args to scheduler
runScheduler().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
