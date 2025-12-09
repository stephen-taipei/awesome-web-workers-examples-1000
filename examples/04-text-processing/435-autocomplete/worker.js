class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        this.isEndOfWord = true; // Bug in class property? No, node property.
        node.isEndOfWord = true;
    }

    searchPrefix(prefix) {
        let node = this.root;
        for (let char of prefix) {
            if (!node.children[char]) {
                return [];
            }
            node = node.children[char];
        }
        return this._collectWords(node, prefix);
    }

    _collectWords(node, prefix, results = []) {
        if (results.length >= 10) return results; // Limit results

        if (node.isEndOfWord) {
            results.push(prefix);
        }

        for (let char in node.children) {
            if (results.length >= 10) break;
            this._collectWords(node.children[char], prefix + char, results);
        }

        return results;
    }
}

let trie = new Trie();

self.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'build') {
        const { words } = e.data;
        const startTime = performance.now();

        trie = new Trie(); // Reset
        for (let word of words) {
            trie.insert(word);
        }

        const endTime = performance.now();
        self.postMessage({
            type: 'built',
            data: {
                count: words.length,
                time: endTime - startTime
            }
        });

    } else if (type === 'search') {
        const { prefix } = e.data;
        const startTime = performance.now();

        const suggestions = trie.searchPrefix(prefix);

        const endTime = performance.now();
        self.postMessage({
            type: 'suggestions',
            data: {
                suggestions,
                time: endTime - startTime
            }
        });
    }
};
