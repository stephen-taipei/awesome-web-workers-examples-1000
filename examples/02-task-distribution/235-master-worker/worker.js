// Master-Worker Pattern - Web Worker (Worker Node)

self.onmessage = function(e) {
    const { taskId, taskType, complexity } = e.data;

    const startTime = performance.now();
    let result;

    switch (taskType) {
        case 'imageRender':
            result = simulateImageRender(taskId, complexity);
            break;
        case 'dataProcess':
            result = simulateDataProcess(taskId, complexity);
            break;
        case 'primeFind':
            result = simulatePrimeFind(taskId, complexity);
            break;
        case 'webCrawl':
            result = simulateWebCrawl(taskId, complexity);
            break;
        default:
            result = { error: 'Unknown task type' };
    }

    const endTime = performance.now();
    result.processingTime = endTime - startTime;

    self.postMessage({
        type: 'complete',
        taskId,
        result
    });
};

function reportProgress(taskId, percent) {
    self.postMessage({
        type: 'progress',
        taskId,
        percent
    });
}

function simulateImageRender(taskId, complexity) {
    const pixelCount = Math.floor(10000 * complexity);
    const pixels = [];

    for (let i = 0; i < pixelCount; i++) {
        // Simulate ray tracing calculations
        const x = i % 100;
        const y = Math.floor(i / 100);

        let color = 0;
        for (let s = 0; s < 10; s++) {
            const rayX = x + Math.random() * 0.5;
            const rayY = y + Math.random() * 0.5;
            color += Math.sin(rayX * 0.1) * Math.cos(rayY * 0.1);
        }

        pixels.push(Math.abs(color / 10));

        if (i % (pixelCount / 10) === 0) {
            reportProgress(taskId, Math.round((i / pixelCount) * 100));
        }
    }

    return {
        taskId,
        type: 'imageRender',
        pixelsRendered: pixelCount,
        avgBrightness: pixels.reduce((a, b) => a + b, 0) / pixels.length
    };
}

function simulateDataProcess(taskId, complexity) {
    const recordCount = Math.floor(5000 * complexity);
    let validRecords = 0;
    let totalValue = 0;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (let i = 0; i < recordCount; i++) {
        // Simulate data validation and transformation
        const rawValue = Math.random() * 1000;
        const isValid = rawValue > 10 && rawValue < 990;

        if (isValid) {
            validRecords++;
            const transformed = Math.log(rawValue) * Math.sqrt(rawValue);
            totalValue += transformed;
            minValue = Math.min(minValue, transformed);
            maxValue = Math.max(maxValue, transformed);
        }

        if (i % (recordCount / 10) === 0) {
            reportProgress(taskId, Math.round((i / recordCount) * 100));
        }
    }

    return {
        taskId,
        type: 'dataProcess',
        recordsProcessed: recordCount,
        validRecords,
        avgValue: totalValue / validRecords,
        range: maxValue - minValue
    };
}

function simulatePrimeFind(taskId, complexity) {
    const rangeSize = Math.floor(50000 * complexity);
    const startNum = Math.floor(Math.random() * 100000) + 2;
    const primes = [];

    for (let n = startNum; n < startNum + rangeSize; n++) {
        if (isPrime(n)) {
            primes.push(n);
        }

        if ((n - startNum) % (rangeSize / 10) === 0) {
            reportProgress(taskId, Math.round(((n - startNum) / rangeSize) * 100));
        }
    }

    return {
        taskId,
        type: 'primeFind',
        rangeStart: startNum,
        rangeEnd: startNum + rangeSize,
        primesFound: primes.length,
        largestPrime: primes.length > 0 ? primes[primes.length - 1] : null
    };
}

function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;

    const sqrt = Math.sqrt(n);
    for (let i = 3; i <= sqrt; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

function simulateWebCrawl(taskId, complexity) {
    const pageCount = Math.floor(10 * complexity);
    const pages = [];

    for (let p = 0; p < pageCount; p++) {
        // Simulate network latency
        const latency = 20 + Math.random() * 80;
        const startWait = performance.now();
        while (performance.now() - startWait < latency) {
            // Busy wait (simulating I/O)
            Math.random();
        }

        // Simulate HTML parsing
        const elements = Math.floor(50 + Math.random() * 200);
        const links = Math.floor(Math.random() * 20);
        const images = Math.floor(Math.random() * 10);

        let textContent = '';
        for (let e = 0; e < elements; e++) {
            textContent += String.fromCharCode(65 + Math.random() * 26);
        }

        pages.push({
            url: `https://example.com/page-${p}`,
            elements,
            links,
            images,
            textLength: textContent.length
        });

        reportProgress(taskId, Math.round(((p + 1) / pageCount) * 100));
    }

    return {
        taskId,
        type: 'webCrawl',
        pagesCrawled: pageCount,
        totalLinks: pages.reduce((s, p) => s + p.links, 0),
        totalImages: pages.reduce((s, p) => s + p.images, 0),
        avgElements: pages.reduce((s, p) => s + p.elements, 0) / pageCount
    };
}
