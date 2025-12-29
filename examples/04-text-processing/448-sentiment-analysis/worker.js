// Simple lexicon-based sentiment analysis
const positiveWords = {
    'love': 3, 'amazing': 3, 'excellent': 3, 'wonderful': 3, 'fantastic': 3, 'brilliant': 3,
    'great': 2, 'good': 2, 'nice': 2, 'happy': 2, 'pleased': 2, 'perfect': 3, 'best': 3,
    'beautiful': 2, 'awesome': 3, 'incredible': 3, 'outstanding': 3, 'superb': 3,
    'enjoy': 2, 'like': 1, 'helpful': 2, 'easy': 1, 'fast': 1, 'recommend': 2,
    'satisfied': 2, 'impressive': 2, 'efficient': 2, 'reliable': 2, 'friendly': 2
};

const negativeWords = {
    'hate': -3, 'terrible': -3, 'awful': -3, 'horrible': -3, 'worst': -3, 'disgusting': -3,
    'bad': -2, 'poor': -2, 'disappointing': -2, 'disappointed': -2, 'slow': -1, 'damaged': -2,
    'broken': -2, 'useless': -3, 'waste': -2, 'frustrating': -2, 'annoying': -2,
    'difficult': -1, 'problem': -2, 'issue': -1, 'fail': -2, 'failed': -2, 'failure': -2,
    'wrong': -2, 'error': -2, 'bug': -2, 'crash': -2, 'defective': -2
};

const intensifiers = { 'very': 1.5, 'really': 1.5, 'extremely': 2, 'absolutely': 2, 'quite': 1.2, 'so': 1.5 };
const negators = new Set(['not', "n't", 'never', 'no', 'without', 'hardly', 'barely']);

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'ANALYZE') analyze(payload.text);
};

function analyze(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Analyzing sentiment...' } });

    const words = text.toLowerCase().match(/\w+/g) || [];
    const scoredWords = [];
    let totalScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let score = positiveWords[word] || negativeWords[word] || 0;

        if (score !== 0) {
            // Check for negation
            for (let j = Math.max(0, i - 3); j < i; j++) {
                if (negators.has(words[j]) || words[j].endsWith("n't")) {
                    score = -score;
                    break;
                }
            }

            // Check for intensifiers
            if (i > 0 && intensifiers[words[i - 1]]) {
                score *= intensifiers[words[i - 1]];
            }

            scoredWords.push({ word, score: Math.round(score) });
            totalScore += score;

            if (score > 0) positiveCount++;
            else if (score < 0) negativeCount++;
        }
    }

    const sentiment = totalScore > 0.5 ? 'positive' : totalScore < -0.5 ? 'negative' : 'neutral';
    const total = positiveCount + negativeCount || 1;
    const positivePercent = (positiveCount / total) * 100;
    const negativePercent = (negativeCount / total) * 100;

    self.postMessage({
        type: 'RESULT',
        payload: {
            score: totalScore,
            sentiment,
            positivePercent,
            negativePercent,
            words: scoredWords,
            duration: performance.now() - startTime
        }
    });
}
