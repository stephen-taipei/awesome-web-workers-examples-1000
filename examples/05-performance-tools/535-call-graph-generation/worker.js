// 追蹤呼叫關係
const Tracer = {
    stack: [],
    root: { name: 'root', children: [], count: 1 },

    wrap(name, fn) {
        return function(...args) {
            const current = Tracer.stack.length > 0 ? Tracer.stack[Tracer.stack.length - 1] : Tracer.root;

            // Find or create child node
            let node = current.children.find(c => c.name === name);
            if (!node) {
                node = { name, children: [], count: 0 };
                current.children.push(node);
            }
            node.count++;

            Tracer.stack.push(node);
            const result = fn.apply(this, args);
            Tracer.stack.pop();

            return result;
        };
    }
};

const logic = {
    a: function() { this.b(); this.c(); },
    b: function() { this.d(); },
    c: function() { this.d(); },
    d: function() { /* leaf */ }
};

for (let key in logic) {
    logic[key] = Tracer.wrap(key, logic[key]);
}

self.onmessage = function(e) {
    if (e.data.action === 'run') {
        // Clear previous runs structure if needed, or accumulate
        // For simplicity we create a fresh root for each run
        Tracer.root = { name: 'Task', children: [], count: 1 };
        Tracer.stack = [];

        logic.a();

        self.postMessage({
            type: 'graph',
            root: Tracer.root
        });
    }
};
