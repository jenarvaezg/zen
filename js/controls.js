const STORAGE_KEY = 'zen:settings';

// Defaults reproduce the original bgNet effect's exact feel as experienced on
// a 120Hz ProMotion display (bgNet steps per-frame, so it runs 2x its nominal
// 60Hz values there): tiny flat 2.2px dots, no gravity, no ball-to-ball
// collisions, fully elastic wall bounce, and particles gently pulled toward
// the cursor rather than pushed away.
export const DEFAULTS = {
  count: 60,
  size: 2.2,
  gravity: 0,
  speed: 1,
  bounce: 1,
  collisions: false,
  mouseMode: 'attract',
  mouseStrength: 0.5,
  mouseRadius: 200,
  links: true,
  linkDistance: 138,
  palette: 'arena',
  theme: 'auto', // user preference: auto | light | dark
};

const FORMAT = {
  count: v => `${v}`,
  size: v => `${Number(v).toFixed(1)}`,
  gravity: v => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2)}`,
  speed: v => `${Number(v).toFixed(1)}×`,
  bounce: v => `${Math.round(v * 100)}%`,
  mouseStrength: v => `${Number(v).toFixed(2)}`,
  mouseRadius: v => `${v}px`,
  linkDistance: v => `${v}px`,
};

function loadPrefs(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  }catch{
    return { ...DEFAULTS };
  }
}

let saveTimer = 0;
function savePrefs(prefs){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); }catch{ /* storage unavailable, skip */ }
  }, 200);
}

export function initControls(sim){
  const prefs = loadPrefs();
  const html = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');

  function resolveTheme(){
    const resolved = prefs.theme === 'auto' ? (media.matches ? 'dark' : 'light') : prefs.theme;
    if(prefs.theme === 'auto') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', prefs.theme);
    sim.setState({ theme: resolved });
  }

  media.addEventListener('change', () => { if(prefs.theme === 'auto') resolveTheme(); });

  const ids = ['count', 'size', 'gravity', 'speed', 'bounce', 'mouseStrength', 'mouseRadius', 'linkDistance'];
  const selects = ['mouseMode', 'palette', 'theme'];
  const toggles = ['collisions', 'links'];

  function syncInputs(){
    for(const id of ids){
      const input = document.getElementById(id);
      const output = document.querySelector(`output[for="${id}"]`);
      input.value = prefs[id];
      if(output) output.textContent = FORMAT[id](prefs[id]);
    }
    for(const id of selects) document.getElementById(id).value = prefs[id];
    for(const id of toggles) document.getElementById(id).checked = prefs[id];
  }

  syncInputs();
  resolveTheme();
  sim.setState({ ...prefs, theme: sim.state.theme });

  for(const id of ids){
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      prefs[id] = value;
      const output = document.querySelector(`output[for="${id}"]`);
      if(output) output.textContent = FORMAT[id](value);
      sim.setState({ [id]: value });
      savePrefs(prefs);
    });
  }

  for(const id of toggles){
    const input = document.getElementById(id);
    input.addEventListener('change', () => {
      prefs[id] = input.checked;
      sim.setState({ [id]: input.checked });
      savePrefs(prefs);
    });
  }

  document.getElementById('mouseMode').addEventListener('change', e => {
    prefs.mouseMode = e.target.value;
    sim.setState({ mouseMode: e.target.value });
    savePrefs(prefs);
  });

  document.getElementById('palette').addEventListener('change', e => {
    prefs.palette = e.target.value;
    sim.setState({ palette: e.target.value });
    savePrefs(prefs);
  });

  document.getElementById('theme').addEventListener('change', e => {
    prefs.theme = e.target.value;
    resolveTheme();
    savePrefs(prefs);
  });

  document.getElementById('reset').addEventListener('click', () => {
    Object.assign(prefs, DEFAULTS);
    syncInputs();
    resolveTheme();
    sim.setState({ ...prefs, theme: sim.state.theme });
    try{ localStorage.removeItem(STORAGE_KEY); }catch{ /* storage unavailable */ }
  });

  const panel = document.getElementById('panel');
  const toggleBtn = document.getElementById('panel-toggle');
  const closeBtn = document.getElementById('panel-close');

  function openPanel(){
    panel.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
  }
  function closePanel(){
    panel.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();
  }
  toggleBtn.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !panel.hidden) closePanel(); });
}
