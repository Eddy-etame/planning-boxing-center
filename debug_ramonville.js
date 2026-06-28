import { initialPlannings } from './src/data/plannings.js';
const ramonville_mon = initialPlannings.filter(p => p.salle === 'ramonville' && p.day === 'lundi');
ramonville_mon.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
console.log("Ramonville Lundi:");
ramonville_mon.forEach(p => console.log(`${p.timeSlot} | ${p.activity} | ${p.coach}`));
