const Counter = {
    counts: {},

    wrap(name, fn) {
        this.counts[name] = 0;
        return function(...args) {
            Counter.counts[name]++;
            return fn.apply(this, args);
        };
    },

    reset() {
        for (let key in this.counts) this.counts[key] = 0;
    }
};

// Simulation Functions
function doMath() {
    return Math.random() * 100;
}

function doString() {
    return "A".repeat(10);
}

function doLogic() {
    return true;
}

function helperA() {
    doMath();
}

function helperB() {
    doString();
    doString();
}

// Wrap functions
const wrappedMath = Counter.wrap('doMath', doMath);
const wrappedString = Counter.wrap('doString', doString);
const wrappedLogic = Counter.wrap('doLogic', doLogic);
const wrappedHelperA = Counter.wrap('helperA', helperA);
const wrappedHelperB = Counter.wrap('helperB', helperB);

self.onmessage = function(e) {
    if (e.data.action === 'run') {
        Counter.reset();

        // Random execution
        const iterations = 100000;
        for (let i = 0; i < iterations; i++) {
            const rand = Math.random();
            if (rand < 0.5) wrappedMath(); // 50%
            else if (rand < 0.8) wrappedLogic(); // 30%
            else wrappedString(); // 20%

            // Nested calls need manual wiring if we want to trace them properly
            // Here we just call wrapped versions
            if (i % 100 === 0) wrappedHelperA(); // 1%
            if (i % 500 === 0) wrappedHelperB(); // 0.2%
        }

        self.postMessage({
            type: 'report',
            counts: Counter.counts
        });
    }
};
