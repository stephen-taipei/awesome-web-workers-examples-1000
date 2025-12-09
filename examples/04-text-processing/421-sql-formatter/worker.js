self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    try {
        const formatted = formatSql(text);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            text: formatted,
            time: Math.round(endTime - startTime)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};

function formatSql(sql) {
    // Basic SQL Formatter
    // 1. Uppercase keywords
    // 2. Newlines before major clauses (SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT, INSERT, UPDATE, DELETE)
    // 3. Indentation

    const keywords = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'GROUP BY', 'ORDER BY',
        'LIMIT', 'OFFSET', 'HAVING', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
        'INNER JOIN', 'OUTER JOIN', 'UNION', 'INSERT INTO', 'VALUES',
        'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE',
        'ALTER TABLE', 'ADD COLUMN', 'DROP COLUMN', 'PRIMARY KEY', 'FOREIGN KEY'
    ];

    // Replace newlines and multiple spaces with single space
    let formatted = sql.replace(/\s+/g, ' ').trim();

    // Uppercase keywords
    // Using a regex that matches whole words
    // CAUTION: This might uppercase words inside strings. A proper lexer is needed to avoid strings.
    // For this simple example, we try to avoid string content if possible, but regex lookbehind is not fully supported in all environments?
    // Let's iterate tokens instead.

    // Simple tokenizer: split by space, comma, parenthesis, or quotes
    // But keeping it simple with Regex replace for keywords, ignoring context (limitation noted)

    keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        formatted = formatted.replace(regex, kw.toUpperCase());
    });

    // Add newlines
    const newlines = [
        'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT',
        'HAVING', 'UNION', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'
    ];

    newlines.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'g');
        formatted = formatted.replace(regex, `\n${kw}`);
    });

    // Add newlines for Joins but indent them
    const joins = ['JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN'];
    joins.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'g');
        formatted = formatted.replace(regex, `\n  ${kw}`);
    });

    // Format AND/OR in WHERE clause (simple heuristic)
    formatted = formatted.replace(/\bWHERE\b([\s\S]*?)(?=\b(GROUP|ORDER|LIMIT)\b|$)/g, function(match) {
        return match.replace(/\b(AND|OR)\b/g, '\n  $1');
    });

    // Comma lists (e.g. SELECT a, b, c) -> SELECT \n a, \n b
    // Be careful not to break functions like COUNT(a,b)
    // Simple strategy: If comma is followed by space, add newline? No, usually SELECT lists.
    // Let's skip comma formatting for simple version to ensure correctness.

    return formatted.trim();
}
