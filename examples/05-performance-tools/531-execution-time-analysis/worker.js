// 簡易 Profiler 實作
const Profiler = {
    data: {},

    // 包裝函數以進行計時
    wrap(name, fn) {
        if (!this.data[name]) {
            this.data[name] = { calls: 0, total: 0 };
        }

        return function(...args) {
            const start = performance.now();
            const result = fn.apply(this, args);
            const end = performance.now();

            Profiler.data[name].calls++;
            Profiler.data[name].total += (end - start);

            return result;
        };
    },

    reset() {
        this.data = {};
    },

    getReport() {
        return this.data;
    }
};

// 模擬業務邏輯函數
const Task = {
    heavyCalculation: function(n) {
        let res = 0;
        for (let i = 0; i < n; i++) {
            res += Math.sqrt(i);
        }
        return res;
    },

    stringProcessing: function(str) {
        return str.split('').reverse().join('').toUpperCase();
    },

    randomDelay: function() {
        // Busy wait
        const start = performance.now();
        while (performance.now() - start < 10) {}
    },

    main: function() {
        for (let i = 0; i < 5; i++) {
            this.heavyCalculation(1000000);
            this.randomDelay();
            for (let j = 0; j < 10; j++) {
                this.stringProcessing("Hello World " + j);
            }
        }
    }
};

// Instrumentation (手動包裝需要分析的函數)
// 也可以遍歷物件屬性自動包裝
for (const key in Task) {
    if (typeof Task[key] === 'function') {
        Task[key] = Profiler.wrap(`Task.${key}`, Task[key]);
    }
}

self.onmessage = function(e) {
    if (e.data.action === 'run') {
        Profiler.reset();

        // 執行任務
        Task.main();

        // 回傳報告
        self.postMessage({
            type: 'report',
            report: Profiler.getReport()
        });
    }
};
