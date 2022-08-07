var Lado = (function () {
  'use strict';

  const sharedConfig$1 = {};
  function setHydrateContext(context) {
    sharedConfig$1.context = context;
  }

  const equalFn$1 = (a, b) => a === b;
  const $PROXY = Symbol("solid-proxy");
  const $TRACK$1 = Symbol("solid-track");
  const signalOptions$1 = {
    equals: equalFn$1
  };
  let runEffects$1 = runQueue$1;
  const NOTPENDING$1 = {};
  const STALE$1 = 1;
  const PENDING$1 = 2;
  const UNOWNED$1 = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  const [transPending, setTransPending] = /*@__PURE__*/createSignal$1(false);
  var Owner$1 = null;
  let Transition$1 = null;
  let Listener$1 = null;
  let Pending$1 = null;
  let Updates$1 = null;
  let Effects$1 = null;
  let ExecCount$1 = 0;
  function createRoot$1(fn, detachedOwner) {
    const listener = Listener$1,
          owner = Owner$1,
          unowned = fn.length === 0,
          root = unowned && !false ? UNOWNED$1 : {
      owned: null,
      cleanups: null,
      context: null,
      owner: detachedOwner || owner
    },
          updateFn = unowned ? fn : () => fn(() => cleanNode$1(root));
    Owner$1 = root;
    Listener$1 = null;
    try {
      return runUpdates$1(updateFn, true);
    } finally {
      Listener$1 = listener;
      Owner$1 = owner;
    }
  }
  function createSignal$1(value, options) {
    options = options ? Object.assign({}, signalOptions$1, options) : signalOptions$1;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      pending: NOTPENDING$1,
      comparator: options.equals || undefined
    };
    const setter = value => {
      if (typeof value === "function") {
        value = value(s.pending !== NOTPENDING$1 ? s.pending : s.value);
      }
      return writeSignal$1(s, value);
    };
    return [readSignal$1.bind(s), setter];
  }
  function createComputed(fn, value, options) {
    const c = createComputation$1(fn, value, true, STALE$1);
    updateComputation$1(c);
  }
  function createRenderEffect$1(fn, value, options) {
    const c = createComputation$1(fn, value, false, STALE$1);
    updateComputation$1(c);
  }
  function createEffect(fn, value, options) {
    runEffects$1 = runUserEffects;
    const c = createComputation$1(fn, value, false, STALE$1);
    c.user = true;
    Effects$1 ? Effects$1.push(c) : updateComputation$1(c);
  }
  function createMemo$1(fn, value, options) {
    options = options ? Object.assign({}, signalOptions$1, options) : signalOptions$1;
    const c = createComputation$1(fn, value, true, 0);
    c.pending = NOTPENDING$1;
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || undefined;
    updateComputation$1(c);
    return readSignal$1.bind(c);
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
          [value, setValue] = createSignal$1(options.initialValue),
          [track, trigger] = createSignal$1(undefined, {
      equals: false
    }),
          [loading, setLoading] = createSignal$1(false),
          [error, setError] = createSignal$1();
    let err = undefined,
        pr = null,
        initP = null,
        id = null,
        scheduled = false,
        resolved = ("initialValue" in options),
        dynamic = typeof source === "function" && createMemo$1(source);
    if (sharedConfig$1.context) {
      id = `${sharedConfig$1.context.id}${sharedConfig$1.context.count++}`;
      if (sharedConfig$1.load) initP = sharedConfig$1.load(id);
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
      batch$1(() => {
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
      if (Listener$1 && !Listener$1.user && c) {
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
        loadEnd(pr, untrack$1(value));
        return;
      }
      const p = initP || untrack$1(() => fetcher(lookup, {
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
      batch$1(() => {
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
  function batch$1(fn) {
    if (Pending$1) return fn();
    let result;
    const q = Pending$1 = [];
    try {
      result = fn();
    } finally {
      Pending$1 = null;
    }
    runUpdates$1(() => {
      for (let i = 0; i < q.length; i += 1) {
        const data = q[i];
        if (data.pending !== NOTPENDING$1) {
          const pending = data.pending;
          data.pending = NOTPENDING$1;
          writeSignal$1(data, pending);
        }
      }
    }, false);
    return result;
  }
  function untrack$1(fn) {
    let result,
        listener = Listener$1;
    Listener$1 = null;
    result = fn();
    Listener$1 = listener;
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
      const result = untrack$1(() => fn(input, prevInput, prevValue));
      prevInput = input;
      return result;
    };
  }
  function onMount(fn) {
    createEffect(() => untrack$1(fn));
  }
  function onCleanup$1(fn) {
    if (Owner$1 === null) ;else if (Owner$1.cleanups === null) Owner$1.cleanups = [fn];else Owner$1.cleanups.push(fn);
    return fn;
  }
  function getOwner() {
    return Owner$1;
  }
  function runWithOwner(o, fn) {
    const prev = Owner$1;
    Owner$1 = o;
    try {
      return runUpdates$1(fn, true);
    } finally {
      Owner$1 = prev;
    }
  }
  function startTransition(fn) {
    const l = Listener$1;
    const o = Owner$1;
    return Promise.resolve().then(() => {
      Listener$1 = l;
      Owner$1 = o;
      let t;
      batch$1(fn);
      Listener$1 = Owner$1 = null;
      return t ? t.done : undefined;
    });
  }
  function useTransition() {
    return [transPending, startTransition];
  }
  function createContext(defaultValue) {
    const id = Symbol("context");
    return {
      id,
      Provider: createProvider(id),
      defaultValue
    };
  }
  function useContext(context) {
    let ctx;
    return (ctx = lookup(Owner$1, context.id)) !== undefined ? ctx : context.defaultValue;
  }
  function children(fn) {
    const children = createMemo$1(fn);
    return createMemo$1(() => resolveChildren(children()));
  }
  let SuspenseContext;
  function readSignal$1() {
    const runningTransition = Transition$1 ;
    if (this.sources && (this.state || runningTransition )) {
      const updates = Updates$1;
      Updates$1 = null;
      this.state === STALE$1 || runningTransition  ? updateComputation$1(this) : lookUpstream$1(this);
      Updates$1 = updates;
    }
    if (Listener$1) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener$1.sources) {
        Listener$1.sources = [this];
        Listener$1.sourceSlots = [sSlot];
      } else {
        Listener$1.sources.push(this);
        Listener$1.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener$1];
        this.observerSlots = [Listener$1.sources.length - 1];
      } else {
        this.observers.push(Listener$1);
        this.observerSlots.push(Listener$1.sources.length - 1);
      }
    }
    return this.value;
  }
  function writeSignal$1(node, value, isComp) {
    if (Pending$1) {
      if (node.pending === NOTPENDING$1) Pending$1.push(node);
      node.pending = value;
      return value;
    }
    if (node.comparator) {
      if (node.comparator(node.value, value)) return value;
    }
    let TransitionRunning = false;
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates$1(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          if (TransitionRunning && Transition$1.disposed.has(o)) ;
          if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
            if (o.pure) Updates$1.push(o);else Effects$1.push(o);
            if (o.observers) markDownstream$1(o);
          }
          if (TransitionRunning) ;else o.state = STALE$1;
        }
        if (Updates$1.length > 10e5) {
          Updates$1 = [];
          if (false) ;
          throw new Error();
        }
      }, false);
    }
    return value;
  }
  function updateComputation$1(node) {
    if (!node.fn) return;
    cleanNode$1(node);
    const owner = Owner$1,
          listener = Listener$1,
          time = ExecCount$1;
    Listener$1 = Owner$1 = node;
    runComputation$1(node, node.value, time);
    Listener$1 = listener;
    Owner$1 = owner;
  }
  function runComputation$1(node, value, time) {
    let nextValue;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      handleError$1(err);
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.observers && node.observers.length) {
        writeSignal$1(node, nextValue);
      } else node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation$1(fn, init, pure, state = STALE$1, options) {
    const c = {
      fn,
      state: state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner$1,
      context: null,
      pure
    };
    if (Owner$1 === null) ;else if (Owner$1 !== UNOWNED$1) {
      {
        if (!Owner$1.owned) Owner$1.owned = [c];else Owner$1.owned.push(c);
      }
    }
    return c;
  }
  function runTop$1(node) {
    const runningTransition = Transition$1 ;
    if (node.state === 0 || runningTransition ) return;
    if (node.state === PENDING$1 || runningTransition ) return lookUpstream$1(node);
    if (node.suspense && untrack$1(node.suspense.inFallback)) return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount$1)) {
      if (node.state || runningTransition ) ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (node.state === STALE$1 || runningTransition ) {
        updateComputation$1(node);
      } else if (node.state === PENDING$1 || runningTransition ) {
        const updates = Updates$1;
        Updates$1 = null;
        lookUpstream$1(node, ancestors[0]);
        Updates$1 = updates;
      }
    }
  }
  function runUpdates$1(fn, init) {
    if (Updates$1) return fn();
    let wait = false;
    if (!init) Updates$1 = [];
    if (Effects$1) wait = true;else Effects$1 = [];
    ExecCount$1++;
    try {
      const res = fn();
      completeUpdates$1(wait);
      return res;
    } catch (err) {
      if (!Updates$1) Effects$1 = null;
      handleError$1(err);
    }
  }
  function completeUpdates$1(wait) {
    if (Updates$1) {
      runQueue$1(Updates$1);
      Updates$1 = null;
    }
    if (wait) return;
    if (Effects$1.length) batch$1(() => {
      runEffects$1(Effects$1);
      Effects$1 = null;
    });else {
      Effects$1 = null;
    }
  }
  function runQueue$1(queue) {
    for (let i = 0; i < queue.length; i++) runTop$1(queue[i]);
  }
  function runUserEffects(queue) {
    let i,
        userLength = 0;
    for (i = 0; i < queue.length; i++) {
      const e = queue[i];
      if (!e.user) runTop$1(e);else queue[userLength++] = e;
    }
    if (sharedConfig$1.context) setHydrateContext();
    const resume = queue.length;
    for (i = 0; i < userLength; i++) runTop$1(queue[i]);
    for (i = resume; i < queue.length; i++) runTop$1(queue[i]);
  }
  function lookUpstream$1(node, ignore) {
    const runningTransition = Transition$1 ;
    node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        if (source.state === STALE$1 || runningTransition ) {
          if (source !== ignore) runTop$1(source);
        } else if (source.state === PENDING$1 || runningTransition ) lookUpstream$1(source, ignore);
      }
    }
  }
  function markDownstream$1(node) {
    const runningTransition = Transition$1 ;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (!o.state || runningTransition ) {
        o.state = PENDING$1;
        if (o.pure) Updates$1.push(o);else Effects$1.push(o);
        o.observers && markDownstream$1(o);
      }
    }
  }
  function cleanNode$1(node) {
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
      for (i = 0; i < node.owned.length; i++) cleanNode$1(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = 0; i < node.cleanups.length; i++) node.cleanups[i]();
      node.cleanups = null;
    }
    node.state = 0;
    node.context = null;
  }
  function handleError$1(err) {
    throw err;
  }
  function lookup(owner, key) {
    return owner ? owner.context && owner.context[key] !== undefined ? owner.context[key] : lookup(owner.owner, key) : undefined;
  }
  function resolveChildren(children) {
    if (typeof children === "function" && !children.length) return resolveChildren(children());
    if (Array.isArray(children)) {
      const results = [];
      for (let i = 0; i < children.length; i++) {
        const result = resolveChildren(children[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }
      return results;
    }
    return children;
  }
  function createProvider(id) {
    return function provider(props) {
      let res;
      createComputed(() => res = untrack$1(() => {
        Owner$1.context = {
          [id]: props.value
        };
        return children(() => props.children);
      }));
      return res;
    };
  }

  const FALLBACK$1 = Symbol("fallback");
  function dispose$1(d) {
    for (let i = 0; i < d.length; i++) d[i]();
  }
  function mapArray$1(list, mapFn, options = {}) {
    let items = [],
        mapped = [],
        disposers = [],
        len = 0,
        indexes = mapFn.length > 1 ? [] : null;
    onCleanup$1(() => dispose$1(disposers));
    return () => {
      let newItems = list() || [],
          i,
          j;
      newItems[$TRACK$1];
      return untrack$1(() => {
        let newLen = newItems.length,
            newIndices,
            newIndicesNext,
            temp,
            tempdisposers,
            tempIndexes,
            start,
            end,
            newEnd,
            item;
        if (newLen === 0) {
          if (len !== 0) {
            dispose$1(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            indexes && (indexes = []);
          }
          if (options.fallback) {
            items = [FALLBACK$1];
            mapped[0] = createRoot$1(disposer => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        }
        else if (len === 0) {
          mapped = new Array(newLen);
          for (j = 0; j < newLen; j++) {
            items[j] = newItems[j];
            mapped[j] = createRoot$1(mapper);
          }
          len = newLen;
        } else {
          temp = new Array(newLen);
          tempdisposers = new Array(newLen);
          indexes && (tempIndexes = new Array(newLen));
          for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++);
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
            temp[newEnd] = mapped[end];
            tempdisposers[newEnd] = disposers[end];
            indexes && (tempIndexes[newEnd] = indexes[end]);
          }
          newIndices = new Map();
          newIndicesNext = new Array(newEnd + 1);
          for (j = newEnd; j >= start; j--) {
            item = newItems[j];
            i = newIndices.get(item);
            newIndicesNext[j] = i === undefined ? -1 : i;
            newIndices.set(item, j);
          }
          for (i = start; i <= end; i++) {
            item = items[i];
            j = newIndices.get(item);
            if (j !== undefined && j !== -1) {
              temp[j] = mapped[i];
              tempdisposers[j] = disposers[i];
              indexes && (tempIndexes[j] = indexes[i]);
              j = newIndicesNext[j];
              newIndices.set(item, j);
            } else disposers[i]();
          }
          for (j = start; j < newLen; j++) {
            if (j in temp) {
              mapped[j] = temp[j];
              disposers[j] = tempdisposers[j];
              if (indexes) {
                indexes[j] = tempIndexes[j];
                indexes[j](j);
              }
            } else mapped[j] = createRoot$1(mapper);
          }
          mapped = mapped.slice(0, len = newLen);
          items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        if (indexes) {
          const [s, set] = createSignal$1(j);
          indexes[j] = set;
          return mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  function createComponent$1(Comp, props) {
    return untrack$1(() => Comp(props || {}));
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
  function splitProps(props, ...keys) {
    const blocked = new Set(keys.flat());
    const descriptors = Object.getOwnPropertyDescriptors(props);
    const res = keys.map(k => {
      const clone = {};
      for (let i = 0; i < k.length; i++) {
        const key = k[i];
        Object.defineProperty(clone, key, descriptors[key] ? descriptors[key] : {
          get() {
            return props[key];
          },
          set() {
            return true;
          }
        });
      }
      return clone;
    });
    res.push(new Proxy({
      get(property) {
        return blocked.has(property) ? undefined : props[property];
      },
      has(property) {
        return blocked.has(property) ? false : property in props;
      },
      keys() {
        return Object.keys(props).filter(k => !blocked.has(k));
      }
    }, propTraps));
    return res;
  }

  function For$1(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo$1(mapArray$1(() => props.each, props.children, fallback ? fallback : undefined));
  }
  function Show$1(props) {
    let strictEqual = false;
    const condition = createMemo$1(() => props.when, undefined, {
      equals: (a, b) => strictEqual ? a === b : !a === !b
    });
    return createMemo$1(() => {
      const c = condition();
      if (c) {
        const child = props.children;
        return (strictEqual = typeof child === "function" && child.length > 0) ? untrack$1(() => child(c)) : child;
      }
      return props.fallback;
    });
  }

  const booleans = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"];
  const Properties = /*#__PURE__*/new Set(["className", "value", "readOnly", "formNoValidate", "isMap", "noModule", "playsInline", ...booleans]);
  const ChildProperties = /*#__PURE__*/new Set(["innerHTML", "textContent", "innerText", "children"]);
  const Aliases = {
    className: "class",
    htmlFor: "for"
  };
  const PropAliases = {
    class: "className",
    formnovalidate: "formNoValidate",
    ismap: "isMap",
    nomodule: "noModule",
    playsinline: "playsInline",
    readonly: "readOnly"
  };
  const DelegatedEvents = /*#__PURE__*/new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
  const SVGNamespace = {
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace"
  };

  function memo(fn, equals) {
    return createMemo$1(fn, undefined, !equals ? {
      equals
    } : undefined);
  }

  function reconcileArrays$1(parentNode, a, b) {
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
  function render$1(code, element, init) {
    let disposer;
    createRoot$1(dispose => {
      disposer = dispose;
      element === document ? code() : insert$1(element, code(), element.firstChild ? null : undefined, init);
    });
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function template$1(html, check, isSVG) {
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
  function setAttribute$1(node, name, value) {
    if (value == null) node.removeAttribute(name);else node.setAttribute(name, value);
  }
  function setAttributeNS(node, namespace, name, value) {
    if (value == null) node.removeAttributeNS(namespace, name);else node.setAttributeNS(namespace, name, value);
  }
  function className$1(node, value) {
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
  function classList(node, value, prev = {}) {
    const classKeys = Object.keys(value || {}),
          prevKeys = Object.keys(prev);
    let i, len;
    for (i = 0, len = prevKeys.length; i < len; i++) {
      const key = prevKeys[i];
      if (!key || key === "undefined" || value[key]) continue;
      toggleClassKey(node, key, false);
      delete prev[key];
    }
    for (i = 0, len = classKeys.length; i < len; i++) {
      const key = classKeys[i],
            classValue = !!value[key];
      if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
      toggleClassKey(node, key, true);
      prev[key] = classValue;
    }
    return prev;
  }
  function style$1(node, value, prev = {}) {
    const nodeStyle = node.style;
    const prevString = typeof prev === "string";
    if (value == null && prevString || typeof value === "string") return nodeStyle.cssText = value;
    prevString && (nodeStyle.cssText = undefined, prev = {});
    value || (value = {});
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
      }
    }
    return prev;
  }
  function spread(node, accessor, isSVG, skipChildren) {
    if (typeof accessor === "function") {
      createRenderEffect$1(current => spreadExpression(node, accessor(), current, isSVG, skipChildren));
    } else spreadExpression(node, accessor, undefined, isSVG, skipChildren);
  }
  function insert$1(parent, accessor, marker, initial) {
    if (marker !== undefined && !initial) initial = [];
    if (typeof accessor !== "function") return insertExpression$1(parent, accessor, initial, marker);
    createRenderEffect$1(current => insertExpression$1(parent, accessor(), current, marker), initial);
  }
  function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
    props || (props = {});
    for (const prop in prevProps) {
      if (!(prop in props)) {
        if (prop === "children") continue;
        assignProp(node, prop, null, prevProps[prop], isSVG, skipRef);
      }
    }
    for (const prop in props) {
      if (prop === "children") {
        if (!skipChildren) insertExpression$1(node, props.children);
        continue;
      }
      const value = props[prop];
      prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef);
    }
  }
  function toPropertyName(name) {
    return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
  }
  function toggleClassKey(node, key, value) {
    const classNames = key.trim().split(/\s+/);
    for (let i = 0, nameLen = classNames.length; i < nameLen; i++) node.classList.toggle(classNames[i], value);
  }
  function assignProp(node, prop, value, prev, isSVG, skipRef) {
    let isCE, isProp, isChildProp;
    if (prop === "style") return style$1(node, value, prev);
    if (prop === "classList") return classList(node, value, prev);
    if (value === prev) return prev;
    if (prop === "ref") {
      if (!skipRef) {
        value(node);
      }
    } else if (prop.slice(0, 3) === "on:") {
      const e = prop.slice(3);
      prev && node.removeEventListener(e, prev);
      value && node.addEventListener(e, value);
    } else if (prop.slice(0, 10) === "oncapture:") {
      const e = prop.slice(10);
      prev && node.removeEventListener(e, prev, true);
      value && node.addEventListener(e, value, true);
    } else if (prop.slice(0, 2) === "on") {
      const name = prop.slice(2).toLowerCase();
      const delegate = DelegatedEvents.has(name);
      if (!delegate && prev) {
        const h = Array.isArray(prev) ? prev[0] : prev;
        node.removeEventListener(name, h);
      }
      if (delegate || value) {
        addEventListener(node, name, value, delegate);
        delegate && delegateEvents([name]);
      }
    } else if ((isChildProp = ChildProperties.has(prop)) || !isSVG && (PropAliases[prop] || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-"))) {
      if (prop === "class" || prop === "className") className$1(node, value);else if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;else node[PropAliases[prop] || prop] = value;
    } else {
      const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
      if (ns) setAttributeNS(node, ns, prop, value);else setAttribute$1(node, Aliases[prop] || prop, value);
    }
    return value;
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
    if (sharedConfig$1.registry && !sharedConfig$1.done) {
      sharedConfig$1.done = true;
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
  function spreadExpression(node, props, prevProps = {}, isSVG, skipChildren) {
    props || (props = {});
    if (!skipChildren && "children" in props) {
      createRenderEffect$1(() => prevProps.children = insertExpression$1(node, props.children, prevProps.children));
    }
    props.ref && props.ref(node);
    createRenderEffect$1(() => assign(node, props, isSVG, true, prevProps, true));
    return prevProps;
  }
  function insertExpression$1(parent, value, current, marker, unwrapArray) {
    if (sharedConfig$1.context && !current) current = [...parent.childNodes];
    while (typeof current === "function") current = current();
    if (value === current) return current;
    const t = typeof value,
          multi = marker !== undefined;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (sharedConfig$1.context) return current;
      if (t === "number") value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data = value;
        } else node = document.createTextNode(value);
        current = cleanChildren$1(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (sharedConfig$1.context) return current;
      current = cleanChildren$1(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect$1(() => {
        let v = value();
        while (typeof v === "function") v = v();
        current = insertExpression$1(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      const currentArray = current && Array.isArray(current);
      if (normalizeIncomingArray$1(array, value, current, unwrapArray)) {
        createRenderEffect$1(() => current = insertExpression$1(parent, array, current, marker, true));
        return () => current;
      }
      if (sharedConfig$1.context) {
        for (let i = 0; i < array.length; i++) {
          if (array[i].parentNode) return current = array;
        }
      }
      if (array.length === 0) {
        current = cleanChildren$1(parent, current, marker);
        if (multi) return current;
      } else if (currentArray) {
        if (current.length === 0) {
          appendNodes$1(parent, array, marker);
        } else reconcileArrays$1(parent, current, array);
      } else {
        current && cleanChildren$1(parent);
        appendNodes$1(parent, array);
      }
      current = array;
    } else if (value instanceof Node) {
      if (sharedConfig$1.context && value.parentNode) return current = multi ? [value] : value;
      if (Array.isArray(current)) {
        if (multi) return current = cleanChildren$1(parent, current, marker, value);
        cleanChildren$1(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else parent.replaceChild(value, parent.firstChild);
      current = value;
    } else ;
    return current;
  }
  function normalizeIncomingArray$1(normalized, array, current, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i],
          prev = current && current[i];
      if (item instanceof Node) {
        normalized.push(item);
      } else if (item == null || item === true || item === false) ; else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray$1(normalized, item, prev) || dynamic;
      } else if ((typeof item) === "function") {
        if (unwrap) {
          while (typeof item === "function") item = item();
          dynamic = normalizeIncomingArray$1(normalized, Array.isArray(item) ? item : [item], prev) || dynamic;
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
  function appendNodes$1(parent, array, marker) {
    for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
  }
  function cleanChildren$1(parent, current, marker, replacement) {
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

  function bindEvent(target, type, handler) {
    target.addEventListener(type, handler);
    return () => target.removeEventListener(type, handler);
  }

  function intercept([value, setValue], get, set) {
    return [get ? () => get(value()) : value, set ? v => setValue(set(v)) : setValue];
  }

  function querySelector(selector) {
    // Guard against selector being an invalid CSS selector
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function scrollToHash(hash, fallbackTop) {
    const el = querySelector(`#${hash}`);

    if (el) {
      el.scrollIntoView();
    } else if (fallbackTop) {
      window.scrollTo(0, 0);
    }
  }

  function createIntegration(get, set, init, utils) {
    let ignore = false;

    const wrap = value => typeof value === "string" ? {
      value
    } : value;

    const signal = intercept(createSignal$1(wrap(get()), {
      equals: (a, b) => a.value === b.value
    }), undefined, next => {
      !ignore && set(next);
      return next;
    });
    init && onCleanup$1(init((value = get()) => {
      ignore = true;
      signal[1](wrap(value));
      ignore = false;
    }));
    return {
      signal,
      utils
    };
  }
  function normalizeIntegration(integration) {
    if (!integration) {
      return {
        signal: createSignal$1({
          value: ""
        })
      };
    } else if (Array.isArray(integration)) {
      return {
        signal: integration
      };
    }

    return integration;
  }
  function pathIntegration() {
    return createIntegration(() => ({
      value: window.location.pathname + window.location.search + window.location.hash,
      state: history.state
    }), ({
      value,
      replace,
      scroll,
      state
    }) => {
      if (replace) {
        window.history.replaceState(state, "", value);
      } else {
        window.history.pushState(state, "", value);
      }

      scrollToHash(window.location.hash.slice(1), scroll);
    }, notify => bindEvent(window, "popstate", () => notify()), {
      go: delta => window.history.go(delta)
    });
  }

  const hasSchemeRegex = /^(?:[a-z0-9]+:)?\/\//i;
  const trimPathRegex = /^\/+|\/+$/g;

  function normalize(path, omitSlash = false) {
    const s = path.replace(trimPathRegex, "");
    return s ? omitSlash || /^[?#]/.test(s) ? s : "/" + s : "";
  }

  function resolvePath(base, path, from) {
    if (hasSchemeRegex.test(path)) {
      return undefined;
    }

    const basePath = normalize(base);
    const fromPath = from && normalize(from);
    let result = "";

    if (!fromPath || path.startsWith("/")) {
      result = basePath;
    } else if (fromPath.toLowerCase().indexOf(basePath.toLowerCase()) !== 0) {
      result = basePath + fromPath;
    } else {
      result = fromPath;
    }

    return (result || "/") + normalize(path, !result);
  }
  function invariant(value, message) {
    if (value == null) {
      throw new Error(message);
    }

    return value;
  }
  function joinPaths(from, to) {
    return normalize(from).replace(/\/*(\*.*)?$/g, "") + normalize(to);
  }
  function extractSearchParams(url) {
    const params = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }
  function urlDecode(str, isQuery) {
    return decodeURIComponent(isQuery ? str.replace(/\+/g, " ") : str);
  }
  function createMatcher(path, partial) {
    const [pattern, splat] = path.split("/*", 2);
    const segments = pattern.split("/").filter(Boolean);
    const len = segments.length;
    return location => {
      const locSegments = location.split("/").filter(Boolean);
      const lenDiff = locSegments.length - len;

      if (lenDiff < 0 || lenDiff > 0 && splat === undefined && !partial) {
        return null;
      }

      const match = {
        path: len ? "" : "/",
        params: {}
      };

      for (let i = 0; i < len; i++) {
        const segment = segments[i];
        const locSegment = locSegments[i];

        if (segment[0] === ":") {
          match.params[segment.slice(1)] = locSegment;
        } else if (segment.localeCompare(locSegment, undefined, {
          sensitivity: "base"
        }) !== 0) {
          return null;
        }

        match.path += `/${locSegment}`;
      }

      if (splat) {
        match.params[splat] = lenDiff ? locSegments.slice(-lenDiff).join("/") : "";
      }

      return match;
    };
  }
  function scoreRoute(route) {
    const [pattern, splat] = route.pattern.split("/*", 2);
    const segments = pattern.split("/").filter(Boolean);
    return segments.reduce((score, segment) => score + (segment.startsWith(":") ? 2 : 3), segments.length - (splat === undefined ? 0 : 1));
  }
  function createMemoObject(fn) {
    const map = new Map();
    const owner = getOwner();
    return new Proxy({}, {
      get(_, property) {
        if (!map.has(property)) {
          runWithOwner(owner, () => map.set(property, createMemo$1(() => fn()[property])));
        }

        return map.get(property)();
      },

      getOwnPropertyDescriptor() {
        return {
          enumerable: true,
          configurable: true
        };
      },

      ownKeys() {
        return Reflect.ownKeys(fn());
      }

    });
  }
  function expandOptionals(pattern) {
    let match = /(\/?\:[^\/]+)\?/.exec(pattern);
    if (!match) return [pattern];
    let prefix = pattern.slice(0, match.index);
    let suffix = pattern.slice(match.index + match[0].length);
    const prefixes = [prefix, prefix += match[1]]; // This section handles adjacent optional params. We don't actually want all permuations since
    // that will lead to equivalent routes which have the same number of params. For example
    // `/:a?/:b?/:c`? only has the unique expansion: `/`, `/:a`, `/:a/:b`, `/:a/:b/:c` and we can
    // discard `/:b`, `/:c`, `/:b/:c` by building them up in order and not recursing. This also helps
    // ensure predictability where earlier params have precidence.

    while (match = /^(\/\:[^\/]+)\?/.exec(suffix)) {
      prefixes.push(prefix += match[1]);
      suffix = suffix.slice(match[0].length);
    }

    return expandOptionals(suffix).reduce((results, expansion) => [...results, ...prefixes.map(p => p + expansion)], []);
  }

  const MAX_REDIRECTS = 100;
  const RouterContextObj = createContext();
  const RouteContextObj = createContext();
  const useRouter = () => invariant(useContext(RouterContextObj), "Make sure your app is wrapped in a <Router />");
  let TempRoute;
  const useRoute = () => TempRoute || useContext(RouteContextObj) || useRouter().base;
  const useResolvedPath = path => {
    const route = useRoute();
    return createMemo$1(() => route.resolvePath(path()));
  };
  const useHref = to => {
    const router = useRouter();
    return createMemo$1(() => {
      const to_ = to();
      return to_ !== undefined ? router.renderPath(to_) : to_;
    });
  };
  const useLocation = () => useRouter().location;
  function createRoutes(routeDef, base = "", fallback) {
    const {
      component,
      data,
      children
    } = routeDef;
    const isLeaf = !children || Array.isArray(children) && !children.length;
    const shared = {
      key: routeDef,
      element: component ? () => createComponent$1(component, {}) : () => {
        const {
          element
        } = routeDef;
        return element === undefined && fallback ? createComponent$1(fallback, {}) : element;
      },
      preload: routeDef.component ? component.preload : routeDef.preload,
      data
    };
    return asArray(routeDef.path).reduce((acc, path) => {
      for (const originalPath of expandOptionals(path)) {
        const path = joinPaths(base, originalPath);
        const pattern = isLeaf ? path : path.split("/*", 1)[0];
        acc.push({ ...shared,
          originalPath,
          pattern,
          matcher: createMatcher(pattern, !isLeaf)
        });
      }

      return acc;
    }, []);
  }
  function createBranch(routes, index = 0) {
    return {
      routes,
      score: scoreRoute(routes[routes.length - 1]) * 10000 - index,

      matcher(location) {
        const matches = [];

        for (let i = routes.length - 1; i >= 0; i--) {
          const route = routes[i];
          const match = route.matcher(location);

          if (!match) {
            return null;
          }

          matches.unshift({ ...match,
            route
          });
        }

        return matches;
      }

    };
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  function createBranches(routeDef, base = "", fallback, stack = [], branches = []) {
    const routeDefs = asArray(routeDef);

    for (let i = 0, len = routeDefs.length; i < len; i++) {
      const def = routeDefs[i];

      if (def && typeof def === "object" && def.hasOwnProperty("path")) {
        const routes = createRoutes(def, base, fallback);

        for (const route of routes) {
          stack.push(route);

          if (def.children) {
            createBranches(def.children, route.pattern, fallback, stack, branches);
          } else {
            const branch = createBranch([...stack], branches.length);
            branches.push(branch);
          }

          stack.pop();
        }
      }
    } // Stack will be empty on final return


    return stack.length ? branches : branches.sort((a, b) => b.score - a.score);
  }
  function getRouteMatches(branches, location) {
    for (let i = 0, len = branches.length; i < len; i++) {
      const match = branches[i].matcher(location);

      if (match) {
        return match;
      }
    }

    return [];
  }
  function createLocation(path, state) {
    const origin = new URL("http://sar");
    const url = createMemo$1(prev => {
      const path_ = path();

      try {
        return new URL(path_, origin);
      } catch (err) {
        console.error(`Invalid path ${path_}`);
        return prev;
      }
    }, origin, {
      equals: (a, b) => a.href === b.href
    });
    const pathname = createMemo$1(() => urlDecode(url().pathname));
    const search = createMemo$1(() => urlDecode(url().search, true));
    const hash = createMemo$1(() => urlDecode(url().hash));
    const key = createMemo$1(() => "");
    return {
      get pathname() {
        return pathname();
      },

      get search() {
        return search();
      },

      get hash() {
        return hash();
      },

      get state() {
        return state();
      },

      get key() {
        return key();
      },

      query: createMemoObject(on(search, () => extractSearchParams(url())))
    };
  }
  function createRouterContext(integration, base = "", data, out) {
    const {
      signal: [source, setSource],
      utils = {}
    } = normalizeIntegration(integration);

    const parsePath = utils.parsePath || (p => p);

    const renderPath = utils.renderPath || (p => p);

    const basePath = resolvePath("", base);
    const output = undefined;

    if (basePath === undefined) {
      throw new Error(`${basePath} is not a valid base path`);
    } else if (basePath && !source().value) {
      setSource({
        value: basePath,
        replace: true,
        scroll: false
      });
    }

    const [isRouting, start] = useTransition();
    const [reference, setReference] = createSignal$1(source().value);
    const [state, setState] = createSignal$1(source().state);
    const location = createLocation(reference, state);
    const referrers = [];
    const baseRoute = {
      pattern: basePath,
      params: {},
      path: () => basePath,
      outlet: () => null,

      resolvePath(to) {
        return resolvePath(basePath, to);
      }

    };

    if (data) {
      try {
        TempRoute = baseRoute;
        baseRoute.data = data({
          data: undefined,
          params: {},
          location,
          navigate: navigatorFactory(baseRoute)
        });
      } finally {
        TempRoute = undefined;
      }
    }

    function navigateFromRoute(route, to, options) {
      // Untrack in case someone navigates in an effect - don't want to track `reference` or route paths
      untrack$1(() => {
        if (typeof to === "number") {
          if (!to) ; else if (utils.go) {
            utils.go(to);
          } else {
            console.warn("Router integration does not support relative routing");
          }

          return;
        }

        const {
          replace,
          resolve,
          scroll,
          state: nextState
        } = {
          replace: false,
          resolve: true,
          scroll: true,
          ...options
        };
        const resolvedTo = resolve ? route.resolvePath(to) : resolvePath("", to);

        if (resolvedTo === undefined) {
          throw new Error(`Path '${to}' is not a routable path`);
        } else if (referrers.length >= MAX_REDIRECTS) {
          throw new Error("Too many redirects");
        }

        const current = reference();

        if (resolvedTo !== current || nextState !== state()) {
          {
            const len = referrers.push({
              value: current,
              replace,
              scroll,
              state: state()
            });
            start(() => {
              setReference(resolvedTo);
              setState(nextState);
            }).then(() => {
              if (referrers.length === len) {
                navigateEnd({
                  value: resolvedTo,
                  state: nextState
                });
              }
            });
          }
        }
      });
    }

    function navigatorFactory(route) {
      // Workaround for vite issue (https://github.com/vitejs/vite/issues/3803)
      route = route || useContext(RouteContextObj) || baseRoute;
      return (to, options) => navigateFromRoute(route, to, options);
    }

    function navigateEnd(next) {
      const first = referrers[0];

      if (first) {
        if (next.value !== first.value || next.state !== first.state) {
          setSource({ ...next,
            replace: first.replace,
            scroll: first.scroll
          });
        }

        referrers.length = 0;
      }
    }

    createRenderEffect$1(() => {
      const {
        value,
        state
      } = source(); // Untrack this whole block so `start` doesn't cause Solid's Listener to be preserved

      untrack$1(() => {
        if (value !== reference()) {
          start(() => {
            setReference(value);
            setState(state);
          });
        }
      });
    });

    {
      function isSvg(el) {
        return el.namespaceURI === "http://www.w3.org/2000/svg";
      }

      function handleAnchorClick(evt) {
        if (evt.defaultPrevented || evt.button !== 0 || evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey) return;
        const a = evt.composedPath().find(el => el instanceof Node && el.nodeName.toUpperCase() === "A");
        if (!a) return;
        const svg = isSvg(a);
        const href = svg ? a.href.baseVal : a.href;
        const target = svg ? a.target.baseVal : a.target;
        if (target || !href && !a.hasAttribute("state")) return;
        const rel = (a.getAttribute("rel") || "").split(/\s+/);
        if (a.hasAttribute("download") || rel && rel.includes("external")) return;
        const url = svg ? new URL(href, document.baseURI) : new URL(href);
        const pathname = urlDecode(url.pathname);
        if (url.origin !== window.location.origin || basePath && pathname && !pathname.toLowerCase().startsWith(basePath.toLowerCase())) return;
        const to = parsePath(pathname + urlDecode(url.search, true) + urlDecode(url.hash));
        const state = a.getAttribute("state");
        evt.preventDefault();
        navigateFromRoute(baseRoute, to, {
          resolve: false,
          replace: a.hasAttribute("replace"),
          scroll: !a.hasAttribute("noscroll"),
          state: state && JSON.parse(state)
        });
      }

      document.addEventListener("click", handleAnchorClick);
      onCleanup$1(() => document.removeEventListener("click", handleAnchorClick));
    }

    return {
      base: baseRoute,
      out: output,
      location,
      isRouting,
      renderPath,
      parsePath,
      navigatorFactory
    };
  }
  function createRouteContext(router, parent, child, match) {
    const {
      base,
      location,
      navigatorFactory
    } = router;
    const {
      pattern,
      element: outlet,
      preload,
      data
    } = match().route;
    const path = createMemo$1(() => match().path);
    const params = createMemoObject(() => match().params);
    preload && preload();
    const route = {
      parent,
      pattern,

      get child() {
        return child();
      },

      path,
      params,
      data: parent.data,
      outlet,

      resolvePath(to) {
        return resolvePath(base.path(), to, path());
      }

    };

    if (data) {
      try {
        TempRoute = route;
        route.data = data({
          data: parent.data,
          params,
          location,
          navigate: navigatorFactory(route)
        });
      } finally {
        TempRoute = undefined;
      }
    }

    return route;
  }

  const _tmpl$$5 = /*#__PURE__*/template$1(`<a></a>`);
  const Router = props => {
    const {
      source,
      url,
      base,
      data,
      out
    } = props;
    const integration = source || (pathIntegration());
    const routerState = createRouterContext(integration, base, data);
    return createComponent$1(RouterContextObj.Provider, {
      value: routerState,

      get children() {
        return props.children;
      }

    });
  };
  const Routes = props => {
    const router = useRouter();
    const parentRoute = useRoute();
    const routeDefs = children(() => props.children);
    const branches = createMemo$1(() => createBranches(routeDefs(), joinPaths(parentRoute.pattern, props.base || ""), Outlet));
    const matches = createMemo$1(() => getRouteMatches(branches(), router.location.pathname));

    if (router.out) {
      router.out.matches.push(matches().map(({
        route,
        path,
        params
      }) => ({
        originalPath: route.originalPath,
        pattern: route.pattern,
        path,
        params
      })));
    }

    const disposers = [];
    let root;
    const routeStates = createMemo$1(on(matches, (nextMatches, prevMatches, prev) => {
      let equal = prevMatches && nextMatches.length === prevMatches.length;
      const next = [];

      for (let i = 0, len = nextMatches.length; i < len; i++) {
        const prevMatch = prevMatches && prevMatches[i];
        const nextMatch = nextMatches[i];

        if (prev && prevMatch && nextMatch.route.key === prevMatch.route.key) {
          next[i] = prev[i];
        } else {
          equal = false;

          if (disposers[i]) {
            disposers[i]();
          }

          createRoot$1(dispose => {
            disposers[i] = dispose;
            next[i] = createRouteContext(router, next[i - 1] || parentRoute, () => routeStates()[i + 1], () => matches()[i]);
          });
        }
      }

      disposers.splice(nextMatches.length).forEach(dispose => dispose());

      if (prev && equal) {
        return prev;
      }

      root = next[0];
      return next;
    }));
    return createComponent$1(Show$1, {
      get when() {
        return routeStates() && root;
      },

      children: route => createComponent$1(RouteContextObj.Provider, {
        value: route,

        get children() {
          return route.outlet();
        }

      })
    });
  };
  const Route = props => {
    const childRoutes = children(() => props.children);
    return mergeProps(props, {
      get children() {
        return childRoutes();
      }

    });
  };
  const Outlet = () => {
    const route = useRoute();
    return createComponent$1(Show$1, {
      get when() {
        return route.child;
      },

      children: child => createComponent$1(RouteContextObj.Provider, {
        value: child,

        get children() {
          return child.outlet();
        }

      })
    });
  };

  function LinkBase(props) {
    const [, rest] = splitProps(props, ["children", "to", "href", "state"]);
    const href = useHref(() => props.to);
    return (() => {
      const _el$ = _tmpl$$5.cloneNode(true);

      spread(_el$, rest, false, true);

      insert$1(_el$, () => props.children);

      createRenderEffect$1(_p$ => {
        const _v$ = href() || props.href,
              _v$2 = JSON.stringify(props.state);

        _v$ !== _p$._v$ && setAttribute$1(_el$, "href", _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && setAttribute$1(_el$, "state", _p$._v$2 = _v$2);
        return _p$;
      }, {
        _v$: undefined,
        _v$2: undefined
      });

      return _el$;
    })();
  }

  function Link(props) {
    const to = useResolvedPath(() => props.href);
    return createComponent$1(LinkBase, mergeProps(props, {
      get to() {
        return to();
      }

    }));
  }
  function NavLink(props) {
    props = mergeProps({
      inactiveClass: "inactive",
      activeClass: "active"
    }, props);
    const [, rest] = splitProps(props, ["activeClass", "inactiveClass", "end"]);
    const location = useLocation();
    const to = useResolvedPath(() => props.href);
    const isActive = createMemo$1(() => {
      const to_ = to();

      if (to_ === undefined) {
        return false;
      }

      const path = to_.split(/[?#]/, 1)[0].toLowerCase();
      const loc = location.pathname.toLowerCase();
      return props.end ? path === loc : loc.startsWith(path);
    });
    return createComponent$1(LinkBase, mergeProps(rest, {
      get to() {
        return to();
      },

      get classList() {
        return {
          [props.inactiveClass]: !isActive(),
          [props.activeClass]: isActive(),
          ...rest.classList
        };
      },

      get ["aria-current"]() {
        return isActive() ? "page" : undefined;
      }

    }));
  }

  const Home = props => {
    return "Home";
  };

  const sharedConfig = {};

  const equalFn = (a, b) => a === b;
  const $TRACK = Symbol("solid-track");
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
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    updateComputation(c);
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
  function onCleanup(fn) {
    if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
    return fn;
  }
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

  const FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++) d[i]();
  }
  function mapArray(list, mapFn, options = {}) {
    let items = [],
        mapped = [],
        disposers = [],
        len = 0,
        indexes = mapFn.length > 1 ? [] : null;
    onCleanup(() => dispose(disposers));
    return () => {
      let newItems = list() || [],
          i,
          j;
      newItems[$TRACK];
      return untrack(() => {
        let newLen = newItems.length,
            newIndices,
            newIndicesNext,
            temp,
            tempdisposers,
            tempIndexes,
            start,
            end,
            newEnd,
            item;
        if (newLen === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            indexes && (indexes = []);
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot(disposer => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        }
        else if (len === 0) {
          mapped = new Array(newLen);
          for (j = 0; j < newLen; j++) {
            items[j] = newItems[j];
            mapped[j] = createRoot(mapper);
          }
          len = newLen;
        } else {
          temp = new Array(newLen);
          tempdisposers = new Array(newLen);
          indexes && (tempIndexes = new Array(newLen));
          for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++);
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
            temp[newEnd] = mapped[end];
            tempdisposers[newEnd] = disposers[end];
            indexes && (tempIndexes[newEnd] = indexes[end]);
          }
          newIndices = new Map();
          newIndicesNext = new Array(newEnd + 1);
          for (j = newEnd; j >= start; j--) {
            item = newItems[j];
            i = newIndices.get(item);
            newIndicesNext[j] = i === undefined ? -1 : i;
            newIndices.set(item, j);
          }
          for (i = start; i <= end; i++) {
            item = items[i];
            j = newIndices.get(item);
            if (j !== undefined && j !== -1) {
              temp[j] = mapped[i];
              tempdisposers[j] = disposers[i];
              indexes && (tempIndexes[j] = indexes[i]);
              j = newIndicesNext[j];
              newIndices.set(item, j);
            } else disposers[i]();
          }
          for (j = start; j < newLen; j++) {
            if (j in temp) {
              mapped[j] = temp[j];
              disposers[j] = tempdisposers[j];
              if (indexes) {
                indexes[j] = tempIndexes[j];
                indexes[j](j);
              }
            } else mapped[j] = createRoot(mapper);
          }
          mapped = mapped.slice(0, len = newLen);
          items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        if (indexes) {
          const [s, set] = createSignal(j);
          indexes[j] = set;
          return mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  function createComponent(Comp, props) {
    return untrack(() => Comp(props || {}));
  }

  function For(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(mapArray(() => props.each, props.children, fallback ? fallback : undefined));
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
  function setAttribute(node, name, value) {
    if (value == null) node.removeAttribute(name);else node.setAttribute(name, value);
  }
  function className(node, value) {
    if (value == null) node.removeAttribute("class");else node.className = value;
  }
  function style(node, value, prev = {}) {
    const nodeStyle = node.style;
    const prevString = typeof prev === "string";
    if (value == null && prevString || typeof value === "string") return nodeStyle.cssText = value;
    prevString && (nodeStyle.cssText = undefined, prev = {});
    value || (value = {});
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
      }
    }
    return prev;
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== undefined && !initial) initial = [];
    if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
    createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
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

  class Vec2$1 {
    static from_angle = n => new Vec2$1(Math.cos(n), Math.sin(n));
    static make = (x, y) => new Vec2$1(x, y);

    static get unit() {
      return new Vec2$1(1, 1);
    }

    static get zero() {
      return new Vec2$1(0, 0);
    }

    get vs() {
      return [this.x, this.y];
    }

    get mul_inverse() {
      return new Vec2$1(1 / this.x, 1 / this.y);
    }

    get inverse() {
      return new Vec2$1(-this.x, -this.y);
    }

    get half() {
      return new Vec2$1(this.x / 2, this.y / 2);
    }

    get length_squared() {
      return this.x * this.x + this.y * this.y;
    }

    get length() {
      return Math.sqrt(this.length_squared);
    }

    get normalize() {
      if (this.length === 0) {
        return Vec2$1.zero;
      }

      return this.scale(1 / this.length);
    }

    get perpendicular() {
      return new Vec2$1(-this.y, this.x);
    }

    equals(v) {
      return this.x === v.x && this.y === v.y;
    }

    get clone() {
      return new Vec2$1(this.x, this.y);
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
      return Vec2$1.make(dp * v.x / lsq, dp * v.y / lsq);
    }

    distance(v) {
      return this.sub(v).length;
    }

    addy(n) {
      return Vec2$1.make(this.x, this.y + n);
    }

    add_angle(n) {
      return Vec2$1.from_angle(this.angle + n);
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

  function owrite$1(signal, fn) {
    if (typeof fn === 'function') {
      return signal[1](fn);
    } else {
      signal[1](_ => fn);
    }
  }
  function read$1(signal) {
    if (Array.isArray(signal)) {
      return signal[0]();
    } else {
      return signal();
    }
  }

  function make_ref$1() {
    let _$ref = createSignal();

    let _$clear_bounds = createSignal(undefined, {
      equals: false
    });

    let _top = createMemo(() => {
      read$1(_$clear_bounds);
      return read$1(_$ref)?.scrollTop;
    });

    createMemo(() => {
      let top = read$1(_top);

      if (top !== undefined) {
        return Vec2$1.make(0, top);
      }
    });
    let m_rect = createMemo(() => {
      read$1(_$clear_bounds);
      return read$1(_$ref)?.getBoundingClientRect();
    });
    let m_orig = createMemo(() => {
      let rect = m_rect();

      if (rect) {
        return Vec2$1.make(rect.x, rect.y);
      }
    });
    let m_size = createMemo(() => {
      let rect = m_rect();

      if (rect) {
        return Vec2$1.make(rect.width, rect.height);
      }
    });
    return {
      $clear_bounds() {
        owrite$1(_$clear_bounds);
      },

      get $ref() {
        return read$1(_$ref);
      },

      set $ref($ref) {
        owrite$1(_$ref, $ref);
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

  class Staff {
    onScroll() {
      this.ref.$clear_bounds();
    }

    get style() {
      return this.m_style();
    }

    set bras(bras) {
      this.sheet.bras = bras;
    }

    get ties() {
      return this.sheet.ties;
    }

    get beams() {
      return this.sheet.beams;
    }

    get stems() {
      return this.sheet.stems;
    }

    get bars() {
      return this.sheet.bars;
    }

    get bras() {
      return this.sheet.bras;
    }

    get ledgers() {
      return this.sheet.ledgers;
    }

    constructor() {
      this.ref = make_ref$1();
      this.m_style = createMemo(() => ({
        'font-size': `${(this.ref.size?.y || 0) / 4}px`
      }));
      this.sheet = make_sheet(this);
      this.playback = make_playback$2();
    }

  }

  const make_playback$2 = solsido => {
    let _show = createSignal(false);

    let _x = createSignal(1);

    let _w = createSignal(1);

    let _i = createSignal(100);

    let m_style = createMemo(() => ({
      transform: `translate(${read$1(_x)}em, 0)`,
      width: `${read$1(_w)}em`
    }));
    let m_line_style = createMemo(() => ({
      transform: `translate(${read$1(_w) * 0.01 * read$1(_i)}em, 0)`
    }));
    return {
      get show() {
        if (read$1(_show)) {
          return this;
        }
      },

      get line_style() {
        return m_line_style();
      },

      get style() {
        return m_style();
      },

      set_play(v) {
        owrite$1(_show, v);
      },

      set xwi(xwi) {
        let [x, w, i] = xwi.split(',');
        owrite$1(_x, x);
        owrite$1(_w, w);
        owrite$1(_i, i);
      }

    };
  };

  const make_tie = (staff, tie) => {
    let [klass, o_pos] = tie.split('@');
    let [x, y, x2] = o_pos.split(',');
    x2 -= x;
    x2 *= 100;
    x2 = 20;
    const m_style = createMemo(() => ({
      transform: `translate(${x}em, ${y}em)`
    }));
    return {
      x2,
      klass,

      get style() {
        return m_style();
      }

    };
  };

  const make_beam = (staff, beam) => {
    let [_, o_pos] = beam.split('@');
    let [x, y, y2] = o_pos.split(',');
    y2 -= y;
    const m_style = createMemo(() => ({
      transform: `translate(${x}em, ${y}em)`
    }));
    return {
      get y2() {
        return y2 * 100;
      },

      get style() {
        return m_style();
      }

    };
  };

  const make_stem = (staff, stem) => {
    let [_, o_pos] = stem.split('@');
    let [x, y, h] = o_pos.split(',');
    const m_style = createMemo(() => ({
      transform: `translate(${x}em, ${y}em)`,
      height: `${h}em`
    }));
    return {
      set xwi(xwi) {
        let [x, w, i] = xwi.split(',');
        owrite$1(_x, x);
        owrite$1(_w, w);
        owrite$1(_i, i);
      },

      get style() {
        return m_style();
      }

    };
  };

  const make_bar = (staff, bar) => {
    let [_, o_pos] = bar.split('@');
    let [x] = o_pos.split(',');
    const m_style = createMemo(() => ({
      transform: `translate(${x}em, 0)`
    }));
    return {
      get style() {
        return m_style();
      }

    };
  };

  const make_ledger = (staff, ledger) => {
    let [_, o_pos] = ledger.split('@');
    let [x, y] = o_pos.split(',');
    const m_style = createMemo(() => ({
      transform: `translate(${x}em, ${y}em)`
    }));
    return {
      get style() {
        return m_style();
      }

    };
  };

  const make_bra = (staff, bra) => {
    let [glyph_klass, o_pos] = bra.split('@');
    let [x, y] = o_pos.split(',');
    let [glyph, ...klass] = glyph_klass.split(',');
    const m_style = createMemo(() => ({
      transform: `translate(${x}em, ${y}em)`
    }));
    return {
      get klass() {
        return klass.join(' ');
      },

      get glyph() {
        return glyph;
      },

      get style() {
        return m_style();
      }

    };
  };

  const make_sheet = staff => {
    let _bras = createSignal([]);

    let m_bras = createMemo(mapArray(_bras[0], _ => make_bra(staff, _)));

    let _ledgers = createSignal([]);

    let m_ledgers = createMemo(mapArray(_ledgers[0], _ => make_ledger(staff, _)));

    let _bars = createSignal([]);

    let m_bars = createMemo(mapArray(_bars[0], _ => make_bar(staff, _)));

    let _stems = createSignal([]);

    let m_stems = createMemo(mapArray(_stems[0], _ => make_stem(staff, _)));

    let _beams = createSignal([]);

    let m_beams = createMemo(mapArray(_beams[0], _ => make_beam(staff, _)));

    let _ties = createSignal([]);

    let m_ties = createMemo(mapArray(_ties[0], _ => make_tie(staff, _)));
    return {
      set ties(ties) {
        owrite$1(_ties, ties);
      },

      get ties() {
        return m_ties();
      },

      set beams(beams) {
        owrite$1(_beams, beams);
      },

      get beams() {
        return m_beams();
      },

      set stems(stems) {
        owrite$1(_stems, stems);
      },

      get stems() {
        return m_stems();
      },

      set bars(bars) {
        owrite$1(_bars, bars);
      },

      get bars() {
        return m_bars();
      },

      get ledgers() {
        return m_ledgers();
      },

      set ledgers(ledgers) {
        owrite$1(_ledgers, ledgers);
      },

      get bras() {
        return m_bras();
      },

      set bras(bras) {
        owrite$1(_bras, bras);
      }

    };
  };

  const gclef$1 = '';
  const bclef$1 = '';
  const double_note$1 = '';
  const whole_note$1 = '';
  const half_note$1 = '';
  const quarter_note$1 = '';
  const brace$1 = '';
  const flat_accidental$1 = '';
  const natural_accidental$1 = '';
  const sharp_accidental$1 = '';
  const dsharp_accidental$1 = '';
  const dflat_accidental$1 = '';
  const eighth_flag_up$1 = '';
  const sixteenth_flag_up$1 = '';
  const thirtysecond_flag_up$1 = '';
  const sixtyfourth_flag_up$1 = '';
  const eighth_flag_down$1 = '';
  const sixteenth_flag_down$1 = '';
  const thirtysecond_flag_down$1 = '';
  const sixtyfourth_flag_down$1 = '';
  const double_rest$1 = '';
  const whole_rest$1 = '';
  const half_rest$1 = '';
  const quarter_rest$1 = '';
  const eighth_rest$1 = '';
  const sixteenth_rest$1 = '';
  const thirtysecond_rest$1 = '';
  const sixtyfourth_rest$1 = '';
  const onetwentyeighth_rest$1 = '';
  const zero_time$1 = '';
  const one_time$1 = '';
  const two_time$1 = '';
  const three_time$1 = '';
  const four_time$1 = '';
  const five_time$1 = '';
  const six_time$1 = '';
  const seven_time$1 = '';
  const eight_time$1 = '';
  const nine_time$1 = '';
  const ten_time$1 = one_time$1 + zero_time$1;
  const twelve_time$1 = one_time$1 + two_time$1;
  const common_time$1 = '';
  const cut_time$1 = '';
  const quarter_text$1 = '';
  const barline_single$1 = '';
  const barline_double$1 = '';
  const barline_final$1 = '';
  var g$1 = {
    barline_single: barline_single$1,
    barline_double: barline_double$1,
    barline_final: barline_final$1,
    quarter_text: quarter_text$1,
    gclef: gclef$1,
    bclef: bclef$1,
    double_note: double_note$1,
    whole_note: whole_note$1,
    half_note: half_note$1,
    quarter_note: quarter_note$1,
    flat_accidental: flat_accidental$1,
    natural_accidental: natural_accidental$1,
    sharp_accidental: sharp_accidental$1,
    dflat_accidental: dflat_accidental$1,
    dsharp_accidental: dsharp_accidental$1,
    eighth_flag_up: eighth_flag_up$1,
    sixteenth_flag_up: sixteenth_flag_up$1,
    thirtysecond_flag_up: thirtysecond_flag_up$1,
    sixtyfourth_flag_up: sixtyfourth_flag_up$1,
    eighth_flag_down: eighth_flag_down$1,
    sixteenth_flag_down: sixteenth_flag_down$1,
    thirtysecond_flag_down: thirtysecond_flag_down$1,
    sixtyfourth_flag_down: sixtyfourth_flag_down$1,
    brace: brace$1,
    double_rest: double_rest$1,
    whole_rest: whole_rest$1,
    half_rest: half_rest$1,
    quarter_rest: quarter_rest$1,
    eighth_rest: eighth_rest$1,
    sixteenth_rest: sixteenth_rest$1,
    thirtysecond_rest: thirtysecond_rest$1,
    sixtyfourth_rest: sixtyfourth_rest$1,
    onetwentyeighth_rest: onetwentyeighth_rest$1,
    zero_time: zero_time$1,
    one_time: one_time$1,
    two_time: two_time$1,
    three_time: three_time$1,
    four_time: four_time$1,
    five_time: five_time$1,
    six_time: six_time$1,
    seven_time: seven_time$1,
    eight_time: eight_time$1,
    nine_time: nine_time$1,
    ten_time: ten_time$1,
    twelve_time: twelve_time$1,
    common_time: common_time$1,
    cut_time: cut_time$1
  };

  const _tmpl$$4 = /*#__PURE__*/template(`<vstaff><staff><lines> <line></line> <line></line> <line></line> <line></line> <line></line> </lines><ledgers></ledgers><bravura></bravura></staff></vstaff>`),
        _tmpl$2$2 = /*#__PURE__*/template(`<div class="playback"><span class="cursor"><span class="line"></span></span></div>`),
        _tmpl$3$2 = /*#__PURE__*/template(`<ledger></ledger>`),
        _tmpl$4$2 = /*#__PURE__*/template(`<bar></bar>`),
        _tmpl$5$2 = /*#__PURE__*/template(`<stem></stem>`),
        _tmpl$6$2 = /*#__PURE__*/template(`<bra></bra>`),
        _tmpl$7$2 = /*#__PURE__*/template(`<tie><svg width="1em" height="1em" viewBox="0 0 100 100"><path></path></svg></tie>`),
        _tmpl$8$2 = /*#__PURE__*/template(`<beam><svg width="1em" height="1em" viewBox="0 0 100 100"><path></path></svg></beam>`);

  function unbindable$1(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback, options);
  }

  const App$1 = staff => props => {
    let unbinds = [];
    unbinds.push(unbindable$1(document, 'scroll', () => staff.onScroll(), {
      capture: true,
      passive: true
    }));
    unbinds.push(unbindable$1(window, 'resize', () => staff.onScroll(), {
      passive: true
    }));
    onCleanup(() => unbinds.forEach(_ => _()));
    return (() => {
      const _el$ = _tmpl$$4.cloneNode(true),
            _el$2 = _el$.firstChild,
            _el$3 = _el$2.firstChild,
            _el$4 = _el$3.nextSibling,
            _el$5 = _el$4.nextSibling;

      (_ => setTimeout(() => staff.ref.$ref = _))(_el$);

      insert(_el$2, createComponent(Show, {
        get when() {
          return staff.playback.show;
        },

        children: cursor => (() => {
          const _el$6 = _tmpl$2$2.cloneNode(true),
                _el$7 = _el$6.firstChild,
                _el$8 = _el$7.firstChild;

          createRenderEffect(_p$ => {
            const _v$ = cursor.style,
                  _v$2 = cursor.line_style;
            _p$._v$ = style(_el$7, _v$, _p$._v$);
            _p$._v$2 = style(_el$8, _v$2, _p$._v$2);
            return _p$;
          }, {
            _v$: undefined,
            _v$2: undefined
          });

          return _el$6;
        })()
      }), _el$3);

      insert(_el$4, createComponent(For, {
        get each() {
          return staff.ledgers;
        },

        children: ledger => (() => {
          const _el$9 = _tmpl$3$2.cloneNode(true);

          createRenderEffect(_$p => style(_el$9, ledger.style, _$p));

          return _el$9;
        })()
      }), null);

      insert(_el$4, createComponent(For, {
        get each() {
          return staff.bars;
        },

        children: bar => (() => {
          const _el$10 = _tmpl$4$2.cloneNode(true);

          createRenderEffect(_$p => style(_el$10, bar.style, _$p));

          return _el$10;
        })()
      }), null);

      insert(_el$4, createComponent(For, {
        get each() {
          return staff.stems;
        },

        children: stem => (() => {
          const _el$11 = _tmpl$5$2.cloneNode(true);

          createRenderEffect(_$p => style(_el$11, stem.style, _$p));

          return _el$11;
        })()
      }), null);

      insert(_el$4, createComponent(For, {
        get each() {
          return staff.beams;
        },

        children: beam => createComponent(Beam, {
          get style() {
            return beam.style;
          },

          get y2() {
            return beam.y2;
          }

        })
      }), null);

      insert(_el$4, createComponent(For, {
        get each() {
          return staff.ties;
        },

        children: tie => createComponent(Tie, {
          get klass() {
            return tie.klass;
          },

          get style() {
            return tie.style;
          },

          get x2() {
            return tie.x2;
          }

        })
      }), null);

      insert(_el$5, createComponent(For, {
        get each() {
          return staff.bras;
        },

        children: bra => (() => {
          const _el$12 = _tmpl$6$2.cloneNode(true);

          insert(_el$12, () => g$1[bra.glyph]);

          createRenderEffect(_p$ => {
            const _v$3 = bra.klass,
                  _v$4 = bra.style;
            _v$3 !== _p$._v$3 && className(_el$12, _p$._v$3 = _v$3);
            _p$._v$4 = style(_el$12, _v$4, _p$._v$4);
            return _p$;
          }, {
            _v$3: undefined,
            _v$4: undefined
          });

          return _el$12;
        })()
      }));

      createRenderEffect(_$p => style(_el$, staff.style, _$p));

      return _el$;
    })();
  };

  function tie_path(x) {
    return `M 0 ${x * 0.5} c ${x} -${x * 0.5}    ${x * 4} -${x * 0.5}    ${x * 5} 0
    -${x} -${x * 0.5 - 4} -${x * 4} -${x * 0.5 - 4} -${x * 5} 0`;
  }

  function beam_path(x2, y2) {
    let x = 0;
    let y = 0;
    let k = 10;
    return `M${x},${y + k}L${x},${y}L${x2},${y2}L${x2},${y2 + k}L${x},${y + k}`;
  }

  const Tie = props => {
    return (() => {
      const _el$13 = _tmpl$7$2.cloneNode(true),
            _el$14 = _el$13.firstChild,
            _el$15 = _el$14.firstChild;

      createRenderEffect(_p$ => {
        const _v$5 = props.klass,
              _v$6 = props.style,
              _v$7 = tie_path(props.x2);

        _v$5 !== _p$._v$5 && className(_el$13, _p$._v$5 = _v$5);
        _p$._v$6 = style(_el$13, _v$6, _p$._v$6);
        _v$7 !== _p$._v$7 && setAttribute(_el$15, "d", _p$._v$7 = _v$7);
        return _p$;
      }, {
        _v$5: undefined,
        _v$6: undefined,
        _v$7: undefined
      });

      return _el$13;
    })();
  };

  const Beam = props => {
    props.y2;
    return (() => {
      const _el$16 = _tmpl$8$2.cloneNode(true),
            _el$17 = _el$16.firstChild,
            _el$18 = _el$17.firstChild;

      createRenderEffect(_p$ => {
        const _v$8 = props.style,
              _v$9 = beam_path(100, props.y2);

        _p$._v$8 = style(_el$16, _v$8, _p$._v$8);
        _v$9 !== _p$._v$9 && setAttribute(_el$18, "d", _p$._v$9 = _v$9);
        return _p$;
      }, {
        _v$8: undefined,
        _v$9: undefined
      });

      return _el$16;
    })();
  };

  function VStaff(element, options = {}) {
    let staff = new Staff(element);
    render(App$1(staff), element);
    return {
      sheet: staff.sheet,

      set bras(bras) {
        staff.bras = bras;
      },

      set xwi(xwi) {
        staff.playback.xwi = xwi;
      },

      set playback(v) {
        staff.playback.set_play(v);
      }

    };
  }

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
  function write(signal, fn) {
    return signal[1](_ => {
      fn(_);
      return _;
    });
  }
  function read(signal) {
    if (Array.isArray(signal)) {
      return signal[0]();
    } else {
      return signal();
    }
  }

  class HasAudioAnalyser {
    _set_data(data) {
      this.data = data;
      return this;
    }

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
    s,
    r
  }, min) {
    param.cancelAndHoldAtTime(now);
    /* https://stackoverflow.com/questions/73175007/crack-sounds-if-i-dont-release-immediately-like-wait-for-a-settimeout/73207368#73207368 */

    param.setValueAtTime(s, now);
    param.linearRampToValueAtTime(min, now + (r || 0));
  }

  function load_audio(src) {
    return fetch(src).then(_ => _.arrayBuffer());
  }

  function decode_audio(context, buffer) {
    return context.decodeAudioData(buffer);
  }

  class SamplesPlayer {
    constructor(context) {
      this.context = context;
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

  /**
   * Fill a string with a repeated character
   *
   * @param character
   * @param repetition
   */
  const fillStr = (s, n) => Array(Math.abs(n) + 1).join(s);

  function isNamed(src) {
      return src !== null && typeof src === "object" && typeof src.name === "string"
          ? true
          : false;
  }

  function isPitch(pitch) {
      return pitch !== null &&
          typeof pitch === "object" &&
          typeof pitch.step === "number" &&
          typeof pitch.alt === "number"
          ? true
          : false;
  }
  // The number of fifths of [C, D, E, F, G, A, B]
  const FIFTHS = [0, 2, 4, -1, 1, 3, 5];
  // The number of octaves it span each step
  const STEPS_TO_OCTS = FIFTHS.map((fifths) => Math.floor((fifths * 7) / 12));
  function encode(pitch) {
      const { step, alt, oct, dir = 1 } = pitch;
      const f = FIFTHS[step] + 7 * alt;
      if (oct === undefined) {
          return [dir * f];
      }
      const o = oct - STEPS_TO_OCTS[step] - 4 * alt;
      return [dir * f, dir * o];
  }
  // We need to get the steps from fifths
  // Fifths for CDEFGAB are [ 0, 2, 4, -1, 1, 3, 5 ]
  // We add 1 to fifths to avoid negative numbers, so:
  // for ["F", "C", "G", "D", "A", "E", "B"] we have:
  const FIFTHS_TO_STEPS = [3, 0, 4, 1, 5, 2, 6];
  function decode(coord) {
      const [f, o, dir] = coord;
      const step = FIFTHS_TO_STEPS[unaltered(f)];
      const alt = Math.floor((f + 1) / 7);
      if (o === undefined) {
          return { step, alt, dir };
      }
      const oct = o + 4 * alt + STEPS_TO_OCTS[step];
      return { step, alt, oct, dir };
  }
  // Return the number of fifths as if it were unaltered
  function unaltered(f) {
      const i = (f + 1) % 7;
      return i < 0 ? 7 + i : i;
  }

  const NoNote = { empty: true, name: "", pc: "", acc: "" };
  const cache$1$1 = new Map();
  const stepToLetter = (step) => "CDEFGAB".charAt(step);
  const altToAcc = (alt) => alt < 0 ? fillStr("b", -alt) : fillStr("#", alt);
  const accToAlt = (acc) => acc[0] === "b" ? -acc.length : acc.length;
  /**
   * Given a note literal (a note name or a note object), returns the Note object
   * @example
   * note('Bb4') // => { name: "Bb4", midi: 70, chroma: 10, ... }
   */
  function note(src) {
      const cached = cache$1$1.get(src);
      if (cached) {
          return cached;
      }
      const value = typeof src === "string"
          ? parse$1(src)
          : isPitch(src)
              ? note(pitchName$1(src))
              : isNamed(src)
                  ? note(src.name)
                  : NoNote;
      cache$1$1.set(src, value);
      return value;
  }
  const REGEX$1$1 = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
  /**
   * @private
   */
  function tokenizeNote(str) {
      const m = REGEX$1$1.exec(str);
      return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
  }
  /**
   * @private
   */
  function coordToNote(noteCoord) {
      return note(decode(noteCoord));
  }
  const mod = (n, m) => ((n % m) + m) % m;
  const SEMI = [0, 2, 4, 5, 7, 9, 11];
  function parse$1(noteName) {
      const tokens = tokenizeNote(noteName);
      if (tokens[0] === "" || tokens[3] !== "") {
          return NoNote;
      }
      const letter = tokens[0];
      const acc = tokens[1];
      const octStr = tokens[2];
      const step = (letter.charCodeAt(0) + 3) % 7;
      const alt = accToAlt(acc);
      const oct = octStr.length ? +octStr : undefined;
      const coord = encode({ step, alt, oct });
      const name = letter + acc + octStr;
      const pc = letter + acc;
      const chroma = (SEMI[step] + alt + 120) % 12;
      const height = oct === undefined
          ? mod(SEMI[step] + alt, 12) - 12 * 99
          : SEMI[step] + alt + 12 * (oct + 1);
      const midi = height >= 0 && height <= 127 ? height : null;
      const freq = oct === undefined ? null : Math.pow(2, (height - 69) / 12) * 440;
      return {
          empty: false,
          acc,
          alt,
          chroma,
          coord,
          freq,
          height,
          letter,
          midi,
          name,
          oct,
          pc,
          step,
      };
  }
  function pitchName$1(props) {
      const { step, alt, oct } = props;
      const letter = stepToLetter(step);
      if (!letter) {
          return "";
      }
      const pc = letter + altToAcc(alt);
      return oct || oct === 0 ? pc + oct : pc;
  }

  const NoInterval = { empty: true, name: "", acc: "" };
  // shorthand tonal notation (with quality after number)
  const INTERVAL_TONAL_REGEX = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
  // standard shorthand notation (with quality before number)
  const INTERVAL_SHORTHAND_REGEX = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
  const REGEX$2 = new RegExp("^" + INTERVAL_TONAL_REGEX + "|" + INTERVAL_SHORTHAND_REGEX + "$");
  /**
   * @private
   */
  function tokenizeInterval(str) {
      const m = REGEX$2.exec(`${str}`);
      if (m === null) {
          return ["", ""];
      }
      return m[1] ? [m[1], m[2]] : [m[4], m[3]];
  }
  const cache$2 = {};
  /**
   * Get interval properties. It returns an object with:
   *
   * - name: the interval name
   * - num: the interval number
   * - type: 'perfectable' or 'majorable'
   * - q: the interval quality (d, m, M, A)
   * - dir: interval direction (1 ascending, -1 descending)
   * - simple: the simplified number
   * - semitones: the size in semitones
   * - chroma: the interval chroma
   *
   * @param {string} interval - the interval name
   * @return {Object} the interval properties
   *
   * @example
   * import { interval } from '@tonaljs/core'
   * interval('P5').semitones // => 7
   * interval('m3').type // => 'majorable'
   */
  function interval(src) {
      return typeof src === "string"
          ? cache$2[src] || (cache$2[src] = parse$2(src))
          : isPitch(src)
              ? interval(pitchName(src))
              : isNamed(src)
                  ? interval(src.name)
                  : NoInterval;
  }
  const SIZES = [0, 2, 4, 5, 7, 9, 11];
  const TYPES = "PMMPPMM";
  function parse$2(str) {
      const tokens = tokenizeInterval(str);
      if (tokens[0] === "") {
          return NoInterval;
      }
      const num = +tokens[0];
      const q = tokens[1];
      const step = (Math.abs(num) - 1) % 7;
      const t = TYPES[step];
      if (t === "M" && q === "P") {
          return NoInterval;
      }
      const type = t === "M" ? "majorable" : "perfectable";
      const name = "" + num + q;
      const dir = num < 0 ? -1 : 1;
      const simple = num === 8 || num === -8 ? num : dir * (step + 1);
      const alt = qToAlt(type, q);
      const oct = Math.floor((Math.abs(num) - 1) / 7);
      const semitones = dir * (SIZES[step] + alt + 12 * oct);
      const chroma = (((dir * (SIZES[step] + alt)) % 12) + 12) % 12;
      const coord = encode({ step, alt, oct, dir });
      return {
          empty: false,
          name,
          num,
          q,
          step,
          alt,
          dir,
          type,
          simple,
          semitones,
          chroma,
          coord,
          oct,
      };
  }
  function qToAlt(type, q) {
      return (q === "M" && type === "majorable") ||
          (q === "P" && type === "perfectable")
          ? 0
          : q === "m" && type === "majorable"
              ? -1
              : /^A+$/.test(q)
                  ? q.length
                  : /^d+$/.test(q)
                      ? -1 * (type === "perfectable" ? q.length : q.length + 1)
                      : 0;
  }
  // return the interval name of a pitch
  function pitchName(props) {
      const { step, alt, oct = 0, dir } = props;
      if (!dir) {
          return "";
      }
      const calcNum = step + 1 + 7 * oct;
      // this is an edge case: descending pitch class unison (see #243)
      const num = calcNum === 0 ? step + 1 : calcNum;
      const d = dir < 0 ? "-" : "";
      const type = TYPES[step] === "M" ? "majorable" : "perfectable";
      const name = d + num + altToQ(type, alt);
      return name;
  }
  function altToQ(type, alt) {
      if (alt === 0) {
          return type === "majorable" ? "M" : "P";
      }
      else if (alt === -1 && type === "majorable") {
          return "m";
      }
      else if (alt > 0) {
          return fillStr("A", alt);
      }
      else {
          return fillStr("d", type === "perfectable" ? alt : alt + 1);
      }
  }

  /**
   * Transpose a note by an interval.
   *
   * @param {string} note - the note or note name
   * @param {string} interval - the interval or interval name
   * @return {string} the transposed note name or empty string if not valid notes
   * @example
   * import { tranpose } from "@tonaljs/core"
   * transpose("d3", "3M") // => "F#3"
   * transpose("D", "3M") // => "F#"
   * ["C", "D", "E", "F", "G"].map(pc => transpose(pc, "M3)) // => ["E", "F#", "G#", "A", "B"]
   */
  function transpose$1(noteName, intervalName) {
      const note$1 = note(noteName);
      const interval$1 = interval(intervalName);
      if (note$1.empty || interval$1.empty) {
          return "";
      }
      const noteCoord = note$1.coord;
      const intervalCoord = interval$1.coord;
      const tr = noteCoord.length === 1
          ? [noteCoord[0] + intervalCoord[0]]
          : [noteCoord[0] + intervalCoord[0], noteCoord[1] + intervalCoord[1]];
      return coordToNote(tr).name;
  }

  // ascending range
  function ascR(b, n) {
      const a = [];
      // tslint:disable-next-line:curly
      for (; n--; a[n] = n + b)
          ;
      return a;
  }
  // descending range
  function descR(b, n) {
      const a = [];
      // tslint:disable-next-line:curly
      for (; n--; a[n] = b - n)
          ;
      return a;
  }
  /**
   * Creates a numeric range
   *
   * @param {number} from
   * @param {number} to
   * @return {Array<number>}
   *
   * @example
   * range(-2, 2) // => [-2, -1, 0, 1, 2]
   * range(2, -2) // => [2, 1, 0, -1, -2]
   */
  function range(from, to) {
      return from < to ? ascR(from, to - from + 1) : descR(from, from - to + 1);
  }
  /**
   * Rotates a list a number of times. It"s completly agnostic about the
   * contents of the list.
   *
   * @param {Integer} times - the number of rotations
   * @param {Array} collection
   * @return {Array} the rotated collection
   *
   * @example
   * rotate(1, [1, 2, 3]) // => [2, 3, 1]
   */
  function rotate(times, arr) {
      const len = arr.length;
      const n = ((times % len) + len) % len;
      return arr.slice(n, len).concat(arr.slice(0, n));
  }
  /**
   * Return a copy of the collection with the null values removed
   * @function
   * @param {Array} collection
   * @return {Array}
   *
   * @example
   * compact(["a", "b", null, "c"]) // => ["a", "b", "c"]
   */
  function compact(arr) {
      return arr.filter((n) => n === 0 || n);
  }

  const EmptyPcset = {
      empty: true,
      name: "",
      setNum: 0,
      chroma: "000000000000",
      normalized: "000000000000",
      intervals: [],
  };
  // UTILITIES
  const setNumToChroma = (num) => Number(num).toString(2);
  const chromaToNumber = (chroma) => parseInt(chroma, 2);
  const REGEX$1 = /^[01]{12}$/;
  function isChroma(set) {
      return REGEX$1.test(set);
  }
  const isPcsetNum = (set) => typeof set === "number" && set >= 0 && set <= 4095;
  const isPcset = (set) => set && isChroma(set.chroma);
  const cache$1 = { [EmptyPcset.chroma]: EmptyPcset };
  /**
   * Get the pitch class set of a collection of notes or set number or chroma
   */
  function get$4(src) {
      const chroma = isChroma(src)
          ? src
          : isPcsetNum(src)
              ? setNumToChroma(src)
              : Array.isArray(src)
                  ? listToChroma(src)
                  : isPcset(src)
                      ? src.chroma
                      : EmptyPcset.chroma;
      return (cache$1[chroma] = cache$1[chroma] || chromaToPcset(chroma));
  }
  const IVLS = [
      "1P",
      "2m",
      "2M",
      "3m",
      "3M",
      "4P",
      "5d",
      "5P",
      "6m",
      "6M",
      "7m",
      "7M",
  ];
  /**
   * @private
   * Get the intervals of a pcset *starting from C*
   * @param {Set} set - the pitch class set
   * @return {IntervalName[]} an array of interval names or an empty array
   * if not a valid pitch class set
   */
  function chromaToIntervals(chroma) {
      const intervals = [];
      for (let i = 0; i < 12; i++) {
          // tslint:disable-next-line:curly
          if (chroma.charAt(i) === "1")
              intervals.push(IVLS[i]);
      }
      return intervals;
  }
  //// PRIVATE ////
  function chromaRotations(chroma) {
      const binary = chroma.split("");
      return binary.map((_, i) => rotate(i, binary).join(""));
  }
  function chromaToPcset(chroma) {
      const setNum = chromaToNumber(chroma);
      const normalizedNum = chromaRotations(chroma)
          .map(chromaToNumber)
          .filter((n) => n >= 2048)
          .sort()[0];
      const normalized = setNumToChroma(normalizedNum);
      const intervals = chromaToIntervals(chroma);
      return {
          empty: false,
          name: "",
          setNum,
          chroma,
          normalized,
          intervals,
      };
  }
  function listToChroma(set) {
      if (set.length === 0) {
          return EmptyPcset.chroma;
      }
      let pitch;
      const binary = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < set.length; i++) {
          pitch = note(set[i]);
          // tslint:disable-next-line: curly
          if (pitch.empty)
              pitch = interval(set[i]);
          // tslint:disable-next-line: curly
          if (!pitch.empty)
              binary[pitch.chroma] = 1;
      }
      return binary.join("");
  }

  /**
   * @private
   * Chord List
   * Source: https://en.wikibooks.org/wiki/Music_Theory/Complete_List_of_Chord_Patterns
   * Format: ["intervals", "full name", "abrv1 abrv2"]
   */
  const CHORDS = [
      // ==Major==
      ["1P 3M 5P", "major", "M ^ "],
      ["1P 3M 5P 7M", "major seventh", "maj7 Δ ma7 M7 Maj7 ^7"],
      ["1P 3M 5P 7M 9M", "major ninth", "maj9 Δ9 ^9"],
      ["1P 3M 5P 7M 9M 13M", "major thirteenth", "maj13 Maj13 ^13"],
      ["1P 3M 5P 6M", "sixth", "6 add6 add13 M6"],
      ["1P 3M 5P 6M 9M", "sixth/ninth", "6/9 69 M69"],
      ["1P 3M 6m 7M", "major seventh flat sixth", "M7b6 ^7b6"],
      [
          "1P 3M 5P 7M 11A",
          "major seventh sharp eleventh",
          "maj#4 Δ#4 Δ#11 M7#11 ^7#11 maj7#11",
      ],
      // ==Minor==
      // '''Normal'''
      ["1P 3m 5P", "minor", "m min -"],
      ["1P 3m 5P 7m", "minor seventh", "m7 min7 mi7 -7"],
      [
          "1P 3m 5P 7M",
          "minor/major seventh",
          "m/ma7 m/maj7 mM7 mMaj7 m/M7 -Δ7 mΔ -^7",
      ],
      ["1P 3m 5P 6M", "minor sixth", "m6 -6"],
      ["1P 3m 5P 7m 9M", "minor ninth", "m9 -9"],
      ["1P 3m 5P 7M 9M", "minor/major ninth", "mM9 mMaj9 -^9"],
      ["1P 3m 5P 7m 9M 11P", "minor eleventh", "m11 -11"],
      ["1P 3m 5P 7m 9M 13M", "minor thirteenth", "m13 -13"],
      // '''Diminished'''
      ["1P 3m 5d", "diminished", "dim ° o"],
      ["1P 3m 5d 7d", "diminished seventh", "dim7 °7 o7"],
      ["1P 3m 5d 7m", "half-diminished", "m7b5 ø -7b5 h7 h"],
      // ==Dominant/Seventh==
      // '''Normal'''
      ["1P 3M 5P 7m", "dominant seventh", "7 dom"],
      ["1P 3M 5P 7m 9M", "dominant ninth", "9"],
      ["1P 3M 5P 7m 9M 13M", "dominant thirteenth", "13"],
      ["1P 3M 5P 7m 11A", "lydian dominant seventh", "7#11 7#4"],
      // '''Altered'''
      ["1P 3M 5P 7m 9m", "dominant flat ninth", "7b9"],
      ["1P 3M 5P 7m 9A", "dominant sharp ninth", "7#9"],
      ["1P 3M 7m 9m", "altered", "alt7"],
      // '''Suspended'''
      ["1P 4P 5P", "suspended fourth", "sus4 sus"],
      ["1P 2M 5P", "suspended second", "sus2"],
      ["1P 4P 5P 7m", "suspended fourth seventh", "7sus4 7sus"],
      ["1P 5P 7m 9M 11P", "eleventh", "11"],
      [
          "1P 4P 5P 7m 9m",
          "suspended fourth flat ninth",
          "b9sus phryg 7b9sus 7b9sus4",
      ],
      // ==Other==
      ["1P 5P", "fifth", "5"],
      ["1P 3M 5A", "augmented", "aug + +5 ^#5"],
      ["1P 3m 5A", "minor augmented", "m#5 -#5 m+"],
      ["1P 3M 5A 7M", "augmented seventh", "maj7#5 maj7+5 +maj7 ^7#5"],
      [
          "1P 3M 5P 7M 9M 11A",
          "major sharp eleventh (lydian)",
          "maj9#11 Δ9#11 ^9#11",
      ],
      // ==Legacy==
      ["1P 2M 4P 5P", "", "sus24 sus4add9"],
      ["1P 3M 5A 7M 9M", "", "maj9#5 Maj9#5"],
      ["1P 3M 5A 7m", "", "7#5 +7 7+ 7aug aug7"],
      ["1P 3M 5A 7m 9A", "", "7#5#9 7#9#5 7alt"],
      ["1P 3M 5A 7m 9M", "", "9#5 9+"],
      ["1P 3M 5A 7m 9M 11A", "", "9#5#11"],
      ["1P 3M 5A 7m 9m", "", "7#5b9 7b9#5"],
      ["1P 3M 5A 7m 9m 11A", "", "7#5b9#11"],
      ["1P 3M 5A 9A", "", "+add#9"],
      ["1P 3M 5A 9M", "", "M#5add9 +add9"],
      ["1P 3M 5P 6M 11A", "", "M6#11 M6b5 6#11 6b5"],
      ["1P 3M 5P 6M 7M 9M", "", "M7add13"],
      ["1P 3M 5P 6M 9M 11A", "", "69#11"],
      ["1P 3m 5P 6M 9M", "", "m69 -69"],
      ["1P 3M 5P 6m 7m", "", "7b6"],
      ["1P 3M 5P 7M 9A 11A", "", "maj7#9#11"],
      ["1P 3M 5P 7M 9M 11A 13M", "", "M13#11 maj13#11 M13+4 M13#4"],
      ["1P 3M 5P 7M 9m", "", "M7b9"],
      ["1P 3M 5P 7m 11A 13m", "", "7#11b13 7b5b13"],
      ["1P 3M 5P 7m 13M", "", "7add6 67 7add13"],
      ["1P 3M 5P 7m 9A 11A", "", "7#9#11 7b5#9 7#9b5"],
      ["1P 3M 5P 7m 9A 11A 13M", "", "13#9#11"],
      ["1P 3M 5P 7m 9A 11A 13m", "", "7#9#11b13"],
      ["1P 3M 5P 7m 9A 13M", "", "13#9"],
      ["1P 3M 5P 7m 9A 13m", "", "7#9b13"],
      ["1P 3M 5P 7m 9M 11A", "", "9#11 9+4 9#4"],
      ["1P 3M 5P 7m 9M 11A 13M", "", "13#11 13+4 13#4"],
      ["1P 3M 5P 7m 9M 11A 13m", "", "9#11b13 9b5b13"],
      ["1P 3M 5P 7m 9m 11A", "", "7b9#11 7b5b9 7b9b5"],
      ["1P 3M 5P 7m 9m 11A 13M", "", "13b9#11"],
      ["1P 3M 5P 7m 9m 11A 13m", "", "7b9b13#11 7b9#11b13 7b5b9b13"],
      ["1P 3M 5P 7m 9m 13M", "", "13b9"],
      ["1P 3M 5P 7m 9m 13m", "", "7b9b13"],
      ["1P 3M 5P 7m 9m 9A", "", "7b9#9"],
      ["1P 3M 5P 9M", "", "Madd9 2 add9 add2"],
      ["1P 3M 5P 9m", "", "Maddb9"],
      ["1P 3M 5d", "", "Mb5"],
      ["1P 3M 5d 6M 7m 9M", "", "13b5"],
      ["1P 3M 5d 7M", "", "M7b5"],
      ["1P 3M 5d 7M 9M", "", "M9b5"],
      ["1P 3M 5d 7m", "", "7b5"],
      ["1P 3M 5d 7m 9M", "", "9b5"],
      ["1P 3M 7m", "", "7no5"],
      ["1P 3M 7m 13m", "", "7b13"],
      ["1P 3M 7m 9M", "", "9no5"],
      ["1P 3M 7m 9M 13M", "", "13no5"],
      ["1P 3M 7m 9M 13m", "", "9b13"],
      ["1P 3m 4P 5P", "", "madd4"],
      ["1P 3m 5P 6m 7M", "", "mMaj7b6"],
      ["1P 3m 5P 6m 7M 9M", "", "mMaj9b6"],
      ["1P 3m 5P 7m 11P", "", "m7add11 m7add4"],
      ["1P 3m 5P 9M", "", "madd9"],
      ["1P 3m 5d 6M 7M", "", "o7M7"],
      ["1P 3m 5d 7M", "", "oM7"],
      ["1P 3m 6m 7M", "", "mb6M7"],
      ["1P 3m 6m 7m", "", "m7#5"],
      ["1P 3m 6m 7m 9M", "", "m9#5"],
      ["1P 3m 5A 7m 9M 11P", "", "m11A"],
      ["1P 3m 6m 9m", "", "mb6b9"],
      ["1P 2M 3m 5d 7m", "", "m9b5"],
      ["1P 4P 5A 7M", "", "M7#5sus4"],
      ["1P 4P 5A 7M 9M", "", "M9#5sus4"],
      ["1P 4P 5A 7m", "", "7#5sus4"],
      ["1P 4P 5P 7M", "", "M7sus4"],
      ["1P 4P 5P 7M 9M", "", "M9sus4"],
      ["1P 4P 5P 7m 9M", "", "9sus4 9sus"],
      ["1P 4P 5P 7m 9M 13M", "", "13sus4 13sus"],
      ["1P 4P 5P 7m 9m 13m", "", "7sus4b9b13 7b9b13sus4"],
      ["1P 4P 7m 10m", "", "4 quartal"],
      ["1P 5P 7m 9m 11P", "", "11b9"],
  ];

  ({
      ...EmptyPcset,
      name: "",
      quality: "Unknown",
      intervals: [],
      aliases: [],
  });
  let dictionary = [];
  let index$5 = {};
  /**
   * Add a chord to the dictionary.
   * @param intervals
   * @param aliases
   * @param [fullName]
   */
  function add$1(intervals, aliases, fullName) {
      const quality = getQuality(intervals);
      const chord = {
          ...get$4(intervals),
          name: fullName || "",
          quality,
          intervals,
          aliases,
      };
      dictionary.push(chord);
      if (chord.name) {
          index$5[chord.name] = chord;
      }
      index$5[chord.setNum] = chord;
      index$5[chord.chroma] = chord;
      chord.aliases.forEach((alias) => addAlias$1(chord, alias));
  }
  function addAlias$1(chord, alias) {
      index$5[alias] = chord;
  }
  function getQuality(intervals) {
      const has = (interval) => intervals.indexOf(interval) !== -1;
      return has("5A")
          ? "Augmented"
          : has("3M")
              ? "Major"
              : has("5d")
                  ? "Diminished"
                  : has("3m")
                      ? "Minor"
                      : "Unknown";
  }
  CHORDS.forEach(([ivls, fullName, names]) => add$1(ivls.split(" "), names.split(" "), fullName));
  dictionary.sort((a, b) => a.setNum - b.setNum);

  // SCALES
  // Format: ["intervals", "name", "alias1", "alias2", ...]
  const SCALES = [
      // 5-note scales
      ["1P 2M 3M 5P 6M", "major pentatonic", "pentatonic"],
      ["1P 3M 4P 5P 7M", "ionian pentatonic"],
      ["1P 3M 4P 5P 7m", "mixolydian pentatonic", "indian"],
      ["1P 2M 4P 5P 6M", "ritusen"],
      ["1P 2M 4P 5P 7m", "egyptian"],
      ["1P 3M 4P 5d 7m", "neopolitan major pentatonic"],
      ["1P 3m 4P 5P 6m", "vietnamese 1"],
      ["1P 2m 3m 5P 6m", "pelog"],
      ["1P 2m 4P 5P 6m", "kumoijoshi"],
      ["1P 2M 3m 5P 6m", "hirajoshi"],
      ["1P 2m 4P 5d 7m", "iwato"],
      ["1P 2m 4P 5P 7m", "in-sen"],
      ["1P 3M 4A 5P 7M", "lydian pentatonic", "chinese"],
      ["1P 3m 4P 6m 7m", "malkos raga"],
      ["1P 3m 4P 5d 7m", "locrian pentatonic", "minor seven flat five pentatonic"],
      ["1P 3m 4P 5P 7m", "minor pentatonic", "vietnamese 2"],
      ["1P 3m 4P 5P 6M", "minor six pentatonic"],
      ["1P 2M 3m 5P 6M", "flat three pentatonic", "kumoi"],
      ["1P 2M 3M 5P 6m", "flat six pentatonic"],
      ["1P 2m 3M 5P 6M", "scriabin"],
      ["1P 3M 5d 6m 7m", "whole tone pentatonic"],
      ["1P 3M 4A 5A 7M", "lydian #5P pentatonic"],
      ["1P 3M 4A 5P 7m", "lydian dominant pentatonic"],
      ["1P 3m 4P 5P 7M", "minor #7M pentatonic"],
      ["1P 3m 4d 5d 7m", "super locrian pentatonic"],
      // 6-note scales
      ["1P 2M 3m 4P 5P 7M", "minor hexatonic"],
      ["1P 2A 3M 5P 5A 7M", "augmented"],
      ["1P 2M 3m 3M 5P 6M", "major blues"],
      ["1P 2M 4P 5P 6M 7m", "piongio"],
      ["1P 2m 3M 4A 6M 7m", "prometheus neopolitan"],
      ["1P 2M 3M 4A 6M 7m", "prometheus"],
      ["1P 2m 3M 5d 6m 7m", "mystery #1"],
      ["1P 2m 3M 4P 5A 6M", "six tone symmetric"],
      ["1P 2M 3M 4A 5A 7m", "whole tone", "messiaen's mode #1"],
      ["1P 2m 4P 4A 5P 7M", "messiaen's mode #5"],
      ["1P 3m 4P 5d 5P 7m", "minor blues", "blues"],
      // 7-note scales
      ["1P 2M 3M 4P 5d 6m 7m", "locrian major", "arabian"],
      ["1P 2m 3M 4A 5P 6m 7M", "double harmonic lydian"],
      ["1P 2M 3m 4P 5P 6m 7M", "harmonic minor"],
      [
          "1P 2m 2A 3M 4A 6m 7m",
          "altered",
          "super locrian",
          "diminished whole tone",
          "pomeroy",
      ],
      ["1P 2M 3m 4P 5d 6m 7m", "locrian #2", "half-diminished", "aeolian b5"],
      [
          "1P 2M 3M 4P 5P 6m 7m",
          "mixolydian b6",
          "melodic minor fifth mode",
          "hindu",
      ],
      ["1P 2M 3M 4A 5P 6M 7m", "lydian dominant", "lydian b7", "overtone"],
      ["1P 2M 3M 4A 5P 6M 7M", "lydian"],
      ["1P 2M 3M 4A 5A 6M 7M", "lydian augmented"],
      [
          "1P 2m 3m 4P 5P 6M 7m",
          "dorian b2",
          "phrygian #6",
          "melodic minor second mode",
      ],
      ["1P 2M 3m 4P 5P 6M 7M", "melodic minor"],
      ["1P 2m 3m 4P 5d 6m 7m", "locrian"],
      [
          "1P 2m 3m 4d 5d 6m 7d",
          "ultralocrian",
          "superlocrian bb7",
          "superlocrian diminished",
      ],
      ["1P 2m 3m 4P 5d 6M 7m", "locrian 6", "locrian natural 6", "locrian sharp 6"],
      ["1P 2A 3M 4P 5P 5A 7M", "augmented heptatonic"],
      // Source https://en.wikipedia.org/wiki/Ukrainian_Dorian_scale
      [
          "1P 2M 3m 4A 5P 6M 7m",
          "dorian #4",
          "ukrainian dorian",
          "romanian minor",
          "altered dorian",
      ],
      ["1P 2M 3m 4A 5P 6M 7M", "lydian diminished"],
      ["1P 2m 3m 4P 5P 6m 7m", "phrygian"],
      ["1P 2M 3M 4A 5A 7m 7M", "leading whole tone"],
      ["1P 2M 3M 4A 5P 6m 7m", "lydian minor"],
      ["1P 2m 3M 4P 5P 6m 7m", "phrygian dominant", "spanish", "phrygian major"],
      ["1P 2m 3m 4P 5P 6m 7M", "balinese"],
      ["1P 2m 3m 4P 5P 6M 7M", "neopolitan major"],
      ["1P 2M 3m 4P 5P 6m 7m", "aeolian", "minor"],
      ["1P 2M 3M 4P 5P 6m 7M", "harmonic major"],
      ["1P 2m 3M 4P 5P 6m 7M", "double harmonic major", "gypsy"],
      ["1P 2M 3m 4P 5P 6M 7m", "dorian"],
      ["1P 2M 3m 4A 5P 6m 7M", "hungarian minor"],
      ["1P 2A 3M 4A 5P 6M 7m", "hungarian major"],
      ["1P 2m 3M 4P 5d 6M 7m", "oriental"],
      ["1P 2m 3m 3M 4A 5P 7m", "flamenco"],
      ["1P 2m 3m 4A 5P 6m 7M", "todi raga"],
      ["1P 2M 3M 4P 5P 6M 7m", "mixolydian", "dominant"],
      ["1P 2m 3M 4P 5d 6m 7M", "persian"],
      ["1P 2M 3M 4P 5P 6M 7M", "major", "ionian"],
      ["1P 2m 3M 5d 6m 7m 7M", "enigmatic"],
      [
          "1P 2M 3M 4P 5A 6M 7M",
          "major augmented",
          "major #5",
          "ionian augmented",
          "ionian #5",
      ],
      ["1P 2A 3M 4A 5P 6M 7M", "lydian #9"],
      // 8-note scales
      ["1P 2m 2M 4P 4A 5P 6m 7M", "messiaen's mode #4"],
      ["1P 2m 3M 4P 4A 5P 6m 7M", "purvi raga"],
      ["1P 2m 3m 3M 4P 5P 6m 7m", "spanish heptatonic"],
      ["1P 2M 3M 4P 5P 6M 7m 7M", "bebop"],
      ["1P 2M 3m 3M 4P 5P 6M 7m", "bebop minor"],
      ["1P 2M 3M 4P 5P 5A 6M 7M", "bebop major"],
      ["1P 2m 3m 4P 5d 5P 6m 7m", "bebop locrian"],
      ["1P 2M 3m 4P 5P 6m 7m 7M", "minor bebop"],
      ["1P 2M 3m 4P 5d 6m 6M 7M", "diminished", "whole-half diminished"],
      ["1P 2M 3M 4P 5d 5P 6M 7M", "ichikosucho"],
      ["1P 2M 3m 4P 5P 6m 6M 7M", "minor six diminished"],
      [
          "1P 2m 3m 3M 4A 5P 6M 7m",
          "half-whole diminished",
          "dominant diminished",
          "messiaen's mode #2",
      ],
      ["1P 3m 3M 4P 5P 6M 7m 7M", "kafi raga"],
      ["1P 2M 3M 4P 4A 5A 6A 7M", "messiaen's mode #6"],
      // 9-note scales
      ["1P 2M 3m 3M 4P 5d 5P 6M 7m", "composite blues"],
      ["1P 2M 3m 3M 4A 5P 6m 7m 7M", "messiaen's mode #3"],
      // 10-note scales
      ["1P 2m 2M 3m 4P 4A 5P 6m 6M 7M", "messiaen's mode #7"],
      // 12-note scales
      ["1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M", "chromatic"],
  ];

  const NoScaleType = {
      ...EmptyPcset,
      intervals: [],
      aliases: [],
  };
  let index$4 = {};
  /**
   * Given a scale name or chroma, return the scale properties
   *
   * @param {string} type - scale name or pitch class set chroma
   * @example
   * import { get } from 'tonaljs/scale-type'
   * get('major') // => { name: 'major', ... }
   */
  function get$3(type) {
      return index$4[type] || NoScaleType;
  }
  /**
   * Add a scale into dictionary
   * @param intervals
   * @param name
   * @param aliases
   */
  function add(intervals, name, aliases = []) {
      const scale = { ...get$4(intervals), name, intervals, aliases };
      index$4[scale.name] = scale;
      index$4[scale.setNum] = scale;
      index$4[scale.chroma] = scale;
      scale.aliases.forEach((alias) => addAlias(scale, alias));
      return scale;
  }
  function addAlias(scale, alias) {
      index$4[alias] = scale;
  }
  SCALES.forEach(([ivls, name, ...aliases]) => add(ivls.split(" "), name, aliases));

  function isMidi(arg) {
      return +arg >= 0 && +arg <= 127;
  }
  /**
   * Get the note midi number (a number between 0 and 127)
   *
   * It returns undefined if not valid note name
   *
   * @function
   * @param {string|number} note - the note name or midi number
   * @return {Integer} the midi number or undefined if not valid note
   * @example
   * import { toMidi } from '@tonaljs/midi'
   * toMidi("C4") // => 60
   * toMidi(60) // => 60
   * toMidi('60') // => 60
   */
  function toMidi(note$1) {
      if (isMidi(note$1)) {
          return +note$1;
      }
      const n = note(note$1);
      return n.empty ? null : n.midi;
  }
  const L2 = Math.log(2);
  const L440 = Math.log(440);
  /**
   * Get the midi number from a frequency in hertz. The midi number can
   * contain decimals (with two digits precission)
   *
   * @param {number} frequency
   * @return {number}
   * @example
   * import { freqToMidi} from '@tonaljs/midi'
   * freqToMidi(220)); //=> 57
   * freqToMidi(261.62)); //=> 60
   * freqToMidi(261)); //=> 59.96
   */
  function freqToMidi(freq) {
      const v = (12 * (Math.log(freq) - L440)) / L2 + 69;
      return Math.round(v * 100) / 100;
  }
  const SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");
  const FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
  /**
   * Given a midi number, returns a note name. The altered notes will have
   * flats unless explicitly set with the optional `useSharps` parameter.
   *
   * @function
   * @param {number} midi - the midi note number
   * @param {Object} options = default: `{ sharps: false, pitchClass: false }`
   * @param {boolean} useSharps - (Optional) set to true to use sharps instead of flats
   * @return {string} the note name
   * @example
   * import { midiToNoteName } from '@tonaljs/midi'
   * midiToNoteName(61) // => "Db4"
   * midiToNoteName(61, { pitchClass: true }) // => "Db"
   * midiToNoteName(61, { sharps: true }) // => "C#4"
   * midiToNoteName(61, { pitchClass: true, sharps: true }) // => "C#"
   * // it rounds to nearest note
   * midiToNoteName(61.7) // => "D4"
   */
  function midiToNoteName(midi, options = {}) {
      if (isNaN(midi) || midi === -Infinity || midi === Infinity)
          return "";
      midi = Math.round(midi);
      const pcs = options.sharps === true ? SHARPS : FLATS;
      const pc = pcs[midi % 12];
      if (options.pitchClass) {
          return pc;
      }
      const o = Math.floor(midi / 12) - 1;
      return pc + o;
  }

  const NAMES$1 = ["C", "D", "E", "F", "G", "A", "B"];
  const toName = (n) => n.name;
  const onlyNotes = (array) => array.map(note).filter((n) => !n.empty);
  /**
   * Return the natural note names without octave
   * @function
   * @example
   * Note.names(); // => ["C", "D", "E", "F", "G", "A", "B"]
   */
  function names(array) {
      if (array === undefined) {
          return NAMES$1.slice();
      }
      else if (!Array.isArray(array)) {
          return [];
      }
      else {
          return onlyNotes(array).map(toName);
      }
  }
  /**
   * Get a note from a note name
   *
   * @function
   * @example
   * Note.get('Bb4') // => { name: "Bb4", midi: 70, chroma: 10, ... }
   */
  const get$2 = note;
  /**
   * Get the note name
   * @function
   */
  const name = (note) => get$2(note).name;
  /**
   * Get the note pitch class name
   * @function
   */
  const pitchClass = (note) => get$2(note).pc;
  /**
   * Get the note accidentals
   * @function
   */
  const accidentals = (note) => get$2(note).acc;
  /**
   * Get the note octave
   * @function
   */
  const octave = (note) => get$2(note).oct;
  /**
   * Get the note midi
   * @function
   */
  const midi$1 = (note) => get$2(note).midi;
  /**
   * Get the note midi
   * @function
   */
  const freq = (note) => get$2(note).freq;
  /**
   * Get the note chroma
   * @function
   */
  const chroma = (note) => get$2(note).chroma;
  /**
   * Given a midi number, returns a note name. Uses flats for altered notes.
   *
   * @function
   * @param {number} midi - the midi note number
   * @return {string} the note name
   * @example
   * Note.fromMidi(61) // => "Db4"
   * Note.fromMidi(61.7) // => "D4"
   */
  function fromMidi(midi) {
      return midiToNoteName(midi);
  }
  /**
   * Given a midi number, returns a note name. Uses flats for altered notes.
   */
  function fromFreq(freq) {
      return midiToNoteName(freqToMidi(freq));
  }
  /**
   * Given a midi number, returns a note name. Uses flats for altered notes.
   */
  function fromFreqSharps(freq) {
      return midiToNoteName(freqToMidi(freq), { sharps: true });
  }
  /**
   * Given a midi number, returns a note name. Uses flats for altered notes.
   *
   * @function
   * @param {number} midi - the midi note number
   * @return {string} the note name
   * @example
   * Note.fromMidiSharps(61) // => "C#4"
   */
  function fromMidiSharps(midi) {
      return midiToNoteName(midi, { sharps: true });
  }
  /**
   * Transpose a note by an interval
   */
  const transpose = transpose$1;
  const tr = transpose$1;
  /**
   * Transpose by an interval.
   * @function
   * @param {string} interval
   * @return {function} a function that transposes by the given interval
   * @example
   * ["C", "D", "E"].map(Note.transposeBy("5P"));
   * // => ["G", "A", "B"]
   */
  const transposeBy = (interval) => (note) => transpose(note, interval);
  const trBy = transposeBy;
  /**
   * Transpose from a note
   * @function
   * @param {string} note
   * @return {function}  a function that transposes the the note by an interval
   * ["1P", "3M", "5P"].map(Note.transposeFrom("C"));
   * // => ["C", "E", "G"]
   */
  const transposeFrom = (note) => (interval) => transpose(note, interval);
  const trFrom = transposeFrom;
  /**
   * Transpose a note by a number of perfect fifths.
   *
   * @function
   * @param {string} note - the note name
   * @param {number} fifhts - the number of fifths
   * @return {string} the transposed note name
   *
   * @example
   * import { transposeFifths } from "@tonaljs/note"
   * transposeFifths("G4", 1) // => "D"
   * [0, 1, 2, 3, 4].map(fifths => transposeFifths("C", fifths)) // => ["C", "G", "D", "A", "E"]
   */
  function transposeFifths(noteName, fifths) {
      const note = get$2(noteName);
      if (note.empty) {
          return "";
      }
      const [nFifths, nOcts] = note.coord;
      const transposed = nOcts === undefined
          ? coordToNote([nFifths + fifths])
          : coordToNote([nFifths + fifths, nOcts]);
      return transposed.name;
  }
  const trFifths = transposeFifths;
  const ascending = (a, b) => a.height - b.height;
  const descending = (a, b) => b.height - a.height;
  function sortedNames(notes, comparator) {
      comparator = comparator || ascending;
      return onlyNotes(notes).sort(comparator).map(toName);
  }
  function sortedUniqNames(notes) {
      return sortedNames(notes, ascending).filter((n, i, a) => i === 0 || n !== a[i - 1]);
  }
  /**
   * Simplify a note
   *
   * @function
   * @param {string} note - the note to be simplified
   * - sameAccType: default true. Use same kind of accidentals that source
   * @return {string} the simplified note or '' if not valid note
   * @example
   * simplify("C##") // => "D"
   * simplify("C###") // => "D#"
   * simplify("C###")
   * simplify("B#4") // => "C5"
   */
  const simplify = (noteName) => {
      const note = get$2(noteName);
      if (note.empty) {
          return "";
      }
      return midiToNoteName(note.midi || note.chroma, {
          sharps: note.alt > 0,
          pitchClass: note.midi === null,
      });
  };
  /**
   * Get enharmonic of a note
   *
   * @function
   * @param {string} note
   * @param [string] - [optional] Destination pitch class
   * @return {string} the enharmonic note name or '' if not valid note
   * @example
   * Note.enharmonic("Db") // => "C#"
   * Note.enharmonic("C") // => "C"
   * Note.enharmonic("F2","E#") // => "E#2"
   */
  function enharmonic$1(noteName, destName) {
      const src = get$2(noteName);
      if (src.empty) {
          return "";
      }
      // destination: use given or generate one
      const dest = get$2(destName ||
          midiToNoteName(src.midi || src.chroma, {
              sharps: src.alt < 0,
              pitchClass: true,
          }));
      // ensure destination is valid
      if (dest.empty || dest.chroma !== src.chroma) {
          return "";
      }
      // if src has no octave, no need to calculate anything else
      if (src.oct === undefined) {
          return dest.pc;
      }
      // detect any octave overflow
      const srcChroma = src.chroma - src.alt;
      const destChroma = dest.chroma - dest.alt;
      const destOctOffset = srcChroma > 11 || destChroma < 0
          ? -1
          : srcChroma < 0 || destChroma > 11
              ? +1
              : 0;
      // calculate the new octave
      const destOct = src.oct + destOctOffset;
      return dest.pc + destOct;
  }
  var index$3 = {
      names,
      get: get$2,
      name,
      pitchClass,
      accidentals,
      octave,
      midi: midi$1,
      ascending,
      descending,
      sortedNames,
      sortedUniqNames,
      fromMidi,
      fromMidiSharps,
      freq,
      fromFreq,
      fromFreqSharps,
      chroma,
      transpose,
      tr,
      transposeBy,
      trBy,
      transposeFrom,
      trFrom,
      transposeFifths,
      trFifths,
      simplify,
      enharmonic: enharmonic$1,
  };

  const NoRomanNumeral = { empty: true, name: "", chordType: "" };
  const cache = {};
  /**
   * Get properties of a roman numeral string
   *
   * @function
   * @param {string} - the roman numeral string (can have type, like: Imaj7)
   * @return {Object} - the roman numeral properties
   * @param {string} name - the roman numeral (tonic)
   * @param {string} type - the chord type
   * @param {string} num - the number (1 = I, 2 = II...)
   * @param {boolean} major - major or not
   *
   * @example
   * romanNumeral("VIIb5") // => { name: "VII", type: "b5", num: 7, major: true }
   */
  function get$1(src) {
      return typeof src === "string"
          ? cache[src] || (cache[src] = parse(src))
          : typeof src === "number"
              ? get$1(NAMES[src] || "")
              : isPitch(src)
                  ? fromPitch(src)
                  : isNamed(src)
                      ? get$1(src.name)
                      : NoRomanNumeral;
  }
  function fromPitch(pitch) {
      return get$1(altToAcc(pitch.alt) + NAMES[pitch.step]);
  }
  const REGEX = /^(#{1,}|b{1,}|x{1,}|)(IV|I{1,3}|VI{0,2}|iv|i{1,3}|vi{0,2})([^IViv]*)$/;
  function tokenize(str) {
      return (REGEX.exec(str) || ["", "", "", ""]);
  }
  const ROMANS = "I II III IV V VI VII";
  const NAMES = ROMANS.split(" ");
  function parse(src) {
      const [name, acc, roman, chordType] = tokenize(src);
      if (!roman) {
          return NoRomanNumeral;
      }
      const upperRoman = roman.toUpperCase();
      const step = NAMES.indexOf(upperRoman);
      const alt = accToAlt(acc);
      const dir = 1;
      return {
          empty: false,
          name,
          roman,
          interval: interval({ step, alt, dir }).name,
          acc,
          chordType,
          alt,
          step,
          major: roman === upperRoman,
          oct: 0,
          dir,
      };
  }

  const Empty = Object.freeze([]);
  const NoKey = {
      type: "major",
      tonic: "",
      alteration: 0,
      keySignature: "",
  };
  const NoKeyScale = {
      tonic: "",
      grades: Empty,
      intervals: Empty,
      scale: Empty,
      chords: Empty,
      chordsHarmonicFunction: Empty,
      chordScales: Empty,
  };
  const NoMajorKey = {
      ...NoKey,
      ...NoKeyScale,
      type: "major",
      minorRelative: "",
      scale: Empty,
      secondaryDominants: Empty,
      secondaryDominantsMinorRelative: Empty,
      substituteDominants: Empty,
      substituteDominantsMinorRelative: Empty,
  };
  const NoMinorKey = {
      ...NoKey,
      type: "minor",
      relativeMajor: "",
      natural: NoKeyScale,
      harmonic: NoKeyScale,
      melodic: NoKeyScale,
  };
  const mapScaleToType = (scale, list, sep = "") => list.map((type, i) => `${scale[i]}${sep}${type}`);
  function keyScale(grades, chords, harmonicFunctions, chordScales) {
      return (tonic) => {
          const intervals = grades.map((gr) => get$1(gr).interval || "");
          const scale = intervals.map((interval) => transpose$1(tonic, interval));
          return {
              tonic,
              grades,
              intervals,
              scale,
              chords: mapScaleToType(scale, chords),
              chordsHarmonicFunction: harmonicFunctions.slice(),
              chordScales: mapScaleToType(scale, chordScales, " "),
          };
      };
  }
  const distInFifths = (from, to) => {
      const f = note(from);
      const t = note(to);
      return f.empty || t.empty ? 0 : t.coord[0] - f.coord[0];
  };
  const MajorScale = keyScale("I II III IV V VI VII".split(" "), "maj7 m7 m7 maj7 7 m7 m7b5".split(" "), "T SD T SD D T D".split(" "), "major,dorian,phrygian,lydian,mixolydian,minor,locrian".split(","));
  const NaturalScale = keyScale("I II bIII IV V bVI bVII".split(" "), "m7 m7b5 maj7 m7 m7 maj7 7".split(" "), "T SD T SD D SD SD".split(" "), "minor,locrian,major,dorian,phrygian,lydian,mixolydian".split(","));
  const HarmonicScale = keyScale("I II bIII IV V bVI VII".split(" "), "mMaj7 m7b5 +maj7 m7 7 maj7 o7".split(" "), "T SD T SD D SD D".split(" "), "harmonic minor,locrian 6,major augmented,lydian diminished,phrygian dominant,lydian #9,ultralocrian".split(","));
  const MelodicScale = keyScale("I II bIII IV V VI VII".split(" "), "m6 m7 +maj7 7 7 m7b5 m7b5".split(" "), "T SD T SD D  ".split(" "), "melodic minor,dorian b2,lydian augmented,lydian dominant,mixolydian b6,locrian #2,altered".split(","));
  /**
   * Get a major key properties in a given tonic
   * @param tonic
   */
  function majorKey$1(tonic) {
      const pc = note(tonic).pc;
      if (!pc)
          return NoMajorKey;
      const keyScale = MajorScale(pc);
      const alteration = distInFifths("C", pc);
      const romanInTonic = (src) => {
          const r = get$1(src);
          if (r.empty)
              return "";
          return transpose$1(tonic, r.interval) + r.chordType;
      };
      return {
          ...keyScale,
          type: "major",
          minorRelative: transpose$1(pc, "-3m"),
          alteration,
          keySignature: altToAcc(alteration),
          secondaryDominants: "- VI7 VII7 I7 II7 III7 -".split(" ").map(romanInTonic),
          secondaryDominantsMinorRelative: "- IIIm7b5 IV#m7 Vm7 VIm7 VIIm7b5 -"
              .split(" ")
              .map(romanInTonic),
          substituteDominants: "- bIII7 IV7 bV7 bVI7 bVII7 -"
              .split(" ")
              .map(romanInTonic),
          substituteDominantsMinorRelative: "- IIIm7 Im7 IIbm7 VIm7 IVm7 -"
              .split(" ")
              .map(romanInTonic),
      };
  }
  /**
   * Get minor key properties in a given tonic
   * @param tonic
   */
  function minorKey(tnc) {
      const pc = note(tnc).pc;
      if (!pc)
          return NoMinorKey;
      const alteration = distInFifths("C", pc) - 3;
      return {
          type: "minor",
          tonic: pc,
          relativeMajor: transpose$1(pc, "3m"),
          alteration,
          keySignature: altToAcc(alteration),
          natural: NaturalScale(pc),
          harmonic: HarmonicScale(pc),
          melodic: MelodicScale(pc),
      };
  }
  /**
   * Given a key signature, returns the tonic of the major key
   * @param sigature
   * @example
   * majorTonicFromKeySignature('###') // => 'A'
   */
  function majorTonicFromKeySignature(sig) {
      if (typeof sig === "number") {
          return transposeFifths("C", sig);
      }
      else if (typeof sig === "string" && /^b+|#+$/.test(sig)) {
          return transposeFifths("C", accToAlt(sig));
      }
      return null;
  }
  var index$2 = { majorKey: majorKey$1, majorTonicFromKeySignature, minorKey };

  const MODES = [
      [0, 2773, 0, "ionian", "", "Maj7", "major"],
      [1, 2902, 2, "dorian", "m", "m7"],
      [2, 3418, 4, "phrygian", "m", "m7"],
      [3, 2741, -1, "lydian", "", "Maj7"],
      [4, 2774, 1, "mixolydian", "", "7"],
      [5, 2906, 3, "aeolian", "m", "m7", "minor"],
      [6, 3434, 5, "locrian", "dim", "m7b5"],
  ];
  const NoMode = {
      ...EmptyPcset,
      name: "",
      alt: 0,
      modeNum: NaN,
      triad: "",
      seventh: "",
      aliases: [],
  };
  const modes = MODES.map(toMode);
  const index$1 = {};
  modes.forEach((mode) => {
      index$1[mode.name] = mode;
      mode.aliases.forEach((alias) => {
          index$1[alias] = mode;
      });
  });
  /**
   * Get a Mode by it's name
   *
   * @example
   * get('dorian')
   * // =>
   * // {
   * //   intervals: [ '1P', '2M', '3m', '4P', '5P', '6M', '7m' ],
   * //   modeNum: 1,
   * //   chroma: '101101010110',
   * //   normalized: '101101010110',
   * //   name: 'dorian',
   * //   setNum: 2902,
   * //   alt: 2,
   * //   triad: 'm',
   * //   seventh: 'm7',
   * //   aliases: []
   * // }
   */
  function get(name) {
      return typeof name === "string"
          ? index$1[name.toLowerCase()] || NoMode
          : name && name.name
              ? get(name.name)
              : NoMode;
  }
  function toMode(mode) {
      const [modeNum, setNum, alt, name, triad, seventh, alias] = mode;
      const aliases = alias ? [alias] : [];
      const chroma = Number(setNum).toString(2);
      const intervals = get$3(name).intervals;
      return {
          empty: false,
          intervals,
          modeNum,
          chroma,
          normalized: chroma,
          name,
          setNum,
          alt,
          triad,
          seventh,
          aliases,
      };
  }
  function chords(chords) {
      return (modeName, tonic) => {
          const mode = get(modeName);
          if (mode.empty)
              return [];
          const triads = rotate(mode.modeNum, chords);
          const tonics = mode.intervals.map((i) => transpose$1(tonic, i));
          return triads.map((triad, i) => tonics[i] + triad);
      };
  }
  chords(MODES.map((x) => x[4]));
  chords(MODES.map((x) => x[5]));

  /**
   * Create a numeric range. You supply a list of notes or numbers and it will
   * be connected to create complex ranges.
   *
   * @param {Array} notes - the list of notes or midi numbers used
   * @return {Array} an array of numbers or empty array if not valid parameters
   *
   * @example
   * numeric(["C5", "C4"]) // => [ 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60 ]
   * // it works midi notes
   * numeric([10, 5]) // => [ 10, 9, 8, 7, 6, 5 ]
   * // complex range
   * numeric(["C4", "E4", "Bb3"]) // => [60, 61, 62, 63, 64, 63, 62, 61, 60, 59, 58]
   */
  function numeric(notes) {
      const midi = compact(notes.map(toMidi));
      if (!notes.length || midi.length !== notes.length) {
          // there is no valid notes
          return [];
      }
      return midi.reduce((result, note) => {
          const last = result[result.length - 1];
          return result.concat(range(last, note).slice(1));
      }, [midi[0]]);
  }
  /**
   * Create a range of chromatic notes. The altered notes will use flats.
   *
   * @function
   * @param {Array} notes - the list of notes or midi note numbers to create a range from
   * @param {Object} options - The same as `midiToNoteName` (`{ sharps: boolean, pitchClass: boolean }`)
   * @return {Array} an array of note names
   *
   * @example
   * Range.chromatic(["C2, "E2", "D2"]) // => ["C2", "Db2", "D2", "Eb2", "E2", "Eb2", "D2"]
   * // with sharps
   * Range.chromatic(["C2", "C3"], { sharps: true }) // => [ "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3" ]
   */
  function chromatic(notes, options) {
      return numeric(notes).map((midi) => midiToNoteName(midi, options));
  }
  var index = { numeric, chromatic };

  const short_range_flat_notes = index.numeric(["C3", "C6"]).map(index$3.fromMidi);
  const fuzzy_note = _ => {
    let __ = index$3.get(_);

    if (__.empty) {
      return index$3.fromMidi(_);
    }

    return index$3.fromFreq(__.freq);
  };
  const note_freq = _ => index$3.get(_).freq;
  const enharmonic = _ => index$3.enharmonic(_);
  const perfect_c_sharps = [...Array(7)].reduce((acc, _) => [...acc, transpose$1(acc[acc.length - 1], 'P5')], ['C']);
  const perfect_c_flats = [...Array(7)].reduce((acc, _) => [...acc, transpose$1(acc[acc.length - 1], 'P4')], ['C']);
  const majorKey = _ => index$2.majorKey(_);

  class OscPlayers {
    constructor(context) {
      this.context = context;
    }

    get currentTime() {
      return this.context.currentTime;
    }

    async init(data) {}

    _ps = new Map();

    attack(synth, note, now = this.context.currentTime) {
      let p = new OscPlayer(this.context, note_freq(note))._set_data({
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

  function getOscillator(context, type, detune = 0) {
    return new OscillatorNode(context, {
      type,
      detune
    });
  }

  class OscPlayer extends HasAudioAnalyser {
    constructor(context, freq) {
      super(context);
      this.freq = freq;
    }

    _attack(now = this.context.currentTime) {
      let {
        context,
        maxFilterFreq
      } = this;
      let {
        _out_gain,
        freq
      } = this;
      let {
        synth
      } = this.data;
      let {
        wave,
        volume,
        cutoff,
        cutoff_max,
        amplitude,
        filter_adsr,
        amp_adsr
      } = synth;
      let osc1 = getOscillator(context, wave, 15);
      this.osc1 = osc1;
      let osc2 = getOscillator(context, wave, -15);
      this.osc2 = osc2;
      let osc1_mix = context.createGain();
      let osc2_mix = context.createGain();
      osc1.connect(osc1_mix);
      osc2.connect(osc2_mix);
      osc1_mix.gain.setValueAtTime(1, now);
      osc2_mix.gain.setValueAtTime(1, now);
      let filter = new BiquadFilterNode(context, {
        type: 'lowpass',
        Q: 6
      });
      this.filter = filter;
      osc1_mix.connect(filter);
      osc2_mix.connect(filter);

      _out_gain.gain.setValueAtTime(volume, now);

      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq, now);
      let envelope = new GainNode(context);
      this.envelope = envelope;
      filter.connect(envelope);
      envelope.connect(_out_gain);
      let _filter_adsr = { ...filter_adsr,
        s: cutoff * maxFilterFreq * 0.4 + filter_adsr.s * cutoff_max * maxFilterFreq * 0.6
      };
      ads(filter.frequency, now, _filter_adsr, cutoff * maxFilterFreq * 0.4, cutoff * maxFilterFreq * 0.4 + cutoff_max * maxFilterFreq * 0.6);
      ads(envelope.gain, now, amp_adsr, 0, amplitude);
      osc1.start(now);
      osc2.start(now);
    }

    _release(now = this.context.currentTime) {
      let {
        synth: {
          cutoff,
          filter_adsr,
          amp_adsr
        }
      } = this.data;
      r(this.envelope.gain, now, amp_adsr, 0);
      r(this.filter.frequency, now, filter_adsr, cutoff * this.maxFilterFreq * 0.4);
      let {
        a,
        r: _r
      } = amp_adsr;
      this.osc1.stop(now + a + _r);
      this.osc2.stop(now + a + _r);
    }

  }

  function make_ref() {
    let _$ref = createSignal$1();

    let _$clear_bounds = createSignal$1(undefined, {
      equals: false
    });

    let _top = createMemo$1(() => {
      read(_$clear_bounds);
      return read(_$ref)?.scrollTop;
    });

    createMemo$1(() => {
      let top = read(_top);

      if (top !== undefined) {
        return Vec2.make(0, top);
      }
    });
    let m_rect = createMemo$1(() => {
      read(_$clear_bounds);
      return read(_$ref)?.getBoundingClientRect();
    });
    let m_orig = createMemo$1(() => {
      let rect = m_rect();

      if (rect) {
        return Vec2.make(rect.x, rect.y);
      }
    });
    let m_size = createMemo$1(() => {
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

  const has_context = (() => {
    let _;

    return {
      get context() {
        if (!_) {
          _ = new AudioContext();
        }

        return _;
      }

    };
  })();

  const getPlayerController = async input => {
    if (input) {
      let srcs = {};
      short_range_flat_notes.forEach(n => srcs[n] = `${n}.mp3`);
      let p = new SamplesPlayer(has_context.context);
      await p.init({
        srcs,
        base_url: './assets/audio/'
      });
      return p;
    }
  };

  const getOscPlayers = async input => {
    if (input) {
      let o = new OscPlayers(has_context.context);
      await o.init();
      return o;
    }
  };

  class Solsido {
    onClick() {//owrite(this._user_click, true)
    }

    onScroll() {
      this.ref.$clear_bounds();
    }

    user_click() {
      owrite(this._user_click, true);
    }

    get osc_player() {
      return read(this.r_opc);
    }

    get player() {
      return read(this.r_pc);
    }

    constructor() {
      this._user_click = createSignal$1(false);
      this.r_pc = createResource(this._user_click[0], getPlayerController);
      this.r_opc = createResource(this._user_click[0], getOscPlayers);
      this.ref = make_ref();
    }

  }

  const SolsidoContext = createContext();
  function SolsidoProvider(props) {
    let solsido = new Solsido(props.options);
    return createComponent$1(SolsidoContext.Provider, {
      value: solsido,

      get children() {
        return props.children;
      }

    });
  }
  const useSolsido = () => useContext(SolsidoContext);

  const rate = 1000 / 60;
  const ticks = {
    seconds: 60 * rate,
    half: 30 * rate,
    thirds: 20 * rate,
    lengths: 15 * rate,
    sixth: 10 * rate,
    five: 5 * rate,
    three: 3 * rate,
    one: 1 * rate
  };

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

  const make_storage = storage => {
    let api = {
      get: k => storage.getItem(k),
      set: (k, v) => storage.setItem(k, v),
      remove: k => storage.removeItem(k),
      make: k => ({
        get: () => api.get(k),
        set: v => api.set(k, v),
        remove: () => api.remove(k)
      })
    };
    return api;
  };

  const storage = make_storage(window.localStorage);

  const createLocal = (key, _default, opts) => {
    let _s = storage.make(key);

    let _ = createSignal$1(parseInt(_s.get()) || _default, opts);

    createEffect(on(_[0], (v, p) => {
      if (v === undefined) {
        _s.remove();
      } else {
        _s.set(v);
      }
    }));
    return _;
  };

  class Sol_Key {
    get player() {
      return read(this.solsido.r_pc);
    }

    user_click() {
      this.solsido.user_click();
    }

    constructor(solsido) {
      this.solsido = solsido;
      this._exercises = make_exercises$1(this);
      this._majors = make_majors(this);
      this.major_playback = make_playback$1(this);
      this.major_you = make_you(this);
    }

  }

  function shuffleArr(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var rand = Math.floor(Math.random() * (i + 1));
      [array[i], array[rand]] = [array[rand], array[i]];
    }
  }

  const make_next_key = (order, nb) => {
    let perfects = [[...perfect_c_sharps, ...perfect_c_flats.slice(1, 8)], perfect_c_sharps, perfect_c_flats];

    let _res = perfects[nb].slice(0);

    if (order === 0) {
      shuffleArr(_res);
    }

    return key => {
      let i = key === undefined ? 0 : _res.indexOf(key) + 1;
      return _res[i % _res.length];
    };
  };

  const getHighLocal = (() => {
    const key = (order, nb) => [order, nb].join('_');

    let _ = {};
    let orders = [0, 1];
    let nbs = [0, 1, 2];
    orders.forEach(order => nbs.forEach(nb => {
      let _key = key(order, nb);

      _[_key] = createLocal(_key, 0);
    }));
    return opts => {
      let [time, order, nb] = opts;
      return _[key(order, nb)];
    };
  })();

  const make_current = (solsido, opts) => {
    let [time, order, nb, hints] = opts;

    let _show_hints = hints === 1;

    let _high = getHighLocal(opts);

    let _result = createSignal$1();

    let next_key = make_next_key(order, nb);
    let h_time = ['Challenge', 'Free'];
    let h_order = ['', 'Sorted'];
    let h_nb = ['', 'Sharps', 'Flats'];

    let _score = createSignal$1(0);

    let _red_time = createSignal$1();

    let _time = createSignal$1(0);

    let cancel = loop((dt, dt0) => {
      owrite(_time, _ => _ += dt);
    });
    let m_red_score = createMemo$1(() => {
      let red_time = read(_red_time);

      if (red_time) {
        return read(_time) - red_time < ticks.half;
      }
    });
    let m_time = createMemo$1(() => {
      let _ = read(_time);

      let res = time === 0 ? Math.max(0, ticks.seconds * 120 - _) : _;
      return res / 1000;
    });
    onCleanup$1(() => {
      cancel();
    });
    let m_klass = createMemo$1(() => ['you']);
    let m_score_klass = createMemo$1(() => [m_red_score() ? 'red' : '']);

    let _playing_note = createSignal$1();

    let _key = createSignal$1(next_key());

    let m_majorKey = createMemo$1(() => majorKey(read(_key)));
    let m__ns = createMemo$1(() => scale_in_notes(m_majorKey().scale));
    let m__ks = createMemo$1(() => key_signatures(m_majorKey().keySignature));
    let m_i_wnote = createMemo$1(() => m__ks().length);
    let m_gap_note = createMemo$1(() => 1.3 - m_i_wnote() / 8 * 0.3);
    let m_notes = createMemo$1(() => m__ns().map(n => m_majorKey().scale.find(_ => _[0] === n[0]) + n[1]));
    let m_bras = createMemo$1(() => ['gclef@0.2,0', ...m__ks(), ...(!_show_hints ? [] : m__ns().map((_, i) => `whole_note,ghost@${i * m_gap_note() + m_i_wnote() * 0.3 + 1.5},${note_bra_y(_) * 0.125}`))]);

    let _correct_notes = createSignal$1([], {
      equals: false
    });

    let m_playing_bras = createMemo$1(() => read(_correct_notes).map((no_flat_note, i) => `whole_note,live@${i * m_gap_note() + m_i_wnote() * 0.3 + 1.5},${note_bra_y(no_flat_note) * 0.125}`));
    let self = {
      get result() {
        return read(_result);
      },

      get score() {
        return read(_score);
      },

      get score_klass() {
        return m_score_klass();
      },

      get time() {
        return m_time();
      },

      get show_hints() {
        return _show_hints;
      },

      set playing_note(note) {
        owrite(_playing_note, note);
      },

      get bras() {
        return [...m_bras(), ...m_playing_bras()];
      },

      get klass() {
        return m_klass();
      },

      get majorKey() {
        return m_majorKey();
      },

      get header() {
        return [h_time[time], h_order[order], h_nb[nb]].join(' ');
      },

      cancel() {
        solsido._exercises.cancel();
      }

    };
    createEffect(on(_correct_notes[0], v => {
      if (v.length === 8) {
        let _n = next_key(read(_key));

        if (_n) {
          owrite(_score, _ => _ + 1);
          owrite(_key, _n);
          owrite(_correct_notes, []);
        }
      }
    }));
    createEffect(on(_playing_note[0], (note, p) => {
      if (!p && !!note) {
        let _ = m_notes()[read(_correct_notes).length];

        let correct = (_ === note || enharmonic(_) === note) && _;

        if (correct) {
          let _note = correct;
          let no_flat_note = _note[0] + _note[_note.length - 1];
          write(_correct_notes, _ => _.push(no_flat_note));
        } else {
          owrite(_red_time, read(_time));
          owrite(_correct_notes, []);
        }
      }
    }));
    createEffect(on(m_time, (t, p) => {
      if (t - p < 0 && t === 0) {
        let __high = read(_high);

        let score = read(_score);
        let high = Math.max(__high, score);
        owrite(_result, high);
        owrite(_high, _ => high);
        solsido.major_you.stop_major(self);
      }
    }));
    return self;
  };

  const make_exercises$1 = solsido => {
    let _explanations = createSignal$1(true);

    let _time = createLocal('time', 0),
        _order = createLocal('order', 0),
        _nb = createLocal('nb', 0),
        _hints = createLocal('hints', 0);

    let _current = createSignal$1();

    let m_current = createMemo$1(() => {
      let current = read(_current);

      if (current) {
        return make_current(solsido, current);
      }
    });
    createEffect(on(m_current, (v, p) => {
      if (v) {
        solsido.major_you.play_major(v);
      } else {
        if (!!p) {
          solsido.major_you.stop_major(p);
        }
      }
    }));
    let m_dton = createMemo$1(() => [read(_time), read(_order), read(_nb), read(_hints)]);
    return {
      get explanations() {
        return read(_explanations);
      },

      get dton() {
        return m_dton();
      },

      get current() {
        return m_current();
      },

      start(opts) {
        owrite(_explanations, false);
        owrite(_time, opts[0]);
        owrite(_order, opts[1]);
        owrite(_nb, opts[2]);
        owrite(_hints, opts[3]);
        owrite(_current, opts);
        solsido.user_click();
      },

      cancel() {
        owrite(_current, undefined);
      }

    };
  };

  let synth = {
    adsr: {
      a: 0,
      d: 0.1,
      s: 0.8,
      r: 0.6
    }
  };

  const make_you = solsido => {
    let _major = createSignal$1();

    createEffect(on(_major[0], v => {
      if (v) {
        let midi = make_midi({
          just_ons(ons) {
            let {
              player
            } = solsido;
            ons.forEach(_ => player?.attack(synth, fuzzy_note(_)));
            v.playing_note = fuzzy_note(ons[0]);
          },

          just_offs(offs) {
            let {
              player
            } = solsido;
            offs.forEach(_ => player?.release(fuzzy_note(_)));
            v.playing_note = undefined;
          }

        });
        onCleanup$1(() => {
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
      }

    };
  };

  const make_playback$1 = solsido => {
    let _major = createSignal$1();

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
            x = x + 1;

            if (x >= 8) {
              x -= 9;
            } else {
              [_x, _w] = v.xw_at(x);
              let note = fuzzy_note(v.notes[x]);
              player?.attack(synth, note);
              player?.release(note, player.currentTime + (ms_p_note - _i) / 1000);
            }
          }

          if (x > -1) {
            v.xwi = `${_x},${_w},${_i / ms_p_note * 100}`;
          }
        });
        onCleanup$1(() => {
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
      }

    };
  };

  let key_to_bra = {
    '#': 'sharp_accidental',
    'b': 'flat_accidental'
  };
  let sharp_key_notes = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'];
  let flat_key_notes = ['B4', 'E5', 'A4', 'D5', 'G5', 'C5', 'F5'];
  let key_to_notes = {
    undefined: [],
    '#': sharp_key_notes,
    'b': flat_key_notes
  };
  let note_ys = 'B3 C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6'.split(' ');

  const note_bra_y = n => {
    return note_ys.indexOf('G4') - note_ys.indexOf(n);
  };

  const key_signatures = sig => {
    let _ = sig[0];
    let nb = sig.length;
    let key_notes = key_to_notes[_];
    return key_notes.slice(0, nb).map((n, i) => `${key_to_bra[_]}@${i * 0.3 + 1.2},${note_bra_y(n) * 0.125}`);
  };

  const scale_in_notes = scale => {
    let i_note_index = note_ys.findIndex(_ => _[0] === scale[0][0]);
    return note_ys.slice(i_note_index, i_note_index + scale.length + 1);
  };

  const make_major = (solsido, key) => {
    let _majorKey = majorKey(key);

    let __ns = scale_in_notes(_majorKey.scale);

    let __ks = key_signatures(_majorKey.keySignature);

    let i_wnote = __ks.length;
    let gap_note = 1.3 - i_wnote / 8 * 0.3;
    let _bras = ['gclef@0.2,0', ...__ks, ...__ns.map((_, i) => `whole_note@${i * gap_note + i_wnote * 0.3 + 1.5},${note_bra_y(_) * 0.125}`)];

    let _notes = __ns.map(n => _majorKey.scale.find(_ => _[0] === n[0]) + n[1]);

    let _playback = createSignal$1(false);

    let _you = createSignal$1(false);

    let _xwi = createSignal$1('0,0,0');

    let m_klass = createMemo$1(() => [read(_you) ? 'you' : '', read(_playback) ? 'playback' : '']);

    let _playing_note = createSignal$1();

    let _bras_playing = createMemo$1(() => {
      let note = read(_playing_note);

      if (!note) {
        return [];
      }

      let correct = _notes.find(_ => _ === note || enharmonic(_) === note);

      let _note = correct || note;

      let no_flat_note = _note[0] + _note[_note.length - 1];
      let klass = correct ? 'green' : 'red';
      let bra_1 = `whole_note,live,${klass}@${8 * gap_note + i_wnote * 0.3 + 1.5},${note_bra_y(no_flat_note) * 0.125}`;
      return [bra_1];
    });

    let self = {
      get klass() {
        return m_klass();
      },

      get majorKey() {
        return _majorKey;
      },

      get bras() {
        return [..._bras, ..._bras_playing()];
      },

      get notes() {
        return _notes;
      },

      set playing_note(note) {
        owrite(_playing_note, note);
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

      get play_mode() {
        return read(_playback) ? 'stop' : 'play';
      },

      get you_mode() {
        return read(_you) ? 'stop' : 'you';
      },

      set_play(v) {
        owrite(_playback, _ => v ? !_ : false);
      },

      set_you(v) {
        owrite(_you, _ => v ? !_ : false);
      },

      click_play() {
        solsido.user_click();

        solsido._majors.majors.forEach(_ => _.set_play(_ === this));
      },

      click_you() {
        solsido.user_click();

        solsido._majors.majors.forEach(_ => _.set_you(_ === this));
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
    let _perfect_c_sharps = perfect_c_sharps.slice(1).map(_ => make_major(solsido, _));

    let _perfect_c_flats = perfect_c_flats.slice(1).map(_ => make_major(solsido, _));

    let _c = make_major(solsido, perfect_c_sharps[0]);

    return {
      get majors() {
        return [..._perfect_c_sharps, ..._perfect_c_flats, _c];
      },

      get c_major() {
        return _c;
      },

      get sharps_flats_zipped() {
        return _perfect_c_sharps.map((_, i) => [_perfect_c_flats[i], _]);
      }

    };
  };

  const _tmpl$$3 = /*#__PURE__*/template$1(`<div></div>`);
  const _VStaff = props => {
    let $ref;
    onMount(() => {
      let api = VStaff($ref);
      createEffect(() => {
        api.bras = props.bras;
      });
      createEffect(() => {
        api.xwi = props.xwi || '';
      });
      createEffect(() => {
        api.playback = props.playback;
      });
    });
    return (() => {
      const _el$ = _tmpl$$3.cloneNode(true);

      const _ref$ = $ref;
      typeof _ref$ === "function" ? _ref$(_el$) : $ref = _el$;
      return _el$;
    })();
  };

  const _tmpl$$2 = /*#__PURE__*/template$1(`<main></main>`),
        _tmpl$2$1 = /*#__PURE__*/template$1(`<h2> Major Key Exercise </h2>`),
        _tmpl$3$1 = /*#__PURE__*/template$1(`<div class="key-exercise"><div> <!> </div></div>`),
        _tmpl$4$1 = /*#__PURE__*/template$1(`<span class="action icon">Start</span>`),
        _tmpl$5$1 = /*#__PURE__*/template$1(`<div class="key-explanation"><p>You can memorize major key signatures with this exercise.</p><p>Play the given key signature using your MIDI keyboard.</p><p>You have 2 minutes to play as much as you can.</p><p> Also, play and practice individual scales at where they are listed below. </p><p>Try these extra challenges:</p><ul><li>Spot the patterns that emerge from sharp side, and flat side.</li><li>Play with five fingers with the fingering techniques.</li><li>Say the notes as you play them.</li><li>Play without looking at the piano.</li></ul></div>`),
        _tmpl$6$1 = /*#__PURE__*/template$1(`<div class="key-current"><span class="icon small">Restart</span><div class="box flex"><h4></h4></div><div class="scores"><div class="box status"><h4>High Score</h4><span></span></div></div></div>`),
        _tmpl$7$1 = /*#__PURE__*/template$1(`<h3> <span class="major-type"></span> </h3>`),
        _tmpl$8$1 = /*#__PURE__*/template$1(`<div class="key-current"><span class="icon small">Restart</span><div class="box flex"><h4></h4></div><div class="scores"><div class="box status"><h4>Score</h4><span></span></div><div class="box status"><h4> Time </h4><span></span></div></div><div class="major status"></div></div>`),
        _tmpl$9 = /*#__PURE__*/template$1(`<div class="key-controls"><group class="radio"><div><input id="time_min" name="time" type="radio"><label for="time_min">2 Minutes</label></div><div><input id="time_no" name="time" type="radio"><label for="time_no">No time</label></div></group><group class="radio"><div><input id="order_random" name="order" type="radio"><label for="order_random">Random</label></div><div><input id="order_sorted" name="order" type="radio"><label for="order_sorted">Sorted</label></div></group><group class="radio"><div><input id="nb_all" name="nb" type="radio"><label for="nb_all">All</label></div><div><input id="nb_sharps" name="nb" type="radio"><label for="nb_sharps">Sharps</label></div><div><input id="nb_flats" name="nb" type="radio"><label for="nb_flats">Flats</label></div></group><div class="switch"><div><input id="use_hints" name="use_hints" type="checkbox"><label for="use_hints">Show Hints</label></div></div></div>`),
        _tmpl$10 = /*#__PURE__*/template$1(`<h2> Major Key Signatures </h2>`),
        _tmpl$11 = /*#__PURE__*/template$1(`<div class="key-signatures"><div> <!> </div></div>`),
        _tmpl$12 = /*#__PURE__*/template$1(`<div></div>`),
        _tmpl$13 = /*#__PURE__*/template$1(`<div class="cmajor-exercise"><div></div></div>`),
        _tmpl$14 = /*#__PURE__*/template$1(`<div class="cmajor"><div class="header"><h3> <span class="major-type"></span> </h3><div class="controls"></div></div><div><div> </div></div></div>`),
        _tmpl$15 = /*#__PURE__*/template$1(`<span class="bra"></span>`),
        _tmpl$16 = /*#__PURE__*/template$1(`<span class="icon"></span>`);
  let $time_min, $time_no, $order_random, $order_sorted, $nb_all, $nb_sharps, $nb_flats;
  let $use_hints;

  const checkeds = () => {
    let _$times = [$time_min, $time_no];
    let _$orders = [$order_random, $order_sorted];
    let _$nbs = [$nb_all, $nb_sharps, $nb_flats];
    return [...[_$times, _$orders, _$nbs].map(_ => _.findIndex(_ => _.checked)), $use_hints.checked ? 1 : 0];
  };

  function format_time(n) {
    var sec_num = parseInt(n, 10);
    var minutes = Math.floor(sec_num / 60);
    var seconds = sec_num - minutes * 60;

    if (seconds < 10) {
      seconds = '0' + seconds;
    }

    return minutes + ':' + seconds;
  }

  const Key = props => {
    let sol_key = new Sol_Key(useSolsido());
    return (() => {
      const _el$ = _tmpl$$2.cloneNode(true);

      insert$1(_el$, createComponent$1(KeyExercises, {
        get exercises() {
          return sol_key._exercises;
        }

      }), null);

      insert$1(_el$, createComponent$1(KeySignatures, {
        get majors() {
          return sol_key._majors;
        }

      }), null);

      return _el$;
    })();
  };

  const KeyExercises = props => {
    return [_tmpl$2$1.cloneNode(true), createComponent$1(Show$1, {
      get when() {
        return props.exercises.explanations;
      },

      get children() {
        return createComponent$1(KeyExerciseExplanation, {});
      }

    }), createComponent$1(Show$1, {
      get when() {
        return props.exercises.current;
      },

      get fallback() {
        return [(() => {
          const _el$8 = _tmpl$4$1.cloneNode(true);

          _el$8.$$click = () => props.exercises.start(checkeds());

          return _el$8;
        })(), createComponent$1(KeyExerciseControls, {
          get exercises() {
            return props.exercises;
          }

        })];
      },

      children: current => createComponent$1(Show$1, {
        get when() {
          return current.result !== undefined;
        },

        get fallback() {
          return createComponent$1(KeyExerciseCurrent, {
            current: current
          });
        },

        get children() {
          return createComponent$1(KeyExerciseResults, {
            current: current
          });
        }

      })
    }), (() => {
      const _el$3 = _tmpl$3$1.cloneNode(true),
            _el$4 = _el$3.firstChild,
            _el$5 = _el$4.firstChild,
            _el$7 = _el$5.nextSibling;
            _el$7.nextSibling;

      insert$1(_el$4, createComponent$1(CMajorExercise, {
        get current() {
          return props.exercises.current;
        }

      }), _el$7);

      return _el$3;
    })()];
  };

  const KeyExerciseExplanation = props => {
    return _tmpl$5$1.cloneNode(true);
  };

  const KeyExerciseResults = props => {
    return (() => {
      const _el$10 = _tmpl$6$1.cloneNode(true),
            _el$11 = _el$10.firstChild,
            _el$12 = _el$11.nextSibling,
            _el$13 = _el$12.firstChild,
            _el$14 = _el$12.nextSibling,
            _el$15 = _el$14.firstChild,
            _el$16 = _el$15.firstChild,
            _el$17 = _el$16.nextSibling;

      _el$11.$$click = () => props.current.cancel();

      insert$1(_el$13, () => props.current.header);

      insert$1(_el$17, () => props.current.result);

      createRenderEffect$1(() => className$1(_el$17, props.current.score_klass));

      return _el$10;
    })();
  };

  const KeyExerciseCurrent = props => {
    return (() => {
      const _el$18 = _tmpl$8$1.cloneNode(true),
            _el$19 = _el$18.firstChild,
            _el$20 = _el$19.nextSibling,
            _el$21 = _el$20.firstChild,
            _el$22 = _el$20.nextSibling,
            _el$23 = _el$22.firstChild,
            _el$24 = _el$23.firstChild,
            _el$25 = _el$24.nextSibling,
            _el$26 = _el$23.nextSibling,
            _el$27 = _el$26.firstChild,
            _el$28 = _el$27.nextSibling,
            _el$29 = _el$22.nextSibling;

      _el$19.$$click = () => props.current.cancel();

      insert$1(_el$21, () => props.current.header);

      insert$1(_el$25, () => props.current.score);

      insert$1(_el$28, () => format_time(props.current.time));

      insert$1(_el$29, createComponent$1(Show$1, {
        get when() {
          return props.current.show_hints;
        },

        get children() {
          const _el$30 = _tmpl$7$1.cloneNode(true),
                _el$31 = _el$30.firstChild,
                _el$32 = _el$31.nextSibling;

          insert$1(_el$30, () => createComponent$1(Tonic, {
            get tonic() {
              return props.current.majorKey.tonic;
            }

          }), _el$31);

          insert$1(_el$32, () => props.current.majorKey.type);

          return _el$30;
        }

      }));

      createRenderEffect$1(() => className$1(_el$25, props.current.score_klass));

      return _el$18;
    })();
  };

  const KeyExerciseControls = props => {
    let e = props.exercises;
    return (() => {
      const _el$33 = _tmpl$9.cloneNode(true),
            _el$34 = _el$33.firstChild,
            _el$35 = _el$34.firstChild,
            _el$36 = _el$35.firstChild,
            _el$37 = _el$35.nextSibling,
            _el$38 = _el$37.firstChild,
            _el$39 = _el$34.nextSibling,
            _el$40 = _el$39.firstChild,
            _el$41 = _el$40.firstChild,
            _el$42 = _el$40.nextSibling,
            _el$43 = _el$42.firstChild,
            _el$44 = _el$39.nextSibling,
            _el$45 = _el$44.firstChild,
            _el$46 = _el$45.firstChild,
            _el$47 = _el$45.nextSibling,
            _el$48 = _el$47.firstChild,
            _el$49 = _el$47.nextSibling,
            _el$50 = _el$49.firstChild,
            _el$51 = _el$44.nextSibling,
            _el$52 = _el$51.firstChild,
            _el$53 = _el$52.firstChild;

      const _ref$ = $time_min;
      typeof _ref$ === "function" ? _ref$(_el$36) : $time_min = _el$36;
      const _ref$2 = $time_no;
      typeof _ref$2 === "function" ? _ref$2(_el$38) : $time_no = _el$38;
      const _ref$3 = $order_random;
      typeof _ref$3 === "function" ? _ref$3(_el$41) : $order_random = _el$41;
      const _ref$4 = $order_sorted;
      typeof _ref$4 === "function" ? _ref$4(_el$43) : $order_sorted = _el$43;
      const _ref$5 = $nb_all;
      typeof _ref$5 === "function" ? _ref$5(_el$46) : $nb_all = _el$46;
      const _ref$6 = $nb_sharps;
      typeof _ref$6 === "function" ? _ref$6(_el$48) : $nb_sharps = _el$48;
      const _ref$7 = $nb_flats;
      typeof _ref$7 === "function" ? _ref$7(_el$50) : $nb_flats = _el$50;
      const _ref$8 = $use_hints;
      typeof _ref$8 === "function" ? _ref$8(_el$53) : $use_hints = _el$53;

      createRenderEffect$1(() => _el$36.checked = e.dton[0] === 0);

      createRenderEffect$1(() => _el$38.checked = e.dton[0] === 1);

      createRenderEffect$1(() => _el$41.checked = e.dton[1] === 0);

      createRenderEffect$1(() => _el$43.checked = e.dton[1] === 1);

      createRenderEffect$1(() => _el$46.checked = e.dton[2] === 0);

      createRenderEffect$1(() => _el$48.checked = e.dton[2] === 1);

      createRenderEffect$1(() => _el$50.checked = e.dton[2] === 2);

      createRenderEffect$1(() => _el$53.checked = e.dton[3] === 1);

      return _el$33;
    })();
  };

  const KeySignatures = props => {
    return [_tmpl$10.cloneNode(true), (() => {
      const _el$55 = _tmpl$11.cloneNode(true),
            _el$56 = _el$55.firstChild,
            _el$57 = _el$56.firstChild,
            _el$59 = _el$57.nextSibling;
            _el$59.nextSibling;

      insert$1(_el$56, createComponent$1(CMajor, {
        get major() {
          return props.majors.c_major;
        }

      }), _el$59);

      insert$1(_el$55, createComponent$1(For$1, {
        get each() {
          return props.majors.sharps_flats_zipped;
        },

        children: major => (() => {
          const _el$60 = _tmpl$12.cloneNode(true);

          insert$1(_el$60, createComponent$1(CMajor, {
            get major() {
              return major[0];
            }

          }), null);

          insert$1(_el$60, createComponent$1(CMajor, {
            get major() {
              return major[1];
            }

          }), null);

          return _el$60;
        })()
      }), null);

      return _el$55;
    })()];
  };

  const CMajorExercise = props => {
    return (() => {
      const _el$61 = _tmpl$13.cloneNode(true),
            _el$62 = _el$61.firstChild;

      insert$1(_el$62, createComponent$1(_VStaff, mergeProps(() => props.current)));

      createRenderEffect$1(() => className$1(_el$62, ['major-staff', props.current?.klass || ''].join(' ')));

      return _el$61;
    })();
  };

  const you_titles = {
    'you': 'You Play',
    'stop': 'Stop'
  };

  const CMajor = props => {
    let $ref;
    onMount(() => {
      let api = VStaff($ref);
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

    let _show_controls = createSignal$1(false);

    return (() => {
      const _el$63 = _tmpl$14.cloneNode(true),
            _el$64 = _el$63.firstChild,
            _el$65 = _el$64.firstChild,
            _el$66 = _el$65.firstChild,
            _el$67 = _el$66.nextSibling,
            _el$68 = _el$65.nextSibling,
            _el$69 = _el$64.nextSibling,
            _el$70 = _el$69.firstChild;

      _el$63.$$mouseover = _ => owrite(_show_controls, true);

      _el$63.addEventListener("mouseleave", _ => owrite(_show_controls, false));

      insert$1(_el$65, () => createComponent$1(Tonic, {
        get tonic() {
          return props.major.majorKey.tonic;
        }

      }), _el$66);

      insert$1(_el$67, () => props.major.majorKey.type);

      insert$1(_el$68, createComponent$1(Show$1, {
        get when() {
          return read(_show_controls);
        },

        get children() {
          return [createComponent$1(Icon, {
            onClick: _ => props.major.click_play(),

            get title() {
              return props.major.play_mode;
            },

            get children() {
              return props.major.play_mode;
            }

          }), createComponent$1(Icon, {
            onClick: _ => props.major.click_you(),

            get title() {
              return you_titles[props.major.you_mode];
            },

            get children() {
              return props.major.you_mode;
            }

          })];
        }

      }));

      const _ref$9 = $ref;
      typeof _ref$9 === "function" ? _ref$9(_el$70) : $ref = _el$70;

      createRenderEffect$1(() => className$1(_el$69, ['major-staff', ...props.major.klass].join(' ')));

      return _el$63;
    })();
  };

  const Tonic = props => {
    return [memo(() => props.tonic[0]), createComponent$1(Show$1, {
      get when() {
        return props.tonic[1] === 'b';
      },

      get children() {
        const _el$71 = _tmpl$15.cloneNode(true);

        insert$1(_el$71, () => g['flat_accidental']);

        return _el$71;
      }

    }), createComponent$1(Show$1, {
      get when() {
        return props.tonic[1] === '#';
      },

      get children() {
        const _el$72 = _tmpl$15.cloneNode(true);

        insert$1(_el$72, () => g['sharp_accidental']);

        return _el$72;
      }

    })];
  };

  const Icon = props => {
    return (() => {
      const _el$73 = _tmpl$16.cloneNode(true);

      addEventListener(_el$73, "click", props.onClick, true);

      insert$1(_el$73, () => props.children);

      createRenderEffect$1(() => setAttribute$1(_el$73, "title", props.title));

      return _el$73;
    })();
  };

  delegateEvents(["click", "mouseover"]);

  const make_playback = (m_nb_beats, m_notes) => {
    let _playing = createSignal$1(false);

    let m_bpm = createMemo$1(() => {
      if (read(_playing)) {
        return make_bpm(m_nb_beats(), 120);
      }
    });
    let m_trigger = createMemo$1(() => {
      let __ = m_bpm()?.beat_ms;

      if (__) {
        let [sub, ms, i_sub, subs] = __;

        if (i_sub < 0) {
          return __;
        }
      }
    });
    return {
      get on_sub() {
        return m_trigger();
      },

      get bpm() {
        return m_bpm();
      },

      set bpm(bpm) {
        let _bpm = m_bpm();

        if (_bpm) {
          _bpm.bpm = bpm;
        }
      },

      set playing(v) {
        owrite(_playing, v);
      },

      get playing() {
        return read(_playing);
      }

    };
  };
  const make_bpm = (nb_beats, bpm = 120) => {
    let _bpm = createSignal$1(bpm);

    let _ms_per_beat = createMemo$1(() => 60000 / read(_bpm));

    let _subs = createSignal$1(4);

    let _ms_per_sub = createMemo$1(() => read(_ms_per_beat) / read(_subs));

    let _sub = createSignal$1(-4 * nb_beats - 1);

    let _lookahead_ms = 20;

    let _t = createSignal$1(_lookahead_ms);

    let m_t = createMemo$1(() => read(_t) - _lookahead_ms);
    let cancel = loop((dt, dt0) => {
      let t = read(_t);

      let ms_per_sub = _ms_per_sub();

      if (t + dt + _lookahead_ms > ms_per_sub) {
        batch$1(() => {
          owrite(_t, _ => _ = _ - ms_per_sub + dt);
          owrite(_sub, _ => _ + 1);
        });
      } else {
        owrite(_t, _ => _ + dt);
      }
    });
    onCleanup$1(() => {
      cancel();
    });
    return {
      get bpm() {
        return read(_bpm);
      },

      set bpm(bpm) {
        owrite(_bpm, Math.max(20, bpm));
      },

      get beat_ms() {
        return [read(_sub), m_t(), m_t() / _ms_per_sub(), read(_subs)];
      },

      get ms_per_sub() {
        return _ms_per_sub();
      }

    };
  };

  const make_player = (m_player, playback, m_notes) => {
    let _synth = createSignal$1({
      wave: 'sawtooth',
      volume: 1,
      cutoff: 0.2,
      cutoff_max: 0.4,
      amplitude: 1,
      filter_adsr: {
        a: 0.1,
        d: 0.1,
        s: 0,
        r: 0
      },
      amp_adsr: {
        a: 0.1,
        d: 0.1,
        s: 0.2,
        r: 0.02
      }
    });

    let _loop = createSignal$1([0, 16]);

    let m_free = createMemo$1(() => m_notes().map(_ => {
      let [note, d_sub] = _.split('@');

      let [at, sub] = d_sub.split(',');
      return [note, parseInt(at), parseInt(sub), -1];
    }));
    createEffect(() => {
      let {
        on_sub
      } = playback;

      if (on_sub) {
        let [_sub, ms] = on_sub;
        let [_loop_begin, _loop_end] = read(_loop);

        let _loop_range = _loop_end - _loop_begin;

        let sub = _sub % _loop_range + _loop_begin;

        let _in = m_free().filter(_ => _[1] === sub && _[3] !== _sub);

        let player = m_player();
        let {
          bpm
        } = playback;

        if (player && bpm) {
          _in.forEach(_ => {
            let [note, __, dur_subs] = _;
            let duration = dur_subs * bpm.ms_per_sub;
            player.attack(read(_synth), note, player.currentTime - ms / 1000);
            player.release(note, player.currentTime + (-ms + duration) / 1000);
            _[3] = _sub;
          });
        }
      }
    });
    return {
      set loop(loop) {
        owrite(_loop, loop);
      },

      set synth(synth) {
        owrite(_synth, synth);
      }

    };
  };

  let bpms = [20, 30, 60, 90, 120, 180, 200, 400];
  let beats = [1, 2, 3, 4];

  function on_interval(life, life0, t) {
    return Math.floor(life0 / t) !== Math.floor(life / t);
  }

  class Sol_Rhythm {
    constructor(solsido) {
      this.solsido = solsido;
      this._exercises = make_exercises(this);
    }

  }

  const make_exercises = rhythm => {
    let yardstick = make_yardstick(rhythm);
    return {
      yardstick
    };
  };

  const make_yardstick = rhythm => {
    let {
      solsido
    } = rhythm;

    let _nb_beats = createSignal$1(4);

    let m_nb_beats = createMemo$1(() => read(_nb_beats));

    let _playback = make_playback(m_nb_beats);

    let m_osc_player = createMemo$1(() => solsido.osc_player);
    let m_up_notes = createMemo$1(() => {
      _playback.playing;
      _playback.bpm;
      return ['D5@-16,2', 'D5@0,2'];
    });
    let m_down_notes = createMemo$1(() => {
      _playback.playing;
      _playback.bpm;
      return ['F4@-12,2', 'A4@-8,2', 'F4@-4,2', 'F4@4,2', 'A4@8,2', 'F4@12,2'];
    });

    let _m_up_player = make_player(m_osc_player, _playback, m_up_notes);

    let _m_down_player = make_player(m_osc_player, _playback, m_down_notes);

    createEffect(() => {
      let beats = read(_nb_beats);
      _m_up_player.loop = [0, beats * 4];
      _m_down_player.loop = [0, beats * 4];
    });
    _m_up_player.synth = {
      wave: 'sine',
      volume: 1,
      cutoff: 0.2,
      cutoff_max: 0.4,
      amplitude: 1,
      filter_adsr: {
        a: 0,
        d: 0.03,
        s: 0,
        r: 0
      },
      amp_adsr: {
        a: 0.01,
        d: 0.02,
        s: 0,
        r: 0
      }
    };
    _m_down_player.synth = {
      wave: 'sine',
      volume: 1,
      cutoff: 0.2,
      cutoff_max: 0.4,
      amplitude: 1,
      filter_adsr: {
        a: 0.02,
        d: 0.02,
        s: 0,
        r: 0
      },
      amp_adsr: {
        a: 0.01,
        d: 0.01,
        s: 0,
        r: 0.02
      }
    };
    let m_x = createMemo$1(() => {
      let beat_ms = _playback.bpm?.beat_ms;

      if (beat_ms) {
        let [sub, ms, sub_i, subs] = beat_ms;
        let beat = (sub + sub_i) / subs;
        return beat;
      }
    });
    /*
    
     0 1 2 3
     4 5 6 7
      1 1
     3 3
     3.5 3.5
     4 1
    */

    let m_cursor1_x = createMemo$1(() => {
      if (m_x() < 0) {
        return -10;
      }

      let nb_beats = read(_nb_beats);
      let half = nb_beats / 2;
      return ((m_x() - half) % nb_beats + half) / nb_beats;
    });
    let m_cursor2_x = createMemo$1(() => {
      let nb_beats = read(_nb_beats);
      let half = nb_beats / 2;
      return ((m_x() + half) % nb_beats - half) / nb_beats;
    });

    let _beats = [...Array(48 * 4 + 1).keys()].map(i => make_beat(rhythm, i, _nb_beats));

    let m_cursor1_style = createMemo$1(() => ({
      left: `${m_cursor1_x() * 48 * 4 * 100 / (48 * 4 + 1)}%`
    }));
    let m_cursor2_style = createMemo$1(() => ({
      left: `${m_cursor2_x() * 48 * 4 * 100 / (48 * 4 + 1)}%`
    }));
    let m_bpm = createMemo$1(prev => _playback.bpm?.bpm || prev);

    let _hits = createSignal$1([], {
      equals: false
    });

    let m_hits = createMemo$1(() => read(_hits).map(_ => make_hit(rhythm, _)));
    let synth = {
      adsr: {
        a: 0,
        d: 0.1,
        s: 0.05,
        r: 0.6
      }
    };
    createEffect(on(() => _playback.playing, p => {
      if (p) {
        make_midi({
          just_ons(ons) {
            let {
              player
            } = solsido;
            ons.slice(-1).forEach(_ => player?.attack(synth, fuzzy_note(_)));
            let nb_beats = read(_nb_beats);
            write(_hits, _ => _.push(m_x() % nb_beats / nb_beats));
          },

          just_offs(offs) {
            let {
              player
            } = solsido;
            offs.forEach(_ => player?.release(fuzzy_note(_)));
          }

        });
        onCleanup$1(() => {});
      }
    }));
    let m_x0 = createMemo$1(on(m_x, (v, p) => {
      return p;
    }));
    let m_on_beat = createMemo$1(p => {
      let nb_beats = read(_nb_beats);
      let x = m_x();

      if (x > 0 && on_interval(x, m_x0(), nb_beats)) {
        return x;
      }

      return p;
    });
    createEffect(on(m_on_beat, () => {
      owrite(_hits, []);
    }));

    let _scores = createSignal$1([], {
      equals: false
    });

    let m_scores = createMemo$1(() => read(_scores).map((_, i) => make_score(rhythm, i, _)));
    let _next_scores = [[0, 0.5]];

    const next_scores = () => {
      return _next_scores.pop();
    };

    createEffect(on(m_on_beat, v => {
      if (v !== undefined) {
        let scores = m_scores();
        m_hits();
        scores.forEach(_ => _.on_beat());

        if (read(_scores).length === 0) {
          owrite(_scores, next_scores());
        }
      }
    }));
    return {
      get hits() {
        return m_hits();
      },

      get scores() {
        return m_scores();
      },

      get cursor1_style() {
        return m_cursor1_style();
      },

      get cursor2_style() {
        return m_cursor2_style();
      },

      set nb_beats(value) {
        let _beats = beats.indexOf(read(_nb_beats)) + value + beats.length;

        _beats = Math.max(0, _beats) % beats.length;
        owrite(_nb_beats, beats[_beats]);
      },

      get nb_beats() {
        return read(_nb_beats);
      },

      get beats() {
        return _beats;
      },

      get bpm() {
        return m_bpm();
      },

      set bpm(value) {
        if (!_playback.bpm) {
          return;
        }

        let _bpm = bpms.indexOf(_playback.bpm.bpm) + value + bpms.length;

        _bpm = Math.max(0, _bpm) % bpms.length;
        _playback.bpm = bpms[_bpm];
      },

      get playback_playing() {
        return _playback.playing ? 'stop' : 'play';
      },

      toggle_playback_playing() {
        solsido.user_click();
        _playback.playing = !_playback.playing;
      }

    };
  };

  const make_hit = (rhythm, _) => {
    let _x = _;
    let m_style = createMemo$1(() => ({
      left: `${_x * 48 * 4 * 100 / (48 * 4 + 1)}%`
    }));
    return {
      get x() {
        return _x;
      },

      get style() {
        return m_style();
      }

    };
  };

  let colors = ['ghost', 'red', 'blue', 'green'];

  const make_score = (rhythm, i, _) => {
    let _i_score = createSignal$1(0);

    let _x = _;
    let m_style = createMemo$1(() => ({
      left: `${_x * 48 * 4 * 100 / (48 * 4 + 1)}%`
    }));
    let m_klass = createMemo$1(() => [colors[read(_i_score)]].join(' '));
    return {
      i,

      get x() {
        return _x;
      },

      on_beat() {
        owrite(_i_score, _ => _ === 0 ? 1 : _);
      },

      dispose_on_beat() {},

      get klass() {
        return m_klass();
      },

      get style() {
        return m_style();
      }

    };
  };

  const make_beat = (rhythm, i, _nb_beats) => {
    // beat 0-15
    let m_n = createMemo$1(() => 48 * 4 / read(_nb_beats));
    let m_on_beat = createMemo$1(() => i % m_n() === 0);
    let m_up_beat = createMemo$1(() => i % (m_n() / 2) === 0);
    let m_sub_division = createMemo$1(() => i % (m_n() / 4) === 0);
    let m_strong = createMemo$1(() => m_on_beat());
    let m_medium = createMemo$1(() => m_up_beat());
    let m_weak = createMemo$1(() => m_sub_division());
    let m_klass = createMemo$1(() => [m_strong() ? 'strong' : m_medium() ? 'medium' : m_weak() ? 'weak' : ''].join(' '));
    return {
      get klass() {
        return m_klass();
      }

    };
  };

  const _tmpl$$1 = /*#__PURE__*/template$1(`<main></main>`),
        _tmpl$2 = /*#__PURE__*/template$1(`<div class="rhythm-exercises"><h2> Yardstick Exercise </h2><div class="yardstick-controls"></div><div class="yardstick-wrap"></div><h2> Notes Exercise </h2><div class="main-staff"></div></div>`),
        _tmpl$3 = /*#__PURE__*/template$1(`<metronome><span class="icon"></span><group><label>bpm</label></group><group><label>beats</label></group></metronome>`),
        _tmpl$4 = /*#__PURE__*/template$1(`<div class="up-down"><span class="value-down">-</span><span class="value"> <!> </span> <span class="value-up">+</span></div>`),
        _tmpl$5 = /*#__PURE__*/template$1(`<yardstick><playback><cursor></cursor><cursor></cursor></playback><scores></scores><sticks></sticks></yardstick>`),
        _tmpl$6 = /*#__PURE__*/template$1(`<hit></hit>`),
        _tmpl$7 = /*#__PURE__*/template$1(`<score></score>`),
        _tmpl$8 = /*#__PURE__*/template$1(`<stick></stick>`);
  const Rhythm = props => {
    let sol_rhythm = new Sol_Rhythm(useSolsido());
    return (() => {
      const _el$ = _tmpl$$1.cloneNode(true);

      insert$1(_el$, createComponent$1(RExercises, {
        get exercises() {
          return sol_rhythm._exercises;
        }

      }));

      return _el$;
    })();
  };

  const RExercises = props => {
    return (() => {
      const _el$2 = _tmpl$2.cloneNode(true),
            _el$3 = _el$2.firstChild,
            _el$4 = _el$3.nextSibling,
            _el$5 = _el$4.nextSibling,
            _el$6 = _el$5.nextSibling,
            _el$7 = _el$6.nextSibling;

      insert$1(_el$4, createComponent$1(Metronome, {
        toggle_play: () => props.exercises.yardstick.toggle_playback_playing(),

        get play_mode() {
          return props.exercises.yardstick.playback_playing;
        },

        get beats() {
          return props.exercises.yardstick.nb_beats;
        },

        set_beats: _ => props.exercises.yardstick.nb_beats = _,

        get bpm() {
          return props.exercises.yardstick.bpm;
        },

        set_bpm: _ => props.exercises.yardstick.bpm = _
      }));

      insert$1(_el$5, createComponent$1(Yardstick, {
        get yardstick() {
          return props.exercises.yardstick;
        }

      }));

      insert$1(_el$7, createComponent$1(_VStaff, {}));

      return _el$2;
    })();
  };

  const Metronome = props => {
    return (() => {
      const _el$8 = _tmpl$3.cloneNode(true),
            _el$9 = _el$8.firstChild,
            _el$10 = _el$9.nextSibling;
            _el$10.firstChild;
            const _el$12 = _el$10.nextSibling;
            _el$12.firstChild;

      addEventListener(_el$9, "click", props.toggle_play, true);

      insert$1(_el$9, () => props.play_mode);

      insert$1(_el$10, createComponent$1(UpDownControl, {
        get value() {
          return props.bpm;
        },

        setValue: _ => props.set_bpm(_)
      }), null);

      insert$1(_el$12, createComponent$1(UpDownControl, {
        get value() {
          return props.beats;
        },

        setValue: _ => props.set_beats(_)
      }), null);

      return _el$8;
    })();
  };

  const dformat = v => v < 10 ? `0${v}` : `${v}`;

  const UpDownControl = props => {
    const value = value => {
      props.setValue(value);
    };

    return (() => {
      const _el$14 = _tmpl$4.cloneNode(true),
            _el$15 = _el$14.firstChild,
            _el$16 = _el$15.nextSibling,
            _el$17 = _el$16.firstChild,
            _el$19 = _el$17.nextSibling;
            _el$19.nextSibling;
            const _el$20 = _el$16.nextSibling,
            _el$21 = _el$20.nextSibling;

      _el$15.$$click = _ => value(-1);

      _el$16.$$click = _ => value(+1);

      insert$1(_el$16, () => dformat(props.value), _el$19);

      _el$21.$$click = _ => value(+1);

      return _el$14;
    })();
  };

  const Yardstick = props => {
    return (() => {
      const _el$22 = _tmpl$5.cloneNode(true),
            _el$23 = _el$22.firstChild,
            _el$24 = _el$23.firstChild,
            _el$25 = _el$24.nextSibling,
            _el$26 = _el$23.nextSibling,
            _el$27 = _el$26.nextSibling;

      insert$1(_el$26, createComponent$1(For$1, {
        get each() {
          return props.yardstick.hits;
        },

        children: hit => (() => {
          const _el$28 = _tmpl$6.cloneNode(true);

          createRenderEffect$1(_$p => style$1(_el$28, hit.style, _$p));

          return _el$28;
        })()
      }), null);

      insert$1(_el$26, createComponent$1(For$1, {
        get each() {
          return props.yardstick.scores;
        },

        children: score => (() => {
          const _el$29 = _tmpl$7.cloneNode(true);

          createRenderEffect$1(_p$ => {
            const _v$3 = score.klass,
                  _v$4 = score.style;
            _v$3 !== _p$._v$3 && className$1(_el$29, _p$._v$3 = _v$3);
            _p$._v$4 = style$1(_el$29, _v$4, _p$._v$4);
            return _p$;
          }, {
            _v$3: undefined,
            _v$4: undefined
          });

          return _el$29;
        })()
      }), null);

      insert$1(_el$27, createComponent$1(For$1, {
        get each() {
          return props.yardstick.beats;
        },

        children: beat => (() => {
          const _el$30 = _tmpl$8.cloneNode(true);

          createRenderEffect$1(() => className$1(_el$30, beat.klass));

          return _el$30;
        })()
      }));

      createRenderEffect$1(_p$ => {
        const _v$ = props.yardstick.cursor1_style,
              _v$2 = props.yardstick.cursor2_style;
        _p$._v$ = style$1(_el$24, _v$, _p$._v$);
        _p$._v$2 = style$1(_el$25, _v$2, _p$._v$2);
        return _p$;
      }, {
        _v$: undefined,
        _v$2: undefined
      });

      return _el$22;
    })();
  };

  delegateEvents(["click"]);

  const _tmpl$ = /*#__PURE__*/template$1(`<solsido><header><input class="topnav-toggle fullscreen-toggle" type="checkbox" id="tn-tg"><label for="tn-tg" class="fullscreen-mask"></label><label for="tn-tg" class="hbg"> <span class="hbg_in"></span></label><nav id="topnav"><section></section><section> <!> </section><section> <!> </section></nav><h1 class="site-title"></h1></header><div id="main-wrap"></div></solsido>`);

  function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback, options);
  }

  const App = props => {
    let solsido = useSolsido();
    let unbinds = [];
    unbinds.push(unbindable(document, 'scroll', () => solsido.onScroll(), {
      capture: true,
      passive: true
    }));
    unbinds.push(unbindable(window, 'resize', () => solsido.onScroll(), {
      passive: true
    }));
    onCleanup$1(() => unbinds.forEach(_ => _()));
    let $topnav_toggle;
    let location = useLocation();
    createEffect(() => {
      location.pathname;
      $topnav_toggle.checked = false;
    });
    return (() => {
      const _el$ = _tmpl$.cloneNode(true),
            _el$2 = _el$.firstChild,
            _el$3 = _el$2.firstChild,
            _el$4 = _el$3.nextSibling,
            _el$5 = _el$4.nextSibling,
            _el$6 = _el$5.nextSibling,
            _el$7 = _el$6.firstChild,
            _el$8 = _el$7.nextSibling,
            _el$9 = _el$8.firstChild,
            _el$11 = _el$9.nextSibling;
            _el$11.nextSibling;
            const _el$12 = _el$8.nextSibling,
            _el$13 = _el$12.firstChild,
            _el$15 = _el$13.nextSibling;
            _el$15.nextSibling;
            const _el$16 = _el$6.nextSibling,
            _el$17 = _el$2.nextSibling;

      (_ => setTimeout(() => solsido.ref.$ref = _))(_el$);

      _el$.$$click = _ => solsido.onClick();

      const _ref$ = $topnav_toggle;
      typeof _ref$ === "function" ? _ref$(_el$3) : $topnav_toggle = _el$3;

      insert$1(_el$7, createComponent$1(Link, {
        href: "/",
        children: " lasolsido.org "
      }));

      insert$1(_el$8, createComponent$1(NavLink, {
        href: "/rhythm",
        children: "Rhythm"
      }), _el$11);

      insert$1(_el$12, createComponent$1(NavLink, {
        href: "/key",
        children: "Key Signatures"
      }), _el$15);

      insert$1(_el$16, createComponent$1(Link, {
        get href() {
          return location.pathname;
        },

        get children() {
          return location.pathname;
        }

      }));

      insert$1(_el$17, createComponent$1(Routes, {
        get children() {
          return [createComponent$1(Route, {
            path: "/",
            component: Home
          }), createComponent$1(Route, {
            path: "/key",
            component: Key
          }), createComponent$1(Route, {
            path: "/rhythm",
            component: Rhythm
          })];
        }

      }));

      return _el$;
    })();
  };

  const AppWithRouter = options => props => {
    return createComponent$1(Router, {
      get children() {
        return createComponent$1(SolsidoProvider, {
          options: options,

          get children() {
            return createComponent$1(App, {});
          }

        });
      }

    });
  };

  delegateEvents(["click"]);

  function Lado(element, options = {}) {
    render$1(AppWithRouter(options), element);
    return {};
  }

  return Lado;

})();
