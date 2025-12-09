self.onmessage = function(e) {
    const { text, width } = e.data;
    const start = performance.now();

    const words = text.split(/\s+/); // Split by whitespace
    let currentLine = "";
    const lines = [];

    words.forEach(word => {
        if (!word) return; // Skip empty words

        if (currentLine.length + word.length + (currentLine.length > 0 ? 1 : 0) <= width) {
            currentLine += (currentLine.length > 0 ? " " : "") + word;
        } else {
            if (currentLine.length > 0) lines.push(currentLine);
            currentLine = word;

            // Handle words longer than width (force split)
            while (currentLine.length > width) {
                lines.push(currentLine.slice(0, width));
                currentLine = currentLine.slice(width);
            }
        }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    const result = lines.join('\n');
    const end = performance.now();
    self.postMessage({ result, time: end - start, lineCount: lines.length });
};
