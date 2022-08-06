import { HasAudioAnalyser } from './player'
import { ads, r } from './adsr'

function load_audio(src: string) {
  return fetch(src).then(_ => _.arrayBuffer())
}

function decode_audio(context: AudioContext, buffer: ArrayBuffer) {
  return context.decodeAudioData(buffer)
}

export class SamplesPlayer {

  constructor(readonly context: AudioContext) {}

  get currentTime(): number {
    return this.context.currentTime
  }

  _buffers!: Map<Note, AudioBuffer>

  async init(data: any) {

    let { srcs, base_url } = data

    let buffers = await Promise
    .all(Object.keys(srcs)
         .map(key => 
              load_audio(base_url + srcs[key])
              .then(_ => decode_audio(this.context, _))
              .then(_ => [key, _])))

    this._buffers = new Map(buffers)
  }

  _ps = new Map<Note, SamplePlayer>()

  attack(synth: Synth, note: Note, now: number = this.context.currentTime) {
    let buffer = this._buffers.get(note)
    let p = new SamplePlayer(this.context, buffer)._set_data({synth})

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


class SamplePlayer extends HasAudioAnalyser {

  constructor(context: AudioContext, readonly buffer: AudioBuffer) {
    super(context)
  }

  _attack(now: number = this.context.currentTime) {
    let { context, buffer } = this

    let { synth: { adsr } } = this.data
    let source_mix = context.createGain()
    source_mix.connect(this._out_gain)
    this.source_mix = source_mix

    let source = context.createBufferSource()
    this.source = source
    source.buffer = buffer
    source.connect(source_mix)

    ads(source_mix.gain, now, adsr, 0, 1)

    source.start()
  }
  

  _release(now: number = this.context.currentTime) {
    let { context, buffer } = this
    let { synth: { adsr } } = this.data

    r(this.source_mix.gain, now, adsr, 0)
    this.source.stop(now + adsr.r)
  }

}
