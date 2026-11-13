/**
 * 桩 React 渲染器：把 dsh-memo 的面板真渲染一遍，用来抓渲染期异常和验证交互。
 * 不是视觉验证工具——它只保证「组件不炸、事件回调发出正确的请求」。
 *
 * 用法：
 *   const h = await createHarness({ notes, categories, api })
 *   await h.settle(); const nodes = h.render()
 *   h.byClass(nodes, 'dsm-cat')  // 按 class 取节点
 *   h.calls                      // 拦截到的请求 [{ url, body }]
 */
import { readFileSync } from 'node:fs'

const CLIENT_PATH = new URL('../client.js', import.meta.url).pathname

export async function createHarness(options = {}) {
  const hooks = { list: [], index: 0, pending: false, effects: [] }
  const effectCaches = new WeakMap()
  /** 只有依赖真的变了才重跑 effect（与 React 行为一致，避免测试里被反复重置）。 */
  const queueEffect = (fn, deps) => {
    const i = hooks.index
    hooks.index += 1
    const store = hooks.list
    if (!effectCaches.has(store)) effectCaches.set(store, new Map())
    const cache = effectCaches.get(store)
    const previous = cache.get(i)
    const next = Array.isArray(deps) ? deps : null
    const same = previous !== undefined && previous.deps && next
      && previous.deps.length === next.length
      && previous.deps.every((value, position) => Object.is(value, next[position]))
    if (previous !== undefined && (same || (next === null && previous.deps === null))) return
    cache.set(i, { deps: next })
    hooks.effects.push(fn)
  }

  const React = {
    createElement: (type, props, ...children) => ({
      type,
      props: { ...(props || {}), children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) },
    }),
    useState(initial) {
      const i = hooks.index++
      const store = hooks.list
      if (!(i in store)) store[i] = typeof initial === 'function' ? initial() : initial
      return [store[i], (value) => {
        const next = typeof value === 'function' ? value(store[i]) : value
        if (next === store[i]) return
        store[i] = next
        hooks.pending = true
      }]
    },
    useRef(initial) { const i = hooks.index++; if (!(i in hooks.list)) hooks.list[i] = { current: initial }; return hooks.list[i] },
    useMemo(fn) { hooks.index += 1; return fn() },
    useCallback(fn) { hooks.index += 1; return fn },
    useEffect(fn, deps) { queueEffect(fn, deps) },
    useLayoutEffect(fn, deps) { queueEffect(fn, deps) },
    useSyncExternalStore(subscribe, getSnapshot) { hooks.index += 1; return getSnapshot() },
  }

  globalThis.window = globalThis
  globalThis.location = globalThis.location || { hash: '', search: '' }
  const listeners = new Map()
  globalThis.addEventListener = (type, handler) => {
    const list = listeners.get(type) || []
    list.push(handler)
    listeners.set(type, list)
  }
  globalThis.removeEventListener = (type, handler) => {
    const list = listeners.get(type) || []
    listeners.set(type, list.filter((item) => item !== handler))
  }
  globalThis.dispatchEvent = (event) => {
    for (const handler of listeners.get(event && event.type) || []) handler(event)
    return true
  }
  globalThis.setTimeout = setTimeout
  globalThis.clearTimeout = clearTimeout
  globalThis.document = {
    addEventListener: () => {}, removeEventListener: () => {},
    querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, dataset: {}, append() {}, remove() {}, click() {}, addEventListener() {} }),
    body: { style: {}, append() {} }, head: { append() {} }, documentElement: { style: {} },
  }
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init && init.detail !== undefined ? init.detail : null
    }
  }
  globalThis.getSelection = () => ({ toString: () => '', removeAllRanges() {} })
  globalThis.matchMedia = () => ({ matches: false })
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)
  globalThis.cancelAnimationFrame = () => {}
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }

  const state = {
    notes: options.notes || [],
    categories: options.categories || [],
    trash: options.trash || [],
    sync: options.sync || { enabled: false },
  }
  const calls = []
  globalThis.fetch = async (url, init) => {
    const body = init && init.body ? JSON.parse(init.body) : null
    calls.push({ url: String(url), body })
    let result = { notes: state.notes, categories: state.categories, trash: state.trash, sync: state.sync }
    if (options.api) result = options.api(body, result, calls) ?? result
    return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
  }

  let plugin = null
  globalThis.window.__ModuleLoader__ = {
    load: (mod) => { plugin = mod.factory((name) => { if (name === 'react') return React; throw new Error(`无法 require: ${name}`) }) },
  }
  await import(`${CLIENT_PATH}?case=${Math.random()}`)

  const regs = []
  const locale = {
    register: () => () => {},
    bind: () => (key) => key,
    getSnapshot: () => ({ active: 'zh', revision: 1 }),
    subscribe: () => () => {},
    getLocale: () => ({ active: 'zh' }),
  }
  plugin.apply({
    get: (name) => {
      if (options.services && Object.prototype.hasOwnProperty.call(options.services, name)) return options.services[name]
      if (name === 'layout') return { selectPanel: () => {} }
      return undefined
    },
    effect: (fn) => fn(),
    on: () => () => {},
    locale,
    slots: { inject: (key, fn) => fn(), register: (o, c) => { regs.push({ options: o, component: c }); return () => {} } },
  })
  const entry = regs.find((r) => r.options.name === 'main')
  if (!entry) throw new Error('没有注册 main 面板')

  const stores = new WeakMap()
  const storeFor = (fn, props) => {
    if (!stores.has(fn)) stores.set(fn, new Map())
    const byKey = stores.get(fn)
    const key = props && props.key !== undefined && props.key !== null ? String(props.key) : '~'
    if (!byKey.has(key)) byKey.set(key, [])
    return byKey.get(key)
  }
  const renderChild = (fn, props) => {
    const saved = { list: hooks.list, index: hooks.index, effects: hooks.effects }
    hooks.list = storeFor(fn, props)
    hooks.index = 0
    hooks.effects = []
    try {
      const out = fn(props)
      for (const effect of hooks.effects) {
        try { effect() } catch (error) { /* 子组件 effect 里的定时器失败不影响渲染验证 */ }
      }
      return out
    } finally {
      hooks.list = saved.list
      hooks.index = saved.index
      hooks.effects = saved.effects
    }
  }
  const walk = (node, sink) => {
    if (!node || typeof node !== 'object') return sink
    if (typeof node.type === 'function') {
      walk(renderChild(node.type, node.props || {}), sink)
      return sink
    }
    if (node.type) sink.push(node)
    for (const child of (node.props && node.props.children) || []) walk(child, sink)
    return sink
  }

  const render = () => {
    hooks.index = 0
    hooks.effects = []
    hooks.pending = false
    const tree = entry.component({})
    for (const effect of hooks.effects) {
      try { effect() } catch (error) { /* 忽略 effect 异常 */ }
    }
    return walk(tree, [])
  }
  const settle = async () => {
    for (let i = 0; i < 4; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      render()
    }
  }
  const byClass = (nodes, cls) => nodes.filter((n) => typeof n.props.className === 'string' && n.props.className.split(' ').indexOf(cls) >= 0)

  /** 渲染任意注册的组件（例如 shell.overlay 里的浮层），带独立 hook 槽。 */
  const renderComponent = (fn, props = {}) => renderChild(fn, props)

  /** 派发一个 window 事件（测试键盘快捷键用）。 */
  const dispatch = (type, event) => {
    for (const handler of listeners.get(type) || []) handler(event)
  }

  return { render, settle, byClass, calls, state, hooks, registrations: regs, renderComponent, dispatch, listeners }
}
