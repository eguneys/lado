import { onMount, onCleanup } from 'solid-js'
import VStaff from 'vstaff'

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
        <KeySignatures/>
      </solsido>
     </>)
}


const KeySignatures = props => {

  return (<>
    <h2> Key Signatures </h2>

    <CMajor/>
    </>)
}


const CMajor = props => {
  let $ref

  onMount(() => {
    VStaff($ref)
  })

  return (<div ref={$ref} class='cmajor'>
    </div>)
}
