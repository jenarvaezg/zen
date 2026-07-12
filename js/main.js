import { Simulation } from './engine.js';
import { initControls, DEFAULTS } from './controls.js';

const canvas = document.getElementById('scene');
const sim = new Simulation(canvas, { ...DEFAULTS, theme: 'light' });

initControls(sim);
sim.start();

document.addEventListener('visibilitychange', () => {
  if(document.hidden) sim.stop();
  else sim.start();
});
