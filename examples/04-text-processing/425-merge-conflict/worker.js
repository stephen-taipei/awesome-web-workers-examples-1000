/**
 * Merge Conflict Web Worker - Three-way merge
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'MERGE') merge(payload.base, payload.versionA, payload.versionB);
};

function merge(base, versionA, versionB) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Analyzing versions...' } });

    const baseLines = base.split('\n');
    const aLines = versionA.split('\n');
    const bLines = versionB.split('\n');

    const result = [];
    let conflicts = 0;
    const maxLen = Math.max(baseLines.length, aLines.length, bLines.length);

    for (let i = 0; i < maxLen; i++) {
        const baseLine = baseLines[i] || '';
        const aLine = aLines[i] || '';
        const bLine = bLines[i] || '';

        if (aLine === bLine) {
            // Both changed the same way or both unchanged
            result.push(escapeHTML(aLine));
        } else if (aLine === baseLine) {
            // Only B changed
            result.push(`<span style="color:#4caf50">${escapeHTML(bLine)}</span>`);
        } else if (bLine === baseLine) {
            // Only A changed
            result.push(`<span style="color:#2196f3">${escapeHTML(aLine)}</span>`);
        } else {
            // Conflict
            conflicts++;
            result.push(`<span style="color:#f44336">&lt;&lt;&lt;&lt;&lt;&lt;&lt; Version A</span>`);
            result.push(`<span style="color:#2196f3">${escapeHTML(aLine)}</span>`);
            result.push(`<span style="color:#f44336">=======</span>`);
            result.push(`<span style="color:#4caf50">${escapeHTML(bLine)}</span>`);
            result.push(`<span style="color:#f44336">&gt;&gt;&gt;&gt;&gt;&gt;&gt; Version B</span>`);
        }
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result.join('\n'),
            duration: performance.now() - startTime,
            stats: { conflicts }
        }
    });
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
