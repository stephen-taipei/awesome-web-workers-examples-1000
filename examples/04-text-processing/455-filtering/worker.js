self.onmessage = function(e) {
    const { text, filterType, filterValue } = e.data;
    const startTime = performance.now();

    // Split lines
    const lines = text.split(/\r?\n/);
    const originalCount = lines.length;
    let filteredLines = [];

    try {
        if (filterType === 'include') {
            const keyword = filterValue.toLowerCase();
            filteredLines = lines.filter(line => line.toLowerCase().includes(keyword));
        }
        else if (filterType === 'exclude') {
            const keyword = filterValue.toLowerCase();
            filteredLines = lines.filter(line => !line.toLowerCase().includes(keyword));
        }
        else if (filterType === 'regex') {
            const regex = new RegExp(filterValue);
            filteredLines = lines.filter(line => regex.test(line));
        }
        else if (filterType === 'regexExclude') {
            const regex = new RegExp(filterValue);
            filteredLines = lines.filter(line => !regex.test(line));
        }

        const result = filteredLines.join('\n');
        const newCount = filteredLines.length;

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            result: result,
            originalCount: originalCount,
            newCount: newCount,
            duration: endTime - startTime
        });

    } catch (err) {
        self.postMessage({
            type: 'error',
            error: err.message
        });
    }
};
