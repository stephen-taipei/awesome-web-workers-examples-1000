self.onmessage = function(e) {
    const { baseAtk, targetDef, skillMult, element } = e.data;

    // Base damage = ATK * (ATK / (ATK + DEF))
    const baseDamage = Math.floor(baseAtk * (baseAtk / (baseAtk + targetDef)));

    // Apply skill multiplier
    const skillDamage = Math.floor(baseDamage * skillMult);

    // Apply element modifier
    const elementalDamage = Math.floor(skillDamage * element);

    // Add variance (±10%)
    const variance = 0.9 + Math.random() * 0.2;
    const finalDamage = Math.floor(elementalDamage * variance);

    // Calculate range
    const critRange = {
        min: Math.floor(elementalDamage * 0.9),
        max: Math.floor(elementalDamage * 1.1)
    };

    self.postMessage({ baseDamage, skillDamage, elementalDamage, finalDamage, critRange });
};
