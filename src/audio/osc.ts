import { HasAudioAnalyser } from './player'
import { ads, r } from './adsr'
import { note_freq } from './tonal'


export class OscPlayers {


  constructor(readonly context: AudioContext) {}

  get currentTime(): number {
    return this.context.currentTime
  }



  async init(data: any) {}

  _ps = new Map<Note, OscPlayer>()

  attack(synth: Synth, note: Note, now: number = this.context.currentTime) {
    let p = new OscPlayer(this.context, note_freq(note))._set_data({synth})
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
    let { context, maxFilterFreq } = this

    let { _out_gain, freq } = this

    let { synth } = this.data

    let { wave, volume, cutoff, cutoff_max, amplitude, filter_adsr, amp_adsr } = synth

    let osc1 = getOscillator(context, wave, 15)
    this.osc1 = osc1
    let osc2 = getOscillator(context, wave, -15)
    this.osc2 = osc2


    let osc1_mix = context.createGain()
    let osc2_mix = context.createGain()

    osc1.connect(osc1_mix)
    osc2.connect(osc2_mix)

    osc1_mix.gain.setValueAtTime(1, now)
    osc2_mix.gain.setValueAtTime(1, now)

    let filter = new BiquadFilterNode(context, { type: 'lowpass', Q: 6 })
    this.filter = filter

    osc1_mix.connect(filter)
    osc2_mix.connect(filter)

    _out_gain.gain.setValueAtTime(volume, now)

    osc1.frequency.setValueAtTime(freq, now)
    osc2.frequency.setValueAtTime(freq, now)

    let envelope = new GainNode(context)
    this.envelope = envelope
    filter.connect(envelope)
    envelope.connect(_out_gain)


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
        amplitude)

    osc1.start(now)
    osc2.start(now)
  }

  _release(now: number = this.context.currentTime) {
    let { context, buffer } = this

    let { synth: { cutoff, filter_adsr, amp_adsr } } = this.data

    r(this.envelope.gain, now, amp_adsr, 0)
    r(this.filter.frequency,
      now,
      filter_adsr,
      cutoff * this.maxFilterFreq * 0.4)

      let { a, r: _r } = amp_adsr
      this.osc1.stop(now + a + _r)
      this.osc2.stop(now + a + _r)
  }

}
