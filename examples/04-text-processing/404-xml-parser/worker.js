/**
 * XML Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseXML(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseXML(xml) {
    const startTime = performance.now();

    sendProgress(10, 'Tokenizing XML...');

    // Remove XML declaration and comments
    xml = xml.replace(/<\?xml[^?]*\?>/g, '');
    xml = xml.replace(/<!--[\s\S]*?-->/g, '');

    sendProgress(30, 'Parsing elements...');

    const parsed = parseElement(xml.trim());

    sendProgress(60, 'Analyzing structure...');

    const stats = calculateStats(parsed);

    sendProgress(80, 'Formatting output...');

    const result = formatXMLTree(parsed, 0);

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: endTime - startTime,
            stats: stats
        }
    });
}

function parseElement(xml) {
    const elements = [];
    const tagRegex = /<([a-zA-Z][\w:-]*)([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
    let match;

    while ((match = tagRegex.exec(xml)) !== null) {
        const tagName = match[1];
        const attrString = match[2];
        const innerContent = match[3];

        const element = {
            tag: tagName,
            attributes: parseAttributes(attrString),
            children: [],
            text: ''
        };

        if (innerContent !== undefined) {
            // Check for nested elements
            const hasNestedTags = /<[a-zA-Z]/.test(innerContent);
            if (hasNestedTags) {
                element.children = parseElement(innerContent);
            }

            // Extract text content (non-tag content)
            const textContent = innerContent.replace(/<[^>]+>/g, '').trim();
            if (textContent) {
                element.text = textContent;
            }
        }

        elements.push(element);
    }

    return elements;
}

function parseAttributes(attrString) {
    const attributes = {};
    const attrRegex = /([a-zA-Z][\w:-]*)=["']([^"']*)["']/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
        attributes[match[1]] = match[2];
    }

    return attributes;
}

function calculateStats(elements, depth = 1) {
    let elementCount = 0;
    let attributeCount = 0;
    let maxDepth = depth;

    function traverse(nodes, currentDepth) {
        for (const node of nodes) {
            elementCount++;
            attributeCount += Object.keys(node.attributes).length;
            maxDepth = Math.max(maxDepth, currentDepth);

            if (node.children.length > 0) {
                traverse(node.children, currentDepth + 1);
            }
        }
    }

    traverse(elements, 1);

    return { elementCount, attributeCount, maxDepth };
}

function formatXMLTree(elements, indent) {
    const lines = [];
    const prefix = '  '.repeat(indent);

    for (const element of elements) {
        let line = `${prefix}<${element.tag}`;

        // Add attributes
        for (const [key, value] of Object.entries(element.attributes)) {
            line += ` ${key}="${value}"`;
        }

        if (element.children.length === 0 && !element.text) {
            line += ' />';
            lines.push(line);
        } else {
            line += '>';

            if (element.text && element.children.length === 0) {
                line += element.text + `</${element.tag}>`;
                lines.push(line);
            } else {
                lines.push(line);

                if (element.text) {
                    lines.push(`${prefix}  ${element.text}`);
                }

                if (element.children.length > 0) {
                    lines.push(formatXMLTree(element.children, indent + 1));
                }

                lines.push(`${prefix}</${element.tag}>`);
            }
        }
    }

    return lines.join('\n');
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
