self.onmessage = function(e) {
    const { text, style } = e.data;

    // Parse lines to tree
    const lines = text.split('\n');
    const root = { name: 'root', children: [], level: -1 };
    let stack = [root];
    let totalNodes = 0;
    let maxDepth = 0;

    // Heuristic to detect indent size? Or just count spaces
    // Let's assume indentation implies hierarchy.

    for (let line of lines) {
        if (!line.trim()) continue;

        // Count leading spaces/tabs
        const match = line.match(/^(\s*)(.*)/);
        const indentStr = match[1];
        const content = match[2];

        // Calculate level. Simple approach: 2 spaces = 1 level, or tab = 1 level.
        // Better: store previous indent strings to handle mixed?
        // Let's use simple length based on first non-zero indent
        let level = 0;
        if (indentStr.includes('\t')) {
            level = indentStr.length;
        } else {
            level = Math.floor(indentStr.length / 2); // Assume 2 spaces
        }

        const node = { name: content, children: [], level: level };
        totalNodes++;
        if (level > maxDepth) maxDepth = level;

        // Find parent
        // Stack should look like [Level -1, Level 0, Level 1, ...]
        // We want to attach to the last node with level < current level

        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];
        parent.children.push(node);
        stack.push(node);
    }

    // Format Output
    let result = '';

    if (style === 'json') {
        result = JSON.stringify(root.children, (key, value) => {
            if (key === 'level') return undefined; // remove internal level prop
            return value;
        }, 2);
    } else if (style === 'html') {
        function toHtml(nodes) {
            if (!nodes.length) return '';
            let s = '<ul>\n';
            for (let node of nodes) {
                s += `  <li>${escapeHtml(node.name)}`;
                if (node.children.length) s += '\n' + toHtml(node.children).replace(/^/gm, '    ');
                s += '</li>\n';
            }
            s += '</ul>';
            return s;
        }
        result = toHtml(root.children);
    } else {
        // ASCII / Directory
        // Recursively print
        function toAscii(nodes, prefix = '', isLast = true) {
            let str = '';
            nodes.forEach((node, i) => {
                const lastChild = i === nodes.length - 1;
                const connector = lastChild ? '└── ' : '├── ';

                str += prefix + connector + node.name + '\n';

                const childPrefix = prefix + (lastChild ? '    ' : '│   ');
                if (node.children.length > 0) {
                    str += toAscii(node.children, childPrefix, lastChild);
                }
            });
            return str;
        }
        result = toAscii(root.children);
    }

    self.postMessage({
        result,
        nodes: totalNodes,
        maxDepth
    });
};

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;");
}
