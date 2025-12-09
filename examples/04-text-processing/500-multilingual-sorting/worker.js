self.onmessage = function(e) {
    const { text, locale, numeric } = e.data;

    // Split input
    const items = text.split('\n').filter(line => line.trim().length > 0);

    // Create Collator
    // Worker environment supports Intl.Collator in modern browsers
    const collator = new Intl.Collator(locale, {
        numeric: numeric,
        sensitivity: 'base', // or 'variant' depending on needs
        ignorePunctuation: true
    });

    // Sort
    items.sort(collator.compare);

    self.postMessage({
        result: items.join('\n'),
        count: items.length
    });
};
