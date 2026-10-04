import {
  SCHOOL_OPTIONS,
  BUS_PICKUP_POINTS,
  GENDER_OPTIONS,
  ROLE_OPTIONS,
  INTEREST_OPTIONS,
} from '../config/formOptions';

function labelFromList(list, id) {
  return list.find((o) => o.id === id)?.label || id || '';
}

export const schoolLabel = (id) => labelFromList(SCHOOL_OPTIONS, id);
export const pickupPointLabel = (id) => (id ? labelFromList(BUS_PICKUP_POINTS, id) : 'None');
export const genderLabel = (id) => labelFromList(GENDER_OPTIONS, id);
export const roleLabel = (id) => labelFromList(ROLE_OPTIONS, id);
export const interestLabel = (id) => labelFromList(INTEREST_OPTIONS, id);

export function interestsLabel(interests) {
  return (interests || []).map(interestLabel).join(', ');
}

export function formatDateTime(date) {
  if (!date) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const yesNoLabel = (value) => (value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value || '');
