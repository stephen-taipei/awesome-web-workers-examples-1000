// Inverted Index implementation
class InvertedIndex {
    constructor() {
        this.index = new Map(); // Word -> Set<DocID>
        this.docs = new Map();  // DocID -> Document
    }

    add(doc) {
        this.docs.set(doc.id, doc);
        const tokens = this._tokenize(doc.text);

        tokens.forEach(token => {
            if (!this.index.has(token)) {
                this.index.set(token, new Set());
            }
            this.index.get(token).add(doc.id);
        });
        return tokens.length;
    }

    _tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 0);
    }

    search(query) {
        // Simple search: support AND / OR implicitly?
        // Let's implement basic boolean logic parsing or just default to OR
        // Let's do a simple OR search first, or Intersection (AND)
        // User hint says "Boolean AND support" in UI placeholder.

        // Very basic query parser
        const tokens = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);

        if (tokens.length === 0) return [];

        // Find docs containing ALL tokens (AND search)
        let resultIds = null;

        // Naive intersection
        for (const token of tokens) {
            const ids = this.index.get(token);
            if (!ids) {
                // If any token is missing, AND result is empty
                return [];
            }

            if (resultIds === null) {
                resultIds = new Set(ids);
            } else {
                // Intersect
                const newResult = new Set();
                for (const id of resultIds) {
                    if (ids.has(id)) {
                        newResult.add(id);
                    }
                }
                resultIds = newResult;
                if (resultIds.size === 0) return [];
            }
        }

        return Array.from(resultIds).map(id => this.docs.get(id));
    }
}

let index = new InvertedIndex();

self.onmessage = function(e) {
    const { type } = e.data;

    try {
        if (type === 'build') {
            const { docs } = e.data;
            const startTime = performance.now();

            index = new InvertedIndex();
            let totalWords = 0;

            docs.forEach(doc => {
                totalWords += index.add(doc);
            });

            const endTime = performance.now();
            self.postMessage({
                type: 'indexed',
                data: {
                    docCount: docs.length,
                    wordCount: totalWords,
                    time: endTime - startTime
                }
            });

        } else if (type === 'search') {
            const { query } = e.data;
            const startTime = performance.now();

            const results = index.search(query);

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
