self.onmessage = function(e) {
    const { text, mode } = e.data;
    const startTime = performance.now();

    let convertedText = '';

    switch (mode) {
        case 'upper':
            convertedText = text.toUpperCase();
            break;
        case 'lower':
            convertedText = text.toLowerCase();
            break;
        case 'title':
            // Simple Title Case: First letter of every word
            convertedText = text.toLowerCase().replace(/(?:^|\s)\w/g, function(match) {
                return match.toUpperCase();
            });
            break;
        case 'sentence':
            // Sentence Case: First letter of text, and first letter after .!?
            // Convert everything to lower first? Usually safer.
            convertedText = text.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, function(match) {
                return match.toUpperCase();
            });
            break;
        case 'alternating':
            // aLtErNaTiNg
            for (let i = 0; i < text.length; i++) {
                if (i % 2 === 0) {
                    convertedText += text[i].toLowerCase();
                } else {
                    convertedText += text[i].toUpperCase();
                }
            }
            break;
        case 'inverse':
            // iNVERSE -> Inverse
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === char.toUpperCase()) {
                    convertedText += char.toLowerCase();
                } else {
                    convertedText += char.toUpperCase();
                }
            }
            break;
        default:
            convertedText = text;
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        convertedText: convertedText,
        time: endTime - startTime
    });
};
