import { apiUrl } from "./apiBase.js";

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.detail || "";
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function listFolioHighlights(bookId, chapterIndex = null) {
  const query = chapterIndex === null ? "" : `?chapter_index=${encodeURIComponent(chapterIndex)}`;
  const data = await request(`/api/folio/books/${encodeURIComponent(bookId)}/highlights${query}`);
  return Array.isArray(data.highlights) ? data.highlights : [];
}

export async function createFolioHighlight(bookId, highlight) {
  const data = await request(`/api/folio/books/${encodeURIComponent(bookId)}/highlights`, {
    method: "POST",
    body: JSON.stringify({
      chapter_index: highlight.chapterIndex,
      start_offset: highlight.startOffset,
      end_offset: highlight.endOffset,
      text: highlight.text,
      client_id: highlight.id,
    }),
  });
  return data.highlight;
}

export async function createFolioThought(highlightId, thought) {
  const data = await request(`/api/folio/highlights/${encodeURIComponent(highlightId)}/thoughts`, {
    method: "POST",
    body: JSON.stringify({ content: thought.content, client_id: thought.id }),
  });
  return data.thought;
}

export async function createFolioComment(thoughtId, comment) {
  const data = await request(`/api/folio/thoughts/${encodeURIComponent(thoughtId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: comment.content, client_id: comment.id }),
  });
  return data.comment;
}

export async function getFolioPosition(bookId) {
  const data = await request(`/api/folio/books/${encodeURIComponent(bookId)}/position`);
  return data.position || null;
}

export async function saveFolioPosition(bookId, chapterIndex, charOffset = 0) {
  const data = await request(`/api/folio/books/${encodeURIComponent(bookId)}/position`, {
    method: "PUT",
    body: JSON.stringify({ chapter_index: chapterIndex, char_offset: charOffset }),
  });
  return data.position;
}

export async function syncLocalFolioAnnotations(bookId, localHighlights = []) {
  const serverHighlights = await listFolioHighlights(bookId);
  const serverById = new Map(serverHighlights.map(highlight => [highlight.id, highlight]));

  for (const localHighlight of localHighlights || []) {
    let serverHighlight = serverById.get(localHighlight.id);
    if (!serverHighlight) {
      serverHighlight = await createFolioHighlight(bookId, localHighlight);
      serverById.set(serverHighlight.id, serverHighlight);
    }
    const thoughtsById = new Map((serverHighlight.thoughts || []).map(thought => [thought.id, thought]));
    for (const localThought of localHighlight.thoughts || []) {
      let serverThought = thoughtsById.get(localThought.id);
      if (!serverThought) {
        serverThought = await createFolioThought(serverHighlight.id, localThought);
        thoughtsById.set(serverThought.id, serverThought);
      }
      const commentsById = new Set((serverThought.comments || []).map(comment => comment.id));
      for (const localComment of localThought.comments || []) {
        if (!commentsById.has(localComment.id)) {
          await createFolioComment(serverThought.id, localComment);
          commentsById.add(localComment.id);
        }
      }
    }
  }
  return listFolioHighlights(bookId);
}
