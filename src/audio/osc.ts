import { HasAudioAnalyser } from './player'
import { ads, r } from './adsr'


export class OscPlayers {


  constructor(readonly context: AudioContext) {}

  get currentTime(): number {
    return this.context.currentTime
  }



  async init(data: any) {}

  _ps = new Map<Note, OscPlayer>()

  attack(synth: Synth, note: Note, now: number = this.context.currentTime) {

    let freq = 440

    let p = new OscPlayer(this.context, freq)._set_data({synth})

    p.attack(now)

    this._ps.set(note, p)
  }

  release(note: Note, now: number = this.context.currentTime) {
    let _ = this._ps.get(note)
    if (_) {
      _.release(now)
      this._ps.delete(note)
    }
  }
}

function getOscillator(context: AudioContext, type: string, detune: number = 0) {
  return new OscillatorNode(context, { type, detune })
}

class OscPlayer extends HasAudioAnalyser {

  constructor(context: AudioContext, readonly freq: Frequency) {
    super(context)
  }

  _attack(now: number = this.context.currentTime) {
    let { context, buffer } = this

    let { freq } = this

    let { wave, volume, cutoff, cutoff_max, amplitude, filter_adsr, amp_adsr } = this.data

    let osc1 = getOscillator(context, wave, 15)
    this.osc1 = osc1
    let osc2 = getOscillator(context, wave, -15)
    this.osc2 = osc2


    let source_mix = context.createGain()
    this.source_mix = source_mix

    osc1.connect(source_mix)
    osc2.connect(source_mix)

    source_mix.gain.setValueAtTime(0.5, now)

    let filter = new BiquadFilterNode(context, { type: 'lowpass', Q: 6 })
    this.filter = filter

    source_mix.connect(filter)

    out_gain.gain.setValueAtTime(volume, now)

    osc1.frequency.setValueAtTime(freq, now)
    osc2.frequency.setValueAtTime(freq, now)

    let envelope = new GainNode(context)
    this.envelope = envelope
    filter.connect(envelope)
    envelope.connect(out_gain)


    let _filter_adsr = { ...filter_adsr, 
      s: cutoff * maxFilterFreq * 0.4 + filter_adsr.s * cutoff_max * maxFilterFreq * 0.6 }

    ads(filter.frequency,
        now,
        _filter_adsr,
        cutoff * maxFilterFreq * 0.4,
        cutoff * maxFilterFreq * 0.4 + cutoff_max * maxFilterFreq * 0.6)

    ads(envelope.gain,
        now,
        amp_adsr,
        0,
        amplitude * 0.5)

    osc1.start(now)
    osc2.start(now)
  }

  _release(now: number = this.context.currentTime) {
    let { context, buffer } = this

    let { filter_adsr, amp_adsr } = this.data

    r(this.source_mix.gain, now, amp_adsr, 0)
    r(this.filter.frequency,
      now,
      filter_adsr,
      cutoff * this.maxFilterFreq * 0.4)

      this.osc1.stop(now + a + _r)
      this.osc2.stop(now + a + _r)
  }

}
