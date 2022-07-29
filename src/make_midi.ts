import { Midi, midi_note_octave } from './midi'
import { loop } from './play'

export const make_midi = (hooks: Hooks) => {
  
  let midi = new Midi().init()

  loop((dt: number, dt0: number) => {

    let { just_ons, just_offs } = midi

    if (just_ons.length > 0) {
      hooks.just_ons(just_ons.map(_ => midi_note_octave(_)))
    }

    if (just_offs.length > 0) {
      hooks.just_offs(just_offs.map(_ => midi_note_octave(_)))
    }

    midi.update(dt, dt0)
  })
}
