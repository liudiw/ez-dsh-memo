/**
 * dsh-memo 宿主端（Host half）。
 *
 * 三件事：
 *  1. 便签数据持久化到 `~/.dsh/dsh-memo/notes.json`（原子写：临时文件 + rename）。
 *  2. 给浏览器端提供 `POST /dsh-memo/api`（{ method, args } → { ok, result }）与 `GET` 列表。
 *  3. 注册 Agent 工具 `memo`，让模型也能随手记/查便签（与界面共用同一套操作）。
 *
 * 数据只在宿主侧读写；浏览器端不落 localStorage，换浏览器/换设备看到的是同一面墙。
 */
import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSyncEngine, payloadHashOf, readSyncConfig } from './sync.js'

const ROUTE_PATH = '/dsh-memo/api'
const DATA_FILE = join(homedir(), '.dsh', 'dsh-memo', 'notes.json')
const SYNC_FILE = join(homedir(), '.dsh', 'dsh-memo', 'sync.json')
const MAX_TEXT = 4000
const PWA_ROUTE = '/dsh-memo'
const PWA_ICON_DIR = join(dirname(fileURLToPath(import.meta.url)), 'icons')
const SYNC_MASK = (token) => (token ? `••••••${String(token).slice(-4)}` : '')

/** 读 sync.json（不存在就返回空对象）。 */
async function readSyncFile() {
  try {
    return JSON.parse(await readFile(SYNC_FILE, 'utf8'))
  } catch (error) {
    return {}
  }
}

/** 给界面看的配置：**绝不回明文 token**，只告诉有没有、尾号多少。 */
async function syncConfigSnapshot() {
  const config = await readSyncFile()
  return {
    enabled: config.enabled === true,
    api: typeof config.api === 'string' ? config.api : '',
    vault: typeof config.vault === 'string' ? config.vault : '',
    folder: typeof config.folder === 'string' ? config.folder : '便签墙',
    imageFolder: typeof config.imageFolder === 'string' ? config.imageFolder : 'attachments',
    intervalMs: Number.isFinite(Number(config.intervalMs)) ? Number(config.intervalMs) : 60000,
    hasToken: typeof config.apiToken === 'string' && config.apiToken.length > 0,
    tokenHint: SYNC_MASK(config.apiToken),
  };
}

/** 保存配置：token 传空表示「不修改」；写盘保持 600。 */
async function saveSyncConfig(patch) {
  const current = await readSyncFile()
  const next = { ...current }
  for (const key of ['enabled', 'api', 'vault', 'folder', 'imageFolder', 'intervalMs']) {
    if (patch && patch[key] !== undefined) next[key] = patch[key]
  }
  next.enabled = next.enabled === true
  if (typeof next.api === 'string') next.api = next.api.trim().replace(/\/+$/, '')
  if (typeof patch?.apiToken === 'string' && patch.apiToken.trim()) next.apiToken = patch.apiToken.trim()
  if (!next.api) throw new Error('服务地址不能为空')
  if (!/^https?:\/\//i.test(next.api)) throw new Error('服务地址要以 http:// 或 https:// 开头')
  if (!next.vault) throw new Error('Vault 名称不能为空')
  const stamp = Number(next.intervalMs)
  next.intervalMs = Number.isFinite(stamp) && stamp >= 15000 ? Math.round(stamp) : 60000
  const dir = dirname(SYNC_FILE)
  await mkdir(dir, { recursive: true })
  const temp = `${SYNC_FILE}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  await rename(temp, SYNC_FILE)
  return next
}

/** 安卓壳 APK：构建时由 ../dsh-memo-app/build.sh 拷进来。 */
const APP_APK_PATH = join(dirname(fileURLToPath(import.meta.url)), 'app', 'dsh-memo.apk')
const IMAGE_DIR = join(homedir(), '.dsh', 'dsh-memo', 'images')
/** 每日回顾的「今天推过没有」标记。 */
const DIGEST_MARK = join(homedir(), '.dsh', 'dsh-memo', '.digest.json')
/** 回收站保留时长。 */
const TRASH_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** 推送通道配置（可选）：不配就只在网页里提醒。 */
const REMIND_CONFIG = join(homedir(), '.dsh', 'dsh-memo', 'remind.json')
const IMAGE_ROUTE = '/dsh-memo/images'
const IMAGE_REF = 'dsh-memo://'
const IMAGE_MAX_BYTES = 8 * 1024 * 1024
const IMAGE_TTL_MS = 24 * 3600 * 1000
/** mime → 扩展名：只收这几种（浏览器粘贴/截图基本都是 png/webp/jpeg）。 */
const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const MAX_CATEGORIES = 100
const MAX_CATEGORY_NAME = 40
const MAX_NOTES = 500
/** JSON 请求体上限：要能容纳一张 8MB 图片的 base64（约 11MB）。 */
const BODY_LIMIT = 12 * 1024 * 1024
const COLORS = ['amber', 'rose', 'sky', 'green', 'violet']
const DEFAULT_COLOR = 'amber'
/** 便签尺寸（像素）：默认宽高同时也是缩小的下限，界面与宿主共用同一组数字。 */
const DEFAULT_NOTE_WIDTH = 260
const DEFAULT_NOTE_HEIGHT = 150
const MAX_WIDTH = 900
const MAX_HEIGHT = 900

export const name = 'dsh-memo'
export const inject = ['webServer']

function nowIso() {
  return new Date().toISOString()
}

function messageOf(error) {
  return String(error?.message ?? error ?? '未知错误')
}

/** 清洗便签正文：统一换行、去首尾空白、截断。 */
function cleanText(value, max = MAX_TEXT) {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n?/g, '\n').trim().slice(0, max)
}

function cleanColor(value) {
  return typeof value === 'string' && COLORS.includes(value) ? value : DEFAULT_COLOR
}

/** 尺寸规整：非数字 → null（= 自动），其余四舍五入后夹在边界内。 */
function cleanSize(value, min, max) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.min(max, Math.max(min, Math.round(number)))
}

/** 分类名清洗：折叠空白、去首尾、限长。 */
function cleanCategoryName(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_CATEGORY_NAME)
}

function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = cleanCategoryName(raw.name)
  if (!name) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : randomUUID(),
    name,
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso(),
    order: Number.isFinite(Number(raw.order)) ? Math.round(Number(raw.order)) : null,
  }
}

/** 分类 id 列表：去重、丢掉非字符串。 */
function cleanCategoryIds(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const ids = []
  for (const item of value) {
    if (typeof item !== 'string' || !item || seen.has(item)) continue
    seen.add(item)
    ids.push(item)
  }
  return ids
}

/** 同步元数据：指向 vault 里的那份 md，以及上次同步时的内容指纹。 */
function normalizeRemote(raw) {
  if (!raw || typeof raw !== 'object') return null
  const path = typeof raw.path === 'string' ? raw.path.trim() : ''
  if (!path) return null
  return {
    path,
    lastTime: Number.isFinite(Number(raw.lastTime)) ? Number(raw.lastTime) : null,
    version: Number.isFinite(Number(raw.version)) ? Number(raw.version) : null,
    payloadHash: typeof raw.payloadHash === 'string' ? raw.payloadHash : null,
    syncedAt: typeof raw.syncedAt === 'string' ? raw.syncedAt : null,
  }
}

function normalizeTombstone(raw) {
  if (!raw || typeof raw !== 'object') return null
  const path = typeof raw.path === 'string' ? raw.path.trim() : ''
  if (!path) return null
  return { path, at: typeof raw.at === 'string' ? raw.at : nowIso() }
}

/** 把磁盘上的任意条目收敛成合法便签；空正文返回 null（丢弃）。 */
/** 重复规则：none 表示一次性；weekly 记 weekday（0=周日）。 */
const REPEAT_KINDS = ['none', 'daily', 'weekly', 'monthly']

/** 只在东八区之外也用绝对时刻：统一存带偏移的 ISO。 */
function cleanRemindAt(value) {
  if (value === null || value === undefined || value === '') return null
  const stamp = typeof value === 'number' ? value : Date.parse(String(value))
  if (!Number.isFinite(stamp)) return null
  const date = new Date(stamp)
  if (Number.isNaN(date.getTime())) return null
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  const local = new Date(date.getTime() + offset * 60000)
  return `${local.toISOString().slice(0, 19)}${sign}${pad(offset / 60)}:${pad(offset % 60)}`
}

function cleanRepeat(value) {
  if (!value || typeof value !== 'object') return null
  const kind = REPEAT_KINDS.includes(value.kind) ? value.kind : 'none'
  if (kind === 'none') return null
  const weekday = Number.isInteger(value.weekday) ? ((value.weekday % 7) + 7) % 7 : null
  const out = { kind }
  if (kind === 'weekly') out.weekday = weekday === null ? new Date().getDay() : weekday
  return out
}

/** 下一次触发时刻：在 from 之后按规则往后推，找不到就返回 null。 */
function nextOccurrence(iso, repeat, from) {
  const start = Date.parse(iso)
  if (!Number.isFinite(start)) return null
  if (!repeat || repeat.kind === 'none') return null
  const after = Math.max(Number.isFinite(from) ? from : Date.now(), start)
  const cursor = new Date(start)
  for (let guard = 0; guard < 400; guard += 1) {
    if (repeat.kind === 'daily') cursor.setDate(cursor.getDate() + 1)
    else if (repeat.kind === 'weekly') cursor.setDate(cursor.getDate() + 7)
    else if (repeat.kind === 'monthly') cursor.setMonth(cursor.getMonth() + 1)
    else return null
    if (cursor.getTime() > after) return cursor
  }
  return null
}

/** 到点了吗（没完成、有提醒、且这一次还没提醒过）。 */
function isReminderDue(note, now) {
  if (!note || note.done === true) return false
  if (!note.remindAt) return false
  const due = Date.parse(note.remindAt)
  if (!Number.isFinite(due) || due > now) return false
  return note.firedKey !== note.remindAt
}

function normalizeNote(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = cleanText(raw.text)
  if (!text) return null
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso()
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : randomUUID(),
    text,
    color: cleanColor(raw.color),
    pinned: raw.pinned === true,
    // null 表示「默认尺寸」：宽高都回落到 DEFAULT_NOTE_*。
    width: cleanSize(raw.width, DEFAULT_NOTE_WIDTH, MAX_WIDTH),
    height: cleanSize(raw.height, DEFAULT_NOTE_HEIGHT, MAX_HEIGHT),
    // 墙面上的手工顺序（越小越靠前）；null 交给加载时补齐。
    order: Number.isFinite(Number(raw.order)) ? Math.round(Number(raw.order)) : null,
    // 所属分类（多对多，一张便签可以挂多个）
    categoryIds: cleanCategoryIds(raw.categoryIds),
    // 提醒（挂在便签上）：绝对时刻 + 重复规则 + 是否已完成 + 已经提醒过的那一次
    remindAt: cleanRemindAt(raw.remindAt),
    repeat: cleanRepeat(raw.repeat),
    done: raw.done === true,
    firedKey: typeof raw.firedKey === 'string' && raw.firedKey ? raw.firedKey : null,
    // 归档：不在主墙显示，但保留数据（也留在 vault 里）
    archived: raw.archived === true,
    createdAt,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : createdAt,
    remote: normalizeRemote(raw.remote),
    ...(raw.syncConflict === true ? { syncConflict: true } : {}),
  }
}

/** 老数据没有 order：按现有观感（置顶优先、创建时间倒序）补 0..n-1，返回是否改动过。 */
function backfillOrder(notes) {
  if (notes.every((note) => Number.isFinite(note.order))) return false
  const visual = notes.slice().sort((left, right) => {
    const pinDelta = Number(Boolean(right.pinned)) - Number(Boolean(left.pinned))
    if (pinDelta !== 0) return pinDelta
    return (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
  })
  visual.forEach((note, index) => { note.order = index })
  return true
}

/** 剔除指向已删除分类的 id；返回是否改动过。 */
function pruneCategoryIds(state) {
  const known = new Set(state.categories.map((category) => category.id))
  let changed = false
  for (const note of state.notes) {
    const next = (note.categoryIds || []).filter((id) => known.has(id))
    if (next.length !== (note.categoryIds || []).length) {
      note.categoryIds = next
      changed = true
    }
  }
  return changed
}

/** 分类也补 order（按 createdAt 正序），返回是否改动过。 */
function backfillCategoryOrder(categories) {
  if (categories.every((category) => Number.isFinite(category.order))) return false
  categories
    .slice()
    .sort((left, right) => (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0))
    .forEach((category, index) => { category.order = index })
  return true
}

/**
 * 图片仓库：内容寻址存盘（sha256 前 24 位做文件名），天然去重；
 * 便签正文里只留 `![](dsh-memo://<name>)` 这种短引用。
 */
function createImageStore(dir, warn) {
  const namePattern = /^[a-f0-9]{8,64}\.(png|jpg|jpeg|webp|gif)$/

  const indexFile = join(dir, 'index.json')
  let index = null
  let indexWriting = Promise.resolve()

  async function readIndex() {
    if (index) return index
    try {
      const raw = await readFile(indexFile, 'utf8')
      const parsed = JSON.parse(raw)
      index = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch (error) {
      index = {}
    }
    return index
  }

  function writeIndex() {
    const body = `${JSON.stringify(index, null, 2)}\n`
    indexWriting = indexWriting.then(async () => {
      await mkdir(dir, { recursive: true })
      const temp = `${indexFile}.${process.pid}.tmp`
      await writeFile(temp, body, 'utf8')
      await rename(temp, indexFile)
    }).catch(() => {})
    return indexWriting
  }

  /**
   * 保存一张图：本地永远留一份缓存（墙面/断网都能显示），
   * 配了 fast-note-sync 就同时传到 vault 的附件目录，正文里用 vault 路径（Obsidian 能认）。
   */
  async function save(dataUrl, options = {}) {
    const raw = String(dataUrl || '').trim()
    const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(raw)
    if (!match) throw new Error('图片格式不支持（需要 data:image/...;base64）')
    const mime = match[1].toLowerCase()
    const extension = IMAGE_TYPES[mime]
    if (!extension) throw new Error(`不支持的图片类型：${mime}`)
    const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64')
    if (!buffer.length) throw new Error('图片内容为空')
    if (buffer.length > IMAGE_MAX_BYTES) {
      throw new Error(`图片太大（上限 ${Math.round(IMAGE_MAX_BYTES / 1024 / 1024)}MB）`)
    }
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 24)
    const name = `${hash}.${extension}`
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, name), buffer)

    const stored = await readIndex()
    const record = stored[name] || {}
    let remotePath = record.remotePath || null
    let remoteError = null

    if (!remotePath && typeof options.upload === 'function') {
      try {
        remotePath = await options.upload(name, buffer, mime)
        stored[name] = { remotePath, uploadedAt: nowIso(), mime, size: buffer.length }
        await writeIndex()
      } catch (error) {
        // 传远端失败不影响本地可用，只是正文里用本地引用
        remoteError = messageOf(error)
      }
    }

    return {
      name,
      mime,
      size: buffer.length,
      url: `${IMAGE_ROUTE}/${name}`,
      // 远端成功：用 vault 根路径（Obsidian 能显示）；否则退回本地引用
      markdown: remotePath ? `![](/${remotePath})` : `![](${IMAGE_REF}${name})`,
      remotePath,
      remoteError,
    }
  }

  async function read(name) {
    if (!namePattern.test(name)) return null
    try {
      const bytes = await readFile(join(dir, name))
      const extension = name.split('.').pop()
      const mime = extension === 'png' ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg'
          : extension === 'webp' ? 'image/webp'
            : 'image/gif'
      return { bytes, mime }
    } catch (error) {
      return null
    }
  }

  /** 清理不再被任何便签引用、且已经放了一天的图片（避免误删刚上传还没保存的）。 */
  async function gc(referenced) {
    let names = []
    try {
      names = await readdir(dir)
    } catch (error) {
      return 0
    }
    let removed = 0
    const now = Date.now()
    for (const name of names) {
      if (referenced.has(name)) continue
      try {
        const info = await stat(join(dir, name))
        if (now - info.mtimeMs < IMAGE_TTL_MS) continue
        await unlink(join(dir, name))
        removed += 1
        const stored = await readIndex()
        if (stored[name]) {
          delete stored[name]
          await writeIndex()
        }
      } catch (error) {
        /* 单个文件删不掉就跳过 */
      }
    }
    if (removed) warn(`清理了 ${removed} 张没人引用的图片`)
    return removed
  }

  return {
    save,
    read,
    gc,
    dir,
    /** 某张图已经传到的远端路径（没传过返回 null）。 */
    async remotePathOf(name) {
      const stored = await readIndex()
      return (stored[name] && stored[name].remotePath) || null
    },
    /** 记下「这张图在远端哪」，避免重复上传。 */
    async recordRemote(name, remotePath, mime, size) {
      const stored = await readIndex()
      stored[name] = { remotePath, uploadedAt: nowIso(), mime, size }
      await writeIndex()
    },
  }
}

/** 收集**某一条**便签正文里的本地图片引用名（`dsh-memo://` 那种）。 */
function imageRefsOfNote(note) {
  const names = []
  const pattern = new RegExp(`${IMAGE_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([A-Za-z0-9._-]+)`, 'g')
  const text = String(note.text || '')
  let match = pattern.exec(text)
  while (match) {
    if (names.indexOf(match[1]) < 0) names.push(match[1])
    match = pattern.exec(text)
  }
  return names
}

/** 从所有便签正文里收集图片引用名。 */
function collectImageRefs(notes) {
  const names = new Set()
  const pattern = new RegExp(`${IMAGE_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([A-Za-z0-9._-]+)`, 'g')
  for (const note of notes) {
    const text = String(note.text || '')
    let match = pattern.exec(text)
    while (match) {
      names.add(match[1])
      match = pattern.exec(text)
    }
  }
  return names
}

/**
 * 一个串行化的便签仓库：读一次进内存，写入排队，落盘用临时文件 rename。
 * 串行化保证并发请求（多标签页 / Agent 工具）不会互相覆盖文件。
 */
function createStore(file, warn) {
  let state = null
  let loading = null
  let chain = Promise.resolve()

  async function load() {
    if (state) return state
    if (!loading) {
      loading = (async () => {
        try {
          const text = await readFile(file, 'utf8')
          const parsed = JSON.parse(text)
          const notes = Array.isArray(parsed?.notes)
            ? parsed.notes.map(normalizeNote).filter(Boolean)
            : []
          const tombstones = Array.isArray(parsed?.tombstones)
            ? parsed.tombstones.map(normalizeTombstone).filter(Boolean)
            : []
          const categories = Array.isArray(parsed?.categories)
            ? parsed.categories.map(normalizeCategory).filter(Boolean)
            : []
          const trash = Array.isArray(parsed?.trash)
            ? parsed.trash
              .map((item) => {
                const note = normalizeNote(item)
                return note ? { ...note, deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : nowIso() } : null
              })
              .filter(Boolean)
            : []
          state = { version: 1, notes, tombstones, categories, trash }
          let dirty = backfillOrder(state.notes)
          // 回收站只留 7 天
          const keepAfter = Date.now() - TRASH_TTL_MS
          const kept = state.trash.filter((item) => (Date.parse(item.deletedAt) || 0) >= keepAfter)
          if (kept.length !== state.trash.length) {
            state.trash = kept
            dirty = true
          }
          if (pruneCategoryIds(state)) dirty = true
          if (backfillCategoryOrder(state.categories)) dirty = true
          if (dirty) {
            try {
              await persist()
            } catch (error) {
              warn(`补写便签顺序失败：${messageOf(error)}`)
            }
          }
        } catch (error) {
          if (error?.code !== 'ENOENT') {
            warn(`读取便签文件失败，已按空墙启动：${messageOf(error)}`)
          }
          state = { version: 1, notes: [], tombstones: [], categories: [], trash: [] }
        }
        return state
      })()
    }
    return loading
  }

  async function persist() {
    const body = `${JSON.stringify(state, null, 2)}\n`
    await mkdir(dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    await writeFile(temp, body, 'utf8')
    await rename(temp, file)
  }

  function exclusive(operation) {
    const run = chain.then(operation, operation)
    chain = run.then(() => undefined, () => undefined)
    return run
  }

  function snapshot() {
    return state.notes.map((note) => ({ ...note, categoryIds: (note.categoryIds || []).slice() }))
  }

  /** 回收站：最近删除的排在前面。 */
  function trashSnapshot(current) {
    const source = (current || state || {}).trash || []
    return source
      .slice()
      .sort((left, right) => (Date.parse(right.deletedAt) || 0) - (Date.parse(left.deletedAt) || 0))
      .map((note) => ({
        id: note.id,
        text: note.text,
        color: note.color,
        deletedAt: note.deletedAt,
        categoryIds: (note.categoryIds || []).slice(),
        remindAt: note.remindAt || null,
      }))
  }

  /** 分类列表：按 order 排（新建的排在最后）。 */
  function categorySnapshot() {
    return state.categories
      .slice()
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || left.name.localeCompare(right.name))
      .map((category) => ({ ...category }))
  }

  const nextCategoryOrder = () => state.categories.reduce((max, category) => (
    Number.isFinite(category.order) ? Math.max(max, category.order) : max
  ), -1) + 1

  /** 只保留真实存在的分类 id。 */
  function resolveIds(input) {
    const known = new Set(state.categories.map((category) => category.id))
    return cleanCategoryIds(input).filter((id) => known.has(id))
  }

  /** 按名字找分类，不存在就新建（工具/导入用）。 */
  function ensureByName(names) {
    const wanted = (Array.isArray(names) ? names : []).map(cleanCategoryName).filter(Boolean)
    const ids = []
    for (const name of wanted) {
      let category = state.categories.find((item) => item.name.toLowerCase() === name.toLowerCase())
      if (!category) {
        if (state.categories.length >= MAX_CATEGORIES) continue
        category = { id: randomUUID(), name, createdAt: nowIso(), order: nextCategoryOrder() }
        state.categories.push(category)
      }
      if (!ids.includes(category.id)) ids.push(category.id)
    }
    return ids
  }

  return {
    file,
    async list() {
      await load()
      return { notes: snapshot(), categories: categorySnapshot(), trash: trashSnapshot() }
    },
    add(args) {
      return exclusive(async () => {
        const current = await load()
        const text = cleanText(args?.text)
        if (!text) throw new Error('便签内容不能为空')
        if (current.notes.length >= MAX_NOTES) throw new Error(`便签数量已达上限（${MAX_NOTES} 条）`)
        const stamp = nowIso()
        // 新便签排在最前：取现有最小 order - 1，避免整体重排。
        const lowest = current.notes.reduce((min, item) => (Number.isFinite(item.order) ? Math.min(min, item.order) : min), 0)
        const categoryIds = args?.categoryIds !== undefined
          ? resolveIds(args.categoryIds)
          : ensureByName(args?.categories)
        const note = {
          id: randomUUID(),
          text,
          color: cleanColor(args?.color),
          pinned: args?.pinned === true,
          width: cleanSize(args?.width, DEFAULT_NOTE_WIDTH, MAX_WIDTH),
          height: cleanSize(args?.height, DEFAULT_NOTE_HEIGHT, MAX_HEIGHT),
          order: lowest - 1,
          categoryIds,
          remindAt: cleanRemindAt(args?.remindAt),
          repeat: cleanRepeat(args?.repeat),
          done: args?.done === true,
          firedKey: null,
          createdAt: stamp,
          updatedAt: stamp,
        }
        current.notes.push(note)
        await persist()
        return { notes: snapshot(), categories: categorySnapshot(), note: { ...note } }
      })
    },
    update(args) {
      return exclusive(async () => {
        const current = await load()
        const id = typeof args?.id === 'string' ? args.id : ''
        const note = current.notes.find((item) => item.id === id)
        if (!note) throw new Error(`没找到这张便签：${id || '(空 id)'}`)
        let changed = false
        if (args?.text !== undefined) {
          const text = cleanText(args.text)
          if (!text) throw new Error('便签内容不能为空')
          if (text !== note.text) {
            note.text = text
            changed = true
          }
        }
        if (args?.color !== undefined) {
          const color = cleanColor(args.color)
          if (color !== note.color) {
            note.color = color
            changed = true
          }
        }
        if (args?.pinned !== undefined) {
          const pinned = args.pinned === true
          if (pinned !== note.pinned) {
            note.pinned = pinned
            changed = true
          }
        }
        // 尺寸：显式传 null 表示恢复自动（宽度默认值 + 高度随内容）。
        if (args?.width !== undefined) {
          const width = cleanSize(args.width, DEFAULT_NOTE_WIDTH, MAX_WIDTH)
          if (width !== note.width) {
            note.width = width
            changed = true
          }
        }
        if (args?.height !== undefined) {
          const height = cleanSize(args.height, DEFAULT_NOTE_HEIGHT, MAX_HEIGHT)
          if (height !== note.height) {
            note.height = height
            changed = true
          }
        }
        // 提醒：remindAt 传 null 清空；改时间时把 firedKey 一起清掉（否则新时间点会被当成已提醒）。
        if (args?.remindAt !== undefined) {
          const remindAt = cleanRemindAt(args.remindAt)
          if (remindAt !== note.remindAt) {
            note.remindAt = remindAt
            note.firedKey = null
            changed = true
          }
        }
        if (args?.repeat !== undefined) {
          const repeat = cleanRepeat(args.repeat)
          if (JSON.stringify(repeat) !== JSON.stringify(note.repeat)) {
            note.repeat = repeat
            changed = true
          }
        }
        if (args?.done !== undefined) {
          const done = args.done === true
          if (done !== note.done) {
            note.done = done
            if (done) note.firedKey = null
            changed = true
          }
        }
        // 分类：传 categoryIds 用 id 覆盖；传 categories 用名字覆盖（不存在则新建）。
        if (args?.categoryIds !== undefined) {
          const categoryIds = resolveIds(args.categoryIds)
          if (JSON.stringify(categoryIds) !== JSON.stringify(note.categoryIds || [])) {
            note.categoryIds = categoryIds
            changed = true
          }
        } else if (args?.categories !== undefined) {
          const categoryIds = ensureByName(args.categories)
          if (JSON.stringify(categoryIds) !== JSON.stringify(note.categoryIds || [])) {
            note.categoryIds = categoryIds
            changed = true
          }
        }
        if (changed) {
          note.updatedAt = nowIso()
          await persist()
        }
        return { notes: snapshot(), categories: categorySnapshot(), note: { ...note } }
      })
    },
    remove(args, options = {}) {
      return exclusive(async () => {
        const current = await load()
        const id = typeof args?.id === 'string' ? args.id : ''
        const index = current.notes.findIndex((item) => item.id === id)
        if (index < 0) throw new Error(`没找到这张便签：${id || '(空 id)'}`)
        const [removed] = current.notes.splice(index, 1)
        // 用户删的便签：记一条墓碑，让同步去删远端那份 md。
        if (options.tombstone !== false && removed?.remote?.path) {
          current.tombstones = [
            ...current.tombstones.filter((entry) => entry.path !== removed.remote.path),
            { path: removed.remote.path, at: nowIso() },
          ]
        }
        // 进回收站而不是直接抹掉：7 天内可以恢复。
        if (options.tombstone !== false) {
          current.trash = [
            ...current.trash.filter((item) => item.id !== removed.id),
            { ...removed, deletedAt: nowIso() },
          ]
        }
        await persist()
        return { notes: snapshot(), categories: categorySnapshot(), trash: trashSnapshot(current), removed: id }
      })
    },
    async tombstones() {
      await load()
      return state.tombstones.map((entry) => ({ ...entry }))
    },
    dropTombstone(path) {
      return exclusive(async () => {
        const current = await load()
        const before = current.tombstones.length
        current.tombstones = current.tombstones.filter((entry) => entry.path !== path)
        if (current.tombstones.length !== before) await persist()
        return current.tombstones.length
      })
    },
    /**
     * 记录某条便签已同步到的远端坐标。`payloadHash` 一律由这里按**当前存储内容**算，
     * 同步引擎不再自己算（避免「记录的值和真实内容对不上 → 永远判成本地有改动」）。
     * `expectedHash` 是推送时用的指纹：若推送期间用户又改了这条便签，就放弃记录，
     * 下一轮会重新推，绝不会出现「远端旧内容 + 已标记同步」的假同步。
     */
    setRemote(id, remote, expectedHash) {
      return exclusive(async () => {
        const current = await load()
        const note = current.notes.find((item) => item.id === id)
        if (!note) return { ok: false, reason: 'missing' }
        if (expectedHash !== undefined && payloadHashOf(note) !== expectedHash) {
          return { ok: false, reason: 'changed' }
        }
        const next = normalizeRemote(remote)
        if (!next) return { ok: false, reason: 'invalid' }
        note.remote = { ...next, payloadHash: payloadHashOf(note) }
        await persist()
        return { ok: true, hash: note.remote.payloadHash }
      })
    },
    /**
     * 用远端内容覆盖本地便签。整个过程在同一个串行事务里完成：检查守卫 → 应用 → 记录指纹，
     * 所以不会出现「明明没应用却已经记成已同步」或反过来的情况。
     * 返回 `{ applied, previousText }`：调用方要用 previousText 决定是否留冲突副本。
     */
    applyRemote(id, payload, remote, expectedHash) {
      return exclusive(async () => {
        const current = await load()
        const note = current.notes.find((item) => item.id === id)
        if (!note) return { applied: false, reason: 'missing' }
        if (expectedHash !== undefined && payloadHashOf(note) !== expectedHash) {
          return { applied: false, reason: 'changed' }
        }
        const text = cleanText(payload?.text)
        if (!text) return { applied: false, reason: 'empty' }
        const previousText = note.text
        const before = payloadHashOf(note)
        note.text = text
        if (payload?.color !== undefined) note.color = cleanColor(payload.color)
        if (payload?.pinned !== undefined) note.pinned = payload.pinned === true
        if (payload?.width !== undefined) note.width = cleanSize(payload.width, DEFAULT_NOTE_WIDTH, MAX_WIDTH)
        if (payload?.height !== undefined) note.height = cleanSize(payload.height, DEFAULT_NOTE_HEIGHT, MAX_HEIGHT)
        if (payloadHashOf(note) !== before) note.updatedAt = nowIso()
        const next = normalizeRemote(remote)
        if (next) note.remote = { ...next, payloadHash: payloadHashOf(note) }
        delete note.syncConflict
        await persist()
        return { applied: true, previousText }
      })
    },
    /**
     * 提醒触发：只有当便签此刻确实到点时才动它（原子去重）。
     * 返回 { fired, note, nextRemindAt }；重复提醒会把 remindAt 推到下一次。
     */
    fireReminder(id, now) {
      return exclusive(async () => {
        const current = await load()
        const note = current.notes.find((item) => item.id === id)
        if (!note) return { fired: false }
        const stamp = Number.isFinite(now) ? now : Date.now()
        if (!isReminderDue(note, stamp)) return { fired: false }
        const firedKey = note.remindAt
        const next = nextOccurrence(note.remindAt, note.repeat, stamp)
        note.firedKey = firedKey
        if (next) note.remindAt = cleanRemindAt(next.toISOString())
        note.updatedAt = nowIso()
        await persist()
        return { fired: true, note: { ...note }, firedKey, nextRemindAt: note.remindAt }
      })
    },
    /** 所有此刻到点的便签（宿主定时器用）。 */
    async dueNotes(now) {
      const current = await load()
      const stamp = Number.isFinite(now) ? now : Date.now()
      return current.notes.filter((note) => isReminderDue(note, stamp))
    },
    /** 仅当正文仍等于 expected 时才替换（图片迁移用，避免覆盖用户刚改的内容）。 */
    replaceTextIfUnchanged(id, expected, next) {
      return exclusive(async () => {
        const current = await load()
        const note = current.notes.find((item) => item.id === id)
        if (!note || note.text !== expected) return false
        note.text = cleanText(next)
        note.updatedAt = nowIso()
        await persist()
        return true
      })
    },
    /** 新建分类（同名直接复用，方便重复点击）。 */
    categoryAdd(args) {
      return exclusive(async () => {
        const current = await load()
        const name = cleanCategoryName(args?.name)
        if (!name) throw new Error('分类名不能为空')
        const existing = current.categories.find((item) => item.name.toLowerCase() === name.toLowerCase())
        if (!existing) {
          if (current.categories.length >= MAX_CATEGORIES) throw new Error(`分类数量已达上限（${MAX_CATEGORIES} 个）`)
          current.categories.push({ id: randomUUID(), name, createdAt: nowIso(), order: nextCategoryOrder() })
          await persist()
        }
        const category = existing || current.categories[current.categories.length - 1]
        return { notes: snapshot(), categories: categorySnapshot(), category: { ...category } }
      })
    },
    /** 重命名分类。 */
    /** 恢复回收站里的便签（重新上墙，并清掉删除墓碑，同步会重新推送 md）。 */
    restore(args) {
      return exclusive(async () => {
        const current = await load()
        const id = typeof args?.id === 'string' ? args.id : ''
        const index = current.trash.findIndex((item) => item.id === id)
        if (index < 0) throw new Error(`回收站里没有这张便签：${id || '(空 id)'}`)
        const [note] = current.trash.splice(index, 1)
        const clean = normalizeNote({ ...note, archived: false });
        delete clean.deletedAt
        if (!clean) throw new Error('便签内容为空，无法恢复')
        if (current.notes.some((item) => item.id === clean.id)) throw new Error('这张便签已经在墙上了')
        current.notes.push(clean)
        if (note.remote?.path) {
          current.tombstones = current.tombstones.filter((entry) => entry.path !== note.remote.path)
        }
        await persist()
        return { notes: snapshot(), categories: categorySnapshot(), trash: trashSnapshot(current) }
      })
    },
    /** 彻底删除（回收站里的一条）。 */
    purgeTrash(args) {
      return exclusive(async () => {
        const current = await load()
        const id = typeof args?.id === 'string' ? args.id : ''
        const before = current.trash.length
        current.trash = current.trash.filter((item) => item.id !== id)
        if (current.trash.length !== before) await persist()
        return { notes: snapshot(), categories: categorySnapshot(), trash: trashSnapshot(current) }
      })
    },
    /** 清空回收站。 */
    emptyTrash() {
      return exclusive(async () => {
        const current = await load()
        current.trash = []
        await persist()
        return { notes: snapshot(), categories: categorySnapshot(), trash: [] }
      })
    },
    /** 归档 / 取消归档。 */
    archive(args) {
      return exclusive(async () => {
        const current = await load()
        const id = typeof args?.id === 'string' ? args.id : ''
        const note = current.notes.find((item) => item.id === id)
        if (!note) throw new Error(`没找到这张便签：${id || '(空 id)'}`)
        const archived = args?.archived !== false
        if (note.archived !== archived) {
          note.archived = archived
          note.updatedAt = nowIso()
          await persist()
        }
        return { notes: snapshot(), categories: categorySnapshot(), trash: trashSnapshot(current), note: { ...note } }
      })
    },
    /** 分类排序：按传入的 id 顺序重排 order（没传到的排在后面）。 */
    categoryReorder(args) {
      return exclusive(async () => {
        const current = await load()
        const ids = Array.isArray(args?.ids) ? args.ids.filter((id) => typeof id === 'string') : []
        if (!ids.length) return { categories: categorySnapshot(), notes: snapshot() }
        const index = new Map(ids.map((id, position) => [id, position]))
        let changed = false
        current.categories.forEach((category, position) => {
          const next = index.has(category.id) ? index.get(category.id) : ids.length + position
          if (category.order !== next) {
            category.order = next
            changed = true
          }
        })
        if (changed) await persist()
        return { categories: categorySnapshot(), notes: snapshot() }
      })
    },
    categoryUpdate(args) {
      return exclusive(async () => {
        const current = await load()
        const id = typeof args?.id === 'string' ? args.id : ''
        const category = current.categories.find((item) => item.id === id)
        if (!category) throw new Error(`没找到这个分类：${id || '(空 id)'}`)
        const name = cleanCategoryName(args?.name)
        if (!name) throw new Error('分类名不能为空')
        const clash = current.categories.find((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())
        if (clash) throw new Error(`已有同名分类：${clash.name}`)
        if (name !== category.name) {
          category.name = name
          await persist()
        }
        return { notes: snapshot(), categories: categorySnapshot(), category: { ...category } }
      })
    },
    /** 删除分类：同时把便签上对它的引用摘掉。 */
    categoryRemove(args) {
      return exclusive(async () => {
        const current = await load()
        const id = typeof args?.id === 'string' ? args.id : ''
        const index = current.categories.findIndex((item) => item.id === id)
        if (index < 0) throw new Error(`没找到这个分类：${id || '(空 id)'}`)
        current.categories.splice(index, 1)
        for (const note of current.notes) {
          if (!note.categoryIds || !note.categoryIds.includes(id)) continue
          note.categoryIds = note.categoryIds.filter((entry) => entry !== id)
          note.updatedAt = nowIso()
        }
        await persist()
        return { notes: snapshot(), categories: categorySnapshot(), removed: id }
      })
    },
    /** 把指定便签（不传 ids 就全部）恢复成默认尺寸，让墙回到「默认尺寸排列」。 */
    resetSizes(args) {
      return exclusive(async () => {
        const current = await load()
        const wanted = Array.isArray(args?.ids) ? new Set(args.ids.filter((id) => typeof id === 'string')) : null
        let changed = false
        for (const note of current.notes) {
          if (wanted && !wanted.has(note.id)) continue
          if (note.width === null && note.height === null) continue
          note.width = null
          note.height = null
          note.updatedAt = nowIso()
          changed = true
        }
        if (changed) await persist()
        return { notes: snapshot(), categories: categorySnapshot() }
      })
    },
    /** 手工排序：按给定顺序重排 order；可顺带改某几条的置顶状态。 */
    reorder(args) {
      return exclusive(async () => {
        const current = await load()
        const items = Array.isArray(args?.items) ? args.items : []
        const wanted = new Map()
        items.forEach((item, index) => {
          if (!item || typeof item.id !== 'string') return
          wanted.set(item.id, { order: index, pinned: typeof item.pinned === 'boolean' ? item.pinned : undefined })
        })
        if (!wanted.size) throw new Error('排序内容不能为空')
        let changed = false
        for (const note of current.notes) {
          const target = wanted.get(note.id)
          if (!target) continue
          if (note.order !== target.order) {
            note.order = target.order
            changed = true
          }
          if (target.pinned !== undefined && target.pinned !== note.pinned) {
            note.pinned = target.pinned
            changed = true
          }
        }
        if (changed) await persist()
        return { notes: snapshot(), categories: categorySnapshot() }
      })
    },
    /** 从远端内容新建一张便签（vault 里新建的 md、或冲突副本）。 */
    createFromRemote(payload, options = {}) {
      return exclusive(async () => {
        const current = await load()
        if (current.notes.length >= MAX_NOTES) throw new Error(`便签数量已达上限（${MAX_NOTES} 条）`)
        const preferred = typeof payload?.id === 'string' && payload.id && !current.notes.some((item) => item.id === payload.id)
          ? payload.id
          : randomUUID()
        const stamp = nowIso()
        const note = normalizeNote({
          id: preferred,
          text: payload?.text,
          color: payload?.color,
          pinned: payload?.pinned,
          width: payload?.width,
          height: payload?.height,
          createdAt: typeof payload?.createdAt === 'string' && payload.createdAt ? payload.createdAt : stamp,
          updatedAt: stamp,
        })
        if (!note) return null
        if (options.conflict === true) note.syncConflict = true
        const remote = normalizeRemote(options.remote)
        if (remote) note.remote = { ...remote, payloadHash: payloadHashOf(note) }
        // 新便签排在最前（冲突副本也如此，方便一眼看到）。
        const lowest = current.notes.reduce((min, item) => (Number.isFinite(item.order) ? Math.min(min, item.order) : min), 0)
        if (!Number.isFinite(note.order)) note.order = lowest - 1
        current.notes.push(note)
        await persist()
        return { ...note }
      })
    },
  }
}

/**
 * 提醒运行时：
 * - 每 15 秒扫一次，到点的便签原子地「标记+推进」（store.fireReminder 内部去重）
 * - 事件进内存队列，客户端轮询 firedSince 拿走去弹窗（用 seq 游标，不支持回放历史）
 * - 如果配了 remind.json 的 webhook，顺手推一条（手机能收到，不需要网页开着）
 */
function createReminderRuntime({ store, warn, onFired }) {
  const events = []
  const MAX_EVENTS = 60
  let seq = 0
  let timer = null
  let busy = false
  let config = null
  let configStamp = 0

  async function readConfig() {
    try {
      const info = await stat(REMIND_CONFIG)
      if (info.mtimeMs === configStamp && config) return config
      configStamp = info.mtimeMs
      config = JSON.parse(await readFile(REMIND_CONFIG, 'utf8'))
    } catch (error) {
      config = null
      configStamp = 0
    }
    return config
  }

  function renderBody(template, vars, jsonEscape) {
    return String(template).replace(/\{\{(\w+)\}\}/g, (whole, key) => {
      if (!(key in vars)) return whole
      const value = String(vars[key] ?? '')
      return jsonEscape ? JSON.stringify(value).slice(1, -1) : value
    })
  }

  /** 每日回顾发过没有（只记日期，避免重启后重复推）。 */
  async function readDigestMark() {
    try {
      const parsed = JSON.parse(await readFile(DIGEST_MARK, 'utf8'))
      return typeof parsed?.date === 'string' ? parsed.date : ''
    } catch (error) {
      return ''
    }
  }

  async function postBody(settings, body, contentType) {
    const response = await fetch(settings.url, {
      method: typeof settings.method === 'string' ? settings.method : 'POST',
      headers: { 'content-type': contentType },
      body,
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) warn(`提醒推送失败：HTTP ${response.status}`)
  }

  /** 到点（默认 09:00）推一条「今日待办」摘要。 */
  async function maybeDailyDigest(now) {
    try {
      const settings = await readConfig()
      const daily = settings && settings.daily
      if (!settings || settings.enabled !== true || !daily || daily.enabled !== true) return
      const stamp = new Date(now)
      const pad = (value) => String(value).padStart(2, '0')
      const today = `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`
      const clock = `${pad(stamp.getHours())}:${pad(stamp.getMinutes())}`
      const target = typeof daily.time === 'string' && /^\d{2}:\d{2}$/.test(daily.time) ? daily.time : '09:00'
      if (clock < target) return
      if (await readDigestMark() === today) return
      const listed = await store.list()
      const pending = listed.notes
        .filter((note) => note.archived !== true && note.done !== true && note.remindAt)
        .sort((left, right) => (Date.parse(left.remindAt) || 0) - (Date.parse(right.remindAt) || 0))
      const added = listed.notes.filter((note) => note.archived !== true && String(note.createdAt || '').slice(0, 10) === today).length
      const overdue = pending.filter((note) => (Date.parse(note.remindAt) || 0) <= now).length
      const list = pending.slice(0, 8).map((note) => {
        const stamp2 = Date.parse(note.remindAt)
        const when = Number.isFinite(stamp2) ? new Date(stamp2).toTimeString().slice(0, 5) : ''
        const head = String(note.text || '').replace(/\s+/g, ' ').slice(0, 40)
        return `- ${when ? `${when} ` : ''}${head}`
      }).join('\n') || '- （今天没有待办）'
      const template = typeof daily.body === 'string' && daily.body
        ? daily.body
        : '今日待办 {{count}} 条（逾期 {{overdue}}）\n{{list}}\n\n昨天到今天新增 {{added}} 条便签'
      const contentType = typeof daily.contentType === 'string' ? daily.contentType : (typeof settings.contentType === 'string' ? settings.contentType : 'text/plain')
      const body = renderBody(template, { count: pending.length, overdue, added, list, date: today }, /json/i.test(contentType))
      await postBody(settings, body, contentType)
      await writeFile(DIGEST_MARK, `${JSON.stringify({ date: today }, null, 2)}\n`, 'utf8')
      warn(`已推送每日回顾（${pending.length} 条待办）`)
    } catch (error) {
      warn(`每日回顾失败：${messageOf(error)}`)
    }
  }

  async function postWebhook(event) {
    const settings = await readConfig()
    if (!settings || settings.enabled !== true || typeof settings.url !== 'string' || !settings.url) return
    const contentType = typeof settings.contentType === 'string' ? settings.contentType : 'application/json'
    const vars = {
      text: String(event.text || '').slice(0, 200),
      time: event.remindAt || '',
      id: event.noteId || '',
    }
    const template = typeof settings.body === 'string' ? settings.body : '{"text":"{{text}}"}'
    const body = renderBody(template, vars, /json/i.test(contentType))
    await postBody(settings, body, contentType)
  }

  async function scan(now) {
    if (busy) return
    busy = true
    try {
      const due = await store.dueNotes(now)
      for (const note of due) {
        const result = await store.fireReminder(note.id, now)
        if (!result.fired) continue
        seq += 1
        const event = {
          seq,
          noteId: note.id,
          text: String(note.text || '').slice(0, 200),
          remindAt: result.firedKey,
          nextRemindAt: result.nextRemindAt || null,
          repeat: note.repeat || null,
          at: nowIso(),
        }
        events.push(event)
        while (events.length > MAX_EVENTS) events.shift()
        try {
          await postWebhook(event)
        } catch (error) {
          warn(`提醒推送异常：${messageOf(error)}`)
        }
        if (onFired) {
          try {
            onFired()
          } catch (error) {
            /* 同步失败不影响提醒 */
          }
        }
      }
      await maybeDailyDigest(now)
    } catch (error) {
      warn(`提醒扫描失败：${messageOf(error)}`)
    } finally {
      busy = false
    }
  }

  return {
    start() {
      timer = setInterval(() => { scan(Date.now()) }, 15000)
      timer.unref?.()
      scan(Date.now())
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
    },
    /** 客户端拉事件：since 传 null 只取游标（避免一进页面就补弹旧提醒）。 */
    firedSince(since) {
      if (!Number.isFinite(since)) return { events: [], cursor: seq }
      return { events: events.filter((item) => item.seq > since), cursor: seq }
    },
    scan,
  }
}

/** PWA 清单：装到手机主屏后是全屏应用，直接落在便签墙。 */
function buildManifest() {
  return {
    name: '便签墙',
    short_name: '便签墙',
    description: '随手记录灵感的便签墙',
    start_url: '/#memo',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fdf4dc',
    theme_color: '#f5c542',
    icons: [
      { src: `${PWA_ROUTE}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${PWA_ROUTE}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${PWA_ROUTE}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

/** 惰性的 service worker：不接管请求（没有 respondWith），只满足安装判定。 */
const SERVICE_WORKER_SOURCE = [
  "self.addEventListener('install', () => self.skipWaiting())",
  "self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))",
  "self.addEventListener('fetch', () => {})",
  '',
].join('\n')

/**
 * 启动期 polyfill：DSH 前端用了几个很新的 API，老 WebView（例如 Android WebView 113）
 * 会直接抛错卡在 loading plugins。插在 <head> 最前面，早于页面自己的内联脚本。
 */
const BOOT_POLYFILL = `(function () {
  try {
    if (typeof Promise.withResolvers !== 'function') {
      Promise.withResolvers = function () {
        var resolve, reject;
        var promise = new Promise(function (res, rej) { resolve = res; reject = rej; });
        return { promise: promise, resolve: resolve, reject: reject };
      };
    }
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any !== 'function') {
      AbortSignal.any = function (signals) {
        var controller = new AbortController();
        var list = Array.prototype.slice.call(signals || []);
        for (var i = 0; i < list.length; i += 1) {
          if (list[i] && list[i].aborted) {
            controller.abort(list[i].reason);
            return controller.signal;
          }
        }
        for (var j = 0; j < list.length; j += 1) {
          (function (signal) {
            if (!signal) return;
            signal.addEventListener('abort', function () { controller.abort(signal.reason); }, { once: true });
          })(list[j]);
        }
        return controller.signal;
      };
    }
    if (typeof Object.groupBy !== 'function') {
      Object.groupBy = function (items, keyFn) {
        var out = Object.create(null);
        var index = 0;
        for (var item of items) {
          var key = keyFn(item, index++);
          if (Object.prototype.hasOwnProperty.call(out, key)) out[key].push(item);
          else out[key] = [item];
        }
        return out;
      };
    }
    if (typeof Map.groupBy !== 'function') {
      Map.groupBy = function (items, keyFn) {
        var out = new Map();
        var index = 0;
        for (var item of items) {
          var key = keyFn(item, index++);
          if (out.has(key)) out.get(key).push(item);
          else out.set(key, [item]);
        }
        return out;
      };
    }
  } catch (error) {
    /* 补丁失败也不能影响页面启动 */
  }
})();`

/** 往页面 head 里注入 manifest 与移动端 meta（只加我们自己的行）。 */
function injectPwaHead(html) {
  if (typeof html !== 'string' || html.indexOf(`data-dsh-memo-polyfill`) >= 0) return html
  let out = html
  // 1) 启动期 polyfill：必须早于页面自己的内联脚本
  const polyfillTag = `<script data-dsh-memo-polyfill>${BOOT_POLYFILL}</script>`
  const headOpen = /<head[^>]*>/i.exec(out)
  out = headOpen
    ? out.slice(0, headOpen.index + headOpen[0].length) + polyfillTag + out.slice(headOpen.index + headOpen[0].length)
    : polyfillTag + out
  const tags = [
    `<link rel="manifest" href="${PWA_ROUTE}/manifest.webmanifest">`,
    `<link rel="apple-touch-icon" href="${PWA_ROUTE}/icon-192.png">`,
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="便签墙">',
    '<meta name="theme-color" content="#f5c542">',

  ].join('')
  return out.includes('</head>') ? out.replace('</head>', `${tags}</head>`) : `${out}${tags}`
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function readJsonBody(req, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    let size = 0
    let settled = false
    let text = ''
    const onData = (chunk) => {
      if (settled) return
      const piece = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
      size += piece.length
      if (size > limit) {
        settled = true
        req.removeListener('data', onData)
        reject(new Error('请求体过大'))
        return
      }
      text += piece
    }
    req.on('data', onData)
    req.on('end', () => {
      if (settled) return
      settled = true
      const raw = text
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
  })
}

/** 工具结果只给模型看它用得上的字段（尺寸纯属界面概念，不进模型上下文）。 */
function toToolNote(note, categoryNames) {
  return {
    id: note.id,
    text: note.text,
    color: note.color,
    pinned: note.pinned,
    categories: (note.categoryIds || []).map((id) => categoryNames.get(id)).filter(Boolean),
    remindAt: note.remindAt || null,
    repeat: note.repeat ? note.repeat.kind : null,
    done: note.done === true,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

/** 工具与界面共用同一个 store，因此不存在两套写入逻辑。 */
function buildMemoTool(context) {
  const store = context.store
  const sync = context.sync
  return {
    name: 'memo',
    description:
      '便签墙（dsh-memo）操作，与用户在侧边栏「便签墙」看到的是同一份数据，持久化在宿主 ~/.dsh/dsh-memo/notes.json，'
      + '并镜像成 Markdown 同步到 fast-note-sync 的 vault。'
      + 'action: list 列出全部便签；add 新建（需要 text，可选 color/pinned）；update 修改（需要 id，可选 text/color/pinned）；'
      + 'remove 删除（需要 id）；sync 立刻与 fast-note-sync 双向同步一次。'
      + '用户说「记一下/帮我记个想法/我有个灵感」时用 add 把原话简洁记下来。'
      + '分类用 categories 传名字（不存在会自动创建，一张便签可以属于多个分类）。'
      + '便签在墙面上的大小（拖拽右下角调整）是纯界面状态，由用户自己掌握，本工具不涉及。'
      + '另外：用户消息里出现「@便签:标题」时，先用 action get（按 title 或 id）取出那张便签的完整正文再回答，'
      + '不要把「@便签:标题」当成普通文本绕过。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'add', 'update', 'remove', 'sync', 'get'],
          description: '要执行的操作。',
        },
        text: {
          type: 'string',
          description: '便签正文（add 必填；update 可选）。保留用户原意，别扩写。',
        },
        id: {
          type: 'string',
          description: '便签 id（update / remove 必填，可从 list 结果里取）。',
        },
        color: {
          type: 'string',
          enum: COLORS,
          description: '便签颜色，默认 amber。',
        },
        pinned: {
          type: 'boolean',
          description: '是否置顶。',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: '分类名列表（add / update 可用；不存在的分类会自动创建，传空数组表示清空分类）。',
        },
        remindAt: {
          type: 'string',
          description: '提醒时间（add / update 可用）。ISO 时间或任何能被 Date.parse 解析的写法；传空字符串表示清除提醒。',
        },
        repeat: {
          type: 'string',
          enum: ['none', 'daily', 'weekly', 'monthly'],
          description: '重复规则（配合 remindAt）；weekly 按 remindAt 当天的星期几重复。',
        },
        done: {
          type: 'boolean',
          description: '是否已完成（update 可用）；完成后再也不提醒。',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          message: { type: 'string' },
          notes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                color: { type: 'string' },
                pinned: { type: 'boolean' },
                categories: { type: 'array', items: { type: 'string' } },
                remindAt: { type: ['string', 'null'] },
                repeat: { type: ['string', 'null'] },
                done: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
          categories: { type: 'array', items: { type: 'string' } },
        },
      },
      render(args, value) {
        const message = typeof value?.message === 'string' ? value.message : '便签墙已更新'
        const notes = Array.isArray(value?.notes) ? value.notes : []
        const categories = Array.isArray(value?.categories) ? value.categories : []
        const lines = notes.map((note, index) => {
          const flags = [note.color ?? DEFAULT_COLOR]
          if (note.pinned) flags.push('置顶')
          if (Array.isArray(note.categories) && note.categories.length) flags.push(note.categories.join('、'))
          if (note.done) flags.push('已完成')
          else if (note.remindAt) flags.push(`⏰ ${note.remindAt}${note.repeat ? `（${note.repeat}）` : ''}`)
          return `${index + 1}. [${flags.join('｜')}] ${note.text}  {id: ${note.id}, ${note.createdAt}}`
        })
        if (categories.length) lines.push(`\n现有分类：${categories.join('、')}`)
        const body = lines.length ? `${message}\n\n${lines.join('\n')}` : message
        return [{ type: 'text', text: body }]
      },
    },
    async execute(rawArgs) {
      const args = { ...(rawArgs || {}) }
      const action = typeof args?.action === 'string' ? args.action : ''
      // repeat 传的是字符串：转成 store 要的对象（weekly 取 remindAt 当天的星期）
      if (typeof args.repeat === 'string') {
        const kind = args.repeat === 'none' ? null : args.repeat
        if (!kind) args.repeat = null
        else {
          const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const stamp = Date.parse(String(args.remindAt || ''))
          const weekday = Number.isFinite(stamp)
            ? new Date(stamp).getDay()
            : new Date().getDay()
          void weekdays
          args.repeat = { kind, weekday }
        }
      }
      const describe = (result) => {
        const names = new Map((result.categories || []).map((category) => [category.id, category.name]))
        return {
          notes: result.notes.map((note) => toToolNote(note, names)),
          categories: (result.categories || []).map((category) => category.name),
        }
      }
      if (action === 'list') {
        const result = await store.list()
        return { message: `便签墙共 ${result.notes.length} 条`, ...describe(result) }
      }
      if (action === 'add') {
        const result = await store.add(args)
        sync.scheduleSoon()
        return { message: `已贴上新便签（id: ${result.note.id}），墙上共 ${result.notes.length} 条`, ...describe(result) }
      }
      if (action === 'update') {
        const result = await store.update(args)
        sync.scheduleSoon()
        return { message: `已更新便签 ${result.note.id}`, ...describe(result) }
      }
      if (action === 'remove') {
        const result = await store.remove(args)
        sync.scheduleSoon()
        return { message: `已删除便签 ${result.removed}，墙上还剩 ${result.notes.length} 条`, ...describe(result) }
      }
      if (action === 'sync') {
        const stats = await sync.syncNow()
        const result = await store.list()
        return {
          message: `同步完成：推送 ${stats.pushed}、拉取 ${stats.pulled}、导入 ${stats.imported}、删除 ${stats.deleted}、冲突 ${stats.conflicts}`,
          ...describe(result),
        }
      }
      throw new Error(`action 必须是 list / add / update / remove / sync 之一，收到：${action || '(空)'}`)
    },
  }
}

/** 同步运行态：读配置、起引擎、对外只暴露 status/syncNow/scheduleSoon。 */
function createSyncRuntime(store, warn) {
  let engine = null
  let configError = null
  let loaded = false
  const idleStatus = () => ({
    enabled: false,
    state: 'idle',
    lastAt: null,
    lastError: configError,
    lastStats: null,
  })

  const ready = (async () => {
    try {
      const raw = await readFile(SYNC_FILE, 'utf8')
      const parsed = readSyncConfig(raw)
      if (parsed.error) {
        configError = parsed.error
        warn(`同步配置有问题：${parsed.error}`)
      } else if (!parsed.disabled) {
        engine = createSyncEngine({ config: parsed.config, store, warn })
        engine.start()
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        configError = messageOf(error)
        warn(`读取同步配置失败：${configError}`)
      }
    } finally {
      loaded = true
    }
    return engine
  })()
  ready.catch(() => {})

  return {
    ready,
    status() {
      if (!loaded) return { enabled: true, state: 'starting', lastAt: null, lastError: null, lastStats: null }
      if (!engine) return idleStatus()
      return engine.status()
    },
    async syncNow() {
      await ready
      if (!engine) throw new Error(configError ? `同步不可用：${configError}` : '同步未配置（~/.dsh/dsh-memo/sync.json）')
      return engine.syncNow()
    },
    scheduleSoon(delayMs) {
      if (!engine) {
        ready.then((value) => value?.scheduleSoon(delayMs)).catch(() => {})
        return
      }
      engine.scheduleSoon(delayMs)
    },
    /** 把图片传到 vault 的附件目录，按上传日期分子目录，返回远端路径。 */
    async uploadImage(name, bytes, mime) {
      await ready
      if (!engine) throw new Error('同步未配置，图片只存本地')
      const stamp = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      const day = `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`
      const prefix = String(engine.imageFolder || 'attachments').replace(/^\/+|\/+$/g, '')
      const path = `${prefix}/${day}/${name}`
      await engine.uploadFile(path, bytes, mime)
      return path
    },
  }
}

async function dispatch(context, method, args) {
  const store = context.store
  const sync = context.sync
  switch (method) {
    case 'list':
      return store.list()
    case 'get': {
      const wanted = String(args?.id || args?.title || '').trim()
      if (!wanted) throw new Error('get 需要 id 或 title')
      const all = store.list()
      const notes = Array.isArray(all?.notes) ? all.notes : (Array.isArray(all) ? all : [])
      const byId = notes.find((note) => note.id === wanted)
      const lower = wanted.toLowerCase()
      const hit = byId
        || notes.find((note) => String(note.text || '').trim().toLowerCase() === lower)
        || notes.find((note) => String(note.text || '').toLowerCase().includes(lower))
      if (!hit) throw new Error(`没有找到便签：${wanted}`)
      return { note: hit }
    }
    case 'add': {
      const result = await store.add(args)
      sync.scheduleSoon()
      return result
    }
    case 'update': {
      const result = await store.update(args)
      sync.scheduleSoon()
      return result
    }
    case 'remove': {
      const result = await store.remove(args)
      sync.scheduleSoon()
      return result
    }
    case 'reorder':
      return store.reorder(args)
    case 'restore':
      return store.restore(args)
    case 'purgeTrash':
      return store.purgeTrash(args)
    case 'emptyTrash':
      return store.emptyTrash()
    case 'archive':
      return store.archive(args)
    case 'resetSizes':
      return store.resetSizes(args)
    case 'imageUpload':
      return context.images.save(args?.data, { upload: context.sync.uploadImage })
    case 'categoryAdd':
      return store.categoryAdd(args)
    case 'categoryReorder':
      return store.categoryReorder(args)
    case 'categoryUpdate':
      return store.categoryUpdate(args)
    case 'categoryRemove':
      return store.categoryRemove(args)
    case 'firedSince':
      return context.reminders.firedSince(args?.since)
    case 'sync':
      return sync.syncNow()
    case 'syncConfig': {
      if (args?.action === 'set') {
        await saveSyncConfig(args?.config || {})
        sync.scheduleSoon(500)
        return { config: await syncConfigSnapshot() }
      }
      return { config: await syncConfigSnapshot() }
    }
    default:
      throw new Error(`未知操作：${method || '(空)'}`)
  }
}

export function apply(ctx) {
  const warn = (message) => ctx.logger?.warn?.(`[dsh-memo] ${message}`)
  const store = createStore(DATA_FILE, warn)
  const sync = createSyncRuntime(store, warn)
  const reminders = createReminderRuntime({
    store,
    warn,
    onFired: () => sync.scheduleSoon?.(800),
  })
  const images = createImageStore(IMAGE_DIR, warn)
  const context = { store, sync, images, reminders }

  // 提醒扫描：每 15 秒一次，进程退出时清掉
  ctx.effect(() => {
    reminders.start()
    return () => reminders.stop()
  }, 'dsh-memo: reminders')

  // 到点提醒顺手把便签同步出去（firedKey/remindAt 变了要落 md）

  const webServer = ctx.get('webServer')
  if (!webServer) {
    warn('没有 webServer 服务，便签墙的浏览器接口已跳过（界面将无法读写）')
  } else {
    ctx.effect(
      () => webServer.register({
        kind: 'prefix',
        path: ROUTE_PATH,
        handler: async (req, res) => {
          try {
            if (req.method === 'GET') {
              const result = await store.list()
              sendJson(res, 200, { ok: true, result: { ...result, sync: sync.status() } })
              return
            }
            if (req.method !== 'POST') {
              sendJson(res, 405, { ok: false, error: '只支持 GET / POST' })
              return
            }
            const payload = await readJsonBody(req)
            const result = await dispatch(context, payload?.method, payload?.args ?? {})
            sendJson(res, 200, { ok: true, result: { ...result, sync: sync.status() } })
          } catch (error) {
            // 业务错误用 200 + ok:false 返回，浏览器端统一展示 message。
            sendJson(res, 200, { ok: false, error: messageOf(error), result: { sync: sync.status() } })
          }
        },
      }),
      'dsh-memo: /dsh-memo/api route',
    )
  }

  if (webServer) {
    // PWA：清单 + 图标（手机上「添加到主屏幕」会用到）。用 exact 路由，
    // 别用 /dsh-memo 前缀——那会把 /dsh-memo/api 和 /dsh-memo/images 一起吞掉。
    const manifestHandler = async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('method not allowed')
        return
      }
      const body = JSON.stringify(buildManifest(), null, 2)
      res.writeHead(200, { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-cache' })
      res.end(req.method === 'HEAD' ? undefined : body)
    }
    const iconHandler = (name) => async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('method not allowed')
        return
      }
      try {
        const bytes = await readFile(join(PWA_ICON_DIR, name))
        res.writeHead(200, {
          'content-type': 'image/png',
          'content-length': String(bytes.length),
          'cache-control': 'public, max-age=86400',
        })
        res.end(req.method === 'HEAD' ? undefined : bytes)
      } catch (error) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
      }
    }
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PWA_ROUTE}/manifest.webmanifest`,
      handler: manifestHandler,
    }), 'dsh-memo: pwa manifest')
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PWA_ROUTE}/icon-192.png`,
      handler: iconHandler('icon-192.png'),
    }), 'dsh-memo: pwa icon 192')
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PWA_ROUTE}/icon-512.png`,
      handler: iconHandler('icon-512.png'),
    }), 'dsh-memo: pwa icon 512')
    // 安卓壳 APK：/dsh-memo/app.apk（手机浏览器登录过本站后即可下载）
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PWA_ROUTE}/app.apk`,
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('method not allowed')
          return
        }
        try {
          const bytes = await readFile(APP_APK_PATH)
          res.writeHead(200, {
            'content-type': 'application/vnd.android.package-archive',
            'content-length': String(bytes.length),
            'content-disposition': 'attachment; filename="dsh-memo.apk"',
            'cache-control': 'no-cache',
          })
          res.end(req.method === 'HEAD' ? undefined : bytes)
        } catch (error) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('APK not built yet (run ../dsh-memo-app/build.sh)')
        }
      },
    }), 'dsh-memo: android apk')

    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PWA_ROUTE}/sw.js`,
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('method not allowed')
          return
        }
        res.writeHead(200, {
          'content-type': 'text/javascript; charset=utf-8',
          // 让 /dsh-memo/sw.js 能拿到站点根的 scope
          'service-worker-allowed': '/',
          'cache-control': 'no-cache',
        })
        res.end(req.method === 'HEAD' ? undefined : SERVICE_WORKER_SOURCE)
      },
    }), 'dsh-memo: pwa sw')
    // PWA 注入会改写整站 index.html：默认关闭，只有存在 ~/.dsh/dsh-memo/pwa.json 时才启用
    // （本地自用建议开；公开发布默认不干扰别人的 GUI）
    if (existsSync(join(homedir(), '.dsh', 'dsh-memo', 'pwa.json'))) {
      ctx.effect(
        () => webServer.tapIndex(injectPwaHead),
        'dsh-memo: pwa head',
      )
    }

    // 图片文件：内容寻址，URL 永久可缓存。
    ctx.effect(
      () => webServer.register({
        kind: 'prefix',
        path: IMAGE_ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
            res.end('method not allowed')
            return
          }
          const url = new URL(req.url || '/', 'http://localhost')
          const name = decodeURIComponent(url.pathname.slice(IMAGE_ROUTE.length + 1))
          const file = await images.read(name)
          if (!file) {
            res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
            res.end('not found')
            return
          }
          res.writeHead(200, {
            'content-type': file.mime,
            'content-length': String(file.bytes.length),
            'cache-control': 'public, max-age=31536000, immutable',
          })
          if (req.method === 'HEAD') {
            res.end()
            return
          }
          res.end(file.bytes)
        },
      }),
      'dsh-memo: image route',
    )

    // 启动 30 秒后：把正文里还是 `dsh-memo://` 的旧图片补传到 vault，并把引用改成 vault 路径。
    ctx.effect(() => {
      const timer = setTimeout(async () => {
        try {
          const { notes } = await store.list()
          for (const note of notes) {
            const names = imageRefsOfNote(note)
            if (!names.length) continue
            let text = note.text
            let changed = false
            for (const name of names) {
              let remotePath = await images.remotePathOf(name)
              if (!remotePath) {
                const file = await images.read(name)
                if (!file) continue
                try {
                  remotePath = await sync.uploadImage(name, file.bytes, file.mime)
                  await images.recordRemote(name, remotePath, file.mime, file.bytes.length)
                } catch (error) {
                  warn(`图片补传失败（${name}）：${messageOf(error)}`)
                  continue
                }
              }
              text = text.split(`${IMAGE_REF}${name}`).join(`/${remotePath}`)
              changed = true
            }
            if (!changed || text === note.text) continue
            const replaced = await store.replaceTextIfUnchanged(note.id, note.text, text)
            if (replaced) {
              warn(`已把 1 条便签里的旧图片引用迁移到 vault`)
              sync.scheduleSoon(500)
            }
          }
        } catch (error) {
          warn(`图片迁移失败：${messageOf(error)}`)
        }
      }, 30000)
      timer.unref?.()
      return () => clearTimeout(timer)
    }, 'dsh-memo: image migration')

    // 启动 20 秒后清一次没人引用的图片（留一天宽限期，避免删掉刚传还没保存的）。
    ctx.effect(() => {
      const timer = setTimeout(async () => {
        try {
          const { notes } = await store.list()
          await images.gc(collectImageRefs(notes))
        } catch (error) {
          warn(`图片清理失败：${messageOf(error)}`)
        }
      }, 20000)
      timer.unref?.()
      return () => clearTimeout(timer)
    }, 'dsh-memo: image gc')
  }

  // Agent 工具：让模型也能记录/查看同一面便签墙（tools 缺失时插件其余部分照常工作）。
  ctx.inject(['tools'], (scoped) => {
    const tools = scoped.tools
    if (!tools) return
    scoped.effect(() => tools.register(buildMemoTool(context)), 'dsh-memo: memo tool')
  })
}
