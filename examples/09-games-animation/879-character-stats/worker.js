const classModifiers = {
    warrior: { hpMult: 1.5, mpMult: 0.5, strMult: 1.5, dexMult: 0.8, intMult: 0.5, vitMult: 1.2 },
    mage: { hpMult: 0.7, mpMult: 2.0, strMult: 0.5, dexMult: 0.8, intMult: 2.0, vitMult: 0.6 },
    rogue: { hpMult: 0.9, mpMult: 0.8, strMult: 1.0, dexMult: 2.0, intMult: 0.8, vitMult: 0.8 },
    cleric: { hpMult: 1.0, mpMult: 1.5, strMult: 0.7, dexMult: 0.8, intMult: 1.5, vitMult: 1.0 }
};

self.onmessage = function(e) {
    const { level, charClass, str, dex, int, vit } = e.data;
    const mod = classModifiers[charClass];

    const hp = Math.floor((50 + vit * 10 + level * 5) * mod.hpMult * mod.vitMult);
    const mp = Math.floor((20 + int * 5 + level * 2) * mod.mpMult * mod.intMult);
    const physAtk = Math.floor((str * 2 + level) * mod.strMult);
    const magAtk = Math.floor((int * 2 + level) * mod.intMult);
    const physDef = Math.floor((vit * 1.5 + str * 0.5 + level * 0.5) * mod.vitMult);
    const magDef = Math.floor((int * 1 + vit * 0.5 + level * 0.5) * mod.intMult);
    const critRate = Math.min(75, Math.floor(dex * 0.5 * mod.dexMult));
    const dodgeRate = Math.min(50, Math.floor(dex * 0.3 * mod.dexMult));

    self.postMessage({ hp, mp, physAtk, magAtk, physDef, magDef, critRate, dodgeRate });
};
