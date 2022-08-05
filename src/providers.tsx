import { createContext, useContext } from 'solid-js'

const SolsidoContext = createContext()

export function SolsidoProvider(props) {
  return (<SolsidoContext.Provider value={props.solsido}>
      {props.children}
      </SolsidoContext.Provider>)
}

export const useSolsido = () => useContext(SolsidoContext)
