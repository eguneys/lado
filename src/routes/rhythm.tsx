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
    <div class="yardstick-wrap">
      <Yardstick yardstick={props.exercises.yardstick} />
    </div>

    <h2> Notes Exercise </h2>
    <div class="main-staff">
      <_VStaff/>
    </div>
</div>)
}


const Yardstick = props => {

  return (<>
    <yardstick>
      <playback>
        <cursor style={props.yardstick.cursor1_style}/>
        <cursor style={props.yardstick.cursor2_style}/>
      </playback>
      <sticks>
      <For each={props.yardstick.beats}>{beat =>
         <stick class={beat.klass}/>
      }</For>
      </sticks>
    </yardstick>
      </>)
}
