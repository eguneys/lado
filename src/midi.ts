import JPR from './jpr'

let notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']

let octaves = [3, 4, 5, 6]

export const midi_note_octave = (note: number) => {

  let n = note - 60
  let _n = n % notes.length
  let _o = Math.floor(n / notes.length)

  let _note = notes[_n]
  let _octave = octaves[_o]

  return _note[0] + _octave + (_note[1] || '')
}

export class Midi {

  clear() {
    this._jpr = new Map()
  }

  _jpr: Map<Note, JPR> = new Map()

  get just_ons() {
    let { _jpr } = this
   return [..._jpr.keys()].filter(_ => _jpr.get(_).just_on)
  }

  get been_ons() {
    let { _jpr } = this
    return [..._jpr.keys()]
    .filter(_ => _jpr.get(_).been_on !== undefined)
    .map(_ => [_, _jpr.get(_).been_on])
  }

  get just_offs() {
    let { _jpr } = this
    return [..._jpr.keys()].filter(_ => _jpr.get(_).just_off)
  }

  noteOn(note: Note, velocity: number) {
    if (!this._jpr.has(note)) {
      this._jpr.set(note, new JPR())
    }

    this._jpr.get(note)._on()
  }

  noteOff(note: Note) {
    if (!this._jpr.has(note)) {
      this._jpr.set(note, new JPR())
    }

    this._jpr.get(note)._off()
  }

  update(dt: number, dt0: number) {
    for (let [key, value] of this._jpr) {
      value.update(dt, dt0)
    }
  }

  init() {

    const noteOn = (note, velocity) => {
      if (velocity === 0) {
        noteOff(note)
        return
      }
      this.noteOn(note, velocity)
    }

    const noteOff = (note) => {
      this.noteOff(note)
    }

    const onMIDIMessage = (message) => {
      let data = message.data

      let cmd = data[0] >> 4,
        channel = data[0] & 0xf,
        type = data[0] & 0xf0,
        note = data[1],
        velocity = data[2]

      switch(type) {
        case 144: // noteOn
          noteOn(note, velocity)
          break
        case 128: // noteOff
          noteOff(note, velocity)
          break
      }
    }


    const onMIDISuccess = (midiAccess) => {

      let midi = midiAccess

      let inputs = midi.inputs.values()

      for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = onMIDIMessage
      }

    }
    navigator.requestMIDIAccess({
      sysex: true
    }).then(onMIDISuccess)

    return this
  }
}
