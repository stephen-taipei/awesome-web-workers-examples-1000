// 模擬 Profiler
// 在 JS 中沒有真正的採樣 API，我們用儀器化 (Instrumentation) 模擬
// 但只計算 Self Time (扣除子函數調用時間)

const Profiler = {
    stack: [],
    functions: {},

    wrap(name, fn) {
        if (!this.functions[name]) {
            this.functions[name] = { selfTime: 0, totalTime: 0 };
        }

        return function(...args) {
            const start = performance.now();
            Profiler.stack.push({ name, start, childrenTime: 0 });

            const result = fn.apply(this, args);

            const end = performance.now();
            const duration = end - start;
            const current = Profiler.stack.pop();

            // Update stats
            Profiler.functions[name].totalTime += duration;
            const selfTime = duration - current.childrenTime;
            Profiler.functions[name].selfTime += selfTime;

            // Add my duration to parent's childrenTime
            if (Profiler.stack.length > 0) {
                const parent = Profiler.stack[Profiler.stack.length - 1];
                parent.childrenTime += duration;
            }

            return result;
        };
    },

    getHotspots() {
        return Object.entries(this.functions).map(([name, data]) => ({
            name,
            selfTime: data.selfTime
        }));
    }
};

// Functions to profile
function heavyTask() {
    let sum = 0;
    for(let i=0; i<1000000; i++) sum += Math.random();
    return sum;
}

function mediumTask() {
    let str = "";
    for(let i=0; i<1000; i++) str += "a";
    // call heavy task sometimes
    if (Math.random() > 0.5) heavyTask();
    return str.length;
}

function lightTask() {
    return Date.now();
}

function rootTask() {
    for(let i=0; i<10; i++) {
        mediumTask();
        lightTask();
    }
}

// Instrumentation
const heavyWrapped = Profiler.wrap('heavyTask', heavyTask);
// We need to make sure internal calls use wrapped versions.
// Since these are standalone functions, we have to overwrite them in scope or pass them.
// In this simple demo, we just overwrite the variables if possible,
// but since they are declared with function, we can't easily overwrite the hoisting binding cleanly
// without changing the calls inside other functions.
// Let's redefine them as vars for this demo logic.

const logic = {
    heavy: function() {
        let sum = 0;
        for(let i=0; i<500000; i++) sum += Math.random();
        return sum;
    },
    medium: function() {
        let str = "";
        for(let i=0; i<1000; i++) str += "a";
        if (Math.random() > 0.5) this.heavy();
        return str.length;
    },
    light: function() {
        return Date.now();
    },
    root: function() {
        for(let i=0; i<20; i++) {
            this.medium();
            this.light();
        }
    }
};

// Instrument object methods
for (let key in logic) {
    logic[key] = Profiler.wrap(key, logic[key]);
}

self.onmessage = function(e) {
    if (e.data.action === 'run') {
        logic.root();

        self.postMessage({
            type: 'report',
            hotspots: Profiler.getHotspots()
        });
    }
};
