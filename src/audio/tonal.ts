import { Key, Range, Note } from '@tonaljs/tonal'
import { transpose } from '@tonaljs/tonal'

export const short_range_flat_notes = Range.numeric(["C3", "C6"]).map(Note.fromMidi)

export const fuzzy_note = _ => {
  let __ = Note.get(_)
  if (__.empty) {
    return Note.fromMidi(_)
  }

  return Note.fromFreq(__.freq)
}

export const get_note = _ => Note.get(_)

export const perfect_c_sharps = [...Array(7)].reduce((acc, _) => [...acc, transpose(acc[acc.length - 1], 'P5')], ['C'])
export const perfect_c_flats = [...Array(7)].reduce((acc, _) => [...acc, transpose(acc[acc.length - 1], 'P4')], ['C'])

export const majorKey = _ => Key.majorKey(_)
