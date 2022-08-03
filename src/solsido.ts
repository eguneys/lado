import { createResource, onCleanup, on, createEffect, createSignal, createMemo, mapArray } from 'solid-js'
import { make_ref } from './make_sticky'
import { read, write, owrite } from './play'
import { loop } from './play'
import { make_midi } from './make_midi'
import { SamplesPlayer } from './audio'
import { short_range_flat_notes, fuzzy_note } from './audio'
import { majorKey, perfect_c_sharps, perfect_c_flats } from './audio'
import { get_note } from './audio'

const getPlayerController = async (input: boolean) => {
  if (input) {

    let srcs = {}

    short_range_flat_notes.forEach(n => srcs[n] = `${n}.mp3`)

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
          ons.forEach(_ => player?.attack(synth, fuzzy_note(_)))
          v.playing_note = fuzzy_note(ons[0])

        },
        just_offs(offs: Array<Note>) {
          let { player } = solsido
          offs.forEach(_ => player?.release(fuzzy_note(_)))
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
    }
  }

}

const make_playback = (solsido: Solsido) => {

  let _major = createSignal()

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
            let note = fuzzy_note(v.notes[x])

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
    }
  }
}

let key_to_bra = { '#': 'sharp_accidental', 'b': 'flat_accidental' }
let key_notes = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4']

let note_ys = 'B3 C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6'.split(' ')

const note_bra_y = n => {
  return note_ys.indexOf('G4') - note_ys.indexOf(n)
}

const key_signatures = sig => {
  let _ = sig[0]
  let nb = sig.length
  return key_notes.slice(0, nb).map((n, i) => `${key_to_bra[_]}@${i * 0.3 + 1.2},${note_bra_y(n) * 0.125}`)
}

const scale_in_notes = scale => {

  let i_note_index = note_ys.findIndex(_ => _[0] === scale[0][0])

  return note_ys.slice(i_note_index, i_note_index + scale.length + 1)
}

const make_major = (solsido: Solsido, key: Key) => {

  let _majorKey = majorKey(key)

  let __ns = scale_in_notes(_majorKey.scale)
  let __ks = key_signatures(_majorKey.keySignature)
  let i_wnote = __ks.length
  let gap_note = 1.3 - (i_wnote / 8) * 0.3
  let _bras = ['gclef@0.2,0', ...__ks, ...__ns.map((_, i) => `whole_note@${i * gap_note + i_wnote * 0.3 + 1.5},${note_bra_y(_)*0.125}`)]

  let _notes = __ns.map(n => _majorKey.scale.find(_ => _[0] === n[0]) + n[1])

  let _playback = createSignal(false)
  let _you = createSignal(false)

  let _xwi = createSignal('0,0,0')


  let m_klass = createMemo(() => [ 
    read(_you) ? 'you' : '',
    read(_playback) ? 'playback' : ''
  ])

  let _bras_playing = createSignal([])


  let self = {
    get klass() {
      return m_klass()
    },
    get majorKey() {
      return _majorKey
    },
    get bras() {
      return [..._bras]
    },
    get notes() {
      return _notes
    },
    set playing_note(note: Note) {
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
    get play_mode() {
      return read(_playback) ? 'stop' :'play'
    },
    get you_mode() {
      return read(_you) ? 'stop' : 'you'
    },
    set_play(v: boolean) {
      owrite(_playback, _ => v ? !_ : false)
    },
    set_you(v: boolean) {
      owrite(_you, _ => v ? !_ : false)
    },
    click_play() {
      owrite(solsido._user_click, true)
      solsido._majors.majors.forEach(_ => _.set_play(_ === this))
    },
    click_you() {
      owrite(solsido._user_click, true)
      solsido._majors.majors.forEach(_ => _.set_you(_ === this))
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

  let _perfect_c_sharps = perfect_c_sharps.slice(1).map(_ => make_major(solsido, _))
  let _perfect_c_flats = perfect_c_flats.slice(1).map(_ => make_major(solsido, _))

  let _c = make_major(solsido, perfect_c_sharps[0])

  return {
    get majors() {
      return [..._perfect_c_sharps, ..._perfect_c_flats, _c]
    },
    get c_major() {
      return _c
    },
    get sharps_flats_zipped() {
      return _perfect_c_sharps.map((_, i) => [_perfect_c_flats[i], _])
    },
  }
}
