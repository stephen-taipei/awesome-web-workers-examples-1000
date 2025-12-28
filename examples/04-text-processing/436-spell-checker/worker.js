// Simple dictionary of common words
const dictionary = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'this', 'that', 'these', 'those', 'it', 'its', 'of', 'to', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like', 'through',
    'after', 'over', 'between', 'out', 'against', 'during', 'without', 'before',
    'under', 'around', 'among', 'and', 'but', 'or', 'not', 'no', 'yes',
    'hello', 'world', 'test', 'spell', 'checker', 'find', 'misspelled', 'words',
    'simple', 'example', 'text', 'check', 'spelling', 'should'
]);

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CHECK') checkSpelling(payload.text);
};

function checkSpelling(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Checking...' } });

    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    const misspelled = [];
    let highlighted = text;

    for (const word of words) {
        if (!dictionary.has(word.toLowerCase())) {
            misspelled.push(word);
        }
    }

    // Highlight misspelled words
    for (const word of misspelled) {
        const regex = new RegExp('\\b' + word + '\\b', 'g');
        highlighted = highlighted.replace(regex, `<span style="color:#f44336;text-decoration:underline wavy red">${word}</span>`);
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            highlighted,
            duration: performance.now() - startTime,
            stats: { misspelled: misspelled.length }
        }
    });
}
