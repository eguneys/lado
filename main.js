var Lado = (function (VStaff) {
  'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var VStaff__default = /*#__PURE__*/_interopDefaultLegacy(VStaff);

  const sharedConfig = {};
  function setHydrateContext(context) {
    sharedConfig.context = context;
  }

  const equalFn = (a, b) => a === b;
  const $PROXY = Symbol("solid-proxy");
  const signalOptions = {
    equals: equalFn
  };
  let runEffects = runQueue;
  const NOTPENDING = {};
  const STALE = 1;
  const PENDING = 2;
  const UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null;
  let Transition = null;
  let Listener = null;
  let Pending = null;
  let Updates = null;
  let Effects = null;
  let ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener,
          owner = Owner,
          unowned = fn.length === 0,
          root = unowned && !false ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: null,
      owner: detachedOwner || owner
    },
          updateFn = unowned ? fn : () => fn(() => cleanNode(root));
    Owner = root;
    Listener = null;
    try {
      return runUpdates(updateFn, true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      pending: NOTPENDING,
      comparator: options.equals || undefined
    };
    const setter = value => {
      if (typeof value === "function") {
        value = value(s.pending !== NOTPENDING ? s.pending : s.value);
      }
      return writeSignal(s, value);
    };
    return [readSignal.bind(s), setter];
  }
  function createComputed(fn, value, options) {
    const c = createComputation(fn, value, true, STALE);
    updateComputation(c);
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    updateComputation(c);
  }
  function createEffect(fn, value, options) {
    runEffects = runUserEffects;
    const c = createComputation(fn, value, false, STALE);
    c.user = true;
    Effects ? Effects.push(c) : updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.pending = NOTPENDING;
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || undefined;
    updateComputation(c);
    return readSignal.bind(c);
  }
  function createResource(source, fetcher, options) {
    if (arguments.length === 2) {
      if (typeof fetcher === "object") {
        options = fetcher;
        fetcher = source;
        source = true;
      }
    } else if (arguments.length === 1) {
      fetcher = source;
      source = true;
    }
    options || (options = {});
    const contexts = new Set(),
          [value, setValue] = createSignal(options.initialValue),
          [track, trigger] = createSignal(undefined, {
      equals: false
    }),
          [loading, setLoading] = createSignal(false),
          [error, setError] = createSignal();
    let err = undefined,
        pr = null,
        initP = null,
        id = null,
        scheduled = false,
        resolved = ("initialValue" in options),
        dynamic = typeof source === "function" && createMemo(source);
    if (sharedConfig.context) {
      id = `${sharedConfig.context.id}${sharedConfig.context.count++}`;
      if (sharedConfig.load) initP = sharedConfig.load(id);
    }
    function loadEnd(p, v, e, key) {
      if (pr === p) {
        pr = null;
        resolved = true;
        if (initP && (p === initP || v === initP) && options.onHydrated) queueMicrotask(() => options.onHydrated(key, {
          value: v
        }));
        initP = null;
        setError(err = e);
        completeLoad(v);
      }
      return v;
    }
    function completeLoad(v) {
      batch(() => {
        setValue(() => v);
        setLoading(false);
        for (const c of contexts.keys()) c.decrement();
        contexts.clear();
      });
    }
    function read() {
      const c = SuspenseContext ,
            v = value();
      if (err) throw err;
      if (Listener && !Listener.user && c) {
        createComputed(() => {
          track();
          if (pr) {
            if (c.resolved ) ;else if (!contexts.has(c)) {
              c.increment();
              contexts.add(c);
            }
          }
        });
      }
      return v;
    }
    function load(refetching = true) {
      if (refetching && scheduled) return;
      scheduled = false;
      setError(err = undefined);
      const lookup = dynamic ? dynamic() : source;
      if (lookup == null || lookup === false) {
        loadEnd(pr, untrack(value));
        return;
      }
      const p = initP || untrack(() => fetcher(lookup, {
        value: value(),
        refetching
      }));
      if (typeof p !== "object" || !("then" in p)) {
        loadEnd(pr, p);
        return p;
      }
      pr = p;
      scheduled = true;
      queueMicrotask(() => scheduled = false);
      batch(() => {
        setLoading(true);
        trigger();
      });
      return p.then(v => loadEnd(p, v, undefined, lookup), e => loadEnd(p, e, e));
    }
    Object.defineProperties(read, {
      loading: {
        get() {
          return loading();
        }
      },
      error: {
        get() {
          return error();
        }
      },
      latest: {
        get() {
          if (!resolved) return read();
          if (err) throw err;
          return value();
        }
      }
    });
    if (dynamic) createComputed(() => load(false));else load(false);
    return [read, {
      refetch: load,
      mutate: setValue
    }];
  }
  function batch(fn) {
    if (Pending) return fn();
    let result;
    const q = Pending = [];
    try {
      result = fn();
    } finally {
      Pending = null;
    }
    runUpdates(() => {
      for (let i = 0; i < q.length; i += 1) {
        const data = q[i];
        if (data.pending !== NOTPENDING) {
          const pending = data.pending;
          data.pending = NOTPENDING;
          writeSignal(data, pending);
        }
      }
    }, false);
    return result;
  }
  function untrack(fn) {
    let result,
        listener = Listener;
    Listener = null;
    result = fn();
    Listener = listener;
    return result;
  }
  function on(deps, fn, options) {
    const isArray = Array.isArray(deps);
    let prevInput;
    let defer = options && options.defer;
    return prevValue => {
      let input;
      if (isArray) {
        input = Array(deps.length);
        for (let i = 0; i < deps.length; i++) input[i] = deps[i]();
      } else input = deps();
      if (defer) {
        defer = false;
        return undefined;
      }
      const result = untrack(() => fn(input, prevInput, prevValue));
      prevInput = input;
      return result;
    };
  }
  function onMount(fn) {
    createEffect(() => untrack(fn));
  }
  function onCleanup(fn) {
    if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
    return fn;
  }
  let SuspenseContext;
  function readSignal() {
    const runningTransition = Transition ;
    if (this.sources && (this.state || runningTransition )) {
      const updates = Updates;
      Updates = null;
      this.state === STALE || runningTransition  ? updateComputation(this) : lookUpstream(this);
      Updates = updates;
    }
    if (Listener) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener.sources) {
        Listener.sources = [this];
        Listener.sourceSlots = [sSlot];
      } else {
        Listener.sources.push(this);
        Listener.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener];
        this.observerSlots = [Listener.sources.length - 1];
      } else {
        this.observers.push(Listener);
        this.observerSlots.push(Listener.sources.length - 1);
      }
    }
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    if (Pending) {
      if (node.pending === NOTPENDING) Pending.push(node);
      node.pending = value;
      return value;
    }
    if (node.comparator) {
      if (node.comparator(node.value, value)) return value;
    }
    let TransitionRunning = false;
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          if (TransitionRunning && Transition.disposed.has(o)) ;
          if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
            if (o.pure) Updates.push(o);else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (TransitionRunning) ;else o.state = STALE;
        }
        if (Updates.length > 10e5) {
          Updates = [];
          if (false) ;
          throw new Error();
        }
      }, false);
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn) return;
    cleanNode(node);
    const owner = Owner,
          listener = Listener,
          time = ExecCount;
    Listener = Owner = node;
    runComputation(node, node.value, time);
    Listener = listener;
    Owner = owner;
  }
  function runComputation(node, value, time) {
    let nextValue;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      handleError(err);
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.observers && node.observers.length) {
        writeSignal(node, nextValue);
      } else node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state: state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: null,
      pure
    };
    if (Owner === null) ;else if (Owner !== UNOWNED) {
      {
        if (!Owner.owned) Owner.owned = [c];else Owner.owned.push(c);
      }
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition ;
    if (node.state === 0 || runningTransition ) return;
    if (node.state === PENDING || runningTransition ) return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (node.state || runningTransition ) ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (node.state === STALE || runningTransition ) {
        updateComputation(node);
      } else if (node.state === PENDING || runningTransition ) {
        const updates = Updates;
        Updates = null;
        lookUpstream(node, ancestors[0]);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates) return fn();
    let wait = false;
    if (!init) Updates = [];
    if (Effects) wait = true;else Effects = [];
    ExecCount++;
    try {
      const res = fn();
      completeUpdates(wait);
      return res;
    } catch (err) {
      if (!Updates) Effects = null;
      handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      runQueue(Updates);
      Updates = null;
    }
    if (wait) return;
    if (Effects.length) batch(() => {
      runEffects(Effects);
      Effects = null;
    });else {
      Effects = null;
    }
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++) runTop(queue[i]);
  }
  function runUserEffects(queue) {
    let i,
        userLength = 0;
    for (i = 0; i < queue.length; i++) {
      const e = queue[i];
      if (!e.user) runTop(e);else queue[userLength++] = e;
    }
    if (sharedConfig.context) setHydrateContext();
    const resume = queue.length;
    for (i = 0; i < userLength; i++) runTop(queue[i]);
    for (i = resume; i < queue.length; i++) runTop(queue[i]);
  }
  function lookUpstream(node, ignore) {
    const runningTransition = Transition ;
    node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        if (source.state === STALE || runningTransition ) {
          if (source !== ignore) runTop(source);
        } else if (source.state === PENDING || runningTransition ) lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    const runningTransition = Transition ;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (!o.state || runningTransition ) {
        o.state = PENDING;
        if (o.pure) Updates.push(o);else Effects.push(o);
        o.observers && markDownstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(),
              index = node.sourceSlots.pop(),
              obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(),
                s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (node.owned) {
      for (i = 0; i < node.owned.length; i++) cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = 0; i < node.cleanups.length; i++) node.cleanups[i]();
      node.cleanups = null;
    }
    node.state = 0;
    node.context = null;
  }
  function handleError(err) {
    throw err;
  }
  function createComponent(Comp, props) {
    return untrack(() => Comp(props || {}));
  }
  function trueFn() {
    return true;
  }
  const propTraps = {
    get(_, property, receiver) {
      if (property === $PROXY) return receiver;
      return _.get(property);
    },
    has(_, property) {
      return _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
      return {
        configurable: true,
        enumerable: true,
        get() {
          return _.get(property);
        },
        set: trueFn,
        deleteProperty: trueFn
      };
    },
    ownKeys(_) {
      return _.keys();
    }
  };
  function resolveSource(s) {
    return (s = typeof s === "function" ? s() : s) == null ? {} : s;
  }
  function mergeProps(...sources) {
    return new Proxy({
      get(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          const v = resolveSource(sources[i])[property];
          if (v !== undefined) return v;
        }
      },
      has(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (property in resolveSource(sources[i])) return true;
        }
        return false;
      },
      keys() {
        const keys = [];
        for (let i = 0; i < sources.length; i++) keys.push(...Object.keys(resolveSource(sources[i])));
        return [...new Set(keys)];
      }
    }, propTraps);
  }
  function Show(props) {
    let strictEqual = false;
    const condition = createMemo(() => props.when, undefined, {
      equals: (a, b) => strictEqual ? a === b : !a === !b
    });
    return createMemo(() => {
      const c = condition();
      if (c) {
        const child = props.children;
        return (strictEqual = typeof child === "function" && child.length > 0) ? untrack(() => child(c)) : child;
      }
      return props.fallback;
    });
  }

  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length,
        aEnd = a.length,
        bEnd = bLength,
        aStart = 0,
        bStart = 0,
        after = a[aEnd - 1].nextSibling,
        map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart])) a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = new Map();
          let i = bStart;
          while (i < bEnd) map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart,
                sequence = 1,
                t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence) break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index) parentNode.insertBefore(b[bStart++], node);
            } else parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else aStart++;
        } else a[aStart++].remove();
      }
    }
  }

  const $$EVENTS = "_$DX_DELEGATE";
  function render(code, element, init) {
    let disposer;
    createRoot(dispose => {
      disposer = dispose;
      element === document ? code() : insert(element, code(), element.firstChild ? null : undefined, init);
    });
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function template(html, check, isSVG) {
    const t = document.createElement("template");
    t.innerHTML = html;
    let node = t.content.firstChild;
    if (isSVG) node = node.firstChild;
    return node;
  }
  function delegateEvents(eventNames, document = window.document) {
    const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];
      if (!e.has(name)) {
        e.add(name);
        document.addEventListener(name, eventHandler);
      }
    }
  }
  function setAttribute(node, name, value) {
    if (value == null) node.removeAttribute(name);else node.setAttribute(name, value);
  }
  function className(node, value) {
    if (value == null) node.removeAttribute("class");else node.className = value;
  }
  function addEventListener(node, name, handler, delegate) {
    if (delegate) {
      if (Array.isArray(handler)) {
        node[`$$${name}`] = handler[0];
        node[`$$${name}Data`] = handler[1];
      } else node[`$$${name}`] = handler;
    } else if (Array.isArray(handler)) {
      const handlerFn = handler[0];
      node.addEventListener(name, handler[0] = e => handlerFn.call(node, handler[1], e));
    } else node.addEventListener(name, handler);
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== undefined && !initial) initial = [];
    if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
    createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
  }
  function eventHandler(e) {
    const key = `$$${e.type}`;
    let node = e.composedPath && e.composedPath()[0] || e.target;
    if (e.target !== node) {
      Object.defineProperty(e, "target", {
        configurable: true,
        value: node
      });
    }
    Object.defineProperty(e, "currentTarget", {
      configurable: true,
      get() {
        return node || document;
      }
    });
    if (sharedConfig.registry && !sharedConfig.done) {
      sharedConfig.done = true;
      document.querySelectorAll("[id^=pl-]").forEach(elem => elem.remove());
    }
    while (node !== null) {
      const handler = node[key];
      if (handler && !node.disabled) {
        const data = node[`${key}Data`];
        data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
        if (e.cancelBubble) return;
      }
      node = node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
    }
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    if (sharedConfig.context && !current) current = [...parent.childNodes];
    while (typeof current === "function") current = current();
    if (value === current) return current;
    const t = typeof value,
          multi = marker !== undefined;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (sharedConfig.context) return current;
      if (t === "number") value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data = value;
        } else node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (sharedConfig.context) return current;
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function") v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      const currentArray = current && Array.isArray(current);
      if (normalizeIncomingArray(array, value, current, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (sharedConfig.context) {
        for (let i = 0; i < array.length; i++) {
          if (array[i].parentNode) return current = array;
        }
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi) return current;
      } else if (currentArray) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else {
        current && cleanChildren(parent);
        appendNodes(parent, array);
      }
      current = array;
    } else if (value instanceof Node) {
      if (sharedConfig.context && value.parentNode) return current = multi ? [value] : value;
      if (Array.isArray(current)) {
        if (multi) return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else parent.replaceChild(value, parent.firstChild);
      current = value;
    } else ;
    return current;
  }
  function normalizeIncomingArray(normalized, array, current, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i],
          prev = current && current[i];
      if (item instanceof Node) {
        normalized.push(item);
      } else if (item == null || item === true || item === false) ; else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
      } else if ((typeof item) === "function") {
        if (unwrap) {
          while (typeof item === "function") item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], prev) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else {
        const value = String(item);
        if (prev && prev.nodeType === 3 && prev.data === value) {
          normalized.push(prev);
        } else normalized.push(document.createTextNode(value));
      }
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker) {
    for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === undefined) return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);else isParent && el.remove();
        } else inserted = true;
      }
    } else parent.insertBefore(node, marker);
    return [node];
  }

  class Vec2 {
    static from_angle = n => new Vec2(Math.cos(n), Math.sin(n));
    static make = (x, y) => new Vec2(x, y);

    static get unit() {
      return new Vec2(1, 1);
    }

    static get zero() {
      return new Vec2(0, 0);
    }

    get vs() {
      return [this.x, this.y];
    }

    get mul_inverse() {
      return new Vec2(1 / this.x, 1 / this.y);
    }

    get inverse() {
      return new Vec2(-this.x, -this.y);
    }

    get half() {
      return new Vec2(this.x / 2, this.y / 2);
    }

    get length_squared() {
      return this.x * this.x + this.y * this.y;
    }

    get length() {
      return Math.sqrt(this.length_squared);
    }

    get normalize() {
      if (this.length === 0) {
        return Vec2.zero;
      }

      return this.scale(1 / this.length);
    }

    get perpendicular() {
      return new Vec2(-this.y, this.x);
    }

    equals(v) {
      return this.x === v.x && this.y === v.y;
    }

    get clone() {
      return new Vec2(this.x, this.y);
    }

    get angle() {
      return Math.atan2(this.y, this.x);
    }

    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    dot(v) {
      return this.x * v.x + this.y * v.y;
    }

    cross(v) {
      return this.x * v.y - this.y * v.x;
    }

    project_to(v) {
      let lsq = v.length_squared;
      let dp = this.dot(v);
      return Vec2.make(dp * v.x / lsq, dp * v.y / lsq);
    }

    distance(v) {
      return this.sub(v).length;
    }

    addy(n) {
      return Vec2.make(this.x, this.y + n);
    }

    add_angle(n) {
      return Vec2.from_angle(this.angle + n);
    }

    scale(n) {
      let {
        clone
      } = this;
      return clone.scale_in(n);
    }

    scale_in(n) {
      this.x *= n;
      this.y *= n;
      return this;
    }

    add(v) {
      let {
        clone
      } = this;
      return clone.add_in(v);
    }

    add_in(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }

    sub(v) {
      let {
        clone
      } = this;
      return clone.sub_in(v);
    }

    sub_in(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }

    mul(v) {
      let {
        clone
      } = this;
      return clone.mul_in(v);
    }

    mul_in(v) {
      this.x *= v.x;
      this.y *= v.y;
      return this;
    }

    div(v) {
      let {
        clone
      } = this;
      return clone.div_in(v);
    }

    div_in(v) {
      this.x /= v.x;
      this.y /= v.y;
      return this;
    }

    set_in(x, y = this.y) {
      this.x = x;
      this.y = y;
      return this;
    }

  }

  function loop(fn) {
    let animation_frame_id;
    let fixed_dt = 1000 / 60;
    let timestamp0,
        min_dt = fixed_dt,
        max_dt = fixed_dt * 2,
        dt0 = fixed_dt;

    function step(timestamp) {
      let dt = timestamp0 ? timestamp - timestamp0 : fixed_dt;
      dt = Math.min(max_dt, Math.max(min_dt, dt));

      if (fn(dt, dt0)) {
        return;
      }

      dt0 = dt;
      timestamp0 = timestamp;
      animation_frame_id = requestAnimationFrame(step);
    }

    animation_frame_id = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animation_frame_id);
    };
  }
  function owrite(signal, fn) {
    if (typeof fn === 'function') {
      return signal[1](fn);
    } else {
      signal[1](_ => fn);
    }
  }
  function read(signal) {
    if (Array.isArray(signal)) {
      return signal[0]();
    } else {
      return signal();
    }
  }

  function make_ref() {
    let _$ref = createSignal();

    let _$clear_bounds = createSignal(undefined, {
      equals: false
    });

    let _top = createMemo(() => {
      read(_$clear_bounds);
      return read(_$ref)?.scrollTop;
    });

    createMemo(() => {
      let top = read(_top);

      if (top !== undefined) {
        return Vec2.make(0, top);
      }
    });
    let m_rect = createMemo(() => {
      read(_$clear_bounds);
      return read(_$ref)?.getBoundingClientRect();
    });
    let m_orig = createMemo(() => {
      let rect = m_rect();

      if (rect) {
        return Vec2.make(rect.x, rect.y);
      }
    });
    let m_size = createMemo(() => {
      let rect = m_rect();

      if (rect) {
        return Vec2.make(rect.width, rect.height);
      }
    });
    return {
      $clear_bounds() {
        owrite(_$clear_bounds);
      },

      get $ref() {
        return read(_$ref);
      },

      set $ref($ref) {
        owrite(_$ref, $ref);
      },

      get rect() {
        return m_rect();
      },

      get orig() {
        return m_orig();
      },

      get size() {
        return m_size();
      },

      get_normal_at_abs_pos(vs) {
        let size = m_size(),
            orig = m_orig();

        if (!!size && !!orig) {
          return vs.sub(orig).div(size);
        }
      }

    };
  }

  class JPR {
    _just_on = false;
    _just_off = false;
    _been_on = undefined;

    get just_on() {
      return this._just_on;
    }

    get been_on() {
      return this._been_on;
    }

    get just_off() {
      return this._just_off;
    }

    _on() {
      this._just_on = true;
    }

    _off() {
      this._just_off = true;
    }

    update(dt, dt0) {
      if (this._been_on !== undefined) {
        this._been_on += dt;
      }

      if (this._just_on) {
        this._just_on = false;
        this._been_on = 0;
      }

      if (this._just_off) {
        this._just_off = false;
        this._been_on = undefined;
      }
    }

  }

  class Midi {
    clear() {
      this._jpr = new Map();
    }

    _jpr = new Map();

    get just_ons() {
      let {
        _jpr
      } = this;
      return [..._jpr.keys()].filter(_ => _jpr.get(_).just_on);
    }

    get been_ons() {
      let {
        _jpr
      } = this;
      return [..._jpr.keys()].filter(_ => _jpr.get(_).been_on !== undefined).map(_ => [_, _jpr.get(_).been_on]);
    }

    get just_offs() {
      let {
        _jpr
      } = this;
      return [..._jpr.keys()].filter(_ => _jpr.get(_).just_off);
    }

    noteOn(note, velocity) {
      if (!this._jpr.has(note)) {
        this._jpr.set(note, new JPR());
      }

      this._jpr.get(note)._on();
    }

    noteOff(note) {
      if (!this._jpr.has(note)) {
        this._jpr.set(note, new JPR());
      }

      this._jpr.get(note)._off();
    }

    update(dt, dt0) {
      for (let [key, value] of this._jpr) {
        value.update(dt, dt0);
      }
    }

    init() {
      const noteOn = (note, velocity) => {
        if (velocity === 0) {
          noteOff(note);
          return;
        }

        this.noteOn(note, velocity);
      };

      const noteOff = note => {
        this.noteOff(note);
      };

      const onMIDIMessage = message => {
        let data = message.data;
        data[0] >> 4;
            data[0] & 0xf;
            let type = data[0] & 0xf0,
            note = data[1],
            velocity = data[2];

        switch (type) {
          case 144:
            // noteOn
            noteOn(note, velocity);
            break;

          case 128:
            // noteOff
            noteOff(note);
            break;
        }
      };

      const onMIDISuccess = midiAccess => {
        let midi = midiAccess;
        let inputs = midi.inputs.values();

        for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
          input.value.onmidimessage = onMIDIMessage;
        }
      };

      navigator.requestMIDIAccess({
        sysex: true
      }).then(onMIDISuccess);
      return this;
    }

  }

  let midi = new Midi().init();
  const make_midi = hooks => {
    midi.clear();
    let clear = loop((dt, dt0) => {
      let {
        just_ons,
        just_offs
      } = midi;

      if (just_ons.length > 0) {
        hooks.just_ons(just_ons.map(_ => _));
      }

      if (just_offs.length > 0) {
        hooks.just_offs(just_offs.map(_ => _));
      }

      midi.update(dt, dt0);
    });
    return {
      dispose() {
        midi.clear();
        clear();
      }

    };
  };

  class HasAudioAnalyser {
    get maxFilterFreq() {
      return this.context.sampleRate / 2;
    }

    constructor(context) {
      this.context = context;
    }

    attack(time = this.context.currentTime) {
      let {
        context
      } = this;
      this._out_gain = context.createGain();

      this._out_gain.gain.setValueAtTime(1, time);

      let compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-60, context.currentTime);
      compressor.knee.setValueAtTime(40, context.currentTime);
      compressor.ratio.setValueAtTime(12, context.currentTime);
      compressor.attack.setValueAtTime(0, context.currentTime);
      compressor.release.setValueAtTime(0.25, context.currentTime);

      this._out_gain.connect(compressor);

      compressor.connect(context.destination);

      this._attack(time);

      return this;
    }

    release(time = this.context.currentTime) {
      this._release(time);

      return this;
    }

  }

  function load_audio(src) {
    return fetch(src).then(_ => _.arrayBuffer());
  }

  function decode_audio(context, buffer) {
    return context.decodeAudioData(buffer);
  }

  function ads(param, now, {
    a,
    d,
    s,
    r
  }, start, max) {
    param.setValueAtTime(start, now);
    param.linearRampToValueAtTime(max, now + a);
    param.linearRampToValueAtTime(s, now + a + d);
    /* not needed ? */
    //param.setValueAtTime(s, now + a + d)
  }

  function r(param, now, {
    r
  }, min) {
    param.cancelAndHoldAtTime(now);
    param.linearRampToValueAtTime(min, now + (r || 0));
  }

  class SamplesPlayer {
    get context() {
      if (!this._context) {
        this._context = new AudioContext();
      }

      return this._context;
    }

    get currentTime() {
      return this.context.currentTime;
    }

    async init(data) {
      let {
        srcs,
        base_url
      } = data;
      let buffers = await Promise.all(Object.keys(srcs).map(key => load_audio(base_url + srcs[key]).then(_ => decode_audio(this.context, _)).then(_ => [key, _])));
      this._buffers = new Map(buffers);
    }

    _ps = new Map();

    attack(synth, note, now = this.context.currentTime) {
      let buffer = this._buffers.get(note);

      let p = new SamplePlayer(this.context, buffer)._set_data({
        synth
      });

      p.attack(now);

      this._ps.set(note, p);
    }

    release(note, now = this.context.currentTime) {
      let _ = this._ps.get(note);

      if (_) {
        _.release(now);

        this._ps.delete(note);
      }
    }

  }

  class SamplePlayer extends HasAudioAnalyser {
    _set_data(data) {
      this.data = data;
      return this;
    }

    constructor(context, buffer) {
      super(context);
      this.buffer = buffer;
    }

    _attack(now = this.context.currentTime) {
      let {
        context,
        buffer
      } = this;
      let {
        synth: {
          adsr
        }
      } = this.data;
      let source_mix = context.createGain();
      source_mix.connect(this._out_gain);
      this.source_mix = source_mix;
      let source = context.createBufferSource();
      this.source = source;
      source.buffer = buffer;
      source.connect(source_mix);
      ads(source_mix.gain, now, adsr, 0, 1);
      source.start();
    }

    _release(now = this.context.currentTime) {
      let {
        synth: {
          adsr
        }
      } = this.data;
      r(this.source_mix.gain, now, adsr, 0);
      this.source.stop(now + adsr.r);
    }

  }

  const SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");
  const FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
  const SHARPS_FLATS = [...new Set([...SHARPS, ...FLATS])];
  const OCTAVES = "0 1 2 3 4 5 6 7 8".split(" ");
  const NOTES = OCTAVES.flatMap(octave => SHARPS_FLATS.map(name => name + octave));
  const SEMI = [0, 2, 4, 5, 7, 9, 11];

  const mod = (n, m) => (n % m + m) % m;

  const accToAlt = acc => acc[0] === 'b' ? -acc.length : acc.length;

  const REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
  function tokenizeNote(str) {
    const m = REGEX.exec(str);
    return [m[1].toUpperCase(), m[2].replace(/x/g, '##'), m[3], m[4]];
  }

  function parse(noteName) {
    const tokens = tokenizeNote(noteName);
    const [letter, acc, octStr] = tokens;
    const step = (letter.charCodeAt(0) + 3) % 7;
    const alt = accToAlt(acc);
    const oct = octStr.length ? parseInt(octStr) : undefined;
    const name = letter + acc + octStr;
    const pc = letter + acc;
    const height = oct === undefined ? mod(SEMI[step] + alt, 12) - 12 * 99 : SEMI[step] + alt + 12 * (oct + 1);
    const midi = height;
    const freq = Math.pow(2, (height - 69) / 12) * 440;
    return {
      name,
      pc,
      height,
      midi,
      freq,
      oct,
      acc
    };
  }

  const all = NOTES.map(parse);
  const all_freqs = [...new Set(all.map(_ => _.freq))];
  const by_octaves = OCTAVES.map(_ => all.filter(__ => __.oct === parseInt(_)));
  const by_freqs = all_freqs.map(_ => all.filter(__ => __.freq === _));
  const by_name = new Map(all.map(_ => [_.name, _]));
  const by_height = new Map(all.map(_ => [_.height, _]));
  const by_midi = new Map(all.map(_ => [_.midi, _]));
  const all_by_freq = new Map(by_freqs.map(_ => [_[0].freq, _]));
  const all_by_octave = new Map(by_octaves.map(_ => [_[0].oct, _]));
  const fuzzy_name = fuzzy => {
    let res = by_midi.get(fuzzy) || by_name.get(fuzzy) || by_height.get(fuzzy) || parse(fuzzy);
    return res && all_by_freq.get(res.freq)?.find(_ => _.acc === '' || _.acc === 'b');
  };

  const getPlayerController = async input => {
    if (input) {
      let treble_notes = [3, 4, 5, 6].flatMap(_ => all_by_octave.get(_)).filter(_ => !_.name.includes('#'));
      let srcs = {};
      treble_notes.forEach(n => srcs[n.name] = `${n.name}.mp3`);
      let p = new SamplesPlayer();
      await p.init({
        srcs,
        base_url: 'assets/audio/'
      });
      return p;
    }
  };

  class Solsido {
    onScroll() {
      this.ref.$clear_bounds();
    }

    get player() {
      return read(this.r_pc);
    }

    constructor() {
      this._user_click = createSignal(false);
      this.r_pc = createResource(this._user_click[0], getPlayerController);
      this.ref = make_ref();
      this._majors = make_majors(this);
      this.major_playback = make_playback(this);
      this.major_you = make_you(this);
    }

  }
  let synth = {
    adsr: {
      a: 0,
      d: 0.1,
      s: 0.8,
      r: 0.3
    }
  };

  const make_you = solsido => {
    let _major = createSignal();

    createEffect(on(_major[0], v => {
      if (v) {
        let midi = make_midi({
          just_ons(ons) {
            let {
              player
            } = solsido;
            ons.forEach(_ => player?.attack(synth, fuzzy_name(_).name));
          },

          just_offs(offs) {
            let {
              player
            } = solsido;
            offs.forEach(_ => player?.release(fuzzy_name(_).name));
          }

        });
        onCleanup(() => {
          midi.dispose();
        });
      }
    }));
    return {
      play_major(major) {
        owrite(_major, major);
      },

      stop_major(major) {
        owrite(_major, _ => _ === major ? undefined : _);
      },

      set_play(major) {
        owrite(solsido._user_click, true);

        solsido._majors.majors.forEach(_ => _.set_play_you(_ === major));
      }

    };
  };

  const make_playback = solsido => {
    let _major = createSignal();

    let m_bras = createMemo(() => read(_major)?.bras);
    createMemo(() => {
      let bras = m_bras();

      if (bras) {
        let _ = bras.find(_ => _.match('whole_note'));

        let [__, rest] = _.split('@');

        return parseFloat(rest.split(',')[0]);
      }

      return 0;
    });
    let bpm = 120;
    let note_per_beat = 2;
    let note_p_m = bpm * note_per_beat;
    let note_p_ms = note_p_m / 60 / 1000;
    let ms_p_note = 1 / note_p_ms;
    createEffect(on(_major[0], v => {
      if (v) {
        let x = -1;
        let _i = 0;

        let _x, _w;

        let cancel = loop((dt, dt0) => {
          _i += dt;
          let {
            player
          } = solsido;

          if (_i >= ms_p_note) {
            _i -= ms_p_note;
            x = (x + 1) % 8;
            [_x, _w] = v.xw_at(x);
            let note = fuzzy_name(v.notes[x]).name;
            player?.attack(synth, note);
            player?.release(note, player.currentTime + (ms_p_note - _i) / 1000);
          }

          if (x > -1) {
            v.xwi = `${_x},${_w},${_i / ms_p_note * 100}`;
          }
        });
        onCleanup(() => {
          cancel();
          v.xwi = `0,0,0`;
        });
      }
    }));
    return {
      play_major(major) {
        owrite(_major, major);
      },

      stop_major(major) {
        owrite(_major, _ => _ === major ? undefined : _);
      },

      set_play(major) {
        owrite(solsido._user_click, true);

        solsido._majors.majors.forEach(_ => _.set_play(_ === major));
      }

    };
  };

  let c_major = 'C Major';
  let flat_majors = ['F Major', 'Bflat Major'];
  let sharp_majors = ['G Major', 'D Major', 'F# Major'];
  let flats = {
    'F Major': ['F4', 'B4'],
    'Bflat Major': ['B3', 'B4', 'E5']
  };
  let sharps = {
    'G Major': ['G4', 'F5'],
    'D Major': ['D4', 'F5', 'C5'],
    'F# Major': ['F4', 'F5', 'C5', 'G5', 'D5', 'A4', 'E5']
  };
  let increasing = [...Array(8).keys()].map(_ => _ * 0.125);
  let notes = ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'];

  const note_y = note => 0.625 - notes.indexOf(note) * 0.125;

  const flat_bras = key => {
    let [note, ..._flats] = flats[key];
    return ['gclef@0.2,0', ..._flats.map((_, i) => `flat_accidental@${i * 0.3 + 1.2},${note_y(_)}`), ...increasing.map((_, i) => `whole_note@${i * 1.3 + 2},${note_y(note) - _}`)];
  };

  const sharp_bras = key => {
    let [note, ..._sharps] = sharps[key];
    let i_wnote = _sharps.length;
    let g_wnote = 1.3 - i_wnote / 8 * 0.3;
    return ['gclef@0.2,0', ..._sharps.map((_, i) => `sharp_accidental@${i * 0.3 + 1.2},${note_y(_)}`), ...increasing.map((_, i) => `whole_note@${i * g_wnote + 1.5 + i_wnote * 0.3},${note_y(note) - _}`)];
  };

  const cmajor_bras = ['gclef@0.2,0', ...increasing.map((_, i) => `whole_note@${i * 1.3 + 1.5},${note_y('C4') - _}`)];

  const octave_notes = note => notes.slice(notes.indexOf(note), notes.indexOf(note) + 8);

  const cmajor_notes = octave_notes('C4');

  const flat_notes = key => {
    let [note, ..._flats] = flats[key];

    let _notes = octave_notes(note);

    return _notes.map(_ => _flats.includes(_) ? _[0] + 'b' + _[1] : _);
  };

  const sharp_notes = key => {
    let [note, ..._sharps] = sharps[key];

    let _notes = octave_notes(note);

    return _notes.map(_ => _sharps.includes(_) ? _[0] + '#' + _[1] : _);
  };

  const make_major = (solsido, _major) => {
    let [key, major] = _major.split(' ');

    let _c_major = _major === c_major;

    let _flat_major = flat_majors.includes(_major);

    let _bras = _c_major ? cmajor_bras : _flat_major ? flat_bras(_major) : sharp_bras(_major);

    let _notes = _c_major ? cmajor_notes : _flat_major ? flat_notes(_major) : sharp_notes(_major);

    let _playback = createSignal(false);

    let _you = createSignal(false);

    let _xwi = createSignal('0,0,0');

    let m_klass = createMemo(() => [read(_you) ? 'you' : '', read(_playback) ? 'playback' : '']);
    let self = {
      key,

      get klass() {
        return m_klass();
      },

      get letter() {
        return key[0];
      },

      get flat() {
        return !!key.match('flat');
      },

      get name() {
        return _major;
      },

      get bras() {
        return _bras;
      },

      get notes() {
        return _notes;
      },

      xw_at(x) {
        let i_n = _bras.findIndex(_ => _.match('whole_note'));

        let _i = 0;

        let i_x = _bras.findIndex(_ => _.match('whole_note') && _i++ === x);

        let i_n1 = _bras[i_n],
            i_n2 = _bras[i_n + 1],
            i_nx = _bras[i_x];
        let x1 = i_n1.split('@')[1].split(',')[0],
            x2 = i_n2.split('@')[1].split(',')[0],
            xx = i_nx.split('@')[1].split(',')[0];
        return [parseFloat(xx), parseFloat(x2) - parseFloat(x1)];
      },

      get play() {
        return read(_playback) ? 'stop' : 'play';
      },

      set_play(v) {
        owrite(_playback, _ => v ? !_ : false);
      },

      get you_mode() {
        return read(_you) ? 'stop' : 'you';
      },

      set_play_you(v) {
        owrite(_you, _ => v ? !_ : false);
      },

      get you() {
        return read(_you);
      },

      get playback() {
        return read(_playback);
      },

      set xwi(xwi) {
        owrite(_xwi, xwi);
      },

      get xwi() {
        return read(_xwi);
      }

    };
    createEffect(on(_you[0], (v, p) => {
      if (v) {
        solsido.major_you.play_major(self);
      } else {
        if (!!p) {
          solsido.major_you.stop_major(self);
        }
      }
    }));
    createEffect(on(_playback[0], (v, p) => {
      if (v) {
        solsido.major_playback.play_major(self);
      } else {
        if (!!p) {
          solsido.major_playback.stop_major(self);
        }
      }
    }));
    return self;
  };

  const make_majors = solsido => {
    let _majors = [c_major, ...flat_majors, ...sharp_majors];

    let m_majors = _majors.map(_ => make_major(solsido, _));

    return {
      get majors() {
        return m_majors;
      },

      major(key) {
        return m_majors.find(_ => _.key === key);
      }

    };
  };

  const gclef = '';
  const bclef = '';
  const double_note = '';
  const whole_note = '';
  const half_note = '';
  const quarter_note = '';
  const brace = '';
  const flat_accidental = '';
  const natural_accidental = '';
  const sharp_accidental = '';
  const dsharp_accidental = '';
  const dflat_accidental = '';
  const eighth_flag_up = '';
  const sixteenth_flag_up = '';
  const thirtysecond_flag_up = '';
  const sixtyfourth_flag_up = '';
  const eighth_flag_down = '';
  const sixteenth_flag_down = '';
  const thirtysecond_flag_down = '';
  const sixtyfourth_flag_down = '';
  const double_rest = '';
  const whole_rest = '';
  const half_rest = '';
  const quarter_rest = '';
  const eighth_rest = '';
  const sixteenth_rest = '';
  const thirtysecond_rest = '';
  const sixtyfourth_rest = '';
  const onetwentyeighth_rest = '';
  const zero_time = '';
  const one_time = '';
  const two_time = '';
  const three_time = '';
  const four_time = '';
  const five_time = '';
  const six_time = '';
  const seven_time = '';
  const eight_time = '';
  const nine_time = '';
  const ten_time = one_time + zero_time;
  const twelve_time = one_time + two_time;
  const common_time = '';
  const cut_time = '';
  const quarter_text = '';
  const barline_single = '';
  const barline_double = '';
  const barline_final = '';
  var g = {
    barline_single,
    barline_double,
    barline_final,
    quarter_text,
    gclef,
    bclef,
    double_note,
    whole_note,
    half_note,
    quarter_note,
    flat_accidental,
    natural_accidental,
    sharp_accidental,
    dflat_accidental,
    dsharp_accidental,
    eighth_flag_up,
    sixteenth_flag_up,
    thirtysecond_flag_up,
    sixtyfourth_flag_up,
    eighth_flag_down,
    sixteenth_flag_down,
    thirtysecond_flag_down,
    sixtyfourth_flag_down,
    eighth_flag_up,
    sixteenth_flag_up,
    thirtysecond_flag_up,
    sixtyfourth_flag_up,
    brace,
    double_rest,
    whole_rest,
    half_rest,
    quarter_rest,
    eighth_rest,
    sixteenth_rest,
    thirtysecond_rest,
    sixtyfourth_rest,
    onetwentyeighth_rest,
    zero_time,
    one_time,
    two_time,
    three_time,
    four_time,
    five_time,
    six_time,
    seven_time,
    eight_time,
    nine_time,
    ten_time,
    twelve_time,
    common_time,
    cut_time
  };

  const _tmpl$ = /*#__PURE__*/template(`<solsido></solsido>`),
        _tmpl$2 = /*#__PURE__*/template(`<h2> Major Key Signatures </h2>`),
        _tmpl$3 = /*#__PURE__*/template(`<div class="key-signatures"><div> <!> </div><div></div><div></div><div></div></div>`),
        _tmpl$4 = /*#__PURE__*/template(`<span class="bra"></span>`),
        _tmpl$5 = /*#__PURE__*/template(`<div class="cmajor"><div class="header"><label> Major</label><div class="controls"></div></div><div><div> </div></div></div>`),
        _tmpl$6 = /*#__PURE__*/template(`<span class="icon"></span>`);

  function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback, options);
  }

  const App = solsido => props => {
    let unbinds = [];
    unbinds.push(unbindable(document, 'scroll', () => solsido.onScroll(), {
      capture: true,
      passive: true
    }));
    unbinds.push(unbindable(window, 'resize', () => solsido.onScroll(), {
      passive: true
    }));
    onCleanup(() => unbinds.forEach(_ => _()));
    return (() => {
      const _el$ = _tmpl$.cloneNode(true);

      (_ => setTimeout(() => solsido.ref.$ref = _))(_el$);

      insert(_el$, createComponent(KeySignatures, {
        solsido: solsido
      }));

      return _el$;
    })();
  };

  const KeySignatures = props => {
    return [_tmpl$2.cloneNode(true), (() => {
      const _el$3 = _tmpl$3.cloneNode(true),
            _el$4 = _el$3.firstChild,
            _el$5 = _el$4.firstChild,
            _el$7 = _el$5.nextSibling;
            _el$7.nextSibling;
            const _el$8 = _el$4.nextSibling,
            _el$9 = _el$8.nextSibling,
            _el$10 = _el$9.nextSibling;

      insert(_el$4, createComponent(CMajor, mergeProps(props, {
        get major() {
          return props.solsido._majors.major('C');
        }

      })), _el$7);

      insert(_el$8, createComponent(CMajor, mergeProps(props, {
        get major() {
          return props.solsido._majors.major('F');
        }

      })), null);

      insert(_el$8, createComponent(CMajor, mergeProps(props, {
        get major() {
          return props.solsido._majors.major('G');
        }

      })), null);

      insert(_el$9, createComponent(CMajor, mergeProps(props, {
        get major() {
          return props.solsido._majors.major('Bflat');
        }

      })), null);

      insert(_el$9, createComponent(CMajor, mergeProps(props, {
        get major() {
          return props.solsido._majors.major('D');
        }

      })), null);

      insert(_el$10, createComponent(CMajor, mergeProps(props, {
        get major() {
          return props.solsido._majors.major('F#');
        }

      })));

      return _el$3;
    })()];
  };

  const you_titles = {
    'you': 'You Play',
    'stop': 'Stop'
  };

  const CMajor = props => {
    let $ref;
    onMount(() => {
      let api = VStaff__default["default"]($ref);
      createEffect(() => {
        api.bras = props.major.bras;
      });
      createEffect(() => {
        api.xwi = props.major.xwi;
      });
      createEffect(() => {
        api.playback = props.major.playback;
      });
    });

    let _show_controls = createSignal(false);

    return (() => {
      const _el$11 = _tmpl$5.cloneNode(true),
            _el$12 = _el$11.firstChild,
            _el$13 = _el$12.firstChild,
            _el$15 = _el$13.firstChild,
            _el$16 = _el$13.nextSibling,
            _el$17 = _el$12.nextSibling,
            _el$18 = _el$17.firstChild;

      _el$11.$$mouseover = _ => owrite(_show_controls, true);

      _el$11.addEventListener("mouseleave", _ => owrite(_show_controls, false));

      insert(_el$13, () => props.major.letter, _el$15);

      insert(_el$13, createComponent(Show, {
        get when() {
          return props.major.flat;
        },

        get children() {
          const _el$14 = _tmpl$4.cloneNode(true);

          insert(_el$14, () => g['flat_accidental']);

          return _el$14;
        }

      }), _el$15);

      insert(_el$16, createComponent(Show, {
        get when() {
          return read(_show_controls);
        },

        get children() {
          return [createComponent(Icon, {
            onClick: _ => props.solsido.major_playback.set_play(props.major),

            get title() {
              return props.major.play;
            },

            get children() {
              return props.major.play;
            }

          }), createComponent(Icon, {
            onClick: _ => props.solsido.major_you.set_play(props.major),

            get title() {
              return you_titles[props.major.you_mode];
            },

            get children() {
              return props.major.you_mode;
            }

          })];
        }

      }));

      const _ref$ = $ref;
      typeof _ref$ === "function" ? _ref$(_el$18) : $ref = _el$18;

      createRenderEffect(() => className(_el$17, ['major-staff', ...props.major.klass].join(' ')));

      return _el$11;
    })();
  };

  const Icon = props => {
    return (() => {
      const _el$19 = _tmpl$6.cloneNode(true);

      addEventListener(_el$19, "click", props.onClick, true);

      insert(_el$19, () => props.children);

      createRenderEffect(() => setAttribute(_el$19, "title", props.title));

      return _el$19;
    })();
  };

  delegateEvents(["mouseover", "click"]);

  function Lado(element, options = {}) {
    let solsido = new Solsido();
    render(App(solsido), element);
    return {};
  }

  return Lado;

})(VStaff);
