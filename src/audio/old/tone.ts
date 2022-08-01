function midiToPitch(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
      return midiToPitchClass(midi) + octave.toString();
}

function midiToPitchClass(midi: number): string {
    const scaleIndexToNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const note = midi % 12;
        return scaleIndexToNote[note];
}

export class PlayerController {

  constructor() {
  }
  
  async init() {
  }


  attack(synth: any, note: Midi) {
    this.sampler.attack([note], 4)
  }

  release() {

  }
}
