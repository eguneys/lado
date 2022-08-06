
export function ads(param: AudioParam, now: number, { a,d,s,r }: Adsr, start: number, max: number) {
  param.setValueAtTime(start, now)
  param.linearRampToValueAtTime(max, now + a)
  param.linearRampToValueAtTime(s, now + a + d)
  /* not needed ? */
  //param.setValueAtTime(s, now + a + d)
}

export function r(param: AudioParam, now: number, { s, r }: Adsr, min: number) {
  param.cancelAndHoldAtTime(now)
  /* https://stackoverflow.com/questions/73175007/crack-sounds-if-i-dont-release-immediately-like-wait-for-a-settimeout/73207368#73207368 */
  param.setValueAtTime(s, now)
  param.linearRampToValueAtTime(min, now + (r || 0))
}


