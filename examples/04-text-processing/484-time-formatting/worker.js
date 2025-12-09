self.onmessage = function(e) {
    const { type, text, format, locale } = e.data;

    if (type === 'process') {
        const startTime = performance.now();
        const lines = text.split('\n');
        const results = [];
        const total = lines.length;
        const now = Date.now();

        let rtf;
        try {
            rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        } catch (e) {
            rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        }

        // Time formatters
        const time12 = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric', hour12: true });
        const time24 = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric', hour12: false });

        for (let i = 0; i < total; i++) {
            let line = lines[i].trim();
            if (!line) {
                results.push('');
                continue;
            }

            const val = parseFloat(line);
            if (isNaN(val)) {
                results.push('NaN');
                continue;
            }

            if (format === 'relative') {
                const diffMs = val - now;
                const diffSec = Math.round(diffMs / 1000);
                const diffMin = Math.round(diffSec / 60);
                const diffHour = Math.round(diffMin / 60);
                const diffDay = Math.round(diffHour / 24);

                if (Math.abs(diffSec) < 60) results.push(rtf.format(diffSec, 'second'));
                else if (Math.abs(diffMin) < 60) results.push(rtf.format(diffMin, 'minute'));
                else if (Math.abs(diffHour) < 24) results.push(rtf.format(diffHour, 'hour'));
                else results.push(rtf.format(diffDay, 'day'));

            } else if (format === 'duration') {
                // val is duration in ms
                const seconds = Math.floor((val / 1000) % 60);
                const minutes = Math.floor((val / (1000 * 60)) % 60);
                const hours = Math.floor((val / (1000 * 60 * 60)));

                const pad = (n) => n.toString().padStart(2, '0');
                results.push(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);

            } else if (format === 'clock12') {
                results.push(time12.format(new Date(val)));
            } else if (format === 'clock24') {
                results.push(time24.format(new Date(val)));
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
