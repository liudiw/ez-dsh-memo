/**
 * dsh-memo 的 fast-note-sync（FNS）同步引擎。
 *
 * 目标：便签墙仍以本地 `notes.json` 为即时真相，同时把每张便签镜像成 vault 里的一份
 * Markdown（frontmatter 带颜色/置顶/尺寸），并支持两边都能改（双向）。
 *
 * 远端接口（FNS 3.6 REST）：
 *   GET    /api/notes?vault&page&pageSize   → { list: [{ path, pathHash, lastTime, version, mtime }], pager }
 *   GET    /api/note?vault&path             → { content, path, mtime, version, lastTime }
 *   POST   /api/note  { vault, path, content } → 笔记 DTO（含 lastTime/version）
 *   DELETE /api/note?vault&path             → 移入回收站
 * 鉴权：`Authorization: Bearer <token>`；响应统一 `{ code, status, message, data }`（code>=1 且 status=true 为成功）。
 *
 * 变更判定：本地用 payload 哈希（正文+颜色+置顶+宽高），远端用 (lastTime, version) 指纹。
 * 冲突：两边都改过时比较时间（远端 mtime vs 本地 updatedAt），新的一侧胜出，败方正文保留成
 * 一张本地「冲突副本」便签（syncConflict 标记），不静默丢字。
 */
import { createHash } from 'node:crypto'

const DEFAULT_FOLDER = '便签墙'
const PAGE_SIZE = 100
const MAX_PAGES = 50
const TIMEOUT_MS = 20000

/** 便签「内容指纹」：只有这些字段变化才需要同步。 */
export function payloadHashOf(note, categoryNames) {
  const raw = JSON.stringify({
    categories: (Array.isArray(categoryNames) ? categoryNames : []).join('|'),
    text: note.text ?? '',
    color: note.color ?? '',
    pinned: note.pinned === true,
    width: note.width ?? null,
    height: note.height ?? null,
    remindAt: note.remindAt ?? null,
    repeat: note.repeat ? `${note.repeat.kind}:${note.repeat.weekday ?? ''}` : null,
    done: note.done === true,
  })
  return createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

export class SyncError extends Error {
  constructor(message, kind = 'api', code) {
    super(message)
    this.name = 'SyncError'
    this.kind = kind
    this.code = code
  }
}

/** 把用户填的 api 规整成 `…/api`，容忍结尾斜杠与已带 /api 的写法。 */
export function normalizeApiBase(api) {
  const trimmed = String(api || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`
}

function normalizeFolder(folder) {
  return String(folder || DEFAULT_FOLDER).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function fnsMessage(payload, status) {
  const message = typeof payload?.message === 'string' && payload.message ? payload.message : `HTTP ${status}`
  const details = Array.isArray(payload?.details) && payload.details.length ? `（${payload.details.join('；')}）` : ''
  return `fast-note-sync 拒绝：${message}${details}`
}

/** 一页一页把 vault 里的笔记列表取全（只留目标目录里的 .md）。 */
function createClient(config) {
  const base = normalizeApiBase(config.api)
  const token = String(config.apiToken || '')

  async function call(method, pathname, options = {}) {
    if (!base) throw new SyncError('同步配置缺少 api 地址', 'config')
    if (!token) throw new SyncError('同步配置缺少 apiToken', 'config')
    const url = new URL(base + pathname)
    for (const [key, value] of Object.entries(options.query || {})) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
    const init = {
      method,
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
    }
    if (options.body !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = JSON.stringify(options.body)
    }
    let response
    try {
      response = await fetch(url, init)
    } catch (error) {
      const reason = error?.name === 'TimeoutError' ? '请求超时' : String(error?.message || error)
      throw new SyncError(`连不上 fast-note-sync：${reason}`, 'network')
    }
    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      throw new SyncError(`fast-note-sync 返回了非 JSON（HTTP ${response.status}）`, 'protocol')
    }
    if (!response.ok || payload?.status !== true || !(Number(payload?.code) >= 1)) {
      throw new SyncError(fnsMessage(payload, response.status), 'api', payload?.code)
    }
    return payload.data
  }

  return {
    async listNotes() {
      const items = []
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const data = await call('GET', '/notes', { query: { vault: config.vault, page, pageSize: PAGE_SIZE } })
        const list = Array.isArray(data?.list) ? data.list : []
        items.push(...list)
        const total = Number(data?.pager?.totalRows)
        if (list.length < PAGE_SIZE) break
        if (Number.isFinite(total) && items.length >= total) break
      }
      return items.filter((item) => typeof item?.path === 'string')
    },
    noteGet(path) {
      return call('GET', '/note', { query: { vault: config.vault, path } })
    },
    notePut(path, content) {
      return call('POST', '/note', { body: { vault: config.vault, path, content } })
    },
    noteDelete(path) {
      return call('DELETE', '/note', { query: { vault: config.vault, path } })
    },
    /** 上传附件（multipart/form-data）：字段 vault + path + file。 */
    async filePut(path, bytes, mime) {
      if (!base) throw new SyncError('同步配置缺少 api 地址', 'config')
      if (!token) throw new SyncError('同步配置缺少 apiToken', 'config')
      const form = new FormData()
      form.set('vault', config.vault)
      form.set('path', path)
      form.set('file', new Blob([bytes], { type: mime || 'application/octet-stream' }), path.split('/').pop())
      let response
      try {
        response = await fetch(`${base}/file`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
          body: form,
          signal: AbortSignal.timeout(TIMEOUT_MS * 3),
        })
      } catch (error) {
        const reason = error?.name === 'TimeoutError' ? '请求超时' : String(error?.message || error)
        throw new SyncError(`上传附件失败（连不上 fast-note-sync）：${reason}`, 'network')
      }
      let payload = null
      try {
        payload = await response.json()
      } catch (error) {
        throw new SyncError(`上传附件返回了非 JSON（HTTP ${response.status}）`, 'protocol')
      }
      if (!response.ok || payload?.status !== true || !(Number(payload?.code) >= 1)) {
        throw new SyncError(fnsMessage(payload, response.status), 'api', payload?.code)
      }
      return payload.data
    },
  }
}

/** 文件名：`2026-11-03-2231-摘语-3f9a.md`（时间 + 正文首行摘要 + id 尾 4 位防重）。 */
export function noteFilePath(folder, note) {
  const stamp = new Date(note.createdAt)
  const at = Number.isNaN(stamp.getTime()) ? new Date() : stamp
  const pad = (value) => String(value).padStart(2, '0')
  const day = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}`
  const firstLine = String(note.text || '').split('\n')[0] || 'note'
  const slug = firstLine
    .replace(/[\\/:*?"<>|#^[\]{}`~\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 24) || 'note'
  const suffix = String(note.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4)
  return `${folder}/${day}-${time}-${slug}${suffix ? `-${suffix}` : ''}.md`
}

export function toMarkdown(note, categoryNames) {
  const lines = [
    '---',
    `dsh-memo-id: ${note.id}`,
    `created: ${note.createdAt}`,
    `dsh-memo-color: ${note.color}`,
    `dsh-memo-pinned: ${note.pinned ? 'true' : 'false'}`,
  ]
  if (note.width) lines.push(`dsh-memo-width: ${note.width}`)
  if (note.height) lines.push(`dsh-memo-height: ${note.height}`)
  if (note.remindAt) lines.push(`dsh-memo-remind: ${note.remindAt}`)
  if (note.repeat) {
    lines.push(`dsh-memo-repeat: ${note.repeat.kind}${note.repeat.weekday === undefined || note.repeat.weekday === null ? '' : `:${note.repeat.weekday}`}`)
  }
  if (note.done === true) lines.push('dsh-memo-done: true')
  const names = (Array.isArray(categoryNames) ? categoryNames : []).filter(Boolean)
  if (names.length) lines.push(`dsh-memo-categories: ${names.join(',')}`)
  lines.push('---', '', String(note.text || ''))
  return `${lines.join('\n')}\n`
}

/** 解析我们写出的 frontmatter；用户手写的普通 md 没有 frontmatter 时正文即全文。 */
/** 分类目录：每行 `名称|颜色|序号`，作为单个文件同步，改名/排序直接覆盖。 */
export const CATALOG_FILE = '_便签分类.md'

export function catalogToMarkdown(categories) {
  const lines = ['# 便签分类', '']
  for (const item of categories || []) {
    const name = String(item.name || '').replace(/[|\n]/g, ' ').trim()
    if (!name) continue
    lines.push(`${name}|${item.color || ''}|${Number(item.order) || 0}`)
  }
  return `${lines.join('\n')}\n`
}

export function parseCatalog(markdown) {
  const out = []
  for (const line of String(markdown || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [name, color, order] = trimmed.split('|')
    const clean = String(name || '').trim()
    if (!clean) continue
    out.push({ name: clean, color: String(color || '').trim() || null, order: Number(order) || 0 })
  }
  return out
}

export function parseMarkdown(markdown) {
  const text = String(markdown ?? '').replace(/\r\n?/g, '\n')
  if (!text.startsWith('---\n')) return { fields: {}, body: text.trim() }
  const end = text.indexOf('\n---', 3)
  if (end < 0) return { fields: {}, body: text.trim() }
  const fields = {}
  for (const line of text.slice(4, end).split('\n')) {
    const match = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line.trim())
    if (!match) continue
    fields[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
  }
  return { fields, body: text.slice(end + 4).replace(/^\n+/, '').replace(/\s+$/, '') }
}

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null
}

/** frontmatter → 便签载荷（缺字段用 base 兜底）。 */
export function payloadFromMarkdown(parsed, base) {
  const fallback = base || {}
  const fields = parsed.fields || {}
  const color = typeof fields['dsh-memo-color'] === 'string' ? fields['dsh-memo-color'] : fallback.color
  return {
    text: parsed.body,
    color: ['amber', 'rose', 'sky', 'green', 'violet'].includes(color) ? color : 'amber',
    pinned: fields['dsh-memo-pinned'] === 'true' ? true : fields['dsh-memo-pinned'] === 'false' ? false : fallback.pinned === true,
    width: fields['dsh-memo-width'] !== undefined ? numberOrNull(fields['dsh-memo-width']) : fallback.width ?? null,
    height: fields['dsh-memo-height'] !== undefined ? numberOrNull(fields['dsh-memo-height']) : fallback.height ?? null,
    remindAt: fields['dsh-memo-remind'] !== undefined ? cleanRemindField(fields['dsh-memo-remind']) : fallback.remindAt ?? null,
    repeat: fields['dsh-memo-repeat'] !== undefined ? cleanRepeatField(fields['dsh-memo-repeat']) : fallback.repeat ?? null,
    done: fields['dsh-memo-done'] !== undefined ? fields['dsh-memo-done'] === 'true' : fallback.done === true,
    categoryNames: fields['dsh-memo-categories'] !== undefined
      ? String(fields['dsh-memo-categories']).split(',').map((name) => name.trim()).filter(Boolean)
      : fallback.categoryNames,
    createdAt: typeof fields.created === 'string' && fields.created ? fields.created : fallback.createdAt,
    remoteId: typeof fields['dsh-memo-id'] === 'string' ? fields['dsh-memo-id'] : undefined,
  }
}

function cleanRemindField(raw) {
  const stamp = Date.parse(String(raw))
  return Number.isFinite(stamp) ? new Date(stamp).toISOString() : null
}

function cleanRepeatField(raw) {
  const value = String(raw || '').trim()
  const match = /^(daily|weekly|monthly)(?::([0-6]))?$/.exec(value)
  if (!match) return null
  if (match[1] === 'weekly' && match[2] !== undefined) return { kind: 'weekly', weekday: Number(match[2]) }
  return { kind: match[1] }
}

function fingerprintOf(item) {
  return { lastTime: item?.lastTime ?? null, version: item?.version ?? null }
}

function sameFingerprint(remote, item) {
  if (!remote || !item) return false
  const left = fingerprintOf(remote)
  const right = fingerprintOf(item)
  // 两者都缺字段时不下结论（宁可多拉一次），有值则严格比较。
  if (left.lastTime === null && left.version === null) return false
  return left.lastTime === right.lastTime && left.version === right.version
}

/**
 * 同步引擎。设计要点：
 * - 单飞：同一时刻只跑一次同步，并发调用共享同一个 Promise。
 * - 失败不致命：本地写入永远先成功；同步失败只记状态，下次再试。
 * - 冲突不丢字：败方正文另存一张便签。
 */
export function createSyncEngine(options) {
  const config = options.config
  const store = options.store
  const warn = options.warn || (() => {})
  const folder = normalizeFolder(config.folder)
  const client = createClient(config)
  const intervalMs = Math.max(15000, Number(config.intervalMs) || 60000)
  const inFolder = (path) => path.startsWith(`${folder}/`)

  let timer = null
  let current = null
  let status = {
    enabled: true,
    api: normalizeApiBase(config.api),
    vault: config.vault,
    folder,
    state: 'idle',
    lastAt: null,
    lastError: null,
    lastStats: null,
  }

  const emptyStats = () => ({ pushed: 0, pulled: 0, imported: 0, deleted: 0, conflicts: 0, rebound: 0, tombstones: 0 })

  async function pushNote(note, pathOverride) {
    // 已有映射的便签沿用原文件名：改正文不该在 vault 里多出一个 md。
    const path = pathOverride || noteFilePath(folder, note)
    const created = await client.notePut(path, toMarkdown(note, namesFor(note)))
    const info = created && (created.lastTime !== undefined || created.version !== undefined)
      ? created
      : await client.noteGet(path)
    // 指纹交给 store 按「当前存储内容」算；同时带上推送时的哈希做守卫：
    // 推送期间用户又改了这条便签，就不记录，下一轮重推。
    await store.setRemote(note.id, {
      path,
      ...fingerprintOf(info),
      syncedAt: new Date().toISOString(),
    }, payloadHashOf(note, namesFor(note)))
    return path
  }

  async function runOnce() {
    const stats = emptyStats()
    const { notes, categories } = await store.list()
    const nameById = new Map((categories || []).map((item) => [item.id, item.name]))
    const namesFor = (note) => (note.categoryIds || []).map((id) => nameById.get(id)).filter(Boolean)
    // 冲突副本单轮上限：逻辑上不该出现大量冲突，这里是防跑飞的保险丝。
    const MAX_CONFLICT_COPIES = 5
    let conflictCopies = 0
    let catalogChanged = false
    const conflictTexts = new Set(notes.filter((note) => note.syncConflict).map((note) => note.text))
    async function keepConflictCopy(payload) {
      const text = String(payload?.text || '').trim()
      if (!text || conflictTexts.has(text)) return
      if (conflictCopies >= MAX_CONFLICT_COPIES) {
        warn('本轮冲突副本已达上限，剩余冲突只保留胜方内容')
        return
      }
      conflictCopies += 1
      conflictTexts.add(text)
      await store.createFromRemote(payload, { conflict: true })
    }

    // 0) 先清本地删除留下的墓碑（远端也删掉）。
    for (const entry of await store.tombstones()) {
      try {
        await client.noteDelete(entry.path)
        stats.deleted += 1
      } catch (error) {
        // 远端本来就没有就不必重试；网络/鉴权问题保留墓碑。
        if (error?.kind === 'network' || error?.kind === 'config') throw error
      }
      await store.dropTombstone(entry.path)
    }

    // 0.5) 分类目录：先按本地写远端（覆盖），再把远端新增/改名读回来
    try {
      const catalogPath = `${folder}/${CATALOG_FILE}`
      const catalogBody = catalogToMarkdown(categories)
      const existing = await store.readCatalogHash?.()
      if (existing !== catalogBody) {
        await client.notePut(catalogPath, catalogBody)
        await store.writeCatalogHash?.(catalogBody)
        catalogChanged = true;   // 分类名/顺序变了，带分类的便签需要重写 frontmatter
      }
    } catch (error) {
      // 目录同步失败不影响便签本体
    }

    const remoteItems = (await client.listNotes()).filter((item) => inFolder(item.path))
    const remoteByPath = new Map(remoteItems.map((item) => [item.path, item]))
    /** 映射的文件在远端消失了：先别删，等导入阶段确认它是不是被 RENAME 了。 */
    const maybeDeleted = []

    // 0.6) 远端目录里的分类，本地没有就建（存在同名则跳过）
    try {
      const catalogPath = `${folder}/${CATALOG_FILE}`
      if (remoteItems.some((item) => item.path === catalogPath)) {
        const body = await client.noteGet(catalogPath)
        const parsedCatalog = parseCatalog(typeof body === 'string' ? body : body?.content || '')
        const known = new Set((categories || []).map((item) => String(item.name || '').toLowerCase()))
        for (const entry of parsedCatalog) {
          if (known.has(entry.name.toLowerCase())) {
            // 已有的分类：尝试把颜色/顺序对齐远端（接口不支持就忽略）
            const local = (categories || []).find((item) => String(item.name).toLowerCase() === entry.name.toLowerCase())
            if (local && (entry.color || entry.order !== undefined)) {
              try { await store.categoryUpdate({ id: local.id, name: local.name, color: entry.color, order: entry.order }) } catch (error) { /* 忽略 */ }
            }
            continue
          }
          try {
            await store.categoryAdd({ name: entry.name })
            known.add(entry.name.toLowerCase())
          } catch (error) {
            // 超上限或其它原因，跳过
          }
        }
      }
    } catch (error) {
      // 目录读取失败不影响便签本体
    }

    // 1) 本地 → 远端 / 远端 → 本地 / 冲突
    for (const note of notes) {
      const payload = payloadHashOf(note, namesFor(note))
      const remote = note.remote && note.remote.path ? note.remote : null

      if (!remote) {
        // 新便签：才需要按正文生成文件名。
        await pushNote(note)
        stats.pushed += 1
        continue
      }

      if (catalogChanged && (note.categoryIds || []).length && remote.path) {
        // 分类目录变了：把这张便签的 frontmatter 重写一遍（改名/顺序传播）
        await pushNote(note, remote.path)
        stats.pushed += 1
        continue
      }

      const item = remoteByPath.get(remote.path)
      if (!item) {
        maybeDeleted.push(note)
        continue
      }

      const remoteChanged = !sameFingerprint(remote, item)
      const localChanged = remote.payloadHash !== payload
      if (!remoteChanged && !localChanged) continue

      if (remoteChanged && !localChanged) {
        const fetched = await client.noteGet(remote.path)
        const parsed = parseMarkdown(fetched?.content)
        const incoming = payloadFromMarkdown(parsed, note)
        const outcome = await store.applyRemote(
          note.id,
          incoming,
          { path: remote.path, ...fingerprintOf(fetched ?? item) },
          payload,
        )
        if (outcome.applied) {
          stats.pulled += 1
          if (Array.isArray(incoming.categoryNames)) {
            try { await store.update({ id: note.id, categories: incoming.categoryNames }) } catch (error) { /* 忽略 */ }
          }
        }
        continue
      }

      if (localChanged && !remoteChanged) {
        // 改正文沿用原来的文件名，别把同一张便签推成第二个 md。
        await pushNote(note, remote.path)
        stats.pushed += 1
        continue
      }

      // 两边都改过 = 真冲突。策略：**一律本地优先**。
      // 为什么不比 mtime/updatedAt：一个是远端服务器的时钟、一个是本机时钟，
      // 两台机器差几秒就能让判定随机翻转（上一版就是这么误判出「冲突副本」的）。
      // 本地是用户此刻正在编辑的一侧，优先它更符合预期；远端那份正文另存为副本，不丢字。
      const fetched = await client.noteGet(remote.path)
      const parsed = parseMarkdown(fetched?.content)
      const remotePayload = payloadFromMarkdown(parsed, note)
      if (remotePayload.text !== note.text) {
        await keepConflictCopy({ ...remotePayload, createdAt: remotePayload.createdAt || note.createdAt })
      }
      await pushNote(note, remote.path)
      stats.conflicts += 1
      stats.pushed += 1
    }

    // 2) 远端多出来的文件 → 导入成本地便签（「在 Obsidian 里新建便签」）。
    //    若文件名变了但 frontmatter 里还是同一个 id：这是 RENAME，认回原便签而不是新建一条。
    const mappedPaths = new Set(notes.map((note) => (note.remote && note.remote.path ? note.remote.path : null)).filter(Boolean))
    for (const [path, item] of remoteByPath) {
      if (mappedPaths.has(path)) continue
      const fetched = await client.noteGet(path)
      const parsed = parseMarkdown(fetched?.content)
      if (!parsed.body) continue
      const incoming = payloadFromMarkdown(parsed, null)
      const known = incoming.remoteId ? notes.find((note) => note.id === incoming.remoteId) : null
      if (known) {
        await store.applyRemote(
          known.id,
          incoming,
          { path, ...fingerprintOf(fetched ?? item) },
          undefined,
        )
        stats.rebound += 1
        continue
      }
      await store.createFromRemote({ ...incoming, id: incoming.remoteId }, { remote: { path, ...fingerprintOf(fetched ?? item) } })
      if (Array.isArray(incoming.categoryNames) && incoming.categoryNames.length && incoming.remoteId) {
        await store.update({ id: incoming.remoteId, categories: incoming.categoryNames })
      }
      stats.imported += 1
    }

    // 3) 处理「远端文件消失」：真没了才删本地；本地改过就按原路径推回去。
    if (maybeDeleted.length) {
      const fresh = await store.list()
      for (const stale of maybeDeleted) {
        const note = fresh.notes.find((item) => item.id === stale.id)
        if (!note) continue
        if (note.remote?.path && remoteByPath.has(note.remote.path)) continue // 已被 rename 认回
        if (note.remote?.payloadHash === payloadHashOf(note, namesFor(note))) {
          await store.remove({ id: note.id }, { tombstone: false })
          stats.deleted += 1
        } else {
          await pushNote(note, stale.remote?.path)
          stats.pushed += 1
        }
      }
    }

    return stats
  }

  async function syncNow() {
    if (current) return current
    status = { ...status, state: 'running' }
    current = (async () => {
      try {
        const stats = await runOnce()
        status = { ...status, state: 'ok', lastAt: new Date().toISOString(), lastError: null, lastStats: stats }
        return stats
      } catch (error) {
        const message = String(error?.message || error)
        status = { ...status, state: 'error', lastAt: new Date().toISOString(), lastError: message }
        warn(message)
        throw error
      } finally {
        current = null
      }
    })()
    return current
  }

  /** 本地改动后不阻塞本次请求，延后一小会儿再推（合并连点）。 */
  function scheduleSoon(delayMs = 1200) {
    if (timer?.soon) clearTimeout(timer.soon)
    timer = timer || {}
    timer.soon = setTimeout(() => {
      syncNow().catch(() => {})
    }, delayMs)
    timer.soon.unref?.()
  }

  function start() {
    stop()
    timer = { soon: null, every: null }
    timer.every = setInterval(() => {
      syncNow().catch(() => {})
    }, intervalMs)
    timer.every.unref?.()
    scheduleSoon(1500)
  }

  function stop() {
    if (timer?.soon) clearTimeout(timer.soon)
    if (timer?.every) clearInterval(timer.every)
    timer = null
  }

  return {
    syncNow,
    scheduleSoon,
    start,
    stop,
    folder,
    imageFolder: config.imageFolder || 'attachments',
    /** 把一张图传到 vault 的附件目录（返回远端路径）。 */
    uploadFile: (path, bytes, mime) => client.filePut(path, bytes, mime),
    status: () => ({ ...status }),
  }
}

/** 读取 `~/.dsh/dsh-memo/sync.json`；缺失或字段不全时返回 null（同步关闭）。 */
export function readSyncConfig(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return { error: 'sync.json 不是合法 JSON' }
  }
  const api = typeof parsed?.api === 'string' ? parsed.api.trim() : ''
  const apiToken = typeof parsed?.apiToken === 'string' ? parsed.apiToken.trim() : ''
  const vault = typeof parsed?.vault === 'string' ? parsed.vault.trim() : ''
  if (!api || !apiToken || !vault) {
    return { error: 'sync.json 需要 api / apiToken / vault 三个字段' }
  }
  if (parsed.enabled === false) return { error: null, disabled: true }
  return {
    config: {
      api,
      apiToken,
      vault,
      folder: normalizeFolder(parsed.folder),
      imageFolder: normalizeFolder(parsed.imageFolder || 'attachments'),
      intervalMs: Number(parsed.intervalMs) || 60000,
    },
  }
}
