self.onmessage = function(e) {
    const { text, mode, indentType, amount } = e.data;
    const start = performance.now();

    const char = indentType === 'tab' ? '\t' : ' ';
    const indentString = char.repeat(amount);

    const lines = text.split('\n');
    const processedLines = lines.map(line => {
        if (mode === 'add') {
            return indentString + line;
        } else if (mode === 'remove') {
            // Remove indentation up to 'amount' chars from start
            // Need to handle mixed tabs/spaces carefully?
            // For simple implementation, we remove strictly matching leading chars if possible,
            // or just use Regex to remove up to N specific chars.

            // Regex approach: match ^(\s{0,amount})(.*)
            // But we specifically want to remove the 'indentString' pattern repeats?
            // "Remove Indent" usually means un-indent.
            // If user selects "Space" count 2, we remove up to 2 leading spaces.

            // Construct regex for leading char
            // Special case for tab which needs escaping in regex if not carefully handled, but \t is fine.
            const escapedChar = indentType === 'tab' ? '\\t' : ' ';
            const regex = new RegExp(`^${escapedChar}{0,${amount}}`);
            return line.replace(regex, '');
        }
        return line;
    });

    const result = processedLines.join('\n');
    const end = performance.now();
    self.postMessage({ result, time: end - start, lineCount: lines.length });
};
