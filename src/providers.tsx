import { createContext, useContext } from 'solid-js'
import Solsido from './solsido'

const SolsidoContext = createContext()

export function SolsidoProvider(props) {
  let solsido = new Solsido(props.options)
  return (<SolsidoContext.Provider value={solsido}>
      {props.children}
      </SolsidoContext.Provider>)
}

export const useSolsido = () => useContext(SolsidoContext)
