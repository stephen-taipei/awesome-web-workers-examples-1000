self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SPLIT') split(payload.text, payload.splitType, payload.delimiter, payload.size);
};

function split(text, splitType, delimiter, size) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Splitting...' } });

    let parts = [];

    switch (splitType) {
        case 'delimiter':
            parts = text.split(delimiter).filter(p => p.length > 0);
            break;

        case 'size':
            for (let i = 0; i < text.length; i += size) {
                parts.push(text.slice(i, i + size));
            }
            break;

        case 'words':
            const words = text.split(/\s+/);
            for (let i = 0; i < words.length; i += size) {
                parts.push(words.slice(i, i + size).join(' '));
            }
            break;

        case 'sentences':
            parts = text.split(/(?<=[.!?])\s+/).filter(p => p.trim().length > 0);
            break;

        case 'paragraphs':
            parts = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            break;

        case 'regex':
            try {
                const regex = new RegExp(delimiter);
                parts = text.split(regex).filter(p => p.length > 0);
            } catch (e) {
                parts = [text];
            }
            break;

        default:
            parts = [text];
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            parts,
            duration: performance.now() - startTime
        }
    });
}
