import { make_note } from './types'
import { note_pitch, note_octave, note_duration, note_accidental } from './types'
let pitch_ucis = ['', 'c', 'd', 'e', 'f', 'g', 'a', 'b']

export function note_uci(note: Note) {
  let pitch = note_pitch(note),
    octave = note_octave(note),
    duration = note_duration(note),
    accidental = note_accidental(note)

  return [pitch_ucis[pitch], 
    !!accidental ? '#' : ''].join('')
}

let octave_ucis = ['', '1', '2', '3', '4', '5', '6', '7', '8']
let accidental_ucis = ['', '#', 'f']

export function uci_note(uci: string) {
  let [__pitch, __octave, ...__accidental] = uci.split('')

  let _pitch = pitch_ucis.indexOf(__pitch)
  let _octave = octave_ucis.indexOf(__octave)
  let _accidental = accidental_ucis.indexOf(__accidental.join(''))

  let accidental = _accidental > 0 ? _accidental : undefined
  return make_note(_pitch, _octave, accidental, 1)
}
