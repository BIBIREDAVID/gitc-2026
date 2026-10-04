import { SCHOOL_OPTIONS } from '../../config/formOptions';

export default function FiltersToolbar({ filters, onChange }) {
  function update(name, value) {
    onChange({ ...filters, [name]: value });
  }

  return (
    <div className="admin-toolbar">
      <input
        type="search"
        placeholder="Search name, email or phone"
        value={filters.search}
        onChange={(e) => update('search', e.target.value)}
        aria-label="Search registrations"
      />
      <select
        value={filters.pickup}
        onChange={(e) => update('pickup', e.target.value)}
        aria-label="Filter by school"
      >
        <option value="">All schools</option>
        {SCHOOL_OPTIONS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        value={filters.isStudent}
        onChange={(e) => update('isStudent', e.target.value)}
        aria-label="Filter by student"
      >
        <option value="">Student: all</option>
        <option value="yes">Student: yes</option>
        <option value="no">Student: no</option>
      </select>
      <select
        value={filters.laptop}
        onChange={(e) => update('laptop', e.target.value)}
        aria-label="Filter by laptop"
      >
        <option value="">Laptop: all</option>
        <option value="yes">Laptop: yes</option>
        <option value="no">Laptop: no</option>
      </select>
      <select
        value={filters.checkedIn}
        onChange={(e) => update('checkedIn', e.target.value)}
        aria-label="Filter by checked in"
      >
        <option value="">Checked in: all</option>
        <option value="yes">Checked in: yes</option>
        <option value="no">Checked in: no</option>
      </select>
    </div>
  );
}
