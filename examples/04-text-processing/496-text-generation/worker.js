let markovChain = {};
let order = 2;
let allStates = [];

function tokenize(text) {
    return text
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(w => w.length > 0);
}

function train(text, n) {
    order = n;
    markovChain = {};
    const words = tokenize(text);

    if (words.length < order + 1) {
        return { stateCount: 0, transitionCount: 0 };
    }

    let transitionCount = 0;

    for (let i = 0; i <= words.length - order - 1; i++) {
        // Create state from n consecutive words
        const state = words.slice(i, i + order).join(' ');
        const nextWord = words[i + order];

        if (!markovChain[state]) {
            markovChain[state] = {};
        }

        if (!markovChain[state][nextWord]) {
            markovChain[state][nextWord] = 0;
        }

        markovChain[state][nextWord]++;
        transitionCount++;

        if (i % 100 === 0) {
            self.postMessage({
                type: 'progress',
                data: { progress: i / words.length }
            });
        }
    }

    allStates = Object.keys(markovChain);

    return {
        stateCount: allStates.length,
        transitionCount: transitionCount
    };
}

function weightedRandom(transitions, temperature) {
    const words = Object.keys(transitions);
    const counts = Object.values(transitions);

    // Apply temperature
    const adjusted = counts.map(c => Math.pow(c, 1 / temperature));
    const total = adjusted.reduce((a, b) => a + b, 0);

    let random = Math.random() * total;

    for (let i = 0; i < words.length; i++) {
        random -= adjusted[i];
        if (random <= 0) {
            return words[i];
        }
    }

    return words[words.length - 1];
}

function generate(length, temperature, seed) {
    if (allStates.length === 0) {
        return { text: 'Model not trained', seedUsed: '' };
    }

    let currentState;
    let output = [];

    // Handle seed
    if (seed && seed.trim()) {
        const seedWords = seed.trim().split(' ');

        if (seedWords.length >= order) {
            // Use last 'order' words as starting state
            currentState = seedWords.slice(-order).join(' ');
            output = [...seedWords];
        } else {
            // Find a state that starts with the seed
            const matchingStates = allStates.filter(s =>
                s.toLowerCase().startsWith(seed.toLowerCase())
            );

            if (matchingStates.length > 0) {
                currentState = matchingStates[Math.floor(Math.random() * matchingStates.length)];
                output = currentState.split(' ');
            } else {
                // Use seed as-is and find random starting state
                output = seedWords;
                currentState = allStates[Math.floor(Math.random() * allStates.length)];
            }
        }
    } else {
        // Random starting state
        currentState = allStates[Math.floor(Math.random() * allStates.length)];
        output = currentState.split(' ');
    }

    // Generate words
    let attempts = 0;
    const maxAttempts = length * 3;

    while (output.length < length && attempts < maxAttempts) {
        attempts++;

        const transitions = markovChain[currentState];

        if (!transitions || Object.keys(transitions).length === 0) {
            // Dead end - pick random state
            currentState = allStates[Math.floor(Math.random() * allStates.length)];
            continue;
        }

        const nextWord = weightedRandom(transitions, temperature);
        output.push(nextWord);

        // Update state
        const stateWords = currentState.split(' ');
        stateWords.shift();
        stateWords.push(nextWord);
        currentState = stateWords.join(' ');
    }

    return {
        text: output.join(' '),
        seedUsed: seed || allStates[0]
    };
}

self.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'train') {
        const startTime = performance.now();
        const { text, order: n } = e.data;

        const result = train(text, n);

        // Get sample states for UI
        const sampleStates = allStates
            .sort(() => Math.random() - 0.5)
            .slice(0, 20);

        const endTime = performance.now();

        self.postMessage({
            type: 'trained',
            data: {
                stateCount: result.stateCount,
                transitionCount: result.transitionCount,
                sampleStates: sampleStates,
                time: endTime - startTime
            }
        });
    } else if (type === 'generate') {
        const { length, temperature, seed } = e.data;
        const result = generate(length, temperature, seed);

        self.postMessage({
            type: 'generated',
            data: result
        });
    }
};
