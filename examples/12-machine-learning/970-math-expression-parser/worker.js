// Simple Recursive Descent Parser for Math Expressions
// Supports: +, -, *, /, ^, sin, cos, tan, log, exp, sqrt, (, )

class Parser {
    constructor() {
        this.tokens = [];
        this.pos = 0;
    }

    parse(expression) {
        this.tokens = this.tokenize(expression);
        this.pos = 0;
        const ast = this.parseExpression();
        if (this.pos < this.tokens.length) throw new Error("Unexpected token at end");
        return ast;
    }

    tokenize(expr) {
        const tokens = [];
        let i = 0;
        while (i < expr.length) {
            const c = expr[i];
            if (/\s/.test(c)) {
                i++;
            } else if (/[0-9.]/.test(c)) {
                let num = c;
                i++;
                while (i < expr.length && /[0-9.]/.test(expr[i])) {
                    num += expr[i];
                    i++;
                }
                tokens.push({ type: 'NUM', value: parseFloat(num) });
            } else if (/[a-z]/.test(c)) {
                let id = c;
                i++;
                while (i < expr.length && /[a-z]/.test(expr[i])) {
                    id += expr[i];
                    i++;
                }
                tokens.push({ type: 'ID', value: id });
            } else if ('+-*/^()'.includes(c)) {
                tokens.push({ type: 'OP', value: c });
                i++;
            } else {
                throw new Error(`Unknown char: ${c}`);
            }
        }
        return tokens;
    }

    peek() { return this.tokens[this.pos]; }
    consume() { return this.tokens[this.pos++]; }

    parseExpression() {
        let left = this.parseTerm();
        while (this.peek() && (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.consume().value;
            const right = this.parseTerm();
            left = { type: 'BINARY', op, left, right };
        }
        return left;
    }

    parseTerm() {
        let left = this.parseFactor();
        while (this.peek() && (this.peek().value === '*' || this.peek().value === '/')) {
            const op = this.consume().value;
            const right = this.parseFactor();
            left = { type: 'BINARY', op, left, right };
        }
        return left;
    }

    parseFactor() {
        let left = this.parsePrimary();
        if (this.peek() && this.peek().value === '^') {
            this.consume();
            const right = this.parseFactor(); // Right associative for power
            left = { type: 'BINARY', op: '^', left, right };
        }
        return left;
    }

    parsePrimary() {
        const t = this.consume();
        if (!t) throw new Error("Unexpected end");

        if (t.type === 'NUM') return { type: 'LITERAL', value: t.value };
        if (t.type === 'ID') {
            if (this.peek() && this.peek().value === '(') {
                // Function call
                this.consume(); // (
                const arg = this.parseExpression();
                if (this.consume().value !== ')') throw new Error("Missing )");
                return { type: 'CALL', name: t.value, arg };
            }
            return { type: 'VAR', name: t.value };
        }
        if (t.value === '(') {
            const expr = this.parseExpression();
            if (this.consume().value !== ')') throw new Error("Missing )");
            return expr;
        }
        if (t.value === '-') { // Unary minus
            return { type: 'UNARY', op: '-', arg: this.parseFactor() };
        }
        throw new Error(`Unexpected token ${t.value}`);
    }
}

const evaluate = (node, context) => {
    switch (node.type) {
        case 'LITERAL': return node.value;
        case 'VAR': return context[node.name] || 0;
        case 'UNARY': return -evaluate(node.arg, context);
        case 'BINARY':
            const l = evaluate(node.left, context);
            const r = evaluate(node.right, context);
            switch (node.op) {
                case '+': return l + r;
                case '-': return l - r;
                case '*': return l * r;
                case '/': return l / r;
                case '^': return Math.pow(l, r);
            }
            break;
        case 'CALL':
            const val = evaluate(node.arg, context);
            switch (node.name) {
                case 'sin': return Math.sin(val);
                case 'cos': return Math.cos(val);
                case 'tan': return Math.tan(val);
                case 'log': return Math.log(val);
                case 'exp': return Math.exp(val);
                case 'sqrt': return Math.sqrt(val);
                case 'abs': return Math.abs(val);
                default: throw new Error(`Unknown function ${node.name}`);
            }
    }
    return 0;
};

self.onmessage = function(e) {
    const { command } = e.data;
    const parser = new Parser();

    try {
        if (command === 'eval') {
            const { expression, x } = e.data;
            const start = performance.now();
            const ast = parser.parse(expression);
            const result = evaluate(ast, { x });
            const end = performance.now();
            
            self.postMessage({
                type: 'single',
                data: { result, duration: (end - start).toFixed(2) }
            });
        } 
        else if (command === 'plot') {
            const { expression, start, end, step } = e.data;
            const timeStart = performance.now();
            const ast = parser.parse(expression);
            const points = [];
            
            // Optimization: Parse once, evaluate many
            for (let x = start; x <= end; x += step) {
                // Fix floating point issues loop
                x = Math.round(x * 1000) / 1000;
                const y = evaluate(ast, { x });
                if (isFinite(y)) points.push({ x, y });
            }
            
            const timeEnd = performance.now();
            self.postMessage({
                type: 'batch',
                data: { points, duration: (timeEnd - timeStart).toFixed(2) }
            });
        }
    } catch (err) {
        self.postMessage({ type: 'error', data: err.message });
    }
};
