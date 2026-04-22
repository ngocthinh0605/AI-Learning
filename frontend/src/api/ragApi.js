import apiClient from "./client";

/** POST /api/v1/rag/retrieve */
export async function retrieveRagContext(query, { topK = 5, kinds = null } = {}) {
  const payload = { query, top_k: topK };
  if (kinds != null) payload.kinds = kinds;
  const { data } = await apiClient.post("/rag/retrieve", payload);
  return data;
}

/** POST /api/v1/rag/ingest */
export async function ingestKnowledgeDocument({ kind, title, body, source, metadata }) {
  const { data } = await apiClient.post("/rag/ingest", {
    kind,
    title,
    body,
    source,
    metadata: metadata || {},
  });
  return data;
}
