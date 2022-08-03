import { createSignal, createEffect, onMount, onCleanup } from 'solid-js'
import VStaff from 'vstaff'
import g from './music/glyphs'
import { read, write, owrite } from './play'

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
      <solsido ref={_ => setTimeout(() => solsido.ref.$ref = _)}>
        <KeyExercises/>
        <KeySignatures majors={solsido._majors} />
      </solsido>
     </>)
}

const KeyExercises = props => {
  return (<>
   
    <h2> Major Key Exercise </h2>
    <div class='key-controls'>
    <group class='radio'>
        <div>
        <input id="time_min" name="time" type='radio' checked={true}/>
        <label for="time_min">1 Min.</label>
        </div>
        <div>
        <input id="time_no" name="time" type='radio'/>
        <label for="time_no">No time</label>
        </div>
      </group>
      <group class='radio'>
        <div>
        <input id="order_random" name="order" type='radio' checked={true}/>
        <label for="order_random"> Random </label>
        </div>
        <div>
        <input id="order_sorted" name="order" type='radio'/>
        <label for="order_sorted"> Sorted </label>
        </div>
      </group>
      <group class='radio'>
        <div>
        <input id="nb_all" name="nb" type='radio' checked={true}/>
        <label for="nb_all"> All </label>
        </div>
        <div>
        <input id="nb_sharps" name="nb" type='radio'/>
        <label for="nb_sharps">Sharps</label>
        </div>
        <div>
        <input id="nb_flats" name="nb" type='radio'/>
        <label for="nb_flats">Flats</label>
        </div>
      </group>

      <span class='icon'> Start </span>
    </div>
    <div class='key-exercise'>
      <div> <CMajorExercise/> </div>
    </div>
      </>)
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

    <div class="header">
    </div>

    <div class={['major-staff'].join(' ')}>
     <_VStaff/>
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
      <label>{<Tonic tonic={props.major.majorKey.tonic}/>} <span class='major-type'>{props.major.majorKey.type}</span> </label>
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
