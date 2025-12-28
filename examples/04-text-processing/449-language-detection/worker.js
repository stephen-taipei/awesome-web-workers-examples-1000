// Simple n-gram based language detection
const languageProfiles = {
    en: { name: 'English', trigrams: ['the', 'and', 'ing', 'tion', 'ed ', ' th', 'er ', 'es ', ' an', 'he ', 'is ', ' to', 'on ', 'at ', ' of', 'or ', 'en ', ' in', 'ent', 'ion'] },
    fr: { name: 'French', trigrams: ['ent', 'de ', ' de', 'es ', 'le ', ' le', 'la ', ' la', 'ion', 'que', ' qu', 'ous', 'les', ' et', 'et ', 'ait', 'eur', ' pa', 'tio', 'ons'] },
    de: { name: 'German', trigrams: ['en ', 'er ', 'der', 'ie ', 'die', 'sch', 'ein', 'che', 'ich', 'nd ', 'und', 'den', ' de', 'ung', 'gen', 'cht', 'ine', 'ist', 'das', 'eit'] },
    es: { name: 'Spanish', trigrams: ['de ', ' de', 'os ', 'es ', 'que', ' qu', 'la ', ' la', 'ent', 'cion', 'ion', 'el ', ' el', 'en ', 'ado', 'as ', 'los', ' lo', 'con', ' co'] },
    it: { name: 'Italian', trigrams: ['che', ' ch', 'ell', 'la ', ' la', 'zione', 'ion', 'lla', 'del', ' de', 'to ', 'ere', 'one', 'ent', 'are', 'gli', 'per', ' pe', 'le ', 'di '] },
    pt: { name: 'Portuguese', trigrams: ['de ', ' de', 'os ', 'que', ' qu', 'ent', 'ado', 'ao ', 'es ', 'do ', 'cao', 'aca', 'da ', ' da', 'as ', 'em ', ' em', 'com', ' co', 'oes'] },
    nl: { name: 'Dutch', trigrams: ['en ', 'de ', ' de', 'van', ' va', 'het', ' he', 'aan', 'ing', 'een', ' ee', 'ver', 'oor', 'er ', 'ij ', 'nd ', 'gen', 'ijk', ' in', 'met'] },
    pl: { name: 'Polish', trigrams: ['nie', 'owa', 'prz', ' pr', 'ych', 'ani', 'ego', 'nia', ' ni', 'na ', ' na', 'czy', 'jak', 'rze', 'kie', 'icz', ' si', 'wie', 'dzi', 'pow'] },
    ru: { name: 'Russian', trigrams: ['ого', 'ени', 'ова', 'ния', 'ост', 'ать', 'ель', 'ств', 'ани', 'пре', 'при', 'что', 'ото', 'как', 'эти', 'его', 'ить', 'ест', 'для', 'ком'] },
    ja: { name: 'Japanese', trigrams: ['する', 'して', 'ます', 'です', 'った', 'ない', 'ている', 'から', 'こと', 'ある'] },
    zh: { name: 'Chinese', trigrams: ['的', '是', '在', '和', '了', '有', '不', '这', '为', '上'] }
};

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'DETECT') detect(payload.text);
};

function detect(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Analyzing text...' } });

    const normalizedText = text.toLowerCase();
    const textTrigrams = extractTrigrams(normalizedText);

    const scores = [];
    for (const [code, profile] of Object.entries(languageProfiles)) {
        let score = 0;
        for (const trigram of profile.trigrams) {
            if (textTrigrams.has(trigram)) {
                score += textTrigrams.get(trigram);
            }
        }
        scores.push({ code, name: profile.name, score });
    }

    // Normalize scores to confidence
    const maxScore = Math.max(...scores.map(s => s.score));
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0) || 1;

    scores.forEach(s => {
        s.confidence = s.score / totalScore;
    });

    scores.sort((a, b) => b.confidence - a.confidence);
    const topScores = scores.slice(0, 5);

    self.postMessage({
        type: 'RESULT',
        payload: {
            detected: topScores[0],
            scores: topScores,
            duration: performance.now() - startTime
        }
    });
}

function extractTrigrams(text) {
    const trigrams = new Map();
    for (let i = 0; i < text.length - 2; i++) {
        const trigram = text.slice(i, i + 3);
        if (!/^\s+$/.test(trigram)) {
            trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
        }
    }
    return trigrams;
}
