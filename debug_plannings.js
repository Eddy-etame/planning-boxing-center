import { initialPlannings } from './src/data/plannings.js';

const unassigned = initialPlannings.filter(p => p.coach === 'Non Assigné' && p.activity !== 'ACCES LIBRE' && p.activity !== 'COURS ETE');
console.log(`--- UNASSIGNED COACHES (${unassigned.length}) ---`);
unassigned.forEach(p => console.log(`${p.salle} | ${p.day} | ${p.timeSlot} | ${p.activity}`));

const shortActivities = initialPlannings.filter(p => p.activity.length <= 3 && p.activity !== 'JJB' && p.activity !== 'MMA');
console.log(`\n--- SHORT ACTIVITIES (${shortActivities.length}) ---`);
shortActivities.forEach(p => console.log(`${p.salle} | ${p.day} | ${p.timeSlot} | ${p.activity} | Coach: ${p.coach}`));
