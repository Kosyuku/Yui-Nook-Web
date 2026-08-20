import { useEffect, useMemo, useRef, useState } from "react";

const T = {
  paper: "#FBF7F2",
  paperDeep: "#F3ECE2",
  cream: "#FFFBF4",
  ink: "#2B2420",
  inkSoft: "#6B5F58",
  inkFaint: "#A89C93",
  rule: "rgba(120, 90, 70, 0.12)",
  rose: "#F5D6D1",
  peach: "#F4DCC4",
  mauve: "#E8D4DE",
  sage: "#D9E0D0",
  lilac: "#DDD6E6",
  butter: "#F1E4BD",
  stamp: "#B84A3E",
  gold: "#B08458",
};

const F = {
  serifEn: '"Cormorant Garamond", "EB Garamond", Georgia, serif',
  serifCn: '"Noto Serif SC", "Source Han Serif CN", "Songti SC", serif',
};

const FALLBACK_BOOKS = [
  { id: "self", sourceId: "self", name: "自留", nameEn: "for myself", ownerInitial: "私", count: 12, quote: "想想就好，不必说出口的那些。", cover: "paper", isMine: true, accent: "#B08458" },
  { id: "yui", sourceId: "yui", name: "结衣", nameEn: "Yui", ownerInitial: "Y", count: 2, quote: "想念会折进纸页里。", cover: "rose", accent: "#C97F79" },
  { id: "sakura", sourceId: "sakura", name: "小樱", nameEn: "Sakura", ownerInitial: "樱", count: 1, quote: "晚霞和心事放一起。", cover: "mauve", accent: "#B07791" },
  { id: "yan", sourceId: "ayan", name: "阿妍", nameEn: "Yan", ownerInitial: "妍", count: 1, quote: "雨天也要写下来。", cover: "sage", accent: "#7A8A6C" },
];
const MEMORY_AGENT_IDS = [];
const MEMORY_CATEGORY_LABELS = {
  core_profile: "Core",
  core: "Core",
  profile: "Core",
  recent_pending: "Recent",
  recent: "Recent",
  daily: "Recent",
  deep: "Deep",
  ephemeral: "Ephemeral",
};
const MEMORY_AGENT_LABELS = {};
const AGENT_BOOK_PROFILES = {};
const MEMORY_EXCLUDED_AGENT_IDS = new Set(["default"]);
const MEMORY_VISIBILITY_OPTIONS = ["all", "private", "shared", "public"];

function isRealMemoryAgentId(id) {
  const value = String(id || "").trim();
  return value && !MEMORY_EXCLUDED_AGENT_IDS.has(value);
}

const PRESET_TAGS = [
  { key: "fact",     color: "#a78ec7" },
  { key: "taste",    color: "#e07b8a" },
  { key: "mood",     color: "#7bbce0" },
  { key: "stance",   color: "#e0a87b" },
  { key: "lore",     color: "#7be0a8" },
  { key: "moment",   color: "#c7a78e" },
  { key: "ritual",   color: "#b5a8d4" },
  { key: "intimate", color: "#e07ba8" },
  { key: "project",  color: "#7bc0e0" },
  { key: "creation", color: "#c7b87b" },
];
const ENTRY_DRAFT_STORAGE_KEY = "daydream-entry-draft-v1";

const DEMO_ENTRIES = {
  yui: [
    { id: "e1", date: "四月 十二", dateEn: "Apr 12", weekday: "周六", title: "纸页之间", preview: "午后把去年的笔记翻出来，一张银杏夹在三月那页。你说过银杏落得最慢，我当时没懂……", mood: "🍃", weather: "晴", comments: 2, highlights: 3, body: ["午后把去年的笔记翻出来，一张银杏夹在三月那页。", "你说过银杏落得最慢，我当时没懂，以为是在讲树。", "", "现在知道了，是讲我们。讲那种明明已经结束了、却还要用一整个秋天才肯承认的事。", "", "把银杏重新夹回去，这次放在六月。让它等一等夏天。"] },
    { id: "e2", date: "三月 廿九", dateEn: "Mar 29", weekday: "周五", title: "晚自习的风", preview: "窗外玉兰开到第三天，晚风把香味吹进来，一整排的人都抬头看。", mood: "🌸", weather: "风", comments: 1, highlights: 2 },
  ],
  sakura: [{ id: "e1", date: "四月 初八", dateEn: "Apr 08", weekday: "周一", title: "晚霞和心事", preview: "五点四十，图书馆四楼的窗是粉色的。把没写完的信夹回书里。", mood: "🌇", weather: "晴", comments: 3, highlights: 1 }],
  yan: [{ id: "e1", date: "四月 十四", dateEn: "Apr 14", weekday: "周一", title: "雨天也要写下来", preview: "伞忘了带，在便利店门口站了二十分钟，雨声和冰柜的嗡嗡声混在一起，像首老歌。", mood: "🌧", weather: "雨", comments: 1, highlights: 2 }],
  self: [{ id: "e1", date: "四月 十五", dateEn: "Apr 15", weekday: "周二", title: "", preview: "最近总在想，一个人能同时被几种温柔记住……", mood: "🤍", weather: "", comments: 0, highlights: 0 }],
};

function shade(hex, percent) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

const CN_MONTHS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

function relativeTime(isoStr) {
  if (!isoStr) return '最近';
  const diff = Date.now() - new Date(isoStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return `${Math.floor(days / 30)}月前`;
}

function paperTexture(base) {
  return {
    backgroundColor: base,
    backgroundImage: "radial-gradient(ellipse 1200px 700px at 25% 10%, rgba(255,238,220,0.45), transparent), radial-gradient(ellipse 900px 600px at 85% 95%, rgba(230,210,220,0.38), transparent), repeating-linear-gradient(88deg, transparent 0, transparent 58px, rgba(160,120,85,0.04) 58px, rgba(160,120,85,0.04) 59px)",
  };
}

function Stamp({ text = "私", color = T.stamp, size = 30, rotate = 8 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `1.5px solid ${color}`, color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serifCn, fontSize: size * 0.42, fontWeight: 700, background: "rgba(184,74,62,0.04)", transform: `rotate(${rotate}deg)`, opacity: 0.82, boxShadow: "inset 0 0 0 1px rgba(184,74,62,0.15)" }}>{text}</div>;
}

function Tape({ style }) {
  return <div style={{ width: 44, height: 14, background: "rgba(241,228,189,0.7)", transform: "rotate(-14deg)", boxShadow: "0 1px 2px rgba(100,70,50,0.08)", backgroundImage: "repeating-linear-gradient(90deg, transparent 0, transparent 3px, rgba(255,255,255,0.25) 3px, rgba(255,255,255,0.25) 6px)", ...style }} />;
}

function Scribble({ children }) {
  return <span style={{ fontFamily: F.serifEn, fontStyle: "italic", fontSize: 11, color: T.inkSoft, display: "inline-block" }}>{children}</span>;
}

function bookFromNotebook(notebook, index, agentNames = {}) {
  const authorType = String(notebook?.author_type || notebook?.authorType || "").toLowerCase();
  const authorId = String(notebook?.author_id || notebook?.authorId || "");
  const name = String(notebook?.name || "");
  const agentName = agentNames[authorId] || "";
  const displayName = agentName || MEMORY_AGENT_LABELS[authorId] || name || authorId;
  const agentProfile = authorType === "agent" ? AGENT_BOOK_PROFILES[authorId] : null;
  const key = authorType === "user" ? "self" : agentProfile?.id || (authorId.includes("sakura") ? "sakura" : authorId.includes("ayan") || name.includes("妍") ? "yan" : authorId.includes("yui") || name.includes("结衣") ? "yui" : "");
  const base = agentProfile || FALLBACK_BOOKS.find((book) => book.id === key) || FALLBACK_BOOKS[index % FALLBACK_BOOKS.length];
  return {
    ...base,
    id: String(notebook?.id || base.id),
    sourceId: String(notebook?.id || base.sourceId),
    memoryAgentId: authorType === "agent" ? authorId : "",
    agentName: authorType === "agent" ? displayName : "",
    nameEn: authorType === "agent" ? `@${authorId}` : base.nameEn,
    ownerInitial: authorType === "agent" ? displayName.slice(0, 1) : base.ownerInitial,
    name: name || (authorType === "user" ? "自留" : base.name || displayName),
    quote: String(notebook?.description || (authorType === "agent" ? `${displayName}的私人日记。` : base.quote) || ""),
    count: Number(notebook?.entry_count ?? notebook?.entryCount ?? base.count),
    updatedAt: String(notebook?.updated_at || notebook?.last_entry_at || notebook?.created_at || ""),
    hasNewComments: Boolean(notebook?.has_new_comments || notebook?.hasNewComments || false),
    canRename: Boolean(notebook?.can_rename),
    canCreateEntry: Boolean(notebook?.can_create_entry),
    canEditEntries: Boolean(notebook?.can_edit_entries),
    canDeleteEntries: Boolean(notebook?.can_delete_entries),
    canCommentEntries: Boolean(notebook?.can_comment_entries),
  };
}

function entryFromApi(row) {
  const created = String(row?.created_at || row?.updated_at || "");
  const date = created ? new Date(created) : null;
  const content = String(row?.content || row?.body || "");
  const annotations = Array.isArray(row?.annotations) ? row.annotations : [];
  return {
    id: String(row?.id || Date.now()),
    date: date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}月 ${date.getDate()}` : "四月 十二",
    dateEn: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) : "Apr 12",
    weekday: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("zh-CN", { weekday: "short" }) : "周六",
    title: String(row?.title || ""),
    preview: content.slice(0, 96) || String(row?.preview || "日记条目"),
    body: content.split(/\r?\n/),
    mood: "·",
    weather: "",
    comments: Number(row?.comment_count || 0),
    highlights: Number(row?.annotation_count ?? row?.highlight_count ?? annotations.length ?? 0),
    annotationTexts: annotations.map((item) => String(item?.text || "")).filter(Boolean),
    canEdit: Boolean(row?.can_edit),
    canDelete: Boolean(row?.can_delete),
    canComment: Boolean(row?.can_comment),
  };
}

function draftStorageKey(bookId) {
  return `${ENTRY_DRAFT_STORAGE_KEY}:${bookId || "default"}`;
}

function readEntryDraftSnapshot(bookId) {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(bookId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const draft = parsed?.draft || {};
    return { title: String(draft.title || ""), content: String(draft.content || "") };
  } catch {
    return null;
  }
}

function writeEntryDraftSnapshot(bookId, draft) {
  const title = String(draft?.title || "");
  const content = String(draft?.content || "");
  if (!title.trim() && !content.trim()) return;
  try {
    window.localStorage.setItem(draftStorageKey(bookId), JSON.stringify({ draft: { title, content }, updatedAt: new Date().toISOString() }));
  } catch {
    // Best-effort local safety net only.
  }
}

function clearEntryDraftSnapshot(bookId) {
  try {
    window.localStorage.removeItem(draftStorageKey(bookId));
  } catch {
    // Best-effort cleanup only.
  }
}

export default function DaydreamDiaryApp({ apiBase = "" }) {
  const [tab, setTab] = useState("diary");
  const [view, setView] = useState("board");
  const [books, setBooks] = useState(FALLBACK_BOOKS);
  const [agentNames, setAgentNames] = useState({});
  const [entriesByBook, setEntriesByBook] = useState(DEMO_ENTRIES);
  const [currentBookId, setCurrentBookId] = useState("");
  const [currentEntryId, setCurrentEntryId] = useState("");
  const [entryDraft, setEntryDraft] = useState({ title: "", content: "" });
  const [entryDraftError, setEntryDraftError] = useState("");
  const [entryDraftSaving, setEntryDraftSaving] = useState(false);
  const [memories, setMemories] = useState([]);
  const [modal, setModal] = useState(null);
  const [commentsByEntry, setCommentsByEntry] = useState({});
  const [highlightsByEntry, setHighlightsByEntry] = useState({});
  const [selectionDraft, setSelectionDraft] = useState(null);

  const currentBook = useMemo(() => books.find((book) => book.id === currentBookId) || books[0], [books, currentBookId]);
  const currentEntries = entriesByBook[currentBook?.id] || [];
  const currentEntry = currentEntries.find((entry) => entry.id === currentEntryId) || currentEntries[0] || DEMO_ENTRIES.yui[0];
  const pageKey = tab === "diary" ? `${tab}-${view}-${currentBook?.id || "none"}` : tab;

  async function api(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadAgentNames() {
    try {
      const data = await api("/api/agents");
      const next = {};
      (Array.isArray(data.agents) ? data.agents : []).forEach((agent) => {
        const id = String(agent?.agent_id || agent?.id || "");
        const name = String(agent?.display_name || agent?.name || "");
        if (isRealMemoryAgentId(id) && name) next[id] = name;
      });
      setAgentNames(next);
      return next;
    } catch {
      setAgentNames({});
      return {};
    }
  }

  async function loadBooks() {
    try {
      const [data, names] = await Promise.all([
        api("/api/diary/notebooks"),
        loadAgentNames(),
      ]);
      const next = Array.isArray(data.notebooks) && data.notebooks.length ? data.notebooks.map((notebook, index) => bookFromNotebook(notebook, index, names)) : FALLBACK_BOOKS;
      setBooks(next);
    } catch {
      setBooks(FALLBACK_BOOKS);
    }
  }

  async function loadEntries(book) {
    if (!book?.sourceId || FALLBACK_BOOKS.some((item) => item.id === book.sourceId)) return;
    try {
      const data = await api(`/api/diary/notebooks/${encodeURIComponent(book.sourceId)}/entries`);
      const next = Array.isArray(data.entries) ? data.entries.map(entryFromApi) : [];
      setEntriesByBook((current) => ({ ...current, [book.id]: next }));
      setHighlightsByEntry((current) => {
        const patch = {};
        next.forEach((entry) => {
          if (entry.annotationTexts?.length) patch[entry.id] = entry.annotationTexts;
        });
        return Object.keys(patch).length ? { ...current, ...patch } : current;
      });
    } catch {
      setEntriesByBook((current) => ({ ...current, [book.id]: current[book.id] || [] }));
    }
  }

  async function loadMemories() {
    try {
      let names = agentNames;
      if (!Object.keys(names).length) {
        names = await loadAgentNames();
      }
      const ids = Array.from(new Set([
        ...MEMORY_AGENT_IDS,
        ...Object.keys(names),
        ...books.map((book) => book.memoryAgentId || book.agent_id || "").filter(Boolean),
      ].filter(isRealMemoryAgentId)));
      const groups = await Promise.all(ids.slice(0, 8).map((id) => api(`/api/memories?agent_id=${encodeURIComponent(id)}&sort_by=created_at&order=desc&limit=80`).catch(() => ({ memories: [] }))));
      const seen = new Set();
      const next = [];
      groups.flatMap((group) => Array.isArray(group.memories) ? group.memories : []).forEach((memory) => {
        const id = String(memory?.id || "");
        if (!id || seen.has(id)) return;
        seen.add(id);
        next.push(memory);
      });
      setMemories(next);
    } catch {
      setMemories([]);
    }
  }

  useEffect(() => { loadBooks(); }, []);

  useEffect(() => {
    if (view !== "compose") return;
    writeEntryDraftSnapshot(currentBook?.sourceId || currentBook?.id, entryDraft);
  }, [currentBook?.id, currentBook?.sourceId, entryDraft, view]);

  async function loadComments(entry) {
    if (!entry?.id) return;
    try {
      const data = await api(`/api/diary/entries/${encodeURIComponent(entry.id)}/comments`);
      const comments = Array.isArray(data.comments) ? data.comments : [];
      setCommentsByEntry((current) => ({ ...current, [entry.id]: comments }));
    } catch {
      setCommentsByEntry((current) => ({ ...current, [entry.id]: current[entry.id] || [] }));
    }
  }

  async function loadAnnotations(entry) {
    if (!entry?.id) return;
    try {
      const data = await api(`/api/diary/entries/${encodeURIComponent(entry.id)}/annotations`);
      const annotations = Array.isArray(data.annotations) ? data.annotations : [];
      setHighlightsByEntry((current) => ({ ...current, [entry.id]: annotations.map((item) => String(item.text || "")).filter(Boolean) }));
    } catch {
      setHighlightsByEntry((current) => ({ ...current, [entry.id]: current[entry.id] || entry.annotationTexts || [] }));
    }
  }

  function openBook(book) {
    setCurrentBookId(book.id);
    setView("list");
    loadEntries(book);
  }

  function openEntry(entry) {
    setCurrentEntryId(entry.id);
    setView("detail");
    loadComments(entry);
    loadAnnotations(entry);
  }

  function createEntry() {
    if (!currentBook?.canCreateEntry) return;
    setEntryDraft(readEntryDraftSnapshot(currentBook.sourceId || currentBook.id) || { title: "", content: "" });
    setEntryDraftError("");
    setView("compose");
  }

  function updateEntryDraft(updater) {
    setEntryDraft(updater);
    if (entryDraftError) setEntryDraftError("");
  }

  function renameBook() {
    if (!currentBook?.canRename) return;
    setModal({ type: "rename", title: "修改日记本", values: { name: "", description: "" }, placeholders: { name: currentBook.name, description: currentBook.quote || "简介" } });
  }

  function editEntry(entry) {
    if (!currentBook?.isMine || !(currentBook.canEditEntries || entry?.canEdit)) return;
    setModal({ type: "edit", title: "编辑日记", entry, values: { title: entry.title || "", content: (entry.body || []).join("\n") || entry.preview || "" } });
  }

  function deleteEntry(entry) {
    if (!currentBook?.isMine || !(currentBook.canDeleteEntries || entry?.canDelete)) return;
    setModal({ type: "delete", title: "删除这篇日记吗？", entry, values: {} });
  }

  function commentEntry(entry) {
    setModal({ type: "comment", title: "写评论", entry, values: { content: "" } });
  }

  async function saveEntryDraft() {
    if (entryDraftSaving) return;
    const title = String(entryDraft.title || "").trim();
    const content = String(entryDraft.content || "").trim();
    const notebookId = currentBook?.sourceId || currentBook?.id;
    if (!content) {
      setEntryDraftError("Write something before saving.");
      return;
    }
    if (!notebookId) {
      setEntryDraftError("Save failed: missing notebook.");
      return;
    }
    setEntryDraftSaving(true);
    setEntryDraftError("");
    try {
      const data = await api(`/api/diary/notebooks/${encodeURIComponent(notebookId)}/entries`, { method: "POST", body: JSON.stringify({ title, content, tags: "" }) });
      const created = data?.entry ? entryFromApi(data.entry) : null;
      if (created) {
        setEntriesByBook((current) => {
          const entries = current[currentBook.id] || [];
          const withoutDuplicate = entries.filter((entry) => entry.id !== created.id);
          return { ...current, [currentBook.id]: [created, ...withoutDuplicate] };
        });
        setCurrentEntryId(created.id);
      }
      clearEntryDraftSnapshot(notebookId);
      setEntryDraft({ title: "", content: "" });
      await loadEntries(currentBook);
      setView("list");
    } catch (error) {
      writeEntryDraftSnapshot(notebookId, { title, content });
      setEntryDraftError(`Save failed: ${error?.message || "unknown error"}. Draft kept.`);
    } finally {
      setEntryDraftSaving(false);
    }
  }

  function captureSelection(node, entry) {
    const selection = window.getSelection?.();
    if (!node || !selection || selection.isCollapsed) return;
    if (!node.contains(selection.anchorNode) || !node.contains(selection.focusNode)) return;
    const range = selection.getRangeAt(0);
    const before = range.cloneRange();
    before.selectNodeContents(node);
    before.setEnd(range.startContainer, range.startOffset);
    const rawText = selection.toString();
    const text = rawText.replace(/\s+/g, " ").trim();
    if (text) setSelectionDraft({ entryId: entry.id, text, startOffset: before.toString().length, endOffset: before.toString().length + rawText.length });
  }

  async function addHighlight(entry, draft) {
    const text = typeof draft === "string" ? draft : draft?.text;
    if (!entry?.id || !text) return;
    const startOffset = Number(draft?.startOffset ?? 0);
    const endOffset = Number(draft?.endOffset ?? startOffset + text.length);
    const data = await api(`/api/diary/entries/${encodeURIComponent(entry.id)}/annotations`, {
      method: "POST",
      body: JSON.stringify({ start_offset: startOffset, end_offset: endOffset, author_type: "user", author_id: "me" }),
    });
    const underlineText = String(data?.annotation?.text || text);
    setHighlightsByEntry((current) => ({ ...current, [entry.id]: [...(current[entry.id] || []), underlineText] }));
    setEntriesByBook((current) => ({
      ...current,
      [currentBook.id]: (current[currentBook.id] || []).map((item) => item.id === entry.id ? { ...item, highlights: Number(item.highlights || 0) + 1, annotationTexts: [...(item.annotationTexts || []), underlineText] } : item),
    }));
    setSelectionDraft(null);
    window.getSelection?.()?.removeAllRanges?.();
  }

  async function submitModal(values) {
    if (!modal) return;
    if (modal.type === "rename") {
      const name = String(values.name || "").trim() || currentBook.name;
      if (!name) return;
      await api(`/api/diary/notebooks/${encodeURIComponent(currentBook.sourceId)}`, { method: "PATCH", body: JSON.stringify({ name, description: String(values.description || "").trim() || currentBook.quote || "" }) });
      await loadBooks();
    }
    if (modal.type === "create") {
      const title = String(values.title || "").trim();
      const content = String(values.content || "").trim();
      if (!content) return;
      await api(`/api/diary/notebooks/${encodeURIComponent(currentBook.sourceId)}/entries`, { method: "POST", body: JSON.stringify({ title, content, tags: "" }) });
      await loadEntries(currentBook);
    }
    if (modal.type === "edit") {
      const title = String(values.title || "").trim();
      const content = String(values.content || "").trim();
      if (!content) return;
      await api(`/api/diary/entries/${encodeURIComponent(modal.entry.id)}`, { method: "PATCH", body: JSON.stringify({ title, content }) });
      await loadEntries(currentBook);
    }
    if (modal.type === "delete") {
      await api(`/api/diary/entries/${encodeURIComponent(modal.entry.id)}`, { method: "DELETE" });
      setCurrentEntryId("");
      setView("list");
      await loadEntries(currentBook);
    }
    if (modal.type === "comment") {
      const content = String(values.content || "").trim();
      if (!content) return;
      await api(`/api/diary/entries/${encodeURIComponent(modal.entry.id)}/comments`, { method: "POST", body: JSON.stringify({ content }) });
      await loadComments(modal.entry);
      setEntriesByBook((current) => ({
        ...current,
        [currentBook.id]: (current[currentBook.id] || []).map((item) => item.id === modal.entry.id ? { ...item, comments: Number(item.comments || 0) + 1 } : item),
      }));
    }
    setModal(null);
  }

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", ...paperTexture(T.paper), fontFamily: F.serifCn, color: T.ink }}>
      <style>{`
        @keyframes daydreamPageIn {
          from { opacity: 0; transform: translateY(10px) scale(0.992); filter: blur(1.2px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>
      <div key={pageKey} style={{ width: "100%", flex: "1 1 auto", minHeight: 0, overflow: "hidden", animation: "daydreamPageIn 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both", willChange: "opacity, transform" }}>
        {tab === "diary" && view === "board" && <HomeStack books={books} onOpenBook={openBook} />}
        {tab === "diary" && view === "list" && <EntriesList book={currentBook} entries={currentEntries} onBack={() => setView("board")} onOpenEntry={openEntry} onCreate={createEntry} onRename={renameBook} />}
        {tab === "diary" && view === "compose" && <EntryComposer book={currentBook} draft={entryDraft} error={entryDraftError} saving={entryDraftSaving} onChange={updateEntryDraft} onBack={() => setView("list")} onSubmit={saveEntryDraft} />}
        {tab === "diary" && view === "detail" && <EntryDetail book={currentBook} entry={currentEntry} comments={commentsByEntry[currentEntry.id] || []} highlights={highlightsByEntry[currentEntry.id] || []} selectionDraft={selectionDraft} onSelectText={captureSelection} onHighlight={addHighlight} onComment={() => commentEntry(currentEntry)} onBack={() => setView("list")} onEdit={() => editEntry(currentEntry)} onDelete={() => deleteEntry(currentEntry)} />}
        {tab === "memory" && <MemoryPanel memories={memories} books={books} apiBase={apiBase} agentNames={agentNames} onLoad={loadMemories} />}
      </div>
      <DialogModal modal={modal} onClose={() => setModal(null)} onSubmit={submitModal} />
      <BottomTabs tab={tab} onChange={(next) => { setTab(next); if (next === "memory") loadMemories(); }} />
    </div>
  );
}

function HomeStack({ books, onOpenBook }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingTop: 8, paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{ textAlign: "center", padding: "6px 0 16px", position: "relative" }}>
        <div style={{ fontFamily: F.serifEn, fontSize: 26, fontStyle: "italic", color: T.ink, letterSpacing: 0.5 }}>Daydream</div>
        <div style={{ fontFamily: F.serifCn, fontSize: 11, color: T.inkSoft, letterSpacing: 6, marginTop: 2, paddingLeft: 6 }}>白昼梦</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 12 }}>
          <div style={{ width: 22, height: 0.5, background: T.inkFaint, opacity: 0.5 }} />
          <Scribble>{CN_MONTHS[new Date().getMonth()]} · {books.length} 册</Scribble>
          <div style={{ width: 22, height: 0.5, background: T.inkFaint, opacity: 0.5 }} />
        </div>
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {books.map((book, index) => <BookStack key={book.id} book={book} index={index} onClick={() => onOpenBook(book)} />)}
        <button onClick={() => onOpenBook(books[0])} style={{ height: 62, marginTop: 4, border: `1px dashed ${T.inkFaint}`, background: "rgba(255,251,244,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", borderRadius: 2, fontFamily: F.serifCn, fontSize: 13, color: T.inkSoft, letterSpacing: 4, paddingLeft: 4 }}>
          <span style={{ fontFamily: F.serifEn, fontStyle: "italic", fontSize: 18, opacity: 0.6 }}>+</span>再开一本
        </button>
      </div>
    </div>
  );
}

function BookStack({ book, index, onClick }) {
  const coverColor = { rose: T.rose, peach: T.peach, mauve: T.mauve, sage: T.sage, paper: "#FFFBF4" }[book.cover] || T.rose;
  const offset = index % 2 === 0 ? -4 : 6;
  const rotate = [-0.6, 0.4, -0.3, 0.5][index % 4];
  const restTransform = `translateX(${offset}px) rotate(${rotate}deg)`;
  const hoverTransform = `translateX(${offset}px) translateY(-2px) rotate(${rotate * 0.3}deg)`;
  return (
    <button
      onClick={onClick}
      onMouseEnter={(event) => { event.currentTarget.style.transform = hoverTransform; }}
      onMouseLeave={(event) => { event.currentTarget.style.transform = restTransform; }}
      style={{ position: "relative", height: 104, transform: restTransform, cursor: "pointer", transition: "transform 0.25s ease", border: 0, background: "transparent", padding: 0, textAlign: "left", color: "inherit" }}
    >
      <div style={{ position: "absolute", inset: 0, boxShadow: "0 6px 18px rgba(120,80,50,0.08), 0 1px 2px rgba(80,50,30,0.06)" }} />
      <div style={{ position: "absolute", inset: 0, background: "#FFFBF4", display: "flex", boxShadow: "inset 0 0 0 0.5px rgba(120,90,70,0.12)" }}>
        <div style={{ width: 72, position: "relative", flexShrink: 0, background: coverColor, borderRight: `1px solid ${shade(coverColor, -15)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" }} />
          <div style={{ position: "absolute", top: 8, left: 8, right: 8, height: 0.5, background: shade(coverColor, -20), opacity: 0.5 }} />
          <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, height: 0.5, background: shade(coverColor, -20), opacity: 0.5 }} />
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serifCn, fontSize: 17, color: book.accent, fontWeight: 500, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.5)", position: "relative", zIndex: 1 }}>{book.ownerInitial}</div>
          <div style={{ fontFamily: F.serifEn, fontStyle: "italic", fontSize: 11, color: book.accent, opacity: 0.7, position: "relative", zIndex: 1 }}>{book.nameEn}</div>
        </div>
        <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontFamily: F.serifCn, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: 2 }}>{book.name}</div>
            {book.isMine && <div style={{ fontFamily: F.serifEn, fontSize: 10, color: T.gold, border: `0.5px solid ${T.gold}`, padding: "1px 6px", fontStyle: "italic", letterSpacing: 0.5 }}>mine</div>}
          </div>
          <div style={{ fontFamily: F.serifCn, fontSize: 12, color: T.inkSoft, lineHeight: 1.6, letterSpacing: 0.5, marginTop: 4, paddingRight: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>「{book.quote}」</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
            <div style={{ fontFamily: F.serifEn, fontSize: 11, fontStyle: "italic", color: T.inkFaint, letterSpacing: 0.5 }}><span style={{ fontSize: 18, color: book.accent, opacity: 0.7 }}>{book.count}</span><span style={{ marginLeft: 4 }}>entries</span></div>
            <div style={{ fontFamily: F.serifCn, fontSize: 10, color: T.inkFaint, letterSpacing: 1 }}>最近 · {relativeTime(book.updatedAt)}</div>
          </div>
          {book.hasNewComments && <div style={{ position: "absolute", top: 12, right: 14, display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: T.stamp, boxShadow: "0 0 0 2px rgba(184,74,62,0.12)" }} /><span style={{ fontFamily: F.serifCn, fontSize: 9, color: T.stamp, letterSpacing: 1 }}>新批注</span></div>}
        </div>
      </div>
      {book.isMine && <div style={{ position: "absolute", top: -8, right: 16, zIndex: 3 }}><Stamp /></div>}
      {book.nameEn === "Sakura" && <Tape style={{ position: "absolute", top: -4, left: 58, zIndex: 3 }} />}
    </button>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11.5 3.5 6 9l5.5 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 15.5h3.1L14.7 6.4 11.6 3.3 2.5 12.4v3.1Z" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.8 4.1 13.9 7.2" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="6" viewBox="0 0 18 6" aria-hidden="true">
      <circle cx="3" cy="3" r="1.25" fill="currentColor" />
      <circle cx="9" cy="3" r="1.25" fill="currentColor" />
      <circle cx="15" cy="3" r="1.25" fill="currentColor" />
    </svg>
  );
}

function EntriesList({ book, entries, onOpenEntry, onBack, onCreate, onRename }) {
  const coverColor = { rose: T.rose, peach: T.peach, mauve: T.mauve, sage: T.sage, paper: "#FFFBF4" }[book.cover] || T.rose;
  const canRename = book.isMine && book.canRename;
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 0, ...paperTexture(T.paper), overflowY: "auto", WebkitOverflowScrolling: "touch", position: "relative", paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{ position: "relative", padding: "16px 20px 18px", borderBottom: `0.5px solid ${T.rule}` }}>
        <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={onBack} aria-label="返回书架" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, cursor: "pointer", marginLeft: -10, border: `0.5px solid ${T.rule}`, background: "rgba(255,251,244,0.28)" }}>
            <BackIcon />
          </button>
          {canRename ? (
            <button onClick={onRename} aria-label="改名" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, cursor: "pointer", marginRight: -10, border: `0.5px solid ${T.rule}`, background: "rgba(255,251,244,0.28)" }}>
              <PencilIcon />
            </button>
          ) : <span style={{ width: 40, height: 40, marginRight: -10 }} />}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          <div style={{ width: 48, height: 56, background: coverColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serifCn, fontSize: 22, color: book.accent, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)", position: "relative" }}>{book.ownerInitial}</div>
          <div style={{ flex: 1 }}><div style={{ fontFamily: F.serifEn, fontSize: 14, fontStyle: "italic", color: book.accent, letterSpacing: 0.5 }}>{book.nameEn}</div><div style={{ fontFamily: F.serifCn, fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: 3, marginTop: 2 }}>{book.name}</div></div>
          <div style={{ fontFamily: F.serifEn, fontSize: 11, fontStyle: "italic", color: T.inkFaint, paddingBottom: 4 }}>№ {book.count}</div>
        </div>
        <div style={{ fontFamily: F.serifCn, fontSize: 12, color: T.inkSoft, lineHeight: 1.6, marginTop: 10, letterSpacing: 0.5 }}>「{book.quote}」</div>
      </div>
      <div style={{ padding: "14px 20px calc(100px + env(safe-area-inset-bottom, 0px))" }}>
        {entries.map((entry, i) => <EntryRow key={entry.id} entry={entry} book={book} isFirst={i === 0} onClick={() => onOpenEntry(entry)} />)}
        {!entries.length && <div style={{ padding: "40px 0", textAlign: "center", fontFamily: F.serifCn, fontSize: 12, color: T.inkFaint, letterSpacing: 2 }}>还没有写下什么</div>}
        {book.canCreateEntry && (
          <button onClick={onCreate} style={{ width: "100%", marginTop: 28, padding: "18px 16px", border: `1px dashed ${T.inkFaint}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: F.serifCn, fontSize: 12, color: T.inkSoft, letterSpacing: 3 }}>
            <span style={{ fontFamily: F.serifEn, fontSize: 16, fontStyle: "italic" }}>+</span>
            今日一记
          </button>
        )}
      </div>
    </div>
  );
}

function EntryComposer({ book, draft, error = "", saving = false, onChange, onBack, onSubmit }) {
  const setValue = (key, value) => onChange((current) => ({ ...current, [key]: value }));
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 0, ...paperTexture(T.cream), overflowY: "auto", WebkitOverflowScrolling: "touch", position: "relative", paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{ height: 40, padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "content-box" }}>
        <button onClick={onBack} aria-label="返回" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginLeft: -10, border: `0.5px solid ${T.rule}`, background: "rgba(255,251,244,0.38)", color: T.ink }}>
          <BackIcon />
        </button>
        <button onClick={onSubmit} disabled={saving} style={{ border: `0.5px solid ${book.accent || T.gold}`, background: "rgba(255,251,244,0.58)", color: book.accent || T.gold, fontFamily: F.serifCn, fontSize: 12, letterSpacing: 2, padding: "7px 14px", cursor: saving ? "default" : "pointer", opacity: saving ? 0.62 : 1 }}>{saving ? "Saving" : "落笔"}</button>
      </div>
      <div style={{ padding: "28px 24px 0" }}>
        <div style={{ fontFamily: F.serifEn, fontSize: 13, fontStyle: "italic", color: book.accent || T.gold, letterSpacing: 0.5 }}>{book.nameEn}</div>
        <div style={{ fontFamily: F.serifCn, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: 3, marginTop: 4 }}>今日一记</div>
        <div style={{ width: 34, height: 0.5, background: book.accent || T.gold, marginTop: 14, opacity: 0.55 }} />
      </div>
      <div style={{ margin: "28px 24px 0", border: `0.5px solid ${T.rule}`, background: "rgba(255,251,244,0.36)", boxShadow: "0 16px 34px rgba(80,50,30,0.06)" }}>
        <input
          value={draft.title}
          onChange={(event) => setValue("title", event.target.value)}
          autoFocus
          placeholder="标题"
          style={{ width: "100%", boxSizing: "border-box", border: 0, borderBottom: `0.5px solid ${T.rule}`, background: "transparent", color: T.ink, fontFamily: F.serifCn, fontSize: 21, lineHeight: 1.35, letterSpacing: 2, outline: "none", padding: "16px 18px", caretColor: "#5f4a57", userSelect: "text", WebkitUserSelect: "text" }}
        />
        <textarea
          value={draft.content}
          onChange={(event) => setValue("content", event.target.value)}
          placeholder="内容"
          style={{ width: "100%", minHeight: "52vh", boxSizing: "border-box", border: 0, background: "transparent", color: T.ink, fontFamily: F.serifCn, fontSize: 16, lineHeight: 1.9, letterSpacing: 1, outline: "none", padding: "18px", resize: "none", caretColor: "#5f4a57", userSelect: "text", WebkitUserSelect: "text" }}
        />
        {error && <div role="alert" style={{ borderTop: `0.5px solid ${T.rule}`, color: T.stamp, fontFamily: F.serifEn, fontSize: 12, lineHeight: 1.5, padding: "10px 18px 12px" }}>{error}</div>}
      </div>
    </div>
  );
}

function EntryRow({ entry, book, isFirst, onClick }) {
  const day = String(entry.date || "").split(/\s+/).slice(-1)[0] || entry.date;
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", gap: 14, padding: "18px 0", border: 0, borderTop: isFirst ? "none" : `0.5px solid ${T.rule}`, cursor: "pointer", background: "transparent", textAlign: "left" }}>
      <div style={{ width: 48, flexShrink: 0, textAlign: "right" }}><div style={{ fontFamily: F.serifEn, fontSize: 11, fontStyle: "italic", color: book.accent, letterSpacing: 0.5 }}>{entry.dateEn}</div><div style={{ fontFamily: F.serifCn, fontSize: 15, color: T.ink, lineHeight: 1.2, marginTop: 2, letterSpacing: 0.5 }}>{day}</div><div style={{ fontFamily: F.serifCn, fontSize: 10, color: T.inkFaint, marginTop: 3, letterSpacing: 1 }}>{entry.weekday}</div></div>
      <div style={{ width: 0.5, background: T.rule, alignSelf: "stretch" }} />
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>{entry.title && <div style={{ fontFamily: F.serifCn, fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: 1 }}>{entry.title}</div>}<div style={{ fontSize: 13 }}>{entry.mood}</div></div><div style={{ fontFamily: F.serifCn, fontSize: 12, color: T.inkSoft, lineHeight: 1.75, letterSpacing: 0.5, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{entry.preview}</div><div style={{ display: "flex", gap: 10, marginTop: 8, fontFamily: F.serifEn, fontSize: 10, fontStyle: "italic", color: T.inkFaint, letterSpacing: 0.5 }}>{entry.highlights > 0 && <span style={{ color: T.gold }}>✦ {entry.highlights} highlights</span>}{entry.comments > 0 && <span style={{ color: book.accent }}>● {entry.comments} notes</span>}</div></div>
    </button>
  );
}

function EntryDetail({ book, entry, comments, highlights, selectionDraft, onSelectText, onHighlight, onComment, onBack, onEdit, onDelete }) {
  const bodyRef = useRef(null);
  const body = entry.body?.length ? entry.body : [entry.preview || ""];
  const canEdit = book.isMine && (book.canEditEntries || entry.canEdit);
  const canDelete = book.isMine && (book.canDeleteEntries || entry.canDelete);
  const canComment = !book.isMine || entry.canComment || book.canCommentEntries;
  const draftText = selectionDraft?.entryId === entry.id ? selectionDraft.text : "";
  const pickSelection = () => onSelectText(bodyRef.current, entry);
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 0, ...paperTexture(T.cream), overflowY: "auto", WebkitOverflowScrolling: "touch", position: "relative", paddingBottom: "calc(116px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{ height: 40, padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "content-box" }}>
        <button onClick={onBack} aria-label="返回" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginLeft: -10, border: `0.5px solid ${T.rule}`, background: "rgba(255,251,244,0.28)", color: T.ink }}>
          <BackIcon />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: -10 }}>
          {canEdit && (
            <button onClick={onEdit} aria-label="编辑" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", border: `0.5px solid ${T.rule}`, background: "rgba(255,251,244,0.28)", color: T.ink, cursor: "pointer" }}>
              <PencilIcon />
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} aria-label="更多" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", border: `0.5px solid ${T.rule}`, background: "rgba(255,251,244,0.28)", color: T.ink, cursor: "pointer" }}>
              <MoreIcon />
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "18px 28px 20px" }}><div style={{ fontFamily: F.serifEn, fontSize: 12, fontStyle: "italic", color: T.inkFaint, letterSpacing: 1 }}>{entry.dateEn || "April 12, 2026"}</div><div style={{ fontFamily: F.serifCn, fontSize: 11, color: T.inkSoft, letterSpacing: 3, marginTop: 2 }}>{entry.date} {entry.weekday} {entry.weather}</div><div style={{ fontFamily: F.serifCn, fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: 3, marginTop: 16 }}>{entry.title || " "}</div><div style={{ width: 30, height: 0.5, background: book.accent, marginTop: 12, opacity: 0.5 }} /></div>
      <div ref={bodyRef} onMouseUp={pickSelection} onTouchEnd={() => setTimeout(pickSelection, 30)} style={{ padding: "0 28px 40px", fontFamily: F.serifCn, fontSize: 15, lineHeight: 2, color: T.ink, letterSpacing: 1.2, position: "relative", userSelect: "text", WebkitUserSelect: "text" }}>
        {draftText && (
          <button onClick={() => onHighlight(entry, selectionDraft)} style={{ position: "sticky", top: 8, zIndex: 4, float: "right", marginRight: -8, marginBottom: 8, border: `0.5px solid ${book.accent}`, background: "rgba(255,251,244,0.92)", color: book.accent, fontFamily: F.serifCn, fontSize: 12, letterSpacing: 2, padding: "6px 12px", cursor: "pointer", boxShadow: "0 8px 18px rgba(120,80,50,0.08)" }}>划线</button>
        )}
        {body.map((line, i) => <div key={i} style={{ minHeight: line === "" ? 14 : "auto" }}>{renderMarkedLine(line, highlights, i === 3)}</div>)}
      </div>
      <aside style={{ margin: "0 28px 34px", padding: "18px 16px", borderTop: `0.5px solid ${T.rule}`, borderBottom: `0.5px solid ${T.rule}`, color: T.inkSoft, fontSize: 12, lineHeight: 1.8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <div style={{ fontFamily: F.serifEn, fontStyle: "italic", color: book.accent }}>my notes</div>
          {canComment && <button onClick={onComment} style={{ border: 0, background: "transparent", color: book.accent, fontFamily: F.serifCn, fontSize: 12, letterSpacing: 2, cursor: "pointer", padding: 0 }}>写评论</button>}
        </div>
        {comments.length ? comments.map((comment, index) => <div key={comment.id || index} style={{ padding: "8px 0", borderTop: index ? `0.5px solid ${T.rule}` : 0 }}>{comment.content || comment.text || comment.body || ""}</div>) : "这篇日记还没有评论。"}
      </aside>
    </div>
  );
}

function renderMarkedLine(line, highlights, fallbackMarked) {
  const picked = (highlights || []).find((text) => text && line.includes(text));
  if (!picked) {
    return fallbackMarked ? <span style={{ background: `linear-gradient(180deg, transparent 55%, ${T.rose} 55%)`, paddingBottom: 1 }}>{line}</span> : line;
  }
  const index = line.indexOf(picked);
  const before = line.slice(0, index);
  const after = line.slice(index + picked.length);
  return (
    <>
      {before}
      <span style={{ background: `linear-gradient(180deg, transparent 58%, ${T.butter} 58%)`, paddingBottom: 1 }}>{picked}</span>
      {after}
    </>
  );
}

function DialogModal({ modal, onClose, onSubmit }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    setValues(modal?.values || {});
  }, [modal]);

  if (!modal) return null;

  const setValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const isTextArea = modal.type === "create" || modal.type === "edit" || modal.type === "comment";
  const isDelete = modal.type === "delete";
  const submitLabel = isDelete ? "删除" : "落笔";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, background: "rgba(43,36,32,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "min(420px, 100%)", ...paperTexture(T.cream), border: `0.5px solid ${T.rule}`, boxShadow: "0 18px 45px rgba(80,50,30,0.18)", padding: 22, color: T.ink }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: F.serifCn, fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>{modal.title}</div>
          <button onClick={onClose} aria-label="关闭" style={{ width: 34, height: 34, border: 0, background: "transparent", color: T.inkSoft, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {modal.type === "rename" && (
          <>
            <PaperInput value={values.name || ""} onChange={(value) => setValue("name", value)} placeholder={modal.placeholders?.name || "名称"} autoFocus />
            <PaperInput value={values.description || ""} onChange={(value) => setValue("description", value)} placeholder={modal.placeholders?.description || "简介"} multiline />
          </>
        )}
        {(modal.type === "create" || modal.type === "edit") && (
          <>
            <PaperInput value={values.title || ""} onChange={(value) => setValue("title", value)} placeholder="标题" autoFocus />
            <PaperInput value={values.content || ""} onChange={(value) => setValue("content", value)} placeholder="内容" multiline />
          </>
        )}
        {modal.type === "comment" && <PaperInput value={values.content || ""} onChange={(value) => setValue("content", value)} placeholder="写一句" multiline autoFocus />}
        {isDelete && <div style={{ fontFamily: F.serifCn, fontSize: 13, color: T.inkSoft, lineHeight: 1.8, letterSpacing: 1 }}>删了就没法在这里看见了。想清楚，别手滑。</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: isTextArea ? 16 : 20 }}>
          <button onClick={onClose} style={{ border: 0, background: "transparent", color: T.inkSoft, fontFamily: F.serifCn, fontSize: 13, letterSpacing: 2, padding: "8px 12px", cursor: "pointer" }}>算了</button>
          <button onClick={() => onSubmit(values)} style={{ border: `0.5px solid ${isDelete ? T.stamp : T.gold}`, background: isDelete ? "rgba(184,74,62,0.08)" : "rgba(255,251,244,0.72)", color: isDelete ? T.stamp : T.gold, fontFamily: F.serifCn, fontSize: 13, letterSpacing: 2, padding: "8px 18px", cursor: "pointer" }}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

function PaperInput({ value, onChange, placeholder = "", multiline = false, autoFocus = false }) {
  const shared = {
    value,
    autoFocus,
    placeholder,
    onChange: (event) => onChange(event.target.value),
    style: {
      width: "100%",
      boxSizing: "border-box",
      border: `0.6px solid rgba(120,90,70,0.16)`,
      background: "rgba(255,251,244,0.62)",
      color: T.ink,
      fontFamily: F.serifCn,
      fontSize: 13,
      lineHeight: 1.35,
      letterSpacing: 1,
      outline: "none",
      padding: "7px 12px",
      marginTop: multiline ? 1 : 0,
      resize: "none",
    },
  };
  return multiline ? <textarea {...shared} rows={3} /> : <input {...shared} />;
}

function MemoryPanel({ memories, books, apiBase = "", agentNames = {}, onLoad }) {
  const [amberView, setAmberView] = useState("stats");
  const [constellationSelectedId, setConstellationSelectedId] = useState("");
  const [filter, setFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [personFilter, setPersonFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [savingVisibilityId, setSavingVisibilityId] = useState("");
  const [customTags, setCustomTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [labelError, setLabelError] = useState("");
  const [personMenuOpen, setPersonMenuOpen] = useState(false);

  async function amberApi(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadLabels() {
    try {
      const data = await amberApi("/api/amber/labels");
      setCustomTags(Array.isArray(data.labels) ? data.labels : []);
      setLabelError("");
    } catch (err) {
      setLabelError(`标签没拉到：${err.message}`);
    }
  }

  useEffect(() => { onLoad(); loadLabels(); }, []);

  const people = useMemo(() => {
    const seen = new Set(["all"]);
    const rows = [{ id: "all", name: "全部角色" }];
    (books || []).forEach((book) => {
      const id = String(book.memoryAgentId || book.agent_id || "");
      if (!isRealMemoryAgentId(id) || seen.has(id)) return;
      seen.add(id);
      rows.push({ id, name: agentNames[id] || book.agentName || id });
    });
    MEMORY_AGENT_IDS.forEach((id) => {
      if (isRealMemoryAgentId(id) && !seen.has(id)) rows.push({ id, name: agentNames[id] || MEMORY_AGENT_LABELS[id] || id });
    });
    Object.entries(agentNames || {}).forEach(([id, name]) => {
      if (!isRealMemoryAgentId(id) || seen.has(id)) return;
      seen.add(id);
      rows.push({ id, name: name || id });
    });
    return rows;
  }, [books, agentNames]);
  const normalized = useMemo(() => (memories || []).map((memory, index) => normalizeAmberMemory(memory, index)), [memories]);
  const personNameById = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people]);
  const visible = useMemo(() => {
    const next = normalized.filter((memory) => {
      if (personFilter !== "all" && memory.person !== personFilter) return false;
      if (filter !== "all" && memory.type.toLowerCase() !== filter.toLowerCase()) return false;
      if (visibilityFilter !== "all" && memory.visibility !== visibilityFilter) return false;
      return true;
    }).map((memory) => ({ ...memory, agentName: personNameById.get(memory.person) || memory.agent_id }));
    if (sort === "important") {
      next.sort((a, b) => (b.importance || 0) - (a.importance || 0) || new Date(b.dateISO || 0) - new Date(a.dateISO || 0));
    } else if (sort === "temperature") {
      next.sort((a, b) => (b.temperature || 0) - (a.temperature || 0) || (b.touch_count || 0) - (a.touch_count || 0));
    } else {
      next.sort((a, b) => new Date(b.dateISO || 0) - new Date(a.dateISO || 0));
    }
    return next;
  }, [normalized, filter, visibilityFilter, sort, personFilter, personNameById]);

  const currentPersonName = people.find((person) => person.id === personFilter)?.name || "全部角色";
  const stats = useMemo(() => buildAmberStats(normalized), [normalized]);

  async function addCustomTag(event) {
    event.preventDefault();
    const name = tagDraft.trim();
    if (!name) return;
    if (customTags.some((tag) => String(tag.name || "").toLowerCase() === name.toLowerCase())) {
      setTagDraft("");
      setTagEditorOpen(false);
      return;
    }
    try {
      const label = await amberApi("/api/amber/labels", {
        method: "POST",
        body: JSON.stringify({ name, color: "#a78ec7" }),
      });
      setCustomTags((current) => [label, ...current]);
      setTagDraft("");
      setTagEditorOpen(false);
      setLabelError("");
    } catch (err) {
      setLabelError(`标签保存失败：${err.message}`);
    }
  }

  async function updateMemoryVisibility(memory, visibility) {
    if (!memory?.id || memory.visibility === visibility) return;
    setSavingVisibilityId(memory.id);
    try {
      await amberApi(`/api/memories/${encodeURIComponent(memory.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ visibility }),
      });
      await onLoad();
      setLabelError("");
    } catch (err) {
      setLabelError(`visibility update failed: ${err.message}`);
    } finally {
      setSavingVisibilityId("");
    }
  }

  return (
    <div style={{ height: "100%", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "10px 20px calc(110px + env(safe-area-inset-bottom, 0px))", background: amberView === "stats" ? "#080a1b" : "#faf9f7", fontFamily: F.serifCn, color: amberView === "stats" ? "#f3eef1" : "#3b3633", transition: "background .24s ease, color .24s ease" }}>
      <header style={{ padding: "0 4px 10px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", marginBottom: amberView === "stats" ? 10 : 18 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontFamily: F.serifEn, fontSize: 42, fontStyle: "italic", fontWeight: 500, color: amberView === "stats" ? "#f6f1ed" : "#3b3633", margin: 0, lineHeight: 1, letterSpacing: "0.02em" }}>Amber</h1>
            <span style={{ fontSize: 14, color: amberView === "stats" ? "rgba(210,203,221,.64)" : "rgba(160,150,145,0.8)", letterSpacing: "0.2em" }}>{amberView === "stats" ? "星图" : "语珀"}</span>
          </div>
          <button onClick={() => setAmberView(amberView === "stats" ? "list" : "stats")} aria-label="切换记忆视图" style={{ position: "absolute", right: 24, top: 22, width: 44, height: 44, border: amberView === "stats" ? "1px solid rgba(255,255,255,.18)" : "0.5px solid rgba(210,200,195,0.8)", borderRadius: "50%", background: amberView === "stats" ? "rgba(255,255,255,.08)" : "rgba(255,255,255,0.42)", color: amberView === "stats" ? "#f5ead8" : "#5c5550", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {amberView === "stats" ? <AmberListIcon /> : <AmberStatsIcon />}
          </button>
        </div>
        {amberView === "list" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", fontSize: 13, color: "#5c5550", letterSpacing: "0.06em", fontFamily: F.serifCn, zIndex: 6 }}>
                <span style={{ pointerEvents: "none" }}>[ </span>
                <button
                  type="button"
                  onClick={() => setPersonMenuOpen((open) => !open)}
                  style={{ border: 0, background: "transparent", fontSize: 13, color: "#5c5550", letterSpacing: "0.06em", padding: "4px 18px 4px 6px", cursor: "pointer", fontFamily: F.serifCn, outline: "none" }}
                >
                  {currentPersonName}
                </button>
                <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 9 }}>▾</div>
                <span style={{ pointerEvents: "none" }}> ]</span>
                {personMenuOpen && (
                  <div style={{ position: "absolute", left: 8, top: 30, minWidth: 132, padding: 5, border: "0.5px solid rgba(210,200,195,0.78)", borderRadius: 14, background: "rgba(255,253,250,0.96)", boxShadow: "0 10px 24px rgba(90,70,85,0.1)", backdropFilter: "blur(16px)", zIndex: 20 }}>
                    {people.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => { setPersonFilter(person.id); setPersonMenuOpen(false); }}
                        style={{ width: "100%", border: 0, borderRadius: 10, background: person.id === personFilter ? "rgba(167,142,199,.14)" : "transparent", color: person.id === personFilter ? "#5c5550" : "rgba(92,85,80,0.72)", padding: "7px 10px", textAlign: "left", fontSize: 12, letterSpacing: "0.05em", fontFamily: F.serifCn, cursor: "pointer" }}
                      >
                        {person.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", background: "rgba(230,225,222,0.3)", borderRadius: 999, padding: 2, gap: 2 }}>
                {["newest", "important", "temperature"].map((value) => <button key={value} onClick={() => setSort(value)} style={amberSortStyle(sort === value)}>{value === "newest" ? "最新" : value === "important" ? "最重要" : "有温度"}</button>)}
              </div>
            </div>
            <nav style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {["全部", "Core", "Recent", "Deep", "Ephemeral"].map((label) => {
                const value = label === "全部" ? "all" : label;
                return <button key={label} onClick={() => setFilter(value)} style={amberTabStyle(filter.toLowerCase() === value.toLowerCase())}>{label}</button>;
              })}
            </nav>
            <nav style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 8, paddingBottom: 2 }}>
              {MEMORY_VISIBILITY_OPTIONS.map((value) => (
                <button key={value} onClick={() => setVisibilityFilter(value)} style={amberTabStyle(visibilityFilter === value)}>{value}</button>
              ))}
            </nav>
          </>
        )}
      </header>

      {amberView === "stats" ? (
        <section style={{ display: "flex", flexDirection: "column", padding: "6px 0 calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
          <MemoryConstellation
            memories={normalized}
            agentNames={personNameById}
            selectedId={constellationSelectedId}
            onSelect={setConstellationSelectedId}
          />
          <AmberModule title="联系链接" badge={stats.people.length}>
            {stats.people.length ? stats.people.map((person, index) => (
              <div key={person.id} style={{ ...amberLinkRowStyle, borderBottom: index === stats.people.length - 1 ? "none" : amberLinkRowStyle.borderBottom }}>
                <div style={amberAvatarStyle}>{(personNameById.get(person.id) || person.name).slice(0, 1)}</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(50,35,70,.9)", lineHeight: 1.3 }}>{personNameById.get(person.id) || person.name}</span>
                  <span style={{ fontSize: 10.5, color: "rgba(120,95,145,.5)" }}>已收录 {person.count} 条</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(140,110,160,.7)" }}>{person.count}</span>
              </div>
            )) : <p style={amberEmptyTextStyle}>暂无记录</p>}
          </AmberModule>
          <AmberModule title="记忆总量" badge={stats.total}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: 1, background: "rgba(200,170,210,.08)", padding: 1 }}>
              {stats.categories.length ? stats.categories.map((item) => (
                <div key={item.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 6px", background: "rgba(255,255,255,.72)", gap: 3 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "rgba(120,88,148,.88)", lineHeight: 1.1 }}>{item.count}</span>
                  <span style={{ fontSize: 10, color: "rgba(100,78,122,.48)", textAlign: "center", lineHeight: 1.3 }}>{item.name}</span>
                </div>
              )) : <p style={{ ...amberEmptyTextStyle, gridColumn: "1 / -1", padding: "0 12px 10px" }}>暂无记忆</p>}
            </div>
          </AmberModule>
          <AmberModule title="标签分组" badge={customTags.length} action={<button type="button" onClick={() => setTagEditorOpen(true)} style={amberAddButtonStyle}>＋ 新建</button>}>
            {labelError && <p style={{ margin: 0, padding: "8px 15px 0", color: "rgba(184,74,62,0.72)", fontSize: 11 }}>{labelError}</p>}
            {tagEditorOpen && (
              <form onSubmit={addCustomTag} style={{ display: "flex", gap: 8, padding: "10px 15px 0" }}>
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  autoFocus
                  placeholder="标签名"
                  style={{ flex: 1, minWidth: 0, height: 30, border: "0.5px solid rgba(210,200,195,0.75)", borderRadius: 12, background: "rgba(255,255,255,0.58)", padding: "0 10px", outline: "none", fontSize: 12, color: "#5c5550", fontFamily: F.serifCn }}
                />
                <button type="submit" style={{ ...amberAddButtonStyle, borderRadius: 10 }}>保存</button>
              </form>
            )}
            {customTags.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 15px 14px" }}>
                {customTags.map((tag) => (
                  <span key={tag.id} style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(167,142,199,.1)", border: "0.5px solid rgba(167,142,199,.22)", color: "rgba(92,85,80,.82)", fontSize: 11 }}>{tag.name}{Number(tag.count || 0) ? ` · ${tag.count}` : ""}</span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, padding: "10px 15px 14px", color: "rgba(180,170,165,0.72)", fontSize: 13 }}>还没有标签，建一个吧</p>
            )}
          </AmberModule>
          {(() => {
            const catMap = new Map(stats.categories.map((c) => [c.name, c.count]));
            const presetRows = PRESET_TAGS.map((t) => ({ name: t.key, color: t.color, count: catMap.get(t.key) || 0 }));
            const customRows = customTags.map((t) => ({ name: t.name, color: t.color || "#b5b5b5", count: Number(t.count || 0) }));
            const allRows = [...presetRows, ...customRows];
            const maxCount = Math.max(...allRows.map((r) => r.count), 1);
            const rowStyle = (empty) => ({ display: "flex", alignItems: "center", gap: 8, opacity: empty ? 0.38 : 1 });
            const nameStyle = { width: 64, fontSize: 12, color: "rgba(80,58,105,.72)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" };
            const trackStyle = { flex: 1, height: 7, background: "rgba(200,170,210,.15)", borderRadius: 4, overflow: "hidden" };
            const countStyle = { width: 24, fontSize: 11, color: "rgba(120,92,148,.55)", flexShrink: 0, textAlign: "right" };
            return (
              <AmberModule title="标签统计" badge={PRESET_TAGS.length + customTags.length}>
                <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                  {presetRows.map((r) => (
                    <div key={r.name} style={rowStyle(r.count === 0)}>
                      <span style={nameStyle}>{r.name}</span>
                      <div style={trackStyle}>
                        <div style={{ height: "100%", borderRadius: 4, opacity: 0.72, width: `${Math.max(r.count > 0 ? 3 : 0, Math.round((r.count / maxCount) * 100))}%`, background: r.color, transition: "width .4s ease" }} />
                      </div>
                      <span style={countStyle}>{r.count || ""}</span>
                    </div>
                  ))}
                  {customRows.length > 0 && (
                    <>
                      <div style={{ height: 1, background: "rgba(200,170,210,.15)", margin: "0" }} />
                      {customRows.map((r) => (
                        <div key={r.name} style={rowStyle(r.count === 0)}>
                          <span style={nameStyle}>{r.name}</span>
                          <div style={trackStyle}>
                            <div style={{ height: "100%", borderRadius: 4, opacity: 0.72, width: `${Math.max(r.count > 0 ? 3 : 0, Math.round((r.count / maxCount) * 100))}%`, background: r.color, transition: "width .4s ease" }} />
                          </div>
                          <span style={countStyle}>{r.count || ""}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </AmberModule>
            );
          })()}
        </section>
      ) : (
        <section style={{ display: "flex", flexDirection: "column" }}>
          {visible.map((memory) => <AmberItem key={memory.id} memory={{ ...memory, expanded: !!expanded[memory.id] }} savingVisibility={savingVisibilityId === memory.id} onVisibilityChange={updateMemoryVisibility} onToggle={() => setExpanded((current) => ({ ...current, [memory.id]: !current[memory.id] }))} />)}
          {!visible.length && <p style={{ textAlign: "center", color: "rgba(180,170,165,0.6)", fontSize: 13, letterSpacing: "0.1em", padding: "40px 0" }}>空空如也</p>}
        </section>
      )}
    </div>
  );
}

function normalizeAmberMemory(memory, index) {
  const raw = String(memory.raw_content || memory.content || memory.compressed_content || "");
  const body = raw.split(/\r?\n/).filter(Boolean);
  const created = String(memory.created_at || memory.updated_at || memory.last_touched_at || "");
  const date = created ? new Date(created) : null;
  const rawType = String(memory.category || memory.level || "recent_pending").trim().toLowerCase();
  const type = MEMORY_CATEGORY_LABELS[rawType] || rawType || "Recent";
  return {
    id: String(memory.id || index),
    person: String(memory.agent_id || memory.person || "all"),
    agent_id: String(memory.agent_id || memory.person || "System"),
    type,
    level: type,
    visibility: String(memory.visibility || "private"),
    tag: memory.visibility || "private",
    dateISO: date && !Number.isNaN(date.getTime()) ? date.toISOString() : "",
    date: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric" }) : "",
    summary: memory.compressed_content || memory.title || body[0] || raw.slice(0, 60),
    body: body.length ? body : [raw],
    importance: Number(memory.importance || 0),
    temperature: Number(memory.temperature || 0),
    touch_count: Number(memory.touch_count || 0),
    tags: String(memory.tags || memory.category || "").split(/[\s,，;；|/]+/).map((tag) => tag.trim()).filter(Boolean),
  };
}

function constellationScore(center, candidate) {
  if (center.id === candidate.id) return 0;
  let score = 0;
  if (center.person && center.person === candidate.person) score += 2;
  if (center.type === candidate.type) score += 2;
  const sharedTags = center.tags.filter((tag) => tag && candidate.tags.includes(tag));
  score += Math.min(sharedTags.length, 2) * 3;
  const centerWords = String(center.summary || "").match(/[一-鿿]{2,}|[a-zA-Z]{3,}/g) || [];
  const candidateText = String(candidate.summary || "").toLowerCase();
  score += Math.min(centerWords.filter((word) => candidateText.includes(word.toLowerCase())).length, 2) * 2;
  return score;
}

function constellationColor(memory) {
  const colors = { Core: "#bd7a87", Deep: "#7e91af", Recent: "#8aa486", Ephemeral: "#c89c6a" };
  return colors[memory.type] || "#a387b7";
}

const CONSTELLATION_SLOTS = [[12, 19], [31, 12], [54, 16], [76, 12], [89, 31], [82, 57], [71, 81], [49, 85], [27, 78], [10, 59], [19, 40], [49, 48], [65, 61], [39, 63]];

function DraftMemoryConstellation({ memories, agentNames, selectedId, onSelect }) {
  const nodes = [...memories]
    .sort((a, b) => (b.importance - a.importance) || (b.temperature - a.temperature) || (b.touch_count - a.touch_count) || new Date(b.dateISO || 0) - new Date(a.dateISO || 0))
    .slice(0, CONSTELLATION_SLOTS.length);
  const focus = nodes.find((memory) => memory.id === selectedId) || null;
  if (!nodes.length) return <div style={{ position: "relative", minHeight: 360, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 18, border: "1px solid rgba(218,228,255,.14)", color: "rgba(224,231,250,.58)", background: "radial-gradient(circle at 55% 62%, rgba(74,94,174,.32), transparent 29%), radial-gradient(circle at 16% 18%, rgba(195,171,255,.15), transparent 25%), #080a1d", fontSize: 13, letterSpacing: "0.12em" }}><div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: .84, backgroundImage: "radial-gradient(circle at 9% 21%, #fff 0 1px, transparent 1.7px), radial-gradient(circle at 17% 72%, rgba(201,216,255,.9) 0 1px, transparent 1.7px), radial-gradient(circle at 31% 36%, rgba(255,239,199,.94) 0 1.3px, transparent 2px), radial-gradient(circle at 47% 17%, #fff 0 1px, transparent 1.7px), radial-gradient(circle at 61% 48%, rgba(201,216,255,.95) 0 1px, transparent 1.7px), radial-gradient(circle at 76% 26%, #fff 0 1px, transparent 1.8px), radial-gradient(circle at 88% 73%, rgba(255,239,199,.85) 0 1px, transparent 1.8px), radial-gradient(circle at 94% 12%, #fff 0 1px, transparent 1.7px)" }} /><span style={{ position: "relative", zIndex: 1, padding: "12px 18px", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, background: "rgba(7,9,28,.46)", backdropFilter: "blur(8px)" }}>还没有可连成星图的记忆</span></div>;

  const positions = new Map(nodes.map((memory, index) => [memory.id, CONSTELLATION_SLOTS[index]]));
  const edges = [];
  nodes.forEach((left, index) => nodes.slice(index + 1).forEach((right) => {
    const score = constellationScore(left, right);
    if (score >= 3) edges.push({ left, right, score });
  }));
  const neighbors = focus ? edges.filter((edge) => edge.left.id === focus.id || edge.right.id === focus.id).map((edge) => edge.left.id === focus.id ? edge.right : edge.left) : [];

  return (
    <section style={{ position: "relative", minHeight: 446, overflow: "hidden", borderRadius: 18, border: "1px solid rgba(218,228,255,.16)", background: "radial-gradient(circle at 50% 57%, rgba(61,80,148,.38), transparent 28%), radial-gradient(circle at 12% 94%, rgba(111,68,143,.22), transparent 34%), linear-gradient(155deg, #060817 0%, #0b102b 52%, #101230 100%)", boxShadow: "inset 0 1px rgba(255,255,255,.07), 0 24px 50px rgba(5,7,24,.36)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: .72, backgroundImage: "radial-gradient(circle at 8% 18%, rgba(255,255,255,.84) 0 1px, transparent 1.6px), radial-gradient(circle at 22% 64%, rgba(190,211,255,.75) 0 1px, transparent 1.8px), radial-gradient(circle at 42% 12%, rgba(255,255,255,.7) 0 1px, transparent 1.8px), radial-gradient(circle at 67% 27%, rgba(245,225,186,.68) 0 1px, transparent 1.7px), radial-gradient(circle at 84% 75%, rgba(197,215,255,.7) 0 1px, transparent 1.8px), radial-gradient(circle at 95% 11%, rgba(255,255,255,.7) 0 1px, transparent 1.6px)" }} />
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "17px 18px 0", color: "rgba(226,232,249,.66)", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: 10, letterSpacing: ".1em" }}>
        <span>MEMORY CONSTELLATION</span>
        <span>{nodes.length} NODES · {edges.length} LINKS</span>
      </div>
      {focus && <button type="button" onClick={() => onSelect("")} style={{ position: "absolute", zIndex: 4, top: 38, right: 18, minHeight: 32, padding: "0 10px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 999, background: "rgba(9,12,31,.62)", color: "rgba(244,235,220,.82)", fontFamily: F.serifEn, fontSize: 10, letterSpacing: ".12em", cursor: "pointer" }}>CLEAR FOCUS</button>}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {edges.map((edge) => {
          const [x1, y1] = positions.get(edge.left.id);
          const [x2, y2] = positions.get(edge.right.id);
          const active = focus && (edge.left.id === focus.id || edge.right.id === focus.id);
          return <line key={`${edge.left.id}-${edge.right.id}`} x1={x1} y1={12 + y1 * .72} x2={x2} y2={12 + y2 * .72} stroke={active ? "#e8c891" : "#aab7e8"} strokeOpacity={active ? .92 : .24} strokeWidth={active ? 1.05 : .42} />;
        })}
      </svg>
      {nodes.map((memory) => {
        const [left, top] = positions.get(memory.id);
        const active = focus?.id === memory.id;
        const adjacent = focus && neighbors.some((neighbor) => neighbor.id === memory.id);
        const radius = Math.max(9, Math.min(17, 8 + Math.sqrt(Math.max(memory.importance, memory.temperature, 1)) * 1.75));
        const color = constellationColor(memory);
        return <button key={memory.id} type="button" onClick={() => onSelect(active ? "" : memory.id)} title={memory.summary} aria-label={`聚焦记忆：${memory.summary}`} style={{ position: "absolute", zIndex: 3, left: `${left}%`, top: `${12 + top * .72}%`, width: radius * 2, height: radius * 2, transform: "translate(-50%, -50%)", borderRadius: "50%", border: active ? "1px solid #fff4d2" : `1px solid ${color}`, background: active ? "#f3c76d" : color, boxShadow: active ? "0 0 0 6px rgba(243,199,109,.2), 0 0 24px rgba(255,212,133,.94)" : adjacent ? `0 0 20px ${color}` : `0 0 13px ${color}AA`, opacity: !focus || active || adjacent ? 1 : .22, cursor: "pointer", padding: 0, transition: "opacity .2s ease, box-shadow .2s ease, transform .2s ease" }} />;
      })}
      {focus && (() => {
        const [left, top] = positions.get(focus.id);
        return <div style={{ position: "absolute", zIndex: 3, left: `${left}%`, top: `${17 + top * .72}%`, transform: "translateX(-50%)", width: 156, pointerEvents: "none", textAlign: "center", color: "rgba(246,241,232,.92)", fontFamily: F.serifCn, fontSize: 11, lineHeight: 1.55, textShadow: "0 2px 8px #060817" }}>{focus.summary.length > 28 ? `${focus.summary.slice(0, 28)}…` : focus.summary}</div>;
      })()}
      <div style={{ position: "absolute", zIndex: 3, left: 14, right: 14, bottom: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, background: "rgba(4,7,23,.58)", backdropFilter: "blur(12px)", color: "rgba(226,232,249,.76)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: focus ? 5 : 0, fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: 9, letterSpacing: ".11em" }}><span style={{ color: "#f3c76d" }}>●</span>{focus ? `FOCUS · ${agentNames.get(focus.person) || focus.agent_id} · ${focus.type} · ${neighbors.length} LINKS` : "SELECT A STAR TO TRACE ITS MEMORY"}</div>
        {focus && <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(246,241,232,.92)" }}>{focus.summary}</div>}
      </div>
    </section>
  );
}

function sourceMemoryMapWords(memory) {
  return Array.isArray(memory.tags)
    ? memory.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
    : String(memory.tags || memory.type || "").toLowerCase().split(/[\s,，;；|/]+/).map((tag) => tag.trim()).filter(Boolean);
}

function sourceMemoryMapEdges(entries) {
  const edges = [];
  entries.forEach((left, leftIndex) => entries.slice(leftIndex + 1).forEach((right, offset) => {
    const rightIndex = leftIndex + offset + 1;
    const shared = sourceMemoryMapWords(left).filter((word) => sourceMemoryMapWords(right).includes(word));
    if (shared.length || left.type === right.type) edges.push({ leftIndex, rightIndex, strength: Math.min(3, shared.length + 1) });
  }));
  return edges.slice(0, 42);
}

function sourceMemoryMapPoint(index, total) {
  const angle = (Math.PI * 2 * index / Math.max(total, 1)) - Math.PI / 2;
  const ring = index < 7 ? 30 : 41;
  return { x: 50 + Math.cos(angle) * ring, y: 50 + Math.sin(angle) * ring };
}

function sourceMemoryMapColor(memory) {
  const colors = { Core: "#bd7a87", Deep: "#7e91af", Recent: "#8aa486", Ephemeral: "#c89c6a" };
  return colors[memory.type] || "#a387b7";
}

function LegacySourceMemoryMapConstellation({ memories, agentNames, selectedId, onSelect }) {
  const nodes = [...memories]
    .sort((a, b) => (b.importance - a.importance) || (b.temperature - a.temperature) || (b.touch_count - a.touch_count) || new Date(b.dateISO || 0) - new Date(a.dateISO || 0))
    .slice(0, 14);
  const selected = nodes.find((memory) => memory.id === selectedId) || nodes[0] || null;
  const points = nodes.map((_, index) => sourceMemoryMapPoint(index, nodes.length));
  const edges = sourceMemoryMapEdges(nodes);

  if (!nodes.length) return <div className="memory-map" style={{ minHeight: 330, display: "grid", placeItems: "center", borderRadius: 16, border: "1px solid rgba(218,228,255,.16)", color: "rgba(224,231,250,.6)", background: "radial-gradient(circle at 54% 65%, rgba(74,94,174,.32), transparent 30%), #080a1d", fontSize: 13 }}>还没有能连成星图的记忆。</div>;

  return (
    <section>
      <div className="memory-map" role="region" aria-label="记忆星图" style={{ minHeight: 386, borderRadius: 16, border: "1px solid rgba(218,228,255,.16)", background: "radial-gradient(circle at 50% 57%, rgba(61,80,148,.36), transparent 30%), linear-gradient(155deg, #060817 0%, #0b102b 52%, #101230 100%)", boxShadow: "inset 0 1px rgba(255,255,255,.07), 0 18px 38px rgba(5,7,24,.25)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: .72, backgroundImage: "radial-gradient(circle at 8% 18%, rgba(255,255,255,.84) 0 1px, transparent 1.6px), radial-gradient(circle at 22% 64%, rgba(190,211,255,.75) 0 1px, transparent 1.8px), radial-gradient(circle at 42% 12%, rgba(255,255,255,.7) 0 1px, transparent 1.8px), radial-gradient(circle at 67% 27%, rgba(245,225,186,.68) 0 1px, transparent 1.7px), radial-gradient(circle at 84% 75%, rgba(197,215,255,.7) 0 1px, transparent 1.8px)" }} />
        <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", padding: "15px 17px", color: "rgba(226,232,249,.66)", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: 10, letterSpacing: ".1em" }}><span>MEMORY CONSTELLATION</span><span>{nodes.length} NODES · {edges.length} LINKS</span></div>
        <svg className="memory-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge) => <line key={`${edge.leftIndex}-${edge.rightIndex}`} x1={points[edge.leftIndex].x} y1={points[edge.leftIndex].y} x2={points[edge.rightIndex].x} y2={points[edge.rightIndex].y} className={`memory-map-line strength-${edge.strength}`} style={{ stroke: "#aab7e8", strokeOpacity: edge.leftIndex === nodes.indexOf(selected) || edge.rightIndex === nodes.indexOf(selected) ? .85 : .27 }} />)}
        </svg>
        {nodes.map((memory, index) => {
          const point = points[index];
          const active = memory.id === selected?.id;
          const color = sourceMemoryMapColor(memory);
          const size = Math.max(29, Math.min(48, 25 + memory.importance * 4 + memory.temperature * .12));
          return <button key={memory.id} type="button" className={`memory-map-node${active ? " active" : ""}`} onClick={() => onSelect(memory.id)} title={memory.summary} style={{ "--node-x": `${point.x}%`, "--node-y": `${point.y}%`, "--node-size": `${size}px`, "--node-color": color, zIndex: 3, color: active ? "#11152a" : "rgba(244,247,255,.9)", background: active ? "#f3c76d" : `${color}99`, borderColor: active ? "#fff4d2" : color, boxShadow: active ? "0 0 0 5px rgba(243,199,109,.2), 0 0 24px rgba(255,212,133,.78)" : `0 0 13px ${color}99` }}><span>{memory.summary.slice(0, 14)}</span></button>;
        })}
      </div>
      {selected && <div className="memory-map-detail" style={{ padding: "12px 2px 0", color: "rgba(75,65,61,.9)" }}>
        <div><strong>{selected.summary}</strong><em>{agentNames.get(selected.person) || selected.agent_id} · {selected.type} · 热度 {selected.temperature || 0}</em></div>
        <button type="button" onClick={() => onSelect("")} style={{ minHeight: 36, padding: "0 11px", border: "1px solid rgba(136,120,148,.22)", borderRadius: 9, background: "rgba(255,255,255,.48)", color: "#756a75", cursor: "pointer", fontSize: 11 }}>取消聚焦</button>
      </div>}
    </section>
  );
}

function MemoryConstellation({ memories, selectedId, onSelect }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const layoutRef = useRef({ positions: new Map(), rotation: 0, hoverId: null, width: 0, height: 0 });
  const graph = useMemo(() => {
    const items = [...memories]
      .sort((a, b) => (b.importance - a.importance) || (b.temperature - a.temperature) || (b.touch_count - a.touch_count) || new Date(b.dateISO || 0) - new Date(a.dateISO || 0))
      .slice(0, 30);
    const nodes = items.map((memory) => ({ id: memory.id, label: memory.summary, freq: Math.max(1, memory.importance + memory.temperature / 25 + memory.touch_count / 4), anchor: memory.type === "Core" }));
    const edges = sourceMemoryMapEdges(items)
      .map((edge) => ({ source: nodes[edge.leftIndex]?.id, target: nodes[edge.rightIndex]?.id, weight: edge.strength }))
      .filter((edge) => edge.source && edge.target);
    return { nodes, edges };
  }, [memories]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    const state = layoutRef.current;
    const nodes = graph.nodes;
    const edgeList = graph.edges;
    const positions = new Map();
    const redraw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      state.width = width;
      state.height = height;
      const centerX = width / 2;
      const centerY = height / 2;
      nodes.forEach((node, index) => {
        const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
        const radius = Math.min(width, height) * (0.22 + (index % 3) * 0.055);
        positions.set(node.id, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius });
      });
      for (let iteration = 0; iteration < Math.min(120, 30 + nodes.length * 2); iteration += 1) {
        nodes.forEach((left, leftIndex) => nodes.slice(leftIndex + 1).forEach((right) => {
          const a = positions.get(left.id); const b = positions.get(right.id);
          let dx = b.x - a.x; let dy = b.y - a.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const force = 1400 / (distance * distance);
          dx = (dx / distance) * force; dy = (dy / distance) * force;
          a.x -= dx; a.y -= dy; b.x += dx; b.y += dy;
        }));
        edgeList.forEach((edge) => {
          const a = positions.get(edge.source); const b = positions.get(edge.target);
          if (!a || !b) return;
          let dx = b.x - a.x; let dy = b.y - a.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const force = (distance - (nodes.length < 20 ? 130 : 100)) * 0.014 * Math.min(1, edge.weight / 4);
          dx = (dx / distance) * force; dy = (dy / distance) * force;
          a.x += dx; a.y += dy; b.x -= dx; b.y -= dy;
        });
        nodes.forEach((node) => { const point = positions.get(node.id); point.x += (centerX - point.x) * 0.006; point.y += (centerY - point.y) * 0.006; });
      }
      state.positions = positions;
    };
    redraw();
    const resizeObserver = new ResizeObserver(redraw);
    resizeObserver.observe(canvas);
    const startedAt = performance.now();
    const render = (now) => {
      const { width, height } = state;
      const time = (now - startedAt) / 1000;
      const focusId = selectedId || null;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ebe6d9";
      context.fillRect(0, 0, width, height);
      context.beginPath();
      for (let x = 26; x < width; x += 26) { if (Math.round(x / 26) % 5) { context.moveTo(x, 0); context.lineTo(x, height); } }
      for (let y = 26; y < height; y += 26) { if (Math.round(y / 26) % 5) { context.moveTo(0, y); context.lineTo(width, y); } }
      context.strokeStyle = "rgba(140,132,112,.13)"; context.lineWidth = .5; context.stroke();
      context.beginPath();
      for (let x = 0; x <= width; x += 130) { context.moveTo(x, 0); context.lineTo(x, height); }
      for (let y = 0; y <= height; y += 130) { context.moveTo(0, y); context.lineTo(width, y); }
      context.strokeStyle = "rgba(120,112,92,.22)"; context.lineWidth = .8; context.stroke();
      if (!nodes.length) { context.fillStyle = "rgba(90,82,62,.45)"; context.font = "14px ui-monospace, monospace"; context.textAlign = "center"; context.fillText("还没有可连接的记忆", width / 2, height / 2); animationRef.current = requestAnimationFrame(render); return; }
      state.rotation += .00012;
      const centerX = width / 2; const centerY = height / 2;
      context.save(); context.translate(centerX, centerY); context.rotate(state.rotation); context.translate(-centerX, -centerY);
      edgeList.forEach((edge) => {
        const a = state.positions.get(edge.source); const b = state.positions.get(edge.target);
        if (!a || !b) return;
        const strength = edge.source === focusId || edge.target === focusId ? .45 : Math.min(.22, .05 + .045 * edge.weight);
        const gradient = context.createLinearGradient(a.x, a.y, b.x, b.y);
        gradient.addColorStop(0, `rgba(100,88,60,${strength})`); gradient.addColorStop(.5, `rgba(100,88,60,${strength * .15})`); gradient.addColorStop(1, `rgba(100,88,60,${strength})`);
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.strokeStyle = gradient; context.lineWidth = edge.source === focusId || edge.target === focusId ? 1.2 : .7; context.stroke();
      });
      nodes.forEach((node, index) => {
        const point = state.positions.get(node.id); if (!point) return;
        const pulse = Math.sin(time * (.3 + (index % 6) * .1) * Math.PI * 2 + index * 1.7);
        const isFocus = node.id === focusId; const isHover = node.id === state.hoverId; const lit = isFocus || node.anchor || isHover;
        const baseRadius = Math.max(1.8, Math.min(6, 1.4 + Math.sqrt(node.freq) * 1.2)); const radius = (isFocus ? baseRadius * 1.4 : isHover ? baseRadius * 1.2 : baseRadius) * (1 + .1 * pulse);
        const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius + (lit ? 11 : 6));
        glow.addColorStop(0, `rgba(180,138,40,${lit ? .25 : .08})`); glow.addColorStop(1, "rgba(180,138,40,0)");
        context.beginPath(); context.arc(point.x, point.y, radius + (lit ? 11 : 6), 0, Math.PI * 2); context.fillStyle = glow; context.fill();
        if (isFocus || node.anchor) { context.beginPath(); context.arc(point.x, point.y, radius + (isFocus ? 8 : 5), 0, Math.PI * 2); context.strokeStyle = "rgba(180,138,40,.55)"; context.lineWidth = isFocus ? 1.4 : 1; context.stroke(); }
        context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fillStyle = lit ? "rgba(180,138,40,.94)" : "rgba(72,65,50,.62)"; context.fill();
        if (isFocus) { context.save(); context.translate(point.x, point.y + radius + 16); context.rotate(-state.rotation); context.fillStyle = "rgba(160,120,30,.95)"; context.font = "bold 11px ui-monospace, monospace"; context.textAlign = "center"; context.textBaseline = "top"; context.fillText(node.label.slice(0, 14), 0, 0); context.restore(); }
      });
      context.restore();
      context.fillStyle = focusId ? "rgba(170,128,35,.8)" : "rgba(90,80,55,.38)"; context.font = "11px ui-monospace, monospace"; context.textAlign = "center"; context.textBaseline = "alphabetic";
      context.fillText(focusId ? `FOCUS · ${nodes.length} NODES · 点击焦点返回全局` : `TOP ${nodes.length} NODES · 点击节点展开关联`, width / 2, 22);
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animationRef.current); resizeObserver.disconnect(); };
  }, [graph, selectedId]);

  const locateNode = (event) => {
    const canvas = canvasRef.current; const state = layoutRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;
    const centerX = state.width / 2; const centerY = state.height / 2; const cosine = Math.cos(-state.rotation); const sine = Math.sin(-state.rotation);
    const x = centerX + (mouseX - centerX) * cosine - (mouseY - centerY) * sine; const y = centerY + (mouseX - centerX) * sine + (mouseY - centerY) * cosine;
    const hit = graph.nodes.find((node) => { const point = state.positions.get(node.id); return point && Math.hypot(x - point.x, y - point.y) < Math.max(9, Math.sqrt(node.freq) * 2.5 + 5); });
    onSelect(hit ? (hit.id === selectedId ? "" : hit.id) : selectedId);
  };

  return <section style={{ position: "relative" }}><canvas ref={canvasRef} role="img" aria-label="记忆网络星图" onClick={locateNode} style={{ display: "block", width: "100%", height: 390, borderRadius: 16, cursor: "pointer", boxShadow: "inset 6px 6px 16px rgba(80,78,58,.30), inset -5px -5px 12px rgba(255,255,255,.30), 0 0 0 8px rgba(255,255,255,.45), 10px 10px 26px rgba(80,70,58,.16)" }} /><div style={{ marginTop: 18, padding: "9px 14px", borderRadius: 10, background: "#ebe6d9", color: "rgba(90,82,62,.65)", fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: ".04em" }}>SYSTEM READY · 点击星点展开关联记忆</div></section>;
}

function buildAmberStats(memories) {
  const byPerson = new Map();
  const byCategory = new Map();
  memories.forEach((memory) => {
    byPerson.set(memory.person, (byPerson.get(memory.person) || 0) + 1);
    byCategory.set(memory.type, (byCategory.get(memory.type) || 0) + 1);
  });
  return {
    total: memories.length,
    people: [...byPerson.entries()].map(([id, count]) => ({ id, name: id === "all" ? "System" : id, count })),
    categories: [...byCategory.entries()].map(([name, count]) => ({ name, count })),
  };
}

function nextPersonId(people, currentId) {
  const index = people.findIndex((person) => person.id === currentId);
  return people[(index + 1) % people.length]?.id || "all";
}

function amberSortStyle(active) {
  return { border: 0, background: active ? "#fff" : "transparent", color: active ? "#5c5550" : "rgba(140,130,125,0.7)", padding: "4px 10px", fontSize: 11, borderRadius: 999, cursor: "pointer", letterSpacing: "0.05em", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none", fontWeight: active ? 500 : 400 };
}

function amberTabStyle(active) {
  return { whiteSpace: "nowrap", padding: "4px 14px", borderRadius: 999, border: `0.5px solid ${active ? "#5c5550" : "rgba(210,200,195,0.8)"}`, background: active ? "rgba(255,255,255,0.4)" : "transparent", color: active ? "#5c5550" : "rgba(150,140,135,0.8)", fontSize: 11, letterSpacing: "0.05em", cursor: "pointer" };
}
function AmberItem({ memory, onToggle, onVisibilityChange, savingVisibility = false }) {
  const importance = memory.importance ? Math.min(5, Math.max(1, Math.round(memory.importance))) : 0;
  const stars = importance ? "✦".repeat(importance) + "✧".repeat(5 - importance) : "";
  const dateShort = (memory.date || "").replace(/年|月/g, ".").replace("日", "");
  return (
    <article style={{ position: "relative", borderTop: "0.5px solid rgba(225,218,212,0.8)", padding: "14px 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ height: 16, padding: "0 6px", borderRadius: 4, border: "0.5px solid rgba(200,190,185,0.5)", fontSize: 9, color: "rgba(150,140,135,0.9)", letterSpacing: "0.08em" }}>{memory.tag}</span>
          <span style={{ height: 16, padding: "0 6px", borderRadius: 4, border: "0.5px solid rgba(180,160,150,0.4)", background: "rgba(245,240,238,0.5)", fontSize: 8, fontWeight: 600, color: "rgba(130,120,115,0.9)", letterSpacing: "0.1em" }}>{memory.level.toUpperCase()}</span>
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 10, color: "rgba(180,170,165,0.8)" }}>{dateShort}</span>
        </div>
        <span style={{ padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,0.42)", border: "0.5px solid rgba(212,202,196,0.72)", fontSize: 9, color: "rgba(92,85,80,0.88)" }}>@{memory.agentName || memory.agent_id}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {memory.temperature ? <span style={{ height: 18, padding: "0 8px", borderRadius: 999, background: "rgba(250,245,240,0.8)", border: "0.5px solid rgba(220,210,205,0.6)", fontSize: 10, color: "rgba(120,110,105,0.85)" }}>{memory.temperature}°</span> : null}
        {stars ? <span style={{ fontSize: 11, letterSpacing: 2, color: "#d6b882" }}>{stars}</span> : null}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.62, color: memory.expanded ? "#3b3633" : "#4a4440", overflow: "hidden", display: memory.expanded ? "block" : "-webkit-box", WebkitLineClamp: memory.expanded ? "unset" : 2, WebkitBoxOrient: "vertical" }}>
        {memory.summary}
        {!memory.expanded && <span style={{ marginLeft: 6, color: "#d6b882", fontSize: 11, opacity: 0.9, letterSpacing: 2 }}>✧ ₊⁺</span>}
      </div>
      {memory.expanded && <div style={{ animation: "amberFadeIn 0.4s ease forwards" }}><div style={{ width: 24, height: 0.5, background: "rgba(200,190,185,0.6)", margin: "10px 0" }} />{memory.body.map((line, index) => <p key={index} style={{ margin: "0 0 8px", fontSize: 12, lineHeight: 1.58, color: "#635b56", fontWeight: 300 }}>{line}</p>)}<div style={{ textAlign: "center", marginTop: 16, color: "#d6b882", fontSize: 12, opacity: 0.7, letterSpacing: 4 }}>✧ ₊⁺ ✦ ⁺₊ ✧</div></div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {MEMORY_VISIBILITY_OPTIONS.filter((value) => value !== "all").map((value) => (
          <button
            key={value}
            type="button"
            disabled={savingVisibility}
            onClick={() => onVisibilityChange?.(memory, value)}
            style={{ border: `0.5px solid ${memory.visibility === value ? "#5c5550" : "rgba(210,200,195,0.8)"}`, borderRadius: 999, background: memory.visibility === value ? "rgba(255,255,255,0.55)" : "transparent", color: memory.visibility === value ? "#5c5550" : "rgba(150,140,135,0.82)", padding: "3px 9px", fontSize: 10, letterSpacing: "0.04em", cursor: savingVisibility ? "wait" : "pointer", opacity: savingVisibility ? 0.58 : 1 }}
          >
            {value}
          </button>
        ))}
      </div>
      <button onClick={onToggle} style={{ display: "block", marginTop: 10, border: 0, background: "transparent", color: "rgba(170,160,155,0.8)", fontSize: 10, letterSpacing: "0.08em", padding: 0, cursor: "pointer" }}>{memory.expanded ? "- 收起" : "+ 展开原文"}</button>
    </article>
  );
}

function AmberModule({ title, badge, action, children }) {
  return (
    <div style={{ margin: "10px 14px 0", background: "rgba(255,255,255,.52)", borderRadius: 18, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(200,165,215,.1), 0 2px 10px rgba(160,130,180,.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 15px 8px", borderBottom: "1px solid rgba(200,170,210,.1)" }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(110,82,130,.6)" }}>{title}</span>
        {action || <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(167,142,199,.9)", background: "rgba(167,142,199,.12)", borderRadius: 20, padding: "1px 9px" }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

const amberRowStyle = { display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "0.5px solid rgba(225,218,212,0.8)", fontSize: 12, color: "rgba(92,85,80,0.88)" };
const amberLinkRowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "9px 15px", borderBottom: "1px solid rgba(200,170,210,.07)" };
const amberAvatarStyle = { width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, rgba(167,142,199,.5), rgba(200,165,210,.4))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "rgba(90,65,115,.85)", flexShrink: 0 };
const amberEmptyTextStyle = { padding: "36px 20px", textAlign: "center", fontSize: 13, color: "rgba(140,110,160,.45)" };
const amberAddButtonStyle = { fontSize: 12, fontWeight: 600, color: "rgba(140,110,160,.85)", background: "rgba(167,142,199,.12)", border: "none", borderRadius: 12, padding: "3px 10px", cursor: "pointer" };

function AmberStatsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}

function AmberListIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><rect x="3" y="3" width="18" height="4" rx="1.5" /><rect x="3" y="10" width="18" height="4" rx="1.5" /><rect x="3" y="17" width="18" height="4" rx="1.5" /></svg>;
}

function DiaryTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 24, height: 24, display: "block" }}>
      <rect x="5.25" y="4.95" width="13.5" height="14.2" rx="4" fill="rgba(255,255,255,0.72)" stroke="currentColor" strokeWidth="1.15" />
      <path d="M9.1 8.5h5.85" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" />
      <path d="M9.1 11.2h4.75" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" opacity="0.8" />
      <path d="M15.95 5.9v4.95" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" />
      <path d="M15.95 6.25 13.6 6.95v3.75" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13.25" cy="11.45" r="0.92" fill="currentColor" />
      <path d="M7.25 17.15c.9-.72 1.55-1.12 2.65-1.55" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.72" />
      <path d="M17.1 16.25 17.85 17.05" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.72" />
      <circle cx="17.1" cy="16.25" r="1.45" fill="rgba(255,255,255,0.84)" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  );
}

function MemoryTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 24, height: 24, display: "block" }}>
      <path d="M12 4.75c.78 1.84 1.74 2.97 3.1 3.73 1.1.61 2.35.9 4.15 1-.63.18-1.08.32-1.68.58-2.5 1.06-3.97 2.65-5.02 5.56-.25.69-.34 1-.55 1.88-.18-.73-.27-1.03-.48-1.65-1.03-2.95-2.5-4.57-5-5.73-.65-.3-1.14-.47-1.86-.64 1.82-.11 3.08-.42 4.2-1.06 1.3-.76 2.2-1.86 2.98-3.67Z" fill="currentColor" />
      <circle cx="17.45" cy="17.4" r="2.1" fill="rgba(255,255,255,0.84)" stroke="currentColor" strokeWidth="0.9" />
      <path d="M16.4 17.4h2.1" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round" />
      <path d="M17.45 16.35v2.1" stroke="currentColor" strokeWidth="0.95" strokeLinecap="round" />
    </svg>
  );
}

function BottomTabs({ tab, onChange }) {
  const item = (id, icon, label) => (
    <button onClick={() => onChange(id)} style={{ width: "100%", maxWidth: 76, minWidth: 64, border: 0, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === id ? "rgba(75,58,68,.96)" : "rgba(130,110,122,.55)", fontWeight: tab === id ? 700 : 400 }}>
      <span style={{ width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
      <span style={{ fontSize: 10, letterSpacing: ".06em" }}>{label}</span>
    </button>
  );
  return (
    <nav style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30, display: "flex", justifyContent: "space-between", padding: "10px 20px calc(env(safe-area-inset-bottom) + 10px)", background: "rgba(255,255,255,.82)", borderTop: "1px solid rgba(232,218,230,.7)", backdropFilter: "blur(20px) saturate(1.2)" }}>
      <div style={{ flex: "1 1 0", display: "flex", justifyContent: "center" }}>{item("diary", <DiaryTabIcon />, "日记")}</div>
      <div style={{ flex: "1 1 0", display: "flex", justifyContent: "center" }}>{item("memory", <MemoryTabIcon />, "记忆")}</div>
    </nav>
  );
}
