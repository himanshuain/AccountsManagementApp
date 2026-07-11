/** @typedef {import('@tanstack/react-query').QueryClient} QueryClient */

export function getFetchAllKey(baseKey) {
  return [...baseKey, { fetchAll: true }];
}

/** @param {"supplier"|"customer"} type @param {string} id */
export function getPersonProfileKey(type, id) {
  return ["person-profile", type, id];
}

/** @param {QueryClient} queryClient @param {"supplier"|"customer"} type @param {object} entity */
export function seedPersonProfileCache(queryClient, type, entity) {
  if (!entity?.id) return;
  queryClient.setQueryData(getPersonProfileKey(type, entity.id), entity);
}

function bootstrapPaginatedCache(entity) {
  return {
    pages: [{ data: [entity], pagination: { page: 1, hasMore: false } }],
    pageParams: [1],
  };
}

function normalizePagesWithEntity(pages, entity) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return bootstrapPaginatedCache(entity).pages;
  }

  const cleanedPages = pages.map(page => ({
    ...page,
    data: (page.data || []).filter(item => item.id !== entity.id),
  }));

  cleanedPages[0] = {
    ...cleanedPages[0],
    data: [entity, ...cleanedPages[0].data],
  };

  return cleanedPages;
}

/** @param {QueryClient} queryClient @param {string[]} baseKey @param {object} entity */
export function upsertEntityInCaches(queryClient, baseKey, entity) {
  if (!entity?.id) return;

  const fetchAllKey = getFetchAllKey(baseKey);
  queryClient.setQueryData(fetchAllKey, old => {
    const list = Array.isArray(old) ? old : [];
    return [entity, ...list.filter(e => e.id !== entity.id)];
  });

  queryClient.setQueryData(baseKey, old => {
    if (!old?.pages) {
      return bootstrapPaginatedCache(entity);
    }
    return {
      ...old,
      pages: normalizePagesWithEntity(old.pages, entity),
    };
  });
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
    return [entity, ...list.filter(e => e.id !== entity.id)];
  });
  queryClient.setQueryData(baseKey, old => {
    if (!old?.pages) {
      return bootstrapPaginatedCache(entity);
    }
    return {
      ...old,
      pages: normalizePagesWithEntity(old.pages, entity),
    };
  });
}

/** @param {QueryClient} queryClient */
export function replaceEntityInCaches(queryClient, baseKey, tempId, entity) {
  const fetchAllKey = getFetchAllKey(baseKey);
  queryClient.setQueryData(fetchAllKey, old => {
    if (!Array.isArray(old)) return old;
    return [entity, ...old.filter(e => e.id !== tempId && e.id !== entity.id)];
  });
  queryClient.setQueryData(baseKey, old => {
    if (!old?.pages) {
      return bootstrapPaginatedCache(entity);
    }
    const filteredPages = old.pages.map(page => ({
      ...page,
      data: page.data.filter(e => e.id !== tempId && e.id !== entity.id),
    }));
    return {
      ...old,
      pages: normalizePagesWithEntity(filteredPages, entity),
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
