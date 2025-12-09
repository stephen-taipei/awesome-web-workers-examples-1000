self.onmessage = function(e) {
    const { type, text, style } = e.data;

    if (type === 'process') {
        const startTime = performance.now();
        const lines = text.split('\n');
        const results = [];
        const total = lines.length;

        // Simple regex to parse standard US-like addresses
        // This is a naive implementation for demonstration
        // e.g. "123 Main St, City, ST 12345"
        const addressRegex = /^(\d+\s+[^,]+)(?:,\s*|\s+)([^,]+)(?:,\s*|\s+)([A-Za-z]{2})(?:\s*)(\d{5}(?:-\d{4})?)?$/;

        // Helper to capitalize words
        const capitalize = (str) => str.replace(/\b\w/g, c => c.toUpperCase());

        // Helper to expand street types
        const expandStreet = (str) => {
            const replacements = {
                'st': 'Street', 'st.': 'Street',
                'ave': 'Avenue', 'ave.': 'Avenue',
                'rd': 'Road', 'rd.': 'Road',
                'dr': 'Drive', 'dr.': 'Drive',
                'ln': 'Lane', 'ln.': 'Lane',
                'ct': 'Court', 'ct.': 'Court',
                'blvd': 'Boulevard', 'blvd.': 'Boulevard'
            };
            return str.replace(/\b(st|ave|rd|dr|ln|ct|blvd)\.?\b/gi, match => {
                const lower = match.toLowerCase().replace('.', '');
                return replacements[lower] || match;
            });
        };

        for (let i = 0; i < total; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            // Basic cleanup
            line = line.replace(/\s+/g, ' ');

            let parsed = null;
            // Try to parse
            const match = line.match(addressRegex);

            if (match) {
                let [_, street, city, state, zip] = match;

                // Format components
                street = capitalize(expandStreet(street.toLowerCase()));
                city = capitalize(city.toLowerCase());
                state = state.toUpperCase();
                zip = zip || '';

                parsed = { street, city, state, zip };
            } else {
                // Fallback: try comma split if regex failed
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 3) {
                    const street = capitalize(expandStreet(parts[0].toLowerCase()));
                    const city = capitalize(parts[1].toLowerCase());
                    // Last part might have state and zip
                    const last = parts[parts.length - 1];
                    const stateMatch = last.match(/([A-Za-z]{2})/);
                    const zipMatch = last.match(/(\d{5})/);

                    const state = stateMatch ? stateMatch[1].toUpperCase() : '';
                    const zip = zipMatch ? zipMatch[1] : '';

                    parsed = { street, city, state, zip };
                } else {
                    // Cannot parse, keep original but cleaned
                    parsed = { raw: line };
                }
            }

            // Output Formatting
            if (parsed.raw) {
                results.push(parsed.raw);
            } else {
                if (style === 'json') {
                    results.push(JSON.stringify(parsed));
                } else if (style === 'multiline') {
                    results.push(`${parsed.street}\n${parsed.city}, ${parsed.state} ${parsed.zip}\n`);
                } else { // standard
                    results.push(`${parsed.street}, ${parsed.city}, ${parsed.state} ${parsed.zip}`);
                }
            }

            if (i % 500 === 0) {
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
