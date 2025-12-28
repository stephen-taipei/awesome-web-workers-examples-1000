// Simple keyword-based text classification
const categories = {
    technology: {
        name: 'Technology',
        keywords: ['computer', 'software', 'hardware', 'app', 'application', 'digital', 'internet', 'web', 'smartphone', 'phone', 'processor', 'cpu', 'gpu', 'memory', 'storage', 'cloud', 'ai', 'machine learning', 'algorithm', 'programming', 'code', 'developer', 'tech', 'device', 'gadget', 'battery', 'screen', 'display', 'camera', 'sensor']
    },
    sports: {
        name: 'Sports',
        keywords: ['game', 'match', 'team', 'player', 'score', 'win', 'championship', 'league', 'tournament', 'football', 'soccer', 'basketball', 'baseball', 'tennis', 'golf', 'athlete', 'coach', 'stadium', 'olympics', 'medal', 'race', 'competition', 'fitness', 'training']
    },
    business: {
        name: 'Business',
        keywords: ['company', 'corporation', 'market', 'stock', 'investment', 'profit', 'revenue', 'sales', 'customer', 'client', 'ceo', 'executive', 'management', 'strategy', 'growth', 'startup', 'entrepreneur', 'economy', 'finance', 'bank', 'money', 'trade', 'industry']
    },
    health: {
        name: 'Health',
        keywords: ['doctor', 'hospital', 'patient', 'medicine', 'treatment', 'disease', 'symptom', 'diagnosis', 'surgery', 'vaccine', 'virus', 'bacteria', 'health', 'wellness', 'nutrition', 'diet', 'exercise', 'mental', 'therapy', 'prescription', 'drug', 'medical']
    },
    entertainment: {
        name: 'Entertainment',
        keywords: ['movie', 'film', 'actor', 'actress', 'director', 'music', 'song', 'album', 'concert', 'show', 'tv', 'television', 'series', 'celebrity', 'award', 'oscar', 'grammy', 'theater', 'performance', 'streaming', 'netflix', 'youtube', 'video']
    },
    science: {
        name: 'Science',
        keywords: ['research', 'study', 'scientist', 'experiment', 'discovery', 'theory', 'hypothesis', 'data', 'analysis', 'physics', 'chemistry', 'biology', 'astronomy', 'space', 'planet', 'universe', 'atom', 'molecule', 'dna', 'evolution', 'climate', 'environment']
    }
};

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CLASSIFY') classify(payload.text);
};

function classify(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Classifying...' } });

    const words = text.toLowerCase().match(/\w+/g) || [];
    const wordSet = new Set(words);

    const scores = [];
    for (const [key, category] of Object.entries(categories)) {
        let score = 0;
        const matchedKeywords = [];

        for (const keyword of category.keywords) {
            if (keyword.includes(' ')) {
                // Multi-word keyword
                if (text.toLowerCase().includes(keyword)) {
                    score += 2;
                    matchedKeywords.push(keyword);
                }
            } else {
                if (wordSet.has(keyword)) {
                    score += 1;
                    matchedKeywords.push(keyword);
                }
            }
        }

        scores.push({
            key,
            name: category.name,
            score,
            matchedKeywords
        });
    }

    // Normalize to confidence scores
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0) || 1;
    scores.forEach(s => {
        s.confidence = s.score / totalScore;
    });

    scores.sort((a, b) => b.confidence - a.confidence);

    self.postMessage({
        type: 'RESULT',
        payload: {
            categories: scores,
            duration: performance.now() - startTime
        }
    });
}
