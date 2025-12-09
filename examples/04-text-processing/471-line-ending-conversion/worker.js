self.onmessage = function(e) {
    const { text, format } = e.data;
    const start = performance.now();

    // Normalize everything to LF first to simplify
    // Replace \r\n with \n
    // Replace \r with \n (Mac Classic style, though rare now)
    let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let result = normalized;
    if (format === 'crlf') {
        result = normalized.replace(/\n/g, '\r\n');
    }

    const end = performance.now();

    // Calculate stats
    const stats = {
        lf: (result.match(/[^\r]\n/g) || []).length + (result.startsWith('\n') ? 1 : 0),
        crlf: (result.match(/\r\n/g) || []).length,
        cr: (result.match(/\r[^\n]/g) || []).length
    };

    // Create a debug view where characters are visible
    // We replace \r with [CR] and \n with [LF]\n
    const debugView = result
        .replace(/\r/g, '[CR]')
        .replace(/\n/g, '[LF]\n');

    self.postMessage({
        result,
        time: end - start,
        stats,
        debugView
    });
};
