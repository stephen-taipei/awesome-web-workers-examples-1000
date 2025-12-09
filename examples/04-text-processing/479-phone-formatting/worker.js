self.onmessage = function(e) {
    const { text, format } = e.data;

    // Simple implementation for US/International numbers
    // Note: libphonenumber is ideal for robust parsing, but we use regex for this vanilla demo.

    const lines = text.split('\n');
    let validCount = 0;

    const result = lines.map(line => {
        line = line.trim();
        if (!line) return '';

        // Strip non-numeric chars (except +)
        let digits = line.replace(/[^\d+]/g, '');

        // Normalize leading +1 or 1 for US
        let clean = digits.replace(/^(\+?1)?/, '');

        // Check if we have 10 digits left (US standard)
        if (clean.length === 10) {
            validCount++;
            const area = clean.substring(0, 3);
            const prefix = clean.substring(3, 6);
            const lineNum = clean.substring(6, 10);

            if (format === 'us') {
                return `(${area}) ${prefix}-${lineNum}`;
            } else if (format === 'e164') {
                return `+1${clean}`;
            } else if (format === 'dot') {
                return `${area}.${prefix}.${lineNum}`;
            } else if (format === 'international') {
                return `+1 ${area} ${prefix} ${lineNum}`;
            }
        }

        // If not 10 digits, just return original or try general formatting
        // General fallback
        return line + ' (Invalid/Unknown)';
    }).join('\n');

    self.postMessage({
        result,
        count: validCount
    });
};
