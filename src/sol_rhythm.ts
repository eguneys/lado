import { onCleanup, on, createEffect, createMemo, createSignal } from 'solid-js'
import { read, write, owrite } from './play'
import { Solsido } from './solsido'
import { make_playback } from './make_playback'
import { make_player } from './make_player'
import { make_midi } from './make_midi'
import { fuzzy_note } from './audio'

let bpms = [20, 30, 60, 90, 120, 180, 200, 400]
let beats = [1, 2, 3, 4]

function on_interval(life: number, life0: number, t: number) {
  return Math.floor(life0 / t) !== Math.floor(life / t)
}


function min_index(arr: Array<number| undefined>) {
  let i = -1
  let _

  arr.forEach((__, _i) => {
    if (__ !== undefined && (_ === undefined || __ < _)) {
      _ = __;
      i = _i
    }
  })
  return i
}

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
  let { solsido } = rhythm

  let _nb_beats = createSignal(4)
  let m_nb_beats = createMemo(() => read(_nb_beats))

  let _playback = make_playback(m_nb_beats)

  let m_osc_player = createMemo(() => solsido.osc_player)

  let m_up_notes = createMemo(() => {
    _playback.playing
    _playback.bpm
    return ['D5@-16,2', 'D5@0,2']
  })
  let m_down_notes = createMemo(() => {
    _playback.playing
    _playback.bpm
    return ['F4@-12,2', 'A4@-8,2', 'F4@-4,2', 'F4@4,2', 'A4@8,2', 'F4@12,2']
  })

  let _m_up_player = make_player(m_osc_player, _playback, m_up_notes)
  let _m_down_player = make_player(m_osc_player, _playback, m_down_notes)

  createEffect(() => {
    let beats = read(_nb_beats)
    _m_up_player.loop = [0, beats * 4]
    _m_down_player.loop = [0, beats * 4]
  })

  _m_up_player.synth = {
    wave: 'sine', 
    volume: 0.2, 
    cutoff: 0.2, 
    cutoff_max: 0.4, 
    amplitude: 1, 
    filter_adsr: { a: 0, d: 0.03, s: 0, r: 0 }, 
    amp_adsr: { a: 0.01, d: 0.02, s: 0, r: 0 }
  }
  _m_down_player.synth = {
    wave: 'sine', 
    volume: 0.2, 
    cutoff: 0.2, 
    cutoff_max: 0.4, 
    amplitude: 1, 
    filter_adsr: { a: 0.02, d: 0.02, s: 0, r: 0 }, 
    amp_adsr: { a: 0.01, d: 0.01, s: 0, r: 0.02 }
  }

  let m_x = createMemo(() => {
    let beat_ms = _playback.bpm?.beat_ms

    if (beat_ms) {
      let [sub, ms, sub_i, subs] = beat_ms
      let beat = (sub + sub_i) / subs
      return beat
    }
  })


  let m_sub = createMemo(() => {
    let beat_ms = _playback.bpm?.beat_ms

    if (beat_ms) {
      let [sub, ms, sub_i, subs] = beat_ms
      return sub
    }
  })

  /*
  
   0 1 2 3
   4 5 6 7

   1 1
   3 3
   3.5 3.5
   4 1
  */
  let m_cursor1_x = createMemo(() => {
    if (m_x() < 0) {
      return -10
    }
    let nb_beats = read(_nb_beats)
    let half = nb_beats / 2
    return ((m_x() - half) % nb_beats + half) /nb_beats
  })

  let m_cursor2_x = createMemo(() => {
    let nb_beats = read(_nb_beats)
    let half = nb_beats / 2
    return ((m_x() + half) % nb_beats - half) /nb_beats
  })

  let _beats = [...Array(48 * 4 + 1).keys()]
  .map(i => make_beat(rhythm, i, _nb_beats))

  let m_cursor1_style = createMemo(() => ({
    left: `${m_cursor1_x() * 48 * 4 * 100/(48 * 4 + 1)}%`
  }))

  let m_cursor2_style = createMemo(() => ({
    left: `${m_cursor2_x() * 48 * 4 * 100/(48 * 4 + 1)}%`,
  }))

  let m_bpm = createMemo((prev) =>
    _playback.bpm?.bpm || prev
  )

  let _hits = createSignal([], { equals: false })
  let m_hits = createMemo(() => read(_hits).map(_ => make_hit(rhythm, _)))

  let synth = {
    adsr: { a: 0, d: 0.1, s: 0.2, r: 0.6 }
  }

  let m_x0 = createMemo(on(m_x, (v, p) => {
    return p
  }))
  
  let m_on_beat = createMemo(p => {
    let nb_beats = read(_nb_beats)
    let x = m_x()

    if (x > 0 && on_interval(x, m_x0(), nb_beats)) {
      return x
    }
    return p
  })


  let _scores = createMemo(() => {
    let nb_beats = read(_nb_beats)

    return [
      ...[...Array(nb_beats).keys()].map(_ => _/nb_beats),
      1
    ]
  })
  let m_scores = createMemo(() => read(_scores).map((_, i) => make_score(rhythm, i, _)))

  createEffect(on(m_sub, (sub) => {
    
    let nb_beats = read(_nb_beats)
    let hit = m_x() % nb_beats / nb_beats

    let i = min_index(m_scores().map(_ => -_.hit_distance(hit)))

    if (i >= 0) {
      m_scores()[i].hit = false
    }

  }))

  createEffect(on(() => _playback.playing, p => {
    if (p) {

      let midi = make_midi({
        just_ons(ons: Array<Note>) {
          let { player } = solsido
          ons.slice(-1).forEach(_ => player?.attack(synth, fuzzy_note(_)))
          let nb_beats = read(_nb_beats)
          let hit = m_x() % nb_beats / nb_beats
          write(_hits, _ => _.push(hit))


          let i = min_index(m_scores().map(_ => _.hit_distance(hit)))

          if (i >= 0) {
            m_scores()[i].hit = true
          }

        },
        just_offs(offs: Array<Note>) {
          let { player } = solsido
          offs.forEach(_ => player?.release(fuzzy_note(_)))
        }
      })
      onCleanup(() => {
      })
    }
  }))

  return {
    get hits() {
      return m_hits()
    },
    get scores() {
      return m_scores()
    },
    get cursor1_style() { return m_cursor1_style() },
    get cursor2_style() { return m_cursor2_style() },
    set nb_beats(value: number) {
      let _beats = beats.indexOf(read(_nb_beats)) + value + beats.length
      _beats = Math.max(0, _beats) % beats.length

      owrite(_nb_beats, beats[_beats])
    },
    get nb_beats() {
      return read(_nb_beats)
    },
    get beats() {
      return _beats
    },
    get bpm() {
      return m_bpm() || 120
    },
    set bpm(value: number) {
      if (!_playback.bpm) {
        return 
      }
      let _bpm = bpms.indexOf(_playback.bpm.bpm) + value + bpms.length
      _bpm = Math.max(0, _bpm) % bpms.length

      _playback.bpm = bpms[_bpm]
    },
    get playback_playing() {
      return _playback.playing ? 'stop': 'play'
    },
    toggle_playback_playing() {
      solsido.user_click()
      _playback.playing = !_playback.playing
    }
  }
}

const make_hit  = (rhythm: SolRhythm, _: number) => {

  let _x = _

  let m_style = createMemo(() => ({
    left: `${_x * 48 * 4 * 100/(48 * 4 + 1)}%`
  }))

  return {
    get x() {
      return _x
    },
    get style() {
      return m_style()
    }
  }
}



const make_score  = (rhythm: SolRhythm, i: number, _: number) => {

  let _i_score = createSignal(0)

  let _x = _

  let m_style = createMemo(() => ({
    left: `${_x * 48 * 4 * 100/(48 * 4 + 1)}%`
  }))

  let _hit = createSignal(false)

  let m_klass = createMemo(() => [
    read(_hit) ? 'hit': ''
  ].join(' '))


  return {
    hit_distance(x: number) {
      return Math.abs(x - _x)
    },
    get hit() {
      return read(_hit)
    },
    set hit(v: boolean) {
      owrite(_hit, v)
    },
    i,
    get x() {
      return _x
    },
    on_beat() {
      owrite(_i_score, _ => _ === 0 ? 1 : _)
    },
    dispose_on_beat() {
    },
    get klass() {
      return m_klass()
    },
    get style() {
      return m_style()
    }
  }
}

const make_beat = (rhythm: SolRhythm, i: number, _nb_beats: number) => {

  // beat 0-15

  let m_n = createMemo(() => (48 * 4) / read(_nb_beats))
  let m_on_beat = createMemo(() => i %m_n() === 0)
  let m_up_beat = createMemo(() => i % (m_n()/ 2) === 0)
  let m_sub_division = createMemo(() => i % (m_n() / 4) === 0)
  let m_strong = createMemo(() => m_on_beat())
  let m_medium = createMemo(() => m_up_beat())
  let m_weak = createMemo(() => m_sub_division())

  let m_klass = createMemo(() => [
    m_strong() ? 'strong': 
      m_medium() ? 'medium': 
        m_weak() ? 'weak' : ''
  ].join(' '))

  return {
    get klass() { return m_klass() }
  }
}
