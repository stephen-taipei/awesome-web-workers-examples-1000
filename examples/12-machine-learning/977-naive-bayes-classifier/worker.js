// Naive Bayes Classifier Worker

const SPAM_KEYWORDS = ['free', 'win', 'prize', 'money', 'cash', 'offer', 'click', 'buy', 'now', 'urgent', 'credit', 'loan', 'casino', 'lottery', 'winner', 'guarantee', 'bonus', 'deal', 'discount'];
const HAM_KEYWORDS = ['hello', 'meeting', 'project', 'work', 'friend', 'lunch', 'family', 'report', 'status', 'thanks', 'love', 'schedule', 'office', 'paper', 'week', 'tomorrow', 'review', 'team'];

let spamCounts = {};
let hamCounts = {};
let totalSpamWords = 0;
let totalHamWords = 0;
let totalSpamDocs = 0;
let totalHamDocs = 0;
let vocabulary = new Set();

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'train') {
        const { size } = e.data;
        const start = performance.now();
        
        resetModel();
        
        // Generate Synthetic Dataset
        for (let i = 0; i < size; i++) {
            const isSpam = Math.random() > 0.5;
            const text = generateMessage(isSpam);
            train(text, isSpam);
        }
        
        const end = performance.now();
        
        // Extract top words
        const topSpam = getTopWords(spamCounts, totalSpamWords).slice(0, 10);
        const topHam = getTopWords(hamCounts, totalHamWords).slice(0, 10);

        self.postMessage({
            type: 'trained',
            data: {
                duration: (end - start).toFixed(2),
                vocabSize: vocabulary.size,
                topSpam,
                topHam
            }
        });
    } 
    else if (command === 'predict') {
        const { text } = e.data;
        const result = predict(text);
        self.postMessage({
            type: 'prediction',
            data: result
        });
    }
};

function resetModel() {
    spamCounts = {};
    hamCounts = {};
    totalSpamWords = 0;
    totalHamWords = 0;
    totalSpamDocs = 0;
    totalHamDocs = 0;
    vocabulary = new Set();
}

function generateMessage(isSpam) {
    const keywords = isSpam ? SPAM_KEYWORDS : HAM_KEYWORDS;
    const len = 5 + Math.floor(Math.random() * 15);
    const words = [];
    
    for (let i = 0; i < len; i++) {
        if (Math.random() > 0.3) {
            // Pick from specific vocabulary
            words.push(keywords[Math.floor(Math.random() * keywords.length)]);
        } else {
            // Pick some random noise word
            words.push('the'); // Simplifying noise
        }
    }
    return words.join(' ');
}

function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
}

function train(text, isSpam) {
    const tokens = tokenize(text);
    if (isSpam) totalSpamDocs++; else totalHamDocs++;
    
    tokens.forEach(w => {
        vocabulary.add(w);
        if (isSpam) {
            spamCounts[w] = (spamCounts[w] || 0) + 1;
            totalSpamWords++;
        } else {
            hamCounts[w] = (hamCounts[w] || 0) + 1;
            totalHamWords++;
        }
    });
}

function predict(text) {
    const tokens = tokenize(text);
    const vocabSize = vocabulary.size;
    const totalDocs = totalSpamDocs + totalHamDocs;
    
    // P(Spam), P(Ham)
    const pSpam = totalSpamDocs / totalDocs;
    const pHam = totalHamDocs / totalDocs;
    
    // Log probabilities to avoid underflow
    let logProbSpam = Math.log(pSpam);
    let logProbHam = Math.log(pHam);
    
    tokens.forEach(w => {
        // Laplace Smoothing (+1)
        const wSpamCount = spamCounts[w] || 0;
        const wHamCount = hamCounts[w] || 0;
        
        // P(word | spam)
        const pW_Spam = (wSpamCount + 1) / (totalSpamWords + vocabSize);
        logProbSpam += Math.log(pW_Spam);
        
        // P(word | ham)
        const pW_Ham = (wHamCount + 1) / (totalHamWords + vocabSize);
        logProbHam += Math.log(pW_Ham);
    });
    
    // Convert back to approx probability (Softmaxish)
    // Not exact probability because we dropped P(Evidence), but good for comparison
    const scoreSpam = logProbSpam;
    const scoreHam = logProbHam;
    
    // Simple comparison
    const label = scoreSpam > scoreHam ? 'spam' : 'ham';
    
    // Prob Estimate (Sigmoid of difference)
    // This is a heuristic for visualization
    const diff = scoreSpam - scoreHam;
    const prob = 1 / (1 + Math.exp(-Math.abs(diff)));
    
    return { label, probability: prob };
}

function getTopWords(counts, total) {
    return Object.entries(counts)
        .map(([word, count]) => ({ word, score: count / total }))
        .sort((a, b) => b.score - a.score);
}
