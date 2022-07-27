import { onCleanup, on, createEffect, createSignal, createMemo, mapArray } from 'solid-js'
import { make_ref } from './make_sticky'
import { read, write, owrite } from './play'
import { loop } from './play'

export default class Solsido {

  onScroll() {
    this.ref.$clear_bounds()
  }

  constructor() {
    this.ref = make_ref()

    this._majors = make_majors(this)

    this.major_playback = make_playback(this)
  }
}


const make_playback = (solsido: Solsido) => {

  let _x = createSignal(0)
  let _bras = createSignal()

  let m_off_bras = createMemo(() => {
    let bras = read(_bras)
    if (bras) {
      return 1.5 
    }
    return 0
  })

  let bpm = 20
  let note_per_beat = 2

  let note_p_m = bpm * note_per_beat
  let note_p_ms = note_p_m / 60 / 1000
  let ms_p_note = 1 / note_p_ms

  createEffect(on(_bras[0], v => {
    if (v) {

      owrite(_x, 0)
      let _i = 0
      let cancel = loop((dt: number, dt0: number) => {
        _i += dt

        if (_i >= ms_p_note) {
          _i -= ms_p_note
          owrite(_x, _ => (_ + 1) % 8)
        }
      })
      onCleanup(() => {
        cancel()

        console.log('done')
      })
    }
  }))

  let m_style = createMemo(() => ({
    transform: `translate(${read(_x)*1.3+m_off_bras()}em, 0)`,
    width: `1.2em`
  }))

  return {
    play_bras(bras: Bras) {
      owrite(_bras, bras)
    },
    stop_bras(bras) {
      owrite(_bras, _ => _ === bras ? undefined : _)
    },
    get style() {
      return m_style()
    },
    set_play(major: Major) {
      solsido._majors.majors.forEach(_ => _.set_play(_ === major))
    }
  }
}

let c_major = 'C Major'

let flat_majors = [
  'F Major',
  'Bflat Major'
]

let sharp_majors = [
  'G Major',
  'D Major'
]

let flats = {
  'F Major': ['f4', 'b5'],
  'Bflat Major': ['b4', 'b5', 'e5'],
}

let sharps = {
  'G Major': ['g4', 'f5'],
  'D Major': ['d4', 'f5', 'c5']
}

let increasing = [...Array(8).keys()].map(_ => _ * 0.125)

let notes = ['c4', 'd4', 'e4', 'f4', 'g4', 'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5']

const note_y = note => 0.5 - notes.indexOf(note) * 0.125

const flat_bras = key => {
  let [note, ..._flats] = flats[key]
  return [
    'gclef@0.2,0',
    ..._flats.map((_, i) => `flat_accidental@${i*0.3+1.2},${note_y(_)}`),
    ...increasing.map((_, i) => `whole_note@${i*1.3+2},${note_y(note) - _}`)
  ]
}

const sharp_bras = key => {
  let [note, ..._sharps] = sharps[key]
  return [
    'gclef@0.2,0',
    ..._sharps.map((_, i) => `sharp_accidental@${i*0.3+1.2},${note_y(_)}`),

    ...increasing.map((_, i) => `whole_note@${i*1.3+2},${note_y(note) - _}`)]
}

const cmajor_bras = [
  'gclef@0.2,0', ...increasing.map((_, i) => `whole_note@${i*1.3+1.5},${note_y('c4')-_}`)]

const make_major = (solsido: Solsido, _major: Major) => {

  let [key, major] = _major.split(' ')

  let _c_major = _major === c_major
  let _flat_major = flat_majors.includes(_major)
  let _sharp_major = sharp_majors.includes(_major)

  let _bras = _c_major ? cmajor_bras : _flat_major ? flat_bras(_major) : sharp_bras(_major)

  let _playback = createSignal(false)


  createEffect(on(_playback[0], (v, p) => {
    if (v) {
      solsido.major_playback.play_bras(_bras)
    } else {
      if (!!p) {
        solsido.major_playback.stop_bras(_bras)
      }
    }
  }))

  return {
    key,
    get letter() {
      return key[0]
    },
    get flat() {
      return !!key.match('flat')
    },
    get name() {
      return _major
    },
    get bras() {
      return _bras
    },
    get play() {
      return read(_playback) ? 'stop' :'play'
    },
    set_play(v: boolean) {
      owrite(_playback, _ => v ? !_ : false)
    },
    get playback() {
      if (read(_playback)) {
        return solsido.major_playback
      }
    }
  }
}

const make_majors = (solsido: Solsido) => {

  let _majors = [
    c_major,
    ...flat_majors,
    ...sharp_majors
  ]

  let m_majors = _majors.map(_ => make_major(solsido, _))

  return {
    get majors() {
      return m_majors
    },
    major(key: string) {
      return m_majors.find(_ => _.key === key)
    }
  }
}
