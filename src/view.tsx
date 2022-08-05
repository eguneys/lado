import { createEffect, onCleanup, lazy } from 'solid-js'
import { useLocation, Router, Routes, Route, Link } from '@solidjs/router'
import { Home } from './routes/home'
import { Key } from './routes/key'
import { useSolsido, SolsidoProvider } from './providers'

function unbindable(
  el: EventTarget,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): Unbind {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}

const App = props => {

  let solsido = useSolsido()

  let unbinds = [];

  unbinds.push(unbindable(document, 'scroll', () => solsido.onScroll(), { capture: true, passive: true }));
  unbinds.push(unbindable(window, 'resize', () => solsido.onScroll(), { passive: true }));

  onCleanup(() => unbinds.forEach(_ => _()));

  let $topnav_toggle
   let location = useLocation()

     createEffect(() => {
         location.pathname
         $topnav_toggle.checked = false
      })

  return (<>
      <solsido onClick={_ => solsido.onClick()} ref={_ => setTimeout(() => solsido.ref.$ref = _)}>
      <header>
        <input ref={$topnav_toggle} class="topnav-toggle fullscreen-toggle" type="checkbox" id="tn-tg"></input>
        <label for="tn-tg" class="fullscreen-mask"></label>
        <label for="tn-tg" class="hbg"> <span class="hbg_in"></span></label>
        <nav id="topnav">
          <section><Link href="/"> lasolsido.org </Link></section>
          <section> <Link href="/rhythm"> Rhythm </Link> </section>
          <section> <Link href="/key"> Key Signatures </Link> </section>
          
        </nav>
      </header>
      <div id='main-wrap'>
        <Routes>
          <Route path="/" component={Home}/>
          <Route path="/key" component={Key}/>
        </Routes>
      </div>
      </solsido>
     </>)
}

export const AppWithRouter = solsido => props => {
  return (<SolsidoProvider solsido={solsido}>
    <Router>
      <App/>
    </Router>
  </SolsidoProvider>)
}
