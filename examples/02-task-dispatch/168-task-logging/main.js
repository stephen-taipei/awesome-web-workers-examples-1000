const startTasksBtn = document.getElementById('startTasksBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const taskStatus = document.getElementById('taskStatus');
const logsOutput = document.getElementById('logsOutput');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'log') {
        appendLog(payload);
    } else if (type === 'status') {
        taskStatus.textContent = payload;
    } else if (type === 'done') {
        startTasksBtn.disabled = false;
        taskStatus.textContent = 'Completed';
    }
};

startTasksBtn.addEventListener('click', () => {
    startTasksBtn.disabled = true;
    logsOutput.innerHTML = ''; // Optional: clear logs on start
    taskStatus.textContent = 'Running...';
    worker.postMessage({ type: 'start', count: 10 });
});

clearLogsBtn.addEventListener('click', () => {
    logsOutput.innerHTML = '';
});

function appendLog(logEntry) {
    const div = document.createElement('div');
    div.className = 'log-entry';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${new Date(logEntry.timestamp).toLocaleTimeString()}]`;

    const levelSpan = document.createElement('span');
    levelSpan.className = `log-level-${logEntry.level}`;
    levelSpan.textContent = `[${logEntry.level.toUpperCase()}]`;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = ` ${logEntry.message}`;

    div.appendChild(timeSpan);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(levelSpan);
    div.appendChild(messageSpan);

    logsOutput.appendChild(div);
    logsOutput.scrollTop = logsOutput.scrollHeight;
}
