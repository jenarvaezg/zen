export const PALETTES = {
  arena: {
    light: ['#C9AD8C', '#B08968', '#8C7A66', '#DCC7A6', '#A9765C'],
    dark:  ['#D8BE9A', '#B98F68', '#9C8974', '#E4D0AC', '#BE8563'],
  },
  musgo: {
    light: ['#7C9885', '#5E7A66', '#A3B899', '#4B6455', '#8FAF8A'],
    dark:  ['#8FAE97', '#6C8E77', '#B2C6A9', '#597A63', '#9FC099'],
  },
  atardecer: {
    light: ['#D98E73', '#C97B63', '#E3B778', '#B96B6B', '#E0A96D'],
    dark:  ['#E19E82', '#D6896F', '#EBC489', '#C57979', '#E8B87C'],
  },
  pizarra: {
    light: ['#6B7280', '#5F6B73', '#8A94A6', '#4A525C', '#9AA5B1'],
    dark:  ['#8A94A2', '#727F8A', '#9BA8B8', '#5B6570', '#AAB6C0'],
  },
  reveni: {
    light: ['#F28536', '#6CE869', '#2E7D5B', '#C9702E', '#3FA6A6'],
    dark:  ['#F2954C', '#7DEE7A', '#4A9A73', '#D6873F', '#54B9B9'],
  },
};

export function ballColors(paletteName, theme){
  const p = PALETTES[paletteName] || PALETTES.arena;
  return theme === 'dark' ? p.dark : p.light;
}
