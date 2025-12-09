self.onmessage = function(e) {
    const urlString = e.data.urls;
    const startTime = performance.now();

    try {
        const result = parseURLs(urlString);
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

function parseURLs(text) {
    const lines = text.split(/\r\n|\n|\r/);
    const results = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        try {
            const url = new URL(line);
            const params = {};
            url.searchParams.forEach((value, key) => {
                params[key] = value;
            });

            results.push({
                original: line,
                protocol: url.protocol,
                host: url.host,
                hostname: url.hostname,
                port: url.port,
                pathname: url.pathname,
                search: url.search,
                hash: url.hash,
                params: params,
                valid: true
            });
        } catch (e) {
            results.push({
                original: line,
                valid: false,
                error: "Invalid URL"
            });
        }
    }

    return results;
}
