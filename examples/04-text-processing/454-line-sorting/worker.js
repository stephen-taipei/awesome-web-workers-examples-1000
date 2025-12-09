self.onmessage = function(e) {
    const { text, sortType } = e.data;
    const startTime = performance.now();

    // Split lines
    let lines = text.split(/\r?\n/);

    // Sorting logic
    switch (sortType) {
        case 'alpha':
            lines.sort((a, b) => a.localeCompare(b));
            break;
        case 'alphaDesc':
            lines.sort((a, b) => b.localeCompare(a));
            break;
        case 'length':
            lines.sort((a, b) => a.length - b.length || a.localeCompare(b));
            break;
        case 'lengthDesc':
            lines.sort((a, b) => b.length - a.length || a.localeCompare(b));
            break;
        case 'numeric':
            lines.sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (isNaN(numA) && isNaN(numB)) return a.localeCompare(b);
                if (isNaN(numA)) return 1;
                if (isNaN(numB)) return -1;
                return numA - numB;
            });
            break;
        case 'numericDesc':
            lines.sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (isNaN(numA) && isNaN(numB)) return b.localeCompare(a);
                if (isNaN(numA)) return 1;
                if (isNaN(numB)) return -1;
                return numB - numA;
            });
            break;
        case 'random':
            shuffle(lines);
            break;
    }

    const result = lines.join('\n');
    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        result: result,
        duration: endTime - startTime
    });
};

// Fisher-Yates Shuffle
function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}
