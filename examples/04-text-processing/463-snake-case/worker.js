self.onmessage = function(e) {
    const { text, format } = e.data;
    const startTime = performance.now();

    const lines = text.split(/\n/);
    const convertedLines = lines.map(line => {
        if (!line.trim()) return '';

        // 1. Split by delimiters (space, underscore, hyphen, dot)
        // 2. Also handle CamelCase -> camel Case split?
        // e.g., helloWorld -> hello World

        let processedLine = line.trim();

        // Add space before uppercase letter if it's preceded by lowercase
        processedLine = processedLine.replace(/([a-z])([A-Z])/g, '$1 $2');
        // Handle acronyms: UserID -> User ID
        processedLine = processedLine.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

        const words = processedLine.split(/[\s_\-\.]+/).map(w => w.toLowerCase());

        let separator = '_';
        let transform = w => w;

        switch (format) {
            case 'snake':
                separator = '_';
                break;
            case 'kebab':
                separator = '-';
                break;
            case 'screaming':
                separator = '_';
                transform = w => w.toUpperCase();
                break;
            case 'dot':
                separator = '.';
                break;
        }

        return words.map(transform).join(separator);
    });

    const convertedText = convertedLines.join('\n');

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        convertedText: convertedText,
        time: endTime - startTime
    });
};
