/**
 * HTML Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseHTML(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseHTML(html) {
    const startTime = performance.now();

    sendProgress(10, 'Tokenizing HTML...');

    const tokens = tokenize(html);

    sendProgress(40, 'Building DOM tree...');

    const tree = buildTree(tokens);

    sendProgress(70, 'Calculating statistics...');

    const stats = calculateStats(tree);

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            tree: tree,
            duration: endTime - startTime,
            stats: stats
        }
    });
}

function tokenize(html) {
    const tokens = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*?)(\/?)>/g;
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
        // Text before tag
        if (match.index > lastIndex) {
            const text = html.slice(lastIndex, match.index);
            if (text.trim()) {
                tokens.push({ type: 'text', content: text });
            }
        }

        const fullMatch = match[0];
        const tagName = match[1].toLowerCase();
        const attrString = match[2];
        const selfClosing = match[3] === '/' || ['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName);

        if (fullMatch.startsWith('</')) {
            tokens.push({ type: 'close', tag: tagName });
        } else {
            const attributes = parseAttributes(attrString);
            tokens.push({
                type: selfClosing ? 'self-closing' : 'open',
                tag: tagName,
                attributes: attributes
            });
        }

        lastIndex = tagRegex.lastIndex;
    }

    // Remaining text
    if (lastIndex < html.length) {
        const text = html.slice(lastIndex);
        if (text.trim()) {
            tokens.push({ type: 'text', content: text });
        }
    }

    return tokens;
}

function parseAttributes(attrString) {
    const attributes = {};
    const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
        const name = match[1];
        const value = match[2] || match[3] || match[4] || true;
        attributes[name] = value;
    }

    return attributes;
}

function buildTree(tokens) {
    const root = [];
    const stack = [{ children: root }];

    for (const token of tokens) {
        const current = stack[stack.length - 1];

        if (token.type === 'text') {
            current.children.push({
                type: 'text',
                content: token.content
            });
        } else if (token.type === 'open') {
            const node = {
                type: 'element',
                tag: token.tag,
                attributes: token.attributes,
                children: []
            };
            current.children.push(node);
            stack.push(node);
        } else if (token.type === 'self-closing') {
            current.children.push({
                type: 'element',
                tag: token.tag,
                attributes: token.attributes,
                children: []
            });
        } else if (token.type === 'close') {
            // Find matching open tag
            for (let i = stack.length - 1; i > 0; i--) {
                if (stack[i].tag === token.tag) {
                    stack.splice(i);
                    break;
                }
            }
        }
    }

    return root;
}

function calculateStats(tree, depth = 0) {
    let elementCount = 0;
    let maxDepth = depth;

    function traverse(nodes, currentDepth) {
        for (const node of nodes) {
            if (node.type === 'element') {
                elementCount++;
                maxDepth = Math.max(maxDepth, currentDepth);
                if (node.children) {
                    traverse(node.children, currentDepth + 1);
                }
            }
        }
    }

    traverse(tree, 1);

    return { elementCount, maxDepth };
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
