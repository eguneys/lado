import { Midi } from './midi'
import { loop } from './play'

let midi = new Midi().init()

export const make_midi = (hooks: Hooks) => {
  
  midi.clear()

  let clear = loop((dt: number, dt0: number) => {

    let { just_ons, just_offs } = midi

    if (just_ons.length > 0) {
      hooks.just_ons(just_ons.map(_ => _))
    }

    if (just_offs.length > 0) {
      hooks.just_offs(just_offs.map(_ => _))
    }

    midi.update(dt, dt0)
  })


  return {
    dispose() {
      midi.clear()
      clear()
    }
  }
}
