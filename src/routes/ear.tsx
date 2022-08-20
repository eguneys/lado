import '../ear.css'
import { createSignal, createEffect, onMount, onCleanup } from 'solid-js'

import { read, write, owrite } from '../play'
import { useSolsido } from '../providers'

import Sol_Ear from '../sol_ear'
import { _VStaff } from './util'
import { format_time } from './key'


export const Ear = props => {

  let sol_ear = new Sol_Ear(useSolsido())

    let playback = sol_ear.playback


  return (<main>
    <div class='ear-exercises'>
     <h2> Pitch Exercise </h2>
     
     <div class='ear-controls'>
     <span onClick={playback.toggle_play} class='icon'>{playback.play_mode}</span>
    </div>
      <Show when={playback.results}>{ results =>
        <div class='results'>
          <span onClick={() => playback.cancel()} class="icon small">Restart</span>
          <div class='box flex'>
            <h4>Pitch Exercise</h4>
          </div>
          <div class='scores'>
          <div class='box status'>
            <h4>High Score</h4>
            <span class={results.score_klass}>{results.result}</span>
          </div>

          </div>
        </div>
      }</Show>

      <Show when={playback.time_score}>{ time_score =>
     <div class='scores'>
      <div class='box status'>
        <h4>Score</h4>
        <span class={time_score.score_klass}>{time_score.score}</span>
      </div>
      <div class='box status'>
      <h4> Time </h4>
      <span>{format_time(time_score.time)}</span>
      </div>
     </div>
}</Show>
     <div class='major-staff'>
     <_VStaff {...playback.staff}/>
     <Show when={playback.correct}>{correct =>
       <div class='correct'>
        <PitchText pitch={correct}/>
       </div>
     }</Show>
     </div>
    </div>
  </main>)
}


const PitchText = props => {
  return (<span>{props.pitch}</span>)
}
