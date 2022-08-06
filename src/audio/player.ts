
export abstract class HasAudioAnalyser {

  _set_data(data: any) {
    this.data = data
    return this
  }

  _out_gain?: GainNode

  get maxFilterFreq(): number {
    return this.context.sampleRate / 2
  }

  constructor(readonly context: AudioContext) {}

  attack(time: number = this.context.currentTime) {
    let { context } = this

    this._out_gain = context.createGain()

    this._out_gain.gain.setValueAtTime(1, time)

    let compressor = context.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-60, context.currentTime)
    compressor.knee.setValueAtTime(40, context.currentTime)
    compressor.ratio.setValueAtTime(12, context.currentTime)
    compressor.attack.setValueAtTime(0, context.currentTime)
    compressor.release.setValueAtTime(0.25, context.currentTime)
    this._out_gain!.connect(compressor)

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


