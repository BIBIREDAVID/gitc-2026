export const DEFAULT_FILTERS = {
  search: '',
  pickup: '',
  isStudent: '',
  laptop: '',
  checkedIn: '',
  sortDir: 'desc', // by createdAt
};

export function applyFilters(registrations, filters) {
  const search = filters.search.trim().toLowerCase();

  let result = registrations.filter((r) => {
    if (search) {
      const haystack = `${r.fullName || ''} ${r.email || ''} ${r.whatsapp || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.pickup && r.pickup !== filters.pickup) return false;
    if (filters.isStudent && r.isStudent !== filters.isStudent) return false;
    if (filters.laptop && r.laptop !== filters.laptop) return false;
    if (filters.checkedIn) {
      const want = filters.checkedIn === 'yes';
      if (Boolean(r.checkedIn) !== want) return false;
    }
    return true;
  });

  result = [...result].sort((a, b) => {
    const aTime = a.createdAt ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt ? b.createdAt.getTime() : 0;
    return filters.sortDir === 'asc' ? aTime - bTime : bTime - aTime;
  });

  return result;
}
