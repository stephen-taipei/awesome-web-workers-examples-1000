self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CONVERT') convert(payload.rtf);
};

function convert(rtf) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Parsing RTF...' } });

    let text = rtf;

    // Remove RTF header
    text = text.replace(/^\{\\rtf1[^}]*\}/m, '');

    // Remove font tables, color tables, etc.
    text = text.replace(/\{\\fonttbl[^}]*\}/g, '');
    text = text.replace(/\{\\colortbl[^}]*\}/g, '');
    text = text.replace(/\{\\stylesheet[^}]*\}/g, '');

    self.postMessage({ type: 'PROGRESS', payload: { percent: 60, message: 'Extracting text...' } });

    // Remove formatting commands but keep content
    text = text.replace(/\{\\[bi]\s*/g, '');
    text = text.replace(/\{\\ul\s*/g, '');
    text = text.replace(/\}/g, '');

    // Convert paragraph breaks
    text = text.replace(/\\par\s*/g, '\n');
    text = text.replace(/\\line\s*/g, '\n');

    // Remove remaining RTF commands
    text = text.replace(/\\[a-z]+\d*\s?/gi, '');

    // Remove braces and clean up
    text = text.replace(/[{}]/g, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: text,
            duration: performance.now() - startTime,
            stats: { original: rtf.length, plainText: text.length }
        }
    });
}
