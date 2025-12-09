self.onmessage = function(e) {
    const { docs } = e.data;

    const startTime = performance.now();

    // 1. Tokenize and count TF
    const docTerms = docs.map(doc => {
        const terms = doc.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
        const tf = {};
        terms.forEach(t => tf[t] = (tf[t] || 0) + 1);
        return { text: doc, terms, tf };
    });

    // 2. Calculate DF (Document Frequency)
    const df = {};
    docTerms.forEach(doc => {
        const uniqueTerms = new Set(doc.terms);
        uniqueTerms.forEach(t => {
            df[t] = (df[t] || 0) + 1;
        });
    });

    const N = docs.length;

    // 3. Calculate TF-IDF
    const results = docTerms.map(doc => {
        const keywords = [];
        for (let term in doc.tf) {
            // TF: term count in doc / total terms in doc (normalized)
            const tfVal = doc.tf[term] / doc.terms.length;

            // IDF: log(N / (df + 1))
            const idfVal = Math.log(N / (df[term] || 1)) + 1;

            const tfidf = tfVal * idfVal;
            keywords.push({ term, score: tfidf });
        }

        // Sort by score desc
        keywords.sort((a, b) => b.score - a.score);

        return {
            text: doc.text,
            keywords: keywords.slice(0, 5) // Top 5
        };
    });

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            results,
            time: endTime - startTime
        }
    });
};
