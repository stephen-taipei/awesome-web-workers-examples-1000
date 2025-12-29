/**
 * SQL Formatter Web Worker
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'FORMAT') formatSQL(payload.text);
};

function formatSQL(sql) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Formatting...' } });

    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'JOIN', 'ON', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'];

    let result = sql.trim();

    // Add newlines before major keywords
    const majorKeywords = ['SELECT', 'FROM', 'WHERE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'JOIN', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT'];
    for (const kw of majorKeywords) {
        const regex = new RegExp('\\b' + kw + '\\b', 'gi');
        result = result.replace(regex, '\n' + kw);
    }

    // Add newlines before AND/OR with indentation
    result = result.replace(/\b(AND|OR)\b/gi, '\n    $1');

    // Clean up multiple spaces and leading newline
    result = result.replace(/  +/g, ' ').trim();

    // Uppercase keywords
    for (const kw of keywords) {
        const regex = new RegExp('\\b' + kw.replace(' ', '\\s+') + '\\b', 'gi');
        result = result.replace(regex, kw);
    }

    const lines = result.split('\n');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: performance.now() - startTime,
            stats: { lineCount: lines.length }
        }
    });
}
