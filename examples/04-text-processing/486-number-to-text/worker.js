self.onmessage = function(e) {
    const { type, text } = e.data;

    if (type === 'process') {
        const startTime = performance.now();
        const lines = text.split('\n');
        const results = [];
        const total = lines.length;

        // Number to Words Logic
        const ONES = ['','one','two','three','four','five','six','seven','eight','nine',
                      'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
                      'seventeen','eighteen','nineteen'];
        const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
        const SCALES = ['','thousand','million','billion','trillion','quadrillion'];

        const numToWords = (n) => {
            if (n === 0) return 'zero';
            if (n < 0) return 'minus ' + numToWords(-n);

            let str = '';
            let scaleIndex = 0;

            while (n > 0) {
                const chunk = n % 1000;
                if (chunk > 0) {
                    const chunkStr = chunkToWords(chunk);
                    const scaleStr = SCALES[scaleIndex];
                    if (scaleStr) {
                        str = chunkStr + ' ' + scaleStr + (str ? ' ' + str : '');
                    } else {
                        str = chunkStr + (str ? ' ' + str : '');
                    }
                }
                n = Math.floor(n / 1000);
                scaleIndex++;
            }
            return str.trim();
        };

        const chunkToWords = (n) => {
            let s = '';
            // Hundreds
            const h = Math.floor(n / 100);
            const rem = n % 100;

            if (h > 0) {
                s += ONES[h] + ' hundred';
                if (rem > 0) s += ' ';
            }

            if (rem > 0) {
                if (rem < 20) {
                    s += ONES[rem];
                } else {
                    const t = Math.floor(rem / 10);
                    const o = rem % 10;
                    s += TENS[t];
                    if (o > 0) s += '-' + ONES[o];
                }
            }
            return s;
        };

        for (let i = 0; i < total; i++) {
            let line = lines[i].trim();
            if (!line) {
                results.push('');
                continue;
            }

            const num = parseInt(line, 10);

            if (isNaN(num)) {
                results.push('NaN');
            } else {
                results.push(numToWords(num));
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
