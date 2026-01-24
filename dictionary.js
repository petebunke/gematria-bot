/**
 * Dictionary Module
 *
 * Fetches word definitions from Free Dictionary API
 */

const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

async function getDefinition(word) {
    try {
        const response = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word.toLowerCase())}`);

        if (!response.ok) {
            return { word, found: false };
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            return { word, found: false };
        }

        const entry = data[0];
        const meanings = entry.meanings || [];

        if (meanings.length === 0) {
            return { word, found: false };
        }

        // Get the first meaning with a definition
        const meaning = meanings[0];
        const definitions = meaning.definitions || [];

        if (definitions.length === 0) {
            return { word, found: false };
        }

        return {
            word,
            found: true,
            partOfSpeech: meaning.partOfSpeech || 'unknown',
            definition: definitions[0].definition || ''
        };

    } catch (error) {
        console.error(`Dictionary error for "${word}":`, error.message);
        return { word, found: false };
    }
}

async function getDefinitions(words) {
    const results = [];

    for (const word of words) {
        // Skip very short words and common articles/prepositions
        const skipWords = ['a', 'an', 'the', 'is', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'or', 'and', 'but', 'not', 'no', 'be', 'am', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'it', 'its', 'as', 'if', 'so', 'up', 'out', 'he', 'she', 'we', 'they', 'you', 'i', 'my', 'me', 'his', 'her', 'our', 'your', 'this', 'that', 'these', 'those', 'ar', 'ac'];

        if (word.length < 2 || skipWords.includes(word.toLowerCase())) {
            continue;
        }

        const def = await getDefinition(word);
        if (def.found) {
            results.push(def);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}

module.exports = { getDefinition, getDefinitions };

// Test if run directly
if (require.main === module) {
    getDefinitions(['highs', 'cats', 'test']).then(results => {
        console.log('Definitions:', JSON.stringify(results, null, 2));
    });
}
