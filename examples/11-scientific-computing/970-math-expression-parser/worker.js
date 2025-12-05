// Math Expression Parser Web Worker
// Tokenizer, Parser (Shunting-yard algorithm), and Evaluator

const CONSTANTS = {
    'pi': Math.PI,
    'e': Math.E
};

const FUNCTIONS = {
    'sin': Math.sin,
    'cos': Math.cos,
    'tan': Math.tan,
    'sqrt': Math.sqrt,
    'abs': Math.abs,
    'log': Math.log10,
    'ln': Math.log,
    'exp': Math.exp,
    'floor': Math.floor,
    'ceil': Math.ceil,
    'round': Math.round,
    'asin': Math.asin,
    'acos': Math.acos,
    'atan': Math.atan,
    'sinh': Math.sinh,
    'cosh': Math.cosh,
    'tanh': Math.tanh
};

const OPERATORS = {
    '+': { precedence: 2, associativity: 'left', fn: (a, b) => a + b },
    '-': { precedence: 2, associativity: 'left', fn: (a, b) => a - b },
    '*': { precedence: 3, associativity: 'left', fn: (a, b) => a * b },
    '/': { precedence: 3, associativity: 'left', fn: (a, b) => a / b },
    '%': { precedence: 3, associativity: 'left', fn: (a, b) => a % b },
    '^': { precedence: 4, associativity: 'right', fn: (a, b) => Math.pow(a, b) }
};

// Tokenizer
function tokenize(expression) {
    const tokens = [];
    let i = 0;
    const expr = expression.replace(/\s+/g, '');

    while (i < expr.length) {
        const char = expr[i];

        // Number (including decimals)
        if (/\d/.test(char) || (char === '.' && /\d/.test(expr[i + 1]))) {
            let num = '';
            while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
                num += expr[i];
                i++;
            }
            tokens.push({ type: 'number', value: parseFloat(num) });
            continue;
        }

        // Identifier (function or variable or constant)
        if (/[a-zA-Z_]/.test(char)) {
            let name = '';
            while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) {
                name += expr[i];
                i++;
            }
            const lowerName = name.toLowerCase();
            if (FUNCTIONS[lowerName]) {
                tokens.push({ type: 'function', value: lowerName });
            } else if (CONSTANTS[lowerName]) {
                tokens.push({ type: 'number', value: CONSTANTS[lowerName] });
            } else {
                tokens.push({ type: 'variable', value: name });
            }
            continue;
        }

        // Operators
        if (OPERATORS[char]) {
            // Handle unary minus
            if (char === '-') {
                const prevToken = tokens[tokens.length - 1];
                if (!prevToken || prevToken.type === 'operator' || prevToken.value === '(') {
                    tokens.push({ type: 'number', value: 0 });
                }
            }
            tokens.push({ type: 'operator', value: char });
            i++;
            continue;
        }

        // Parentheses
        if (char === '(' || char === ')') {
            tokens.push({ type: char === '(' ? 'lparen' : 'rparen', value: char });
            i++;
            continue;
        }

        // Comma (for future multi-argument functions)
        if (char === ',') {
            tokens.push({ type: 'comma', value: char });
            i++;
            continue;
        }

        throw new Error(`Unknown character: ${char} at position ${i}`);
    }

    return tokens;
}

// Shunting-yard algorithm - convert infix to postfix (RPN)
function toPostfix(tokens) {
    const output = [];
    const stack = [];

    for (const token of tokens) {
        switch (token.type) {
            case 'number':
            case 'variable':
                output.push(token);
                break;

            case 'function':
                stack.push(token);
                break;

            case 'operator':
                const op1 = OPERATORS[token.value];
                while (stack.length > 0) {
                    const top = stack[stack.length - 1];
                    if (top.type === 'operator') {
                        const op2 = OPERATORS[top.value];
                        if ((op1.associativity === 'left' && op1.precedence <= op2.precedence) ||
                            (op1.associativity === 'right' && op1.precedence < op2.precedence)) {
                            output.push(stack.pop());
                            continue;
                        }
                    }
                    break;
                }
                stack.push(token);
                break;

            case 'lparen':
                stack.push(token);
                break;

            case 'rparen':
                while (stack.length > 0 && stack[stack.length - 1].type !== 'lparen') {
                    output.push(stack.pop());
                }
                if (stack.length === 0) {
                    throw new Error('Mismatched parentheses');
                }
                stack.pop(); // Remove lparen
                if (stack.length > 0 && stack[stack.length - 1].type === 'function') {
                    output.push(stack.pop());
                }
                break;

            case 'comma':
                while (stack.length > 0 && stack[stack.length - 1].type !== 'lparen') {
                    output.push(stack.pop());
                }
                break;
        }
    }

    while (stack.length > 0) {
        const top = stack.pop();
        if (top.type === 'lparen' || top.type === 'rparen') {
            throw new Error('Mismatched parentheses');
        }
        output.push(top);
    }

    return output;
}

// Evaluate postfix expression
function evaluatePostfix(postfix, variables = {}) {
    const stack = [];

    for (const token of postfix) {
        switch (token.type) {
            case 'number':
                stack.push(token.value);
                break;

            case 'variable':
                const varName = token.value.toLowerCase();
                if (variables.hasOwnProperty(varName)) {
                    stack.push(variables[varName]);
                } else {
                    throw new Error(`Unknown variable: ${token.value}`);
                }
                break;

            case 'operator':
                if (stack.length < 2) {
                    throw new Error('Invalid expression');
                }
                const b = stack.pop();
                const a = stack.pop();
                stack.push(OPERATORS[token.value].fn(a, b));
                break;

            case 'function':
                if (stack.length < 1) {
                    throw new Error(`Missing argument for function: ${token.value}`);
                }
                const arg = stack.pop();
                stack.push(FUNCTIONS[token.value](arg));
                break;
        }
    }

    if (stack.length !== 1) {
        throw new Error('Invalid expression');
    }

    return stack[0];
}

// Main evaluation function
function evaluate(expression, variables = {}) {
    const tokens = tokenize(expression);
    const postfix = toPostfix(tokens);
    return evaluatePostfix(postfix, variables);
}

// Generate graph data
function generateGraphData(expression, xMin, xMax, points = 500) {
    const data = [];
    const step = (xMax - xMin) / points;

    let tokens, postfix;
    try {
        tokens = tokenize(expression);
        postfix = toPostfix(tokens);
    } catch (error) {
        return { error: error.message };
    }

    let yMin = Infinity;
    let yMax = -Infinity;

    for (let i = 0; i <= points; i++) {
        const x = xMin + i * step;
        try {
            const y = evaluatePostfix(postfix, { x });
            if (isFinite(y)) {
                data.push({ x, y });
                if (y < yMin) yMin = y;
                if (y > yMax) yMax = y;
            } else {
                data.push({ x, y: null });
            }
        } catch {
            data.push({ x, y: null });
        }
    }

    // Add padding to y range
    const yPadding = (yMax - yMin) * 0.1 || 1;
    yMin -= yPadding;
    yMax += yPadding;

    return { data, xMin, xMax, yMin, yMax };
}

// Handle messages
self.onmessage = function(e) {
    const { type, expression, variables, xMin, xMax } = e.data;

    try {
        if (type === 'evaluate') {
            const result = evaluate(expression, variables);
            self.postMessage({
                type: 'result',
                result,
                expression,
                variables
            });
        } else if (type === 'graph') {
            const graphData = generateGraphData(expression, xMin, xMax);
            self.postMessage({
                type: 'graph',
                ...graphData,
                expression
            });
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};
