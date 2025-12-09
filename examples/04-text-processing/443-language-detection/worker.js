// Simplified N-gram profiles
// For a real implementation, these would be much larger and loaded from a file.
// Format: top N-grams (trigrams) for each language.
// Actually, using simple "most common words" or char ranges is easier for a small demo.
// But N-gram is the robust way.
// Let's implement a heuristic based on character ranges (for CJK/Arabic/Russian) and common words (for Latin languages).

const PROFILES = {
    'en': new Set(['the', 'and', 'ing', 'ion', 'tio', 'ent', 'thi', 'for', 'nde', 'has', 'nce', 'edt', 'tis', 'oft', 'sth', 'men']),
    'fr': new Set(['les', 'des', 'que', 'est', 'une', 'par', 'pour', 'pas', 'ment', 'tion', 'qui', 'ans', 're', 'tre', 'es']),
    'es': new Set(['que', 'del', 'los', 'las', 'por', 'una', 'con', 'para', 'ci', 'ón', 'ent', 'est', 'dad', 'ado', 'res']),
    'de': new Set(['der', 'die', 'und', 'den', 'von', 'mit', 'das', 'ist', 'en', 'er', 'ein', 'ich', 'sie', 'ung', 'sch']),
    'it': new Set(['che', 'non', 'di', 'la', 'il', 'un', 'per', 'le', 'pi', 'del', 'sono', 'zi', 'to', 're', 'no']),
    'nl': new Set(['de', 'en', 'het', 'van', 'ik', 'te', 'dat', 'die', 'in', 'een', 'niet', 'ij', 'aar', 'en', 'er']),
    'pt': new Set(['que', 'de', 'os', 'as', 'com', 'um', 'por', 'para', 'em', 'ão', 'da', 'do', 'no', 'na', 'se']),
    // For non-latin, we check unicode ranges primarily
};

self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    const result = detectLanguage(text);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        result: result,
        time: endTime - startTime
    });
};

function detectLanguage(text) {
    const scores = {};
    const langs = ['en', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar'];
    langs.forEach(l => scores[l] = 0);

    // 1. Unicode Range Check (Strong signals)
    let totalChars = text.length;
    let latinChars = 0;

    for (let i = 0; i < totalChars; i++) {
        const code = text.charCodeAt(i);

        if (code >= 0x4E00 && code <= 0x9FFF) scores['zh'] += 2; // CJK Unified Ideographs
        else if (code >= 0x3040 && code <= 0x309F) scores['ja'] += 5; // Hiragana
        else if (code >= 0x30A0 && code <= 0x30FF) scores['ja'] += 5; // Katakana
        else if (code >= 0xAC00 && code <= 0xD7AF) scores['ko'] += 5; // Hangul
        else if (code >= 0x0400 && code <= 0x04FF) scores['ru'] += 1; // Cyrillic
        else if (code >= 0x0600 && code <= 0x06FF) scores['ar'] += 1; // Arabic
        else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 0xC0 && code <= 0xFF)) {
            latinChars++;
        }
    }

    // Normalize unicode scores
    // If we found significant non-latin scripts, return them
    const nonLatin = ['zh', 'ja', 'ko', 'ru', 'ar'];
    let maxNonLatin = 0;
    let maxNonLatinLang = null;

    nonLatin.forEach(l => {
        scores[l] = scores[l] / totalChars;
        if (scores[l] > maxNonLatin) {
            maxNonLatin = scores[l];
            maxNonLatinLang = l;
        }
    });

    if (maxNonLatin > 0.1) {
        // High confidence in non-latin
        // If Ja and Zh both exist, usually JA has Hiragana/Katakana which are unique. ZH only has Kanji.
        // So if JA score is high, it's JA.
        return Object.entries(scores)
            .sort((a, b) => b[1] - a[1]);
    }

    // 2. N-gram / Trigram Check for Latin languages
    // Clean text: lowercase, remove non-letters
    const cleanText = text.toLowerCase().replace(/[^a-zà-ÿ]/g, ' ');
    const trigrams = new Map();

    for (let i = 0; i < cleanText.length - 2; i++) {
        const trigram = cleanText.substring(i, i+3);
        if (trigram.includes(' ')) continue; // Skip trigrams with spaces for simplicity
        trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
    }

    // Sort input trigrams
    const sortedTrigrams = Array.from(trigrams.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100) // Top 100
        .map(x => x[0]);

    const latinLangs = ['en', 'fr', 'de', 'es', 'it', 'nl', 'pt'];

    latinLangs.forEach(lang => {
        if (!PROFILES[lang]) return;

        let matchCount = 0;
        sortedTrigrams.forEach(tri => {
            if (PROFILES[lang].has(tri)) {
                matchCount++;
            }
        });

        // Boost score
        scores[lang] = matchCount / sortedTrigrams.length; // 0 to 1
    });

    // Convert to sorted array
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);
}
