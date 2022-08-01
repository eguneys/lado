export const SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");
export const FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");

export const SHARPS_FLATS = [...new Set([...SHARPS, ...FLATS])]

export const OCTAVES = "0 1 2 3 4 5 6 7 8".split(" ")

export const NOTES = OCTAVES.flatMap(octave => SHARPS_FLATS.map(name => name+octave))


const SEMI = [0, 2, 4, 5, 7, 9, 11]

const mod = (n: number, m: number) => ((n % m) + m ) % m

const accToAlt = (acc: string) => acc[0] === 'b' ? -acc.length : acc.length

const REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
export function tokenizeNote(str: string) {
  const m = REGEX.exec(str)
  return [m[1].toUpperCase(), m[2].replace(/x/g, '##'), m[3], m[4]]
}

function parse(noteName: string) {

  const tokens = tokenizeNote(noteName)

  const [letter, acc, octStr] = tokens


  const step = (letter.charCodeAt(0) + 3) % 7
  const alt = accToAlt(acc)
  const oct = octStr.length ? parseInt(octStr) : undefined

  const name = letter + acc + octStr
  const pc = letter + acc
  const height =
    oct === undefined ? mod(SEMI[step] + alt, 12) - 12 * 99 :
    SEMI[step] + alt + 12 * (oct + 1)
  const midi = height
  const freq = Math.pow(2, (height - 69) / 12) * 440

  return {
    name,
    pc,
    height,
    midi,
    freq,
    oct,
    acc
  }
}

export const all = NOTES.map(parse)
export const all_freqs = [...new Set(all.map(_ => _.freq))]

export const by_octaves = OCTAVES.map(_ => all.filter(__ => __.oct === parseInt(_)))
export const by_freqs = all_freqs.map(_ => all.filter(__ => __.freq === _))

export const by_name = new Map(all.map(_ => [_.name, _]))
export const by_height = new Map(all.map(_ => [_.height, _]))
export const by_midi = new Map(all.map(_ => [_.midi, _]))
export const all_by_freq = new Map(by_freqs.map(_ => [_[0].freq, _]))
export const all_by_octave = new Map(by_octaves.map(_ => [_[0].oct, _]))

export const fuzzy_name = (fuzzy: string) => {
  let res = by_midi.get(fuzzy) || by_name.get(fuzzy) || by_height.get(fuzzy) || parse(fuzzy)
  return res && all_by_freq.get(res.freq)?.find(_ => _.acc === '' || _.acc === 'b')
}
