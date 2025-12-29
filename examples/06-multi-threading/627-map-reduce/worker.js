/**
 * #627 Map-Reduce Worker (Map Phase)
 */
self.onmessage = function(e) {
    const { words } = e.data;
    const counts = {};
    words.forEach(word => {
        const clean = word.toLowerCase().replace(/[^a-z]/g, '');
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
    });
    self.postMessage(counts);
};
