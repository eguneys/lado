import { ticks } from './shared'
import { createMemo, createSignal, onCleanup, on, createEffect } from 'solid-js'
import { read, write, owrite } from './play'
import { make_playback } from './make_playback'
import { make_midi } from './make_midi'
import { fuzzy_note } from './audio'
import { majorKey } from './audio'

import { gen_pitch } from './gen'
import { loop } from './play'

export default class Sol_Ear {


  constructor(readonly solsido: Solsido) {

    this.playback = _make_playback(this)

  }
}


  let synth = {
    adsr: { a: 0, d: 0.5, s: 0.8, r: 0.6 }
  }


const _make_playback = (ear: Sol_Ear) => {
  let { solsido } = ear

  let _playback = make_playback(() => 4)
  _playback.bpm = 80
  _playback.playing = false

  let _guessed = createSignal()


  let m_correct = () => {
    let guessed = read(_guessed)
    return guessed !== undefined && guessed === fuzzy_note(m_note()) && m_note()
  }

  let _i_note = createSignal(0)
  let _pitches = createSignal(gen_pitch())
  let advance_pitch = () => {
    let l = read(_pitches).length
    owrite(_i_note, _ => (_ + 1) % l)
  }
  let _octave = createSignal(4)
  let m_octave = createMemo(() => read(_octave))



  createEffect(on(() => _playback.playing, p => {

    let midi
    if (p) {

      midi = make_midi({
        just_ons(ons: Array<Note>) {
          let { player } = solsido
          ons.slice(-1).forEach(_ => {
            let note = fuzzy_note(_)
            owrite(_guessed, note)
            player?.attack(synth, note)
          })
        },
        just_offs(offs: Array<Note>) {
          let { player } = solsido
          offs.forEach(_ => player?.release(fuzzy_note(_)))
          if (m_correct()) {
            advance_pitch()
          }
          owrite(_guessed, undefined)
        }
      })
    }
    onCleanup(() => {
      midi?.dispose()
    })
  }))
  let m_note = createMemo(() => read(_pitches)[read(_i_note)] + m_octave())
  let _notes = createMemo(() => {
    let note = m_note()
    if (!note) { return [] }
    return [`${fuzzy_note(note)}@0,2`]
  })

  let m_player = createMemo(() => {
    let notes = read(_notes)
    return make_player(synth, solsido.player, _playback, notes)
  })

  let m_bras = createMemo(() => ['gclef@0.2,0'])
  let m_xwi = createMemo(() => `${1 + ((_playback.bpm?.beat_ms[0]||0)%16 * 0.5)},0,0`)
  let m_staff_playback = createMemo(() => _playback.playing)

  let m_staff = createMemo(() => ({
    bras: m_bras(),
    xwi: m_xwi(),
    playback: m_staff_playback()
  }))


  let m_time_score = createMemo(() => _playback.playing ? make_time_score(0): undefined)

  createEffect(on(m_correct, c => {
    let _time_score = m_time_score()
    if (c) {
      _time_score?.add()
    } else {
      _time_score?.red_time()
    }
  }))

  createEffect(on(() => m_time_score()?.times_up, up => {
    if (up) {
      _playback.playing = false

      _result.score = m_time_score().score
      owrite(_show_results, true)
    }
  }))

  let _show_results = createSignal(false)
  let _result = make_result()

  let m_results = createMemo(on(_show_results[0], _ => _ && _result))



  return {
    cancel() {
      owrite(_show_results, false)
      _playback.playing = true
    },
    get results() {
      return m_results()
    },
    get time_score() {
      return m_time_score()
    },
    get play_mode() {
      return _playback.playing ? 'stop': 'play'
    },
    toggle_play() {
      solsido.user_click()
      _playback.playing = !_playback.playing
    },
    get staff() {
      return m_staff()
    },
    get correct() {
      return m_correct()
    }
  }
}




export const make_player = (synth: Synth, player: PlayerController, playback: Playback, notes: Array<NoteMs>) => {

  let _loop = createSignal([0, 16])

  let free = notes.map(_ => {
    let [note, d_sub] = _.split('@')
    let [at, sub] = d_sub.split(',')
    return [note, parseInt(at), parseInt(sub), -1]
  })

  createEffect(() => {
    let { on_sub } = playback
    if (on_sub) {
      let [_sub, ms] = on_sub
      let [_loop_begin, _loop_end] = read(_loop)
      let _loop_range = _loop_end - _loop_begin

      let sub = _sub % _loop_range + _loop_begin

      let _in = free.filter(_ => _[1] === sub && _[3] !== _sub)

      let { bpm } = playback

      if (player && bpm) {
        _in.forEach(_ => {
          let [note, __, dur_subs] = _
          let duration = dur_subs * bpm.ms_per_sub
          player.attack(synth, note, player.currentTime - ms / 1000)
          player.release(note, player.currentTime + (- ms + duration) / 1000)
          _[3] = _sub
        })
      }
    }
  })

  return {
    set loop(loop: [number, number]) {
      owrite(_loop, loop)
    }
  }
}


export const make_time_score = (time: number) => {

  let _time = createSignal(0)
  let cancel = loop((dt: number, dt0: number) => {
    owrite(_time, _ => _ += dt)
  })
  let m_time = createMemo(() => {
    let _ = read(_time)
    let res =  time === 0 ? Math.max(0, ticks.seconds * 120 - _) : _
    return res / 1000
  })

  onCleanup(() => {
    cancel()
  })

  let m_times_up = createMemo(on(m_time, (t, p) => {
    return t - p < 0 && t === 0
  }))

  let _score = createSignal(0)
  let _red_time = createSignal()

  let m_red_score = createMemo(() => {
    let red_time = read(_red_time)

    if (red_time) {
      return read(_time) - red_time < ticks.half
    }
  })



  let m_score_klass = createMemo(() => [
    m_red_score() ? 'red' : ''
  ])



  return {
    get score() {
      return read(_score)
    },
    add(n = 1) {
      owrite(_score, _ => _ + n)
    },
    get score_klass() {
      return m_score_klass()
    },
    get time() {
      return m_time()
    },
    red_time() {
      owrite(_red_time, read(_time))
    },
    get times_up() {
      return m_times_up()
    }
  }
}


const make_result = () => {

  let _result = createSignal(0)
  let _score = createSignal(0)
  let _high = createSignal(0)

  createEffect(on(_score[0], score => {
    let __high = read(_high)
    let high = Math.max(__high, score)
    owrite(_result, high)
    owrite(_high, _ => high)
  }))

  return {
    set score(n) {
      owrite(_score, n)
    },
    get result() {
      return read(_result)
    }
  }
}
