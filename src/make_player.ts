import { createSignal, createEffect } from 'solid-js'
import { read, write, owrite } from './play'

export const make_player = (player: Memo<PlayerController>, playback: Playback, notes: Array<NoteMs>) => {

  let _synth = createSignal({ })

  let _loop = createSignal([0, 16])

  let _free = notes.map(_ => {
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

      let _in = _free.filter(_ => _[1] === sub && _[3] !== _sub)

      _in.forEach(_ => {
        let [note, __, dur_subs] = _
        let duration = dur_subs * playback.bpm.ms_per_sub
        player()?.attack(read(_synth), note, player.currentTime - ms)
        player()?.release(note, player.currentTime - ms + duration)
        _[3] = _sub
      })
    }
  })

  return {
  }


}
