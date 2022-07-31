export type Adsr = {
  a: number,
  d: number,
  h: number,
  r: number,
  sl: number,
  il: number,
  ml: number
};

export class Envelope {

  constructor(readonly context: Context, readonly adsr: Adsr) {
    this._source = this._getOnesBufferSource();
    this._attackDecayNode = context.createGain()
    this._releaseNode = context.createGain()
    this._ampNode = context.createGain()
    this._outputNode = context.createGain()

    this._outputNode.gain.value = this.adsr.il
    this._ampNode.gain.value = this.adsr.ml - this.adsr.il

    this._source.connect(this._attackDecayNode)
    this._source.connect(this._outputNode)
    this._attackDecayNode.connect(this._releaseNode)
    this._releaseNode.connect(this._ampNode)
    this._ampNode.connect(this._outputNode.gain)
  }


  _getOnesBufferSource() {
    let onesBuffer = this.context.createBuffer(1, 2, this.context.sampleRate)
    let data = onesBuffer.getChannelData(0)
    data[0] = 1
    data[1] = 1

    let source = this.context.createBufferSource()
    source.buffer = onesBuffer
    source.loop = true

    return source
  }


  connect(param: AudioParam) {
    this._outputNode.connect(param)
  }

  start(now: number) {

    let a_start = now
    let a_end = a_start + this.adsr.a
    let d_start = a_end + this.adsr.h
    let d_end = d_start + this.adsr.d

    this._attackDecayNode.gain.setValueAtTime(0, now)
    this._attackDecayNode.gain.setValueAtTime(0, a_start)

    this._attackDecayNode.gain.linearRampToValueAtTime(1, a_end)
    this._attackDecayNode.gain.setValueAtTime(1, d_start)
    this._attackDecayNode.gain.linearRampToValueAtTime(this.adsr.sl, d_end)

    this._source.start(now)
  }

  release(now) {
    let r_end = now + this.adsr.r

    this._releaseNode.gain.setValueAtTime(1, now)
    this._releaseNode.gain.linearRampToValueAtTime(0, r_end)

    return r_end
  }

  stop(now) {
    this._source.stop(now)
  }
}
