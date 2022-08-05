import { createSignal, createEffect, onMount, onCleanup } from 'solid-js'
import VStaff from 'vstaff'

export const _VStaff = props => {
  
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

