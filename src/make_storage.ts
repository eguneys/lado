import { on, createSignal, createEffect } from 'solid-js'
import { storage } from './storage'

export const createLocal = (key, _default, opts) => {
  let _s = storage.make(key)
  let _ = createSignal(parseInt(_s.get()) || _default, opts)


  createEffect(on(_[0], (v, p) => {
    if (v === undefined) {
      _s.remove()
    } else {
      _s.set(v)
    }
  }))

  return _
}
