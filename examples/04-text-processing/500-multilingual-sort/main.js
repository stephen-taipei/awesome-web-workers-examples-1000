const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const localeSelect = document.getElementById('localeSelect');
const sensitivitySelect = document.getElementById('sensitivitySelect');
const orderSelect = document.getElementById('orderSelect');
const numericSelect = document.getElementById('numericSelect');
const ignorePunctuation = document.getElementById('ignorePunctuation');
const caseFirst = document.getElementById('caseFirst');
const sortBtn = document.getElementById('sortBtn');
const clearBtn = document.getElementById('clearBtn');
const comparisonResult = document.getElementById('comparisonResult');
const comparisonText = document.getElementById('comparisonText');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const itemCount = document.getElementById('itemCount');
const localeUsed = document.getElementById('localeUsed');
const timeTaken = document.getElementById('timeTaken');

const sampleButtons = document.querySelectorAll('.sample-btn');

const samples = {
    en: [
        'apple', 'Apple', 'APPLE', 'banana', 'cherry', 'date',
        'file1.txt', 'file2.txt', 'file10.txt', 'file20.txt',
        'cafe', 'cafe', 'resume', 'resume', 'naive', 'naive'
    ],
    zh: [
        '北京', '上海', '广州', '深圳', '杭州', '成都',
        '天津', '武汉', '西安', '南京', '重庆', '苏州',
        '中文', '排序', '测试', '国际化', '多语言'
    ],
    ja: [
        'あいうえお', 'かきくけこ', 'さしすせそ',
        'アイウエオ', 'カキクケコ', 'サシスセソ',
        '漢字', '日本語', '東京', '大阪', '京都'
    ],
    de: [
        'Apfel', 'Apfel', 'Arger', 'Bar', 'Buro', 'Cafe',
        'GroB', 'gross', 'Muller', 'Mueller', 'Strae', 'Strasse',
        'uber', 'ueber', 'schon', 'schoen'
    ],
    ru: [
        'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург',
        'Казань', 'Нижний Новгород', 'Челябинск', 'Самара',
        'Омск', 'Ростов-на-Дону', 'Уфа', 'Красноярск'
    ],
    mixed: [
        'apple', 'Apfel', '苹果', 'りんご', '사과',
        'banana', 'Banane', '香蕉', 'バナナ', '바나나',
        'cherry', 'Kirsche', '樱桃', 'さくらんぼ', '체리',
        '1. First', '2. Second', '10. Tenth', '20. Twentieth'
    ]
};

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        } else if (type === 'result') {
            outputArea.value = data.sorted.join('\n');

            // Show comparison
            if (data.defaultSorted) {
                comparisonResult.classList.remove('hidden');
                const differences = findDifferences(data.sorted, data.defaultSorted);
                if (differences.length > 0) {
                    comparisonText.innerHTML = `
                        <p>Found ${differences.length} difference(s) from JavaScript's default sort():</p>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            ${differences.slice(0, 5).map(d => `<li>${d}</li>`).join('')}
                            ${differences.length > 5 ? `<li>...and ${differences.length - 5} more</li>` : ''}
                        </ul>
                    `;
                } else {
                    comparisonText.innerHTML = '<p>Results match default sort() for this data.</p>';
                }
            }

            itemCount.textContent = data.count.toLocaleString();
            localeUsed.textContent = data.locale;
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            sortBtn.disabled = false;
        }
    };
}

function findDifferences(arr1, arr2) {
    const diffs = [];
    for (let i = 0; i < Math.min(arr1.length, arr2.length); i++) {
        if (arr1[i] !== arr2[i]) {
            diffs.push(`Position ${i + 1}: Locale="${arr1[i]}" vs Default="${arr2[i]}"`);
        }
    }
    return diffs;
}

sampleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (samples[lang]) {
            inputArea.value = samples[lang].join('\n');

            // Auto-select appropriate locale
            const localeMap = {
                en: 'en', zh: 'zh', ja: 'ja', de: 'de', ru: 'ru', mixed: 'en'
            };
            localeSelect.value = localeMap[lang] || 'en';
        }
    });
});

sortBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const items = text.split('\n').filter(l => l.trim());

    const options = {
        locale: localeSelect.value,
        sensitivity: sensitivitySelect.value,
        order: orderSelect.value,
        numeric: numericSelect.value === 'true',
        ignorePunctuation: ignorePunctuation.checked,
        caseFirst: caseFirst.checked ? 'upper' : 'false'
    };

    sortBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    comparisonResult.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'sort',
        items: items,
        options: options
    });
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    comparisonResult.classList.add('hidden');
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
