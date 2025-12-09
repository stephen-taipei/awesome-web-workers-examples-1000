self.onmessage = function(e) {
    const { command, transactions, products, minSupport, minConfidence } = e.data;

    if (command === 'mine') {
        const start = performance.now();

        // 1. Generate Transactions
        self.postMessage({ type: 'status', data: 'Generating Transactions...' });
        
        // To save memory, we generate transactions on the fly or store as compact integers.
        // Let's store as Array of Set (or just arrays sorted)
        // Actually, for Apriori, we need to pass over data multiple times. Storing is needed.
        // 50,000 transactions * avg 5 items = 250k integers. Tiny.
        
        const dataset = [];
        const productNames = Array.from({ length: products }, (_, i) => `P${i+1}`);

        for (let i = 0; i < transactions; i++) {
            const basketSize = Math.floor(Math.random() * 8) + 1; // 1 to 8 items
            const basket = new Set();
            while(basket.size < basketSize) {
                // Prefer lower index products to create some frequent patterns (Zipf-like)
                // Or just biased random
                const pIdx = Math.floor(Math.pow(Math.random(), 2) * products);
                basket.add(pIdx);
            }
            dataset.push(Array.from(basket).sort((a, b) => a - b));
        }

        // 2. Find Frequent Itemsets (Apriori)
        self.postMessage({ type: 'status', data: 'Mining Frequent Itemsets (L1)...' });

        const frequentItemsets = []; // Store as { items: Set, support: count }
        const minCount = minSupport * transactions;

        // L1: Frequent 1-itemsets
        const count1 = new Map();
        for (const t of dataset) {
            for (const item of t) {
                count1.set(item, (count1.get(item) || 0) + 1);
            }
        }

        let currentL = [];
        for (const [item, count] of count1.entries()) {
            if (count >= minCount) {
                currentL.push({ items: [item], count });
            }
        }
        frequentItemsets.push(...currentL);

        // Apriori loop (Simplified to max size 3 for demo performance)
        let k = 2;
        while (currentL.length > 0 && k <= 3) {
            self.postMessage({ type: 'status', data: `Mining Frequent Itemsets (L${k})...` });
            
            // Generate Candidates Ck
            const candidates = generateCandidates(currentL, k);
            if (candidates.length === 0) break;

            // Count Support
            const candidateCounts = new Map(); // Key: indices string, Value: count

            // Optimization: Hash candidates for O(1) lookup?
            // Or iterate dataset and check inclusion.
            // For small candidate set, check inclusion is ok.
            
            // Map candidate array to string key for counting
            const candidateMap = new Map();
            candidates.forEach(c => candidateMap.set(c.join(','), 0));

            for (const t of dataset) {
                // Check if transaction t contains candidate c
                // t is sorted, c is sorted.
                // This is subset check.
                for (const c of candidates) {
                    if (isSubset(c, t)) {
                        const key = c.join(',');
                        candidateMap.set(key, candidateMap.get(key) + 1);
                    }
                }
            }

            // Filter
            const nextL = [];
            for (const [key, count] of candidateMap.entries()) {
                if (count >= minCount) {
                    const items = key.split(',').map(Number);
                    nextL.push({ items, count });
                }
            }

            frequentItemsets.push(...nextL);
            currentL = nextL;
            k++;
        }

        // 3. Generate Rules
        self.postMessage({ type: 'status', data: 'Generating Rules...' });
        
        const rules = [];
        
        // For each frequent itemset of size >= 2
        for (const itemset of frequentItemsets) {
            if (itemset.items.length < 2) continue;
            
            const items = itemset.items;
            const support = itemset.count / transactions;

            // Generate all non-empty proper subsets as antecedents
            // Simplified: just 1-item antecedents for demo or combinations?
            // Let's do simple 1-item -> rest
            // e.g. {A,B} -> A->B, B->A
            // {A,B,C} -> A->BC, B->AC, C->AB, AB->C ...
            
            const subsets = getAllSubsets(items);
            for (const antecedent of subsets) {
                if (antecedent.length === 0 || antecedent.length === items.length) continue;
                
                const consequent = items.filter(x => !antecedent.includes(x));
                
                // Find support of antecedent
                // We stored it? We need to find it in frequentItemsets.
                // Since we gathered all frequent itemsets, it should be there (Apriori property).
                const antKey = antecedent.sort((a,b)=>a-b).join(',');
                const antItemset = frequentItemsets.find(x => x.items.join(',') === antKey);
                
                if (antItemset) {
                    const antSupport = antItemset.count / transactions;
                    const confidence = support / antSupport;

                    if (confidence >= minConfidence) {
                        const lift = confidence / (getSupport(consequent, frequentItemsets, transactions));
                        
                        rules.push({
                            antecedent: antecedent.map(i => productNames[i]),
                            consequent: consequent.map(i => productNames[i]),
                            support,
                            confidence,
                            lift
                        });
                    }
                }
            }
        }

        // Sort rules by lift descending
        rules.sort((a, b) => b.lift - a.lift);

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                itemsetsFound: frequentItemsets.length,
                rulesFound: rules.length,
                rules: rules, // Send top rules? or all
                duration: (end - start).toFixed(2)
            }
        });
    }
};

function generateCandidates(prevL, k) {
    const candidates = [];
    const len = prevL.length;
    for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
            const l1 = prevL[i].items;
            const l2 = prevL[j].items;
            
            // Check if first k-2 items are same
            let equal = true;
            for (let x = 0; x < k - 2; x++) {
                if (l1[x] !== l2[x]) {
                    equal = false;
                    break;
                }
            }
            
            if (equal) {
                // Join
                const c = [...l1, l2[k-2]].sort((a,b) => a-b); // Actually l1 is size k-1. l1[k-2] is last.
                // Wait, standard join step:
                // L(k-1) items are size k-1.
                // If first k-2 elements are same.
                // Join l1 and last element of l2.
                // l1: [1, 2], l2: [1, 3]. k=3. k-2=1. First 1 element same? Yes (1).
                // Candidate: [1, 2, 3].
                
                // Simple approach: Union and check size
                const union = new Set([...l1, ...l2]);
                if (union.size === k) {
                    candidates.push(Array.from(union).sort((a,b)=>a-b));
                }
            }
        }
    }
    return candidates;
}

function isSubset(subset, superset) {
    // Both sorted
    let i = 0, j = 0;
    while (i < subset.length && j < superset.length) {
        if (subset[i] < superset[j]) return false; // item in subset not in superset
        if (subset[i] === superset[j]) i++;
        j++;
    }
    return i === subset.length;
}

function getAllSubsets(array) {
    return array.reduce(
        (subsets, value) => subsets.concat(
         subsets.map(set => [value, ...set])
        ),
        [[]]
    );
}

function getSupport(items, allItemsets, totalTransactions) {
    // Helper to get probability P(B) for Lift calc
    const key = items.sort((a,b)=>a-b).join(',');
    const itemset = allItemsets.find(x => x.items.join(',') === key);
    return itemset ? (itemset.count / totalTransactions) : 0.0001; // avoid zero division
}
