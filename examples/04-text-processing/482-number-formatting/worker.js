self.onmessage = function(e) {
    const { type, text, locale, options } = e.data;

    if (type === 'process') {
        const startTime = performance.now();
        const lines = text.split('\n');
        const results = [];
        const total = lines.length;

        // Cache the formatter
        const formatter = new Intl.NumberFormat(locale, options);

        for (let i = 0; i < total; i++) {
            let line = lines[i].trim();
            if (!line) {
                results.push('');
                continue;
            }

            const num = parseFloat(line);

            if (isNaN(num)) {
                results.push('NaN');
            } else {
                results.push(formatter.format(num));
            }

            if (i % 2000 === 0) {
                self.postMessage({
                    type: 'progress',
                    progress: i / total
                });
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            output: results.join('\n'),
            count: total,
            time: endTime - startTime
        });
    }
};
