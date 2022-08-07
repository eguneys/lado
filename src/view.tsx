import { createEffect, onCleanup, lazy } from 'solid-js'
import { useLocation, Router, Routes, Route, Link, NavLink } from '@solidjs/router'
import { Home } from './routes/home'
import { Key } from './routes/key'
import { Rhythm } from './routes/rhythm'
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
          <section> <NavLink href="/rhythm">Rhythm</NavLink> </section>
          <section> <NavLink href="/key">Key Signatures</NavLink> </section>
          
        </nav>
        <h1 class='site-title'>
          <Link href={location.pathname}>{location.pathname}</Link>
        </h1>
      </header>
      <div id='main-wrap'>
        <Routes>
          <Route path="" component={Home}/>
          <Route path="key" component={Key}/>
          <Route path="rhythm" component={Rhythm}/>
        </Routes>
      </div>
      </solsido>
     </>)
}

export const AppWithRouter = options => props => {
  return (
    <Router>
    <SolsidoProvider options={options}>
      <App/>
      </SolsidoProvider>
    </Router>)
}
