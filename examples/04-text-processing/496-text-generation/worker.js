self.onmessage = function(e) {
    const { action, text, order, length } = e.data;

    if (action === 'generate') {
        const startTrain = performance.now();

        // 1. Tokenize
        // Simple tokenization by splitting on spaces, keeping punctuation attached or separate?
        // Let's keep it simple: split by whitespace.
        const tokens = text.split(/\s+/).filter(t => t.length > 0);

        // 2. Build Markov Chain
        const chain = new Map();

        // Helper to get key from ngram array
        const getKey = (ngram) => ngram.join(' ');

        for (let i = 0; i < tokens.length - order; i++) {
            const gram = tokens.slice(i, i + order);
            const next = tokens[i + order];
            const key = getKey(gram);

            if (!chain.has(key)) {
                chain.set(key, []);
            }
            chain.get(key).push(next);
        }

        const endTrain = performance.now();

        // 3. Generate
        const startGen = performance.now();
        const result = [];

        // Pick random start
        // Ideally pick a key that starts with a capital letter or is start of sentence
        const keys = Array.from(chain.keys());
        if (keys.length === 0) {
            self.postMessage({ generated: "Not enough text for this order.", trainingTime: 0, generationTime: 0 });
            return;
        }

        let startKey = keys[Math.floor(Math.random() * keys.length)];
        let currentGram = startKey.split(' ');

        result.push(...currentGram);

        for (let i = 0; i < length; i++) {
            const key = getKey(currentGram);
            const candidates = chain.get(key);

            if (!candidates || candidates.length === 0) {
                // Dead end, pick random key or stop?
                // Let's stop or pick random new start
                break;
            }

            const next = candidates[Math.floor(Math.random() * candidates.length)];
            result.push(next);

            // Shift gram
            currentGram.shift();
            currentGram.push(next);
        }

        const endGen = performance.now();

        self.postMessage({
            generated: result.join(' '),
            trainingTime: endTrain - startTrain,
            generationTime: endGen - startGen
        });
    }
};
