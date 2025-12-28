self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CHECK') checkAnagram(payload.text1, payload.text2, payload.ignoreSpaces);
};

function checkAnagram(text1, text2, ignoreSpaces) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Checking...' } });

    // Normalize strings
    let norm1 = text1.toLowerCase();
    let norm2 = text2.toLowerCase();

    if (ignoreSpaces) {
        norm1 = norm1.replace(/[^a-z0-9]/g, '');
        norm2 = norm2.replace(/[^a-z0-9]/g, '');
    }

    // Sort characters
    const sorted1 = [...norm1].sort().join('');
    const sorted2 = [...norm2].sort().join('');

    // Get character frequencies
    const freq1 = getFrequency(norm1);
    const freq2 = getFrequency(norm2);

    const isAnagram = sorted1 === sorted2;

    self.postMessage({
        type: 'RESULT',
        payload: {
            text1,
            text2,
            sorted1,
            sorted2,
            freq1,
            freq2,
            isAnagram,
            duration: performance.now() - startTime
        }
    });
}

function getFrequency(str) {
    const freq = {};
    for (const char of str) {
        freq[char] = (freq[char] || 0) + 1;
    }
    return freq;
}
