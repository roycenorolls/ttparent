// The three brand colours with the shades the playful components need:
// main fill, darker bottom edge, light tint, soft card edge, and the text
// colour that reads on the main fill (white is unreadable on yellow).
export const ACCENTS = {
  red:    { main: '#E03248', edge: '#B0192D', tint: '#FFE3E7', soft: '#FFD0D7', on: '#fff' },
  yellow: { main: '#FFCA05', edge: '#D9A800', tint: '#FFF3C4', soft: '#FFE9A0', on: '#003087' },
  blue:   { main: '#2F6FE4', edge: '#1C4FB3', tint: '#E3ECFF', soft: '#CFDDFB', on: '#fff' },
};

// Lists (feed cards, children, month headers) cycle red → yellow → blue.
const ROTATION = ['red', 'yellow', 'blue'];
export const accentAt = i => ACCENTS[ROTATION[i % ROTATION.length]];
