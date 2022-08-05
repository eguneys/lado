import { Solsido } from './solsido'

export default class Sol_Rhythm {


  constructor(readonly solsido: Solsido) {
    this._exercises = make_exercises(this)
  }
}


const make_exercises = (rhythm: Sol_Rhythm) => {

  let yardstick = make_yardstick(rhythm)

  return {
    yardstick
  }
}

const make_yardstick = (rhythm: SolRhythm) => {

  return {
  }
}
