# ez-dsh-memo

A sticky-note wall for **[DeepSeek Harness](https://github.com/deepseek-ai)** — jot ideas in one keystroke, organize with categories, set reminders, link notes wiki-style, and optionally mirror everything to a [fast-note-sync](https://github.com/) Obsidian vault as Markdown.

> Screenshots: coming soon.

## Install

```bash
dsh plugin --profile web add https://github.com/liudiw/ez-dsh-memo/releases/latest/download/ez-dsh-memo.tgz
```

Restart the harness afterwards. Requires DSH with the standard client slot contracts (shell.overlay / sidebar.panellist / main / conversation.input.right / settings.section) and Node.js >= 20.

## Features

- **Wall** — absolute-packed notes, 5 per row by default (adaptive), drag to resize, drag to reorder with FLIP animation, dense packing fills gaps.
- **Quick capture** — `Alt+N` anywhere, or the 📌 button next to the conversation composer. Enter saves, Shift+Enter newline, optional reminder and category.
- **Notes drawer** — `Alt+M` slides an in-conversation list with search; `↑↓` + `Enter` to open, cards float and can be dragged/resized.
- **Full-text viewer** — eye button or the overflow hint opens a floating card (drag + resize), inline editing with `Cmd/Ctrl+Enter`.
- **Wiki links** — type `[[` for autocomplete; clicking a link opens the target in a **new** floating card.
- **Categories** — many-to-many, drag to reorder chips, `Alt+C` picker with checkboxes (multi-select) and mouse/keyboard control.
- **Reminders** — per-note time + repeat (daily/weekly/monthly), persisted in the note; host scans every 15s, pushes sticky toasts to `shell.overlay` plus system notifications; optional webhook (企业微信 / ntfy / PushDeer) and a daily digest.
- **Trash & archive** — deletes go to trash for 7 days (restore / purge), archive hides notes from the wall.
- **Undo** — `Ctrl/Cmd+Z` reverts edits, moves, archive, delete, create (last 20 steps).
- **Search** — highlight hits, filter by reminder / image / last 7 days, combinable with category and keyword.
- **Task lists** — `- [ ]` items are clickable checkboxes.
- **Sync** — optional mirror to fast-note-sync as Markdown (`dsh-memo-*` frontmatter), images uploaded to `attachments/<date>/`, local-first conflict handling.
- **Settings → Sticky notes** — configure the FNS endpoint, token (masked), vault and folders.

## Data

Notes always live locally, sync is only a mirror:

```
~/.dsh/dsh-memo/
├── notes.json     the wall (atomic writes, 0600)
├── images/        content-addressed image cache
├── sync.json      FNS config (0600, token never returned in plain text)
├── remind.json    optional push channel / daily digest
└── pwa.json       optional: enables PWA manifest injection
```

## Shortcuts

| Keys | Action |
| --- | --- |
| `Alt+N` | quick capture (toggle) |
| `Alt+M` | notes drawer (toggle) |
| `Alt+C` | category picker (in quick capture) |
| `Alt+W` | close the topmost floating window |
| `Ctrl/Cmd+Z` | undo |

## Development

```bash
node --check index.js && node --check client.js && node --check sync.js
./scripts/release.sh 0.1.2   # packs in a temp dir, never renames the working package
```

The working copy is installed as `@local/dsh-memo`; the published tarball is named `ez-dsh-memo`.

## License

MIT
