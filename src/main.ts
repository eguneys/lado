import '../assets/vstaff.css'
import './index.css'
import './site.css'
import { render } from 'solid-js/web'

import Solsido from './solsido'
import { AppWithRouter } from './view'

export default function Lado(element: HTMLElement, options = {}) {

  render(AppWithRouter(options), element)

  return {
  }
}
