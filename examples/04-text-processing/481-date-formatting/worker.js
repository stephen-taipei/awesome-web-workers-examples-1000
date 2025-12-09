self.onmessage = function(e) {
    const { type, text, format } = e.data;

    if (type === 'process') {
        const startTime = performance.now();
        const lines = text.split('\n');
        const results = [];
        const total = lines.length;

        let formatter;
        const now = new Date();

        // Setup formatter
        if (format === 'us') {
            formatter = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } else if (format === 'eu') {
            formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else if (format === 'long') {
            formatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } else if (format === 'full') {
            formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }

        const oneDay = 24 * 60 * 60 * 1000;

        for (let i = 0; i < total; i++) {
            let line = lines[i].trim();
            if (!line) {
                results.push('');
                continue;
            }

            // Parse date
            let date;
            // Check if timestamp (digits only)
            if (/^\d+$/.test(line)) {
                date = new Date(parseInt(line, 10));
            } else {
                date = new Date(line);
            }

            if (isNaN(date.getTime())) {
                results.push('Invalid Date');
                continue;
            }

            // Format
            if (format === 'iso') {
                results.push(date.toISOString().split('T')[0]);
            } else if (format === 'relative') {
                const diff = now - date;
                const days = Math.round(diff / oneDay);

                if (days === 0) results.push('Today');
                else if (days === 1) results.push('Yesterday');
                else if (days === -1) results.push('Tomorrow');
                else if (days > 0) results.push(`${days} days ago`);
                else results.push(`In ${-days} days`);
            } else {
                results.push(formatter.format(date));
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
