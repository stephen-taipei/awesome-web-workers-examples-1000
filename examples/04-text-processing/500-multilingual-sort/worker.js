function multilingualSort(items, options) {
    const {
        locale,
        sensitivity,
        order,
        numeric,
        ignorePunctuation,
        caseFirst
    } = options;

    // Create collator with specified options
    const collatorOptions = {
        sensitivity: sensitivity,
        numeric: numeric,
        ignorePunctuation: ignorePunctuation
    };

    if (caseFirst !== 'false') {
        collatorOptions.caseFirst = caseFirst;
    }

    const collator = new Intl.Collator(locale, collatorOptions);

    // Create a copy to sort
    const sorted = [...items];

    // Sort using collator
    sorted.sort((a, b) => {
        const result = collator.compare(a, b);
        return order === 'desc' ? -result : result;
    });

    // Also get default sorted for comparison
    const defaultSorted = [...items].sort();
    if (order === 'desc') {
        defaultSorted.reverse();
    }

    return {
        sorted,
        defaultSorted
    };
}

self.onmessage = function(e) {
    const { type, items, options } = e.data;

    if (type === 'sort') {
        const startTime = performance.now();

        self.postMessage({
            type: 'progress',
            data: { progress: 0.3 }
        });

        const { sorted, defaultSorted } = multilingualSort(items, options);

        self.postMessage({
            type: 'progress',
            data: { progress: 0.9 }
        });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                sorted: sorted,
                defaultSorted: defaultSorted,
                count: items.length,
                locale: options.locale,
                time: endTime - startTime
            }
        });
    }
};
