const MORSE_CODE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
    '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
    ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
    '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE_CODE).map(([k, v]) => [v, k]));

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.mode);
};

function process(text, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    let result, breakdown = [];

    if (mode === 'encode') {
        const encoded = encode(text.toUpperCase());
        result = encoded.result;
        breakdown = encoded.breakdown;
    } else {
        result = decode(text);
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            breakdown,
            mode,
            duration: performance.now() - startTime
        }
    });
}

function encode(text) {
    const words = text.split(/\s+/);
    const breakdown = [];
    const encodedWords = words.map(word => {
        return [...word].map(char => {
            const morse = MORSE_CODE[char];
            if (morse) {
                breakdown.push({ char, morse });
                return morse;
            }
            return '';
        }).filter(m => m).join(' ');
    });

    return {
        result: encodedWords.join('   '),
        breakdown
    };
}

function decode(morse) {
    const words = morse.split(/\s{3,}/);
    return words.map(word => {
        const letters = word.split(/\s+/);
        return letters.map(code => REVERSE_MORSE[code] || '?').join('');
    }).join(' ');
}
