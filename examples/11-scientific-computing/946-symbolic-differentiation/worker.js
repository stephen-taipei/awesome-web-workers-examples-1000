// Symbolic Differentiation Worker (Expression Tree)

// Simple Parser logic similar to Example 970
class Parser {
    constructor() { this.tokens = []; this.pos = 0; }
    parse(expr) {
        this.tokens = this.tokenize(expr);
        this.pos = 0;
        return this.parseExpression();
    }
    tokenize(expr) {
        const tokens = [];
        let i = 0;
        while(i < expr.length) {
            const c = expr[i];
            if(/\s/.test(c)) i++;
            else if(/[0-9.]/.test(c)) {
                let num = c; i++;
                while(i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i++]; }
                tokens.push({ type: 'NUM', value: parseFloat(num) });
            } else if(/[a-z]/.test(c)) {
                let id = c; i++;
                while(i < expr.length && /[a-z]/.test(expr[i])) { id += expr[i++]; }
                tokens.push({ type: 'ID', value: id });
            } else if('+-*/^()'.includes(c)) {
                tokens.push({ type: 'OP', value: c }); i++;
            } else throw new Error(`Unknown char: ${c}`);
        }
        return tokens;
    }
    peek() { return this.tokens[this.pos]; }
    consume() { return this.tokens[this.pos++]; }
    
    parseExpression() {
        let left = this.parseTerm();
        while(this.peek() && (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.consume().value;
            left = { type: 'BINARY', op, left, right: this.parseTerm() };
        }
        return left;
    }
    parseTerm() {
        let left = this.parseFactor();
        while(this.peek() && (this.peek().value === '*' || this.peek().value === '/')) {
            const op = this.consume().value;
            left = { type: 'BINARY', op, left, right: this.parseFactor() };
        }
        return left;
    }
    parseFactor() {
        let left = this.parsePrimary();
        if(this.peek() && this.peek().value === '^') {
            this.consume();
            left = { type: 'BINARY', op: '^', left, right: this.parseFactor() };
        }
        return left;
    }
    parsePrimary() {
        const t = this.consume();
        if(t.type === 'NUM') return { type: 'LITERAL', value: t.value };
        if(t.type === 'ID') {
            if(t.value === 'x') return { type: 'VAR', name: 'x' };
            if(this.peek() && this.peek().value === '(') {
                this.consume();
                const arg = this.parseExpression();
                this.consume(); // )
                return { type: 'CALL', name: t.value, arg };
            }
            return { type: 'VAR', name: t.value }; // Variable
        }
        if(t.value === '(') {
            const expr = this.parseExpression();
            this.consume(); // )
            return expr;
        }
        if(t.value === '-') return { type: 'UNARY', op: '-', arg: this.parseFactor() };
        throw new Error("Syntax Error");
    }
}

// Differentiate AST
function diff(node) {
    if (node.type === 'LITERAL') return { type: 'LITERAL', value: 0 };
    if (node.type === 'VAR') {
        if (node.name === 'x') return { type: 'LITERAL', value: 1 };
        return { type: 'LITERAL', value: 0 }; // Treat others as constant
    }
    if (node.type === 'BINARY') {
        const u = node.left;
        const v = node.right;
        const du = diff(u);
        const dv = diff(v);
        
        if (node.op === '+') return { type: 'BINARY', op: '+', left: du, right: dv };
        if (node.op === '-') return { type: 'BINARY', op: '-', left: du, right: dv };
        
        if (node.op === '*') {
            // Product Rule: u'v + uv'
            return { type: 'BINARY', op: '+', 
                left: { type: 'BINARY', op: '*', left: du, right: v },
                right: { type: 'BINARY', op: '*', left: u, right: dv }
            };
        }
        
        if (node.op === '/') {
            // Quotient Rule: (u'v - uv') / v^2
            const num = { type: 'BINARY', op: '-',
                left: { type: 'BINARY', op: '*', left: du, right: v },
                right: { type: 'BINARY', op: '*', left: u, right: dv }
            };
            const den = { type: 'BINARY', op: '^', left: v, right: { type: 'LITERAL', value: 2 } };
            return { type: 'BINARY', op: '/', left: num, right: den };
        }
        
        if (node.op === '^') {
            // Power Rule (generalized): d(u^v) = v*u^(v-1)*u' + u^v*ln(u)*v'
            // Assuming v is constant number for simplicity in basic demo?
            // Let's assume v is constant (polynomial)
            if (v.type === 'LITERAL') {
                const n = v.value;
                // n * u^(n-1) * u'
                const powerTerm = { type: 'BINARY', op: '^', left: u, right: { type: 'LITERAL', value: n - 1 } };
                const multTerm = { type: 'BINARY', op: '*', left: { type: 'LITERAL', value: n }, right: powerTerm };
                return { type: 'BINARY', op: '*', left: multTerm, right: du };
            }
        }
    }
    if (node.type === 'CALL') {
        // Chain Rule: f'(g(x)) * g'(x)
        const u = node.arg;
        const du = diff(u);
        
        let outer;
        if (node.name === 'sin') outer = { type: 'CALL', name: 'cos', arg: u };
        else if (node.name === 'cos') {
            // -sin(u)
            outer = { type: 'UNARY', op: '-', arg: { type: 'CALL', name: 'sin', arg: u } };
        }
        else if (node.name === 'exp') outer = node; // exp
        else if (node.name === 'log') {
            // 1/u
            outer = { type: 'BINARY', op: '/', left: { type: 'LITERAL', value: 1 }, right: u };
        }
        
        return { type: 'BINARY', op: '*', left: outer, right: du };
    }
    return { type: 'LITERAL', value: 0 };
}

// Simplify AST (Basic)
function simplify(node) {
    if (node.type === 'BINARY') {
        node.left = simplify(node.left);
        node.right = simplify(node.right);
        
        if (node.op === '*') {
            if (isVal(node.left, 0) || isVal(node.right, 0)) return { type: 'LITERAL', value: 0 };
            if (isVal(node.left, 1)) return node.right;
            if (isVal(node.right, 1)) return node.left;
        }
        if (node.op === '+') {
            if (isVal(node.left, 0)) return node.right;
            if (isVal(node.right, 0)) return node.left;
        }
        // Constant folding
        if (node.left.type === 'LITERAL' && node.right.type === 'LITERAL') {
            if (node.op === '+') return { type: 'LITERAL', value: node.left.value + node.right.value };
            if (node.op === '*') return { type: 'LITERAL', value: node.left.value * node.right.value };
        }
    }
    return node;
}

function isVal(node, val) {
    return node.type === 'LITERAL' && node.value === val;
}

// AST to String
function toString(node) {
    if (node.type === 'LITERAL') return node.value.toString();
    if (node.type === 'VAR') return node.name;
    if (node.type === 'BINARY') {
        return `(${toString(node.left)} ${node.op} ${toString(node.right)})`;
    }
    if (node.type === 'CALL') return `${node.name}(${toString(node.arg)})`;
    if (node.type === 'UNARY') return `${node.op}${toString(node.arg)}`;
    return '?';
}

// AST to JS Code
function toJs(node) {
    if (node.type === 'LITERAL') return node.value.toString();
    if (node.type === 'VAR') return node.name;
    if (node.type === 'BINARY') {
        if (node.op === '^') return `pow(${toJs(node.left)}, ${toJs(node.right)})`;
        return `(${toJs(node.left)} ${node.op} ${toJs(node.right)})`;
    }
    if (node.type === 'CALL') return `${node.name}(${toJs(node.arg)})`;
    if (node.type === 'UNARY') return `${node.op}${toJs(node.arg)}`;
    return '0';
}

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'differentiate') {
        try {
            const { expression } = e.data;
            const start = performance.now();
            
            const parser = new Parser();
            const ast = parser.parse(expression);
            let dAst = diff(ast);
            
            // Simplify multiple passes
            dAst = simplify(dAst);
            dAst = simplify(dAst);
            
            const output = toString(dAst);
            const jsCode = toJs(dAst);
            
            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    derivative: output,
                    jsFunction: jsCode,
                    duration: (end - start).toFixed(2)
                }
            });
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    } 
    else if (command === 'evaluate') {
        try {
            const { funcBody, x } = e.data;
            const F = new Function('x', `with(Math) { return ${funcBody}; }`);
            const val = F(x);
            self.postMessage({ type: 'evalResult', data: { value: val } });
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
};
