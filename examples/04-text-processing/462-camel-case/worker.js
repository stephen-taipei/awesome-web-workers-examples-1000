self.onmessage = function(e) {
    const { text, format } = e.data;
    const startTime = performance.now();

    // Logic: Split by non-alphanumeric chars
    // Detect words.

    // Split input into lines or process whole block?
    // Let's assume we want to convert the whole string into ONE camelCase var?
    // Or if the input contains multiple lines/spaces, treat them as separate inputs?
    // Usually "Input Text" implies we might want to convert a sentence "Hello World" -> "helloWorld".
    // If multiple lines, maybe convert each line?
    // Let's convert the entire input into one variable name if possible, or split by line.
    // Given the placeholder "hello_world user-id Get element by id", it looks like a list.

    // Let's process line by line.

    const lines = text.split(/\n/);
    const convertedLines = lines.map(line => {
        if (!line.trim()) return '';

        // Split by space, underscore, hyphen, dot
        const words = line.trim().split(/[\s_\-\.]+/);

        return words.map((word, index) => {
            // Lowercase word first
            let w = word.toLowerCase();

            if (format === 'camel') {
                if (index === 0) return w; // first word lower
                return w.charAt(0).toUpperCase() + w.slice(1);
            } else { // pascal
                return w.charAt(0).toUpperCase() + w.slice(1);
            }
        }).join('');
    });

    const convertedText = convertedLines.join('\n');

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        convertedText: convertedText,
        time: endTime - startTime
    });
};
