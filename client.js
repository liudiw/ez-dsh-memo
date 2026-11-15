window.__ModuleLoader__.load({
  id: '@local/dsh-memo',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } = React;

    const NS = 'dsh-memo';
    /** 左栏图标 id，必须与 main 面板 key 同名（sidebar 点击时按 id 反查面板）。 */
    const PANEL_ID = 'memo';
    const API_PATH = '/dsh-memo/api';
    const DEFAULT_COLOR = 'amber';
    const COLOR_KEYS = ['amber', 'rose', 'sky', 'green', 'violet'];
    /** @便签 候选面板开关：先关闭（输入框里 @ 的行为与 DSH 文件引用冲突，待重做）。 */
    const ENABLE_NOTE_MENTION = false;
    /** 便签尺寸：与宿主 index.js 的 MIN_WIDTH/MAX_WIDTH/MIN_HEIGHT/MAX_HEIGHT 保持一致。 */
    // 默认新建尺寸同时是缩小的下限（宿主 index.js 用同一组数字）。
    const DEFAULT_NOTE_WIDTH = 260;
    const DEFAULT_NOTE_HEIGHT = 150;
    const MAX_NOTE_WIDTH = 900;
    const MAX_NOTE_HEIGHT = 900;
    /** 字号随宽度自适应（px/宽度比 1:20），并夹在这个区间里。 */
    /** 便签实际尺寸：存了就用存的，但都不小于默认值（与 NoteCard 内部一致）。 */
    const noteWidthOf = (note) => Math.max(DEFAULT_NOTE_WIDTH, note && note.width ? note.width : DEFAULT_NOTE_WIDTH);
    const noteHeightOf = (note) => Math.max(DEFAULT_NOTE_HEIGHT, note && note.height ? note.height : DEFAULT_NOTE_HEIGHT);
    const MIN_FONT = 11.5;
    const MAX_FONT = 15.5;
    /** 便签自身颜色（贴纸 = 画面内容），与主题色 token 混色后自动适配明暗。 */
    const ACCENTS = {
      amber: '#e5a50a',
      rose: '#e0566f',
      sky: '#3b82f6',
      green: '#14a06b',
      violet: '#8b5cf6',
    };

    const DICT_ZH = {
      'panel.title': '便签墙',
      'panel.subtitle': '随手记下灵感，随时回来看',
      'count': '条',
      'search.placeholder': '搜索便签',
      'refresh': '刷新',
      'loading': '正在读取便签…',
      'retry': '重试',
      'composer.placeholder': '记下一个念头…（Enter 保存，Shift+Enter 换行）',
      'remind.snooze': '延后 5 分钟',
      'remind.dismiss': '关闭',
      'remind.dismissAll': '全部关闭',
      'remind.keep': '处理完再点关闭',
      'remind.soon1': '1 分钟后',
      'remind.soon10': '10 分钟后',
      'remind.soon60': '1 小时后',
      'remind.morning': '明天 9:00',
      'remind.saved': '提醒已设为',
      'remind.title': '提醒',
      'remind.set': '设置提醒',
      'remind.none': '不重复',
      'remind.daily': '每天',
      'remind.weekly': '每周',
      'remind.monthly': '每月',
      'remind.repeat': '重复',
      'remind.save': '保存',
      'remind.clear': '清除提醒',
      'remind.done': '标记完成',
      'remind.undone': '取消完成',
      'remind.due': '现在提醒',
      'remind.overdue': '已逾期',
      'remind.today': '今天',
      'remind.tomorrow': '明天',
      'remind.doneBadge': '已完成',
      'remind.needTime': '先选个时间',
      'remind.todo': '待办',
      'remind.toastTitle': '便签提醒',
      'remind.notifyDenied': '浏览器通知被拒绝，只在页面里提示',
      'composer.into': '将归入',
      'composer.add': '贴上去',
      'composer.hint': '支持 Markdown · ⌘/Ctrl + Enter 保存',
      'empty.title': '墙上还空着',
      'empty.hint': '把脑子里闪过的念头贴上来，之后再回来整理。',
      'empty.filtered': '没有匹配的便签',
      'note.pin': '置顶',
      'note.unpin': '取消置顶',
      'note.pinned': '已置顶',
      'note.color': '换颜色',
      'note.edit': '编辑',
      'note.editHint': '双击编辑（编辑时显示 Markdown 原文）',
      'note.resize': '拖动右下角改变大小（双击恢复默认）',
      'note.conflict': '冲突副本',
      'note.drag': '拖动排序',
      'note.categories': '分类',
      'image.add': '插入图片（也可以直接粘贴）',
      'mention.empty': '没有匹配的便签',
      'mention.empty': 'No matching notes',
      'note.quote': '引用到对话（@便签:标题）',
      'note.quote': 'Quote in chat (@note:title)',
      'image.export': '导出为图片',
      'image.export': 'Export as image',
      'image.uploading': '正在上传图片…',
      'image.fail': '图片上传失败',
      'note.toggleTask': '勾选/取消',
      'undo.done': '已撤销：',
      'undo.edit': '修改便签',
      'undo.remove': '删除便签',
      'undo.none': '没有可撤销的操作',
      'archive.title': '归档',
      'archive.add': '归档',
      'archive.remove': '取消归档',
      'archive.empty': '还没有归档的便签',
      'trash.title': '回收站',
      'trash.open': '回收站',
      'trash.empty': '回收站是空的',
      'trash.restore': '恢复',
      'trash.purge': '彻底删除',
      'trash.clear': '清空回收站',
      'trash.hint': '删除的便签保留 7 天',
      'trash.deletedAt': '删除于',
      'filter.remind': '只看有提醒的',
      'filter.image': '只看带图片的',
      'filter.recent': '只看最近 7 天',
      'quick.title': '快速便签',
      'quick.hint': 'Enter 保存 · Shift+Enter 换行 · Alt+N 唤起',
      'quick.placeholder': '想到什么，随手记一句…',
      'quick.save': '保存（Alt+S）',
      'quick.saved': '已存到便签墙',
      'quick.recent': '最近的便签',
      'quick.remindHint': '可选：设个提醒',
      'skin.paper': '纸感皮肤',
      'skin.night': '夜间皮肤',
      'skin.warm': '暖白皮肤',
      'set.title': '便签墙',
      'set.sync': '同步到 fast-note-sync',
      'set.enable': '启用同步',
      'set.api': '服务地址',
      'set.token': '访问令牌',
      'set.tokenKeep': '留空表示不修改（当前：{{hint}}）',
      'set.vault': 'Vault 名称',
      'set.folder': '便签目录',
      'set.imageFolder': '附件目录',
      'set.interval': '同步间隔（秒）',
      'set.save': '保存',
      'set.test': '保存并测试',
      'set.saved': '已保存',
      'set.testing': '正在测试…',
      'set.ok': '连接正常',
      'set.fail': '连接失败',
      'set.errApi': '服务地址要以 http:// 或 https:// 开头',
      'set.errVault': 'Vault 名称不能为空',
      'set.tip': '便签始终保存在本机 ~/.dsh/dsh-memo/notes.json，同步只是把它镜像成 Markdown。',
      'capture.button': '存成便签',
      'capture.collect': '收集本轮',
      'capture.button': '存成便签',
      'capture.collect': 'Collect turn',
      'quick.reset': '重置（清空全部，Alt+R）',
      'quick.keepDraft': '内容还没存成便签，要留着当草稿吗？',
      'quick.saveDraft': '存草稿',
      'quick.discard': '不存，清空',
      'quick.cancel': '取消',
      'quick.pickCategory': '分类',
      'quick.pickCategoryHint': '分类（Alt+C）',
      'drawer.title': '便签',
      'drawer.empty': '还没有便签',
      'quick.openWall': '打开便签墙',
      'wiki.empty': '没有匹配的便签',
      'wiki.hint': '↑↓ 选择 · Enter 插入 · Esc 取消',
      'view.drag': '按住标题栏拖动',
      'view.title': '查看便签',
      'view.open': '查看全文',
      'view.close': '关闭',
      'view.edit': '编辑',
      'view.save': '保存',
      'view.cancel': '取消',
      'view.editHint': '⌘/Ctrl+Enter 保存 · Esc 取消',
      'view.prev': '上一条',
      'view.next': '下一条',
      'view.more': '还有内容，点开看全文',
      'view.count': '第',
      'image.fit': '适应窗口',
      'image.close': '关闭',
      'image.hint': '滚轮缩放 · 拖动平移 · Esc 关闭',
      'wall.tidy': '自动排序（全部恢复默认尺寸）',
      'cat.reorder': '拖动可排序',
      'cat.all': '全部',
      'cat.none': '未分类',
      'cat.add': '新分类',
      'cat.placeholder': '分类名，回车创建',
      'cat.rename': '重命名',
      'cat.delete': '删除分类',
      'cat.confirm': '删除这个分类？',
      'cat.yes': '删除',
      'cat.no': '取消',
      'cat.emptyFilter': '这个分类下还没有便签',
      'cat.noneYet': '还没有分类，点右边「新分类」建一个',
      'cat.needRestart': '宿主还没重启，分类功能暂时不可用（sudo systemctl restart dsh-web）',
      'sync.running': '同步中…',
      'sync.ok': '已同步',
      'sync.error': '同步失败',
      'sync.starting': '同步…',
      'sync.now': '立即与 fast-note-sync 同步',
      'note.save': '保存',
      'note.cancel': '取消',
      'note.delete': '删除',
      'note.confirmDelete': '删掉这张？',
      'note.yes': '删除',
      'note.no': '留着',
      'color.amber': '琥珀黄',
      'color.rose': '玫瑰红',
      'color.sky': '天色蓝',
      'color.green': '薄荷绿',
      'color.violet': '紫罗兰',
    };

    const DICT_EN = {
      'panel.title': 'Memo wall',
      'panel.subtitle': 'Jot down a spark anytime, come back to it later',
      'count': 'notes',
      'search.placeholder': 'Search notes',
      'refresh': 'Refresh',
      'loading': 'Loading notes…',
      'retry': 'Retry',
      'composer.placeholder': 'Capture a thought… (Enter to save, Shift+Enter for a new line)',
      'remind.snooze': 'Snooze 5 min',
      'remind.dismiss': 'Dismiss',
      'remind.dismissAll': 'Dismiss all',
      'remind.keep': 'Stays until you handle it',
      'remind.soon1': 'In 1 min',
      'remind.soon10': 'In 10 min',
      'remind.soon60': 'In 1 hour',
      'remind.morning': 'Tomorrow 9:00',
      'remind.saved': 'Reminder set for',
      'remind.title': 'Reminder',
      'remind.set': 'Set reminder',
      'remind.none': 'Once',
      'remind.daily': 'Daily',
      'remind.weekly': 'Weekly',
      'remind.monthly': 'Monthly',
      'remind.repeat': 'Repeat',
      'remind.save': 'Save',
      'remind.clear': 'Clear',
      'remind.done': 'Mark done',
      'remind.undone': 'Unmark done',
      'remind.due': 'Now',
      'remind.overdue': 'Overdue',
      'remind.today': 'Today',
      'remind.tomorrow': 'Tomorrow',
      'remind.doneBadge': 'Done',
      'remind.needTime': 'Pick a time first',
      'remind.todo': 'Todo',
      'remind.toastTitle': 'Reminder',
      'remind.notifyDenied': 'Notifications blocked, in-page only',
      'composer.into': 'Adds to',
      'composer.add': 'Pin it',
      'composer.hint': 'Markdown supported · ⌘/Ctrl + Enter saves',
      'empty.title': 'The wall is empty',
      'empty.hint': 'Stick a passing thought up here and sort it out later.',
      'empty.filtered': 'No matching notes',
      'note.pin': 'Pin',
      'note.unpin': 'Unpin',
      'note.pinned': 'Pinned',
      'note.color': 'Color',
      'note.edit': 'Edit',
      'note.editHint': 'Double-click to edit (raw Markdown while editing)',
      'note.resize': 'Drag the bottom-right corner to resize (double-click to reset)',
      'note.conflict': 'Conflict copy',
      'note.drag': 'Drag to reorder',
      'note.categories': 'Categories',
      'image.add': 'Insert image (you can also paste)',
      'image.uploading': 'Uploading image…',
      'image.fail': 'Image upload failed',
      'note.toggleTask': 'Toggle',
      'undo.done': 'Undone: ',
      'undo.edit': 'edit',
      'undo.remove': 'delete',
      'undo.none': 'Nothing to undo',
      'archive.title': 'Archived',
      'archive.add': 'Archive',
      'archive.remove': 'Unarchive',
      'archive.empty': 'Nothing archived yet',
      'trash.title': 'Trash',
      'trash.open': 'Trash',
      'trash.empty': 'Trash is empty',
      'trash.restore': 'Restore',
      'trash.purge': 'Delete forever',
      'trash.clear': 'Empty trash',
      'trash.hint': 'Deleted notes are kept for 7 days',
      'trash.deletedAt': 'Deleted',
      'filter.remind': 'With reminder',
      'filter.image': 'With image',
      'filter.recent': 'Last 7 days',
      'quick.title': 'Quick note',
      'quick.hint': 'Enter saves · Shift+Enter newline · Alt+N opens',
      'quick.placeholder': 'Jot down a spark…',
      'quick.save': 'Save (Alt+S)',
      'quick.saved': 'Saved',
      'quick.recent': 'Recent notes',
      'quick.remindHint': 'Optional reminder',
      'skin.paper': 'Paper skin',
      'skin.night': 'Night skin',
      'skin.warm': 'Warm skin',
      'set.title': 'Sticky notes',
      'set.sync': 'Sync to fast-note-sync',
      'set.enable': 'Enable sync',
      'set.api': 'Server URL',
      'set.token': 'Access token',
      'set.tokenKeep': 'Leave empty to keep current ({{hint}})',
      'set.vault': 'Vault',
      'set.folder': 'Notes folder',
      'set.imageFolder': 'Attachments folder',
      'set.interval': 'Sync interval (s)',
      'set.save': 'Save',
      'set.test': 'Save and test',
      'set.saved': 'Saved',
      'set.testing': 'Testing…',
      'set.ok': 'Connection OK',
      'set.fail': 'Connection failed',
      'set.errApi': 'URL must start with http:// or https://',
      'set.errVault': 'Vault name is required',
      'set.tip': 'Notes always live on this machine at ~/.dsh/dsh-memo/notes.json; sync only mirrors them as Markdown.',
      'quick.reset': 'Reset (clear all, Alt+R)',
      'quick.keepDraft': 'Not saved as a note yet. Keep it as a draft?',
      'quick.saveDraft': 'Keep draft',
      'quick.discard': 'Discard',
      'quick.cancel': 'Cancel',
      'quick.pickCategory': 'Category',
      'quick.pickCategoryHint': 'Category (Alt+C)',
      'drawer.title': 'Notes',
      'drawer.empty': 'No notes yet',
      'quick.openWall': 'Open wall',
      'wiki.empty': 'No matching note',
      'wiki.hint': '↑↓ pick · Enter insert · Esc cancel',
      'view.drag': 'Drag by the title bar',
      'view.title': 'Note',
      'view.open': 'Open note',
      'view.close': 'Close',
      'view.edit': 'Edit',
      'view.save': 'Save',
      'view.cancel': 'Cancel',
      'view.editHint': '⌘/Ctrl+Enter saves · Esc cancels',
      'view.prev': 'Previous',
      'view.next': 'Next',
      'view.more': 'More content — open to read',
      'view.count': 'No.',
      'image.fit': 'Fit',
      'image.close': 'Close',
      'image.hint': 'Scroll to zoom · drag to pan · Esc to close',
      'wall.tidy': 'Auto arrange (reset all sizes)',
      'cat.reorder': 'Drag to reorder',
      'cat.all': 'All',
      'cat.none': 'Uncategorized',
      'cat.add': 'New category',
      'cat.placeholder': 'Category name, Enter to create',
      'cat.rename': 'Rename',
      'cat.delete': 'Delete category',
      'cat.confirm': 'Delete this category?',
      'cat.yes': 'Delete',
      'cat.no': 'Cancel',
      'cat.emptyFilter': 'No notes in this category yet',
      'cat.noneYet': 'No categories yet — use “New category”',
      'cat.needRestart': 'Host has not been restarted yet, so categories are unavailable',
      'sync.running': 'Syncing…',
      'sync.ok': 'Synced',
      'sync.error': 'Sync failed',
      'sync.starting': 'Syncing…',
      'sync.now': 'Sync with fast-note-sync now',
      'note.save': 'Save',
      'note.cancel': 'Cancel',
      'note.delete': 'Delete',
      'note.confirmDelete': 'Delete this note?',
      'note.yes': 'Delete',
      'note.no': 'Keep',
      'color.amber': 'Amber',
      'color.rose': 'Rose',
      'color.sky': 'Sky',
      'color.green': 'Mint',
      'color.violet': 'Violet',
    };

    const CSS = `
.dsm-root[data-skin='paper']{--dsm-skin-bg:linear-gradient(180deg,#fbf7ef,#f4eee2)}
.dsm-root[data-skin='night']{--dsm-skin-bg:linear-gradient(180deg,#1b1d22,#14161a)}
.dsm-root[data-skin='warm']{--dsm-skin-bg:linear-gradient(180deg,#fff8f1,#ffefe3)}
.dsm-collectBtnUnused{font:inherit;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.8}
.dsm-collectBtn:hover{opacity:1;color:var(--dsw-alias-brand-primary)}
.dsm-tip{position:relative}
.dsm-tip:hover::after{content:attr(data-tip);position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;background:#1b1b1f;color:#fff;font-size:13.5px;line-height:1;padding:7px 10px;border-radius:7px;pointer-events:none;z-index:2147483000;box-shadow:0 8px 20px -8px rgba(0,0,0,.5)}
.dsm-confirmPop{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:40;width:min(320px,80vw);padding:14px 16px;border-radius:14px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1));background:var(--dsw-alias-bg-base);box-shadow:0 26px 60px -26px rgba(0,0,0,.55),0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);pointer-events:auto}
.dsm-confirmText{font-size:13px;line-height:1.6;color:var(--dsw-alias-label-primary);margin-bottom:12px}
.dsm-confirmActions{display:flex;gap:8px;justify-content:flex-end}
.dsm-captureGroup{display:inline-flex;align-items:center;gap:2px}
.dsm-mention{position:fixed;z-index:2147482300;width:min(340px,70vw);max-height:240px;overflow-y:auto;padding:5px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);box-shadow:0 18px 40px -18px rgba(0,0,0,.45)}
.dsm-mentionItem{display:block;width:100%;text-align:left;font:inherit;font-size:12.5px;padding:5px 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-mentionItem[data-active='true']{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.dsm-mentionEmpty{padding:6px 8px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dsm-captureBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.85}
.dsm-captureBtn:hover{opacity:1;color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.dsm-skinBar{display:flex;gap:5px;padding:0 0 8px}
.dsm-skinDot{width:14px;height:14px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l1);cursor:pointer}
.dsm-skinDot[data-on='true']{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}
.dsm-wall[data-skin-bg]{background:var(--dsm-skin-bg)}
.dsm-root{position:relative;box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:inherit}
.dsm-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}
.dsm-scroll::-webkit-scrollbar{width:8px;height:8px}
.dsm-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}
.dsm-scroll::-webkit-scrollbar-track{background:transparent}
.dsm-inner{box-sizing:border-box;width:100%;max-width:none;margin:0;padding:18px 14px 64px}

.dsm-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px}
.dsm-headText{flex:1 1 auto;min-width:0}
.dsm-title{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:600;letter-spacing:.2px;line-height:1.3}
.dsm-count{font-size:11.5px;font-weight:500;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:1px 9px;white-space:nowrap}
.dsm-sub{margin:5px 0 0;font-size:12.5px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
.dsm-tools{display:flex;align-items:center;gap:8px;flex:none}
.dsm-searchWrap{position:relative;display:flex;align-items:center}
.dsm-searchIcon{position:absolute;left:9px;display:flex;color:var(--dsw-alias-label-secondary);pointer-events:none}
.dsm-searchInput{box-sizing:border-box;width:184px;height:30px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;padding:0 10px 0 28px;outline:none;transition:border-color .15s,box-shadow .15s}
.dsm-searchInput::placeholder{color:var(--dsw-alias-label-secondary)}
.dsm-searchInput:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}

/* 分类条 */
.dsm-cats{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:0 0 14px}
.dsm-catWrap{position:relative;display:inline-flex;align-items:center;gap:0}
.dsm-cat{box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:27px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;transition:background-color .14s,border-color .14s,color .14s}
.dsm-cat:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-catDrag{display:inline-flex;flex:0 0 auto;position:relative}
.dsm-catDrag[data-dragging='true']{opacity:.45}
.dsm-catDrag[data-drop='true']::before{content:'';position:absolute;left:-4px;top:2px;bottom:2px;width:2px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.dsm-cat[data-due='true']{color:#b3261e;border-color:rgba(179,38,30,.36);background:rgba(179,38,30,.1)}
.dsm-cat[data-due='true'] .dsm-catCount{background:rgba(179,38,30,.16);color:#b3261e}
.dsm-cat[data-on='true']{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 42%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,var(--dsw-alias-bg-layer-1))}
.dsm-catCount{font-size:10.5px;opacity:.75}
.dsm-catActions{display:inline-flex;align-items:center;gap:1px;margin-left:-4px;opacity:0;transition:opacity .14s}
.dsm-catWrap:hover .dsm-catActions,.dsm-catWrap:focus-within .dsm-catActions{opacity:1}
.dsm-catAction{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:none;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsm-catAction:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}
.dsm-catInput{box-sizing:border-box;height:27px;width:150px;padding:0 9px;border-radius:999px;border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.dsm-catConfirm{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:var(--dsw-alias-state-error-primary);padding-left:6px}
.dsm-composer{position:relative;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:10px 12px;margin-bottom:14px;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:border-color .15s,box-shadow .15s}
.dsm-composer[data-focus]{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.dsm-composerInput{box-sizing:border-box;display:block;width:100%;min-height:56px;max-height:240px;resize:vertical;border:none;outline:none;background:transparent;color:inherit;font:inherit;font-size:14px;line-height:1.65;padding:2px 2px 10px}
.dsm-composerInput::placeholder{color:var(--dsw-alias-label-secondary)}
.dsm-composerFoot{display:flex;align-items:center;gap:7px}
.dsm-intoChip{display:inline-flex;align-items:center;gap:4px;max-width:170px;height:20px;padding:0 8px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);font-size:11px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-intoChip>span{overflow:hidden;text-overflow:ellipsis}
.dsm-chipX{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;padding:0;border:none;border-radius:50%;background:transparent;color:inherit;font:inherit;font-size:13px;line-height:1;cursor:pointer;opacity:.7}
.dsm-chipX:hover{opacity:1;background:rgba(0,0,0,.08)}
.dsm-spacer{flex:1 1 auto}
.dsm-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}

.dsm-swatch{box-sizing:border-box;width:18px;height:18px;flex:none;border-radius:50%;cursor:pointer;padding:0;background:color-mix(in srgb,var(--dsm-accent) 40%,var(--dsw-alias-bg-layer-1));border:1px solid color-mix(in srgb,var(--dsm-accent) 62%,var(--dsw-alias-border-l2));transition:transform .12s,box-shadow .12s}
.dsm-swatch:hover{transform:scale(1.12)}
.dsm-swatch[data-on='true']{box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1),0 0 0 3.5px var(--dsm-accent)}

.dsm-btn{box-sizing:border-box;font:inherit;font-size:12.5px;height:28px;padding:0 13px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;transition:background-color .14s,border-color .14s,opacity .14s}
.dsm-btn:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 60%,var(--dsw-alias-border-l1))}
.dsm-btn:disabled{opacity:.45;cursor:not-allowed}
.dsm-btnPrimary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff;font-weight:500}
.dsm-btnPrimary:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 86%,#000)}
.dsm-iconBtn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border-radius:7px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color .14s,color .14s}
.dsm-iconBtn:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);color:var(--dsw-alias-label-primary)}
.dsm-iconBtn:disabled{opacity:.4;cursor:not-allowed}
.dsm-iconBtn.dsm-danger:hover{color:var(--dsw-alias-state-error-primary)}

.dsm-banner{display:flex;align-items:center;gap:10px;margin:0 0 18px;padding:9px 12px;border-radius:10px;font-size:12.5px;line-height:1.5;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,var(--dsw-alias-bg-layer-1));border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 26%,transparent)}
.dsm-banner span{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}

.dsm-state{padding:56px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.7}
.dsm-stateTitle{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;margin-bottom:6px}

/* 便签墙：每张便签自带尺寸，所以用 flex 换行排版（尺寸可拖拽 → 不能再用 CSS 多列）。 */
.dsm-wall{position:relative;display:block;min-height:1px}
/* 拖拽时原位置留一个透明虚线框，告诉用户「松手会落在这里」 */
.dsm-note-placeholder{box-sizing:border-box;border-radius:10px;border:1.5px dashed color-mix(in srgb,var(--dsm-accent) 42%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsm-accent) 5%,transparent);transition:width .12s,height .12s}
/* 被拎起来的那张：脱离排版、跟着指针走 */
.dsm-note-ghost{position:absolute;z-index:20;pointer-events:none;transition:transform .12s ease-out;filter:drop-shadow(0 12px 24px rgba(0,0,0,.22));transform:rotate(1.4deg) scale(1.02)}
.dsm-note-ghost>article{position:relative;left:0;top:0;width:100%;height:100%;cursor:grabbing;transform:none}

.dsm-note{box-sizing:border-box;display:flex;flex-direction:column;padding:12px 13px 8px;border-radius:10px;position:absolute;
  background:color-mix(in srgb,var(--dsm-accent) 20%,var(--dsw-alias-bg-layer-1));
  border:1px solid color-mix(in srgb,var(--dsm-accent) 34%,var(--dsw-alias-border-l1));
  box-shadow:0 1px 2px rgba(0,0,0,.05),0 10px 18px -14px rgba(0,0,0,.35);
  transition:transform .16s,box-shadow .16s,width .12s,height .12s}
.dsm-note{cursor:grab}
.dsm-note:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.06),0 14px 26px -16px rgba(0,0,0,.4);z-index:2}
.dsm-note[data-pinned='true']{outline:1px solid color-mix(in srgb,var(--dsm-accent) 62%,var(--dsw-alias-border-l2));outline-offset:-1px}
/* 拖拽中：去掉过渡与位移，光标跟随；文本不可选中，避免拖着拖着选中文字。 */
.dsm-note[data-resizing]{transition:none;transform:none;user-select:none;z-index:3}
.dsm-noteBody{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--dsm-accent) 45%,transparent) transparent}
.dsm-noteBody::-webkit-scrollbar{width:6px}
.dsm-noteBody::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsm-accent) 40%,transparent);border-radius:3px}
.dsm-noteText{font-size:var(--dsm-font,13.5px);line-height:1.66;white-space:pre-wrap;overflow-wrap:anywhere;cursor:text}
.dsm-noteText p{margin:0 0 .45em}
.dsm-noteText p:last-child{margin-bottom:0}
.dsm-noteText h3,.dsm-noteText h4,.dsm-noteText h5,.dsm-noteText h6{margin:0 0 .3em;font-weight:600;line-height:1.35}
.dsm-noteText h3:last-child,.dsm-noteText h4:last-child,.dsm-noteText h5:last-child,.dsm-noteText h6:last-child{margin-bottom:0}
.dsm-md-h1{font-size:1.34em}
.dsm-md-h2{font-size:1.22em}
.dsm-md-h3{font-size:1.1em}
.dsm-md-h4,.dsm-md-h5,.dsm-md-h6{font-size:1.02em}
.dsm-md-list{margin:.15em 0 .5em;padding-left:1.2em}
.dsm-md-list:last-child{margin-bottom:0}
.dsm-md-list li{margin:.08em 0}
.dsm-md-list li::marker{color:var(--dsw-alias-label-secondary)}
.dsm-md-list li.dsm-md-check{cursor:pointer;font:inherit}
.dsm-md-check:hover{filter:brightness(.92)}
.dsm-md-task{display:flex;gap:.4em;align-items:flex-start;list-style:none}
.dsm-md-check{flex:none;width:.92em;height:.92em;margin-top:.26em;border-radius:3px;border:1px solid color-mix(in srgb,var(--dsm-accent) 62%,var(--dsw-alias-border-l2));position:relative}
.dsm-md-check[data-checked='true']{background:color-mix(in srgb,var(--dsm-accent) 52%,transparent);border-color:color-mix(in srgb,var(--dsm-accent) 74%,transparent)}
.dsm-md-check[data-checked='true']::after{content:'';position:absolute;left:.2em;top:.06em;width:.26em;height:.44em;border:solid var(--dsw-alias-label-primary);border-width:0 .13em .13em 0;transform:rotate(42deg)}
.dsm-md-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;background:color-mix(in srgb,var(--dsm-accent) 14%,var(--dsw-alias-bg-layer-2));border-radius:4px;padding:.06em .3em}
.dsm-md-pre{margin:.3em 0 .5em;padding:.45em .55em;border-radius:7px;background:color-mix(in srgb,var(--dsm-accent) 10%,var(--dsw-alias-bg-layer-2));overflow-x:auto;line-height:1.5}
.dsm-md-pre:last-child{margin-bottom:0}
.dsm-md-pre code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;white-space:pre-wrap;overflow-wrap:anywhere}
.dsm-md-quote{margin:.25em 0 .5em;padding-left:.55em;border-left:2px solid color-mix(in srgb,var(--dsm-accent) 45%,transparent);color:var(--dsw-alias-label-secondary)}
.dsm-md-quote:last-child{margin-bottom:0}
.dsm-md-hr{border:none;border-top:1px dashed color-mix(in srgb,var(--dsm-accent) 40%,var(--dsw-alias-border-l1));margin:.6em 0}
.dsm-noteCats{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:6px}
.dsm-noteCat{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:0 6px;border-radius:999px;border:1px solid color-mix(in srgb,var(--dsm-accent) 40%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsm-accent) 12%,transparent);color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:1.7;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-noteCat:hover{color:var(--dsw-alias-label-primary);border-color:color-mix(in srgb,var(--dsm-accent) 60%,var(--dsw-alias-border-l2))}
.dsm-catPop{position:absolute;right:0;bottom:calc(100% + 6px);z-index:40;min-width:150px;max-width:230px;max-height:220px;overflow-y:auto;padding:5px;border-radius:10px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 10px 26px -10px rgba(0,0,0,.32);display:flex;flex-direction:column;gap:2px}
.dsm-catPopItem[data-active='true']{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.dsm-catPopItem{display:flex;align-items:center;gap:7px;width:100%;padding:5px 7px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.dsm-catPopItem:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.dsm-catTick{flex:none;width:13px;height:13px;border-radius:4px;border:1px solid var(--dsw-alias-border-l2);display:inline-flex;align-items:center;justify-content:center;color:transparent}
.dsm-catTick[data-on='true']{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:#fff}
.dsm-catPopEmpty{padding:6px 8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.5}
/* 图片灯箱：原尺寸、滚轮缩放、拖动平移 */
.dsm-lightbox{position:absolute;inset:0;z-index:60;overflow:hidden;display:block;background:rgba(12,14,18,.74);touch-action:none}
.dsm-lightboxImg{position:absolute;left:0;top:0;max-width:none;max-height:none;border-radius:4px;box-shadow:0 26px 64px -22px rgba(0,0,0,.65);user-select:none;-webkit-user-drag:none}
.dsm-lightboxBar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:5px 8px 5px 12px;border-radius:999px;background:rgba(22,24,30,.86);border:1px solid rgba(255,255,255,.14);color:#fff;font:inherit;font-size:12px;white-space:nowrap}
.dsm-lightboxLabel{opacity:.8;font-variant-numeric:tabular-nums}
.dsm-lightboxHint{opacity:.5;font-size:11px}
.dsm-lightboxBtn{font:inherit;font-size:12px;height:24px;padding:0 9px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;cursor:pointer}
.dsm-lightboxBtn:hover{background:rgba(255,255,255,.14)}
/* 窄屏（手机）：分类栏横向滚动、按钮加大、留白收紧 */
@media (max-width:640px){
  .dsm-inner{padding:16px 14px 56px}
  .dsm-head{flex-wrap:wrap;gap:10px}
  .dsm-tools{width:100%;justify-content:flex-end}
  .dsm-searchInput{width:140px}
  .dsm-cats{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:6px;scrollbar-width:none}
  .dsm-cats::-webkit-scrollbar{display:none}
  .dsm-cats>*{flex:0 0 auto}
  .dsm-cat{height:30px;font-size:12.5px}
  .dsm-catInput{width:130px}
  .dsm-btn{height:32px;padding:0 14px}
  .dsm-iconBtn{width:30px;height:30px}
  .dsm-composerInput{font-size:15px}
  .dsm-lightboxBar{bottom:12px;gap:6px;padding:5px 6px 5px 10px}
  .dsm-lightboxHint{display:none}
}
/* 触屏没有 hover：操作按钮和缩放手柄一直显示，否则点不到 */
@media (hover:none){
  .dsm-noteActions{opacity:1}
  .dsm-resize{opacity:1}
  .dsm-catActions{opacity:1}
}
.dsm-md-img{cursor:zoom-in}
.dsm-md-img{display:block;max-width:100%;height:auto;margin:.32em 0 .45em;border-radius:7px;border:1px solid color-mix(in srgb,var(--dsm-accent) 32%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 60%,transparent)}
.dsm-md-img:last-child{margin-bottom:0}
.dsm-md-tableWrap{margin:.3em 0 .5em;max-width:100%;overflow-x:auto}
.dsm-md-tableWrap:last-child{margin-bottom:0}
.dsm-md-table{border-collapse:collapse;font-size:.95em;line-height:1.45;min-width:60%}
.dsm-md-table th,.dsm-md-table td{border:1px solid color-mix(in srgb,var(--dsm-accent) 34%,var(--dsw-alias-border-l1));padding:.22em .5em;vertical-align:top;overflow-wrap:anywhere}
.dsm-md-table th{background:color-mix(in srgb,var(--dsm-accent) 16%,transparent);font-weight:600}
.dsm-md-table tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--dsm-accent) 7%,transparent)}
.dsm-md-link{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}
.dsm-md-link:hover{text-decoration-thickness:2px}
.dsm-md-wiki{display:inline;box-sizing:border-box;padding:0 .25em;border:none;border-radius:4px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);font:inherit;line-height:inherit;text-align:inherit;cursor:pointer}
.dsm-md-wiki:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent);text-decoration:underline}
.dsm-md-wiki[data-broken='true']{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);text-decoration:line-through dotted;cursor:help}
.dsm-editWrap{position:relative;display:flex;flex:1 1 auto;min-height:0;flex-direction:column}
.dsm-noteInput{box-sizing:border-box;display:block;width:100%;flex:1 1 auto;min-height:0;resize:none;font:inherit;font-size:var(--dsm-font,13.5px);line-height:1.66;color:inherit;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border:1px solid color-mix(in srgb,var(--dsm-accent) 45%,var(--dsw-alias-border-l1));border-radius:7px;padding:7px 8px;outline:none}
.dsm-noteInput:focus{border-color:var(--dsw-alias-brand-primary)}
.dsm-noteFoot{flex:0 0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:8px;padding-top:6px;border-top:1px dashed color-mix(in srgb,var(--dsm-accent) 30%,transparent)}
.dsm-pinMark{display:inline-flex;align-items:center;color:var(--dsw-alias-label-secondary)}
.dsm-time{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dsm-noteActions{display:flex;align-items:center;gap:1px;margin-left:auto;opacity:0;transition:opacity .14s}
.dsm-note:hover .dsm-noteActions,.dsm-note:focus-within .dsm-noteActions{opacity:1}
/* 右下角拖拽把手：默认只留一点点提示，悬停才完整显形。 */
.dsm-grip{cursor:grab}
.dsm-grip:active{cursor:grabbing}
.dsm-note[data-dragging='true']{cursor:grabbing;z-index:5;opacity:.92;transform:scale(.985);box-shadow:0 10px 30px -10px rgba(0,0,0,.45);transition:none}
.dsm-note[data-dragging='true'] .dsm-noteActions{opacity:1}
.dsm-resize{position:absolute;right:0;bottom:0;width:18px;height:18px;display:flex;align-items:flex-end;justify-content:flex-end;padding:0 3px 3px 0;box-sizing:border-box;cursor:nwse-resize;touch-action:none;color:color-mix(in srgb,var(--dsm-accent) 55%,var(--dsw-alias-label-secondary));opacity:.28;transition:opacity .14s}
.dsm-note:hover .dsm-resize,.dsm-note:focus-within .dsm-resize,.dsm-note[data-resizing] .dsm-resize{opacity:1}
.dsm-resize:focus-visible{opacity:1;outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;border-radius:4px}
.dsm-resize:hover{color:color-mix(in srgb,var(--dsm-accent) 70%,var(--dsw-alias-label-primary))}
.dsm-paletteWrap{position:relative;display:inline-flex}
.dsm-palette{position:absolute;right:0;bottom:calc(100% + 6px);z-index:6;display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:999px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 8px 22px -8px rgba(0,0,0,.28)}
.dsm-confirm{flex:0 0 auto;display:flex;align-items:center;gap:6px;margin-top:7px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dsm-confirm span{flex:1 1 auto}
.dsm-miniBtn{font:inherit;font-size:11.5px;height:22px;padding:0 9px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}
.dsm-miniBtn:hover{background:var(--dsw-alias-bg-layer-2)}
/* 同步状态：一颗小胶囊，点一下立刻同步。 */
.dsm-sync{box-sizing:border-box;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap;transition:background-color .14s,border-color .14s,color .14s}
.dsm-sync:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-sync:disabled{cursor:default;opacity:.75}
.dsm-sync[data-state='ok']{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 32%,var(--dsw-alias-border-l1))}
.dsm-sync[data-state='error']{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 34%,var(--dsw-alias-border-l1))}
.dsm-sync[data-state='running']{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 32%,var(--dsw-alias-border-l1))}
.dsm-syncDot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.dsm-sync[data-state='running'] .dsm-syncDot{animation:dsmPulse 1s infinite ease-in-out}
@keyframes dsmPulse{0%,100%{opacity:.35}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.dsm-note-ghost{transition:none}.dsm-note{transition:none}}
.dsm-badge{font-size:10.5px;line-height:1.6;padding:0 6px;border-radius:999px;color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 30%,transparent);white-space:nowrap}
.dsm-filterBtn[data-on='true']{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.dsm-md-hit{padding:0 1px;border-radius:2px;background:rgba(255,196,0,.42);color:inherit}
.dsm-trashBtn{position:relative}
.dsm-trashBadge{position:absolute;top:-3px;right:-3px;min-width:13px;height:13px;padding:0 3px;border-radius:999px;background:var(--dsw-alias-state-error-primary);color:#fff;font-size:9.5px;line-height:13px;text-align:center}
.dsm-trashEmpty{padding:26px 0;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px}
.dsm-trashRow{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px dashed var(--dsw-alias-border-l1)}
.dsm-trashRow:last-child{border-bottom:none}
.dsm-trashText{flex:1 1 auto;min-width:0;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.dsm-trashMeta{margin-top:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsm-pop-left{left:0;right:auto}
.dsm-quickBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsm-quickBtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-quickHost{position:fixed;inset:0;z-index:2147482000;pointer-events:none}
.dsm-quickSel{position:fixed;transform:translate(2px,6px);pointer-events:auto;display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 14px;border-radius:999px;border:none;background:var(--dsw-alias-brand-primary,#4c6ef5);color:#fff;font:inherit;font-size:13px;font-weight:600;letter-spacing:.2px;box-shadow:0 10px 26px -8px rgba(0,0,0,.5);cursor:pointer}
.dsm-quickSel:hover{filter:brightness(1.06)}
.dsm-quickSel:hover{background:var(--dsw-alias-bg-layer-1)}
.dsm-quickRemind{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dsm-quickTime{font:inherit;font-size:12px;height:24px;padding:0 6px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsm-floatCard{resize:both;overflow:auto;min-width:280px;min-height:180px;position:fixed;z-index:2147482100;pointer-events:auto;width:min(560px,60vw);max-height:min(72vh,640px);display:flex;flex-direction:column;border-radius:14px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 30px 70px -34px rgba(0,0,0,.5);overflow:hidden}
.dsm-drawerLayer{position:fixed;inset:0;z-index:2147482000;pointer-events:none}
.dsm-drawerBackdrop{position:fixed;inset:0;pointer-events:auto;background:color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent)}
.dsm-quickCats{position:relative;z-index:12;display:flex;flex-direction:column;gap:2px;max-height:150px;overflow-y:auto;padding:4px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}
.dsm-quickCatChip{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;height:20px;padding:0 8px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);font-size:11px}
.dsm-drawer{position:fixed;top:0;right:0;bottom:0;z-index:2147482000;pointer-events:auto;width:min(360px,92vw);display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--dsw-alias-bg-base);border-left:1px solid var(--dsw-alias-border-l1);box-shadow:-18px 0 44px -24px rgba(0,0,0,.5)}
.dsm-drawerHead{display:flex;align-items:center;gap:7px;font-size:13px}
.dsm-drawerSearch{font:inherit;font-size:12.5px;height:28px;padding:0 9px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;outline:none}
.dsm-drawerSearch:focus{border-color:var(--dsw-alias-brand-primary)}
.dsm-drawerList{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.dsm-drawerItem{display:flex;align-items:center;gap:6px;width:100%;text-align:left;font:inherit;font-size:12.5px;padding:6px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}
.dsm-drawerItem[data-active='true']{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.dsm-drawerItem:hover{background:var(--dsw-alias-bg-layer-1)}
.dsm-drawerText{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-drawerBadge{flex:none;font-size:10px}
.dsm-drawerFoot{display:flex;align-items:center;gap:6px;padding-top:6px;border-top:1px dashed var(--dsw-alias-border-l1)}
.dsm-quickCatFloat{position:fixed;z-index:2147482200;display:flex;flex-direction:column;gap:2px;max-height:240px;overflow-y:auto;padding:5px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);box-shadow:0 18px 40px -18px rgba(0,0,0,.45)}
.dsm-quickCatItem{display:flex;align-items:center;gap:6px;width:100%;text-align:left;font:inherit;font-size:12.5px;padding:5px 7px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}
.dsm-quickCatItem[data-active='true']{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.dsm-quickCatItem[aria-pressed='true']{font-weight:600;color:var(--dsw-alias-brand-primary)}
.dsm-quickCatsRow{display:flex;flex-wrap:wrap;gap:4px}
.dsm-set{display:flex;flex-direction:column;gap:10px;max-width:520px}
.dsm-setTitle{margin:0;font-size:15px}
.dsm-setTip{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.dsm-setRow{display:flex;align-items:center;gap:10px;font-size:13px}
.dsm-setRow>span{flex:0 0 110px;color:var(--dsw-alias-label-secondary)}
.dsm-setInput{flex:1 1 auto;min-width:0;font:inherit;font-size:13px;height:30px;padding:0 9px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;outline:none}
.dsm-setInput:focus{border-color:var(--dsw-alias-brand-primary)}
.dsm-setActions{display:flex;align-items:center;gap:8px;margin-top:4px}
.dsm-setNote{font-size:12px;color:var(--dsw-alias-label-secondary)}
/* 快速便签 */
.dsm-quickLayer{position:fixed;inset:0;z-index:2147482000;pointer-events:auto;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh;background:color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent)}
.dsm-quickPanel{pointer-events:auto;position:relative;box-sizing:border-box;width:min(520px,92vw);display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:14px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 30px 70px -30px rgba(0,0,0,.55)}
.dsm-quickHead{display:flex;align-items:center;gap:7px;font-size:13px}
.dsm-quickConfirm{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;padding:7px 8px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);border:1px solid var(--dsw-alias-border-l1)}
.dsm-quickConfirm>span{flex:1 1 100%;color:var(--dsw-alias-label-secondary)}
.dsm-quickHint{flex:1 1 auto;text-align:right;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-quickInput{box-sizing:border-box;width:100%;min-height:88px;max-height:40vh;resize:vertical;font:inherit;font-size:14px;line-height:1.65;padding:9px 10px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;outline:none}
.dsm-quickInput:focus{border-color:var(--dsw-alias-brand-primary)}
.dsm-quickFoot{display:flex;align-items:center;gap:6px}
.dsm-quickFlash{font-size:11.5px;color:var(--dsw-alias-state-success-primary)}
.dsm-quickRecent{display:flex;flex-direction:column;gap:2px;padding-top:6px;border-top:1px dashed var(--dsw-alias-border-l1)}
.dsm-quickRecentTitle{font-size:11px;color:var(--dsw-alias-label-secondary);margin-bottom:2px}
.dsm-quickRecentItem{display:flex;align-items:center;gap:6px;width:100%;text-align:left;font:inherit;font-size:12.5px;padding:5px 6px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}
.dsm-quickRecentItem:hover{background:var(--dsw-alias-bg-layer-1)}
.dsm-quickDot{width:7px;height:7px;border-radius:50%;flex:none}
.dsm-quickRecentText{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* [[ 便签候选 */
.dsm-wikiList{position:absolute;left:8px;right:8px;bottom:calc(100% - 4px);z-index:2147482500;max-height:220px;overflow-y:auto;padding:5px;border-radius:10px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 18px 40px -18px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:2px}
.dsm-wikiInline .dsm-wikiList{position:static;left:auto;right:auto;top:auto;bottom:auto;max-height:200px}
.dsm-viewerEdit{position:relative;overflow:visible}
.dsm-viewerEdit .dsm-wikiList{top:calc(100% + 6px);bottom:auto}
.dsm-wikiItem{display:block;width:100%;text-align:left;font:inherit;font-size:12.5px;padding:6px 8px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-wikiItem[data-active='true'],.dsm-wikiItem:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.dsm-wikiEmpty{padding:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
/* 全文查看弹窗 */
.dsm-viewer{position:absolute;inset:0;z-index:55;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 26%,transparent)}
.dsm-viewerCard{box-sizing:border-box;display:flex;flex-direction:column;width:min(720px,100%);max-height:100%;border-radius:14px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 30px 70px -30px rgba(0,0,0,.55);overflow:hidden}
.dsm-viewerHead{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsm-viewAccent,#888) 10%,transparent)}
.dsm-viewerDot{width:9px;height:9px;border-radius:50%;flex:none;background:var(--dsm-viewAccent,#888)}
.dsm-viewerTitle{flex:1 1 auto;min-width:0;font-size:12.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsm-viewerLayer{position:absolute;inset:0;z-index:55;background:color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent)}
.dsm-viewerFloat{position:absolute;width:min(600px,94%);max-height:min(78%,720px);box-shadow:0 34px 80px -30px rgba(0,0,0,.6)}
.dsm-dragHandle{cursor:grab;user-select:none}
.dsm-dragHandle:active{cursor:grabbing}
.dsm-viewerEdit{padding:10px 12px}
.dsm-viewerInput{box-sizing:border-box;display:block;width:100%;min-height:260px;resize:vertical;font:inherit;font-size:14px;line-height:1.7;padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;outline:none}
.dsm-viewerInput:focus{border-color:var(--dsw-alias-brand-primary)}
.dsm-viewerBody{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px 18px 20px;font-size:14px;line-height:1.72}
.dsm-viewerBody .dsm-noteText{font-size:14px}
.dsm-viewerFoot{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:9px 12px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.dsm-viewerFoot .dsm-spacer{flex:1 1 auto}
.dsm-viewerHint{font-size:11px;color:var(--dsw-alias-label-secondary)}
/* 正文被裁掉时给出「还有内容」的线索 */
.dsm-noteBody{position:relative}
.dsm-noteMore{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:center;height:26px;padding-bottom:1px;pointer-events:auto;cursor:pointer;background:linear-gradient(to bottom,transparent,color-mix(in srgb,var(--dsm-accent) 20%,var(--dsw-alias-bg-layer-1)) 78%);color:var(--dsw-alias-label-secondary);font-size:11px;opacity:.9}
/* 提醒：角标按状态换色，编辑面板从按钮上方弹出 */
.dsm-remind{display:inline-flex;align-items:center;gap:3px;max-width:170px;padding:0 7px;border-radius:999px;font-size:10.5px;line-height:1.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid transparent}
.dsm-remind[data-kind='planned']{color:var(--dsw-alias-label-secondary);background:color-mix(in srgb,var(--dsw-alias-label-secondary) 10%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-label-secondary) 22%,transparent)}
.dsm-remind[data-kind='due']{color:#b3261e;background:rgba(179,38,30,.12);border-color:rgba(179,38,30,.34);animation:dsmDuePulse 1.6s ease-in-out infinite}
.dsm-remind[data-kind='overdue']{color:#9a6a00;background:rgba(154,106,0,.12);border-color:rgba(154,106,0,.3)}
.dsm-remind[data-kind='done']{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 26%,transparent)}
@keyframes dsmDuePulse{0%,100%{opacity:.72}50%{opacity:1}}
.dsm-remindPanelBelow{top:calc(100% + 6px);bottom:auto}
.dsm-remindPanel{position:absolute;right:6px;bottom:calc(100% + 6px);z-index:7;width:232px;padding:10px 11px;border-radius:10px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 14px 34px -14px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:8px;font-size:12px}
.dsm-remindRow{display:flex;align-items:center;gap:6px}
.dsm-remindLabel{flex:0 0 40px;color:var(--dsw-alias-label-secondary);font-size:11.5px}
.dsm-remindInput{flex:1 1 auto;min-width:0;font:inherit;font-size:12px;height:26px;padding:0 6px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsm-remindQuick{display:flex;gap:5px;flex-wrap:wrap}
.dsm-remindQuick .dsm-miniBtn{height:21px;font-size:11px;padding:0 7px}
.dsm-remindHint{font-size:11px;color:var(--dsw-alias-state-error-primary)}
.dsm-remindBtns{display:flex;align-items:center;gap:6px;margin-top:2px}
.dsm-remindBtns .dsm-spacer{flex:1 1 auto}
.dsm-toastWrap{position:absolute;z-index:40;left:50%;top:10px;transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;max-width:min(420px,92%);pointer-events:none}
.dsm-toastBody{flex:1 1 auto;min-width:0}
.dsm-toastActions{display:flex;gap:5px;margin-top:6px}
.dsm-toastActions .dsm-miniBtn{height:20px;font-size:11px;padding:0 7px;background:var(--dsw-alias-bg-layer-1)}
.dsm-ovlAll{align-self:center;pointer-events:auto;font:inherit;font-size:11px;height:22px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsm-ovlAll:hover{color:var(--dsw-alias-label-primary)}
.dsm-ovl{position:fixed;z-index:2147483000;left:50%;top:14px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;max-width:min(440px,92vw);pointer-events:none}
.dsm-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:8px;padding:9px 12px;border-radius:10px;background:var(--dsw-alias-bg-overlay);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,var(--dsw-alias-border-l1));box-shadow:0 12px 30px -14px rgba(0,0,0,.4);background:var(--dsw-alias-bg-base);font-size:12.5px;line-height:1.5;cursor:pointer;animation:dsmToastIn .18s ease-out}
.dsm-toast strong{font-weight:600}
@keyframes dsmToastIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}

`;


    /* #region markdown-parser */
    // 便签墙的 Markdown 子集渲染：只生成 React 元素、不拼 HTML 字符串，
    // 所以不需要额外的 HTML 净化（文本永远走 textContent 路径）。
    // 支持：标题、段落/软换行、粗体/斜体/删除线/行内代码、围栏代码块、无序/有序/任务列表、
    //       引用、分隔线、[链接](url)、裸 http(s) 链接、[[双链]]。
    const MD_FENCE = /^\s{0,3}(```+|~~~+)\s*([\w+#.-]*)\s*$/
    const MD_HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
    const MD_HR = /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/
    const MD_QUOTE = /^\s{0,3}>\s?(.*)$/
    const MD_LIST = /^\s{0,3}([-*+]|\d{1,9}[.)])\s+(.*)$/
    const MD_TASK = /^\[([ xX])\]\s+(.*)$/
    const MD_TABLE_SEP = /^\s{0,3}\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)+\|?\s*$/
    const MD_INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(~~[^~\n]+~~)|(\[\[[^\]\n]+\]\])|(!?\[[^\]\n]*\]\([^)\s]+\))|(https?:\/\/[^\s<>()]+)/

    function mdIsBlockStart(line) {
      return MD_FENCE.test(line) || MD_HEADING.test(line) || MD_HR.test(line) || MD_QUOTE.test(line) || MD_LIST.test(line)
    }

    /** 拆一行表格：去掉首尾竖线，按 | 切成单元格。 */
    function mdSplitRow(line) {
      return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
    }

    function mdAlignOf(cell) {
      if (/^:-+:$/.test(cell)) return 'center'
      if (/^-+:$/.test(cell)) return 'right'
      return 'left'
    }

    /** 表格起点：本行有竖线，下一行是分隔行且列数一致（GFM 语义）。 */
    function mdTableStartsAt(lines, index) {
      const head = lines[index]
      const sep = lines[index + 1]
      if (head === undefined || sep === undefined) return false
      if (head.indexOf('|') < 0 || !MD_TABLE_SEP.test(sep)) return false
      return mdSplitRow(head).length === mdSplitRow(sep).length
    }

    function parseMarkdownBlocks(text) {
      const lines = String(text === undefined || text === null ? '' : text).replace(/\r\n?/g, '\n').split('\n')
      const blocks = []
      let index = 0
      while (index < lines.length) {
        const line = lines[index]
        if (!line.trim()) {
          index += 1
          continue
        }
        const fence = MD_FENCE.exec(line)
        if (fence) {
          const closing = fence[1][0] === '`' ? /^\s{0,3}```+\s*$/ : /^\s{0,3}~~~+\s*$/
          const code = []
          index += 1
          while (index < lines.length && !closing.test(lines[index])) {
            code.push(lines[index])
            index += 1
          }
          index += 1
          blocks.push({ type: 'code', lang: fence[2] || '', text: code.join('\n') })
          continue
        }
        const heading = MD_HEADING.exec(line)
        if (heading) {
          blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
          index += 1
          continue
        }
        if (MD_HR.test(line)) {
          blocks.push({ type: 'hr' })
          index += 1
          continue
        }
        if (MD_QUOTE.test(line)) {
          const quoted = []
          while (index < lines.length) {
            const match = MD_QUOTE.exec(lines[index])
            if (!match) break
            quoted.push(match[1])
            index += 1
          }
          blocks.push({ type: 'quote', children: parseMarkdownBlocks(quoted.join('\n')) })
          continue
        }
        const listMatch = MD_LIST.exec(line)
        if (listMatch) {
          const ordered = !/^[-*+]$/.test(listMatch[1])
          const items = []
          while (index < lines.length) {
            const current = MD_LIST.exec(lines[index])
            if (!current) break
            if (!/^[-*+]$/.test(current[1]) !== ordered) break
            const lineIndex = index
            let body = current[2]
            index += 1
            // 缩进续行并进同一项（便签里通常是软换行）
            while (index < lines.length && lines[index].trim() && !mdIsBlockStart(lines[index])) {
              body += '\n' + lines[index].trim()
              index += 1
            }
            const task = MD_TASK.exec(body)
            items.push(task
              ? { checked: task[1].toLowerCase() === 'x', text: task[2], line: lineIndex }
              : { text: body, line: lineIndex })
          }
          blocks.push({ type: 'list', ordered, items })
          continue
        }
        if (mdTableStartsAt(lines, index)) {
          const header = mdSplitRow(lines[index])
          const alignments = mdSplitRow(lines[index + 1]).map(mdAlignOf)
          index += 2
          const rows = []
          while (index < lines.length) {
            const row = lines[index]
            if (!row.trim() || row.indexOf('|') < 0 || mdIsBlockStart(row)) break
            rows.push(mdSplitRow(row))
            index += 1
          }
          blocks.push({ type: 'table', header, alignments, rows })
          continue
        }
        const paragraph = [line]
        index += 1
        while (index < lines.length && lines[index].trim() && !mdIsBlockStart(lines[index]) && !mdTableStartsAt(lines, index)) {
          paragraph.push(lines[index])
          index += 1
        }
        blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
      }
      return blocks
    }

    const IMAGE_REF = 'dsh-memo://';
    const IMAGE_ROUTE = '/dsh-memo/images';

    /** 便签里的图片地址：本地图走 dsh-memo://，也放行 http(s)。 */
    function resolveImageSrc(raw) {
      const value = String(raw === undefined || raw === null ? '' : raw).trim();
      if (value.indexOf(IMAGE_REF) === 0) {
        const name = value.slice(IMAGE_REF.length);
        return /^[A-Za-z0-9._-]+$/.test(name) ? `${IMAGE_ROUTE}/${name}` : null;
      }
      // vault 里的附件路径（/attachments/2026-11-03/xxx.png）：取文件名用本地缓存那份
      if (value.charAt(0) === '/') {
        const basename = /(?:^|\/)([A-Za-z0-9._-]+)$/.exec(value);
        return basename ? `${IMAGE_ROUTE}/${basename[1]}` : null;
      }
      return /^https?:\/\//i.test(value) ? value : null;
    }

    function safeHref(raw) {
      const value = String(raw === undefined || raw === null ? '' : raw).trim()
      return /^(https?:|mailto:)/i.test(value) ? value : null
    }

    function parseInlineNodes(text) {
      const source = String(text === undefined || text === null ? '' : text)
      const nodes = []
      let index = 0
      while (index < source.length) {
        const rest = source.slice(index)
        const match = MD_INLINE.exec(rest)
        if (!match) {
          nodes.push({ type: 'text', text: rest })
          break
        }
        if (match.index > 0) nodes.push({ type: 'text', text: rest.slice(0, match.index) })
        const token = match[0]
        if (token.charAt(0) === '`') nodes.push({ type: 'code', text: token.slice(1, -1) })
        else if (token.slice(0, 2) === '**' || token.slice(0, 2) === '__') nodes.push({ type: 'strong', children: parseInlineNodes(token.slice(2, -2)) })
        else if (token.slice(0, 2) === '~~') nodes.push({ type: 'del', children: parseInlineNodes(token.slice(2, -2)) })
        else if (token.slice(0, 2) === '[[') {
          const inner = token.slice(2, -2)
          const bar = inner.indexOf('|')
          nodes.push(bar >= 0
            ? { type: 'wikilink', text: inner.slice(0, bar).trim(), alias: inner.slice(bar + 1).trim() }
            : { type: 'wikilink', text: inner.trim(), alias: '' })
        }
        else if (token.slice(0, 2) === '![') {
          const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token);
          if (image) nodes.push({ type: 'image', alt: image[1], src: image[2] });
          else nodes.push({ type: 'text', text: token });
        } else if (token.charAt(0) === '[') {
          const link = /^\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token)
          if (link) nodes.push({ type: 'link', text: link[1] || link[2], href: link[2] })
          else nodes.push({ type: 'text', text: token })
        } else if (token.slice(0, 4) === 'http') nodes.push({ type: 'link', text: token, href: token })
        else nodes.push({ type: 'em', children: parseInlineNodes(token.slice(1, -1)) })
        index += match.index + token.length
      }
      return nodes
    }
    /* #endregion markdown-parser */

    const IMAGE_MAX_EDGE = 1600;
    const IMAGE_INLINE_LIMIT = 900 * 1024;

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
      });
    }

    /** 大图先缩到 1600px 再转 webp（保留透明通道），省流量也省磁盘。 */
    async function prepareImageDataUrl(file) {
      if (!file || !/^image\//i.test(String(file.type || ''))) throw new Error('只支持图片文件');
      if (/^image\/gif$/i.test(String(file.type || ''))) return readFileAsDataUrl(file); // 别把动图压成静态
      const bitmap = typeof createImageBitmap === 'function' ? await createImageBitmap(file).catch(() => null) : null;
      if (!bitmap) return readFileAsDataUrl(file);
      const longest = Math.max(bitmap.width || 0, bitmap.height || 0);
      if (longest <= IMAGE_MAX_EDGE && file.size <= IMAGE_INLINE_LIMIT) {
        if (bitmap.close) bitmap.close();
        return readFileAsDataUrl(file);
      }
      const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(1, longest));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        if (bitmap.close) bitmap.close();
        return readFileAsDataUrl(file);
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (bitmap.close) bitmap.close();
      return canvas.toDataURL('image/webp', 0.9);
    }

    /** 选文件（取消时 resolve(null)，不会把上传态卡住）。 */
    function pickImageFile() {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        let settled = false;
        const done = (file) => {
          if (settled) return;
          settled = true;
          resolve(file);
        };
        input.addEventListener('change', () => done((input.files && input.files[0]) || null), { once: true });
        input.addEventListener('cancel', () => done(null), { once: true });
        input.click();
      });
    }

    /** 从剪贴板/拖拽里挑出第一张图片文件。 */
    function imageFileFromClipboard(event) {
      const data = event && event.clipboardData;
      if (!data) return null;
      if (data.items && data.items.length) {
        for (const item of data.items) {
          if (item.kind === 'file' && /^image\//i.test(String(item.type || ''))) {
            const file = item.getAsFile();
            if (file) return file;
          }
        }
      }
      if (data.files && data.files.length) {
        for (const file of data.files) {
          if (/^image\//i.test(String(file.type || ''))) return file;
        }
      }
      return null;
    }

    /** 提醒状态：due（到点没提醒）/ overdue（提醒过但没完成）/ planned（未来）/ done。 */
    function reminderStateOf(note, now) {
      if (!note || !note.remindAt) return null
      const due = Date.parse(note.remindAt)
      if (!Number.isFinite(due)) return null
      const fired = note.firedKey === note.remindAt
      if (note.done) return { kind: 'done', due }
      if (due <= now) return { kind: fired ? 'overdue' : 'due', due }
      return { kind: 'planned', due }
    }

    /** 提醒角标文案：今天 09:00 / 明天 09:00 / 11-08 09:00，带重复后缀。 */
    function formatRemind(iso, language, repeat, now, t) {
      const stamp = Date.parse(iso)
      if (!Number.isFinite(stamp)) return ''
      const date = new Date(stamp)
      const today = new Date(now)
      const sameDay = date.toDateString() === today.toDateString()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const isTomorrow = date.toDateString() === tomorrow.toDateString()
      const pad = (value) => String(value).padStart(2, '0')
      const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
      let day
      if (sameDay) day = t('remind.today')
      else if (isTomorrow) day = t('remind.tomorrow')
      else day = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      const base = `${day} ${clock}`
      if (!repeat) return base
      const suffix = { daily: t('remind.daily'), weekly: t('remind.weekly'), monthly: t('remind.monthly') }[repeat.kind]
      return suffix ? `${base} · ${suffix}` : base
    }

    /** ISO → <input type="datetime-local"> 需要的本地时间串。 */
    function toLocalInputValue(iso) {
      const stamp = Date.parse(iso)
      if (!Number.isFinite(stamp)) return ''
      const date = new Date(stamp)
      const pad = (value) => String(value).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /** <input type="datetime-local"> 的值 → 引用串（无时区按本地解释，宿主会存成带偏移的时刻）。 */
    function fromLocalInputValue(value) {
      if (!value) return null
      const stamp = Date.parse(value)
      if (!Number.isFinite(stamp)) return null
      return new Date(stamp).toISOString()
    }

    /** 把第 lineIndex 行的 `- [ ]` / `- [x]` 翻转；不是任务行就返回 null。 */
    function toggleTaskLine(text, lineIndex, checked) {
      const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
      if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) return null;
      const match = /^(\s*[-*+]\s+)\[([ xX])\]([\s\S]*)$/.exec(lines[lineIndex]);
      if (!match) return null;
      const next = `${match[1]}[${checked ? 'x' : ' '}]${match[3]}`;
      if (next === lines[lineIndex]) return null;
      lines[lineIndex] = next;
      return lines.join('\n');
    }

    /**
     * 弹层方向：默认向左扩展（右对齐锚点）；左边空间不够就改成向右展开，
     * 免得最左侧的便签被侧栏挡住。
     */
    function popSideFor(anchor, width) {
      if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return 'right';
      const rect = anchor.getBoundingClientRect();
      let left = 0;
      try {
        const root = anchor.closest && anchor.closest('.dsm-root');
        if (root) left = root.getBoundingClientRect().left;
      } catch (error) {
        left = 0;
      }
      return rect.right - (width || 240) < left + 8 ? 'left' : 'right';
    }


    /** 光标前是不是刚打了 `[[`（返回 {start, query}）。 */
    function wikiQueryAt(text, caret) {
      const value = String(text || '');
      const upto = value.slice(0, Number.isFinite(caret) ? caret : value.length);
      const open = upto.lastIndexOf('[[');
      if (open < 0) return null;
      if (upto.lastIndexOf(']]') > open) return null;
      const query = upto.slice(open + 2);
      if (query.indexOf('\n') >= 0 || query.indexOf('[') >= 0 || query.indexOf(']') >= 0) return null;
      if (query.length > 60) return null;
      return { start: open, query };
    }

    /** 把 `[[查询` 换成 `[[标题]]`，返回新文本和光标位置。 */
    function applyWikiLink(text, start, title) {
      const value = String(text || '');
      const caret = value.indexOf(']]', start) >= 0 ? start : value.length;
      void caret;
      const end = start + 2 + (value.slice(start + 2).match(/^[^\n\]]*/) || [''])[0].length;
      const insert = `[[${title}]]`;
      return {
        text: value.slice(0, start) + insert + value.slice(end),
        caret: start + insert.length,
      };
    }

    /** `[[` 之后弹出的便签候选列表。 */
    function WikiSuggest(props) {
      const notes = props.notes || [];
      const query = String(props.query || '').trim().toLowerCase();
      const items = notes
        .filter((note) => (note.archived !== true))
        .filter((note) => {
          if (!query) return true;
          return String(note.text || '').toLowerCase().indexOf(query) >= 0;
        })
        .slice(0, 40);
      if (!items.length) {
        return h('div', { className: 'dsm-wikiList' }, h('div', { className: 'dsm-wikiEmpty' }, t('wiki.empty')));
      }
      return h('div', { className: 'dsm-wikiList', role: 'listbox' },
        items.map((note, index) => h('button', {
          key: note.id,
          type: 'button',
          className: 'dsm-wikiItem',
          'data-active': index === (props.index || 0) ? 'true' : undefined,
          role: 'option',
          'aria-selected': index === (props.index || 0) ? 'true' : undefined,
          onMouseDown: (event) => event.preventDefault(),
          onClick: () => props.onPick(note),
        }, h('span', { className: 'dsm-wikiItemTitle' }, noteTitleOf(note) || note.id.slice(0, 8)))));
    }

    /** 便签的「标题」= 第一行非空文本（wiki 链接用它当锚点）。 */
    function noteTitleOf(note) {
      const line = String((note && note.text) || '').split('\n').map((item) => item.trim()).find(Boolean) || '';
      return line.replace(/^#+\s*/, '');
    }

    /** [[名字]] → 便签：id 优先，其次首行精确/前缀，最后全文包含。 */
    function resolveWikiNote(name, notes) {
      const wanted = String(name || '').trim();
      if (!wanted) return null;
      const direct = (notes || []).find((note) => note.id === wanted);
      if (direct) return direct;
      const norm = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const target = norm(wanted);
      const title = (note) => norm(noteTitleOf(note));
      return (notes || []).find((note) => title(note) === target)
        || (notes || []).find((note) => title(note).startsWith(target))
        || null;
    }

    /* #region packer */
    /** 每行想要的张数（从多到少试，保证单张不会太窄）。 */
    const PER_ROW_STEPS = [5, 4, 3, 2, 1]
    const MIN_PER_ROW_WIDTH = 180

    /** 便签宽度：手动调过就用它；否则默认「一行五张」，太窄就逐级减少。 */
    function packWidthOf(note, maxWidth, gap) {
      const explicit = Number.isFinite(note.width) && note.width > 0;
      const base = noteWidthOf(note);
      if (explicit) return Math.min(base, maxWidth);
      for (const count of PER_ROW_STEPS) {
        const width = (maxWidth - gap * (count - 1)) / count;
        if (width >= MIN_PER_ROW_WIDTH) return Math.min(width, maxWidth);
      }
      return maxWidth;
    }

    /**
     * 便签排版：按顺序给每张找「最靠上、再最靠左」的空位（密集装箱）。
     * 所以某张便签被拖高之后，它旁边那些矮便签下方的空隙，后面的便签还能钻进去——
     * 错落排布、不浪费空间。间距横竖都用同一个 gap。
     */
    function packNotes(notes, width, gap) {
      const maxWidth = Math.max(120, width);
      const positions = new Map();
      const placed = [];
      for (const note of notes) {
        const w = packWidthOf(note, maxWidth, gap);
        const h = noteHeightOf(note);
        let spot = null;
        const rows = [...new Set([0].concat(placed.map((rect) => rect.y + rect.h + gap)))].sort((a, b) => a - b);
        for (const y of rows) {
          const columns = [...new Set([0].concat(
            placed
              .filter((rect) => rect.y < y + h && y < rect.y + rect.h)
              .map((rect) => rect.x + rect.w + gap),
          ))].sort((a, b) => a - b);
          for (const x of columns) {
            if (x + w > maxWidth + 0.5) continue;
            const clash = placed.some((rect) => rect.x < x + w && x < rect.x + rect.w && rect.y < y + h && y < rect.y + rect.h);
            if (!clash) {
              spot = { x, y, w, h };
              break;
            }
          }
          if (spot) break;
        }
        if (!spot) {
          const bottom = placed.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0);
          spot = { x: 0, y: placed.length ? bottom + gap : 0, w, h };
        }
        placed.push(spot);
        positions.set(note.id, spot);
      }
      const height = placed.reduce((max, rect) => Math.max(max, rect.y + rect.h), 0);
      return { positions, height };
    }
    /* #endregion packer */

    /** 面板间共享的内存缓存：切换面板回来时不闪空白。 */
    const cache = { notes: [], status: 'idle', error: '', sync: null, categories: [], activeCategory: 'all' };
    /** 幽灵卡上的交互一律空转（它只是个视觉副本）。 */
    const noopHandler = () => {};

    const ICONS = {
      grip: () => [0, 1, 2].flatMap((row) => [0, 1].map((column) => h('circle', {
        key: `${row}-${column}`,
        cx: 5.2 + column * 5.6,
        cy: 3.4 + row * 4.6,
        r: 1.35,
        fill: 'currentColor',
        stroke: 'none',
      }))),
      refresh: () => [
        h('path', { key: 'a', d: 'M12.7 8a4.7 4.7 0 1 1-1.4-3.3' }),
        h('path', { key: 'b', d: 'M11.5 1.9v3h3' }),
      ],
      search: () => [
        h('circle', { key: 'a', cx: 7, cy: 7, r: 4.3 }),
        h('path', { key: 'b', d: 'M10.3 10.3 13.5 13.5' }),
      ],
      pin: () => [
        h('path', { key: 'a', d: 'M5.9 2.6h4.2l-.5 3.2 2 2v1.1H4.4V7.8l2-2-.5-3.2Z' }),
        h('path', { key: 'b', d: 'M8 9v4.4' }),
      ],
      palette: () => [
        h('path', { key: 'a', d: 'M8 2.6a5.4 5.4 0 1 0 0 10.8c.9 0 1.2-.6 1.2-1.2 0-.7-.5-.9-.5-1.5 0-.6.4-1 1-1h1.1c1.1 0 1.8-.8 1.8-2A5.2 5.2 0 0 0 8 2.6Z' }),
        h('circle', { key: 'b', cx: 6, cy: 6.3, r: 0.72, fill: 'currentColor', stroke: 'none' }),
        h('circle', { key: 'c', cx: 9.4, cy: 5.6, r: 0.72, fill: 'currentColor', stroke: 'none' }),
        h('circle', { key: 'd', cx: 5.1, cy: 9, r: 0.72, fill: 'currentColor', stroke: 'none' }),
      ],
      tag: () => [
        h('path', { key: 'a', d: 'M7.4 2.6H3.2a.6.6 0 0 0-.6.6v4.2l6.3 6.3a1 1 0 0 0 1.4 0l3.5-3.5a1 1 0 0 0 0-1.4L7.4 2.6Z' }),
        h('circle', { key: 'b', cx: 5.4, cy: 5.4, r: 0.85, fill: 'currentColor', stroke: 'none' }),
      ],
      plus: () => [h('path', { key: 'a', d: 'M8 3.2v9.6M3.2 8h9.6' })],
      grid: () => [
        h('rect', { key: 'a', x: 2.6, y: 2.6, width: 4.6, height: 4.6, rx: 1.1 }),
        h('rect', { key: 'b', x: 8.8, y: 2.6, width: 4.6, height: 4.6, rx: 1.1 }),
        h('rect', { key: 'c', x: 2.6, y: 8.8, width: 4.6, height: 4.6, rx: 1.1 }),
        h('rect', { key: 'd', x: 8.8, y: 8.8, width: 4.6, height: 4.6, rx: 1.1 }),
      ],
      chevronLeft: () => [h('path', { key: 'p', d: 'M10 3.5 5.5 8l4.5 4.5' })],
      chevronRight: () => [h('path', { key: 'p', d: 'M6 3.5 10.5 8 6 12.5' })],
      archive: () => [
        h('rect', { key: 'b', x: 2.2, y: 3, width: 11.6, height: 3.2, rx: 1 }),
        h('path', { key: 'c', d: 'M3.6 6.2v5.6c0 .9.7 1.6 1.6 1.6h5.6c.9 0 1.6-.7 1.6-1.6V6.2' }),
        h('path', { key: 'l', d: 'M6.6 9h2.8' }),
      ],
      trash: () => [
        h('path', { key: 'l', d: 'M3 4.6h10' }),
        h('path', { key: 'b', d: 'M6.2 4.6V3.4c0-.5.4-.9.9-.9h1.8c.5 0 .9.4.9.9v1.2' }),
        h('path', { key: 'c', d: 'M4.6 4.6l.6 8c0 .6.5 1 1.1 1h3.4c.6 0 1.1-.4 1.1-1l.6-8' }),
      ],
      calendar: () => [
        h('rect', { key: 'r', x: 2.4, y: 3.4, width: 11.2, height: 10.2, rx: 1.6 }),
        h('path', { key: 'l', d: 'M2.4 6.6h11.2M5.6 2.2v2.4M10.4 2.2v2.4' }),
      ],
      eye: () => [
        h('path', { key: 'o', d: 'M1.6 8S4 3.6 8 3.6 14.4 8 14.4 8 12 12.4 8 12.4 1.6 8 1.6 8Z' }),
        h('circle', { key: 'p', cx: 8, cy: 8, r: 1.9 }),
      ],
      list: () => [
        h('path', { key: 'a', d: 'M5.6 4.4h7M5.6 8h7M5.6 11.6h7' }),
        h('circle', { key: 'b', cx: 3.2, cy: 4.4, r: 0.9 }),
        h('circle', { key: 'c', cx: 3.2, cy: 8, r: 0.9 }),
        h('circle', { key: 'd', cx: 3.2, cy: 11.6, r: 0.9 }),
      ],
      clock: () => [
        h('circle', { key: 'c', cx: 8, cy: 8, r: 5.4 }),
        h('path', { key: 'h', d: 'M8 4.8V8l2.2 1.5' }),
      ],
      image: () => [
        h('rect', { key: 'a', x: 2.6, y: 3.2, width: 10.8, height: 9.6, rx: 1.6 }),
        h('circle', { key: 'b', cx: 6, cy: 6.4, r: 1.1 }),
        h('path', { key: 'c', d: 'M3.4 11.6 6.9 8.2l2 2 1.6-1.5 2.1 2.9' }),
      ],
      edit: () => [h('path', { key: 'a', d: 'M10.7 2.8l2.5 2.5-7.4 7.4-3.1.6.6-3.1 7.4-7.4Z' })],
      trash: () => [h('path', { key: 'a', d: 'M2.9 4.4h10.2M6 4.4V2.9h4v1.5M4.5 4.4l.5 8.1c0 .6.5 1 1 1h4c.6 0 1-.4 1-1l.5-8.1' })],
      check: () => [h('path', { key: 'a', d: 'M2.9 8.5 6.3 11.9 13.1 4.5' })],
      close: () => [h('path', { key: 'a', d: 'M4.1 4.1l7.8 7.8M11.9 4.1l-7.8 7.8' })],
    };

    function Icon(props) {
      const size = props.size || 16;
      const paths = ICONS[props.name];
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
        style: { display: 'block' },
      }, paths ? paths() : null);
    }


    /** 渲染期上下文：wiki 链接要知道「有哪些便签、点了干什么」（渲染是同步的）。 */
    let renderWiki = null;
    function withWikiContext(context, render) {
      const previous = renderWiki;
      renderWiki = context || null;
      try {
        return render();
      } finally {
        renderWiki = previous;
      }
    }

    /* #endregion */
        /** 把一段文本按关键词切开，命中处包 <mark>。 */
    function highlightPieces(text, needle) {
      const value = String(text || '');
      const query = String(needle || '').trim();
      if (!query || !value) return [value];
      const lower = value.toLowerCase();
      const target = query.toLowerCase();
      const parts = [];
      let cursor = 0;
      let hit = lower.indexOf(target);
      let guard = 0;
      while (hit >= 0 && guard < 200) {
        guard += 1;
        if (hit > cursor) parts.push(value.slice(cursor, hit));
        parts.push({ keyword: value.slice(hit, hit + target.length) });
        cursor = hit + target.length;
        hit = lower.indexOf(target, cursor);
      }
      if (cursor < value.length) parts.push(value.slice(cursor));
      return parts;
    }

    /** 行内节点 → React 元素。文本一律作为 text 子节点，天然转义。 */
    function renderMdInline(nodes, prefix, onImageClick, highlight) {
      return (nodes || []).map((node, index) => {
        const key = `${prefix}-${index}`
        if (node.type === 'text') {
          if (!highlight) return node.text;
          const pieces = highlightPieces(node.text, highlight);
          if (pieces.length === 1 && typeof pieces[0] === 'string') return node.text;
          return pieces.map((piece, pieceIndex) => (typeof piece === 'string'
            ? piece
            : h('mark', { key: `${key}-h${pieceIndex}`, className: 'dsm-md-hit' }, piece.keyword)));
        }
        if (node.type === 'code') return h('code', { key, className: 'dsm-md-code' }, node.text)
        if (node.type === 'strong') return h('strong', { key }, renderMdInline(node.children, key, onImageClick))
        if (node.type === 'em') return h('em', { key }, renderMdInline(node.children, key, onImageClick))
        if (node.type === 'del') return h('del', { key }, renderMdInline(node.children, key, onImageClick))
        if (node.type === 'wikilink') {
          const label = node.alias || node.text;
          const wikiCtx = renderWiki;
          const target = wikiCtx ? resolveWikiNote(node.text, wikiCtx.notes) : null;
          const clickable = wikiCtx && typeof wikiCtx.onOpen === 'function' && target;
          if (!clickable) {
            return h('span', {
              key,
              className: 'dsm-md-wiki',
              'data-broken': renderWiki && !target ? 'true' : undefined,
              title: target ? `[[${node.text}]]` : `[[${node.text}]]（没找到这张便签）`,
            }, label);
          }
          return h('button', {
            key,
            type: 'button',
            className: 'dsm-md-wiki',
            title: `[[${node.text}]]`,
            onClick: (event) => {
              event.stopPropagation();
              event.preventDefault();
              wikiCtx.onOpen(target.id, label);
            },
            onDoubleClick: (event) => event.stopPropagation(),
          }, label);
        }
        if (node.type === 'image') {
          const src = resolveImageSrc(node.src);
          if (!src) return node.alt || '';
          return h('img', {
            key,
            className: 'dsm-md-img',
            src,
            alt: node.alt || '',
            loading: 'lazy',
            draggable: false,
            onDoubleClick: (event) => event.stopPropagation(),
            onClick: (event) => {
              event.stopPropagation();
              if (onImageClick) onImageClick(src, node.alt || '');
            },
          });
        }
        if (node.type === 'link') {
          const href = safeHref(node.href)
          if (!href) return node.text
          return h('a', {
            key,
            className: 'dsm-md-link',
            href,
            target: '_blank',
            rel: 'noreferrer noopener',
            onDoubleClick: (event) => event.stopPropagation(),
          }, node.text)
        }
        return null
      })
    }

    /** 块节点 → React 元素。标题只用到 h3–h6，避免在页面里抢 h1/h2 的语义。 */
    function renderMdBlocks(blocks, prefix, onImageClick, onToggleTask, taskLabel, highlight) {
      return (blocks || []).map((block, index) => {
        const key = `${prefix}-${index}`
        if (block.type === 'heading') {
          const level = Math.min(6, Math.max(3, block.level + 2))
          return h(`h${level}`, {
            key,
            className: `dsm-md-heading dsm-md-h${block.level}`,
          }, renderMdInline(parseInlineNodes(block.text), key, onImageClick, highlight))
        }
        if (block.type === 'paragraph') {
          const lines = block.text.split('\n')
          const children = []
          lines.forEach((line, lineIndex) => {
            if (lineIndex > 0) children.push(h('br', { key: `${key}-br-${lineIndex}` }))
            renderMdInline(parseInlineNodes(line), `${key}-${lineIndex}`, onImageClick, highlight).forEach((node) => children.push(node))
          })
          return h('p', { key, className: 'dsm-md-p' }, children)
        }
        if (block.type === 'code') {
          return h('pre', { key, className: 'dsm-md-pre' }, h('code', null, block.text))
        }
        if (block.type === 'quote') {
          return h('blockquote', { key, className: 'dsm-md-quote' }, renderMdBlocks(block.children, key))
        }
        if (block.type === 'hr') return h('hr', { key, className: 'dsm-md-hr' })
        if (block.type === 'table') {
          const columns = block.header.length
          const cell = (content, tag, cellKey, align) => h(tag, {
            key: cellKey,
            style: align === 'left' ? undefined : { textAlign: align },
          }, renderMdInline(parseInlineNodes(content), cellKey, onImageClick, highlight))
          const headRow = h('tr', null, block.header.map((text, column) => cell(text, 'th', `${key}-h${column}`, block.alignments[column] || 'left')))
          const bodyRows = block.rows.map((row, rowIndex) => h('tr', { key: `${key}-r${rowIndex}` },
            Array.from({ length: columns }, (unused, column) => cell(
              row[column] === undefined ? '' : row[column],
              'td',
              `${key}-${rowIndex}-${column}`,
              block.alignments[column] || 'left',
            ))))
          return h('div', { key, className: 'dsm-md-tableWrap' },
            h('table', { className: 'dsm-md-table' },
              h('thead', null, headRow),
              bodyRows.length ? h('tbody', null, bodyRows) : null))
        }
        if (block.type === 'list') {
          const items = block.items.map((item, itemIndex) => {
            const itemKey = `${key}-i${itemIndex}`
            if (item.checked === undefined) {
              return h('li', { key: itemKey }, renderMdInline(parseInlineNodes(item.text), itemKey, onImageClick, highlight))
            }
            const canToggle = typeof onToggleTask === 'function' && Number.isInteger(item.line);
            return h('li', { key: itemKey, className: 'dsm-md-task', 'data-checked': item.checked ? 'true' : undefined },
              h(canToggle ? 'button' : 'span', {
                key: 'c',
                type: canToggle ? 'button' : undefined,
                className: 'dsm-md-check',
                'data-checked': item.checked ? 'true' : undefined,
                'aria-hidden': canToggle ? undefined : true,
                'aria-label': canToggle ? (taskLabel || 'toggle') : undefined,
                onClick: canToggle
                  ? (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    onToggleTask(item.line, !item.checked);
                  }
                  : undefined,
                onDoubleClick: canToggle ? (event) => event.stopPropagation() : undefined,
              }),
              h('span', { key: 't' }, renderMdInline(parseInlineNodes(item.text), itemKey, onImageClick, highlight)))
          })
          return block.ordered
            ? h('ol', { key, className: 'dsm-md-list' }, items)
            : h('ul', { key, className: 'dsm-md-list' }, items)
        }
        return null
      })
    }

    /** 左栏导航图标：currentColor 跟随侧栏选中态，无需自己读 active。 */
    function MemoRailIcon(props) {
      const size = props.size || 16;
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.25,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
        style: { display: 'block' },
      },
        h('path', { key: 'a', d: 'M4.4 2.4h7.2a1.6 1.6 0 0 1 1.6 1.6v5.4l-3.8 3.8H4.4a1.6 1.6 0 0 1-1.6-1.6V4a1.6 1.6 0 0 1 1.6-1.6Z' }),
        h('path', { key: 'b', d: 'M9.4 13.2v-2.7a1.1 1.1 0 0 1 1.1-1.1h2.7' }),
        h('path', { key: 'c', d: 'M5.6 6.1h4.9M5.6 8.5h2.9', opacity: 0.5 }),
      );
    }

    async function apiCall(method, args) {
      const response = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method, args: args || {} }),
        cache: 'no-store',
      });
      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error('便签服务返回了非 JSON 响应');
      }
      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || '便签服务出错了');
      }
      return payload.result || {};
    }

    function timeAgo(iso, language) {
      const stamp = Date.parse(iso);
      if (!Number.isFinite(stamp)) return '';
      const minutes = Math.floor((Date.now() - stamp) / 60000);
      if (minutes < 1) return language === 'zh' ? '刚刚' : 'just now';
      if (minutes < 60) return language === 'zh' ? `${minutes} 分钟前` : `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return language === 'zh' ? `${hours} 小时前` : `${hours} h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return language === 'zh' ? `${days} 天前` : `${days} d ago`;
      return new Date(stamp).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
    }

    function fullTime(iso, language) {
      const stamp = Date.parse(iso);
      if (!Number.isFinite(stamp)) return '';
      return new Date(stamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
    }

    function makeUseLang(locale) {
      const subscribe = (callback) => locale.subscribe(callback);
      const read = () => locale.getSnapshot();
      return function useLang() {
        const snapshot = useSyncExternalStore(subscribe, read, read);
        const active = String(snapshot && snapshot.active ? snapshot.active : '').toLowerCase();
        return active.indexOf('zh') === 0 ? 'zh' : 'en';
      };
    }

    /**
     * 右侧便签抽屉：会话页点一下就滑出，边聊边扫便签。
     * 自己画在 shell.overlay 上（不依赖 DSH 的右栏 tab 契约，那个需要 primitives 里的 artwork 组件）。
     */
    function makeMemoDrawer(t, actions) {
      return function MemoDrawer() {
        const [open, setOpen] = useState(false);
        const [query, setQuery] = useState('');
        const [notes, setNotes] = useState([]);
        const [view, setView] = useState(null);
        const [deep, setDeep] = useState([]);
        const [activeIndex, setActiveIndex] = useState(0);
        const [drag, setDrag] = useState(null);
        const prevFocus = useRef(null);

        const refresh = useCallback(async () => {
          try {
            const result = await apiCall('list');
            setNotes((result && Array.isArray(result.notes) ? result.notes : []).filter((note) => note.archived !== true));
          } catch (error) {
            setNotes([]);
          }
        }, []);

        useEffect(() => {
          const onOpen = () => {
            if (open) {
              setOpen(false);
              return;
            }
            if (typeof document !== 'undefined') prevFocus.current = document.activeElement;
            setOpen(true);
            setActiveIndex(0);
            refresh();
          };
          let lastKeyAt = 0;
          const onKey = (event) => {
            if (!event.altKey || event.ctrlKey || event.metaKey) return;
            const drawKey = String(event.key || '').toLowerCase();
            if (['arrowdown', 'arrowup', 'enter'].indexOf(drawKey) >= 0) {
              event.preventDefault();
              const needleNow = String(query || '').trim().toLowerCase();
              const listNow = notes
                .filter((item) => (!needleNow ? true : String(item.text || '').toLowerCase().indexOf(needleNow) >= 0))
                .slice(0, 60);
              if (drawKey === 'arrowdown') {
                setActiveIndex((current) => Math.min(current + 1, Math.max(0, listNow.length - 1)));
                return;
              }
              if (drawKey === 'arrowup') {
                setActiveIndex((current) => Math.max(0, current - 1));
                return;
              }
              const picked = listNow[Math.min(activeIndex, listNow.length - 1)];
              if (picked) setView(picked);
              return;
            }
            if (drawKey === 'w') {
              // 自己没有打开的窗口就不抢这个按键（否则会吞掉快速便签的处理）
              if (!open && !view && !deep.length) return;
              const nowW = Date.now();
              if (nowW - lastKeyAt < 350) return;
              lastKeyAt = nowW;
              event.preventDefault();
              event.stopImmediatePropagation();
              if (deep.length) {
                setDeep((current) => current.slice(0, -1));
                return;
              }
              if (view) {
                setView(null);
                restoreFocus(prevFocus.current);
                return;
              }
              setOpen(false);
              restoreFocus(prevFocus.current);
              return;
            }
            if (drawKey !== 'm') return;
            const now = Date.now();
            if (now - lastKeyAt < 350) return;
            lastKeyAt = now;
            event.preventDefault();
            onOpen();
          };
          window.addEventListener('dsh-memo:drawer', onOpen);
          window.addEventListener('keydown', onKey);
          return () => {
            window.removeEventListener('dsh-memo:drawer', onOpen);
            window.removeEventListener('keydown', onKey);
          };
        }, [open, refresh, query, notes, activeIndex, view, deep]);

        // 列表键盘导航（不依赖 Alt；↑↓ 移动、回车打开）
        useEffect(() => {
          if (!open) return undefined;
          const onMove = (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            const key = String(event.key || '').toLowerCase();
            if (key !== 'arrowdown' && key !== 'arrowup' && key !== 'enter') return;
            const node = typeof document !== 'undefined' ? document.activeElement : null;
            const tag = node && node.tagName ? String(node.tagName).toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;   // 搜索框里保留原生编辑
            const needleNow = String(query || '').trim().toLowerCase();
            const listNow = notes
              .filter((item) => (!needleNow ? true : String(item.text || '').toLowerCase().indexOf(needleNow) >= 0))
              .slice(0, 60);
            if (!listNow.length) return;
            event.preventDefault();
            if (key === 'arrowdown') {
              setActiveIndex((current) => Math.min(current + 1, listNow.length - 1));
              return;
            }
            if (key === 'arrowup') {
              setActiveIndex((current) => Math.max(0, current - 1));
              return;
            }
            const picked = listNow[Math.min(activeIndex, listNow.length - 1)];
            if (picked) setView(picked);
          };
          window.addEventListener('keydown', onMove);
          return () => window.removeEventListener('keydown', onMove);
        }, [open, query, notes, activeIndex]);

        useEffect(() => {
          if (!open) return undefined;
          const onKey = (event) => {
            if (event.key !== 'Escape') return;
            // 有悬浮卡先关卡片，再按一次才关抽屉
            setView((current) => {
              if (current) return null;
              setOpen(false);
              restoreFocus(prevFocus.current);
              return current;
            });
          };
          window.addEventListener('keydown', onKey);
          return () => window.removeEventListener('keydown', onKey);
        }, [open]);

        // 抽屉关了也要能留着悬浮卡（只关抽屉本身）
        if (!open && !view) return null;

        // 悬浮查看窗：按住标题栏拖，不挡后面的会话
        const startDrag = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          const origin = { x: event.clientX, y: event.clientY, left: drag ? drag.x : 40, top: drag ? drag.y : 90 };
          const move = (moved) => {
            setDrag({
              x: Math.max(4, Math.min(origin.left + (moved.clientX - origin.x), window.innerWidth - 220)),
              y: Math.max(4, Math.min(origin.top + (moved.clientY - origin.y), window.innerHeight - 60)),
            });
          };
          const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', stop);
          event.preventDefault();
          event.stopPropagation();
        };

        const needle = query.trim().toLowerCase();
        const shown = notes
          .filter((note) => (!needle ? true : String(note.text || '').toLowerCase().indexOf(needle) >= 0))
          .slice(0, 60);

        return h('div', { className: 'dsm-drawerLayer' },
          open
            ? h('div', {
              className: 'dsm-drawerBackdrop',
              onPointerDown: () => {
                setOpen(false);
                restoreFocus(prevFocus.current);
              },
            })
            : null,
          open
            ? h('div', { className: 'dsm-drawer', role: 'dialog', 'aria-label': t('drawer.title') },
          h('div', { className: 'dsm-drawerHead' },
            h(Icon, { name: 'pin', size: 13 }),
            h('strong', null, t('drawer.title')),
            h('span', { className: 'dsm-spacer' }),
            h('button', {
              type: 'button',
              className: 'dsm-iconBtn',
              title: t('view.close'),
              'aria-label': t('view.close'),
              onClick: () => {
                setOpen(false);
                restoreFocus(prevFocus.current);
              },
            }, h(Icon, { name: 'close', size: 13 }))),
          h('input', {
            className: 'dsm-drawerSearch',
            value: query,
            placeholder: t('search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          h('div', { className: 'dsm-drawerList' },
            shown.length === 0
              ? h('div', { className: 'dsm-wikiEmpty' }, t('drawer.empty'))
              : shown.map((note) => h('button', {
                key: note.id,
                type: 'button',
                className: 'dsm-drawerItem',
                'data-active': shown.findIndex((item) => item.id === note.id) === activeIndex ? 'true' : undefined,
                onClick: () => setView(note),
              },
                h('span', { className: 'dsm-quickDot', style: { background: ACCENTS[note.color] || ACCENTS[DEFAULT_COLOR] } }),
                h('span', { className: 'dsm-drawerText' }, noteTitleOf(note) || note.id.slice(0, 8)),
                note.remindAt && note.done !== true
                  ? h('span', { className: 'dsm-drawerBadge' }, '⏰')
                  : null))),
          h('div', { className: 'dsm-drawerFoot' },
            h('button', {
              type: 'button',
              className: 'dsm-btn',
              onClick: () => {
                setOpen(false);
                try {
                  window.dispatchEvent(new CustomEvent('dsh-memo:capture'));
                } catch (error) {
                  /* 忽略 */
                }
              },
            }, t('quick.title')),
            h('span', { className: 'dsm-spacer' }),
            h('button', {
              type: 'button',
              className: 'dsm-btn dsm-btnPrimary',
              onClick: () => {
                setOpen(false);
                if (actions && actions.onOpenWall) actions.onOpenWall();
              },
            }, t('quick.openWall'))))
            : null,
          view
            ? h('div', {
              className: 'dsm-floatCard',
              role: 'dialog',
              'aria-label': t('view.title'),
              style: {
                '--dsm-viewAccent': ACCENTS[view.color] || ACCENTS[DEFAULT_COLOR],
                left: `${drag ? drag.x : 40}px`,
                top: `${drag ? drag.y : 90}px`,
              },
            },
              h('div', { className: 'dsm-viewerHead dsm-dragHandle', onPointerDown: startDrag, title: t('view.drag') },
                h('span', { className: 'dsm-viewerDot' }),
                h('span', { className: 'dsm-viewerTitle' }, noteTitleOf(view) || fullTime(view.createdAt, 'zh')),
                h('button', {
                  type: 'button',
                  className: 'dsm-iconBtn',
                  title: t('view.close'),
                  'aria-label': t('view.close'),
                  onClick: () => setView(null),
                }, h(Icon, { name: 'close', size: 14 }))),
              h('div', { className: 'dsm-viewerBody' },
                h('div', { className: 'dsm-noteText' }, withWikiContext(
                  {
                    notes,
                    onOpen: (targetId) => {
                      const target = notes.find((item) => item.id === targetId);
                      if (target) setDeep((current) => current.concat([Object.assign({}, target, { x: 70 + (current.length + 1) * 26, y: 130 + (current.length + 1) * 26 })]));
                    },
                  },
                  () => renderMdBlocks(parseMarkdownBlocks(view.text), 'drawer'),
                ))))
            : null,
            deep.map((entry, index) => h('div', {
            key: `${entry.id}-${index}`,
            className: 'dsm-floatCard',
            style: {
              '--dsm-viewAccent': ACCENTS[entry.color] || ACCENTS[DEFAULT_COLOR],
              left: `${entry.x || 70 + (index + 1) * 26}px`,
              top: `${entry.y || 130 + (index + 1) * 26}px`,
            },
          },
            h('div', {
              className: 'dsm-viewerHead dsm-dragHandle',
              title: t('view.drag'),
              onPointerDown: (event) => {
                if (event.button !== undefined && event.button !== 0) return;
                const origin = { x: event.clientX, y: event.clientY, left: entry.x || 0, top: entry.y || 0 };
                const move = (moved) => {
                  setDeep((current) => current.map((item, position) => (position === index
                    ? {
                      ...item,
                      x: Math.max(4, Math.min(origin.left + (moved.clientX - origin.x), window.innerWidth - 220)),
                      y: Math.max(4, Math.min(origin.top + (moved.clientY - origin.y), window.innerHeight - 60)),
                    }
                    : item)));
                };
                const stop = () => {
                  window.removeEventListener('pointermove', move);
                  window.removeEventListener('pointerup', stop);
                };
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', stop);
                event.preventDefault();
                event.stopPropagation();
              },
            },
              h('span', { className: 'dsm-viewerDot' }),
              h('span', { className: 'dsm-viewerTitle' }, noteTitleOf(entry) || entry.id.slice(0, 8)),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('view.close'),
                'aria-label': t('view.close'),
                onClick: () => setDeep((current) => current.filter((item) => item.id !== entry.id)),
              }, h(Icon, { name: 'close', size: 14 }))),
            h('div', { className: 'dsm-viewerBody' },
              h('div', { className: 'dsm-noteText' }, renderMdBlocks(parseMarkdownBlocks(entry.text), 'deep'))))));
      };
    }

    /**
     * 快速便签：会话页点按钮（或 Alt+N）就地记一笔，不用切面板。
     * 面板挂在 shell.overlay，所以不会被对话区裁掉。
     */
    /** 关掉浮层后把焦点还给打开前的元素；是文本框就把光标放到最后。 */
    function restoreFocus(element) {
      if (!element || typeof element.focus !== 'function') return;
      try {
        if (!element.isConnected) return;
        element.focus({ preventScroll: true });
        const tag = element.tagName ? String(element.tagName).toUpperCase() : '';
        if (tag === 'TEXTAREA' || tag === 'INPUT') {
          const end = typeof element.value === 'string' ? element.value.length : 0;
          element.setSelectionRange(end, end);
        } else if (element.isContentEditable) {
          const range = document.createRange();
          range.selectNodeContents(element);
          range.collapse(false);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      } catch (error) {
        /* 忽略 */
      }
    }

    /** 只取“正文”文本：优先 markdown 容器，其次 p/li/pre 等文本元素，跳过按钮与统计条。 */
    function extractContentText(scope) {
      if (!scope || typeof scope.querySelectorAll !== 'function') return '';
      const content = scope.querySelector('[class*="markdown" i], [data-markdown], article');
      if (content && String(content.innerText || '').trim().length > 8) return String(content.innerText || '');
      const blocks = scope.querySelectorAll('p, li, pre, blockquote, h1, h2, h3, h4, h5, h6, td');
      const parts = [];
      blocks.forEach((node) => {
        if (parts.some((seen) => seen.contains(node))) return;
        const text = String(node.innerText || '').trim();
        if (text) parts.push(node);
      });
      return parts.map((node) => String(node.innerText || '').trim()).join('\n');
    }

    /** 找一个尽量“像消息正文”的祖先节点。 */
    function contentScopeOf(start, maxDepth) {
      let node = start;
      let best = null;
      for (let depth = 0; depth < (maxDepth || 12) && node; depth += 1) {
        const text = extractContentText(node);
        if (text.trim().length > 16) {
          best = node;
          break;
        }
        node = node.parentElement;
      }
      return best;
    }

    /** 规整 Markdown：围栏独占行、列表/标题前补空行、围栏内原样保留。 */
    function clean(text) {
      const lines = String(text || '').split('\n').map((line) => line.replace(/[ \t]+$/, ''));
      const out = [];
      let inside = false;
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.indexOf('```') >= 0) {
          if (inside) { out.push('```'); inside = false; continue; }
          const prev = out.length ? out[out.length - 1] : '';
          const bare = line.replace(/`/g, '').trim() === '';
          if (bare && /^\S{1,20}$/.test(prev || '')) {
            const isLanguage = /^[\w./+-]{1,20}$/.test(prev || '');
            out.pop();
            if (out.length && out[out.length - 1] !== '') out.push('');
            out.push(isLanguage ? `\`\`\`${prev}` : '```');
          } else {
            if (prev !== '' && !/^```/.test(prev)) out.push('');
            out.push(line.replace(/^[^`]*```/, '```'));
          }
          inside = true;
          continue;
        }
        if (inside) { out.push(line); continue; }
        const isBlockStart = /^(#{1,6} |[-*] |\d+\. |\||> )/.test(line);
        if (isBlockStart && out.length) {
          const prev = out[out.length - 1];
          const continues = /^([-*] |\d+\. |\||> )/.test(prev || '');
          if (prev !== '' && !continues) out.push('');
        }
        out.push(line);
      }
      return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    /** 会话输入框里的 @便签: 候选面板：兼容 contenteditable 的 composer。 */
    function makeNoteMention(t) {
      return function MemoNoteMention() {
        const [state, setState] = useState(null);
        const [notes, setNotes] = useState([]);
        const [rect, setRect] = useState(null);
        const [ready, setReady] = useState(false);
        const [tick, setTick] = useState(0);
        const indexRef = useRef(0);
        const lastQueryRef = useRef('');
        const dismissedRef = useRef('');
        const targetRef = useRef(null);

        const isEditable = (node) => node && (node.tagName === 'TEXTAREA' || node.isContentEditable);

        const findComposer = () => {
          if (typeof document === 'undefined') return null;
          const nodes = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]'));
          const usable = nodes.filter((node) => {
            if (!node || (node.className && String(node.className).includes('dsm-'))) return false;
            const box = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
            return Boolean(box && box.width > 120 && box.height > 16);
          });
          if (!usable.length) return null;
          usable.sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));
          return usable[0];
        };

        /** 读「光标前的文本」，textarea 与 contenteditable 分开处理。 */
        const textBeforeCaret = (node) => {
          try {
            if (node.tagName === 'TEXTAREA') {
              const caret = Number.isFinite(node.selectionStart) ? node.selectionStart : String(node.value || '').length;
              return { text: String(node.value || '').slice(0, caret), caret };
            }
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return null;
            const range = selection.getRangeAt(0).cloneRange();
            if (!node.contains(range.endContainer)) return null;
            range.selectNodeContents(node);
            range.setEnd(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
            const text = range.toString();
            return { text, caret: text.length };
          } catch (error) {
            return null;
          }
        };

        const matchAt = (info) => {
          if (!info) return null;
          const match = /@(便签|note):([^\s@]{0,40})$/.exec(info.text);
          if (!match) return null;
          return { start: info.text.length - match[0].length, query: match[2] };
        };

        /** 用候选替换「@便签:query」。 */
        const applyPick = (note) => {
          const node = targetRef.current;
          if (!node || !note || !state) return;
          const title = noteTitleOf(note) || note.id.slice(0, 8);
          const replacement = `[[便签:${title}]] `;
          try {
            node.focus({ preventScroll: true });
            if (node.tagName === 'TEXTAREA') {
              const value = String(node.value || '');
              const end = state.start + 4 + String(state.query || '').length;
              node.setSelectionRange(state.start, Math.min(end, value.length));
            } else {
              const selection = window.getSelection();
              if (selection && selection.rangeCount) {
                const range = selection.getRangeAt(0).cloneRange();
                range.setStart(range.endContainer, Math.max(0, range.endOffset - (4 + String(state.query || '').length)));
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
            if (typeof document.execCommand === 'function') document.execCommand('insertText', false, replacement);
          } catch (error) {
            /* 忽略 */
          }
          setState(null);
        };

        // 输入框可能晚于本组件挂载，轮询等待
        useEffect(() => {
          let timer = null;
          let tries = 0;
          const attach = () => {
            const node = findComposer();
            if (!node) {
              tries += 1;
              if (tries < 25) timer = setTimeout(attach, 600);
              return;
            }
            targetRef.current = node;
            setReady(true);
            const onInput = () => {
              const info = textBeforeCaret(node);
              const found = matchAt(info);
              // 只有「查询词变了」才把游标归零；否则按方向键会被 keyup 反复重置
              const query = found ? String(found.query || '') : '';
              if (query !== lastQueryRef.current) {
                lastQueryRef.current = query;
                indexRef.current = 0;
                dismissedRef.current = ''; // 文本变了，允许重新弹出
              }
              if (found && dismissedRef.current === `${found.start}:${found.query}`) {
                setState(null);
                return;
              }
              setState(found);
              const box = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
              setRect(box ? { left: box.left, bottom: box.top } : null);
            };
            node.addEventListener('input', onInput);
            node.addEventListener('keyup', onInput);
            timer = { remove: () => {
              node.removeEventListener('input', onInput);
              node.removeEventListener('keyup', onInput);
            } };
          };
          attach();
          return () => {
            if (timer && timer.remove) timer.remove();
            else if (timer) clearTimeout(timer);
          };
        }, [state, notes]);

        // 键盘：window 捕获阶段，避免被 composer 吞掉
        useEffect(() => {
          if (!state) return undefined;
          const onKey = (event) => {
            const needle = String(state.query || '').trim().toLowerCase();
            const list = notes.filter((note) => (!needle ? true : String(note.text || '').toLowerCase().includes(needle)));
            if (!list.length) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              dismissedRef.current = `${state.start}:${state.query}`;
              setState(null);
              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              event.stopPropagation();
              const step = event.key === 'ArrowDown' ? 1 : -1;
              indexRef.current = Math.max(0, Math.min(indexRef.current + step, list.length - 1));
              setTick((current) => current + 1);
              return;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              event.stopPropagation();
              applyPick(list[Math.min(indexRef.current, list.length - 1)]);
            }
          };
          window.addEventListener('keydown', onKey, true);
          return () => window.removeEventListener('keydown', onKey, true);
        }, [state, notes]);

        useEffect(() => {
          if (!ready) return;
          apiCall('list')
            .then((result) => setNotes((result && Array.isArray(result.notes) ? result.notes : []).filter((note) => note.archived !== true)))
            .catch(() => setNotes([]));
        }, [ready]);

        if (!state) return null;
        const needle = String(state.query || '').trim().toLowerCase();
        const list = notes.filter((note) => (!needle ? true : String(note.text || '').toLowerCase().includes(needle))).slice(0, 8);
        return h('div', {
          className: 'dsm-mention',
          style: rect ? { left: `${Math.round(rect.left)}px`, bottom: `${Math.round(window.innerHeight - rect.bottom + 8)}px` } : undefined,
        },
          list.length
            ? list.map((note, index) => h('button', {
              key: note.id,
              type: 'button',
              className: 'dsm-mentionItem',
              'data-active': index === indexRef.current ? 'true' : undefined,
              'data-tick': tick,
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => applyPick(note),
            }, noteTitleOf(note) || note.id.slice(0, 8)))
            : h('div', { className: 'dsm-mentionEmpty' }, t('mention.empty')));
      };
    }

    /** 往会话输入框插入一段文本：优先 execCommand，失败则复制到剪贴板。 */
    function insertIntoComposer(text) {
      const findComposer = () => {
        if (typeof document === 'undefined') return null;
        const nodes = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]'));
        const usable = nodes.filter((node) => {
          if (!node || typeof node.focus !== 'function') return false;
          if (node.className && String(node.className).includes('dsm-')) return false;
          const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
          return Boolean(rect && rect.width > 80 && rect.height > 12);
        });
        return usable.length ? usable[usable.length - 1] : null;
      };
      const node = findComposer();
      if (!node) return false;
      try {
        node.focus({ preventScroll: true });
        if ('value' in node) {
          const end = String(node.value || '').length;
          node.setSelectionRange(end, end);
        } else if (typeof document.execCommand === 'function') {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(node);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        const ok = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
        if (ok !== false) return true;
      } catch (error) {
        /* 继续走剪贴板兜底 */
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
          return 'copied';
        }
      } catch (error) {
        /* 忽略 */
      }
      return false;
    }

    /** 把渲染后的 DOM 还原成 Markdown（保留标题/列表/代码/表格/引用/强调/链接）。 */
    function domToMarkdown(node) {
      if (!node) return '';
      const walk = (current) => {
        if (!current) return '';
        if (current.nodeType === 3) return String(current.nodeValue || '');
        if (current.nodeType !== 1) return '';
        const tag = String(current.tagName || '').toLowerCase();
        const inner = () => Array.from(current.childNodes || []).map(walk).join('');
        if (tag === 'br') return '\n';
        if (tag === 'script' || tag === 'style' || tag === 'button' || tag === 'svg') return '';
        if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${inner().trim()}\n\n`;
        if (tag === 'p') return `${inner().trim()}\n\n`;
        if (tag === 'li') return `- ${inner().trim()}\n`;
        if (tag === 'ul' || tag === 'ol') return `${inner()}\n`;
        if (tag === 'pre') {
          const code = current.querySelector ? current.querySelector('code') : null;
          const body = String((code || current).textContent || '').replace(/\n+$/, '');
          const language = code && code.className ? (String(code.className).match(/language-([\w-]+)/) || [, ''])[1] : '';
          return `\`\`\`${language}\n${body}\n\`\`\`\n\n`;
        }
        if (tag === 'code') return `\`${String(current.textContent || '')}\``;
        if (tag === 'strong' || tag === 'b') return `**${inner().trim()}**`;
        if (tag === 'em' || tag === 'i') return `*${inner().trim()}*`;
        if (tag === 'a') {
          const label = inner().trim();
          const href = current.getAttribute ? current.getAttribute('href') : '';
          return href ? `[${label}](${href})` : label;
        }
        if (tag === 'blockquote') {
          const body = inner().trim().split('\n').map((line) => `> ${line}`).join('\n');
          return `${body}\n\n`;
        }
        if (tag === 'table') {
          const rows = Array.from(current.querySelectorAll ? current.querySelectorAll('tr') : []);
          if (!rows.length) return inner();
          const cellText = (cell) => walk(cell).replace(/\n+/g, ' ').trim() || ' ';
          const lines = rows.map((row, index) => {
            const cells = Array.from(row.children || []);
            const values = cells.map(cellText);
            const header = index === 0 && cells.some((cell) => String(cell.tagName || '').toLowerCase() === 'th');
            const line = `| ${values.join(' | ')} |`;
            return header ? `${line}\n|${values.map(() => ' --- ').join('|')}|` : line;
          });
          return `${lines.join('\n')}\n\n`;
        }
        if (tag === 'thead' || tag === 'tbody') return inner();
        if (tag === 'hr') return '---\n\n';
        return inner();
      };
      return clean(walk(node));
    }

    /** 找按钮之前最近的一次用户提问（[data-turn-trigger] 按文档顺序）。 */
    function triggerTextNear(start) {
      try {
        if (typeof document === 'undefined' || !document.querySelectorAll || !start) return '';
        const list = Array.from(document.querySelectorAll('[data-turn-trigger]'));
        let best = null;
        for (const item of list) {
          if (item === start) continue;
          const relation = item.compareDocumentPosition(start);
          if (relation & 4) best = item; // DOCUMENT_POSITION_FOLLOWING：item 在 start 之前
        }
        return best ? String(best.textContent || '').trim() : '';
      } catch (error) {
        return '';
      }
    }

    /** 找本轮的根节点：最近的、包含 [data-turn-process-answer] 的祖先。 */
    function turnRootOf(start) {
      let node = start;
      for (let depth = 0; depth < 8 && node; depth += 1) {
        if (node.querySelector && node.querySelector('[data-turn-process-answer]')) return node;
        node = node.parentElement;
      }
      return null;
    }

    /** 本轮的最后一段回答正文（DSH 会把回答放在 [data-turn-process-answer] 里）。 */
    function answerTextOf(root) {
      if (!root || !root.querySelectorAll) return '';
      const nodes = root.querySelectorAll('[data-turn-process-answer]');
      if (!nodes || !nodes.length) return '';
      const last = nodes[nodes.length - 1];
      return domToMarkdown(last);
    }

    /** 本轮的提问（[data-turn-trigger]，可能在本轮根节点外的前一个兄弟）。 */
    function triggerTextOf(root) {
      if (!root) return '';
      const inside = root.querySelector ? root.querySelector('[data-turn-trigger]') : null;
      if (inside) {
        const markdown = domToMarkdown(inside);
        if (markdown) return markdown;
      }
      return triggerTextNear(root);
    }

    /** 从某个 DOM 节点向上找一段够长的文本（跳过过短的壳节点）。 */
    function textFromNode(start, maxDepth, skipLabels) {
      let node = start;
      let text = '';
      for (let depth = 0; depth < (maxDepth || 10) && node; depth += 1) {
        const raw = String(node.innerText || '');
        if (raw.trim().length > 12) {
          text = raw;
          break;
        }
        node = node.parentElement;
      }
      return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && (skipLabels || []).indexOf(line) < 0)
        .join('\n')
        .trim();
    }

    /** 会话消息尾部/操作条的「收进便签」按钮：从 DOM 取该条消息的渲染文本。 */
    /** [[ 候选浮层：直接挂 body，固定定位在输入框下方，支持高亮跟随。 */
    function showWikiPop(items, rect, onPick) {
      const el = document.createElement('div');
      el.setAttribute('style', 'position:fixed;z-index:2147483400;left:' + Math.round(rect.left) + 'px;top:'
        + Math.round(rect.bottom + 6) + 'px;width:' + Math.round(Math.min(Math.max(rect.width, 240), 460)) + 'px;'
        + 'max-height:240px;overflow-y:auto;padding:5px;display:flex;flex-direction:column;gap:2px;'
        + 'background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#ddd);'
        + 'border-radius:10px;box-shadow:0 18px 40px -18px rgba(0,0,0,.45)');
      const buttons = items.map((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.setAttribute('style', 'display:flex!important;align-items:center;width:100%;box-sizing:border-box;'
          + 'text-align:left;font-family:inherit;font-size:12.5px!important;line-height:1.5!important;'
          + 'height:auto!important;min-height:26px!important;max-height:none!important;'
          + 'padding:6px 9px!important;margin:0!important;border:none;border-radius:6px;background:transparent;'
          + 'cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
          + 'color:var(--dsw-alias-label-primary,#222)');
        button.onmousedown = (event) => { event.preventDefault(); onPick(item.note); };
        el.appendChild(button);
        return button;
      });
      document.body.appendChild(el);
      const setActive = (index) => {
        buttons.forEach((button, position) => {
          button.style.background = position === index
            ? 'color-mix(in srgb, var(--dsw-alias-brand-primary,#4c6ef5) 16%, transparent)'
            : 'transparent';
        });
        const active = buttons[index];
        if (active && typeof active.scrollIntoView === 'function') {
          try { active.scrollIntoView({ block: 'nearest' }); } catch (error) { /* 忽略 */ }
        }
      };
      setActive(0);
      return {
        remove: () => { try { el.remove(); } catch (error) { /* 忽略 */ } },
        setActive,
      };
    }

    /** 悬浮 tooltip：挂到 body 上，黑底白字，显示在目标下方（不会被容器裁切）。 */
    function showTip(text, target) {
      try {
        if (!target || typeof document === 'undefined') return () => {};
        const box = target.getBoundingClientRect();
        const tip = document.createElement('div');
        tip.textContent = text;
        tip.setAttribute('style', 'position:fixed;z-index:2147483600;left:' + Math.round(box.left + box.width / 2)
          + 'px;top:' + Math.round(box.bottom + 6) + 'px;transform:translateX(-50%);white-space:nowrap;'
          + 'background:#1b1b1f;color:#fff;font-size:13.5px;line-height:1;padding:7px 10px;border-radius:7px;'
          + 'pointer-events:none;box-shadow:0 8px 20px -8px rgba(0,0,0,.5)');
        document.body.appendChild(tip);
        return () => { try { tip.remove(); } catch (error) { /* 忽略 */ } };
      } catch (error) {
        return () => {};
      }
    }

    function makeCaptureButton(t) {
      return function MemoCaptureButton(props) {
        const collect = (event) => {
          try {
            const start = event && event.currentTarget ? event.currentTarget : null;
            const root = turnRootOf(start);
            const fromAnswer = root ? answerTextOf(root) : '';
            const scope = fromAnswer ? null : contentScopeOf(start, 8);
            const cleaned = String(fromAnswer || extractContentText(scope) || '')
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line && line !== t('capture.button') && line !== t('capture.collect'))
              .join('\n')
              .trim();
            if (!cleaned) return;
            try {
              window.dispatchEvent(new CustomEvent('dsh-memo:capture', { detail: { text: cleaned } }));
            } catch (error) {
              /* 忽略 */
            }
          } catch (error) {
            console.error('dsh-memo: 收集消息失败', error);
          }
        };
        let hideTip = () => {};
        return h('button', {
          type: 'button',
          className: 'dsm-captureBtn',
          'aria-label': t('capture.button'),
          'data-message-id': props && props.messageId ? props.messageId : undefined,
          onClick: collect,
          onMouseEnter: (event) => { hideTip = showTip(t('capture.button'), event.currentTarget); },
          onMouseLeave: () => { hideTip(); hideTip = () => {}; },
        }, h(Icon, { name: 'pin', size: 16 }));
      };
    }

    /** 每一轮对话尾部的「收集本轮」按钮。 */
    function makeTurnCaptureButton(t) {
      return function MemoTurnCaptureButton() {
        const collect = (event) => {
          try {
            let node = event && event.currentTarget ? event.currentTarget : null;
            const turn = node && node.closest ? node.closest('[data-turn-tail]') : null;
            const scope = (turn && turn.parentElement) || node;
            const cleaned = String(extractContentText(scope) || '')
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line && line !== t('capture.button') && line !== t('capture.collect'))
              .join('\n')
              .trim();
            if (!cleaned) return;
            try {
              window.dispatchEvent(new CustomEvent('dsh-memo:capture', { detail: { text: cleaned } }));
            } catch (error) {
              /* 忽略 */
            }
          } catch (error) {
            console.error('dsh-memo: 收集本轮失败', error);
          }
        };
        return h('button', {
          type: 'button',
          className: 'dsm-collectBtn',
          title: t('capture.collect'),
          onClick: collect,
        }, t('capture.collect'));
      };
    }

    /** 把一张便签画成 PNG 并下载（纸感底色 + 自动换行，无需额外依赖）。 */
    function exportNoteImage(note, t) {
      try {
        const accent = ACCENTS[note.color] || ACCENTS[DEFAULT_COLOR];
        const lines = String(note.text || '').split('\n');
        const wrapped = [];
        for (const line of lines) {
          let rest = line;
          if (!rest.trim()) { wrapped.push(''); continue; }
          while (rest.length > 0) {
            const chunk = rest.slice(0, 26);
            rest = rest.slice(chunk.length);
            wrapped.push(chunk);
          }
        }
        const width = 760;
        const pad = 44;
        const lineHeight = 34;
        const height = Math.max(320, pad * 2 + wrapped.length * lineHeight + 72);
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        ctx.fillStyle = '#f6f1e7';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 10, height);
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(pad, height - 74, width - pad * 2, 1);
        ctx.fillStyle = '#33302b';
        ctx.font = '26px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textBaseline = 'top';
        wrapped.forEach((line, index) => {
          ctx.fillText(line, pad, pad + index * lineHeight);
        });
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.font = '15px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText(new Date(note.createdAt || Date.now()).toLocaleString(), pad, height - 58);
        ctx.fillText('ez-dsh-memo', width - pad - 96, height - 58);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `memo-${new Date().toISOString().slice(0, 10)}.png`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        }, 'image/png');
      } catch (error) {
        console.error('dsh-memo: 导出图片失败', error);
      }
    }

    /** 快速便签的草稿：正文 + 颜色 + 分类 + 提醒时间，一起存 localStorage。 */
    function readDraft() {
      const empty = { text: '', color: DEFAULT_COLOR, categoryIds: [], remindAt: '' };
      try {
        if (typeof localStorage === 'undefined') return empty;
        const raw = localStorage.getItem('dsh-memo:draft');
        if (!raw) return empty;
        if (raw.charAt(0) === '{') {
          const parsed = JSON.parse(raw);
          return {
            text: typeof parsed.text === 'string' ? parsed.text : '',
            color: COLOR_KEYS.includes(parsed.color) ? parsed.color : DEFAULT_COLOR,
            categoryIds: Array.isArray(parsed.categoryIds) ? parsed.categoryIds.filter((id) => typeof id === 'string') : [],
            remindAt: typeof parsed.remindAt === 'string' ? parsed.remindAt : '',
          };
        }
        return { ...empty, text: raw };
      } catch (error) {
        return empty;
      }
    }

    /** 快捷键/按钮可能同时触发一次，用时间戳去重（只有 350ms 内的第二次被丢弃）。 */
    let captureGuardAt = 0;
    function captureGuardPass() {
      const now = Date.now();
      if (now - captureGuardAt < 350) return false;
      captureGuardAt = now;
      return true;
    }

    /** 皮肤：三套背景（纸感/夜/暖白），存在 localStorage。 */
    const SKINS = ['paper', 'night', 'warm'];
    function readSkin() {
      try {
        const value = typeof localStorage === 'undefined' ? null : localStorage.getItem('dsh-memo:skin');
        return SKINS.includes(value) ? value : '';
      } catch (error) {
        return '';
      }
    }

    /** 设置 → 便签墙：配置 fast-note-sync（token 只显示尾号，留空表示不改）。 */
    function makeSyncSettings(t) {
      return function MemoSyncSettings() {
        const [form, setForm] = useState(null);
        const [token, setToken] = useState('');
        const [busy, setBusy] = useState(false);
        const [note, setNote] = useState('');

        const load = useCallback(async () => {
          try {
            const result = await apiCall('syncConfig', { action: 'get' });
            if (result && result.config) setForm({
              enabled: result.config.enabled,
              api: result.config.api,
              vault: result.config.vault,
              folder: result.config.folder,
              imageFolder: result.config.imageFolder,
              intervalMs: result.config.intervalMs,
              hasToken: result.config.hasToken,
              tokenHint: result.config.tokenHint,
            });
          } catch (error) {
            setNote(String((error && error.message) || error));
          }
        }, []);

        useEffect(() => {
          load();
        }, [load]);

        if (!form) return h('div', { className: 'dsm-set' }, t('loading'));

        const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
        const submit = async (alsoTest) => {
          if (busy) return;
          if (!/^https?:\/\//i.test(String(form.api || ''))) {
            setNote(t('set.errApi'));
            return;
          }
          if (!String(form.vault || '').trim()) {
            setNote(t('set.errVault'));
            return;
          }
          setBusy(true);
          setNote(alsoTest ? t('set.testing') : '');
          try {
            await apiCall('syncConfig', {
              action: 'set',
              config: {
                enabled: form.enabled,
                api: form.api,
                vault: form.vault,
                folder: form.folder,
                imageFolder: form.imageFolder,
                intervalMs: Number(form.intervalMs) * 1000,
                apiToken: token,
              },
            });
            setToken('');
            setNote(t('set.saved'));
            await load();
            if (alsoTest) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              const result = await apiCall('list');
              const state = result && result.sync ? result.sync : null;
              setNote(state && state.lastError
                ? `${t('set.fail')}：${state.lastError}`
                : `${t('set.ok')}`);
            }
          } catch (error) {
            setNote(`${t('set.fail')}：${String((error && error.message) || error)}`);
          } finally {
            setBusy(false);
          }
        };

        return h('div', { className: 'dsm-set' },
          h('h3', { className: 'dsm-setTitle' }, t('set.sync')),
          h('p', { className: 'dsm-setTip' }, t('set.tip')),
          h('label', { className: 'dsm-setRow' },
            h('span', null, t('set.enable')),
            h('input', {
              type: 'checkbox',
              checked: form.enabled,
              onChange: (event) => patch('enabled', event.target.checked),
            })),
          h('label', { className: 'dsm-setRow' },
            h('span', null, t('set.api')),
            h('input', {
              className: 'dsm-setInput',
              value: form.api,
              placeholder: 'https://obsidian-fns.example.com',
              onChange: (event) => patch('api', event.target.value),
            })),
          h('label', { className: 'dsm-setRow' },
            h('span', null, t('set.token')),
            h('input', {
              className: 'dsm-setInput',
              type: 'password',
              value: token,
              placeholder: form.hasToken ? t('set.tokenKeep').replace('{{hint}}', form.tokenHint) : '',
              onChange: (event) => setToken(event.target.value),
            })),
          h('label', { className: 'dsm-setRow' },
            h('span', null, t('set.vault')),
            h('input', {
              className: 'dsm-setInput',
              value: form.vault,
              placeholder: 'Memo Vault',
              onChange: (event) => patch('vault', event.target.value),
            })),
          h('label', { className: 'dsm-setRow' },
            h('span', null, t('set.folder')),
            h('input', {
              className: 'dsm-setInput',
              value: form.folder,
              onChange: (event) => patch('folder', event.target.value),
            })),
          h('label', { className: 'dsm-setRow' },
            h('span', null, t('set.imageFolder')),
            h('input', {
              className: 'dsm-setInput',
              value: form.imageFolder,
              onChange: (event) => patch('imageFolder', event.target.value),
            })),
          h('label', { className: 'dsm-setRow' },
            h('span', null, t('set.interval')),
            h('input', {
              className: 'dsm-setInput',
              type: 'number',
              min: 15,
              value: Math.round((Number(form.intervalMs) || 60000) / 1000),
              onChange: (event) => patch('intervalMs', Number(event.target.value) * 1000),
            })),
          h('div', { className: 'dsm-setActions' },
            h('button', {
              type: 'button',
              className: 'dsm-btn dsm-btnPrimary',
              disabled: busy,
              onClick: () => submit(false),
            }, t('set.save')),
            h('button', {
              type: 'button',
              className: 'dsm-btn',
              disabled: busy,
              onClick: () => submit(true),
            }, t('set.test')),
            note ? h('span', { className: 'dsm-setNote' }, note) : null));
      };
    }

    function makeQuickCapture(t, actions) {
      return function QuickCapture() {
        const [open, setOpen] = useState(false);
        const [draft, setDraft] = useState(() => readDraft().text);
        const [color, setColor] = useState(() => readDraft().color);
        const [recent, setRecent] = useState([]);
        const [allNotes, setAllNotes] = useState([]);
        const [busy, setBusy] = useState(false);
        const [flash, setFlash] = useState('');
        const [remindAt, setRemindAt] = useState(() => readDraft().remindAt);
        const [catOpen, setCatOpen] = useState(false);
        const [confirmClose, setConfirmClose] = useState(false);
        const [catIndex, setCatIndex] = useState(0);
        const catOpenRef = useRef(false);
        const [categories, setCategories] = useState([]);
        const [categoryIds, setCategoryIds] = useState(() => readDraft().categoryIds);
        const [wiki, setWiki] = useState(null);
        const [wikiIndex, setWikiIndex] = useState(0);
        const [view, setView] = useState(null);
        const [deep, setDeep] = useState([]);
        const [drag, setDrag] = useState(null);
        const [bubble, setBubble] = useState(null);
        const areaRef = useRef(null);
        const prevFocus = useRef(null);

        const loadRecent = useCallback(async () => {
          try {
            const result = await apiCall('list');
            const list = (result && Array.isArray(result.notes) ? result.notes : [])
              .filter((note) => note.archived !== true);
            setRecent(list.slice(0, 5));
            setAllNotes(list);
            setCategories(result && Array.isArray(result.categories) ? result.categories : []);
          } catch (error) {
            setRecent([]);
            setCategories([]);
          }
        }, []);

        // 草稿自动落盘：关窗口/刷新/重启都能续写
        useEffect(() => {
          try {
            if (typeof localStorage === 'undefined') return undefined;
            const timer = setTimeout(() => {
              const empty = !draft && categoryIds.length === 0 && !remindAt && color === DEFAULT_COLOR;
              if (empty) localStorage.removeItem('dsh-memo:draft');
              else localStorage.setItem('dsh-memo:draft', JSON.stringify({ text: draft, color, categoryIds, remindAt }));
            }, 300);
            return () => clearTimeout(timer);
          } catch (error) {
            return undefined;
          }
        }, [draft, color, categoryIds, remindAt]);

        const show = useCallback(() => {
          if (!open && typeof document !== 'undefined') prevFocus.current = document.activeElement;
          setOpen(true);
          setFlash('');
          loadRecent();
        }, [loadRecent, open]);

        const wikiPopRef = useRef(null);

        useEffect(() => {
          if (wikiPopRef.current) { wikiPopRef.current.remove(); wikiPopRef.current = null; }
          if (!wiki || !open) return undefined;
          const node = areaRef.current;
          if (!node || !node.getBoundingClientRect) return undefined;
          const rect = node.getBoundingClientRect();
          const path = String(wiki.query || '').trim().toLowerCase();
          const items = allNotes
            .filter((item) => (!path ? true : String(item.text || '').toLowerCase().indexOf(path) >= 0))
            .slice(0, 40)
            .map((item) => ({ note: item, label: noteTitleOf(item) || item.id.slice(0, 8) }));
          if (!items.length) return undefined;
          wikiPopRef.current = showWikiPop(items, rect, (picked) => {
            const title = noteTitleOf(picked) || picked.id.slice(0, 8);
            const next = applyWikiLink(draft, wiki.start, title);
            setDraft(next.text);
            setWiki(null);
            setWikiIndex(0);
          });
          return () => {
            if (wikiPopRef.current) { wikiPopRef.current.remove(); wikiPopRef.current = null; }
          };
        }, [wiki, open, allNotes, draft]);

        useEffect(() => {
          if (wikiPopRef.current) wikiPopRef.current.setActive(wikiIndex);
        }, [wikiIndex, wiki]);

        const hide = useCallback(() => {
          setOpen(false);
          setConfirmClose(false);
          setFlash('');
          restoreFocus(prevFocus.current);
        }, []);

        /** 清空全部编辑状态（正文/颜色/分类/提醒），并删掉草稿。 */
        const resetAll = useCallback(() => {
          setDraft('');
          setColor(DEFAULT_COLOR);
          setCategoryIds([]);
          setRemindAt('');
          setFlash('');
          setConfirmClose(false);
          try {
            if (typeof localStorage !== 'undefined') localStorage.removeItem('dsh-memo:draft');
          } catch (error) {
            /* 忽略 */
          }
        }, []);

        /** 点 × 时：有内容先问，空则直接关。 */
        const requestClose = useCallback(() => {
          const dirty = Boolean(draft.trim()) || categoryIds.length > 0 || Boolean(remindAt) || color !== DEFAULT_COLOR;
          if (dirty) setConfirmClose(true);
          else hide();
        }, [draft, categoryIds, remindAt, color, hide]);

        useEffect(() => {
          catOpenRef.current = catOpen;
        }, [catOpen]);

        // 分类面板：点外面关闭
        useEffect(() => {
          if (!catOpen) return undefined;
          const onDown = (event) => {
            const node = event.target;
            if (node && node.closest && (node.closest('.dsm-quickCatFloat') || node.closest('.dsm-quickCats'))) return;
            setCatOpen(false);
          };
          window.addEventListener('pointerdown', onDown, true);
          return () => window.removeEventListener('pointerdown', onDown, true);
        }, [catOpen]);

        // 分类面板的键盘操作（Alt+C 唤起；上下移动、空格勾选、回车关闭）
        useEffect(() => {
          if (!open) return undefined;
          const onKey = (event) => {
            if (event.altKey && String(event.key || '').toLowerCase() === 'c') {
              event.preventDefault();
              event.stopPropagation();
              setCatOpen((current) => {
                if (!current) setCatIndex(0);
                return !current;
              });
              return;
            }
            if (!catOpen) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setCatOpen(false);
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCatIndex((current) => Math.min(current + 1, Math.max(0, categories.length - 1)));
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCatIndex((current) => Math.max(0, current - 1));
              return;
            }
            if (event.key === ' ' || event.key === 'Spacebar') {
              event.preventDefault();
              const picked = categories[catIndex];
              if (picked) {
                setCategoryIds((current) => (current.indexOf(picked.id) >= 0
                  ? current.filter((id) => id !== picked.id)
                  : current.concat(picked.id)));
              }
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              setCatOpen(false);
            }
          };
          window.addEventListener('keydown', onKey, true);
          return () => window.removeEventListener('keydown', onKey, true);
        }, [open, catOpen, categories, catIndex]);

        // 打开时任何地方按 Esc 都能关（不依赖焦点在输入框里）
        useEffect(() => {
          if (!open) return undefined;
          const onEsc = (event) => {
            if (event.key !== 'Escape') return;
            if (catOpenRef.current) return;   // 分类面板开着时交给它先关
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            setFlash('');
            restoreFocus(prevFocus.current);
          };
          window.addEventListener('keydown', onEsc, true);
          return () => window.removeEventListener('keydown', onEsc, true);
        }, [open]);

        // 选中一段文字 → 旁边浮出「存为便签」
        useEffect(() => {
          const readSelection = () => {
            if (open) return;
            if (typeof window === 'undefined' || !window.getSelection) return;
            const selection = window.getSelection();
            const text = selection ? String(selection.toString() || '').trim() : '';
            if (!text || text.length < 2 || text.length > 4000) {
              setBubble(null);
              return;
            }
            const node = selection.anchorNode;
            const element = node && node.nodeType === 1 ? node : node && node.parentElement;
            const tag = element && element.tagName ? String(element.tagName).toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (element && element.isContentEditable)) {
              setBubble(null);
              return;
            }
            let rect = null;
            try {
              const range = selection.getRangeAt(0);
              rect = range.getBoundingClientRect();
            } catch (error) {
              rect = null;
            }
            if (!rect || (!rect.width && !rect.height)) {
              setBubble(null);
              return;
            }
            setBubble({ text, x: Math.round(rect.right), y: Math.round(rect.bottom) });
          };
          const onUp = () => setTimeout(readSelection, 10);
          const onDown = (event) => {
            if (event.target && event.target.className === 'dsm-quickSel') return;
            setBubble(null);
          };
          window.addEventListener('mouseup', onUp);
          window.addEventListener('mousedown', onDown);
          return () => {
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mousedown', onDown);
          };
        }, [open]);

        // 会话页的按钮 / 快捷键都通过 window 事件唤起
        useEffect(() => {
          const onOpen = (event) => {
            const incoming = event && event.detail && typeof event.detail.text === 'string' ? event.detail.text : '';
            if (incoming) {
              // 从聊天收集：带文本打开，不参与 toggle 去重
              if (typeof document !== 'undefined') prevFocus.current = document.activeElement;
              setDraft(incoming);
              setConfirmClose(false);
              setOpen(true);
              loadRecent();
              return;
            }
            if (!captureGuardPass()) return;
            setOpen((current) => {
              if (current) {
                restoreFocus(prevFocus.current);
                return false;
              }
              show();
              return true;
            });
          };
          const onKey = (event) => {
            if (!event.altKey || event.ctrlKey || event.metaKey) return;
            const key = String(event.key || '').toLowerCase();
            if (key === 'w') {
              event.preventDefault();
              if (deep.length) {
                setDeep((current) => current.slice(0, -1));
                return;
              }
              if (view) {
                setView(null);
                if (!open) restoreFocus(prevFocus.current);
                return;
              }
              setOpen(false);
              restoreFocus(prevFocus.current);
              return;
            }
            if (key === 's') {
              if (!open) return;
              event.preventDefault();
              event.stopPropagation();
              const button = typeof document !== 'undefined' ? document.querySelector('.dsm-quickSave') : null;
              if (button && typeof button.click === 'function') button.click();
              return;
            }
            if (key === 'r') {
              if (!open) return;
              event.preventDefault();
              event.stopPropagation();
              resetAll();
              return;
            }
            if (key !== 'n') return;
            event.preventDefault();
            onOpen();
          };
          window.addEventListener('dsh-memo:capture', onOpen);
          // 自己做一份键盘监听（快捷键服务注册失败时也能用）；用时间戳去重避免和快捷键双触发
          window.addEventListener('keydown', onKey);
          return () => {
            window.removeEventListener('dsh-memo:capture', onOpen);
            window.removeEventListener('keydown', onKey);
          };
        }, [show, actions, open, deep, view]);

        useEffect(() => {
          if (!open) return undefined;
          const timer = setTimeout(() => {
            const node = areaRef.current;
            if (!node) return;
            node.focus();
            try {
              const end = node.value.length;
              node.setSelectionRange(end, end);
            } catch (error) {
              /* 忽略 */
            }
          }, 30);
          return () => clearTimeout(timer);
        }, [open]);

        const save = useCallback(async () => {
          const text = draft.trim();
          if (!text || busy) return;
          setBusy(true);
          try {
            const args = { text, color };
            const stamp = fromLocalInputValue(remindAt);
            if (stamp) args.remindAt = stamp;
            if (categoryIds.length) args.categoryIds = categoryIds.slice();
            await apiCall('add', args);
            setDraft('');
            try { if (typeof localStorage !== 'undefined') localStorage.removeItem('dsh-memo:draft'); } catch (error) { /* 忽略 */ }
            setRemindAt('');
            setCategoryIds([]);
            loadRecent();
            hide();
          } catch (error) {
            setFlash(String((error && error.message) || error));
          } finally {
            setBusy(false);
          }
        }, [draft, color, busy, loadRecent, t, actions, remindAt]);

        if (!open && !bubble && !view) return null;
        const startDrag = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          const origin = { x: event.clientX, y: event.clientY, left: drag ? drag.x : 60, top: drag ? drag.y : 110 };
          const move = (moved) => {
            setDrag({
              x: Math.max(4, Math.min(origin.left + (moved.clientX - origin.x), window.innerWidth - 220)),
              y: Math.max(4, Math.min(origin.top + (moved.clientY - origin.y), window.innerHeight - 60)),
            });
          };
          const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', stop);
          event.preventDefault();
          event.stopPropagation();
        };
        const startDeepDrag = (event, index) => {
          if (event.button !== undefined && event.button !== 0) return;
          const entry = deep[index];
          if (!entry) return;
          const origin = { x: event.clientX, y: event.clientY, left: entry.x || 0, top: entry.y || 0 };
          const move = (moved) => {
            setDeep((current) => current.map((item, position) => (position === index
              ? {
                ...item,
                x: Math.max(4, Math.min(origin.left + (moved.clientX - origin.x), window.innerWidth - 220)),
                y: Math.max(4, Math.min(origin.top + (moved.clientY - origin.y), window.innerHeight - 60)),
              }
              : item)));
          };
          const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', stop);
          event.preventDefault();
          event.stopPropagation();
        };
        return h('div', { className: 'dsm-quickHost' },
          bubble
            ? h('button', {
              type: 'button',
              className: 'dsm-quickSel',
              style: { left: `${bubble.x}px`, top: `${bubble.y}px` },
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => {
                setDraft(bubble.text);
                setBubble(null);
                setOpen(true);
                setFlash('');
              },
            }, h(Icon, { name: 'pin', size: 11 }), '存为便签')
            : null,
          view
            ? h('div', {
              className: 'dsm-floatCard',
              role: 'dialog',
              'aria-label': t('view.title'),
              style: {
                '--dsm-viewAccent': ACCENTS[view.color] || ACCENTS[DEFAULT_COLOR],
                left: `${drag ? drag.x : 60}px`,
                top: `${drag ? drag.y : 110}px`,
              },
            },
              h('div', { className: 'dsm-viewerHead dsm-dragHandle', onPointerDown: startDrag, title: t('view.drag') },
                h('span', { className: 'dsm-viewerDot' }),
                h('span', { className: 'dsm-viewerTitle' }, noteTitleOf(view) || view.id.slice(0, 8)),
                h('button', {
                  type: 'button',
                  className: 'dsm-iconBtn',
                  title: t('view.close'),
                  'aria-label': t('view.close'),
                  onClick: () => setView(null),
                }, h(Icon, { name: 'close', size: 14 }))),
              h('div', { className: 'dsm-viewerBody' },
                h('div', { className: 'dsm-noteText' }, withWikiContext(
                  {
                    notes: recent,
                    onOpen: (targetId) => {
                      const target = recent.find((item) => item.id === targetId);
                      if (target) {
                        setDeep((current) => current.concat([Object.assign({}, target, {
                          x: 70 + (current.length + 1) * 26,
                          y: 130 + (current.length + 1) * 26,
                        })]));
                      }
                    },
                  },
                  () => renderMdBlocks(parseMarkdownBlocks(view.text), 'quick'),
                ))))
            : null,
          open
            ? h('div', {
          className: 'dsm-quickLayer',
          onPointerDown: (event) => {
            if (event.target === event.currentTarget) hide();
          },
        },
          h('div', { className: 'dsm-quickPanel', role: 'dialog', 'aria-label': t('quick.title') },
            h('div', { className: 'dsm-quickHead' },
              h(Icon, { name: 'pin', size: 13 }),
              h('strong', null, t('quick.title')),
              h('span', { className: 'dsm-quickHint' }, t('quick.hint')),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('quick.reset'),
                'aria-label': t('quick.reset'),
                onMouseDown: (event) => event.preventDefault(),
                onClick: resetAll,
              }, h(Icon, { name: 'refresh', size: 13 })),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('view.close'),
                'aria-label': t('view.close'),
                onClick: requestClose,
              }, h(Icon, { name: 'close', size: 13 }))),
            confirmClose
              ? h('div', { className: 'dsm-confirmPop', role: 'dialog', 'aria-label': t('quick.keepDraft') },
                h('div', { className: 'dsm-confirmText' }, t('quick.keepDraft')),
                h('div', { className: 'dsm-confirmActions' },
                  h('button', { type: 'button', className: 'dsm-btn dsm-btnPrimary', onClick: () => hide() }, t('quick.saveDraft')),
                  h('button', { type: 'button', className: 'dsm-btn', onClick: () => { resetAll(); hide(); } }, t('quick.discard')),
                  h('button', { type: 'button', className: 'dsm-btn', onClick: () => setConfirmClose(false) }, t('quick.cancel'))))
              : null,
            h('textarea', {
              ref: areaRef,
              className: 'dsm-quickInput',
              value: draft,
              placeholder: t('quick.placeholder'),
              onChange: (event) => {
                const value = event.target.value;
                setDraft(value);
                setWiki(wikiQueryAt(value, event.target.selectionStart));
                setWikiIndex(0);
              },
              onKeyDown: (event) => {
                if (wiki) {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const step = event.key === 'ArrowDown' ? 1 : -1;
                    const list = allNotes.filter((item) => (!String(wiki.query || '').trim()
                      ? true
                      : String(item.text || '').toLowerCase().indexOf(String(wiki.query).trim().toLowerCase()) >= 0));
                    setWikiIndex((current) => Math.max(0, Math.min(current + step, Math.max(0, list.length - 1))));
                    return;
                  }
                  if (event.key === 'Enter' || event.key === 'Tab') {
                    event.preventDefault();
                    const needle = String(wiki.query || '').trim().toLowerCase();
                    const list = allNotes.filter((item) => (!needle ? true : String(item.text || '').toLowerCase().indexOf(needle) >= 0));
                    const picked = list[Math.min(wikiIndex, list.length - 1)];
                    if (picked) {
                      const title = noteTitleOf(picked) || picked.id.slice(0, 8);
                      const next = applyWikiLink(draft, wiki.start, title);
                      setDraft(next.text);
                      setWiki(null);
                      setWikiIndex(0);
                      requestAnimationFrame(() => {
                        const node = areaRef.current;
                        if (node) {
                          node.focus();
                          try { node.setSelectionRange(next.caret, next.caret); } catch (error) { /* 忽略 */ }
                        }
                      });
                    } else {
                      setWiki(null);
                    }
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setWiki(null);
                    return;
                  }
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  hide();
                  return;
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  save();
                }
              },
            }),

            h('div', { className: 'dsm-quickCats' },
              h('div', { className: 'dsm-paletteWrap' },
                h('button', {
                  type: 'button',
                  className: 'dsm-miniBtn',
                  title: t('quick.pickCategoryHint'),
                  'aria-expanded': catOpen ? 'true' : 'false',
                  onMouseDown: (event) => event.preventDefault(),
                  onClick: () => setCatOpen(!catOpen),
                },
                  h(Icon, { name: 'tag', size: 10 }),
                  ' ',
                  categoryIds.length
                    ? (categories.filter((item) => categoryIds.indexOf(item.id) >= 0).map((item) => item.name).join('、') || t('note.categories'))
                    : t('quick.pickCategory')),
                catOpen
                  ? h('div', {
                    className: 'dsm-quickCatFloat',
                    style: (() => {
                      const node = areaRef.current;
                      const rect = node && node.getBoundingClientRect ? node.getBoundingClientRect() : null;
                      if (!rect) return { left: '12px', top: '120px' };
                      return { left: `${Math.round(rect.left)}px`, top: `${Math.round(rect.top)}px`, width: `${Math.round(rect.width)}px` };
                    })(),
                  },
                    categories.length === 0
                      ? h('div', { className: 'dsm-catPopEmpty' }, t('cat.noneYet'))
                      : categories.map((item, index) => h('button', {
                        key: item.id,
                        type: 'button',
                        className: 'dsm-quickCatItem',
                        'aria-pressed': categoryIds.indexOf(item.id) >= 0 ? 'true' : 'false',
                        'data-active': index === catIndex ? 'true' : undefined,
                        onMouseDown: (event) => event.preventDefault(),
                        onClick: () => {
                          setCategoryIds((current) => (current.indexOf(item.id) >= 0
                            ? current.filter((id) => id !== item.id)
                            : current.concat(item.id)));
                        },
                      },
                      h('span', {
                        className: 'dsm-catTick',
                        'data-on': categoryIds.indexOf(item.id) >= 0 ? 'true' : undefined,
                      }, h(Icon, { name: 'check', size: 9 })),
                      h('span', { className: 'dsm-catName' }, item.name))))
                  : null)),
            categoryIds.length
              ? h('div', { className: 'dsm-quickCatsRow' },
                categoryIds.map((id) => {
                  const item = categories.find((entry) => entry.id === id);
                  if (!item) return null;
                  return h('span', { key: id, className: 'dsm-quickCatChip' },
                    h(Icon, { name: 'tag', size: 9 }),
                    h('span', null, item.name),
                    h('button', {
                      type: 'button',
                      className: 'dsm-chipX',
                      title: t('remind.clear'),
                      onClick: () => setCategoryIds((current) => current.filter((entry) => entry !== id)),
                    }, '×'));
                }))
              : null,
            h('div', { className: 'dsm-quickRemind' },
              h(Icon, { name: 'clock', size: 12 }),
              h('input', {
                type: 'datetime-local',
                className: 'dsm-quickTime',
                value: remindAt,
                onChange: (event) => setRemindAt(event.target.value),
              }),
              remindAt
                ? h('button', {
                  type: 'button',
                  className: 'dsm-chipX',
                  title: t('remind.clear'),
                  onClick: () => setRemindAt(''),
                }, '×')
                : h('span', { className: 'dsm-quickHint' }, t('quick.remindHint'))),
            h('div', { className: 'dsm-quickFoot' },
              COLOR_KEYS.map((key) => h(Swatch, {
                key,
                color: key,
                active: key === color,
                label: t(`color.${key}`),
                onPick: () => setColor(key),
              })),
              h('span', { className: 'dsm-spacer' }),
              flash ? h('span', { className: 'dsm-quickFlash' }, flash) : null,
              h('button', {
                type: 'button',
                className: 'dsm-btn dsm-btnPrimary dsm-quickSave',
                disabled: busy || !draft.trim(),
                onClick: save,
              }, t('quick.save'))),
            recent.length
              ? h('div', { className: 'dsm-quickRecent' },
                h('div', { className: 'dsm-quickRecentTitle' }, t('quick.recent')),
                recent.map((note) => h('button', {
                  key: note.id,
                  type: 'button',
                  className: 'dsm-quickRecentItem',
                  onClick: () => setView(note),
                }, h('span', { className: 'dsm-quickDot', style: { background: ACCENTS[note.color] || ACCENTS[DEFAULT_COLOR] } }),
                  h('span', { className: 'dsm-quickRecentText' }, noteTitleOf(note) || note.id.slice(0, 8)))),
                h('button', {
                  type: 'button',
                  className: 'dsm-miniBtn',
                  onClick: () => {
                    hide();
                    if (actions && actions.onOpenWall) actions.onOpenWall();
                  },
                }, t('quick.openWall')))
              : null)
            )
            : null,
            deep.map((entry, index) => h('div', {
            key: `${entry.id}-${index}`,
            className: 'dsm-floatCard',
            style: {
              '--dsm-viewAccent': ACCENTS[entry.color] || ACCENTS[DEFAULT_COLOR],
              left: `${entry.x || 70 + (index + 1) * 26}px`,
              top: `${entry.y || 130 + (index + 1) * 26}px`,
            },
          },
            h('div', {
              className: 'dsm-viewerHead dsm-dragHandle',
              onPointerDown: (event) => startDeepDrag(event, index),
              title: t('view.drag'),
            },
              h('span', { className: 'dsm-viewerDot' }),
              h('span', { className: 'dsm-viewerTitle' }, noteTitleOf(entry) || entry.id.slice(0, 8)),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('view.close'),
                'aria-label': t('view.close'),
                onClick: () => setDeep((current) => current.filter((item) => item.id !== entry.id)),
              }, h(Icon, { name: 'close', size: 14 }))),
            h('div', { className: 'dsm-viewerBody' },
              h('div', { className: 'dsm-noteText' }, renderMdBlocks(parseMarkdownBlocks(entry.text), 'deep'))))));
      };
    }

    /**
     * 全局提醒浮层：挂在 shell.overlay 上，所以切到别的面板（比如对话）也能看到。
     * 面板自己不再弹提醒，只是收到 window 事件后刷新数据。
     */
    function makeReminderOverlay(t, selectPanel) {
      return function MemoReminderOverlay() {
        const [toasts, setToasts] = useState([]);
        const [editId, setEditId] = useState(null);
        const mounted = useRef(true);

        useEffect(() => {
          mounted.current = true;
          let cursor = null;
          const tick = async () => {
            try {
              const result = await apiCall('firedSince', { since: cursor });
              if (!mounted.current || !result) return;
              if (cursor === null) {
                cursor = typeof result.cursor === 'number' ? result.cursor : 0;
                return;
              }
              if (typeof result.cursor === 'number') cursor = result.cursor;
              const events = Array.isArray(result.events) ? result.events : [];
              if (!events.length) return;
              // 让便签墙刷新数据（如果它开着）
              try {
                window.dispatchEvent(new CustomEvent('dsh-memo:fired'));
              } catch (error) {
                /* 忽略 */
              }
              setToasts((current) => current.concat(events.map((event) => ({
                key: `${event.seq}-${event.noteId}`,
                title: t('remind.toastTitle'),
                text: event.text,
                noteId: event.noteId,
              }))).slice(-3));
              for (const event of events) {
                try {
                  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    const notification = new Notification(t('remind.toastTitle'), { body: event.text, tag: event.noteId });
                    notification.onclick = () => {
                      try { window.focus(); } catch (error) { /* 忽略 */ }
                      notification.close();
                    };
                  }
                } catch (error) {
                  /* 通知失败不影响页面提示 */
                }
              }
            } catch (error) {
              /* 下一轮再来 */
            }
          };
          const timer = setInterval(tick, 15000);
          tick();
          return () => {
            mounted.current = false;
            clearInterval(timer);
          };
        }, []);

        // 提醒提示条故意不自动消失：要能一直看到，直到你处理或主动关掉
        if (!toasts.length) return null;

        const drop = (key) => setToasts((current) => current.filter((item) => item.key !== key));
        const handle = async (toast, patch) => {
          drop(toast.key);
          try {
            await apiCall('update', Object.assign({ id: toast.noteId }, patch));
            try {
              window.dispatchEvent(new CustomEvent('dsh-memo:fired'));
            } catch (error) {
              /* 忽略 */
            }
          } catch (error) {
            /* 失败就让它留在墙上（逾期状态） */
          }
        };

        return h('div', { className: 'dsm-ovl', role: 'status', 'aria-live': 'polite' },
          toasts.map((toast) => h('div', {
            key: toast.key,
            className: 'dsm-toast',
            title: t('remind.keep'),
            onClick: () => {
              drop(toast.key);
              if (selectPanel) selectPanel();
            },
          },
            h(Icon, { name: 'clock', size: 13 }),
            h('div', { className: 'dsm-toastBody' },
              h('strong', null, toast.title),
              h('div', null, toast.text),
              h('div', { className: 'dsm-toastActions' },
                h('button', {
                  type: 'button',
                  className: 'dsm-miniBtn',
                  onClick: (event) => {
                    event.stopPropagation();
                    handle(toast, { done: true });
                  },
                }, t('remind.done')),
                h('button', {
                  type: 'button',
                  className: 'dsm-miniBtn',
                  onClick: (event) => {
                    event.stopPropagation();
                    const next = new Date(Date.now() + 5 * 60000).toISOString();
                    handle(toast, { remindAt: next, done: false });
                  },
                }, t('remind.snooze')),
                h('button', {
                  type: 'button',
                  className: 'dsm-miniBtn',
                  onClick: (event) => {
                    event.stopPropagation();
                    drop(toast.key);
                  },
                }, t('remind.dismiss')))))),
          toasts.length > 1
            ? h('button', {
              type: 'button',
              className: 'dsm-ovlAll',
              onClick: () => setToasts([]),
            }, t('remind.dismissAll'))
            : null);
      };
    }

    function Swatch(props) {
      return h('button', {
        type: 'button',
        className: 'dsm-swatch',
        title: props.label,
        'aria-label': props.label,
        'aria-pressed': props.active ? 'true' : 'false',
        'data-on': props.active ? 'true' : undefined,
        style: { '--dsm-accent': ACCENTS[props.color] || ACCENTS[DEFAULT_COLOR] },
        onClick: props.onPick,
      });
    }

    function makePanel(t, useLang) {

      /** 分类条上的一个胶囊：点击筛选，悬停出现重命名/删除。 */
      function CategoryChip(props) {
        const category = props.category;
        const [renaming, setRenaming] = useState(false);
        const [draft, setDraft] = useState(category.name);
        const [confirming, setConfirming] = useState(false);
        const inputRef = useRef(null);

        useEffect(() => {
          if (!renaming) return undefined;
          setDraft(category.name);
          const timer = setTimeout(() => {
            const node = inputRef.current;
            if (node) {
              node.focus();
              node.select();
            }
          }, 0);
          return () => clearTimeout(timer);
        }, [renaming]);

        if (renaming) {
          const commit = () => {
            const value = draft.trim();
            setRenaming(false);
            if (value && value !== category.name) props.onRename(value);
          };
          return h('input', {
            ref: inputRef,
            className: 'dsm-catInput',
            value: draft,
            'aria-label': t('cat.rename'),
            onChange: (event) => setDraft(event.target.value),
            onBlur: commit,
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setRenaming(false);
              } else if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
            },
          });
        }

        return h('div', { className: 'dsm-catWrap' },
          h('button', {
            type: 'button',
            className: 'dsm-cat',
            'data-on': props.active ? 'true' : undefined,
            title: category.name,
            onClick: props.onPick,
          },
            h('span', { className: 'dsm-catName' }, category.name),
            h('span', { className: 'dsm-catCount' }, String(props.count))),
          confirming
            ? h('span', { className: 'dsm-catConfirm' },
              h('span', null, t('cat.confirm')),
              h('button', {
                type: 'button',
                className: 'dsm-catAction',
                title: t('cat.yes'),
                onClick: () => {
                  setConfirming(false);
                  props.onRemove();
                },
              }, h(Icon, { name: 'check', size: 12 })),
              h('button', {
                type: 'button',
                className: 'dsm-catAction',
                title: t('cat.no'),
                onClick: () => setConfirming(false),
              }, h(Icon, { name: 'close', size: 12 })))
            : h('span', { className: 'dsm-catActions' },
              h('button', {
                type: 'button',
                className: 'dsm-catAction',
                title: t('cat.rename'),
                'aria-label': t('cat.rename'),
                onClick: () => setRenaming(true),
              }, h(Icon, { name: 'edit', size: 12 })),
              h('button', {
                type: 'button',
                className: 'dsm-catAction',
                title: t('cat.delete'),
                'aria-label': t('cat.delete'),
                onClick: () => setConfirming(true),
              }, h(Icon, { name: 'close', size: 12 }))));
      }

      /** 图片灯箱：打开时按窗口适应，滚轮以光标为锚点缩放，拖动平移。 */
      function Lightbox(props) {
        const [scale, setScale] = useState(1);
        const [offset, setOffset] = useState({ x: 0, y: 0 });
        const [natural, setNatural] = useState(null);
        const [panning, setPanning] = useState(false);
        const wrapRef = useRef(null);
        const panRef = useRef(null);

        const fit = (size) => {
          const node = wrapRef.current;
          const width = node ? node.clientWidth : window.innerWidth;
          const height = node ? node.clientHeight : window.innerHeight;
          const ratio = Math.min((width * 0.92) / Math.max(1, size.width), (height * 0.86) / Math.max(1, size.height), 1);
          setScale(ratio);
          setOffset({
            x: (width - size.width * ratio) / 2,
            y: (height - size.height * ratio) / 2,
          });
        };

        useEffect(() => {
          setScale(1);
          setOffset({ x: 0, y: 0 });
          setNatural(null);
        }, [props.src]);

        // 滚轮缩放：必须非 passive 才能拦住页面滚动
        useEffect(() => {
          const node = wrapRef.current;
          if (!node) return undefined;
          const onWheel = (event) => {
            event.preventDefault();
            const rect = node.getBoundingClientRect();
            const cursorX = event.clientX - rect.left;
            const cursorY = event.clientY - rect.top;
            setScale((previous) => {
              const factor = event.deltaY < 0 ? 1.14 : 1 / 1.14;
              const next = Math.min(10, Math.max(0.08, previous * factor));
              setOffset((current) => ({
                x: cursorX - (cursorX - current.x) * (next / previous),
                y: cursorY - (cursorY - current.y) * (next / previous),
              }));
              return next;
            });
          };
          node.addEventListener('wheel', onWheel, { passive: false });
          return () => node.removeEventListener('wheel', onWheel);
        }, []);

        useEffect(() => {
          const onKey = (event) => {
            if (event.key === 'Escape') props.onClose();
          };
          window.addEventListener('keydown', onKey);
          return () => window.removeEventListener('keydown', onKey);
        }, [props.onClose]);

        return h('div', {
          className: 'dsm-lightbox',
          ref: wrapRef,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': props.alt || 'image',
          onPointerDown: (event) => {
            if (event.target !== wrapRef.current) return;
            props.onClose();
          },
        },
          h('img', {
            className: 'dsm-lightboxImg',
            src: props.src,
            alt: props.alt || '',
            draggable: false,
            onLoad: (event) => {
              const image = event.target;
              const size = { width: image.naturalWidth || 1, height: image.naturalHeight || 1 };
              setNatural(size);
              fit(size);
            },
            onPointerDown: (event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              panRef.current = { x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y };
              setPanning(true);
            },
            onPointerMove: (event) => {
              const pan = panRef.current;
              if (!pan) return;
              setOffset({ x: pan.originX + (event.clientX - pan.x), y: pan.originY + (event.clientY - pan.y) });
            },
            onPointerUp: () => {
              panRef.current = null;
              setPanning(false);
            },
            onPointerCancel: () => {
              panRef.current = null;
              setPanning(false);
            },
            style: {
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              cursor: panning ? 'grabbing' : 'grab',
            },
          }),
          h('div', { className: 'dsm-lightboxBar' },
            natural ? h('span', { className: 'dsm-lightboxLabel' }, `${Math.round(scale * 100)}%`) : null,
            natural ? h('span', { className: 'dsm-lightboxHint' }, `${natural.width}×${natural.height}`) : null,
            h('button', {
              type: 'button',
              className: 'dsm-lightboxBtn',
              onClick: () => {
                if (natural) fit(natural);
              },
            }, t('image.fit')),
            h('button', {
              type: 'button',
              className: 'dsm-lightboxBtn',
              onClick: () => setScale(1),
            }, '1:1'),
            h('button', {
              type: 'button',
              className: 'dsm-lightboxBtn',
              onClick: () => props.onClose(),
            }, t('image.close')),
            h('span', { className: 'dsm-lightboxHint' }, t('image.hint'))));
      }


    /** 提醒选择器：便签卡片、编辑态、输入框共用一套。 */
    function ReminderPicker(props) {
      const [date, setDate] = useState(() => {
        const stamp = Date.parse(props.remindAt || '');
        const base = Number.isFinite(stamp) && stamp > Date.now() ? props.remindAt : new Date(Date.now() + 600000).toISOString();
        return toLocalInputValue(base);
      });
      const [repeat, setRepeat] = useState(props.repeat ? props.repeat.kind : 'none');
      const [hint, setHint] = useState('');
      const save = () => {
        const remindAt = fromLocalInputValue(date);
        if (!remindAt) {
          setHint(t('remind.needTime'));
          return;
        }
        const rule = repeat === 'none'
          ? null
          : { kind: repeat, weekday: repeat === 'weekly' ? new Date(Date.parse(remindAt)).getDay() : undefined };
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
          }
        } catch (error) {
          /* 不支持通知就算了 */
        }
        props.onSave(remindAt, rule);
      };
      return h('div', {
        className: `dsm-remindPanel${props.below ? ' dsm-remindPanelBelow' : ''}${props.side === 'left' ? ' dsm-pop-left' : ''}`,
        role: 'group',
        'aria-label': t('remind.title'),
      },
        h('div', { className: 'dsm-remindRow' },
          h('span', { className: 'dsm-remindLabel' }, t('remind.title')),
          h('input', {
            type: 'datetime-local',
            className: 'dsm-remindInput',
            value: date,
            onChange: (event) => setDate(event.target.value),
          })),
        h('div', { className: 'dsm-remindQuick' },
          ['soon1', 'soon10', 'soon60'].map((kind) => h('button', {
            key: kind,
            type: 'button',
            className: 'dsm-miniBtn',
            onClick: () => {
              const minutes = kind === 'soon1' ? 1 : kind === 'soon10' ? 10 : 60;
              setDate(toLocalInputValue(new Date(Date.now() + minutes * 60000).toISOString()));
              setHint('');
            },
          }, t(`remind.${kind}`))),
          h('button', {
            type: 'button',
            className: 'dsm-miniBtn',
            onClick: () => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(9, 0, 0, 0);
              setDate(toLocalInputValue(tomorrow.toISOString()));
              setHint('');
            },
          }, t('remind.morning'))),
        hint ? h('div', { className: 'dsm-remindHint', role: 'alert' }, hint) : null,
        h('div', { className: 'dsm-remindRow' },
          h('span', { className: 'dsm-remindLabel' }, t('remind.repeat')),
          h('select', {
            className: 'dsm-remindInput',
            value: repeat,
            onChange: (event) => setRepeat(event.target.value),
          }, ['none', 'daily', 'weekly', 'monthly'].map((kind) => h('option', { key: kind, value: kind },
            t(`remind.${kind}`))))),
        h('div', { className: 'dsm-remindBtns' },
          props.onClear
            ? h('button', {
              type: 'button',
              className: 'dsm-miniBtn',
              onClick: () => props.onClear(),
            }, t('remind.clear'))
            : null,
          props.onDone
            ? h('button', {
              type: 'button',
              className: 'dsm-miniBtn',
              onClick: () => props.onDone(),
            }, props.done ? t('remind.undone') : t('remind.done'))
            : null,
          h('span', { className: 'dsm-spacer' }),
          h('button', {
            type: 'button',
            className: 'dsm-btn dsm-btnPrimary',
            onClick: save,
          }, t('remind.save'))));
    }

      /** 全文查看：限宽弹窗，Esc 关闭，←/→ 切换上一条/下一条。 */
      function NoteViewer(props) {
        const { note, language, categories } = props;
        const [draft, setDraft] = useState(null);
        const [wiki, setWiki] = useState(null);
        const [wikiIndex, setWikiIndex] = useState(0);
        const inputRef = useRef(null);
        const editing = draft !== null;
        const blocks = useMemo(() => parseMarkdownBlocks(note.text), [note.text]);
        const accent = ACCENTS[note.color] || ACCENTS[DEFAULT_COLOR];

        const wikiItems = useMemo(() => {
          if (!wiki) return [];
          const needle = String(wiki.query || '').trim().toLowerCase();
          return (props.allNotes || [])
            .filter((item) => item.archived !== true && item.id !== note.id)
            .filter((item) => (!needle ? true : String(item.text || '').toLowerCase().indexOf(needle) >= 0))
            .slice(0, 40);
        }, [wiki, props.allNotes, note.id]);

        const popRef = useRef(null);

        useEffect(() => {
          if (popRef.current) { popRef.current.remove(); popRef.current = null; }
          if (!wiki || !editing) return undefined;
          const node = inputRef.current;
          if (!node || !node.getBoundingClientRect) return undefined;
          const rect = node.getBoundingClientRect();
          const items = (props.allNotes || [])
            .filter((item) => (!String(wiki.query || '').trim()
              ? true
              : String(item.text || '').toLowerCase().indexOf(String(wiki.query).trim().toLowerCase()) >= 0))
            .slice(0, 40)
            .map((item) => ({ note: item, label: noteTitleOf(item) || item.id.slice(0, 8) }));
          if (!items.length) return undefined;
          popRef.current = showWikiPop(items, rect, (picked) => pickWiki(picked));
          return () => {
            if (popRef.current) { popRef.current.remove(); popRef.current = null; }
          };
        }, [wiki, editing, props.allNotes]);

        useEffect(() => {
          if (popRef.current) popRef.current.setActive(wikiIndex);
        }, [wikiIndex, wiki]);

        const pickWiki = (target) => {
          if (!wiki) return;
          const title = noteTitleOf(target) || target.id.slice(0, 8);
          const next = applyWikiLink(draft || '', wiki.start, title);
          setDraft(next.text);
          setWiki(null);
          setWikiIndex(0);
          requestAnimationFrame(() => {
            const node = inputRef.current;
            if (node) {
              node.focus();
              try { node.setSelectionRange(next.caret, next.caret); } catch (error) { /* 忽略 */ }
            }
          });
        };

        const startEdit = () => {
          setDraft(note.text);
          setWiki(null);
          requestAnimationFrame(() => {
            const node = inputRef.current;
            if (node) {
              node.focus();
              try { node.setSelectionRange(node.value.length, node.value.length); } catch (error) { /* 忽略 */ }
            }
          });
        };
        const cancelEdit = () => {
          setDraft(null);
          setWiki(null);
        };
        const saveEdit = () => {
          const value = String(draft || '').trim();
          if (!value) return;
          props.onSave(value);
          setDraft(null);
          setWiki(null);
        };

        useEffect(() => {
          const onKey = (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              if (draft !== null) setDraft(null);
              else props.onClose();
              return;
            }
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && draft !== null) {
              event.preventDefault();
              const value = String(draft || '').trim();
              if (value) {
                props.onSave(value);
                setDraft(null);
              }
              return;
            }
            if (event.key === 'ArrowLeft' && props.onPrev) {
              event.preventDefault();
              props.onPrev();
              return;
            }
            if (event.key === 'ArrowRight' && props.onNext) {
              event.preventDefault();
              props.onNext();
            }
          };
          window.addEventListener('keydown', onKey);
          return () => window.removeEventListener('keydown', onKey);
        }, [props, draft]);

        const remind = reminderStateOf(note, Date.now());
        const names = (note.categoryIds || [])
          .map((id) => (categories || []).find((item) => item.id === id))
          .filter(Boolean)
          .map((item) => item.name);

        // 拖动窗口：按住标题栏
        const startDrag = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          const origin = { x: event.clientX, y: event.clientY, left: props.x || 0, top: props.y || 0 };
          const move = (movedEvent) => {
            props.onMove(origin.left + (movedEvent.clientX - origin.x), origin.top + (movedEvent.clientY - origin.y));
          };
          const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', stop);
          event.preventDefault();
          event.stopPropagation();
        };

        return h('div', {
          className: 'dsm-viewerCard dsm-viewerFloat',
          role: 'dialog',
          'aria-label': t('view.title'),
          style: { '--dsm-viewAccent': accent, left: `${Math.round(props.x || 0)}px`, top: `${Math.round(props.y || 0)}px` },
          onPointerDown: (event) => event.stopPropagation(),
        },
            h('div', { className: 'dsm-viewerHead dsm-dragHandle', onPointerDown: startDrag, title: t('view.drag') },
              h('span', { className: 'dsm-viewerDot' }),
              h('span', { className: 'dsm-viewerTitle' },
                [
                  fullTime(note.createdAt, language),
                  names.length ? names.join(' · ') : '',
                  remind ? (remind.kind === 'done' ? t('remind.doneBadge') : formatRemind(note.remindAt, language, note.repeat, Date.now(), t)) : '',
                ].filter(Boolean).join('　·　')),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('note.quote'),
                'aria-label': t('note.quote'),
                onClick: () => {
                  const title = noteTitleOf(note) || note.id.slice(0, 8);
                  insertIntoComposer(`[[便签:${title}]] `);
                },
              }, h(Icon, { name: 'list', size: 14 })),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('image.export'),
                'aria-label': t('image.export'),
                onClick: () => exportNoteImage(note, t),
              }, h(Icon, { name: 'image', size: 14 })),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('view.close'),
                'aria-label': t('view.close'),
                onClick: () => props.onClose(),
              }, h(Icon, { name: 'close', size: 14 }))),
            editing
              ? h('div', { className: 'dsm-viewerBody dsm-viewerEdit' },
                h('textarea', {
                  ref: inputRef,
                  className: 'dsm-viewerInput',
                  value: draft,
                  'aria-label': t('view.edit'),
                  onChange: (event) => {
                    const value = event.target.value;
                    setDraft(value);
                    const found = wikiQueryAt(value, event.target.selectionStart);
                    setWiki(found);
                    if (found) setWikiIndex(0);
                  },
                  onKeyDown: (event) => {
                    if (wiki) {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setWikiIndex((current) => Math.min(current + 1, Math.max(0, wikiItems.length - 1)));
                        return;
                      }
                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setWikiIndex((current) => Math.max(0, current - 1));
                        return;
                      }
                      if (event.key === 'Enter' || event.key === 'Tab') {
                        event.preventDefault();
                        const picked = wikiItems[Math.min(wikiIndex, wikiItems.length - 1)];
                        if (picked) pickWiki(picked);
                        else setWiki(null);
                        return;
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setWiki(null);
                        return;
                      }
                    }
                  },
                }),
                )
              : h('div', { className: 'dsm-viewerBody' },
              h('div', { className: 'dsm-noteText' }, withWikiContext(
                { notes: props.allNotes || [], onOpen: props.onOpenWiki },
                () => renderMdBlocks(
                  blocks,
                  'view',
                  props.onImageClick,
                  props.onToggleTask ? (line, checked) => props.onToggleTask(note.id, line, checked) : undefined,
                  t('note.toggleTask'),
                  props.highlight,
                ),
              ))),
            h('div', { className: 'dsm-viewerFoot' },
              editing
                ? h('button', {
                  type: 'button',
                  className: 'dsm-btn dsm-btnPrimary',
                  onClick: saveEdit,
                }, t('view.save'))
                : h('button', {
                  type: 'button',
                  className: 'dsm-btn dsm-btnPrimary',
                  onClick: startEdit,
                }, t('view.edit')),
              editing
                ? h('button', {
                  type: 'button',
                  className: 'dsm-btn',
                  onClick: cancelEdit,
                }, t('view.cancel'))
                : null,
              h('span', { className: 'dsm-spacer' }),
              h('span', { className: 'dsm-viewerHint' }, editing ? t('view.editHint') : '← →'),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('view.prev'),
                'aria-label': t('view.prev'),
                disabled: !props.onPrev,
                onClick: () => props.onPrev && props.onPrev(),
              }, h(Icon, { name: 'chevronLeft', size: 14 })),
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('view.next'),
                'aria-label': t('view.next'),
                disabled: !props.onNext,
                onClick: () => props.onNext && props.onNext(),
              }, h(Icon, { name: 'chevronRight', size: 14 }))));
      }

      function NoteCard(props) {
        const note = props.note;
        const language = props.language;
        const [editing, setEditing] = useState(false);
        const [draft, setDraft] = useState(note.text);
        const [confirming, setConfirming] = useState(false);
        const [paletteOpen, setPaletteOpen] = useState(false);
        const [popSide, setPopSide] = useState('right');
        const [remindOpen, setRemindOpen] = useState(false);
        const [overflow, setOverflow] = useState(false);
        const [wiki, setWiki] = useState(null);
        const [wikiIndex, setWikiIndex] = useState(0);
        const bodyRef = useRef(null);

        const [categoriesOpen, setCategoriesOpen] = useState(false);
        const [cardUploading, setCardUploading] = useState(false);
        const categoriesRef = useRef(null);
        const remindRef = useRef(null);
        /** 拖拽过程中的临时尺寸；松手后与服务端一致，保留本地覆盖免得回跳。 */
        const [resized, setResized] = useState(null);
        const [resizing, setResizing] = useState(false);
        const inputRef = useRef(null);
        const paletteRef = useRef(null);
        const cardRef = useRef(null);
        const dragRef = useRef(null);
        const resizedRef = useRef(null);

        useEffect(() => {
          if (!editing) return undefined;
          setDraft(note.text);
          const timer = setTimeout(() => {
            const node = inputRef.current;
            if (!node) return;
            node.focus();
            node.setSelectionRange(note.text.length, note.text.length);
          }, 0);
          return () => clearTimeout(timer);
        }, [editing]);

        useEffect(() => {
          if (!paletteOpen) return undefined;
          const onPointerDown = (event) => {
            if (paletteRef.current && paletteRef.current.contains(event.target)) return;
            setPaletteOpen(false);
          };
          document.addEventListener('mousedown', onPointerDown, true);
          return () => document.removeEventListener('mousedown', onPointerDown, true);
        }, [paletteOpen]);

        useEffect(() => {
          if (!categoriesOpen) return undefined;
          const onPointerDown = (event) => {
            if (categoriesRef.current && categoriesRef.current.contains(event.target)) return;
            setCategoriesOpen(false);
          };
          document.addEventListener('mousedown', onPointerDown, true);
          return () => document.removeEventListener('mousedown', onPointerDown, true);
        }, [categoriesOpen]);

        /** 往编辑中的正文里插入一段（图片等），插在光标处。 */
        const insertIntoDraft = (snippet) => {
          const node = inputRef.current;
          const start = node && typeof node.selectionStart === 'number' ? node.selectionStart : null;
          const end = node && typeof node.selectionEnd === 'number' ? node.selectionEnd : null;
          setDraft((previous) => {
            const value = String(previous || '');
            const from = start === null ? value.length : Math.min(start, value.length);
            const to = end === null ? value.length : Math.min(end, value.length);
            return `${value.slice(0, from)}${snippet}${value.slice(Math.max(from, to))}`;
          });
          if (node) {
            setTimeout(() => {
              node.focus();
              const caret = (start === null ? String(node.value || '').length : start) + snippet.length;
              try { node.setSelectionRange(caret, caret); } catch (failure) { /* 忽略 */ }
            }, 0);
          }
        };

        const attachImage = async (file) => {
          if (!file || !props.uploadImage) return;
          setCardUploading(true);
          try {
            const markdown = await props.uploadImage(file);
            if (markdown) insertIntoDraft(`${markdown}\n`);
          } finally {
            setCardUploading(false);
          }
        };

        const save = async () => {
          const text = draft.trim();
          if (!text) return;
          if (text === note.text) {
            setEditing(false);
            return;
          }
          const ok = await props.onUpdate(note.id, { text });
          if (ok) setEditing(false);
        };

        // 从全文弹窗点「编辑」时，让这张便签进入编辑态
        useEffect(() => {
          if (props.editRequest && props.editRequest === note.id) setEditing(true);
        }, [props.editRequest, note.id]);

        const wikiItems = useMemo(() => {
          if (!wiki) return [];
          const needle = String(wiki.query || '').trim().toLowerCase();
          return (props.allNotes || [])
            .filter((item) => item.archived !== true && item.id !== note.id)
            .filter((item) => (!needle ? true : String(item.text || '').toLowerCase().indexOf(needle) >= 0))
            .slice(0, 40);
        }, [wiki, props.allNotes, note.id]);

        const insertWikiLink = useCallback((target) => {
          if (!wiki) return;
          const title = noteTitleOf(target) || target.id.slice(0, 8);
          setDraft((current) => {
            const next = applyWikiLink(current, wiki.start, title);
            requestAnimationFrame(() => {
              const node = inputRef.current;
              if (node) {
                node.focus();
                try { node.setSelectionRange(next.caret, next.caret); } catch (error) { /* 忽略 */ }
              }
            });
            return next.text;
          });
          setWiki(null);
          setWikiIndex(0);
        }, [wiki]);

        // 提醒：状态每帧按传入的 now 重算（面板每 15 秒 tick 一次）
        const nowStamp = Number.isFinite(props.now) ? props.now : Date.now();
        const remind = reminderStateOf(note, nowStamp);
        const openRemindPanel = () => {
          setPaletteOpen(false);
          setCategoriesOpen(false);
          setPopSide(popSideFor(remindRef.current, 250));
          setRemindOpen(!remindOpen);
        };
        const saveRemind = (remindAt, repeat) => {
          // 立刻回执一条（不然面板一关，用户不知道设置成功没有）
          if (props.onRemindSet) {
            props.onRemindSet(note.id, formatRemind(remindAt, language, repeat, Date.now(), t));
          }
          props.onUpdate(note.id, { remindAt, repeat, done: false });
          setRemindOpen(false);
        };

        const footerLeft = [
          note.pinned
            ? h('span', { key: 'pin', className: 'dsm-pinMark', title: t('note.pinned') }, h(Icon, { name: 'pin', size: 12 }))
            : null,
          remind
            ? h('span', {
              key: 'remind',
              className: 'dsm-remind',
              'data-kind': remind.kind,
              title: note.remindAt,
            },
              h(Icon, { name: 'clock', size: 10 }),
              h('span', null, remind.kind === 'done'
                ? t('remind.doneBadge')
                : `${remind.kind === 'due' ? t('remind.due') : formatRemind(note.remindAt, language, note.repeat, nowStamp, t)}`))
            : null,
          h('span', { key: 'time', className: 'dsm-time', title: fullTime(note.createdAt, language) }, timeAgo(note.createdAt, language)),
          note.syncConflict
            ? h('span', { key: 'conflict', className: 'dsm-badge', title: t('note.conflict') }, t('note.conflict'))
            : null,
        ];

        const actions = editing
          ? [
            h('button', {
              key: 'save',
              type: 'button',
              className: 'dsm-iconBtn',
              title: t('note.save'),
              'aria-label': t('note.save'),
              disabled: props.busy,
              onClick: save,
            }, h(Icon, { name: 'check', size: 14 })),
            h('div', { key: 'remind-edit', className: 'dsm-paletteWrap' },
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('remind.set'),
                'aria-label': t('remind.set'),
                'aria-expanded': remindOpen ? 'true' : 'false',
                'data-on': note.remindAt ? 'true' : undefined,
                onClick: () => setRemindOpen(!remindOpen),
              }, h(Icon, { name: 'clock', size: 14 })),
              remindOpen
                ? h(ReminderPicker, {
                  side: popSide,
                  remindAt: note.remindAt,
                  repeat: note.repeat,
                  done: note.done,
                  onSave: saveRemind,
                  onClear: () => {
                    props.onUpdate(note.id, { remindAt: null, repeat: null, done: false });
                    setRemindOpen(false);
                  },
                  onDone: () => props.onUpdate(note.id, { done: !note.done }),
                })
                : null),
            h('button', {
              key: 'image',
              type: 'button',
              className: 'dsm-iconBtn',
              title: cardUploading ? t('image.uploading') : t('image.add'),
              'aria-label': t('image.add'),
              disabled: cardUploading,
              onMouseDown: (event) => event.preventDefault(),
              onClick: async () => {
                const file = await pickImageFile();
                if (file) attachImage(file);
              },
            }, h(Icon, { name: 'image', size: 14 })),
            h('button', {
              key: 'cancel',
              type: 'button',
              className: 'dsm-iconBtn',
              title: t('note.cancel'),
              'aria-label': t('note.cancel'),
              onClick: () => setEditing(false),
            }, h(Icon, { name: 'close', size: 14 })),
          ]
          : [
            h('button', {
              key: 'grip',
              type: 'button',
              className: 'dsm-iconBtn dsm-grip',
              title: t('note.drag'),
              'aria-label': t('note.drag'),
              disabled: props.busy || props.canDrag === false,
              onPointerDown: (event) => props.onDragPointerDown(note.id, event, true),
            }, h(Icon, { name: 'grip', size: 14 })),
            h('div', { key: 'categories', className: 'dsm-paletteWrap', ref: categoriesRef },
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('note.categories'),
                'aria-label': t('note.categories'),
                'aria-expanded': categoriesOpen ? 'true' : 'false',
                disabled: props.busy,
                onClick: () => {
                  setPaletteOpen(false);
                  setPopSide(popSideFor(categoriesRef.current, 240));
                  setCategoriesOpen(!categoriesOpen);
                },
              }, h(Icon, { name: 'tag', size: 14 })),
              categoriesOpen
                ? h('div', { className: `dsm-catPop dsm-pop-${popSide}`, role: 'group', 'aria-label': t('note.categories') },
                  (props.categories || []).length === 0
                    ? h('div', { className: 'dsm-catPopEmpty' }, t('cat.noneYet'))
                    : (props.categories || []).map((category) => {
                      const checked = (note.categoryIds || []).indexOf(category.id) >= 0;
                      return h('button', {
                        key: category.id,
                        type: 'button',
                        className: 'dsm-catPopItem',
                        'aria-pressed': checked ? 'true' : 'false',
                        onClick: () => props.onToggleCategory(note.id, category.id),
                      },
                        h('span', { className: 'dsm-catTick', 'data-on': checked ? 'true' : undefined }, h(Icon, { name: 'check', size: 9 })),
                        h('span', { className: 'dsm-catName' }, category.name))
                    }))
                : null),
            h('button', {
              key: 'archive',
              type: 'button',
              className: 'dsm-iconBtn',
              'data-on': note.archived ? 'true' : undefined,
              title: note.archived ? t('archive.remove') : t('archive.add'),
              'aria-label': note.archived ? t('archive.remove') : t('archive.add'),
              disabled: props.busy,
              onClick: () => props.onArchive(note.id, !note.archived),
            }, h(Icon, { name: 'archive', size: 14 })),
            h('button', {
              key: 'view',
              type: 'button',
              className: 'dsm-iconBtn',
              title: t('view.open'),
              'aria-label': t('view.open'),
              onClick: () => props.onOpenView(note.id),
            }, h(Icon, { name: 'eye', size: 14 })),
            h('div', { key: 'remind', className: 'dsm-paletteWrap', ref: remindRef },
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: remind ? t('remind.set') : t('remind.set'),
                'aria-label': t('remind.set'),
                'aria-expanded': remindOpen ? 'true' : 'false',
                'data-on': remind ? 'true' : undefined,
                disabled: props.busy,
                onClick: () => {
                  if (remindOpen) setRemindOpen(false);
                  else openRemindPanel();
                },
              }, h(Icon, { name: 'clock', size: 14 })),
              remindOpen
                ? h(ReminderPicker, {
                  side: popSide,
                  remindAt: note.remindAt,
                  repeat: note.repeat,
                  done: note.done,
                  onSave: saveRemind,
                  onClear: () => {
                    props.onUpdate(note.id, { remindAt: null, repeat: null, done: false });
                    setRemindOpen(false);
                  },
                  onDone: () => props.onUpdate(note.id, { done: !note.done }),
                })
                : null),
            h('button', {
              key: 'pin',
              type: 'button',
              className: 'dsm-iconBtn',
              title: note.pinned ? t('note.unpin') : t('note.pin'),
              'aria-label': note.pinned ? t('note.unpin') : t('note.pin'),
              'aria-pressed': note.pinned ? 'true' : 'false',
              disabled: props.busy,
              onClick: () => props.onUpdate(note.id, { pinned: !note.pinned }),
            }, h(Icon, { name: 'pin', size: 14 })),
            h('div', { key: 'palette', className: 'dsm-paletteWrap', ref: paletteRef },
              h('button', {
                type: 'button',
                className: 'dsm-iconBtn',
                title: t('note.color'),
                'aria-label': t('note.color'),
                'aria-expanded': paletteOpen ? 'true' : 'false',
                disabled: props.busy,
                onClick: () => {
                  setCategoriesOpen(false);
                  setPopSide(popSideFor(paletteRef.current, 230));
                  setPaletteOpen(!paletteOpen);
                },
              }, h(Icon, { name: 'palette', size: 14 })),
              paletteOpen
                ? h('div', { className: `dsm-palette dsm-pop-${popSide}`, role: 'group', 'aria-label': t('note.color') },
                  COLOR_KEYS.map((key) => h(Swatch, {
                    key,
                    color: key,
                    active: key === note.color,
                    label: t(`color.${key}`),
                    onPick: () => {
                      setPaletteOpen(false);
                      if (key !== note.color) props.onUpdate(note.id, { color: key });
                    },
                  })))
                : null),
            h('button', {
              key: 'edit',
              type: 'button',
              className: 'dsm-iconBtn',
              title: t('note.edit'),
              'aria-label': t('note.edit'),
              disabled: props.busy,
              onClick: () => setEditing(true),
            }, h(Icon, { name: 'edit', size: 14 })),
            confirming
              ? null
              : h('button', {
                key: 'delete',
                type: 'button',
                className: 'dsm-iconBtn dsm-danger',
                title: t('note.delete'),
                'aria-label': t('note.delete'),
                disabled: props.busy,
                onClick: () => setConfirming(true),
              }, h(Icon, { name: 'trash', size: 14 })),
          ];

        const mdBlocks = useMemo(() => parseMarkdownBlocks(note.text), [note.text]);

        // 落盘尺寸被外部改动（例如「自动排序」重置成默认）时，丢掉本地拖拽覆盖值
        useEffect(() => {
          setResized(null);
        }, [note.width, note.height]);
        // 宽高都至少是默认值（老数据里更小的值也按默认渲染）。
        const packed = props.packed || null;
        const width = Math.max(DEFAULT_NOTE_WIDTH, resized ? resized.width : (packed ? packed.w : (note.width || DEFAULT_NOTE_WIDTH)));
        const height = Math.max(DEFAULT_NOTE_HEIGHT, resized ? resized.height : (packed ? packed.h : (note.height || DEFAULT_NOTE_HEIGHT)));

        // 正文被容器裁掉时给个「还有内容」的提示（高度或文本变化时重新测）
        useEffect(() => {
          const node = bodyRef.current;
          if (!node) return undefined;
          const measure = () => setOverflow(node.scrollHeight - node.clientHeight > 4);
          measure();
          const timer = setTimeout(measure, 120);
          return () => clearTimeout(timer);
        }, [note.text, height, width, editing]);

        /** 字号跟着宽度走：窄便签字小、宽便签字大，行数随之变化。 */
        const fontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, width / 20));

        const beginResize = (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          const box = cardRef.current ? cardRef.current.getBoundingClientRect() : null;
          const wall = cardRef.current && cardRef.current.closest ? cardRef.current.closest('.dsm-wall') : null;
          const wallRect = wall ? wall.getBoundingClientRect() : null;
          // 横向只能长到墙的右边缘：再宽就会换行，手感很差。
          const room = wallRect && box ? Math.round(wallRect.right - box.left - 2) : MAX_NOTE_WIDTH;
          dragRef.current = {
            x: event.clientX,
            y: event.clientY,
            width: box ? box.width : width,
            height: box ? box.height : height,
            maxWidth: Math.min(MAX_NOTE_WIDTH, Math.max(DEFAULT_NOTE_WIDTH, room)),
          };
          resizedRef.current = null;
          setResized(null);
          setResizing(true);
          if (props.onResizeStart) props.onResizeStart();
          if (event.pointerId !== undefined && event.currentTarget.setPointerCapture) {
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch (failure) {
              /* 合成事件没有可捕获的指针：退化为普通拖动 */
            }
          }
          if (typeof document !== 'undefined') {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'nwse-resize';
          }
        };

        const moveResize = (event) => {
          const drag = dragRef.current;
          if (!drag) return;
          event.preventDefault();
          const next = {
            width: Math.round(Math.min(drag.maxWidth, Math.max(DEFAULT_NOTE_WIDTH, drag.width + (event.clientX - drag.x)))),
            height: Math.round(Math.min(MAX_NOTE_HEIGHT, Math.max(DEFAULT_NOTE_HEIGHT, drag.height + (event.clientY - drag.y)))),
          };
          resizedRef.current = next;
          setResized(next);
        };

        const endResize = async (event) => {
          if (!dragRef.current) return;
          dragRef.current = null;
          if (event && event.pointerId !== undefined && event.currentTarget && event.currentTarget.releasePointerCapture) {
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch (failure) {
              /* 已经释放过了 */
            }
          }
          setResizing(false);
          if (props.onResizeEnd) props.onResizeEnd();
          if (typeof document !== 'undefined') {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
          }
          const next = resizedRef.current;
          if (!next) return;
          const ok = await props.onUpdate(note.id, { width: next.width, height: next.height });
          // 存盘失败就退回服务端尺寸，别让界面撒个谎。
          if (!ok) setResized(null);
        };

        /** 双击把手 = 恢复默认（宽度默认值 + 高度随内容）。 */
        const resetSize = async (event) => {
          event.preventDefault();
          event.stopPropagation();
          resizedRef.current = null;
          setResized(null);
          await props.onUpdate(note.id, { width: null, height: null });
        };

        /** 键盘也能调尺寸：方向键 ±16px，按住 Shift ±48px。 */
        const nudgeSize = (event) => {
          const step = event.shiftKey ? 48 : 16;
          let deltaWidth = 0;
          let deltaHeight = 0;
          if (event.key === 'ArrowLeft') deltaWidth = -step;
          else if (event.key === 'ArrowRight') deltaWidth = step;
          else if (event.key === 'ArrowUp') deltaHeight = -step;
          else if (event.key === 'ArrowDown') deltaHeight = step;
          else return;
          event.preventDefault();
          const box = cardRef.current ? cardRef.current.getBoundingClientRect() : null;
          const wall = cardRef.current && cardRef.current.closest ? cardRef.current.closest('.dsm-wall') : null;
          const wallRect = wall ? wall.getBoundingClientRect() : null;
          const room = wallRect && box ? Math.round(wallRect.right - box.left - 2) : MAX_NOTE_WIDTH;
          const maxWidth = Math.min(MAX_NOTE_WIDTH, Math.max(DEFAULT_NOTE_WIDTH, room));
          const current = resized || {
            width: Math.max(DEFAULT_NOTE_WIDTH, note.width || DEFAULT_NOTE_WIDTH),
            height: Math.max(DEFAULT_NOTE_HEIGHT, note.height || (box ? Math.round(box.height) : DEFAULT_NOTE_HEIGHT)),
          };
          const next = {
            width: Math.round(Math.min(maxWidth, Math.max(DEFAULT_NOTE_WIDTH, current.width + deltaWidth))),
            height: Math.round(Math.min(MAX_NOTE_HEIGHT, Math.max(DEFAULT_NOTE_HEIGHT, current.height + deltaHeight))),
          };
          resizedRef.current = next;
          setResized(next);
          props.onUpdate(note.id, { width: next.width, height: next.height });
        };

        // 拖到一半被卸载（切面板/删除）时，别把 body 的光标和选中禁用留下。
        useEffect(() => () => {
          if (typeof document !== 'undefined') {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
          }
          // 组件在拖拽中被卸载时，别把面板的「冻结排版」卡住
          if (props.onResizeEnd) props.onResizeEnd();
        }, []);

        // 指针捕获失败（合成事件/浏览器差异）时，兜底在窗口上收尾，避免卡在拖拽态。
        useEffect(() => {
          if (!resizing) return undefined;
          const onRelease = (event) => {
            endResize(event);
          };
          window.addEventListener('pointerup', onRelease);
          window.addEventListener('pointercancel', onRelease);
          return () => {
            window.removeEventListener('pointerup', onRelease);
            window.removeEventListener('pointercancel', onRelease);
          };
        }, [resizing]);

        return h('article', {
          ref: cardRef,
          className: 'dsm-note',
          'data-note-id': props.ghost ? undefined : note.id,
          'data-ghost': props.ghost ? 'true' : undefined,
          'data-pinned': note.pinned ? 'true' : undefined,
          'data-resizing': resizing ? 'true' : undefined,
          'data-dragging': props.dragging ? 'true' : undefined,
          onPointerDown: (event) => props.onDragPointerDown(note.id, event, false),
          onDragStart: (event) => event.preventDefault(),
          style: {
            '--dsm-accent': ACCENTS[note.color] || ACCENTS[DEFAULT_COLOR],
            '--dsm-font': `${Math.round(fontSize * 10) / 10}px`,
            position: 'absolute',
            left: `${Math.round(packed ? packed.x : 0)}px`,
            top: `${Math.round(packed ? packed.y : 0)}px`,
            width: `${Math.round(width)}px`,
            height: `${Math.round(height)}px`,
          },
        },
          editing
            ? h('div', { className: 'dsm-editWrap' },
              h('textarea', {
              ref: inputRef,
              className: 'dsm-noteInput',
              value: draft,
              'aria-label': t('note.edit'),
              onChange: (event) => {
                const value = event.target.value;
                setDraft(value);
                const found = wikiQueryAt(value, event.target.selectionStart);
                setWiki(found);
                if (found) setWikiIndex(0);
              },
              onPaste: (event) => {
                const file = imageFileFromClipboard(event);
                if (!file) return;
                event.preventDefault();
                attachImage(file);
              },
              onKeyDown: (event) => {
                if (wiki) {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setWikiIndex((current) => Math.min(current + 1, Math.max(0, wikiItems.length - 1)));
                    return;
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setWikiIndex((current) => Math.max(0, current - 1));
                    return;
                  }
                  if (event.key === 'Enter' || event.key === 'Tab') {
                    event.preventDefault();
                    const picked = wikiItems[Math.min(wikiIndex, wikiItems.length - 1)];
                    if (picked) insertWikiLink(picked);
                    else setWiki(null);
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setWiki(null);
                    return;
                  }
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setEditing(false);
                  return;
                }
                const composing = (event.nativeEvent && event.nativeEvent.isComposing) || event.keyCode === 229;
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !composing) {
                  event.preventDefault();
                  save();
                }
              },
              }),
              wiki
                ? h(WikiSuggest, {
                  notes: props.allNotes || [],
                  query: wiki.query,
                  index: wikiIndex,
                  onPick: (target) => insertWikiLink(target),
                })
                : null)
            : h('div', { className: 'dsm-noteBody', ref: bodyRef },
              h('div', {
                className: 'dsm-noteText',
                title: t('note.editHint'),
                onDoubleClick: (event) => {
                  if (event.target && event.target.closest && event.target.closest('a')) return;
                  setEditing(true);
                },
              }, withWikiContext(
                { notes: props.allNotes || [], onOpen: props.onOpenWiki },
                () => renderMdBlocks(
                  mdBlocks,
                  'md',
                  props.onImageClick,
                  props.onToggleTask ? (line, checked) => props.onToggleTask(note.id, line, checked) : undefined,
                  t('note.toggleTask'),
                  props.highlight,
                ),
              )),
              overflow
                ? h('div', {
                  className: 'dsm-noteMore',
                  title: t('view.more'),
                  onClick: (event) => {
                    event.stopPropagation();
                    props.onOpenView(note.id);
                  },
                }, '⌄')
                : null),
          (note.categoryIds || []).length
            ? h('div', { className: 'dsm-noteCats' },
              (note.categoryIds || []).slice(0, 4).map((id) => {
                const category = (props.categories || []).find((item) => item.id === id);
                if (!category) return null;
                return h('button', {
                  key: id,
                  type: 'button',
                  className: 'dsm-noteCat',
                  title: category.name,
                  onClick: () => props.onPickCategory(category.id),
                }, h(Icon, { name: 'tag', size: 9 }), h('span', null, category.name));
              }),
              (note.categoryIds || []).length > 4
                ? h('span', { className: 'dsm-noteCat' }, `+${note.categoryIds.length - 4}`)
                : null)
            : null,
          h('div', { className: 'dsm-noteFoot' },
            footerLeft,
            h('div', { className: 'dsm-noteActions' }, actions)),
          confirming
            ? h('div', { className: 'dsm-confirm' },
              h('span', null, t('note.confirmDelete')),
              h('button', {
                type: 'button',
                className: 'dsm-miniBtn',
                disabled: props.busy,
                onClick: async () => {
                  const ok = await props.onRemove(note.id);
                  if (!ok) setConfirming(false);
                },
              }, t('note.yes')),
              h('button', {
                type: 'button',
                className: 'dsm-miniBtn',
                onClick: () => setConfirming(false),
              }, t('note.no')))
            : null,
          h('div', {
            className: 'dsm-resize',
            title: t('note.resize'),
            role: 'separator',
            tabIndex: 0,
            'aria-label': t('note.resize'),
            onPointerDown: beginResize,
            onPointerMove: moveResize,
            onPointerUp: endResize,
            onPointerCancel: endResize,
            onDoubleClick: resetSize,
            onKeyDown: nudgeSize,
          }, h('svg', {
            width: 10,
            height: 10,
            viewBox: '0 0 10 10',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.2,
            strokeLinecap: 'round',
            'aria-hidden': true,
          },
            h('path', { key: 'a', d: 'M9 3 3 9' }),
            h('path', { key: 'b', d: 'M9 6.4 6.4 9' }))),
        );
      }

      function MemoPanel() {
        const language = useLang();
        const [notes, setNotes] = useState(() => cache.notes.slice());
        const [status, setStatus] = useState(() => (cache.status === 'idle' ? 'loading' : cache.status));
        const [error, setError] = useState(() => cache.error);
        const [draft, setDraft] = useState('');
        const [draftColor, setDraftColor] = useState(DEFAULT_COLOR);
        const [draftRemind, setDraftRemind] = useState(null);
        const [draftRemindOpen, setDraftRemindOpen] = useState(false);
        const [wiki, setWiki] = useState(null);
        const [wikiIndex, setWikiIndex] = useState(0);
        const [catDragFrom, setCatDragFrom] = useState(null);
        const [catDragTo, setCatDragTo] = useState(null);
        const catDragFromRef = useRef(null);
        const [query, setQuery] = useState('');
        const [busy, setBusy] = useState(false);
        const [focused, setFocused] = useState(false);
        const [sync, setSync] = useState(() => cache.sync);
        const [categories, setCategories] = useState(() => (cache.categories || []).slice());
        const [activeCategory, setActiveCategory] = useState(() => cache.activeCategory || 'all');
        const [creatingCategory, setCreatingCategory] = useState(false);
        const [draftCategory, setDraftCategory] = useState('');
        const [uploading, setUploading] = useState(false);
        const [lightbox, setLightbox] = useState(null);
        const [nowTick, setNowTick] = useState(() => Date.now());
        const [toasts, setToasts] = useState([]);
        const [viewers, setViewers] = useState([]);
        const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });
        const rootRef = useRef(null);
        const [editId, setEditId] = useState(null);
        const [onlyRemind, setOnlyRemind] = useState(false);
        const [skin, setSkin] = useState(() => readSkin());
        const [onlyImage, setOnlyImage] = useState(false);
        const [recentOnly, setRecentOnly] = useState(false);
        const [trash, setTrash] = useState([]);
        const [trashOpen, setTrashOpen] = useState(false);
        const [wallWidth, setWallWidth] = useState(0);
        const [resizeActive, setResizeActive] = useState(false);
        const composerRef = useRef(null);
        const alive = useRef(true);
        const refreshTimer = useRef(null);
        const wallRef = useRef(null);
        const innerRef = useRef(null);
        const dragNoteId = useRef(null);
        const dragOrderRef = useRef(null);
        const pendingDragRef = useRef(null);
        const captureRef = useRef(null);
        const flipRef = useRef(new Map());
        const [pendingDrag, setPendingDrag] = useState(false);
        const [draggingId, setDraggingId] = useState(null);
        const [dragOrder, setDragOrder] = useState(null);
        const [ghost, setGhost] = useState(null);
        const ghostFrameRef = useRef(0);
        const pendingGhostRef = useRef(null);
        const displayRef = useRef([]);

        const commit = useCallback((nextNotes, nextStatus, nextError, nextSync, nextCategories, nextTrash) => {
          if (Array.isArray(nextNotes)) {
            cache.notes = nextNotes;
            setNotes(nextNotes.slice());
          }
          if (nextSync !== undefined) {
            cache.sync = nextSync;
            setSync(nextSync);
          }
          if (Array.isArray(nextCategories)) {
            cache.categories = nextCategories;
            setCategories(nextCategories.slice());
          }
          if (Array.isArray(nextTrash)) setTrash(nextTrash.slice());
          if (nextStatus) {
            cache.status = nextStatus;
            setStatus(nextStatus);
          }
          if (nextError !== undefined) {
            cache.error = nextError;
            setError(nextError);
          }
        }, []);

        const load = useCallback(async (quiet) => {
          if (!quiet) setStatus('loading');
          try {
            const result = await apiCall('list');
            if (!alive.current) return;
            commit(Array.isArray(result.notes) ? result.notes : [], 'ready', '', result.sync ?? null, Array.isArray(result.categories) ? result.categories : undefined, result.trash);
          } catch (failure) {
            if (!alive.current) return;
            commit(undefined, cache.notes.length ? 'ready' : 'error', String((failure && failure.message) || failure));
          }
        }, [commit]);

        useEffect(() => {
          alive.current = true;
          load(cache.status === 'ready');
          return () => {
            alive.current = false;
          };
        }, [load]);

        useEffect(() => {
          const onFocus = () => {
            load(true);
          };
          window.addEventListener('focus', onFocus);
          return () => window.removeEventListener('focus', onFocus);
        }, [load]);

        /** 设好提醒后立刻给一条回执，避免「面板一关就当没发生」。 */
        const pushRemindReceipt = useCallback((noteId, label) => {
          setToasts((current) => current.concat([{
            key: `set-${Date.now()}`,
            title: t('remind.saved'),
            noteId,
            text: label,
          }]).slice(-3));
        }, [t]);

        /** 真正发请求（不记撤销）。 */
        const runRaw = useCallback(async (method, args) => {
          setBusy(true);
          try {
            const result = await apiCall(method, args);
            commit(Array.isArray(result.notes) ? result.notes : undefined, 'ready', '', result.sync ?? null, Array.isArray(result.categories) ? result.categories : undefined, result.trash);
            // 宿主会在本地改动后自动同步一次，稍后再拉一次状态/列表。
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            refreshTimer.current = setTimeout(() => { load(true); }, 2600);
            return result;
          } catch (failure) {
            const raw = String((failure && failure.message) || failure);
            // 旧宿主不认识分类操作：给一句能行动的话，而不是「未知操作」
            commit(undefined, undefined, raw.indexOf('未知操作') >= 0 ? t('cat.needRestart') : raw);
            return null;
          } finally {
            setBusy(false);
          }
        }, [commit, load, t]);

        const undoStack = useRef([]);
        const pushUndo = useCallback((label, run) => {
          undoStack.current.push({ label, run });
          if (undoStack.current.length > 20) undoStack.current.shift();
        }, []);

        /** 带撤销的改动：先记下反向操作，再执行。 */
        const mutate = useCallback(async (method, args) => {
          const snapshotBefore = cache.notes.slice();
          if (method === 'update' && args && args.id) {
            const before = cache.notes.find((item) => item.id === args.id);
            if (before) {
              const previous = {};
              for (const key of Object.keys(args)) {
                if (key === 'id') continue;
                if (key in before) previous[key] = before[key];
              }
              if (Object.keys(previous).length) {
                pushUndo(t('undo.edit'), () => runRaw('update', Object.assign({ id: args.id }, previous)));
              }
            }
          } else if (method === 'remove' && args && args.id) {
            pushUndo(t('undo.remove'), () => runRaw('restore', { id: args.id }));
          } else if (method === 'archive' && args && args.id) {
            const archived = args.archived !== false;
            pushUndo(archived ? t('archive.add') : t('archive.remove'), () => runRaw('archive', { id: args.id, archived: !archived }));
          } else if (method === 'categoryReorder') {
            const previous = categories.map((item) => item.id);
            pushUndo(t('cat.reorder'), () => runRaw('categoryReorder', { ids: previous }));
          } else if (method === 'reorder' && Array.isArray(args?.items)) {
            const previous = snapshotBefore.map((note) => ({ id: note.id, order: note.order, pinned: note.pinned === true }));
            pushUndo(t('note.drag'), () => runRaw('reorder', { items: previous }));
          }
          const result = await runRaw(method, args);
          if (!result) {
            // 失败了就把刚记的撤销弹掉，避免撤销一个没发生的操作
            if (undoStack.current.length) undoStack.current.pop();
            return false;
          }
          if (method === 'add' && result.note && result.note.id) {
            const createdId = result.note.id;
            pushUndo(t('composer.add'), () => runRaw('remove', { id: createdId }));
          }
          return true;
        }, [runRaw, pushUndo, t, categories]);

        /** Ctrl/Cmd+Z：撤销最近一次改动。 */
        const undoLast = useCallback(async () => {
          const entry = undoStack.current.pop();
          if (!entry) {
            pushRemindReceipt('', t('undo.none'));
            return false;
          }
          const result = await entry.run();
          pushRemindReceipt('', `${t('undo.done')}${entry.label}`);
          return Boolean(result);
        }, [runRaw, pushRemindReceipt, t]);

        // Ctrl/Cmd+Z 撤销（输入框里保留浏览器自带的文本撤销）
        useEffect(() => {
          const onKey = (event) => {
            if (!(event.metaKey || event.ctrlKey) || event.shiftKey) return;
            if (String(event.key || '').toLowerCase() !== 'z') return;
            const node = typeof document !== 'undefined' ? document.activeElement : null;
            const tag = node && node.tagName ? String(node.tagName).toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (node && node.isContentEditable)) return;
            event.preventDefault();
            undoLast();
          };
          window.addEventListener('keydown', onKey);
          return () => window.removeEventListener('keydown', onKey);
        }, [undoLast]);

        // ---- 拖动排序 ----
        // 两个入口：① 按住便签本体（越过 6px 阈值才算拖，普通点选/双击编辑不受影响）
        //           ② 右下角三点手柄（一眼看不到本体也能拖）
        const beginDrag = useCallback((id, event) => {
          if (event.button !== undefined && event.button !== 0) return;
          if (dragNoteId.current || pendingDragRef.current) return;
          const wall = wallRef.current;
          const card = wall && wall.querySelector(`[data-note-id="${id}"]`);
          const rect = card && card.getBoundingClientRect ? card.getBoundingClientRect() : null;
          const wallRect = wall ? wall.getBoundingClientRect() : null;
          pendingDragRef.current = {
            id,
            x: event.clientX,
            y: event.clientY,
            // 抓取点相对卡片左上角的偏移：让幽灵卡不会跳到指针正中间
            offsetX: rect ? event.clientX - rect.left : 0,
            offsetY: rect ? event.clientY - rect.top : 0,
            wallLeft: wallRect ? wallRect.left : 0,
            wallTop: wallRect ? wallRect.top : 0,
            width: rect ? rect.width : DEFAULT_NOTE_WIDTH,
            height: rect ? rect.height : DEFAULT_NOTE_HEIGHT,
          };
          setPendingDrag(true);
        }, []);

        /** 幽灵卡位置用 rAF 节流：指针事件再密，一帧也只更新一次。 */
        const queueGhost = useCallback((value) => {
          pendingGhostRef.current = value;
          if (ghostFrameRef.current) return;
          ghostFrameRef.current = requestAnimationFrame(() => {
            ghostFrameRef.current = 0;
            const next = pendingGhostRef.current;
            if (next && dragNoteId.current) setGhost(next);
          });
        }, []);

        useEffect(() => () => {
          if (ghostFrameRef.current) cancelAnimationFrame(ghostFrameRef.current);
          ghostFrameRef.current = 0;
        }, []);

        /** 记录当前每张卡的位置（FLIP 的「之前」）。 */
        const capturePositions = useCallback(() => {
          const wall = wallRef.current;
          if (!wall) return;
          const positions = new Map();
          const cards = wall.querySelectorAll('[data-note-id], [data-placeholder]');
          for (const card of cards) {
            const key = card.hasAttribute('data-placeholder') ? '__placeholder__' : card.getAttribute('data-note-id');
            positions.set(key, card.getBoundingClientRect());
          }
          flipRef.current = positions;
        }, []);


        const startDragNow = useCallback((id) => {
          captureRef.current = pendingDragRef.current ? { ...pendingDragRef.current } : null;
          capturePositions();
          const order = displayRef.current.map((item) => item.id);
          dragNoteId.current = id;
          dragOrderRef.current = order;
          pendingDragRef.current = null;
          setPendingDrag(false);
          setDragOrder(order);
          setDraggingId(id);
          setGhost(null);
          if (typeof document !== 'undefined') {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
            const selection = window.getSelection ? window.getSelection() : null;
            // 已经开始拖了：把刚才拖出来的文本选区清掉，免得拖完还留一片高亮。
            if (selection && selection.removeAllRanges) selection.removeAllRanges();
          }
        }, []);

        const moveDrag = useCallback((event) => {
          const wall = wallRef.current;
          const dragged = dragNoteId.current;
          const order = dragOrderRef.current;
          if (!wall || !order || !dragged) return;
          const cards = Array.from(wall.querySelectorAll('[data-note-id]'));
          if (!cards.length) return;
          let best = null;
          for (const card of cards) {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
            if (!best || distance < best.distance) best = { id: card.getAttribute('data-note-id'), distance, centerX };
          }
          if (!best || best.id === dragged) return;
          const from = order.indexOf(dragged);
          const target = order.indexOf(best.id);
          if (from < 0 || target < 0) return;
          const next = order.slice();
          next.splice(from, 1);
          let insertAt = target - (from < target ? 1 : 0);
          if (event.clientX > best.centerX) insertAt += 1;
          insertAt = Math.max(0, Math.min(next.length, insertAt));
          next.splice(insertAt, 0, dragged);
          if (next.join('|') === order.join('|')) return;
          capturePositions();
          dragOrderRef.current = next;
          setDragOrder(next);
        }, [capturePositions]);

        const endDrag = useCallback(async () => {
          const id = dragNoteId.current;
          const order = dragOrderRef.current;
          dragNoteId.current = null;
          dragOrderRef.current = null;
          pendingDragRef.current = null;
          captureRef.current = null;
          setPendingDrag(false);
          setDraggingId(null);
          setGhost(null);
          if (typeof document !== 'undefined') {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
          }
          if (!id || !order || order.length < 2) {
            setDragOrder(null);
            return;
          }
          // 置顶段在前：落在「已置顶的其它便签数量」之内算置顶，否则取消置顶。
          const pinnedOthers = cache.notes.filter((note) => note.pinned && note.id !== id).length;
          const position = order.indexOf(id);
          const items = order.map((entryId) => ({
            id: entryId,
            pinned: entryId === id ? position >= 0 && position < Math.max(1, pinnedOthers + 1) : undefined,
          }));
          await mutate('reorder', { items });
          setDragOrder(null);
        }, [mutate]);

        /** 便签上的 pointerdown：点在按钮/链接/输入框/缩放手柄上时不启动拖拽。 */
        const onDragPointerDown = useCallback((id, event, force) => {
          if (event.button !== undefined && event.button !== 0) return;
          const target = event.target;
          if (!force && target && target.closest && target.closest('button, a, input, textarea, select, .dsm-resize, .dsm-palette, .dsm-sync')) return;
          if (force && event.preventDefault) event.preventDefault();
          beginDrag(id, event);
        }, [beginDrag]);

        useEffect(() => {
          if (!pendingDrag && !draggingId) return undefined;
          const onMove = (event) => {
            if (dragNoteId.current) {
              const wall = wallRef.current;
              const wallRect = wall ? wall.getBoundingClientRect() : { left: 0, top: 0 };
              const grab = captureRef.current;
              if (grab) {
                queueGhost({
                  x: event.clientX - wallRect.left - grab.offsetX,
                  y: event.clientY - wallRect.top - grab.offsetY,
                  width: grab.width,
                  height: grab.height,
                });
              }
              // 拖到上下边缘时自动滚动，长墙也拖得动
              const scroll = wall ? wall.closest('.dsm-scroll') : null;
              if (scroll) {
                const box = scroll.getBoundingClientRect();
                if (event.clientY < box.top + 48) scroll.scrollTop -= 12;
                else if (event.clientY > box.bottom - 48) scroll.scrollTop += 12;
              }
              moveDrag(event);
              return;
            }
            const pending = pendingDragRef.current;
            if (!pending) return;
            if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 6) return;
            // 这 6px 里如果已经拉出了文本选区，说明用户是在选字，别抢他的拖拽。
            const selection = window.getSelection ? window.getSelection() : null;
            if (selection && String(selection.toString() || '').trim()) {
              pendingDragRef.current = null;
              setPendingDrag(false);
              return;
            }
            startDragNow(pending.id);
            const wall = wallRef.current;
            const wallRect = wall ? wall.getBoundingClientRect() : { left: 0, top: 0 };
            queueGhost({
              x: event.clientX - wallRect.left - pending.offsetX,
              y: event.clientY - wallRect.top - pending.offsetY,
              width: pending.width,
              height: pending.height,
            });
            moveDrag(event);
          };
          const onRelease = () => {
            pendingDragRef.current = null;
            setPendingDrag(false);
            if (dragNoteId.current) endDrag();
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onRelease);
          window.addEventListener('pointercancel', onRelease);
          return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onRelease);
            window.removeEventListener('pointercancel', onRelease);
          };
        }, [pendingDrag, draggingId, moveDrag, startDragNow, endDrag, queueGhost]);

        const chooseCategory = useCallback((id) => {
          cache.activeCategory = id;
          setActiveCategory(id);
        }, []);

        const createCategory = useCallback(async (name) => {
          const value = String(name || '').trim();
          if (!value) return false;
          const ok = await mutate('categoryAdd', { name: value });
          if (ok) setDraftCategory('');
          return ok;
        }, [mutate]);

        const renameCategory = useCallback((id, name) => {
          const value = String(name || '').trim();
          if (value) mutate('categoryUpdate', { id, name: value });
        }, [mutate]);

        const removeCategory = useCallback(async (id) => {
          const ok = await mutate('categoryRemove', { id });
          if (ok && activeCategory === id) chooseCategory('all');
          return ok;
        }, [mutate, activeCategory, chooseCategory]);

        /** 便签挂上/摘掉某个分类（多对多）。 */
        const toggleNoteCategory = useCallback((noteId, categoryId) => {
          const note = cache.notes.find((item) => item.id === noteId);
          const current = (note && note.categoryIds) || [];
          const next = current.indexOf(categoryId) >= 0
            ? current.filter((id) => id !== categoryId)
            : current.concat(categoryId);
          return mutate('update', { id: noteId, categoryIds: next });
        }, [mutate]);


        /** 拖拽结束：把被拖的分类插到目标位置，一次性提交新顺序。 */
        const commitCatDrag = useCallback((targetIndex) => {
          const from = catDragFromRef.current;
          catDragFromRef.current = null;
          setCatDragFrom(null);
          setCatDragTo(null);
          if (from === null || from === targetIndex) return;
          const ids = categories.map((item) => item.id);
          if (from < 0 || from >= ids.length) return;
          const moved = ids.splice(from, 1)[0];
          ids.splice(Math.max(0, Math.min(ids.length, targetIndex)), 0, moved);
          mutate('categoryReorder', { ids });
        }, [categories, mutate]);

        const archiveNote = useCallback((id, archived) => mutate('archive', { id, archived }), [mutate]);
        const restoreNote = useCallback((id) => mutate('restore', { id }), [mutate]);
        const purgeNote = useCallback((id) => mutate('purgeTrash', { id }), [mutate]);
        const emptyTrash = useCallback(() => mutate('emptyTrash'), [mutate]);

        /** 点便签里的复选框：改正文里的 `[ ]` / `[x]`。 */
        const toggleTask = useCallback((id, line, checked) => {
          const note = cache.notes.find((item) => item.id === id);
          const next = note ? toggleTaskLine(note.text, line, checked) : null;
          if (!next) return Promise.resolve(false);
          return mutate('update', { id, text: next });
        }, [mutate]);

        const openLightbox = useCallback((src, alt) => setLightbox({ src, alt }), []);

        // 面板尺寸：拖动浮窗时用来限制边界
        useEffect(() => {
          const node = rootRef.current;
          if (!node || typeof ResizeObserver !== 'function') return undefined;
          const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
              const width = Math.round(entry.contentRect.width);
              const height = Math.round(entry.contentRect.height);
              setPanelSize((previous) => (Math.abs(previous.width - width) > 1 || Math.abs(previous.height - height) > 1
                ? { width, height }
                : previous));
            }
          });
          observer.observe(node);
          return () => observer.disconnect();
        }, []);

        /** 观测内容宽度：便签是绝对定位的，必须知道可用宽度才能排版。 */
        useEffect(() => {
          const node = innerRef.current;
          if (!node || typeof ResizeObserver !== 'function') return undefined;
          const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
              const width = Math.round(entry.contentRect.width);
              setWallWidth((previous) => (Math.abs(previous - width) > 1 ? width : previous));
            }
          });
          observer.observe(node);
          return () => observer.disconnect();
        }, []);

        /** 在光标处插入一段文本（用函数式更新，避免上传期间用户的输入被覆盖）。 */
        const insertAtCursor = useCallback((ref, snippet, setter) => {
          const node = ref.current;
          const start = node && typeof node.selectionStart === 'number' ? node.selectionStart : null;
          const end = node && typeof node.selectionEnd === 'number' ? node.selectionEnd : null;
          setter((previous) => {
            const value = String(previous || '');
            const from = start === null ? value.length : Math.min(start, value.length);
            const to = end === null ? value.length : Math.min(end, value.length);
            return `${value.slice(0, from)}${snippet}${value.slice(Math.max(from, to))}`;
          });
          if (node) {
            setTimeout(() => {
              node.focus();
              const caret = (start === null ? String(node.value || '').length : start) + snippet.length;
              try { node.setSelectionRange(caret, caret); } catch (failure) { /* 非文本控件 */ }
            }, 0);
          }
        }, []);

        /** 上传一张图，返回可放进正文的 markdown；失败时把原因写到横幅并返回 null。 */
        const uploadImage = useCallback(async (file) => {
          if (!file) return null;
          setUploading(true);
          try {
            const dataUrl = await prepareImageDataUrl(file);
            const result = await apiCall('imageUpload', { data: dataUrl });
            if (result && result.remoteError) console.warn('[dsh-memo] 图片只存了本地：', result.remoteError);
            return result && result.markdown ? result.markdown : null;
          } catch (failure) {
            const raw = String((failure && failure.message) || failure);
            commit(undefined, undefined, raw.indexOf('未知操作') >= 0 ? t('cat.needRestart') : raw);
            return null;
          } finally {
            setUploading(false);
          }
        }, [commit]);

        const attachToComposer = useCallback(async (file) => {
          if (!file) return;
          const markdown = await uploadImage(file);
          if (markdown) insertAtCursor(composerRef, `${markdown}\n`, setDraft);
        }, [uploadImage, insertAtCursor]);

        const runSync = useCallback(async () => {
          setBusy(true);
          try {
            const result = await apiCall('sync');
            commit(undefined, undefined, '', result.sync ?? null);
            await load(true);
          } catch (failure) {
            const message = String((failure && failure.message) || failure);
            commit(undefined, undefined, message, { ...(cache.sync || {}), state: 'error', lastError: message });
          } finally {
            setBusy(false);
          }
        }, [commit, load]);

        useEffect(() => () => {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
        }, []);

        const submitDraft = useCallback(async () => {
          const text = draft.trim();
          if (!text || busy) return;
          // 正在看某个分类时，新建的便签默认就归到这个分类
          const args = { text, color: draftColor };
          if (activeCategory !== 'all' && activeCategory !== 'none') args.categoryIds = [activeCategory];
          // 选了提醒时间 → 建出来就是待办
          if (draftRemind) {
            args.remindAt = draftRemind.remindAt;
            args.repeat = draftRemind.repeat;
          }
          const ok = await mutate('add', args);
          if (!ok) return;
          if (draftRemind) {
            setDraftRemind(null);
            setDraftRemindOpen(false);
          }
          setDraft('');
          if (composerRef.current) composerRef.current.focus();
        }, [draft, draftColor, busy, mutate, activeCategory, draftRemind]);

        const todoCount = useMemo(
          () => notes.filter((note) => Boolean(note.remindAt) && note.done !== true).length,
          [notes],
        );

        const archivedCount = useMemo(() => notes.filter((note) => note.archived === true).length, [notes]);

        /** 到点且还没处理的（含已提醒过但没勾完成的），用来把「待办」标红。 */
        const dueCount = useMemo(() => {
          const stamp = nowTick;
          return notes.filter((note) => {
            const state = reminderStateOf(note, stamp);
            return state && (state.kind === 'due' || state.kind === 'overdue');
          }).length;
        }, [notes, nowTick]);

        // 每 15 秒走一下时钟（角标状态会变）
        useEffect(() => {
          const timer = setInterval(() => setNowTick(Date.now()), 15000);
          return () => clearInterval(timer);
        }, []);


        // 提醒浮层触发后刷新墙面数据（浮层在 shell.overlay 里，和面板解耦）
        useEffect(() => {
          const onFired = () => load(true);
          window.addEventListener('dsh-memo:fired', onFired);
          return () => window.removeEventListener('dsh-memo:fired', onFired);
        }, [load]);

        // 提示条 12 秒后自动消失
        useEffect(() => {
          if (!toasts.length) return undefined;
          const timer = setTimeout(() => setToasts((current) => current.slice(1)), 12000);
          return () => clearTimeout(timer);
        }, [toasts]);

        const countsByCategory = useMemo(() => {
          const counts = new Map();
          let uncategorized = 0;
          for (const note of notes) {
            const ids = note.categoryIds || [];
            if (!ids.length) uncategorized += 1;
            for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
          }
          return { counts, uncategorized };
        }, [notes]);

        const tail = useMemo(() => {
          const needle = query.trim().toLowerCase();
          const inCategory = notes.filter((note) => {
            if (activeCategory === 'archive') return note.archived === true;
            if (note.archived === true) return false;
            if (activeCategory === 'todo') return Boolean(note.remindAt) && note.done !== true;
            if (activeCategory === 'all') return true;
            if (activeCategory === 'none') return !(note.categoryIds || []).length;
            return (note.categoryIds || []).indexOf(activeCategory) >= 0;
          });
          let filtered = needle
            ? inCategory.filter((note) => String(note.text || '').toLowerCase().indexOf(needle) >= 0)
            : inCategory.slice();
          // 组合筛选：有提醒 / 有图片 / 最近 7 天
          if (onlyRemind) filtered = filtered.filter((note) => Boolean(note.remindAt));
          if (onlyImage) filtered = filtered.filter((note) => /!\[[^\]]*\]\([^)]+\)/.test(String(note.text || '')));
          if (recentOnly) {
            const since = Date.now() - 7 * 86400000;
            filtered = filtered.filter((note) => (Date.parse(note.createdAt) || 0) >= since);
          }
          filtered.sort((left, right) => {
            // 「待办」按提醒时间正序（到点/逾期的自然排最前）
            if (activeCategory === 'todo') {
              const leftDue = Date.parse(left.remindAt) || 0;
              const rightDue = Date.parse(right.remindAt) || 0;
              if (leftDue !== rightDue) return leftDue - rightDue;
            }
            const pinDelta = Number(Boolean(right.pinned)) - Number(Boolean(left.pinned));
            if (pinDelta !== 0) return pinDelta;
            const leftOrder = Number.isFinite(left.order) ? left.order : 0;
            const rightOrder = Number.isFinite(right.order) ? right.order : 0;
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0);
          });
          return filtered;
        }, [notes, query, activeCategory, onlyRemind, onlyImage, recentOnly]);

        const display = dragOrder
          ? (() => {
            const index = new Map(dragOrder.map((id, position) => [id, position]));
            return tail.slice().sort((left, right) => (index.get(left.id) ?? 0) - (index.get(right.id) ?? 0));
          })()
          : tail;
        displayRef.current = display;

        /** 当前 [[ 候选列表（键盘导航要用到长度）。 */
        const wikiItems = useMemo(() => {
          if (!wiki) return [];
          const needle = String(wiki.query || '').trim().toLowerCase();
          return notes
            .filter((note) => note.archived !== true)
            .filter((note) => (!needle ? true : String(note.text || '').toLowerCase().indexOf(needle) >= 0))
            .slice(0, 8);
        }, [wiki, notes]);

        /** 把选中的便签写成 [[标题]] 并移动光标。 */
        const insertWikiLink = useCallback((note) => {
          if (!wiki) return;
          const title = noteTitleOf(note) || note.id.slice(0, 8);
          setDraft((current) => {
            const next = applyWikiLink(current, wiki.start, title);
            requestAnimationFrame(() => {
              const node = composerRef.current;
              if (node) {
                node.focus();
                try { node.setSelectionRange(next.caret, next.caret); } catch (error) { /* 忽略 */ }
              }
            });
            return next.text;
          });
          setWiki(null);
          setWikiIndex(0);
        }, [wiki]);

        /** 打开一张便签的浮窗（叠一层，不关掉原来的窗口）。 */
        const openView = useCallback((id) => {
          // 临时诊断：中文方括号会意外打开查看窗，先记录调用来源
          try {
            console.warn('[dsh-memo] openView', id, new Error('trace').stack);
          } catch (error) {
            /* 忽略 */
          }
          setViewers((current) => {
            const others = current.filter((item) => item.id !== id);
            const step = others.length * 26;
            return others.concat([{ id, x: 48 + step, y: 40 + step }]);
          });
        }, []);
        const closeView = useCallback(() => {
          setViewers((current) => current.slice(0, -1));
        }, []);

        // 快速便签里点「最近」→ 切到便签墙并打开那张
        useEffect(() => {
          const onOpenNote = (event) => {
            const id = event && event.detail ? event.detail.id : '';
            if (id) openView(id);
          };
          window.addEventListener('dsh-memo:open-note', onOpenNote);
          return () => window.removeEventListener('dsh-memo:open-note', onOpenNote);
        }, [openView]);
        const closeViewer = useCallback((index) => {
          setViewers((current) => current.filter((unused, position) => position !== index));
        }, []);
        const moveViewer = useCallback((index, x, y) => {
          setViewers((current) => current.map((item, position) => (
            position === index
              ? {
                ...item,
                // 面板尺寸还没测到时就先不夹，避免把窗口钉在左上角
                x: Math.max(4, panelSize.width > 200 ? Math.min(x, panelSize.width - 160) : x),
                y: Math.max(4, panelSize.height > 200 ? Math.min(y, panelSize.height - 60) : y),
              }
              : item
          )));
        }, [panelSize.width, panelSize.height]);

        /** 从弹窗点「编辑」：关掉那个窗口，让对应便签进入编辑态。 */
        const editFromView = useCallback((id) => {
          if (id) setEditId(id);
          setViewers([]);
        }, []);





        const frozenLayoutRef = useRef({ positions: new Map(), height: 0 });

        const layout = useMemo(() => {
          if (!wallWidth) return { positions: new Map(), height: 0 };
          // 拖拽改尺寸期间冻结排版：否则每移动 1px 整墙都在重排，手感会糊
          if (resizeActive) return frozenLayoutRef.current;
          const packed = packNotes(display, wallWidth, 14);
          frozenLayoutRef.current = packed;
          return packed;
        }, [display, wallWidth, resizeActive]);

        /** 顺序变化后回放：先瞬间挪回旧位置，再过渡回新位置。 */
        useLayoutEffect(() => {
          const wall = wallRef.current;
          const before = flipRef.current;
          flipRef.current = new Map();
          if (!wall || !before || !before.size) return;
          const cards = wall.querySelectorAll('[data-note-id], [data-placeholder]');
          for (const card of cards) {
            if (card.getAttribute('data-resizing') === 'true') continue;
            const key = card.hasAttribute('data-placeholder') ? '__placeholder__' : card.getAttribute('data-note-id');
            const previous = before.get(key);
            if (!previous) continue;
            const current = card.getBoundingClientRect();
            const deltaX = previous.left - current.left;
            const deltaY = previous.top - current.top;
            if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;
            card.style.transition = 'none';
            card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            // 强制回流，确保浏览器先认下这个起始位置
            void card.offsetWidth;
            requestAnimationFrame(() => {
              // 尊重系统的「减少动态效果」偏好
              const reduced = typeof window !== 'undefined' && window.matchMedia
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              card.style.transition = reduced ? 'none' : 'transform 200ms cubic-bezier(.22,.68,.26,1)';
              card.style.transform = '';
              // 动画结束后清掉内联样式，别覆盖卡片自己的过渡（比如改尺寸）
              setTimeout(() => {
                if (!card.style) return;
                card.style.transition = '';
                card.style.transform = '';
              }, 240);
            });
          }
        }, [dragOrder, layout]);


        let body;
        if (status === 'loading' && !notes.length) {
          body = h('div', { className: 'dsm-state' }, t('loading'));
        } else if (!notes.length) {
          body = h('div', { className: 'dsm-state' },
            h('div', { className: 'dsm-stateTitle' }, t('empty.title')),
            h('div', null, t('empty.hint')));
        } else if (!tail.length) {
          body = h('div', { className: 'dsm-state' }, activeCategory === 'all' ? t('empty.filtered') : t('cat.emptyFilter'));
        } else {
          const draggedNote = draggingId ? notes.find((item) => item.id === draggingId) || null : null;
          body = h('div', {
            className: 'dsm-wall',
            ref: wallRef,
            style: { height: `${Math.round(layout.height)}px` },
          },
            display.map((note) => {
              const spot = layout.positions.get(note.id) || { x: 0, y: 0, w: noteWidthOf(note), h: noteHeightOf(note) };
              return draggingId === note.id
                // 被拖走的便签原位置：透明虚线框，尺寸与卡片一致，松手就落在这里
                ? h('div', {
                  key: note.id,
                  className: 'dsm-note-placeholder',
                  'data-placeholder': 'true',
                  style: {
                    '--dsm-accent': ACCENTS[note.color] || ACCENTS[DEFAULT_COLOR],
                    position: 'absolute',
                    left: `${Math.round(spot.x)}px`,
                    top: `${Math.round(spot.y)}px`,
                    width: `${Math.round(spot.w)}px`,
                    height: `${Math.round(spot.h)}px`,
                  },
                })
                : h(NoteCard, {
                key: note.id,
                note,
                packed: spot,
                now: nowTick,
                busy,
                language,
                dragging: false,
                canDrag: !query.trim(),
                categories,
                uploadImage,
                onImageClick: openLightbox,
                onRemindSet: pushRemindReceipt,
                onToggleTask: toggleTask,
                allNotes: notes,
                onOpenWiki: openView,
                onArchive: (id, archived) => archiveNote(id, archived),
                highlight: query.trim() ? query.trim() : '',
                onOpenView: openView,
                editRequest: editId,
                onResizeStart: () => setResizeActive(true),
                onResizeEnd: () => setResizeActive(false),
                onToggleCategory: toggleNoteCategory,
                onPickCategory: chooseCategory,
                onDragPointerDown,
                onUpdate: (id, patch) => mutate('update', Object.assign({ id }, patch)),
                onRemove: (id) => mutate('remove', { id }),
              });
            }),
            draggedNote && ghost
              ? h('div', {
                key: 'dsm-ghost',
                className: 'dsm-note-ghost',
                style: {
                  left: `${Math.round(ghost.x)}px`,
                  top: `${Math.round(ghost.y)}px`,
                  width: `${Math.round(ghost.width)}px`,
                  height: `${Math.round(ghost.height)}px`,
                },
              }, h(NoteCard, {
                note: draggedNote,
                ghost: true,
                busy: true,
                language,
                dragging: false,
                canDrag: false,
                onDragPointerDown: noopHandler,
                onUpdate: noopHandler,
                onRemove: noopHandler,
              }))
              : null);
        }

        return h('div', { className: 'dsm-root', ref: rootRef },
          h('div', { className: 'dsm-scroll' },
            h('div', { className: 'dsm-inner', ref: innerRef },
              h('header', { className: 'dsm-head' },
                h('div', { className: 'dsm-headText' },
                  h('div', { className: 'dsm-title' },
                    h('span', null, t('panel.title')),
                    h('span', { className: 'dsm-count' }, `${notes.length} ${t('count')}`)),
                  h('p', { className: 'dsm-sub' }, t('panel.subtitle'))),
                h('div', { className: 'dsm-tools' },
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn',
                    title: t('wall.tidy'),
                    'aria-label': t('wall.tidy'),
                    disabled: busy || !notes.length,
                    onClick: () => mutate('resetSizes', { ids: display.map((note) => note.id) }),
                  }, h(Icon, { name: 'grid', size: 15 })),
                  sync && sync.enabled !== false
                    ? h('button', {
                      type: 'button',
                      className: 'dsm-sync',
                      'data-state': sync.state || 'starting',
                      title: [
                        t('sync.now'),
                        sync.lastAt ? `${t('sync.ok')} ${new Date(sync.lastAt).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : '',
                        sync.lastError || '',
                      ].filter(Boolean).join(' · '),
                      'aria-label': t('sync.now'),
                      disabled: busy || sync.state === 'running',
                      onClick: runSync,
                    },
                      h('span', { className: 'dsm-syncDot' }),
                      h('span', null, sync.state === 'running'
                        ? t('sync.running')
                        : sync.state === 'error'
                          ? t('sync.error')
                          : sync.state === 'ok' && sync.lastAt
                            ? `${t('sync.ok')} ${new Date(sync.lastAt).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`
                            : t('sync.starting')))
                    : null,
                  h('label', { className: 'dsm-searchWrap' },
                    h('span', { className: 'dsm-searchIcon' }, h(Icon, { name: 'search', size: 14 })),
                    h('input', {
                      className: 'dsm-searchInput',
                      type: 'search',
                      value: query,
                      placeholder: t('search.placeholder'),
                      'aria-label': t('search.placeholder'),
                      onChange: (event) => setQuery(event.target.value),
                    })),
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn dsm-trashBtn',
                    title: t('trash.open'),
                    'aria-label': t('trash.open'),
                    disabled: status === 'loading',
                    onClick: () => setTrashOpen(true),
                  }, h(Icon, { name: 'trash', size: 15 }), trash.length
                    ? h('span', { className: 'dsm-trashBadge' }, String(trash.length))
                    : null),
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn dsm-filterBtn',
                    title: t('filter.remind'),
                    'aria-label': t('filter.remind'),
                    'aria-pressed': onlyRemind ? 'true' : 'false',
                    'data-on': onlyRemind ? 'true' : undefined,
                    onClick: () => setOnlyRemind(!onlyRemind),
                  }, h(Icon, { name: 'clock', size: 15 })),
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn dsm-filterBtn',
                    title: t('filter.image'),
                    'aria-label': t('filter.image'),
                    'aria-pressed': onlyImage ? 'true' : 'false',
                    'data-on': onlyImage ? 'true' : undefined,
                    onClick: () => setOnlyImage(!onlyImage),
                  }, h(Icon, { name: 'image', size: 15 })),
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn dsm-filterBtn',
                    title: t('filter.recent'),
                    'aria-label': t('filter.recent'),
                    'aria-pressed': recentOnly ? 'true' : 'false',
                    'data-on': recentOnly ? 'true' : undefined,
                    onClick: () => setRecentOnly(!recentOnly),
                  }, h(Icon, { name: 'calendar', size: 15 })),
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn',
                    title: t('refresh'),
                    'aria-label': t('refresh'),
                    disabled: status === 'loading',
                    onClick: () => load(false),
                  }, h(Icon, { name: 'refresh', size: 15 })))),
              h('div', { className: 'dsm-cats', role: 'toolbar', 'aria-label': t('note.categories') },
                h('button', {
                  type: 'button',
                  className: 'dsm-cat',
                  'data-on': activeCategory === 'all' ? 'true' : undefined,
                  onClick: () => chooseCategory('all'),
                },
                  h('span', null, t('cat.all')),
                  h('span', { className: 'dsm-catCount' }, String(notes.length))),
                h('button', {
                  type: 'button',
                  className: 'dsm-cat',
                  'data-on': activeCategory === 'archive' ? 'true' : undefined,
                  title: t('archive.title'),
                  onClick: () => chooseCategory('archive'),
                },
                  h(Icon, { name: 'archive', size: 11 }),
                  h('span', null, t('archive.title')),
                  h('span', { className: 'dsm-catCount' }, String(archivedCount))),
                h('button', {
                  type: 'button',
                  className: 'dsm-cat',
                  'data-on': activeCategory === 'todo' ? 'true' : undefined,
                  'data-due': dueCount > 0 ? 'true' : undefined,
                  title: dueCount > 0 ? `${dueCount} ${t('remind.due')}` : undefined,
                  onClick: () => chooseCategory('todo'),
                },
                  h(Icon, { name: 'clock', size: 11 }),
                  h('span', null, t('remind.todo')),
                  h('span', { className: 'dsm-catCount' }, String(dueCount > 0 ? dueCount : todoCount))),
                categories.map((category, index) => h('div', {
                  key: category.id,
                  className: 'dsm-catDrag',
                  'data-dragging': catDragFrom === index ? 'true' : undefined,
                  'data-drop': catDragTo === index && catDragFrom !== index ? 'true' : undefined,
                  draggable: true,
                  title: t('cat.reorder'),
                  onDragStart: (event) => {
                    catDragFromRef.current = index;
                    setCatDragFrom(index);
                    setCatDragTo(index);
                    try {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', category.id);
                    } catch (error) {
                      /* 忽略 */
                    }
                  },
                  onDragOver: (event) => {
                    event.preventDefault();
                    if (catDragFromRef.current === null) return;
                    setCatDragTo(index);
                    try {
                      event.dataTransfer.dropEffect = 'move';
                    } catch (error) {
                      /* 忽略 */
                    }
                  },
                  onDrop: (event) => {
                    event.preventDefault();
                    commitCatDrag(index);
                  },
                  onDragEnd: () => {
                    setCatDragFrom(null);
                    setCatDragTo(null);
                    catDragFromRef.current = null;
                  },
                }, h(CategoryChip, {
                  category,
                  count: countsByCategory.counts.get(category.id) || 0,
                  active: activeCategory === category.id,
                  onPick: () => chooseCategory(category.id),
                  onRename: (name) => renameCategory(category.id, name),
                  onRemove: () => removeCategory(category.id),
                }))),
                countsByCategory.uncategorized
                  ? h('button', {
                    type: 'button',
                    className: 'dsm-cat',
                    'data-on': activeCategory === 'none' ? 'true' : undefined,
                    onClick: () => chooseCategory('none'),
                  },
                    h('span', null, t('cat.none')),
                    h('span', { className: 'dsm-catCount' }, String(countsByCategory.uncategorized)))
                  : null,
                creatingCategory
                  ? h('input', {
                    className: 'dsm-catInput',
                    autoFocus: true,
                    value: draftCategory,
                    placeholder: t('cat.placeholder'),
                    'aria-label': t('cat.add'),
                    onChange: (event) => setDraftCategory(event.target.value),
                    onBlur: () => {
                      if (!draftCategory.trim()) {
                        setCreatingCategory(false);
                        setDraftCategory('');
                      }
                    },
                    onKeyDown: async (event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setCreatingCategory(false);
                        setDraftCategory('');
                        return;
                      }
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      const value = draftCategory.trim();
                      if (!value) {
                        setCreatingCategory(false);
                        return;
                      }
                      const ok = await createCategory(value);
                      if (ok) setCreatingCategory(false);
                    },
                  })
                  : h('button', {
                    type: 'button',
                    className: 'dsm-cat',
                    onClick: () => {
                      setDraftCategory('');
                      setCreatingCategory(true);
                    },
                  }, h(Icon, { name: 'plus', size: 12 }), h('span', null, t('cat.add')))),
              h('div', { className: 'dsm-composer', 'data-focus': focused ? 'true' : undefined },
                h('textarea', {
                  ref: composerRef,
                  className: 'dsm-composerInput',
                  value: draft,
                  placeholder: t('composer.placeholder'),
                  'aria-label': t('composer.placeholder'),
                  onFocus: () => setFocused(true),
                  onBlur: () => setFocused(false),
                  onChange: (event) => {
                    const value = event.target.value;
                    setDraft(value);
                    const found = wikiQueryAt(value, event.target.selectionStart);
                    setWiki(found);
                    if (found) setWikiIndex(0);
                  },
                  onPaste: (event) => {
                    const file = imageFileFromClipboard(event);
                    if (!file) return;
                    event.preventDefault();
                    attachToComposer(file);
                  },
                  onKeyDown: (event) => {
                    const composing = (event.nativeEvent && event.nativeEvent.isComposing) || event.keyCode === 229;
                    if (wiki && !composing) {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setWikiIndex((current) => Math.min(current + 1, Math.max(0, wikiItems.length - 1)));
                        return;
                      }
                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setWikiIndex((current) => Math.max(0, current - 1));
                        return;
                      }
                      if (event.key === 'Enter' || event.key === 'Tab') {
                        event.preventDefault();
                        const picked = wikiItems[Math.min(wikiIndex, wikiItems.length - 1)];
                        if (picked) insertWikiLink(picked);
                        else setWiki(null);
                        return;
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setWiki(null);
                        return;
                      }
                    }
                    if (event.key !== 'Enter' || composing) return;
                    if (event.metaKey || event.ctrlKey || !event.shiftKey) {
                      event.preventDefault();
                      submitDraft();
                    }
                  },
                }),
                wiki
                  ? h(WikiSuggest, {
                    notes,
                    query: wiki.query,
                    index: wikiIndex,
                    onPick: (note) => insertWikiLink(note),
                  })
                  : null,
                h('div', { className: 'dsm-composerFoot' },
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn',
                    title: uploading ? t('image.uploading') : t('image.add'),
                    'aria-label': t('image.add'),
                    disabled: uploading,
                    onMouseDown: (event) => event.preventDefault(),
                    onClick: async () => {
                      const file = await pickImageFile();
                      if (file) attachToComposer(file);
                    },
                  }, h(Icon, { name: 'image', size: 15 })),
                  COLOR_KEYS.map((key) => h(Swatch, {
                    key,
                    color: key,
                    active: key === draftColor,
                    label: t(`color.${key}`),
                    onPick: () => setDraftColor(key),
                  })),
                  draftRemind
                    ? h('span', { className: 'dsm-intoChip', title: t('remind.title') },
                      h(Icon, { name: 'clock', size: 9 }),
                      h('span', null, formatRemind(draftRemind.remindAt, language, draftRemind.repeat, Date.now(), t)),
                      h('button', {
                        type: 'button',
                        className: 'dsm-chipX',
                        title: t('remind.clear'),
                        onClick: () => setDraftRemind(null),
                      }, '×'))
                    : null,
                  activeCategory !== 'all' && activeCategory !== 'none'
                    ? (() => {
                      const target = categories.find((item) => item.id === activeCategory);
                      if (!target) return null;
                      return h('span', { className: 'dsm-intoChip', title: t('composer.into') },
                        h(Icon, { name: 'tag', size: 9 }),
                        h('span', null, `${t('composer.into')} ${target.name}`));
                    })()
                    : null,
                  h('span', { className: 'dsm-spacer' }),
                  h('div', { className: 'dsm-paletteWrap' },
                    h('button', {
                      type: 'button',
                      className: 'dsm-iconBtn',
                      title: t('remind.set'),
                      'aria-label': t('remind.set'),
                      'aria-expanded': draftRemindOpen ? 'true' : 'false',
                      'data-on': draftRemind ? 'true' : undefined,
                      onMouseDown: (event) => event.preventDefault(),
                      onClick: () => setDraftRemindOpen(!draftRemindOpen),
                    }, h(Icon, { name: 'clock', size: 15 })),
                    draftRemindOpen
                      ? h(ReminderPicker, {
                        remindAt: draftRemind ? draftRemind.remindAt : null,
                        repeat: draftRemind ? draftRemind.repeat : null,
                        onSave: (remindAt, repeat) => {
                          setDraftRemind({ remindAt, repeat });
                          setDraftRemindOpen(false);
                        },
                        onClear: draftRemind
                          ? () => {
                            setDraftRemind(null);
                            setDraftRemindOpen(false);
                          }
                          : null,
                      })
                      : null),
                  h('span', { className: 'dsm-hint' }, t('composer.hint')),
                  h('button', {
                    type: 'button',
                    className: 'dsm-btn dsm-btnPrimary',
                    disabled: busy || !draft.trim(),
                    onClick: submitDraft,
                  }, t('composer.add')))),
              error
                ? h('div', { className: 'dsm-banner', role: 'alert' },
                  h('span', null, error),
                  h('button', {
                    type: 'button',
                    className: 'dsm-btn',
                    disabled: status === 'loading',
                    onClick: () => load(false),
                  }, t('retry')))
                : null,
              body)),
          trashOpen
            ? h('div', {
              className: 'dsm-viewer',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': t('trash.title'),
              onPointerDown: (event) => {
                if (event.target === event.currentTarget) setTrashOpen(false);
              },
            },
              h('div', { className: 'dsm-viewerCard' },
                h('div', { className: 'dsm-viewerHead' },
                  h('span', { className: 'dsm-viewerDot' }),
                  h('span', { className: 'dsm-viewerTitle' }, `${t('trash.title')}　·　${t('trash.hint')}`),
                  h('button', {
                    type: 'button',
                    className: 'dsm-iconBtn',
                    title: t('view.close'),
                    'aria-label': t('view.close'),
                    onClick: () => setTrashOpen(false),
                  }, h(Icon, { name: 'close', size: 14 }))),
                h('div', { className: 'dsm-viewerBody' },
                  trash.length === 0
                    ? h('div', { className: 'dsm-trashEmpty' }, t('trash.empty'))
                    : trash.map((item) => h('div', { key: item.id, className: 'dsm-trashRow' },
                      h('div', { className: 'dsm-trashText' },
                        h('div', null, item.text),
                        h('div', { className: 'dsm-trashMeta' }, `${t('trash.deletedAt')} ${timeAgo(item.deletedAt, language)}`)),
                      h('button', {
                        type: 'button',
                        className: 'dsm-miniBtn',
                        disabled: busy,
                        onClick: () => restoreNote(item.id),
                      }, t('trash.restore')),
                      h('button', {
                        type: 'button',
                        className: 'dsm-miniBtn',
                        disabled: busy,
                        onClick: () => purgeNote(item.id),
                      }, t('trash.purge'))))),
                h('div', { className: 'dsm-viewerFoot' },
                  h('span', { className: 'dsm-spacer' }),
                  trash.length
                    ? h('button', {
                      type: 'button',
                      className: 'dsm-btn',
                      disabled: busy,
                      onClick: () => emptyTrash(),
                    }, t('trash.clear'))
                    : null,
                  h('button', {
                    type: 'button',
                    className: 'dsm-btn dsm-btnPrimary',
                    onClick: () => setTrashOpen(false),
                  }, t('view.close')))))
            : null,
          viewers.length
            ? h('div', {
              className: 'dsm-viewerLayer',
              onPointerDown: (event) => {
                if (event.target === event.currentTarget) closeView();
              },
            },
              viewers.map((entry, index) => {
                const note = notes.find((item) => item.id === entry.id);
                if (!note) return null;
                const order = display.findIndex((item) => item.id === note.id);
                return h(NoteViewer, {
                  key: `${entry.id}-${index}`,
                  note,
                  x: entry.x,
                  y: entry.y,
                  language,
                  categories,
                  allNotes: notes,
                  highlight: query.trim() ? query.trim() : '',
                  onMove: (x, y) => moveViewer(index, x, y),
                  onOpenWiki: (targetId) => openView(targetId),
                  onImageClick: openLightbox,
                  onToggleTask: toggleTask,
                  onClose: () => closeViewer(index),
                  onSave: (text) => mutate('update', { id: note.id, text }),
                  onEdit: () => editFromView(note.id),
                  onPrev: order > 0 ? () => openView(display[order - 1].id) : null,
                  onNext: order >= 0 && order < display.length - 1 ? () => openView(display[order + 1].id) : null,
                });
              }))
            : null,
          toasts.length
            ? h('div', { className: 'dsm-toastWrap', role: 'status', 'aria-live': 'polite' },
              toasts.map((toast) => h('div', {
                key: toast.key,
                className: 'dsm-toast',
                title: t('remind.toastTitle'),
                onClick: () => setToasts((current) => current.filter((item) => item.key !== toast.key)),
              },
                h(Icon, { name: 'clock', size: 13 }),
                h('div', null,
                  h('strong', null, toast.title || t('remind.toastTitle')),
                  h('div', null, toast.text)))))
            : null,
          lightbox
            ? h(Lightbox, {
              src: lightbox.src,
              alt: lightbox.alt,
              onClose: () => setLightbox(null),
            })
            : null);
      }

      return MemoPanel;
    }

    function insertStyles() {
      if (typeof document === 'undefined') return () => {};
      const styleId = '@local/dsh-memo/client.css';
      if (document.querySelector(`style[data-plugin-css="${styleId}"]`)) return () => {};
      const tag = document.createElement('style');
      tag.dataset.plugin = '@local/dsh-memo';
      tag.dataset.pluginCss = styleId;
      tag.textContent = CSS;
      document.head.append(tag);
      return () => {
        tag.remove();
      };
    }

    return {
      name: NS,
      inject: ['slots', 'locale'],
      apply(ctx) {
        let t = (key) => key;
        try {
          ctx.effect(() => ctx.locale.register(NS, { zh: DICT_ZH, en: DICT_EN }), 'dsh-memo: dictionaries');
          t = ctx.locale.bind(NS);
        } catch (failure) {
          console.error('dsh-memo: 字典注册失败，回退到内置中文', failure);
          t = (key) => (Object.prototype.hasOwnProperty.call(DICT_ZH, key) ? DICT_ZH[key] : key);
        }

        const useLang = makeUseLang(ctx.locale);
        const Panel = makePanel(t, useLang);

        ctx.effect(() => insertStyles(), 'dsh-memo: stylesheet');

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 2,
          locale: NS,
          label: () => t('panel.title'),
        }, (props) => h(MemoRailIcon, { size: props.size, active: props.active })));

        // 会话输入框：@便签: 候选（已按用户要求暂时关闭）
        try {
          if (!ENABLE_NOTE_MENTION) throw new Error('disabled');
          const MemoNoteMention = makeNoteMention(t);
          ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
            name: 'conversation.input.overlay',
            id: 'memo-mention',
          }, MemoNoteMention));
        } catch (error) {
          console.error('dsh-memo: @便签 候选注册失败', error);
        }

        // 每条助手消息的操作条：收进便签
        try {
          const MemoCaptureButton = makeCaptureButton(t);
          ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
            name: 'conversation.chat.assistant-actions',
            id: 'memo-capture',
            order: 40,
          }, MemoCaptureButton));
        } catch (error) {
          console.error('dsh-memo: 消息收集按钮注册失败', error);
        }

        // 设置 → 便签墙（fast-note-sync 配置）
        try {
          const MemoSyncSettings = makeSyncSettings(t);
          ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section',
            id: 'memo',
            order: 30,
            label: () => t('set.title'),
            locale: NS,
          }, MemoSyncSettings));
        } catch (error) {
          console.error('dsh-memo: 设置页注册失败', error);
        }

        // 把「快速便签」注册进 DSH 的快捷键体系：设置页能看到、能改键
        let shortcutRegistered = false;
        try {
          const shortcuts = typeof ctx.get === 'function' ? ctx.get('shortcuts') : null;
          if (shortcuts && typeof shortcuts.register === 'function') {
            const binding = { code: 'KeyN', modifiers: ['alt'] };
            ctx.effect(() => shortcuts.register({
              id: 'memo.quick',
              label: () => t('quick.title'),
              aliases: ['便签', 'note', 'memo'],
              defaults: {
                'web:macos': binding,
                'web:windows': binding,
                'web:linux': binding,
                'desktop:macos': binding,
                'desktop:windows': binding,
                'desktop:linux': binding,
              },
              regions: ['page', 'editable', 'terminal'],
              modals: [],
              resolve: () => ({
                status: 'handled',
                run: () => {
                  try {
                    window.dispatchEvent(new CustomEvent('dsh-memo:capture'));
                  } catch (error) {
                    /* 忽略 */
                  }
                },
              }),
            }), 'dsh-memo: quick capture shortcut');
            shortcutRegistered = true;
          }
        } catch (error) {
          console.error('dsh-memo: 快捷键注册失败', error);
        }

        // 便签抽屉的快捷键（Alt+M）
        try {
          const shortcuts = typeof ctx.get === 'function' ? ctx.get('shortcuts') : null;
          if (shortcuts && typeof shortcuts.register === 'function') {
            const binding = { code: 'KeyM', modifiers: ['alt'] };
            ctx.effect(() => shortcuts.register({
              id: 'memo.drawer',
              label: () => t('drawer.title'),
              aliases: ['便签列表', 'notes', 'drawer'],
              defaults: {
                'web:macos': binding,
                'web:windows': binding,
                'web:linux': binding,
                'desktop:macos': binding,
                'desktop:windows': binding,
                'desktop:linux': binding,
              },
              regions: ['page', 'editable', 'terminal'],
              modals: [],
              resolve: () => ({
                status: 'handled',
                run: () => {
                  try {
                    window.dispatchEvent(new CustomEvent('dsh-memo:drawer'));
                  } catch (error) {
                    /* 忽略 */
                  }
                },
              }),
            }), 'dsh-memo: drawer shortcut');
          }
        } catch (error) {
          console.error('dsh-memo: 抽屉快捷键注册失败', error);
        }

        // 快速便签：会话页也能就地记一笔（Alt+N 或输入框旁的按钮）
        try {
          const openWall = () => {
            const layout = typeof ctx.get === 'function' ? ctx.get('layout') : null;
            if (layout && typeof layout.selectPanel === 'function') {
              try { layout.selectPanel(PANEL_ID); } catch (error) { /* 忽略 */ }
            }
          };
          const QuickCapture = makeQuickCapture(t, {
            onOpenWall: openWall,
            onSaved: openWall,
            shortcutHandled: shortcutRegistered,
          });
          ctx.slots.inject('shell.overlay', () => ctx.slots.register({
            name: 'shell.overlay',
            id: 'memo-quick-capture',
            order: 90,
          }, QuickCapture));
          const MemoDrawer = makeMemoDrawer(t, { onOpenWall: openWall });
          ctx.slots.inject('shell.overlay', () => ctx.slots.register({
            name: 'shell.overlay',
            id: 'memo-drawer',
            order: 95,
          }, MemoDrawer));
          ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
            name: 'conversation.input.right',
            id: 'memo-drawer-btn',
            order: 4,
            label: t('drawer.title'),
          }, () => h('button', {
            type: 'button',
            className: 'dsm-quickBtn',
            title: t('drawer.title'),
            'aria-label': t('drawer.title'),
            onClick: () => {
              try {
                window.dispatchEvent(new CustomEvent('dsh-memo:drawer'));
              } catch (error) {
                /* 忽略 */
              }
            },
          }, h(Icon, { name: 'list', size: 14 }))));
          ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
            name: 'conversation.input.right',
            id: 'memo-quick',
            order: 5,
            label: t('quick.title'),
          }, (props) => {
            void props;
            return h('button', {
              type: 'button',
              className: 'dsm-quickBtn',
              title: t('quick.title'),
              'aria-label': t('quick.title'),
              onClick: () => {
                try {
                  window.dispatchEvent(new CustomEvent('dsh-memo:capture'));
                } catch (error) {
                  /* 忽略 */
                }
              },
            }, h(Icon, { name: 'pin', size: 14 }));
          }));
        } catch (error) {
          console.error('dsh-memo: 快速便签注册失败', error);
        }

        // 全局提醒浮层：不依赖便签墙面板是否打开
        try {
          const Overlay = makeReminderOverlay(t, () => {
            const layout = typeof ctx.get === 'function' ? ctx.get('layout') : null;
            if (layout && typeof layout.selectPanel === 'function') {
              try { layout.selectPanel(PANEL_ID); } catch (error) { /* 忽略 */ }
            }
          });
          ctx.slots.inject('shell.overlay', () => ctx.slots.register({
            name: 'shell.overlay',
            id: 'memo-reminders',
            order: 100,
          }, Overlay));
        } catch (error) {
          console.error('dsh-memo: 提醒浮层注册失败', error);
        }

        // 书签/快捷方式支持：URL 带 #memo（或 ?panel=memo）就直接打开便签墙
        try {
          let opened = false;
          const openFromUrl = () => {
            if (typeof window === 'undefined' || !window.location) return;
            const hash = String(window.location.hash || '').replace(/^#/, '');
            const query = new URLSearchParams(window.location.search || '').get('panel') || '';
            if ((hash || query) !== PANEL_ID) {
              opened = false;   // 地址变了就重置，方便再次用 hash 切回来
              return;
            }
            if (opened) return;
            const layout = typeof ctx.get === 'function' ? ctx.get('layout') : null;
            if (layout && typeof layout.selectPanel === 'function') {
              try {
                layout.selectPanel(PANEL_ID);
                opened = true;
              } catch (error) {
                /* 面板还没注册就等下一次重试 */
              }
            }
          };
          ctx.effect(() => {
            const timers = [0, 250, 800, 1600].map((delay) => setTimeout(openFromUrl, delay));
            window.addEventListener('hashchange', openFromUrl);
            return () => {
              for (const timer of timers) clearTimeout(timer);
              window.removeEventListener('hashchange', openFromUrl);
            };
          }, 'dsh-memo: deep link');
        } catch (error) {
          /* 深链失败不影响正常使用 */
        }

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, Panel));
      },
    };
  },
});
