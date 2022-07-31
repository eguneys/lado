export function midiToFreq(midi: number) {
  return Math.pow(2, (midi - 69) / 12) * 440
}

/* https://github.com/tonaljs/tonal/blob/main/packages/core/src/note.ts */
const REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;

export function tokenizeNote(str: string) {
  const m = REGEX.exec(str)
  return [m[1].toUpperCase(), m[2].replace(/x/g, '##'), m[3], m[4]]
}

const mod = (n: number, m: number) => ((n % m) + m) % m

const accToAlt = acc => acc[0] === 'b' ? -acc.length : acc.length

const SEMI = [0, 2, 4, 5, 7, 9, 11]

export function uci_midi(uci: string) {

  const tokens = tokenizeNote(uci)

  const [letter, acc, octStr] = tokens

  const step = (letter.charCodeAt(0) + 3) % 7
  const alt = accToAlt(acc)
  const oct = octStr.length ? +octStr : undefined
  const height = oct === undefined ? mod(SEMI[step] + alt, 12) - 12 * 99
  : SEMI[step] + alt + 12 * (oct + 1)

  return height
}
