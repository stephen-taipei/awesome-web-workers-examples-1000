/**
 * Log Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseLogs(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseLogs(text) {
    const startTime = performance.now();

    sendProgress(10, 'Splitting lines...');

    const lines = text.split('\n').filter(line => line.trim());

    sendProgress(30, 'Parsing log entries...');

    const entries = [];
    const levelCounts = {};
    const patterns = [
        // Standard format: 2024-01-15 10:23:45 INFO [source] message
        /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|TRACE)\s+\[([^\]]+)\]\s+(.+)$/i,
        // Apache/Nginx style: [timestamp] [level] message
        /^\[([^\]]+)\]\s+\[(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|TRACE)\]\s+(.+)$/i,
        // Simple format: LEVEL: message
        /^(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|TRACE):\s+(.+)$/i
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        let parsed = false;

        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                let entry;

                if (match.length === 5) {
                    // Full format with timestamp, level, source, message
                    entry = {
                        timestamp: match[1],
                        level: match[2].toUpperCase(),
                        source: match[3],
                        message: match[4]
                    };
                } else if (match.length === 4) {
                    // Format with timestamp, level, message (no source)
                    entry = {
                        timestamp: match[1],
                        level: match[2].toUpperCase(),
                        source: '-',
                        message: match[3]
                    };
                } else if (match.length === 3) {
                    // Simple format with just level and message
                    entry = {
                        timestamp: '-',
                        level: match[1].toUpperCase(),
                        source: '-',
                        message: match[2]
                    };
                }

                if (entry) {
                    entries.push(entry);
                    levelCounts[entry.level] = (levelCounts[entry.level] || 0) + 1;
                    parsed = true;
                    break;
                }
            }
        }

        // If no pattern matched, add as raw entry
        if (!parsed && line) {
            entries.push({
                timestamp: '-',
                level: 'INFO',
                source: '-',
                message: line
            });
            levelCounts['INFO'] = (levelCounts['INFO'] || 0) + 1;
        }

        if (i % 100 === 0) {
            const progress = 30 + Math.floor((i / lines.length) * 60);
            sendProgress(progress, `Parsing line ${i + 1} of ${lines.length}...`);
        }
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            entries: entries,
            duration: endTime - startTime,
            stats: {
                totalEntries: entries.length,
                levelCounts: levelCounts
            }
        }
    });
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
