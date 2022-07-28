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
        <KeySignatures solsido={solsido}/>
      </solsido>
     </>)
}


const KeySignatures = props => {

  return (<>
    <h2> Major Key Signatures </h2>
    <div class='key-signatures'>
      <div> <CMajor {...props} major={props.solsido._majors.major('C')}/> </div>
      <div>
        <CMajor {...props} major={props.solsido._majors.major('F')}/>
        <CMajor {...props} major={props.solsido._majors.major('G')}/>
      </div>
      <div>
        <CMajor {...props} major={props.solsido._majors.major('Bflat')}/>
        <CMajor {...props} major={props.solsido._majors.major('D')}/>
      </div>
      <div>
        <CMajor {...props} major={props.solsido._majors.major('F#')}/>
      </div>

    </div>
    </>)
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
      <label>{props.major.letter}<Show when={props.major.flat}><span class='bra'>{g['flat_accidental']}</span></Show> Major</label>
      <div class='controls'>
        <Show when={read(_show_controls)}>
        <Icon onClick={_ => props.solsido.major_playback.set_play(props.major)} title={props.major.play}>{props.major.play}</Icon>
        <Icon title="You Play">you</Icon>
        </Show>
      </div>
      </div>
      <div class="major-staff">
        <div ref={$ref}> </div>
      </div>
    </div>)
}


const Icon = props => {
  return <span onClick={props.onClick} title={props.title} class='icon'>{props.children}</span>
}
