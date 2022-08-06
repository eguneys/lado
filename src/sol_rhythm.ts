import { createEffect, createMemo, createSignal } from 'solid-js'
import { read, write, owrite } from './play'
import { Solsido } from './solsido'
import { make_playback } from './make_playback'

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

  let _nb_beats = createSignal(4)

  let _playback = make_playback()

  _playback.playing = true
  _playback.bpm.bpm = 120
  let m_x = createMemo(() => {
    let [beat, ms, i] = _playback.bpm?.beat_ms

    return beat + i
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
