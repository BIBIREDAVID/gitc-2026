import {
  pickupLabel,
  roleLabel,
  genderLabel,
  interestsLabel,
  yesNoLabel,
  formatDateTime,
} from './registrationLabels';

// Shared between the table/card view and the CSV export, so both always
// agree on what a "column" is.
export const REGISTRATION_COLUMNS = [
  { key: 'fullName', label: 'Name', value: (r) => r.fullName || '' },
  { key: 'email', label: 'Email', value: (r) => r.email || '' },
  { key: 'whatsapp', label: 'WhatsApp', value: (r) => r.whatsapp || '' },
  { key: 'pickup', label: 'Pickup point', value: (r) => pickupLabel(r.pickup) },
  { key: 'isStudent', label: 'Student', value: (r) => yesNoLabel(r.isStudent) },
  { key: 'department', label: 'Department', value: (r) => r.department || '' },
  { key: 'laptop', label: 'Laptop', value: (r) => yesNoLabel(r.laptop) },
  { key: 'gender', label: 'Gender', value: (r) => genderLabel(r.gender) },
  { key: 'role', label: 'Role', value: (r) => roleLabel(r.role) },
  { key: 'interests', label: 'Interests', value: (r) => interestsLabel(r.interests) },
  { key: 'source', label: 'Source', value: (r) => r.source || '' },
  { key: 'createdAt', label: 'Registered at', value: (r) => formatDateTime(r.createdAt) },
  { key: 'checkedIn', label: 'Checked in', value: (r) => (r.checkedIn ? 'Yes' : 'No') },
];
