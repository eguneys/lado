import { createResource, onCleanup, on, createEffect, createSignal, createMemo, mapArray } from 'solid-js'
import { make_ref } from './make_sticky'
import { read, write, owrite } from './play'
import { loop } from './play'
import { make_midi } from './make_midi'
import { SamplesPlayer, all_by_octave, fuzzy_name } from './audio'

const getPlayerController = async (input: boolean) => {
  if (input) {

    let treble_notes = [3, 4, 5, 6]
    .flatMap(_ => all_by_octave.get(_))
    .filter(_ => !_.name.includes('#'))

    let srcs = {}

    treble_notes.forEach(n => srcs[n.name] = `${n.name}.mp3`)

    let p = new SamplesPlayer()
    await p.init({
      srcs,
      base_url: 'assets/audio/'
    })
    return p
  }
}

export default class Solsido {

  onScroll() {
    this.ref.$clear_bounds()
  }

  get player() {
    return read(this.r_pc)
  }

  constructor() {

    this._user_click = createSignal(false)

    this.r_pc = createResource(this._user_click[0], getPlayerController)

    this.ref = make_ref()

    this._majors = make_majors(this)

    this.major_playback = make_playback(this)

    this.major_you = make_you(this)
  }
}

let synth = {
  adsr: { a: 0, d: 0.1, s: 0.8, r: 0.6 }
}


const make_you = (solsido: Solsido) => {

  let _major = createSignal()

  createEffect(on(_major[0], v => {
    if (v) {

      let midi = make_midi({
        just_ons(ons: Array<Note>) {
          let { player } = solsido
          ons.forEach(_ => player?.attack(synth, fuzzy_name(_).name))
          v.playing_note = fuzzy_name(ons[0])

        },
        just_offs(offs: Array<Note>) {
          let { player } = solsido
          offs.forEach(_ => player?.release(fuzzy_name(_).name))
        }
      })
      onCleanup(() => {
        midi.dispose()
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
      owrite(solsido._user_click, true)
      solsido._majors.majors.forEach(_ => _.set_play_you(_ === major))
    }
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

      return parseFloat(rest.split(',')[0])
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

      let x = -1
      let _i = 0

      let _x, _w
      let cancel = loop((dt: number, dt0: number) => {
        _i += dt

      let { player } = solsido
        if (_i >= ms_p_note) {
          _i -= ms_p_note
          x = x + 1

          if (x >= 8) {
            x -= 9
          } else {
            [_x, _w] = v.xw_at(x)
            let note = fuzzy_name(v.notes[x]).name

            player?.attack(synth, note)
            player?.release(note, player.currentTime + (ms_p_note - _i)/1000)
          }
        }

        if (x > -1) {
          v.xwi = `${_x},${_w},${(_i/ms_p_note) * 100}`
        }
      })
      onCleanup(() => {
        cancel()
        v.xwi = `0,0,0`
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
      owrite(solsido._user_click, true)
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
  'D Major',
  'F# Major'
]

let flats = {
  'F Major': ['F4', 'B4'],
  'Bflat Major': ['B3', 'B4', 'E5'],
}

let sharps = {
  'G Major': ['G4', 'F5'],
  'D Major': ['D4', 'F5', 'C5'],
  'F# Major': ['F4', 'F5', 'C5', 'G5', 'D5', 'A4', 'E5']
}

let increasing = [...Array(8).keys()].map(_ => _ * 0.125)

let notes = ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5']

const note_y = note => 0.625 - notes.indexOf(note) * 0.125

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
  let i_wnote = _sharps.length
  let g_wnote = 1.3 - (i_wnote / 8) * 0.3
  return [
    'gclef@0.2,0',
    ..._sharps.map((_, i) => `sharp_accidental@${i*0.3+1.2},${note_y(_)}`),

    ...increasing.map((_, i) => `whole_note@${i*g_wnote+1.5 + i_wnote * 0.3},${note_y(note) - _}`)]
}

const cmajor_bras = [
  'gclef@0.2,0', ...increasing.map((_, i) => `whole_note@${i*1.3+1.5},${note_y('C4')-_}`)]

const octave_notes = (note: string) => notes.slice(notes.indexOf(note), notes.indexOf(note) + 8)

const cmajor_notes = octave_notes('C4')
const flat_notes = key => {
  let [note, ..._flats] = flats[key]
  let _notes = octave_notes(note)

  return _notes.map(_ => _flats.includes(_) ? _[0] + 'b' + _[1] : _)
} 

const sharp_notes = key => {
  let [note, ..._sharps] = sharps[key]
  let _notes = octave_notes(note)

  return _notes.map(_ => _sharps.includes(_) ? _[0] + '#' + _[1] : _)
} 

const make_major = (solsido: Solsido, _major: Major) => {

  let [key, major] = _major.split(' ')

  let _c_major = _major === c_major
  let _flat_major = flat_majors.includes(_major)
  let _sharp_major = sharp_majors.includes(_major)

  let _bras = _c_major ? cmajor_bras : _flat_major ? flat_bras(_major) : sharp_bras(_major)
  let _notes = _c_major ? cmajor_notes : _flat_major ? flat_notes(_major) : sharp_notes(_major)

  let _playback = createSignal(false)
  let _you = createSignal(false)

  let _xwi = createSignal('0,0,0')


  let m_klass = createMemo(() => [ 
    read(_you) ? 'you' : '',
    read(_playback) ? 'playback' : ''
  ])

  let _bras_playing = createSignal([])


  let self = {
    key,
    get klass() {
      return m_klass()
    },
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
      return [..._bras, ...read(_bras_playing)]
    },
    set playing_note(note: Note) {
      
      //owrite(_bras_playing, note_bras(note))
    },
    get notes() {
      return _notes
    },
    xw_at(x: number) {

      let i_n = _bras.findIndex(_ => _.match('whole_note'))

      let _i = 0
      let i_x = _bras.findIndex(_ => _.match('whole_note') && _i++ === x)

      let i_n1 = _bras[i_n],
        i_n2 = _bras[i_n+1],
        i_nx = _bras[i_x]

      let x1 = i_n1.split('@')[1].split(',')[0],
        x2 = i_n2.split('@')[1].split(',')[0],
        xx = i_nx.split('@')[1].split(',')[0]

      return [parseFloat(xx), parseFloat(x2)-parseFloat(x1)]
    },
    get play() {
      return read(_playback) ? 'stop' :'play'
    },
    set_play(v: boolean) {
      owrite(_playback, _ => v ? !_ : false)
    },
    get you_mode() {
      return read(_you) ? 'stop' : 'you'
    },
    set_play_you(v: boolean) {
      owrite(_you, _ => v ? !_ : false)
    },
    get you() {
      return read(_you)
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


  createEffect(on(_you[0], (v, p) => {
    if (v) {
      solsido.major_you.play_major(self)
    } else {
      if (!!p) {
        solsido.major_you.stop_major(self)
      }
    }
  }))



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
