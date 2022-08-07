import { onCleanup, createMemo, createSignal, createEffect } from 'solid-js'
import { read, write, owrite } from './play'

export const make_player = (m_player: Memo<PlayerController>, playback: Playback, m_notes: Memo<Array<NoteMs>>) => {

  let _synth = createSignal({ 
    wave: 'sawtooth', 
    volume: 1, 
    cutoff: 0.2, 
    cutoff_max: 0.4, 
    amplitude: 1, 
    filter_adsr: { a: 0.1, d: 0.1, s: 0, r: 0 }, 
    amp_adsr: { a: 0.1, d: 0.1, s: 0.2, r: 0.02 }
  })

  let _loop = createSignal([0, 16])

  let m_free = createMemo(() => m_notes().map(_ => {
    let [note, d_sub] = _.split('@')
    let [at, sub] = d_sub.split(',')
    return [note, parseInt(at), parseInt(sub), -1]
  }))

  createEffect(() => {
    let { on_sub } = playback
    if (on_sub) {
      let [_sub, ms] = on_sub
      let [_loop_begin, _loop_end] = read(_loop)
      let _loop_range = _loop_end - _loop_begin

      let sub = _sub % _loop_range + _loop_begin

      let _in = m_free().filter(_ => _[1] === sub && _[3] !== _sub)

      let player = m_player()
      let { bpm } = playback

      if (player && bpm) {
        _in.forEach(_ => {
          let [note, __, dur_subs] = _
          let duration = dur_subs * bpm.ms_per_sub
          player.attack(read(_synth), note, player.currentTime - ms / 1000)
          player.release(note, player.currentTime + (- ms + duration) / 1000)
          _[3] = _sub
        })
      }
    }
  })

  return {
    set loop(loop: [number, number]) {
      owrite(_loop, loop)
    },
    set synth(synth: Synth) {
      owrite(_synth, synth)
    }
  }


}
