import { batch, onCleanup, createSignal, createMemo, createEffect } from 'solid-js'
import { read, write, owrite, loop } from './play'



export const make_playback = (m_nb_beats: Memo<number>, m_notes: Memo<NoteMs>) => {

  let _playing = createSignal(false)

  let _bpm = createSignal(120)

  let m_bpm = createMemo(() => {
    if (read(_playing)) {
      return make_bpm(m_nb_beats(), read(_bpm))
    }
  })

  let m_trigger = createMemo(() => {
    let __ = m_bpm()?.beat_ms
    if (__) {
      let [sub, ms, i_sub, subs] = __
      if (i_sub < 0) {
        return __
      } 
    }
  })

  return {
    get on_sub() {
      return m_trigger()
    },
    get bpm() {
      return m_bpm()
    },
    set bpm(bpm: number) {
      owrite(_bpm, bpm)
    },
    set playing(v: boolean) {
      owrite(_playing, v)
    },
    get playing() {
      return read(_playing)
    }
  }
}

export const make_bpm = (nb_beats: number, bpm: number = 120) => {
  let _bpm = createSignal(bpm)
  let _ms_per_beat = createMemo(() => 60000 / read(_bpm))

  let _subs = createSignal(4)

  let _ms_per_sub = createMemo(() => read(_ms_per_beat) / read(_subs))

  let _sub = createSignal(-2 * nb_beats - 1)
  let _lookahead_ms = 20

  let _t = createSignal(_lookahead_ms)
  let m_t = createMemo(() => read(_t) - _lookahead_ms)
  let cancel = loop((dt: number, dt0: number) => {
    let t = read(_t)
    let ms_per_sub = _ms_per_sub()
    if (t + dt + _lookahead_ms > ms_per_sub) {
      batch(() => {
        owrite(_t, _ => _ = _ - ms_per_sub + dt)
        owrite(_sub, _ => _ + 1)
      })
    } else {
      owrite(_t, _ => _ + dt)
    }
  })

  onCleanup(() => {
    cancel()
  })

  return {
    get bpm() {
      return read(_bpm)
    },
    set bpm(bpm: number) {
      owrite(_bpm, Math.max(20, bpm))
    },
    get beat_ms() {
      return [read(_sub), m_t(), m_t() / _ms_per_sub(), read(_subs)]
    },
    get ms_per_sub() {
      return _ms_per_sub()
    }
  }
}
