const inputText = document.getElementById('inputText');
const orderSelect = document.getElementById('order');
const lengthInput = document.getElementById('length');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const trainTime = document.getElementById('trainTime');
const genTime = document.getElementById('genTime');

const worker = new Worker('worker.js');

generateBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) {
        outputText.textContent = "Please enter some text to train the model.";
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    outputText.textContent = 'Training model and generating...';

    worker.postMessage({
        action: 'generate',
        text: text,
        order: parseInt(orderSelect.value),
        length: parseInt(lengthInput.value)
    });
});

worker.onmessage = (e) => {
    const { generated, trainingTime, generationTime } = e.data;

    outputText.textContent = generated;
    trainTime.textContent = `${trainingTime.toFixed(2)}ms`;
    genTime.textContent = `${generationTime.toFixed(2)}ms`;

    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Text';
};

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    trainTime.textContent = '-';
    genTime.textContent = '-';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});

// Load sample text
inputText.value = `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so VERY remarkable in that; nor did Alice think it so VERY much out of the way to hear the Rabbit say to itself, 'Oh dear! Oh dear! I shall be late!' (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually TOOK A WATCH OUT OF ITS WAISTCOAT-POCKET, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.`;
