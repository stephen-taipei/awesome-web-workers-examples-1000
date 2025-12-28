self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SEARCH') search(payload.query, payload.words);
};

function search(query, wordList) {
    self.postMessage({ type: 'PROGRESS', payload: { percent: 50, message: 'Searching...' } });

    const words = wordList.split('\n').map(w => w.trim()).filter(w => w);
    const queryLower = query.toLowerCase();

    const suggestions = words
        .map(word => {
            const wordLower = word.toLowerCase();
            let score = 0;

            if (wordLower === queryLower) score = 100;
            else if (wordLower.startsWith(queryLower)) score = 80;
            else if (wordLower.includes(queryLower)) score = 60;
            else {
                // Fuzzy match
                let qi = 0;
                for (let i = 0; i < wordLower.length && qi < queryLower.length; i++) {
                    if (wordLower[i] === queryLower[qi]) qi++;
                }
                if (qi === queryLower.length) score = 40;
            }

            return { word, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(r => r.word);

    self.postMessage({ type: 'RESULT', payload: { suggestions } });
}
