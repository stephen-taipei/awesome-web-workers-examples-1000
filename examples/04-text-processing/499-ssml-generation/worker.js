self.onmessage = function(e) {
    const { text, rate, pitch } = e.data;

    // Basic SSML Generation
    // Wraps paragraphs in <p>, sentences in <s> (heuristic)
    // Applies prosody settings globally

    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">\n`;

    // Apply global prosody
    ssml += `  <prosody rate="${rate}" pitch="${pitch}">\n`;

    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    let tagsAdded = 2; // speak, prosody

    paragraphs.forEach(para => {
        ssml += `    <p>\n`;
        tagsAdded++;

        // Split sentences roughly
        const sentences = para.match(/[^.!?]+[.!?]*/g) || [para];

        sentences.forEach(sent => {
            // Check for pauses (commas) to add breaks?
            // For now just wrap in <s>
            let content = escapeXml(sent.trim());

            // Add breaks for long pauses?
            // content = content.replace(/, /g, ', <break time="300ms"/> ');

            ssml += `      <s>${content}</s>\n`;
            tagsAdded++;
        });

        ssml += `    </p>\n`;
    });

    ssml += `  </prosody>\n`;
    ssml += `</speak>`;

    self.postMessage({
        ssml,
        tags: tagsAdded
    });
};

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}
