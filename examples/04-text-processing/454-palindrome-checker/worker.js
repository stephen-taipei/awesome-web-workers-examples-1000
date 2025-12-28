self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CHECK') checkPalindrome(payload.text, payload.ignoreCase, payload.ignoreSpaces);
};

function checkPalindrome(text, ignoreCase, ignoreSpaces) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Checking...' } });

    // Normalize the string
    let normalized = text;

    if (ignoreCase) {
        normalized = normalized.toLowerCase();
    }

    if (ignoreSpaces) {
        normalized = normalized.replace(/[^a-z0-9]/gi, '');
    }

    // Reverse the normalized string
    const reversed = [...normalized].reverse().join('');

    // Check if palindrome
    const isPalindrome = normalized === reversed;

    // Find first mismatch position if not palindrome
    let mismatchPosition = -1;
    if (!isPalindrome) {
        for (let i = 0; i < normalized.length; i++) {
            if (normalized[i] !== reversed[i]) {
                mismatchPosition = i;
                break;
            }
        }
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            normalized,
            reversed,
            isPalindrome,
            mismatchPosition,
            duration: performance.now() - startTime
        }
    });
}
