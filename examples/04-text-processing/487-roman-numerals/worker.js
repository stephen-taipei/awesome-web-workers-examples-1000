self.onmessage = function(e) {
    const { type, text } = e.data;

    if (type === 'process') {
        const startTime = performance.now();
        const lines = text.split('\n');
        const results = [];
        const total = lines.length;

        // Roman Numeral Mapping
        const val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];

        const toRoman = (num) => {
            if (num <= 0 || num >= 4000) return "Out of range (1-3999)";
            let str = '';
            let i = 0;
            while (num > 0) {
                while (num >= val[i]) {
                    num -= val[i];
                    str += syms[i];
                }
                i++;
            }
            return str;
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
                results.push(toRoman(num));
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
