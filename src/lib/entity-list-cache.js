/** @typedef {import('@tanstack/react-query').QueryClient} QueryClient */

export function getFetchAllKey(baseKey) {
  return [...baseKey, { fetchAll: true }];
}

/** @param {QueryClient} queryClient */
export function snapshotEntityCaches(queryClient, baseKey) {
  return {
    fetchAll: queryClient.getQueryData(getFetchAllKey(baseKey)),
    paginated: queryClient.getQueryData(baseKey),
  };
}

/** @param {QueryClient} queryClient */
export function restoreEntityCaches(queryClient, baseKey, snapshot) {
  if (!snapshot) return;
  queryClient.setQueryData(getFetchAllKey(baseKey), snapshot.fetchAll);
  queryClient.setQueryData(baseKey, snapshot.paginated);
}

/** @param {QueryClient} queryClient */
export function prependEntityToCaches(queryClient, baseKey, entity) {
  const fetchAllKey = getFetchAllKey(baseKey);
  queryClient.setQueryData(fetchAllKey, old => {
    const list = Array.isArray(old) ? old : [];
    if (list.some(e => e.id === entity.id)) return list;
    return [entity, ...list];
  });
  queryClient.setQueryData(baseKey, old => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page, idx) =>
        idx === 0
          ? { ...page, data: [entity, ...page.data.filter(e => e.id !== entity.id)] }
          : page
      ),
    };
  });
}

/** @param {QueryClient} queryClient */
export function replaceEntityInCaches(queryClient, baseKey, tempId, entity) {
  const fetchAllKey = getFetchAllKey(baseKey);
  queryClient.setQueryData(fetchAllKey, old => {
    if (!Array.isArray(old)) return old;
    const hasTemp = old.some(e => e.id === tempId);
    if (!hasTemp) {
      return [entity, ...old.filter(e => e.id !== entity.id)];
    }
    return old.map(e => (e.id === tempId ? entity : e));
  });
  queryClient.setQueryData(baseKey, old => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map(page => ({
        ...page,
        data: page.data.map(e => (e.id === tempId ? entity : e)),
      })),
    };
  });
}

/** @param {QueryClient} queryClient */
export function patchEntityInCaches(queryClient, baseKey, id, updates) {
  const patch = { ...updates, updatedAt: new Date().toISOString() };
  const fetchAllKey = getFetchAllKey(baseKey);
  queryClient.setQueryData(fetchAllKey, old => {
    if (!Array.isArray(old)) return old;
    return old.map(e => (e.id === id ? { ...e, ...patch } : e));
  });
  queryClient.setQueryData(baseKey, old => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map(page => ({
        ...page,
        data: page.data.map(e => (e.id === id ? { ...e, ...patch } : e)),
      })),
    };
  });
}

/** @param {QueryClient} queryClient */
export function removeEntityFromCaches(queryClient, baseKey, id) {
  const fetchAllKey = getFetchAllKey(baseKey);
  queryClient.setQueryData(fetchAllKey, old => {
    if (!Array.isArray(old)) return old;
    return old.filter(e => e.id !== id);
  });
  queryClient.setQueryData(baseKey, old => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map(page => ({
        ...page,
        data: page.data.filter(e => e.id !== id),
      })),
    };
  });
}
