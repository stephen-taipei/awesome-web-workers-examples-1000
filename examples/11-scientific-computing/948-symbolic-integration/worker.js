// Symbolic Integration Worker
// Implements a basic heuristic integrator

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'integrate') {
        try {
            const { expression } = e.data;
            const start = performance.now();
            
            // 1. Parse (Simplified: Split by + or -)
            // This is a very basic parser/integrator.
            // Real symbolic integration is huge. We support polynomials, sin, cos, exp.
            
            const terms = parseTerms(expression);
            const integratedTerms = terms.map(integrateTerm);
            const resultStr = integratedTerms.join(' ');
            
            // Generate JS function for evaluation: F(b) - F(a)
            // Convert math string to JS string
            const jsBody = mathToJs(resultStr);

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    integral: resultStr,
                    jsFunction: jsBody,
                    duration: (end - start).toFixed(2)
                }
            });
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    } 
    else if (command === 'evaluate') {
        try {
            const { funcBody, a, b } = e.data;
            
            // Create function F(x)
            const F = new Function('x', `with(Math) { return ${funcBody}; }`);
            const val = F(b) - F(a);
            
            self.postMessage({
                type: 'evalResult',
                data: { value: val }
            });
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
};

function parseTerms(expr) {
    // Remove spaces
    expr = expr.replace(/\s+/g, '');
    
    // Split by + or - but keep delimiter
    // Regex lookahead/lookbehind is nice but basic split is safer for web workers env support? 
    // Let's just iterate.
    
    const terms = [];
    let current = '';
    for (let i = 0; i < expr.length; i++) {
        const c = expr[i];
        if ((c === '+' || c === '-') && i > 0 && expr[i-1] !== '^' && expr[i-1] !== '(') {
            if (current) terms.push(current);
            current = c;
        } else {
            current += c;
        }
    }
    if (current) terms.push(current);
    return terms;
}

function integrateTerm(term) {
    // Detect coefficient
    // e.g. -3x^2
    
    let sign = '';
    if (term.startsWith('+')) { term = term.substring(1); sign = '+ '; }
    else if (term.startsWith('-')) { term = term.substring(1); sign = '- '; }
    else if (term.length > 0) { sign = '+ '; } // Default positive, but maybe skip for first?
    
    // Extract Coeff
    let coeff = 1;
    let rest = term;
    
    // Match number at start
    const match = term.match(/^([0-9.]+)(?:\*)?(.*)/);
    if (match) {
        coeff = parseFloat(match[1]);
        rest = match[2];
        if (!rest) rest = ''; // Constant term
    }
    
    if (rest === '') {
        // Constant C -> Cx
        return `${sign}${coeff}x`;
    }
    
    if (rest === 'x') {
        // x -> x^2/2
        return formatTerm(sign, coeff / 2, 'x^2');
    }
    
    // x^n
    const powerMatch = rest.match(/^x\^([0-9.]+)$/);
    if (powerMatch) {
        const n = parseFloat(powerMatch[1]);
        if (n === -1) return formatTerm(sign, coeff, 'log(x)');
        return formatTerm(sign, coeff / (n + 1), `x^${n + 1}`);
    }
    
    // sin(x), cos(x), e^x
    // Simple chain rule handling for sin(kx)?
    // Try to match sin(ax)
    if (rest.startsWith('sin(')) {
        const inner = rest.substring(4, rest.length - 1);
        if (inner === 'x') return formatTerm(sign, -coeff, 'cos(x)');
    }
    
    if (rest.startsWith('cos(')) {
        const inner = rest.substring(4, rest.length - 1);
        if (inner === 'x') return formatTerm(sign, coeff, 'sin(x)');
    }
    
    if (rest === 'e^x' || rest === 'exp(x)') {
        return formatTerm(sign, coeff, 'e^x');
    }
    
    if (rest === '1/x') {
        return formatTerm(sign, coeff, 'log(x)');
    }

    return `${sign}${coeff}*(${rest}_integral?)`; // Fallback
}

function formatTerm(sign, coeff, func) {
    // Pretty print
    // if coeff is 1, omit. if -1, just -.
    // but sign is already separate.
    
    // Fix sign if coeff is negative
    let finalSign = sign.trim();
    if (coeff < 0) {
        coeff = Math.abs(coeff);
        finalSign = finalSign === '+' ? '-' : '+';
    }
    
    let cStr = coeff === 1 ? '' : coeff;
    // if func starts with number (unlikely) or needed *
    if (cStr !== '' && /^[a-z]/.test(func)) cStr += '*';
    
    // If first term and positive, remove +
    // We will join later.
    
    return `${finalSign} ${cStr}${func}`;
}

function mathToJs(mathStr) {
    // Simple replacements
    // 3x -> 3*x (Already handled in output usually?)
    // x^n -> pow(x, n)
    // sin -> sin, etc.
    
    let s = mathStr;
    
    // Replace power x^n => pow(x, n)
    // Regex for x^number
    s = s.replace(/x\^([0-9.]+)/g, 'pow(x, $1)');
    
    // e^x -> exp(x)
    s = s.replace(/e\^x/g, 'exp(x)');
    
    // log -> log (natural log in JS)
    
    // implicit mult? 
    // Our output is 2*x^2 etc.
    
    return s;
}
