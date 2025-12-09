self.onmessage = function(e) {
    const { size, pattern } = e.data;
    const results = [];

    // 1. Generate Corpus
    let start = performance.now();
    const corpus = generateCorpus(size);
    let end = performance.now();
    results.push({ test: 'Corpus Generation', matches: size + ' lines', time: end - start });
    self.postMessage({ type: 'progress', percent: 30 });

    let regex;
    switch(pattern) {
        case 'email':
            // A reasonably complex email regex
            regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            break;
        case 'simple':
            regex = /lorem/gi;
            break;
        case 'digits':
            regex = /\d+/g;
            break;
    }

    // 2. Test: match() (Global)
    start = performance.now();
    const matches = corpus.match(regex);
    end = performance.now();
    results.push({ test: 'String.match()', matches: matches ? matches.length : 0, time: end - start });
    self.postMessage({ type: 'progress', percent: 60 });

    // 3. Test: RegExp.exec loop
    start = performance.now();
    let count = 0;
    let m;
    // Reset lastIndex just in case, though new regex instance preferred if not global
    // Using global regex with loop
    const loopRegex = new RegExp(regex);
    while ((m = loopRegex.exec(corpus)) !== null) {
        count++;
    }
    end = performance.now();
    results.push({ test: 'RegExp.exec loop', matches: count, time: end - start });

    self.postMessage({ type: 'complete', results });
};

function generateCorpus(lines) {
    const words = ["lorem", "ipsum", "dolor", "sit", "amet", "test@example.com", "12345", "user.name+tag@gmail.co.uk", "consectetur", "adipiscing", "elit"];
    let result = "";
    for (let i = 0; i < lines; i++) {
        // Construct a random line
        let line = "";
        for (let j = 0; j < 10; j++) {
            line += words[Math.floor(Math.random() * words.length)] + " ";
        }
        result += line + "\n";
    }
    return result;
}
