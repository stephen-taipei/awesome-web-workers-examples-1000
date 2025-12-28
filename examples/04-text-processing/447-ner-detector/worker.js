// Simple rule-based NER detector
const persons = new Set(['steve', 'jobs', 'bill', 'gates', 'elon', 'musk', 'jeff', 'bezos', 'mark', 'zuckerberg', 'satya', 'nadella', 'tim', 'cook', 'sundar', 'pichai', 'larry', 'page', 'sergey', 'brin']);
const orgs = new Set(['apple', 'microsoft', 'google', 'amazon', 'facebook', 'meta', 'tesla', 'twitter', 'netflix', 'uber', 'airbnb', 'spotify', 'adobe', 'oracle', 'ibm', 'intel', 'nvidia', 'amd', 'samsung', 'sony']);
const locations = new Set(['california', 'seattle', 'new york', 'san francisco', 'cupertino', 'palo alto', 'mountain view', 'austin', 'boston', 'chicago', 'los angeles', 'london', 'paris', 'tokyo', 'beijing', 'shanghai', 'berlin', 'munich', 'sydney', 'singapore']);
const orgSuffixes = ['inc', 'inc.', 'corp', 'corp.', 'llc', 'ltd', 'co', 'co.', 'company', 'corporation', 'technologies', 'solutions'];

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'DETECT') detect(payload.text);
};

function detect(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Detecting entities...' } });

    const entities = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[.,!?;:'"()]/g, '');
        const lower = word.toLowerCase();
        const nextWord = words[i + 1]?.replace(/[.,!?;:'"()]/g, '').toLowerCase() || '';

        // Check for organization suffixes
        if (orgSuffixes.includes(nextWord) && /^[A-Z]/.test(word)) {
            entities.push({ text: word + ' ' + words[i + 1].replace(/[.,!?;:'"()]/g, ''), type: 'ORG' });
            i++;
            continue;
        }

        // Check known entities
        if (orgs.has(lower)) {
            entities.push({ text: word, type: 'ORG' });
        } else if (persons.has(lower)) {
            // Check for full name
            if (words[i + 1] && persons.has(words[i + 1].toLowerCase().replace(/[.,!?;:'"()]/g, ''))) {
                entities.push({ text: word + ' ' + words[i + 1].replace(/[.,!?;:'"()]/g, ''), type: 'PERSON' });
                i++;
            } else {
                entities.push({ text: word, type: 'PERSON' });
            }
        } else if (locations.has(lower)) {
            entities.push({ text: word, type: 'LOC' });
        } else if (/^[A-Z][a-z]+$/.test(word) && i > 0) {
            // Capitalized word might be entity - check context
            const prevWord = words[i - 1].toLowerCase();
            if (['in', 'at', 'from', 'to', 'near'].includes(prevWord)) {
                entities.push({ text: word, type: 'LOC' });
            } else if (['mr', 'ms', 'mrs', 'dr', 'ceo', 'cto', 'cfo', 'president', 'founder'].includes(prevWord)) {
                entities.push({ text: word, type: 'PERSON' });
            }
        }

        // Date patterns
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(word) || /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i.test(word)) {
            entities.push({ text: word, type: 'DATE' });
        }

        // Money patterns
        if (/^\$[\d,]+(\.\d{2})?$/.test(word) || /^[\d,]+\s*(dollars|usd|eur|gbp)$/i.test(word)) {
            entities.push({ text: word, type: 'MONEY' });
        }
    }

    // Create highlighted text
    let highlighted = text;
    const colors = { PERSON: '#e91e63', ORG: '#2196f3', LOC: '#4caf50', DATE: '#ff9800', MONEY: '#9c27b0' };
    entities.forEach(e => {
        const regex = new RegExp('\\b' + e.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        highlighted = highlighted.replace(regex, `<mark style="background:${colors[e.type]}33;padding:2px 4px;border-radius:2px">${e.text}</mark>`);
    });

    self.postMessage({
        type: 'RESULT',
        payload: { entities, highlighted, duration: performance.now() - startTime }
    });
}
