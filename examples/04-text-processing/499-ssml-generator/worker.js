function generateSSML(text, options) {
    let ssml = text;
    let tagCount = 0;

    // Escape XML special characters first (but not our markers)
    ssml = ssml
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Handle emphasis (*text*)
    if (options.addEmphasis) {
        ssml = ssml.replace(/\*([^*]+)\*/g, (_, content) => {
            tagCount++;
            return `<emphasis level="strong">${content}</emphasis>`;
        });
    }

    // Handle say-as for various patterns
    if (options.sayAs) {
        // Dates (MM/DD/YYYY or DD/MM/YYYY)
        ssml = ssml.replace(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g, (match) => {
            tagCount++;
            return `<say-as interpret-as="date" format="mdy">${match}</say-as>`;
        });

        // Currency
        ssml = ssml.replace(/\$[\d,]+\.?\d*/g, (match) => {
            tagCount++;
            return `<say-as interpret-as="currency">${match}</say-as>`;
        });

        // Phone numbers
        ssml = ssml.replace(/\b\d{1,3}-\d{3}-\d{3,4}(-\d{4})?\b/g, (match) => {
            tagCount++;
            return `<say-as interpret-as="telephone">${match}</say-as>`;
        });

        // Ordinals (1st, 2nd, 3rd, etc.)
        ssml = ssml.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, num, suffix) => {
            tagCount++;
            return `<say-as interpret-as="ordinal">${num}</say-as>`;
        });

        // Time
        ssml = ssml.replace(/\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm))?)\b/g, (match) => {
            tagCount++;
            return `<say-as interpret-as="time">${match}</say-as>`;
        });
    }

    // Handle breaks
    if (options.addBreaks) {
        // Ellipsis
        ssml = ssml.replace(/\.\.\.+/g, () => {
            tagCount++;
            return '<break time="750ms"/>';
        });

        // Paragraph breaks (double newline)
        ssml = ssml.replace(/\n\n+/g, () => {
            tagCount++;
            return '\n<break time="1s"/>\n';
        });

        // Sentence breaks (period, exclamation, question)
        ssml = ssml.replace(/([.!?])\s+/g, (match, punct) => {
            tagCount++;
            const time = punct === '.' ? '500ms' : '400ms';
            return `${punct}<break time="${time}"/> `;
        });

        // Comma pauses
        ssml = ssml.replace(/,\s+/g, () => {
            tagCount++;
            return ', <break time="200ms"/>';
        });

        // Colon pauses
        ssml = ssml.replace(/:\s+/g, () => {
            tagCount++;
            return ': <break time="300ms"/>';
        });

        // Dash pauses
        ssml = ssml.replace(/\s+-\s+/g, () => {
            tagCount++;
            return ' <break time="300ms"/> ';
        });
    }

    // Wrap in speak tag with optional voice and prosody
    let wrapper = '<speak';

    // Add xmlns for compatibility
    wrapper += ' xmlns="http://www.w3.org/2001/10/synthesis"';
    wrapper += ' xmlns:mstts="http://www.w3.org/2001/mstts"';
    wrapper += ' version="1.0"';
    wrapper += ' xml:lang="en-US"';
    wrapper += '>\n';

    let content = ssml;

    // Add voice wrapper if specified
    if (options.voice) {
        content = `  <voice name="${options.voice}">\n${indent(content, 4)}\n  </voice>`;
        tagCount++;
    }

    // Add prosody wrapper if specified
    if (options.addProsody && options.rate) {
        content = `  <prosody rate="${options.rate}">\n${indent(content, 4)}\n  </prosody>`;
        tagCount++;
    }

    ssml = wrapper + (options.voice || options.rate ? content : '  ' + content.replace(/\n/g, '\n  ')) + '\n</speak>';

    return {
        ssml: ssml,
        tagCount: tagCount,
        originalLength: text.length,
        ssmlLength: ssml.length
    };
}

function indent(text, spaces) {
    const pad = ' '.repeat(spaces);
    return text.split('\n').map(line => pad + line).join('\n');
}

self.onmessage = function(e) {
    const { type, text, options } = e.data;

    if (type === 'generate') {
        self.postMessage({
            type: 'progress',
            data: { progress: 0.3 }
        });

        const result = generateSSML(text, options);

        self.postMessage({
            type: 'progress',
            data: { progress: 0.9 }
        });

        self.postMessage({
            type: 'result',
            data: result
        });
    }
};
