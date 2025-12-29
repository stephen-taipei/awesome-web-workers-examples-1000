self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'TRUNCATE') truncate(payload.text, payload.maxLength, payload.mode, payload.ellipsis, payload.position);
};

function truncate(text, maxLength, mode, ellipsis, position) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Truncating...' } });

    let result;
    let wasTruncated = false;

    switch (mode) {
        case 'chars':
            result = truncateChars(text, maxLength, ellipsis, position);
            wasTruncated = text.length > maxLength;
            break;
        case 'words':
            result = truncateWords(text, maxLength, ellipsis, position);
            wasTruncated = text.split(/\s+/).length > maxLength;
            break;
        case 'sentences':
            result = truncateSentences(text, maxLength, ellipsis);
            wasTruncated = text.split(/[.!?]+/).filter(s => s.trim()).length > maxLength;
            break;
        default:
            result = text;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            originalLength: text.length,
            resultLength: result.length,
            removed: text.length - result.length,
            wasTruncated,
            duration: performance.now() - startTime
        }
    });
}

function truncateChars(text, maxLength, ellipsis, position) {
    if (text.length <= maxLength) return text;

    const ellipsisLength = ellipsis.length;
    const availableLength = maxLength - ellipsisLength;

    switch (position) {
        case 'end':
            // Try to break at word boundary
            let endPos = availableLength;
            while (endPos > 0 && text[endPos] !== ' ') endPos--;
            if (endPos === 0) endPos = availableLength;
            return text.slice(0, endPos).trim() + ellipsis;

        case 'start':
            let startPos = text.length - availableLength;
            while (startPos < text.length && text[startPos] !== ' ') startPos++;
            return ellipsis + text.slice(startPos).trim();

        case 'middle':
            const halfLength = Math.floor(availableLength / 2);
            return text.slice(0, halfLength).trim() + ellipsis + text.slice(-halfLength).trim();

        default:
            return text.slice(0, availableLength) + ellipsis;
    }
}

function truncateWords(text, maxWords, ellipsis, position) {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;

    switch (position) {
        case 'end':
            return words.slice(0, maxWords).join(' ') + ellipsis;

        case 'start':
            return ellipsis + words.slice(-maxWords).join(' ');

        case 'middle':
            const halfWords = Math.floor(maxWords / 2);
            return words.slice(0, halfWords).join(' ') + ellipsis + words.slice(-halfWords).join(' ');

        default:
            return words.slice(0, maxWords).join(' ') + ellipsis;
    }
}

function truncateSentences(text, maxSentences, ellipsis) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    if (sentences.length <= maxSentences) return text;

    return sentences.slice(0, maxSentences).join(' ') + ellipsis;
}
