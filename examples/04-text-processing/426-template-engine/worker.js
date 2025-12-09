// Template Engine Worker
// Implements a simple Mustache-like syntax
// Supported features:
// {{ key }} - Variable interpolation
// {{#each key}} ... {{/each}} - Array iteration (simple)
// {{ key.subkey }} - Nested access

self.onmessage = function(e) {
    const { template, data } = e.data;

    try {
        const startTime = performance.now();

        const result = render(template, data);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: { result },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function render(template, data) {
    let output = template;

    // 1. Handle {{#each key}} ... {{/each}} blocks
    // We match nested regex is hard, assume non-nested for simplicity or use loop.
    // Regex: /\{\{#each\s+([\w\.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g

    output = output.replace(/\{\{#each\s+([\w\.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, content) => {
        const arr = getValue(data, key);
        if (!Array.isArray(arr)) return '';

        return arr.map(item => {
            // Render the inner content with the item as context
            // Also support {{.}} for primitives
            return render(content, item);
        }).join('');
    });

    // 2. Handle {{ key }} variables
    output = output.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (match, key) => {
        // Handle escaped curlies like \{{ (not implemented here, assumes valid input)
        const val = getValue(data, key);
        return val !== undefined ? val : '';
    });

    return output;
}

function getValue(obj, path) {
    if (path === '.') return obj;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }

    return current;
}
