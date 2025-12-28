// Simple rule-based POS tagger
const determiners = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'some', 'any', 'no', 'every', 'each', 'all', 'both', 'few', 'many', 'much', 'most', 'other']);
const pronouns = new Set(['i', 'me', 'you', 'he', 'him', 'she', 'her', 'it', 'we', 'us', 'they', 'them', 'who', 'whom', 'what', 'which', 'that', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves']);
const prepositions = new Set(['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'over', 'near', 'behind', 'beside']);
const conjunctions = new Set(['and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'although', 'because', 'since', 'unless', 'while', 'if', 'when', 'where', 'as', 'than', 'that']);
const verbs = new Set(['is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'go', 'goes', 'went', 'gone', 'going', 'get', 'gets', 'got', 'make', 'makes', 'made', 'know', 'knows', 'knew', 'take', 'takes', 'took', 'see', 'sees', 'saw', 'come', 'comes', 'came', 'think', 'thinks', 'thought', 'look', 'looks', 'looked', 'want', 'wants', 'wanted', 'give', 'gives', 'gave', 'use', 'uses', 'used', 'find', 'finds', 'found', 'tell', 'tells', 'told', 'ask', 'asks', 'asked', 'work', 'works', 'worked', 'seem', 'seems', 'seemed', 'feel', 'feels', 'felt', 'try', 'tries', 'tried', 'leave', 'leaves', 'left', 'call', 'calls', 'called', 'jumps', 'jump', 'jumped']);

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'TAG') tag(payload.text);
};

function tag(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Tagging...' } });

    const words = text.match(/\w+|[^\w\s]/g) || [];
    const tags = words.map((word, i) => {
        const w = word.toLowerCase();

        if (/[^\w]/.test(word)) return { word, tag: 'PUNCT' };
        if (determiners.has(w)) return { word, tag: 'DET' };
        if (pronouns.has(w)) return { word, tag: 'PRON' };
        if (prepositions.has(w)) return { word, tag: 'PREP' };
        if (conjunctions.has(w)) return { word, tag: 'CONJ' };
        if (verbs.has(w)) return { word, tag: 'VERB' };
        if (w.endsWith('ly')) return { word, tag: 'ADV' };
        if (w.endsWith('ing') || w.endsWith('ed') || w.endsWith('es') || w.endsWith('s') && verbs.has(w.slice(0, -1))) return { word, tag: 'VERB' };
        if (w.endsWith('ful') || w.endsWith('ous') || w.endsWith('ive') || w.endsWith('ish') || w.endsWith('able') || w.endsWith('ible')) return { word, tag: 'ADJ' };
        if (i > 0 && (words[i-1].toLowerCase() === 'the' || words[i-1].toLowerCase() === 'a' || words[i-1].toLowerCase() === 'an')) return { word, tag: 'NOUN' };
        if (w.endsWith('tion') || w.endsWith('ness') || w.endsWith('ment') || w.endsWith('ity')) return { word, tag: 'NOUN' };

        // Default heuristic: adjective if followed by noun pattern, otherwise noun
        return { word, tag: 'NOUN' };
    });

    self.postMessage({
        type: 'RESULT',
        payload: { tags, duration: performance.now() - startTime }
    });
}
