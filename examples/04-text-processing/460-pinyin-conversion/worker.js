// Demo Pinyin dictionary
// Char -> Pinyin with tone number
// Using a small set for demonstration purposes.
const pinyinDict = {
    '你': 'ni3', '好': 'hao3', '世': 'shi4', '界': 'jie4',
    '我': 'wo3', '爱': 'ai4', '编': 'bian1', '程': 'cheng2',
    '很': 'hen3', '有': 'you3', '趣': 'qu4',
    '中': 'zhong1', '文': 'wen2', '字': 'zi4', '符': 'fu2',
    '测': 'ce4', '试': 'shi4', '例': 'li4', '子': 'zi5',
    '大': 'da4', '家': 'jia1', '早': 'zao3', '上': 'shang4',
    '晚': 'wan3', '安': 'an1', '乐': 'le4', '快': 'kuai4',
    '台': 'tai2', '湾': 'wan1', '乌': 'wu1', '龟': 'gui1',
    '忧': 'you1', '郁': 'yu4',
    '的': 'de5'
};

// Map tone numbers to marks
const toneMarks = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'] // v stands for ü
};

function getToneMark(vowel, tone) {
    if (tone >= 1 && tone <= 5) {
        return toneMarks[vowel][tone - 1];
    }
    return vowel;
}

function convertToToneMark(pinyin) {
    // pinyin format: hao3
    const toneStr = pinyin.slice(-1);
    const tone = parseInt(toneStr, 10);
    if (isNaN(tone)) return pinyin; // No tone number

    const base = pinyin.slice(0, -1);

    // Priority: a, o, e, i, u, v
    // If 'iu', mark 'u'. If 'ui', mark 'i' (exception? actually standard is mark the last vowel in 'iu', 'ui' combo? No, priority is a, o, e, then i, u. If both i and u, mark the second one.)
    // Standard Pinyin rules: a > o > e > (i, u, ü) -- if i and u combine, mark the second one.

    let charToMark = '';
    let indexToMark = -1;

    if (base.includes('a')) { indexToMark = base.indexOf('a'); charToMark = 'a'; }
    else if (base.includes('o')) { indexToMark = base.indexOf('o'); charToMark = 'o'; }
    else if (base.includes('e')) { indexToMark = base.indexOf('e'); charToMark = 'e'; }
    else if (base.includes('iu')) { indexToMark = base.indexOf('u'); charToMark = 'u'; }
    else if (base.includes('ui')) { indexToMark = base.indexOf('i'); charToMark = 'i'; }
    else if (base.includes('i')) { indexToMark = base.indexOf('i'); charToMark = 'i'; }
    else if (base.includes('u')) { indexToMark = base.indexOf('u'); charToMark = 'u'; }
    else if (base.includes('v') || base.includes('ü')) {
        indexToMark = base.indexOf('v');
        if(indexToMark === -1) indexToMark = base.indexOf('ü');
        charToMark = 'v';
    }

    if (indexToMark !== -1) {
        const markedChar = getToneMark(charToMark, tone);
        return base.substring(0, indexToMark) + markedChar + base.substring(indexToMark + 1);
    }

    return base;
}

function removeToneNumber(pinyin) {
    return pinyin.replace(/[0-9]/g, '');
}

self.onmessage = function(e) {
    const { text, withTones } = e.data;
    const startTime = performance.now();

    let pinyinText = '';

    for (const char of text) {
        if (pinyinDict[char]) {
            const rawPinyin = pinyinDict[char];
            if (withTones) {
                pinyinText += convertToToneMark(rawPinyin) + ' ';
            } else {
                pinyinText += removeToneNumber(rawPinyin) + ' ';
            }
        } else {
            pinyinText += char;
        }
    }

    // Clean up spaces around punctuation? For simplicity, we just appended space after pinyin.
    // Let's leave it as is, or maybe collapse double spaces.

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        pinyinText: pinyinText.trim(),
        time: endTime - startTime
    });
};
