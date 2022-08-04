import { createSignal, createEffect, onMount, onCleanup } from 'solid-js'
import VStaff from 'vstaff'
import g from './music/glyphs'
import { read, write, owrite } from './play'

let $time_min, $time_no, $order_random, $order_sorted, $nb_all, $nb_sharps, $nb_flats

let $use_hints

const checkeds = () => {
  let _$times = [$time_min, $time_no]
    let _$orders = [$order_random, $order_sorted]
    let _$nbs = [$nb_all, $nb_sharps, $nb_flats]

    return [
    ...[_$times, _$orders, _$nbs].map(_ => _.findIndex(_ => _.checked)),
    $use_hints.checked ? 1 : 0
    ]
}



function format_time(n: number) {
  var sec_num = parseInt(n, 10);
  var minutes = Math.floor(sec_num / 60);
  var seconds = sec_num - minutes * 60;

  if (seconds < 10) {seconds = '0'+seconds;}
  return minutes+':'+seconds;
}

function unbindable(
  el: EventTarget,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): Unbind {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}

export const App = solsido => props => {


  let unbinds = [];

  unbinds.push(unbindable(document, 'scroll', () => solsido.onScroll(), { capture: true, passive: true }));
  unbinds.push(unbindable(window, 'resize', () => solsido.onScroll(), { passive: true }));

  onCleanup(() => unbinds.forEach(_ => _()));

  return (<>
      <solsido onClick={_ => solsido.onClick()} ref={_ => setTimeout(() => solsido.ref.$ref = _)}>
        <KeyExercises exercises={solsido._exercises}/>
        <KeySignatures majors={solsido._majors} />
      </solsido>
     </>)
}

const KeyExercises = props => {
  return (<>
   
    <h2> Major Key Exercise </h2>
    <Show when={console.log(props.exercises.explanations)||props.exercises.explanations}>

    <KeyExerciseExplanation/>
    </Show>

    <Show when={props.exercises.current}
    fallback={ 
    <>
      <span onClick={() => props.exercises.start(checkeds())} class='action icon'>Start</span>
      <KeyExerciseControls exercises={props.exercises}/>
    </>
    }>{ current =>
       <Show when={current.result!== undefined} fallback={ <KeyExerciseCurrent current={current}/> }>
         <KeyExerciseResults current={current}/>
       </Show>
    }</Show>
    <div class='key-exercise'>
      <div> <CMajorExercise current={props.exercises.current}/> </div>
    </div>
      </>)
}

const KeyExerciseExplanation = props => {
  return (<>
     <div class='key-explanation'>
       <p>You can memorize major key signatures with this exercise.</p>
       <p>Play the given key signature using your MIDI keyboard.</p>
       <p>You have 2 minutes to play as much as you can.</p>
     </div>
   </>)
}

const KeyExerciseResults = props => {
  return (<>
    <div class='key-current'>
      <span onClick={() => props.current.cancel()} class="icon small">Restart</span>
      <div class='box flex'>
        <h4>{props.current.header}</h4>
      </div>
      <div class='scores'>
      <div class='box status'>
        <h4>High Score</h4>
        <span class={props.current.score_klass}>{props.current.result}</span>
      </div>

      </div>
    </div>
    </>)
}

const KeyExerciseCurrent = props => {
  return (<>
  <div class='key-current'>
    <span onClick={() => props.current.cancel()} class="icon small">Restart</span>
    <div class='box flex'>
      <h4>{props.current.header}</h4>
    </div>
    <div class='scores'>
    <div class='box status'>
      <h4>Score</h4>
      <span class={props.current.score_klass}>{props.current.score}</span>
    </div>
    <div class='box status'>
      <h4> Time </h4>
      <span>{format_time(props.current.time)}</span>
    </div>
    </div>
    <div class='major status'>
      <Show when={props.current.show_hints}>
      <h3>{<Tonic tonic={props.current.majorKey.tonic}/>} <span class='major-type'>{props.current.majorKey.type}</span> </h3>
      </Show>
    </div>
  </div>
    </>)
}

const KeyExerciseControls = props => {

  let e = props.exercises

  return (<div class='key-controls'>
    <group class='radio'>
        <div>
        <input ref={$time_min} id="time_min" name="time" type='radio' checked={e.dton[0] === 0}/>
        <label for="time_min">2 Minutes</label>
        </div>
        <div>
        <input ref={$time_no} id="time_no" name="time" type='radio' checked={e.dton[0] === 1}/>
        <label for="time_no">No time</label>
        </div>
      </group>
      <group class='radio'>
        <div>
        <input ref={$order_random} id="order_random" name="order" type='radio' checked={e.dton[1] === 0}/>
        <label for="order_random">Random</label>
        </div>
        <div>
        <input ref={$order_sorted} id="order_sorted" name="order" type='radio' checked={e.dton[1] === 1}/>
        <label for="order_sorted">Sorted</label>
        </div>
      </group>
      <group class='radio'>
        <div>
        <input ref={$nb_all} id="nb_all" name="nb" type='radio' checked={e.dton[2] === 0}/>
        <label for="nb_all">All</label>
        </div>
        <div>
        <input ref={$nb_sharps} id="nb_sharps" name="nb" type='radio' checked={e.dton[2] === 1}/>
        <label for="nb_sharps">Sharps</label>
        </div>
        <div>
        <input ref={$nb_flats} id="nb_flats" name="nb" type='radio' checked={e.dton[2] === 2}/>
        <label for="nb_flats">Flats</label>
        </div>
      </group>
      <div class='switch'>
       <div>
        <input ref={$use_hints} id="use_hints" name="use_hints" type='checkbox' checked={e.dton[3] === 1}/>
        <label for="use_hints">Show Hints</label>
       </div>
      </div>
    </div>)
}

const KeySignatures = props => {

  return (<>
    <h2> Major Key Signatures </h2>
    <div class='key-signatures'>
     <div> <CMajor major={props.majors.c_major}/> </div>
     <For each={props.majors.sharps_flats_zipped}>{major => 
     <div>
     <CMajor major={major[0]}/>
     <CMajor major={major[1]}/>
     </div>
     }</For>
     </div>
  </>)
}

const _VStaff = props => {
  
  let $ref

  onMount(() => {
    let api = VStaff($ref)
    createEffect(() => {
      api.bras = props.bras
    })

    createEffect(() => {
      api.xwi = props.xwi || ''
    })

    createEffect(() => {
        api.playback = props.playback 
     })
    })

  return (<div ref={$ref}></div>)
}

const CMajorExercise = props => {

  return (<div class="cmajor-exercise">
    <div class={['major-staff', props.current?.klass || ''].join(' ')}>
     <_VStaff {...props.current}/>
    </div>
  </div>)
}

const you_titles = {
  'you': 'You Play',
  'stop': 'Stop'
}

const CMajor = props => {
  let $ref

  onMount(() => {
    let api = VStaff($ref)
    createEffect(() => {
      api.bras = props.major.bras
    })

    createEffect(() => {
      api.xwi = props.major.xwi
    })

    createEffect(() => {
        api.playback = props.major.playback 
     })
  })

  let _show_controls = createSignal(false)

  return (<div 
      onMouseLeave={_ => owrite(_show_controls, false) }
      onMouseOver={_ => owrite(_show_controls, true) } class="cmajor">
      <div class="header">
      <h3>{<Tonic tonic={props.major.majorKey.tonic}/>} <span class='major-type'>{props.major.majorKey.type}</span> </h3>
      <div class='controls'>
        <Show when={read(_show_controls)}>
        <Icon onClick={_ => props.major.click_play()} title={props.major.play_mode}>{props.major.play_mode}</Icon>
        <Icon onClick={_ => props.major.click_you()} title={you_titles[props.major.you_mode]}>{props.major.you_mode}</Icon>
        </Show>
      </div>
      </div>
      <div class={['major-staff', ...props.major.klass].join(' ')}>
        <div ref={$ref}> </div>
      </div>
    </div>)
}

const Tonic = props => {
  return (<>
      {props.tonic[0]}
      <Show when={props.tonic[1] === 'b'}><span class='bra'>{g['flat_accidental']}</span></Show>
      <Show when={props.tonic[1] === '#'}><span class='bra'>{g['sharp_accidental']}</span></Show>
      </>)
}

const Icon = props => {
  return <span onClick={props.onClick} title={props.title} class='icon'>{props.children}</span>
}
