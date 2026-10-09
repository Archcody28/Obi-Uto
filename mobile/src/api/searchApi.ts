import { api } from "./client";

// PHASE 27 — unified search: GET /api/media/search?q=... returns
// { query, results, creatorCount, externalCount, externalUnavailable }.
// This helper normalizes BOTH the new object contract and the legacy
// bare-array shape (older backend) into the unified object so callers
// always get the same fields. Single request — no duplicate provider calls.
export const searchMedia = async (
  query: string
) => {
  const response = await api.get(
    `/media/search`,
    { params: { q: query } }
  );

  const data: any = response.data;
  if (Array.isArray(data)) {
    return {
      query,
      results: data,
      creatorCount: data.length,
      externalCount: 0,
      externalUnavailable: false,
    };
  }
  return {
    query: data?.query ?? query,
    results: Array.isArray(data?.results) ? data.results : [],
    creatorCount: data?.creatorCount ?? 0,
    externalCount: data?.externalCount ?? 0,
    externalUnavailable: !!data?.externalUnavailable,
  };
};