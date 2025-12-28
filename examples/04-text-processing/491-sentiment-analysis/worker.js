// Sentiment lexicon
const positiveWords = {
    'good': 0.5, 'great': 0.7, 'excellent': 0.9, 'amazing': 0.9, 'wonderful': 0.8,
    'fantastic': 0.9, 'awesome': 0.8, 'love': 0.8, 'like': 0.4, 'happy': 0.7,
    'best': 0.8, 'beautiful': 0.7, 'perfect': 0.9, 'nice': 0.5, 'brilliant': 0.8,
    'superb': 0.9, 'outstanding': 0.9, 'incredible': 0.8, 'magnificent': 0.9,
    'delightful': 0.7, 'pleasant': 0.5, 'enjoyable': 0.6, 'favorable': 0.5,
    'positive': 0.5, 'recommend': 0.6, 'impressed': 0.7, 'exceeded': 0.7,
    'helpful': 0.6, 'friendly': 0.6, 'fast': 0.4, 'quality': 0.5, 'reliable': 0.6,
    'efficient': 0.5, 'satisfying': 0.6, 'glad': 0.6, 'pleased': 0.6
};

const negativeWords = {
    'bad': -0.5, 'terrible': -0.9, 'awful': -0.9, 'horrible': -0.9, 'poor': -0.6,
    'hate': -0.8, 'dislike': -0.5, 'worst': -0.9, 'disappointing': -0.7,
    'disappointed': -0.7, 'boring': -0.5, 'waste': -0.7, 'useless': -0.8,
    'broken': -0.7, 'defective': -0.8, 'ugly': -0.6, 'annoying': -0.6,
    'frustrating': -0.7, 'angry': -0.6, 'upset': -0.5, 'sad': -0.5,
    'never': -0.3, 'wrong': -0.5, 'fail': -0.7, 'failed': -0.7, 'failure': -0.7,
    'problem': -0.4, 'issue': -0.3, 'difficult': -0.3, 'hard': -0.2,
    'slow': -0.4, 'expensive': -0.3, 'overpriced': -0.5, 'cheap': -0.3,
    'regret': -0.6, 'avoid': -0.5, 'unfortunately': -0.4
};

const negations = ['not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', "n't", 'dont', "don't", 'doesnt', "doesn't", 'didnt', "didn't", 'wont', "won't", 'cant', "can't", 'cannot'];

const intensifiers = {
    'very': 1.5, 'really': 1.4, 'extremely': 1.8, 'incredibly': 1.7,
    'absolutely': 1.6, 'totally': 1.5, 'completely': 1.5, 'highly': 1.4,
    'so': 1.3, 'quite': 1.2, 'somewhat': 0.8, 'slightly': 0.6
};

function analyzeSentiment(text) {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const analyzedWords = [];
    let totalScore = 0;
    let wordCount = 0;
    let negationActive = false;
    let intensifier = 1;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        // Check for negation
        if (negations.includes(word)) {
            negationActive = true;
            continue;
        }

        // Check for intensifier
        if (intensifiers[word]) {
            intensifier = intensifiers[word];
            continue;
        }

        let score = 0;
        let type = 'neutral';

        if (positiveWords[word]) {
            score = positiveWords[word];
            type = 'positive';
        } else if (negativeWords[word]) {
            score = negativeWords[word];
            type = 'negative';
        }

        if (score !== 0) {
            // Apply intensifier
            score *= intensifier;

            // Apply negation
            if (negationActive) {
                score *= -0.5;
                type = score > 0 ? 'positive' : 'negative';
            }

            totalScore += score;
            wordCount++;

            analyzedWords.push({
                word: word,
                score: score,
                type: type
            });
        }

        // Reset modifiers after processing a sentiment word
        negationActive = false;
        intensifier = 1;
    }

    // Normalize score to -1 to 1 range
    const normalizedScore = wordCount > 0 ? Math.max(-1, Math.min(1, totalScore / Math.sqrt(wordCount))) : 0;

    return {
        score: normalizedScore,
        words: analyzedWords
    };
}

self.onmessage = function(e) {
    const { type, texts } = e.data;

    if (type === 'analyze') {
        const startTime = performance.now();
        const results = [];
        let totalScore = 0;

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const analysis = analyzeSentiment(text);

            results.push({
                text: text,
                score: analysis.score,
                words: analysis.words
            });

            totalScore += analysis.score;

            if (i % 10 === 0) {
                self.postMessage({
                    type: 'progress',
                    data: { progress: i / texts.length }
                });
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                results: results,
                count: texts.length,
                avgScore: texts.length > 0 ? totalScore / texts.length : 0,
                time: endTime - startTime
            }
        });
    }
};
