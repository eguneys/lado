import { majorKey, perfect_c_sharps, perfect_c_flats } from './audio'

export function shuffleArr (array){
  for (var i = array.length - 1; i > 0; i--) {
    var rand = Math.floor(Math.random() * (i + 1));
    [array[i], array[rand]] = [array[rand], array[i]]
  }
  return array
}


export const make_next_key = (order: Order, nb: Nb) => {

  let perfects = [[...perfect_c_sharps, ...perfect_c_flats.slice(1, 8)],
    perfect_c_sharps,
    perfect_c_flats]

    let _res = perfects[nb].slice(0)

    if (order === 0) {
      shuffleArr(_res)
    }

  return key => {
    let i = key === undefined ? 0 : _res.indexOf(key) + 1
    return _res[i%_res.length]
  }
}


export const gen_pitch = () => {
  let keys = [...perfect_c_sharps, ...perfect_c_flats.slice(1, 8)]

  return shuffleArr(keys.map(majorKey).flatMap(_ => _.scale))
}
