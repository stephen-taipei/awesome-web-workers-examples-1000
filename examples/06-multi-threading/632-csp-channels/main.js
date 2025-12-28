/**
 * #632 CSP Channels
 */
let producer, consumer;
const channel = new MessageChannel();

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    if (producer) producer.terminate();
    if (consumer) consumer.terminate();

    document.getElementById('messages').innerHTML = '';

    producer = new Worker('worker.js');
    consumer = new Worker('worker.js');

    producer.onmessage = (e) => log(`Producer: ${e.data.message}`);
    consumer.onmessage = (e) => log(`Consumer: ${e.data.message}`);

    producer.postMessage({ type: 'init', role: 'producer', port: channel.port1 }, [channel.port1]);
    consumer.postMessage({ type: 'init', role: 'consumer', port: channel.port2 }, [channel.port2]);

    setTimeout(() => {
        producer.postMessage({ type: 'start' });
        consumer.postMessage({ type: 'start' });
    }, 100);

    updateChannel();
}

function updateChannel() {
    document.getElementById('channel').innerHTML = `
        <div style="padding:20px;background:var(--success-color);color:white;border-radius:8px;">Producer</div>
        <div style="font-size:2rem;">→ Channel →</div>
        <div style="padding:20px;background:var(--primary-color);color:white;border-radius:8px;">Consumer</div>
    `;
}

function log(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:5px;border-bottom:1px solid var(--border-color);';
    div.textContent = msg;
    document.getElementById('messages').insertBefore(div, document.getElementById('messages').firstChild);
}
