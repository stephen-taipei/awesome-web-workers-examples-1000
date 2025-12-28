/**
 * #633 Pub-Sub Pattern
 */
let subscribers = [];
const topics = ['news', 'sports', 'weather'];

document.getElementById('create-btn').addEventListener('click', createSubscribers);
document.getElementById('publish-btn').addEventListener('click', publish);

function createSubscribers() {
    subscribers.forEach(s => s.worker.terminate());
    subscribers = [];

    const configs = [
        { name: 'Sub1', topics: ['news', 'sports'] },
        { name: 'Sub2', topics: ['weather'] },
        { name: 'Sub3', topics: ['news', 'weather'] }
    ];

    configs.forEach(config => {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => updateSubscriber(config.name, e.data);
        worker.postMessage({ type: 'subscribe', topics: config.topics });
        subscribers.push({ ...config, worker, messages: [] });
    });

    updateDisplay();
}

function publish() {
    const topic = document.getElementById('topic').value;
    const message = document.getElementById('message').value;

    subscribers.forEach(sub => {
        if (sub.topics.includes(topic)) {
            sub.worker.postMessage({ type: 'message', topic, message });
        }
    });
}

function updateSubscriber(name, data) {
    const sub = subscribers.find(s => s.name === name);
    if (sub && data.type === 'received') {
        sub.messages.unshift(`[${data.topic}] ${data.message}`);
        if (sub.messages.length > 5) sub.messages.pop();
        updateDisplay();
    }
}

function updateDisplay() {
    document.getElementById('subscribers').innerHTML = subscribers.map(s => `
        <div style="padding:15px;background:var(--bg-secondary);margin:10px 0;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                <strong>${s.name}</strong>
                <span style="color:var(--text-muted);">Topics: ${s.topics.join(', ')}</span>
            </div>
            <div style="font-size:0.85rem;">
                ${s.messages.length ? s.messages.map(m => `<div style="padding:3px 0;color:var(--text-secondary);">${m}</div>`).join('') : '<span style="color:var(--text-muted);">No messages</span>'}
            </div>
        </div>
    `).join('');
}
