import { Range, Note } from '@tonaljs/tonal'

export const short_range_flat_notes = Range.numeric(["C3", "C6"]).map(Note.fromMidi)

export const fuzzy_note = _ => {
  let __ = Note.get(_)
  if (__.empty) {
    return Note.fromMidi(_)
  }

  return Note.fromFreq(__.freq)
}
