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

  let _major = createSignal()

  let m_bras = createMemo(() => read(_major)?.bras)

  let m_off_bras = createMemo(() => {
    let bras = m_bras()
    if (bras) {
      let _ = bras.find(_ => _.match('whole_note'))

      let [__,rest] = _.split('@')

      return parseInt(rest.split(',')[0])
    }
    return 0
  })

  let bpm = 120
  let note_per_beat = 2

  let note_p_m = bpm * note_per_beat
  let note_p_ms = note_p_m / 60 / 1000
  let ms_p_note = 1 / note_p_ms

  createEffect(on(_major[0], v => {
    if (v) {

      let x = 0
      let _i = 0
      let cancel = loop((dt: number, dt0: number) => {
        _i += dt

        if (_i >= ms_p_note) {
          _i -= ms_p_note
          x = (x + 1) % 8
        }

        v.xwi = `${m_off_bras() + x * 1.3},1.2,${(_i/ms_p_note) * 100}`
      })
      onCleanup(() => {
        cancel()
        //console.log('done')
      })
    }
  }))

  return {
    play_major(major: Major) {
      owrite(_major, major)
    },
    stop_major(major: Major) {
      owrite(_major, _ => _ === major ? undefined : _)
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

  let _xwi = createSignal('0,0,0')

  let self = {
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
      return read(_playback)
    },
    set xwi(xwi: XWI) {
      owrite(_xwi, xwi)
    },
    get xwi() {
      return read(_xwi)
    }
  }

  createEffect(on(_playback[0], (v, p) => {
    if (v) {
      solsido.major_playback.play_major(self)
    } else {
      if (!!p) {
        solsido.major_playback.stop_major(self)
      }
    }
  }))


  return self
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
