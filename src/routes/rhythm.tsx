import '../rhythm.css'
import { createSignal, createEffect, onMount, onCleanup } from 'solid-js'
import g from '../music/glyphs'
import { read, write, owrite } from '../play'
import { useSolsido } from '../providers'
import Sol_Rhythm from '../sol_rhythm'

import { _VStaff } from './util'


export const Rhythm = props => {

  let sol_rhythm = new Sol_Rhythm(useSolsido())

  return (<main>
     <RExercises exercises={sol_rhythm._exercises}/>
      </main>)
}


const RExercises = props => {
  return (<div class='rhythm-exercises'>
    <h2> Yardstick Exercise </h2>
    <section class='box'>
      <p>This is 1 measure of music.</p>
      <p>Play the major scales using your MIDI keyboard. </p>
      <p>Click play to start the metronome</p>
      <p>You can adjust the tempo and number of beats</p>
    </section>
    <div class='box yardstick-controls'>
      <Metronome 
    toggle_play={() => props.exercises.yardstick.toggle_playback_playing()}
    play_mode={props.exercises.yardstick.playback_playing}
    beats={props.exercises.yardstick.nb_beats} 
    set_beats={_ => props.exercises.yardstick.nb_beats = _}
    bpm={props.exercises.yardstick.bpm} 
    set_bpm={_ => props.exercises.yardstick.bpm = _}/>
    </div>
    <div class="yardstick-wrap">
      <Yardstick yardstick={props.exercises.yardstick} />
    </div>

    <h2> Notes Exercise </h2>
    <div class="main-staff">
      <_VStaff/>
    </div>
</div>)
}

const Metronome = props => {
  
  return (<metronome>
    <span onClick={props.toggle_play} class='icon'>{props.play_mode}</span>
    <group>
      <label>bpm</label>
      <UpDownControl value={props.bpm} setValue={_ => props.set_bpm(_)}/>
    </group>
    <group>
      <label>beats</label>
      <UpDownControl value={props.beats} setValue={_ => props.set_beats(_)}/>
    </group>
    </metronome>)
}

const dformat = v => v < 10 ? `0${v}` : `${v}`
const UpDownControl = props => {
  const value = (value: number) => {
    props.setValue(value)
  }

  return (<div class='up-down'>
      <span onClick={_ => value(-1) } class='value-down'>{"-"}</span><span onClick={_ => value(+1) } class='value'> {dformat(props.value)} </span> <span onClick={_ => value(+1) } class='value-up'>{"+"}</span>
      </div>)
}

const Yardstick = props => {

  return (<>
    <yardstick>
      <playback>
        <cursor style={props.yardstick.cursor1_style}/>
        <cursor style={props.yardstick.cursor2_style}/>
      </playback>
      <scores>
        <For each={props.yardstick.hits}>{ hit =>
          <hit style={hit.style}/>
        }</For>
        <For each={props.yardstick.scores}>{ score =>
          <score class={score.klass} style={score.style}/>
        }</For>
      </scores>
      <sticks>
      <For each={props.yardstick.beats}>{beat =>
         <stick class={beat.klass}/>
      }</For>
      </sticks>
    </yardstick>
      </>)
}
