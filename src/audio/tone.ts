import { Piano } from '@tonejs/piano'

export function uci_note(uci: string) {
  return uci
}

export class PlayerController {

  constructor() {
    this.piano = new Piano()
    console.log(this.piano)
  }
}
