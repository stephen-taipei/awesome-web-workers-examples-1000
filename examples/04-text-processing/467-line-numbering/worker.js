self.onmessage = function(e) {
    const { text, startNum, padWidth, separator } = e.data;
    const start = performance.now();

    const lines = text.split('\n');
    const processedLines = lines.map((line, index) => {
        const num = (startNum + index).toString();
        // Pad the number with spaces on the left
        const paddedNum = num.padStart(padWidth, ' ');
        return `${paddedNum}${separator}${line}`;
    });

    const result = processedLines.join('\n');
    const end = performance.now();
    self.postMessage({ result, time: end - start, lineCount: lines.length });
};
