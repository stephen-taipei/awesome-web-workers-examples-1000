self.onmessage = function(e) {
    const { text } = e.data;
    const start = performance.now();

    // Title Case Logic
    // Capitalize the first letter of each word and lowercase the rest
    // A word is defined as a sequence of alphanumeric characters
    // Or we can just use regex to find word boundaries

    // Simple regex approach:
    // \b\w matches a word character at a word boundary
    // But we also need to lowercase the rest of the word.

    // Better approach: lower case everything first, then capitalize start of words.
    // Note: This might not handle complex cases like "McDonald" correctly, but standard Title Case usually does this.

    const result = text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });

    const end = performance.now();
    self.postMessage({ result, time: end - start });
};
