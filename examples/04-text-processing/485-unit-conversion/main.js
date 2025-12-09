const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const processBtn = document.getElementById('processBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const categorySelect = document.getElementById('category');
const fromUnitSelect = document.getElementById('fromUnit');
const toUnitSelect = document.getElementById('toUnit');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const processedCount = document.getElementById('processedCount');
const timeTaken = document.getElementById('timeTaken');

const units = {
    length: [
        { value: 'm', label: 'Meters (m)' },
        { value: 'km', label: 'Kilometers (km)' },
        { value: 'cm', label: 'Centimeters (cm)' },
        { value: 'mm', label: 'Millimeters (mm)' },
        { value: 'ft', label: 'Feet (ft)' },
        { value: 'in', label: 'Inches (in)' },
        { value: 'yd', label: 'Yards (yd)' },
        { value: 'mi', label: 'Miles (mi)' }
    ],
    weight: [
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'g', label: 'Grams (g)' },
        { value: 'mg', label: 'Milligrams (mg)' },
        { value: 'lb', label: 'Pounds (lb)' },
        { value: 'oz', label: 'Ounces (oz)' }
    ],
    temperature: [
        { value: 'c', label: 'Celsius (°C)' },
        { value: 'f', label: 'Fahrenheit (°F)' },
        { value: 'k', label: 'Kelvin (K)' }
    ],
    area: [
        { value: 'm2', label: 'Square Meters (m²)' },
        { value: 'km2', label: 'Square Kilometers (km²)' },
        { value: 'ft2', label: 'Square Feet (ft²)' },
        { value: 'ac', label: 'Acres' },
        { value: 'ha', label: 'Hectares' }
    ],
    volume: [
        { value: 'l', label: 'Liters (L)' },
        { value: 'ml', label: 'Milliliters (mL)' },
        { value: 'gal', label: 'Gallons (US)' },
        { value: 'm3', label: 'Cubic Meters (m³)' }
    ]
};

function populateUnits() {
    const category = categorySelect.value;
    const options = units[category].map(u => `<option value="${u.value}">${u.label}</option>`).join('');
    fromUnitSelect.innerHTML = options;
    toUnitSelect.innerHTML = options;
    // Set default distinct units
    if (units[category].length > 1) {
        toUnitSelect.selectedIndex = 1;
    }
}

categorySelect.addEventListener('change', populateUnits);
populateUnits();

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
            outputArea.value = data.output;
            processedCount.textContent = data.count.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

processBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    outputArea.value = '';

    initWorker();

    worker.postMessage({
        type: 'process',
        text: text,
        category: categorySelect.value,
        from: fromUnitSelect.value,
        to: toUnitSelect.value
    });
});

generateBtn.addEventListener('click', () => {
    const values = [];
    for (let i = 0; i < 100000; i++) {
        // Generate random values
        values.push((Math.random() * 1000).toFixed(2));
    }
    inputArea.value = values.join('\n');
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
