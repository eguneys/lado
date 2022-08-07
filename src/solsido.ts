import { createMemo, createSignal, createResource } from 'solid-js'
import { OscPlayers, SamplesPlayer } from './audio'
import { short_range_flat_notes, fuzzy_note } from './audio'

import { make_ref } from './make_sticky'
import { useLocation } from '@solidjs/router'
import { read, write, owrite } from './play'

const has_context = (() => {
  let _
  return {
    get context() {
      if (!_) {
        _ = new AudioContext()
      }
      return _
    }
  }
})()

const getPlayerController = async (input: boolean) => {
  if (input) {

    let srcs = {}

    short_range_flat_notes.forEach(n => srcs[n] = `${n}.mp3`)

    let p = new SamplesPlayer(has_context.context)
    await p.init({
      srcs,
      base_url: './assets/audio/'
    })
    return p
  }
}


const getOscPlayers = async (input: boolean) => {
  if (input) {

    let o = new OscPlayers(has_context.context)
    await o.init()
    return o
  }
}



export default class Solsido {

  onClick() {
    //owrite(this._user_click, true)
  }

  onScroll() {
    this.ref.$clear_bounds()
  }

  user_click() {
    owrite(this._user_click, true)
  }

  get osc_player() {
    return read(this.r_opc)
  }

  get player() {
    return read(this.r_pc)
  }

  constructor() {

    this._user_click = createSignal(false)
    this.r_pc = createResource(this._user_click[0], getPlayerController)

    this.r_opc = createResource(this._user_click[0], getOscPlayers)

    this.ref = make_ref()
  }

}
