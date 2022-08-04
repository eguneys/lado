import { ticks } from './shared'
import { createResource, onCleanup, on, createEffect, createSignal, createMemo, mapArray } from 'solid-js'
import { make_ref } from './make_sticky'
import { read, write, owrite } from './play'
import { loop } from './play'
import { make_midi } from './make_midi'
import { SamplesPlayer } from './audio'
import { short_range_flat_notes, fuzzy_note } from './audio'
import { majorKey, perfect_c_sharps, perfect_c_flats } from './audio'
import { get_note, enharmonic } from './audio'
import { createLocal } from './make_storage'

const getHighscore = async (opts: ExerciseOptions) => {
  let [time, order, nb] = opts

}

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

  onClick() {
    //owrite(this._user_click, true)
  }

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

    this._exercises = make_exercises(this)

    this._majors = make_majors(this)

    this.major_playback = make_playback(this)

    this.major_you = make_you(this)
  }
}

function shuffleArr (array){
  for (var i = array.length - 1; i > 0; i--) {
    var rand = Math.floor(Math.random() * (i + 1));
    [array[i], array[rand]] = [array[rand], array[i]]
  }
}

const make_next_key = (order: Order, nb: Nb) => {

  let perfects = [[...perfect_c_sharps, ...perfect_c_flats],
    perfect_c_sharps,
    perfect_c_flats]

    let _res = perfects[nb].slice(0)

    if (order === 0) {
      shuffleArr(_res)
    }

  return key => {
    let i = key === undefined ? 0 : _res.indexOf(key) + 1
    return _res[i]
  }
}

const getHighLocal = (() => {
  const key = (order, nb) => [order, nb].join('_')

  let _ = {}
 
  let orders = [0, 1]
  let nbs = [0, 1, 2]

  orders.forEach(order => nbs.forEach(nb => {
    let _key = key(order, nb)
    _[_key] = createLocal(_key, 0)
  }))

  return opts => {
    let [time, order, nb] = opts

    return _[key(order, nb)]
  }

})()

const make_current = (solsido: Solsido, opts: ExerciseOptions) => {
  let [time, order, nb] = opts

  let _high = getHighLocal(opts)

  let _result = createSignal()

  let next_key = make_next_key(order, nb)

  let h_time = ['Challenge', 'Free']
  let h_order = ['', 'Sorted']
  let h_nb = ['', 'Sharps', 'Flats']

  let _score = createSignal(0)
  let _red_time = createSignal()

  let _time = createSignal(0)
  let cancel = loop((dt: number, dt0: number) => {
    owrite(_time, _ => _ += dt)
  })

  let m_red_score = createMemo(() => {
    let red_time = read(_red_time)

    if (red_time) {
      return read(_time) - red_time < ticks.half
    }
  })


  let m_time = createMemo(() => {
    let _ = read(_time)
    let res =  time === 0 ? Math.max(0, ticks.seconds * 60 - _) : _
    return res / 1000
  })

  onCleanup(() => {
    cancel()
  })

  let m_klass = createMemo(() => [ 
    'you'
  ])

  let m_score_klass = createMemo(() => [
    m_red_score() ? 'red' : ''
  ])

  let _playing_note = createSignal()

  let _key = createSignal(next_key())

  let m_majorKey = createMemo(() => majorKey(read(_key)))

  let m__ns = createMemo(() => scale_in_notes(m_majorKey().scale))
  let m__ks = createMemo(() => key_signatures(m_majorKey().keySignature))

  let m_i_wnote = createMemo(() => m__ks().length)
  let m_gap_note = createMemo(() => 1.3 - (m_i_wnote() / 8) * 0.3)

  let m_notes = createMemo(() => m__ns().map(n => m_majorKey().scale.find(_ => _[0] === n[0]) + n[1]))

  let m_bras = createMemo(() => ['gclef@0.2,0', ...m__ks(), ...m__ns().map((_, i) => `whole_note,ghost@${i * m_gap_note() + m_i_wnote() * 0.3 + 1.5},${note_bra_y(_)*0.125}`)])

  let _correct_notes = createSignal([], { equals: false })


  let m_playing_bras = createMemo(() => read(_correct_notes).map((no_flat_note, i) => `whole_note,live@${i * m_gap_note() + m_i_wnote() * 0.3 + 1.5},${note_bra_y(no_flat_note)*0.125}`))

  let self = {
    get result() {
      return read(_result)
    },
    get score() {
      return read(_score)
    },
    get score_klass() {
      return m_score_klass()
    },
    get time() {
      return m_time()
    },
    set playing_note(note: Note | undefined) {
      owrite(_playing_note, note)
    },
    get bras() {
      return [...m_bras(), ...m_playing_bras()]
    },
    get klass() {
      return m_klass()
    },
    get majorKey() {
      return m_majorKey()
    },
    get header() {
      return [h_time[time], h_order[order], h_nb[nb]].join(' ')
    },
    cancel() {
      solsido._exercises.cancel()
    }
  }

  createEffect(on(_correct_notes[0], v => {
    if (v.length === 8) {
      let _n = next_key(read(_key))

      if (_n) {

        owrite(_score, _ => _ + 1)
        owrite(_key, _n)
        owrite(_correct_notes, [])
      }

    }
  }))

  createEffect(on(_playing_note[0], (note, p) => {
    if (!p && !!note) {
      let _ = m_notes()[read(_correct_notes).length]
      let correct = (_ === note || enharmonic(_) === note) && _

      if (correct) {
        let _note = correct
        let no_flat_note = _note[0] + _note[_note.length - 1]
        write(_correct_notes, _ => _.push(no_flat_note))
      } else {
        owrite(_red_time, read(_time))
        owrite(_correct_notes, [])
      }
    }
  }))

  createEffect(on(m_time, (t, p) => {
    if (t - p < 0 && t === 0) {
      let __high = read(_high)
      let score = read(_score)
      let high = Math.max(__high, score)
      owrite(_result, high)
      owrite(_high, _ => high)
      solsido.major_you.stop_major(self)
    }
  }))



  return self
}

const make_exercises = (solsido: Solsido) => {

  let _time = createLocal('time', 0),
    _order = createLocal('order', 0),
    _nb = createLocal('nb', 0)

  let _current = createSignal()
  let m_current = createMemo(() => {
    let current = read(_current)
    if (current) {
      return make_current(solsido, current)
    }
  })

  createEffect(on(m_current, (v, p) => {
    if (v) {
      solsido.major_you.play_major(v)
    } else {
      if (!!p) {
        solsido.major_you.stop_major(p)
      }
    }
  }))

  let m_dton = createMemo(() => [read(_time), read(_order), read(_nb)])

  return {
    get dton() {
      return m_dton()
    },
    get current() {
      return m_current()
    },
    start(opts: ExerciseOptions) {

      owrite(_time, opts[0])
      owrite(_order, opts[1])
      owrite(_nb, opts[2])
      owrite(solsido._user_click, true)
      owrite(_current, opts)
    },
    cancel() {
      owrite(_current, undefined)
    }
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
          v.playing_note = undefined
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

let sharp_key_notes = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4']
let flat_key_notes = ['B4', 'E5', 'A4', 'D5', 'G5', 'C5', 'F5']

let key_to_notes = { undefined: [], '#': sharp_key_notes, 'b': flat_key_notes }

let note_ys = 'B3 C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6'.split(' ')

const note_bra_y = n => {
  return note_ys.indexOf('G4') - note_ys.indexOf(n)
}

const key_signatures = sig => {
  let _ = sig[0]
  let nb = sig.length
  let key_notes = key_to_notes[_]
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

  let _playing_note = createSignal()

  let _bras_playing = createMemo(() => {
    let note = read(_playing_note)
    if (!note) {
      return []
    }

    let correct = _notes.find(_ => _ === note || enharmonic(_) === note)

    let _note = correct || note
    let no_flat_note = _note[0] + _note[_note.length - 1]

    let klass = correct ? 'green' : 'red'

    let bra_1 = `whole_note,live,${klass}@${8 * gap_note + i_wnote * 0.3 + 1.5},${note_bra_y(no_flat_note)*0.125}`

    return [bra_1]
  })


  let self = {
    get klass() {
      return m_klass()
    },
    get majorKey() {
      return _majorKey
    },
    get bras() {
      return [..._bras, ..._bras_playing()]
    },
    get notes() {
      return _notes
    },
    set playing_note(note: Note | undefined) {
      owrite(_playing_note, note)
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
