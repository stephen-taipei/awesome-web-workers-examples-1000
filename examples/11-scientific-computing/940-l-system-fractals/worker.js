// L-System Generator

self.onmessage = function(e) {
    const { command, axiom, rules, iterations, angle } = e.data;

    if (command === 'generate') {
        const start = performance.now();
        
        let currentString = axiom;
        
        for (let i = 0; i < iterations; i++) {
            let nextString = "";
            for (let j = 0; j < currentString.length; j++) {
                const char = currentString[j];
                if (rules[char]) {
                    nextString += rules[char];
                } else {
                    nextString += char;
                }
            }
            currentString = nextString;
        }
        
        const end = performance.now();

        // We could compute bounds here to help main thread scaling
        
        self.postMessage({
            type: 'result',
            data: {
                resultString: currentString,
                angle,
                duration: (end - start).toFixed(2)
            }
        });
    }
};
