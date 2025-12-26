// Aho-Corasick implementation
class AhoCorasick {
    constructor(keywords) {
        this.trie = [{ next: {}, fail: 0, output: [] }];
        this.buildTrie(keywords);
        this.buildFailPointers();
    }

    buildTrie(keywords) {
        for (const word of keywords) {
            let node = 0;
            for (const char of word) {
                if (!this.trie[node].next[char]) {
                    this.trie[node].next[char] = this.trie.length;
                    this.trie.push({ next: {}, fail: 0, output: [] });
                }
                node = this.trie[node].next[char];
            }
            this.trie[node].output.push(word);
        }
    }

    buildFailPointers() {
        const queue = [];
        for (const char in this.trie[0].next) {
            const nextNode = this.trie[0].next[char];
            queue.push(nextNode);
        }

        while (queue.length > 0) {
            const node = queue.shift();
            for (const char in this.trie[node].next) {
                const nextNode = this.trie[node].next[char];
                let failNode = this.trie[node].fail;

                while (failNode > 0 && !this.trie[failNode].next[char]) {
                    failNode = this.trie[failNode].fail;
                }

                this.trie[nextNode].fail = this.trie[failNode].next[char] || 0;
                this.trie[nextNode].output = [
                    ...this.trie[nextNode].output,
                    ...this.trie[this.trie[nextNode].fail].output
                ];
                queue.push(nextNode);
            }
        }
    }

    search(text) {
        let node = 0;
        const matches = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            while (node > 0 && !this.trie[node].next[char]) {
                node = this.trie[node].fail;
            }
            node = this.trie[node].next[char] || 0;

            for (const word of this.trie[node].output) {
                matches.push({
                    word: word,
                    index: i - word.length + 1
                });
            }
        }
        return matches;
    }
}

self.onmessage = function(e) {
    const { text, words, replacement } = e.data;
    const startTime = performance.now();

    const ac = new AhoCorasick(words);
    const matches = ac.search(text);

    // Filter text
    let filteredText = '';
    let lastIndex = 0;

    // Sort matches by index, prioritize longest match at same index
    matches.sort((a, b) => a.index - b.index || b.word.length - a.word.length);

    // Merge overlapping matches (greedy approach)
    const mergedMatches = [];
    if (matches.length > 0) {
        let current = matches[0];
        for (let i = 1; i < matches.length; i++) {
            const next = matches[i];
            // If overlapping
            if (next.index < current.index + current.word.length) {
                // If next extends further, we might want to consider it, but simple greedy takes the first one found (or longest if we sorted)
                // Aho-Corasick finds all matches ending at i.
                // For censoring, we usually want to mask the longest possible covering.
                if (next.index + next.word.length > current.index + current.word.length) {
                     // This is tricky without a proper interval covering algo.
                     // But for simple "censor these words", let's just take non-overlapping
                     continue;
                }
            } else {
                mergedMatches.push(current);
                current = next;
            }
        }
        mergedMatches.push(current);
    }

    for (const match of mergedMatches) {
        filteredText += text.substring(lastIndex, match.index);
        filteredText += replacement.repeat(match.word.length);
        lastIndex = match.index + match.word.length;
    }
    filteredText += text.substring(lastIndex);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        filteredText: filteredText,
        matchCount: mergedMatches.length,
        time: endTime - startTime
    });
};
