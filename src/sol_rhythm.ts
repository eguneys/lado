import { on, createEffect, createMemo, createSignal } from 'solid-js'
import { read, write, owrite } from './play'
import { Solsido } from './solsido'
import { make_playback } from './make_playback'
import { make_player } from './make_player'

let bpms = [20, 30, 60, 90, 120, 180, 200, 400]

export default class Sol_Rhythm {


  constructor(readonly solsido: Solsido) {
    this._exercises = make_exercises(this)
  }
}


const make_exercises = (rhythm: Sol_Rhythm) => {

  let yardstick = make_yardstick(rhythm)

  return {
    yardstick
  }
}

const make_yardstick = (rhythm: SolRhythm) => {
  let { solsido } = rhythm

  let _nb_beats = createSignal(4)

  let _playback = make_playback()
  _playback.playing = true

  let m_osc_player = createMemo(() => solsido.osc_player)

  let m_up_notes = createMemo(() => ['C4@0,2'])
  let m_down_notes = createMemo(() => ['D#@4,2', 'D#@8,2', 'D#@12,2'])

  let _m_up_player = make_player(m_osc_player, _playback, m_up_notes)
  let _m_down_player = make_player(m_osc_player, _playback, m_down_notes)

  createEffect(() => {
    let beats = read(_nb_beats)
    _m_up_player.loop = [0, beats * 4]
    _m_down_player.loop = [0, beats * 4]
  })

  _m_up_player.synth = {
    wave: 'sine', 
    volume: 1, 
    cutoff: 0.3, 
    cutoff_max: 0.2, 
    amplitude: 1, 
    filter_adsr: { a: 0, d: 0.03, s: 0.5, r: 0 }, 
    amp_adsr: { a: 0.01, d: 0.02, s: 0, r: 0 }
  }
  _m_down_player.synth = {
    wave: 'sine', 
    volume: 1, 
    cutoff: 0.2, 
    cutoff_max: 0.4, 
    amplitude: 1, 
    filter_adsr: { a: 0.02, d: 0.02, s: 0, r: 0 }, 
    amp_adsr: { a: 0.01, d: 0.01, s: 0, r: 0.02 }
  }

  let m_x = createMemo(() => {
    let beat_ms = _playback.bpm?.beat_ms

    if (beat_ms) {
      let [sub, ms, sub_i, subs] = beat_ms

      let beat = (sub + sub_i) / subs
      return beat
    }
  })

  /*
  
   0 1 2 3
   4 5 6 7

   1 1
   3 3
   3.5 3.5
   4 1
  */
  let m_cursor1_x = createMemo(() => {
    let nb_beats = read(_nb_beats)
    let half = nb_beats / 2
    return ((m_x() - half) % nb_beats + half) /nb_beats
  })

  let m_cursor2_x = createMemo(() => {
    let nb_beats = read(_nb_beats)
    let half = nb_beats / 2
    return ((m_x() + half) % nb_beats - half) /nb_beats
  })

  let _beats = [...Array(48 * 4 + 1).keys()]
  .map(i => make_beat(rhythm, i, _nb_beats))

  let m_cursor1_style = createMemo(() => ({
    left: `${m_cursor1_x() * 48 * 100/49}%`
  }))

  let m_cursor2_style = createMemo(() => ({
    left: `${m_cursor2_x() * 48 * 100/49}%`
  }))


  return {
    get cursor1_style() { return m_cursor1_style() },
    get cursor2_style() { return m_cursor2_style() },
    get beats() {
      return _beats
    },
    get bpm() {
      return _playback.bpm.bpm
    },
    set bpm(value: number) {
      let _bpm = bpms.indexOf(_playback.bpm.bpm) + value + bpms.length
      _bpm = Math.max(0, _bpm) % bpms.length

      _playback.bpm = bpms[_bpm]
    }
  }
}

const make_beat = (rhythm: SolRhythm, i: number, _nb_beats: number) => {

  // beat 0-15

  let m_n = createMemo(() => (48 * 4) / read(_nb_beats))
  let m_on_beat = createMemo(() => i %m_n() === 0)
  let m_up_beat = createMemo(() => i % (m_n()/ 2) === 0)
  let m_sub_division = createMemo(() => i % (m_n() / 4) === 0)
  let m_strong = createMemo(() => m_on_beat())
  let m_medium = createMemo(() => m_up_beat())
  let m_weak = createMemo(() => m_sub_division())

  let m_klass = createMemo(() => [
    m_strong() ? 'strong': 
      m_medium() ? 'medium': 
        m_weak() ? 'weak' : ''
  ].join(' '))

  return {
    get klass() { return m_klass() }
  }
}
