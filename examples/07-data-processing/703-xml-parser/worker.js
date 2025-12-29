/**
 * XML Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseXML(payload.xmlString);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseXML(xmlString) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Parsing XML...');

        // Simple XML parser for worker (no DOMParser in workers)
        const result = parseXMLToJson(xmlString);

        sendProgress(90, 'Finalizing...');
        const duration = performance.now() - startTime;

        sendResult({ json: result.json, stats: result.stats, duration });
    } catch (error) {
        sendError('XML parse error: ' + error.message);
    }
}

function parseXMLToJson(xmlString) {
    const stats = { elements: 0, attributes: 0, textNodes: 0, maxDepth: 0 };

    function parseElement(xml, depth) {
        stats.maxDepth = Math.max(stats.maxDepth, depth);

        // Remove XML declaration
        xml = xml.replace(/<\?xml[^?]*\?>/g, '').trim();

        // Match opening tag
        const tagMatch = xml.match(/^<(\w+)([^>]*)>/);
        if (!tagMatch) {
            const text = xml.trim();
            if (text && !text.startsWith('<')) {
                stats.textNodes++;
                return { '#text': text };
            }
            return null;
        }

        const tagName = tagMatch[1];
        const attrString = tagMatch[2];
        stats.elements++;

        const obj = {};

        // Parse attributes
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
            if (!obj['@attributes']) obj['@attributes'] = {};
            obj['@attributes'][attrMatch[1]] = attrMatch[2];
            stats.attributes++;
        }

        // Find closing tag
        const closingTag = `</${tagName}>`;
        const selfClosing = attrString.endsWith('/');

        if (selfClosing) {
            return { [tagName]: obj };
        }

        const contentStart = tagMatch[0].length;
        const closingIndex = xml.lastIndexOf(closingTag);

        if (closingIndex === -1) {
            return { [tagName]: obj };
        }

        const content = xml.substring(contentStart, closingIndex).trim();

        if (content) {
            // Parse child elements
            const children = parseChildren(content, depth + 1);
            Object.assign(obj, children);
        }

        return { [tagName]: obj };
    }

    function parseChildren(content, depth) {
        const result = {};
        let remaining = content.trim();
        let processed = 0;

        while (remaining) {
            // Check for text node
            if (!remaining.startsWith('<')) {
                const nextTagIndex = remaining.indexOf('<');
                if (nextTagIndex === -1) {
                    const text = remaining.trim();
                    if (text) {
                        result['#text'] = text;
                        stats.textNodes++;
                    }
                    break;
                }
                const text = remaining.substring(0, nextTagIndex).trim();
                if (text) {
                    result['#text'] = text;
                    stats.textNodes++;
                }
                remaining = remaining.substring(nextTagIndex);
            }

            // Parse element
            const tagMatch = remaining.match(/^<(\w+)([^>]*?)(\/?)\s*>/);
            if (!tagMatch) break;

            const tagName = tagMatch[1];
            const isSelfClosing = tagMatch[3] === '/';

            stats.elements++;

            if (isSelfClosing) {
                const elemObj = {};
                const attrRegex = /(\w+)="([^"]*)"/g;
                let attrMatch;
                while ((attrMatch = attrRegex.exec(tagMatch[2])) !== null) {
                    if (!elemObj['@attributes']) elemObj['@attributes'] = {};
                    elemObj['@attributes'][attrMatch[1]] = attrMatch[2];
                    stats.attributes++;
                }

                if (result[tagName]) {
                    if (!Array.isArray(result[tagName])) {
                        result[tagName] = [result[tagName]];
                    }
                    result[tagName].push(elemObj);
                } else {
                    result[tagName] = elemObj;
                }

                remaining = remaining.substring(tagMatch[0].length).trim();
                continue;
            }

            // Find matching closing tag
            const closingTag = `</${tagName}>`;
            let nestLevel = 1;
            let searchIndex = tagMatch[0].length;

            while (nestLevel > 0 && searchIndex < remaining.length) {
                const nextOpen = remaining.indexOf(`<${tagName}`, searchIndex);
                const nextClose = remaining.indexOf(closingTag, searchIndex);

                if (nextClose === -1) break;

                if (nextOpen !== -1 && nextOpen < nextClose) {
                    nestLevel++;
                    searchIndex = nextOpen + tagName.length + 1;
                } else {
                    nestLevel--;
                    if (nestLevel === 0) {
                        const elemContent = remaining.substring(tagMatch[0].length, nextClose);
                        const elemObj = {};

                        const attrRegex = /(\w+)="([^"]*)"/g;
                        let attrMatch;
                        while ((attrMatch = attrRegex.exec(tagMatch[2])) !== null) {
                            if (!elemObj['@attributes']) elemObj['@attributes'] = {};
                            elemObj['@attributes'][attrMatch[1]] = attrMatch[2];
                            stats.attributes++;
                        }

                        if (elemContent.trim()) {
                            const children = parseChildren(elemContent, depth + 1);
                            Object.assign(elemObj, children);
                        }

                        if (result[tagName]) {
                            if (!Array.isArray(result[tagName])) {
                                result[tagName] = [result[tagName]];
                            }
                            result[tagName].push(elemObj);
                        } else {
                            result[tagName] = elemObj;
                        }

                        remaining = remaining.substring(nextClose + closingTag.length).trim();
                    }
                    searchIndex = nextClose + closingTag.length;
                }
            }

            processed++;
            if (processed % 100 === 0) {
                sendProgress(10 + Math.min(processed / 10, 70), `Processing elements... (${processed})`);
            }

            if (nestLevel > 0) break;
        }

        return result;
    }

    const json = parseElement(xmlString, 0);
    return { json, stats };
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

function sendResult(data) {
    self.postMessage({ type: 'RESULT', payload: data });
}

function sendError(message) {
    self.postMessage({ type: 'ERROR', payload: { message } });
}
