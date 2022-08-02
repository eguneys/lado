const accToAlt = (acc: string) => acc[0] === 'b' ? -acc.length : acc.length


const ROMAN_REGEX = /^(#{1,}|b{1,}|x{1,}|)(IV|I{1,3}|VI{0,2}|iv|i{1,3}|vi{0,2})([^IViv]*)$/;


const ROMANS = "I II III IV V VI VII"
const NAMES = ROMANS.split(" ")
const NAMES_MINOR = ROMANS.toLowerCase().split(" ")


const all_roman = NAMES.map(_ => roman_parse(_))
const roman_by_name = new Map(all_roman.map(_ => [_.name, _]))

export const SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");
export const FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");

export const SHARPS_FLATS = [...new Set([...SHARPS, ...FLATS])]

export const OCTAVES = "0 1 2 3 4 5 6 7 8".split(" ")

export const NOTES = OCTAVES.flatMap(octave => SHARPS_FLATS.map(name => name+octave))


const SEMI = [0, 2, 4, 5, 7, 9, 11]

const mod = (n: number, m: number) => ((n % m) + m ) % m


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

export const fuzzy_note = (fuzzy: string) => {
  let res = by_midi.get(fuzzy) || by_name.get(fuzzy) || by_height.get(fuzzy) || parse(fuzzy)
  return res && all_by_freq.get(res.freq)?.find(_ => _.acc === '' || _.acc === 'b')
}

function keyScale(grades: string[]) {
  return (tonic: string): KeyScale => {
    let intervals = grades.map(gr => roman_by_name.get(gr).interval)
    //let scale = intervals.map(interval => transpose(tonic, interval))

    console.log(intervals)
    return {
      tonic,
      grades,
      intervals,
      //scale
    }
  }
}


const MajorScale = keyScale(
  "I II III IV V VI VII".split(" "))


function majorKey(tonic: string) {
  const pc = fuzzy_note(tonic).pc

  const keyScale = MajorScale(pc)

  return {
    ...keyScale
  }
}
console.log(majorKey('C4'))




function roman_token(str: string) {
  return ROMAN_REGEX.exec(str)
}

function roman_parse(str: string) {
  const [name, acc, roman, chordType] = roman_token(str)

  const upperRoman = roman.toUpperCase()
  const step = NAMES.indexOf(upperRoman)
  const alt = accToAlt(acc)
  const dir = 1
  return {
    name,
    roman,
    interval: interval({ step, alt, dir }).name,
    acc,
    chordType,
    alt,
    step,
    major: roman === upperRoman,
    oct: 0,
    dir
  }
}

// shorthand tonal notation (with quality after number)
const INTERVAL_TONAL_REGEX = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
// standard shorthand notation (with quality before number)
const INTERVAL_SHORTHAND_REGEX = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
const INTERVAL_REGEX = new RegExp(
  "^" + INTERVAL_TONAL_REGEX + "|" + INTERVAL_SHORTHAND_REGEX + "$"
);


export function tokenizeInterval(str?: IntervalName): IntervalTokens {
  const m = INTERVAL_REGEX.exec(`${str}`);
  return m[1] ? [m[1], m[2]] : [m[4], m[3]];
}

const SIZES = [0, 2, 4, 5, 7, 9, 11]
const TYPES = "PMMPPMM"
function parse_interval(str: string) {
  const tokens = tokenizeInterval(str)
  const num = +tokens[0]
  const q = tokens[1]
  const step = (Math.abs(num) - 1) % 7
  const t = TYPES[step]

  const type = t === "M" ? "majorable" : "perfectable"

  const name = '' + num + q
  const dir = num < 0 ? -1 : 1
  const simple = num === 8 || num === -8 ? num : dir * (step + 1)
  const alt = qToAlt(type, q)
  const oct = Math.floor((Math.abs(num) - 1) / 7)
  const semitones = dir * (SIZES[step] + alt + 12 * oct)
  const coord = encode({ step, alt, oct, dir })

  return {
    name,
    num,
    q,
    step,
    type,
    alt,
    dir,
    simple,
    semitones,
    coord,
    oct
  }
}


function qToAlt(type: Type, q: string): number {
  return (q === "M" && type === "majorable") ||
    (q === "P" && type === "perfectable") ? 0 : 
    q === "m" && type === "majorable" ? -1 : 
    /^A+$/.test(q) ? q.length :
    /^d+$/.test(q) ? -1 * (type === "perfectable" ? q.length : q.length + 1) : 0
}



const FIFTHS = [0, 2, 4, -1, 1, 3, 5]
const STEPS_TO_OCTS = FIFTHS.map((fifths: number) =>
                                 Math.floor((fifths * 7) / 12))

function encode(pitch) {
  const { step, alt, oct, dir = 1 } = pitch
  const f = FIFTHS[step] + 7 * alt

  if (oct === undefined) {
    return [dir * f]
  }

  const o = oct = STEPS_TO_OCTS[step] - 4 * alt
  return [dir * f, dir * o]
}
