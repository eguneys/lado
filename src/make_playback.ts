import { batch, onCleanup, createSignal, createMemo, createEffect } from 'solid-js'
import { read, write, owrite, loop } from './play'

export const make_playback = () => {
  let _playing = createSignal(false)

  let m_bpm = createMemo(() => {
    if (read(_playing)) {
      return make_bpm(120)
    }
  })

  return {

    get bpm() {
      return m_bpm()
    },
    set playing(v: boolean) {
      owrite(_playing, v)
    },
    get playing() {
      return read(_playing)
    }
  }
}

export const make_bpm = (bpm: number = 120) => {
  let _bpm = createSignal(bpm)
  let _ms_per_beat = createMemo(() => 60000 / read(_bpm))

  let _beat = createSignal(0)
  let _lookahead_ms = 16

  let _t = createSignal(_lookahead_ms)
  let m_t = createMemo(() => read(_t) - _lookahead_ms)
  let cancel = loop((dt: number, dt0: number) => {
    let t = read(_t)
    let ms_per_beat = _ms_per_beat()

    if (t + dt + _lookahead_ms > ms_per_beat) {
      batch(() => {
        owrite(_t, _ => _ = _ - ms_per_beat + dt)
        owrite(_beat, _ => _ + 1)
      })
    } else {
      owrite(_t, _ => _ + dt)
    }
  })

  onCleanup(() => {
    cancel()
  })

  return {
    set bpm(bpm: number) {
      owrite(_bpm, Math.max(20, bpm))
    },
    get beat_ms() {
      return [read(_beat), m_t(), m_t() / _ms_per_beat()]
    }
  }
}
