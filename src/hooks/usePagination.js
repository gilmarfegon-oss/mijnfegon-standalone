import { useState } from "react";

/**
 * Generic pagination hook.
 * @param {Array} items - Full list to paginate.
 * @param {number} itemsPerPage - Number of items per page.
 * @returns {{ page, setPage, safePage, totalPages, pageItems }}
 */
export function usePagination(items, itemsPerPage) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

  return { page: safePage, setPage, totalPages, pageItems };
}
