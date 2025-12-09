self.onmessage = function(e) {
    const { type, text, category, from, to } = e.data;

    if (type === 'process') {
        const startTime = performance.now();
        const lines = text.split('\n');
        const results = [];
        const total = lines.length;

        // Define conversion logic
        // Base units: m, kg, c, m2, l
        const factors = {
            length: {
                m: 1, km: 1000, cm: 0.01, mm: 0.001,
                ft: 0.3048, in: 0.0254, yd: 0.9144, mi: 1609.34
            },
            weight: {
                kg: 1, g: 0.001, mg: 0.000001,
                lb: 0.453592, oz: 0.0283495
            },
            area: {
                m2: 1, km2: 1000000,
                ft2: 0.092903, ac: 4046.86, ha: 10000
            },
            volume: {
                l: 1, ml: 0.001, m3: 1000,
                gal: 3.78541
            }
        };

        // Temperature is special (affine)
        const convertTemp = (val, f, t) => {
            if (f === t) return val;
            let celsius;
            if (f === 'c') celsius = val;
            else if (f === 'f') celsius = (val - 32) * 5/9;
            else if (f === 'k') celsius = val - 273.15;

            if (t === 'c') return celsius;
            if (t === 'f') return celsius * 9/5 + 32;
            if (t === 'k') return celsius + 273.15;
            return val;
        };

        const convertLinear = (val, cat, f, t) => {
            const base = val * factors[cat][f];
            return base / factors[cat][t];
        };

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

            let res;
            if (category === 'temperature') {
                res = convertTemp(val, from, to);
            } else {
                res = convertLinear(val, category, from, to);
            }

            // Format output (e.g. 4 decimal places max for cleanliness)
            results.push(parseFloat(res.toFixed(6)));

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
