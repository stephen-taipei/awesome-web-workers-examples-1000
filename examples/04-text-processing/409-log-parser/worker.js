self.onmessage = function(e) {
    const logString = e.data.log;
    const startTime = performance.now();

    try {
        const result = parseLogs(logString);
        const endTime = performance.now();

        self.postMessage({
            result: result,
            time: endTime - startTime
        });
    } catch (err) {
        self.postMessage({
            error: err.toString(),
            time: performance.now() - startTime
        });
    }
};

function parseLogs(text) {
    const lines = text.split(/\r\n|\n|\r/);
    const results = [];

    // Regex for Common Log Format (CLF) and Combined Log Format
    // Format: %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"
    // Groups:
    // 1: IP
    // 2: Identity (usually -)
    // 3: User
    // 4: Date/Time
    // 5: Request Method + Path + Protocol
    // 6: Status Code
    // 7: Size
    // 8: Referer (Optional)
    // 9: User Agent (Optional)
    const logRegex = /^(\S+) (\S+) (\S+) \[([\w:/]+\s[+\-]\d{4})\] "(.+?)" (\d{3}) (\S+)(?: "(.+?)" "(.+?)")?/;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const match = line.match(logRegex);
        if (match) {
            const entry = {
                ip: match[1],
                identity: match[2],
                user: match[3],
                timestamp: match[4],
                request: match[5],
                status: parseInt(match[6]),
                size: match[7] === '-' ? 0 : parseInt(match[7])
            };

            if (match[8]) entry.referer = match[8];
            if (match[9]) entry.userAgent = match[9];

            // Parse request part "METHOD /path HTTP/1.x"
            const reqParts = match[5].split(' ');
            if (reqParts.length >= 2) {
                entry.method = reqParts[0];
                entry.path = reqParts[1];
                if (reqParts.length > 2) entry.protocol = reqParts[2];
            }

            results.push(entry);
        } else {
            // Unmatched line
            results.push({ raw: line, error: "Format not recognized" });
        }
    }

    return results;
}
