// BM25 Algorithm implementation
class BM25 {
    constructor(docs) {
        this.docs = docs;
        this.docLength = [];
        this.avgDocLength = 0;
        this.docFreqs = {}; // term -> doc count
        this.idf = {};
        this.k1 = 1.5;
        this.b = 0.75;

        this._buildIndex();
    }

    _tokenize(text) {
        return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    }

    _buildIndex() {
        let totalLength = 0;
        this.docTermFreqs = [];

        this.docs.forEach(doc => {
            const terms = this._tokenize(doc);
            this.docLength.push(terms.length);
            totalLength += terms.length;

            const tf = {};
            const uniqueTerms = new Set(terms);

            terms.forEach(t => tf[t] = (tf[t] || 0) + 1);
            this.docTermFreqs.push(tf);

            uniqueTerms.forEach(t => {
                this.docFreqs[t] = (this.docFreqs[t] || 0) + 1;
            });
        });

        this.avgDocLength = totalLength / this.docs.length;

        // Calculate IDF
        const N = this.docs.length;
        for (let term in this.docFreqs) {
            const n = this.docFreqs[term];
            // Standard BM25 IDF: log( (N - n + 0.5) / (n + 0.5) + 1 )
            this.idf[term] = Math.log((N - n + 0.5) / (n + 0.5) + 1);
        }
    }

    search(query) {
        const queryTerms = this._tokenize(query);
        const scores = this.docs.map((doc, i) => {
            let score = 0;
            const tf = this.docTermFreqs[i];
            const docLen = this.docLength[i];

            queryTerms.forEach(term => {
                if (!this.idf[term]) return;

                const termFreq = tf[term] || 0;
                const idf = this.idf[term];

                // BM25 scoring formula
                const num = termFreq * (this.k1 + 1);
                const den = termFreq + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));

                score += idf * (num / den);
            });

            return { index: i, score, doc };
        });

        return scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    }
}

let bm25;

self.onmessage = function(e) {
    const { type } = e.data;

    try {
        if (type === 'index') {
            const { docs } = e.data;
            const startTime = performance.now();

            bm25 = new BM25(docs);

            const endTime = performance.now();
            self.postMessage({
                type: 'indexed',
                data: {
                    count: docs.length,
                    time: endTime - startTime
                }
            });

        } else if (type === 'search') {
            const { query } = e.data;
            const startTime = performance.now();

            const results = bm25.search(query);

            const endTime = performance.now();
            self.postMessage({
                type: 'results',
                data: {
                    results,
                    time: endTime - startTime
                }
            });
        }
    } catch (err) {
        self.postMessage({ type: 'error', data: { message: err.message } });
    }
};
