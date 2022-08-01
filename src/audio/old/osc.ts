import { Envelope, Adsr } from './adsr'  
import { midiToFreq as note_freq } from './uci'

export type Synth = {
  wave: string,
  volume: string,
  cutoff: number,
  cutoff_max: number,
  amplitude: number,
  filter_adsr: Adsr,
  amp_adsr: Adsr
}

export class PlayerController {

  _context?: AudioContext

  get context(): AudioContext {
    if (!this._context) {
      this._context = new AudioContext()
    }
    return this._context
  }


  get currentTime(): number {
    return this.context.currentTime
  }

  _gen_id: number = 0
  get next_id(): number {
    return ++this._gen_id
  }

  players: Map<number, HasAudioAnalyser> = new Map()

  attack(synth: Synth, note: Note, time: number = this.currentTime) {

    let { next_id } = this

    this.players.set(next_id, new MidiPlayer(this.context)
                     ._set_data({
                       synth,
                       freq: note_freq(note)
                     }).attack(time))
    return next_id
  }

  release(id: number, time: number = this.currentTime) {
    let player = this.players.get(id)
    if (player) {
      player.release(time)
    }
    this.players.delete(id)
  }
}

function getOscillator(context: AudioContext, type: string, detune: number = 0) {
  return new OscillatorNode(context, { type, detune })
}

export abstract class HasAudio {


  data: any
  gain: GainNode

  get maxFilterFreq(): number {
    return this.context.sampleRate / 2
  }

  _set_data(data: any) {
    this.data = data
    return this
  }

  constructor(readonly context: AudioContext) {}

  attack(time: number = this.context.currentTime) {
    let { context } = this

    this.gain = context.createGain()

    this.gain.gain.setValueAtTime(1, time)

    let compressor = context.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-60, context.currentTime)
    compressor.knee.setValueAtTime(40, context.currentTime)
    compressor.ratio.setValueAtTime(12, context.currentTime)
    compressor.attack.setValueAtTime(0, context.currentTime)
    compressor.release.setValueAtTime(0.25, context.currentTime)
    this.gain!.connect(compressor)

    compressor.connect(context.destination)

    this._attack(time)
    return this
  }


  release(time: number = this.context.currentTime) {
    this._release(time)
    return this
  }

  abstract _attack(time: number): void
  abstract _release(time: number): void
}

export class MidiPlayer extends HasAudio {


  _attack(now: number) {
    let { context, maxFilterFreq } = this

    let out_gain = this.gain

    let { freq, synth } = this.data

    let { wave, volume, cutoff, cutoff_max, amplitude, filter_adsr, amp_adsr } = synth

    let osc1 = getOscillator(context, wave, -15)
    let osc2 = getOscillator(context, wave, 15)
    this.osc1 = osc1
    this.osc2 = osc2

    let osc1_mix = new GainNode(context)
    osc1.connect(osc1_mix)
    let osc2_mix = new GainNode(context)
    osc2.connect(osc2_mix)

    let filter = new BiquadFilterNode(context, { type: 'lowpass', Q: 6 })
    this.filter = filter
    osc1_mix.connect(filter)
    osc2_mix.connect(filter)

    out_gain.gain.setValueAtTime(volume, now)


    osc1.frequency.setValueAtTime(freq, now)
    osc2.frequency.setValueAtTime(freq, now)

    let envelope = new GainNode(context)
    this.envelope = envelope
    filter.connect(envelope)
    envelope.connect(out_gain)

    let _filter_adsr = {
      ...filter_adsr,
      il: cutoff * maxFilterFreq * 0.4,
      ml: cutoff * maxFilterFreq * 0.4 + cutoff_max * maxFilterFreq * 0.6,
      sl: cutoff * maxFilterFreq * 0.4 +
        filter_adsr.sl * cutoff_max * maxFilterFreq * 0.6
    }
    let a_filter = new Envelope(context, _filter_adsr)
    let a_amp = new Envelope(context, amp_adsr)
    this.a_filter = a_filter
    this.a_amp = a_amp

    a_filter.connect(filter.frequency)
    a_amp.connect(envelope.gain)

    a_filter.start(now)
    a_amp.start(now)
    osc1.start(now)
    osc2.start(now)
  }

  _release(now: number) {

    this.a_filter.release(now)
    let r = this.a_amp.release(now)

    this.osc1.stop(r)
    this.osc2.stop(r)
    this.a_filter.stop(r)
    this.a_amp.stop(r)
  }
}
