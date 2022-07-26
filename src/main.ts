import '../assets/vstaff.css'
import './index.css'
import { render } from 'solid-js/web'

import Solsido from './solsido'
import { App } from './view'

export default function Lado(element: HTMLElement, options = {}) {

  let solsido = new Solsido()

  render(App(solsido), element)

  return {
  }
}
