import { make_ref } from './make_sticky'

export default class Solsido {

  onScroll() {
    this.ref.$clear_bounds()
  }

  constructor() {
    this.ref = make_ref()
  }


}
