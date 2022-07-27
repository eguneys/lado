import { createSignal, createMemo, mapArray } from 'solid-js'
import { make_ref } from './make_sticky'
import { read, write, owrite } from './play'

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

  let _x = createSignal()

  let m_style = createMemo(() => ({
    transform: `translate(${read(_x)+1}em, 0)`
  }))

  return {
    _bras(bras: Bras) {
      console.log(bras)
    },
    get style() {
      return m_style()
    },
    set_play(major: Major) {
      solsido._majors.majors.forEach(_ => _.set_play(_ === major))
    }
  }
}

let increasing = [...Array(8).keys()].map(_ => _ * 0.125)

const bras_of = {
  'C major': ['gclef@0.2,0', ...increasing.map((_, i) => `whole_note@${i*1.3+1.5},${0.5 - _}`)],
  'F major': ['gclef@0.2,0', 'flat_accidental@1.2,-0.25', ...increasing.map((_, i) => `whole_note@${i*1.3+2},${0.125 - _}`)],
  'G major': ['gclef@0.2,0', 'sharp_accidental@1.2,-0.75', ...increasing.map((_, i) => `whole_note@${i*1.3+2},${0 - _}`)],
  'Bflat major': ['gclef@0.2,0', 'flat_accidental@1.2,-0.25', 'flat_accidental@1.5,-0.625', ...increasing.map((_, i) => `whole_note@${i*1.3+2},${0.625 - _}`)],
  'D major': ['gclef@0.2,0', 'sharp_accidental@1.5,-0.375', 'sharp_accidental@1.2,-0.75', ...increasing.map((_, i) => `whole_note@${i*1.3+2},${0.375 - _}`)],
}

const make_major = (solsido: Solsido, _major: Major) => {

  let [key, major] = _major.split(' ')
  let _bras = bras_of[_major]

  let _playback = createSignal(false)

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
        solsido.major_playback._bras(_bras)
        return solsido.major_playback
      }
    }
  }
}

const make_majors = (solsido: Solsido) => {

  let _majors = createSignal(['C major','F major', 'G major', 'Bflat major', 'D major'])

  let m_majors = createMemo(mapArray(_majors[0], _ => make_major(solsido, _)))

  return {
    get majors() {
      return m_majors()
    },
    major(key: string) {
      return m_majors().find(_ => _.key === key)
    }
  }
}
