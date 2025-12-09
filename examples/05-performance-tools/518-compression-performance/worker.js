self.onmessage = async function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    // Create a stream from the buffer
    const stream = new Blob([data]).stream();

    // Compress
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));

    // Read result
    const response = new Response(compressedStream);
    const blob = await response.blob();
    const resultBuffer = await blob.arrayBuffer();

    const endTime = performance.now();

    self.postMessage({
        duration: endTime - startTime,
        size: resultBuffer.byteLength
    });
};
