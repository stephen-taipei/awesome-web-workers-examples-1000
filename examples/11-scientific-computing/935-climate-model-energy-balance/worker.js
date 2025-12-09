// Energy Balance Model Worker

self.onmessage = function(e) {
    const { command, S, alpha, epsilon, years } = e.data;

    if (command === 'simulate') {
        // Constants
        const sigma = 5.670374419e-8; // Stefan-Boltzmann constant
        const C = 2.08e8; // Heat capacity of Earth (approx ocean mixed layer) J/(m^2 K)
        // Equation: C * dT/dt = (S/4)*(1-alpha) - epsilon * sigma * T^4
        
        let T = 288; // Initial Temp (Kelvin) approx 15C
        const dt = 60 * 60 * 24; // 1 Day step
        const steps = years * 365;
        
        const timeData = [];
        const tempData = [];
        
        // Sample rate for output
        const outputStep = Math.ceil(steps / 500);
        
        for (let i = 0; i <= steps; i++) {
            // Incoming Solar Radiation
            const Ein = (S / 4) * (1 - alpha);
            
            // Outgoing Longwave Radiation
            const Eout = epsilon * sigma * Math.pow(T, 4);
            
            // Energy Imbalance
            const dE = Ein - Eout;
            
            // Update Temp
            T += (dE / C) * dt;
            
            if (i % outputStep === 0) {
                timeData.push(i / 365); // Year
                tempData.push(T - 273.15); // Celsius
            }
        }
        
        self.postMessage({
            type: 'result',
            data: {
                time: timeData,
                temp: tempData,
                finalTemp: T - 273.15
            }
        });
    }
};
