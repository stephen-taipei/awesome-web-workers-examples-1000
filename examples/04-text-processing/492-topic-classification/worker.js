// Topic keyword dictionaries with weights
const topicKeywords = {
    'Technology': {
        'computer': 2, 'software': 2, 'hardware': 2, 'programming': 2, 'code': 1.5,
        'app': 1.5, 'application': 1.5, 'digital': 1.5, 'internet': 2, 'online': 1,
        'ai': 3, 'artificial intelligence': 3, 'machine learning': 3, 'data': 1.5,
        'algorithm': 2, 'tech': 2, 'technology': 2, 'smartphone': 2, 'iphone': 2,
        'android': 2, 'google': 2, 'apple': 2, 'microsoft': 2, 'amazon': 1.5,
        'cloud': 2, 'server': 1.5, 'network': 1.5, 'cybersecurity': 2, 'hack': 1.5,
        'startup': 1.5, 'innovation': 1.5, 'device': 1, 'gadget': 1.5, 'robot': 2
    },
    'Sports': {
        'game': 1.5, 'team': 1.5, 'player': 2, 'score': 2, 'win': 1.5, 'won': 1.5,
        'championship': 2, 'tournament': 2, 'match': 2, 'football': 3, 'basketball': 3,
        'soccer': 3, 'tennis': 3, 'golf': 3, 'baseball': 3, 'hockey': 3,
        'athlete': 2, 'coach': 2, 'stadium': 2, 'league': 2, 'nba': 3, 'nfl': 3,
        'fifa': 3, 'olympics': 3, 'medal': 2, 'race': 1.5, 'marathon': 2,
        'goal': 1.5, 'points': 1.5, 'season': 1.5, 'playoffs': 2, 'defeated': 2
    },
    'Politics': {
        'government': 2, 'president': 2, 'congress': 2, 'senate': 2, 'election': 3,
        'vote': 2, 'voter': 2, 'campaign': 2, 'democrat': 2, 'republican': 2,
        'policy': 2, 'law': 1.5, 'legislation': 2, 'bill': 1.5, 'political': 2,
        'politician': 2, 'minister': 2, 'parliament': 2, 'governor': 2, 'mayor': 1.5,
        'administration': 1.5, 'diplomat': 2, 'treaty': 2, 'constitution': 2,
        'democracy': 2, 'party': 1, 'liberal': 1.5, 'conservative': 1.5, 'reform': 1.5
    },
    'Entertainment': {
        'movie': 3, 'film': 3, 'actor': 2, 'actress': 2, 'celebrity': 2,
        'music': 2, 'song': 2, 'album': 2, 'concert': 2, 'singer': 2, 'band': 2,
        'tv': 2, 'television': 2, 'show': 1.5, 'series': 1.5, 'streaming': 2,
        'netflix': 2, 'disney': 2, 'hollywood': 3, 'box office': 3, 'award': 2,
        'oscar': 3, 'grammy': 3, 'emmy': 3, 'star': 1, 'fame': 1.5, 'viral': 1.5,
        'superhero': 2, 'marvel': 2, 'director': 2, 'premiere': 2
    },
    'Science': {
        'research': 2, 'scientist': 3, 'study': 1.5, 'discovery': 2, 'experiment': 2,
        'laboratory': 2, 'physics': 3, 'chemistry': 3, 'biology': 3, 'astronomy': 3,
        'space': 2, 'nasa': 3, 'planet': 2, 'universe': 2, 'galaxy': 2, 'star': 1,
        'climate': 2, 'environment': 1.5, 'species': 2, 'evolution': 2, 'dna': 2,
        'molecule': 2, 'atom': 2, 'quantum': 3, 'theory': 1.5, 'hypothesis': 2,
        'journal': 1.5, 'nature': 1, 'exoplanet': 3, 'particle': 2
    },
    'Business': {
        'company': 2, 'business': 2, 'market': 2, 'stock': 2, 'investment': 2,
        'investor': 2, 'economy': 2, 'economic': 2, 'financial': 2, 'finance': 2,
        'bank': 2, 'trade': 1.5, 'profit': 2, 'revenue': 2, 'earnings': 2,
        'ceo': 2, 'executive': 1.5, 'startup': 1.5, 'entrepreneur': 2, 'industry': 1.5,
        'corporate': 2, 'merger': 2, 'acquisition': 2, 'ipo': 3, 'billion': 1.5,
        'million': 1, 'growth': 1.5, 'retail': 1.5, 'consumer': 1.5, 'sales': 1.5
    },
    'Health': {
        'health': 2, 'medical': 2, 'doctor': 2, 'hospital': 2, 'patient': 2,
        'disease': 2, 'treatment': 2, 'medicine': 2, 'drug': 2, 'vaccine': 3,
        'virus': 2, 'pandemic': 3, 'covid': 3, 'symptom': 2, 'diagnosis': 2,
        'therapy': 2, 'surgery': 2, 'cancer': 2, 'mental health': 3, 'wellness': 2,
        'nutrition': 2, 'diet': 1.5, 'exercise': 1.5, 'fitness': 1.5, 'research': 1,
        'clinical': 2, 'fda': 2, 'pharmaceutical': 2, 'healthcare': 2, 'nurse': 1.5
    }
};

function classifyText(text) {
    const words = text.toLowerCase();
    const scores = {};
    const matchedKeywords = {};

    // Calculate scores for each topic
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        let score = 0;
        matchedKeywords[topic] = [];

        for (const [keyword, weight] of Object.entries(keywords)) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = words.match(regex);

            if (matches) {
                score += matches.length * weight;
                if (!matchedKeywords[topic].includes(keyword)) {
                    matchedKeywords[topic].push(keyword);
                }
            }
        }

        scores[topic] = score;
    }

    // Normalize scores to 0-1 range
    const maxScore = Math.max(...Object.values(scores), 1);
    for (const topic in scores) {
        scores[topic] = scores[topic] / maxScore;
    }

    return { scores, matchedKeywords };
}

self.onmessage = function(e) {
    const { type, texts } = e.data;

    if (type === 'classify') {
        const startTime = performance.now();
        const results = [];

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const { scores, matchedKeywords } = classifyText(text);

            results.push({
                text: text,
                scores: scores,
                matchedKeywords: matchedKeywords
            });

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
                time: endTime - startTime
            }
        });
    }
};
