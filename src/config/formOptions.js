// Single source of truth for registration form options.

// Used on the landing page's "Free bus pickup points" section, and as the
// options for the registration form's optional "pickup point for
// mobilization" question. LASU Ojo is deliberately excluded from both — it's
// the venue itself, so there's no bus pickup needed from there.
export const BUS_PICKUP_POINTS = [
  { id: 'unilag', label: 'UNILAG (Akoka)' },
  { id: 'medilag', label: 'MEDILAG (Idi-Araba)' },
  { id: 'yabatech', label: 'YABATECH (Yaba)' },
  { id: 'lasucom', label: 'LASUCOM (Ikeja)' },
];

export const BUS_NOTE =
  'Buses will be available at UNILAG, MEDILAG, YABATECH and LASUCOM for transportation to the GITC 2026 event at LASU.';

// Registration form, question: "What school are you coming from?" — every
// school, including LASU Ojo (someone can be coming from the venue's own
// campus without needing a bus pickup).
export const SCHOOL_OPTIONS = [
  { id: 'unilag', label: 'UNILAG - Akoka' },
  { id: 'medilag', label: 'MEDILAG - Idi-Araba' },
  { id: 'yabatech', label: 'YABATECH - Yaba' },
  { id: 'lasucom', label: 'LASUCOM - Ikeja' },
  { id: 'lasu_ojo', label: 'LASU - Ojo' },
  { id: 'other', label: 'Other university/location' },
];

export const YES_NO = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];

export const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const ROLE_OPTIONS = [
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'graduate', label: 'Graduate' },
  { id: 'nysc', label: 'NYSC/Corps Member' },
  { id: 'secondary', label: 'Secondary School Student' },
  { id: 'tech_professional', label: 'Tech Professional' },
  { id: 'entrepreneur', label: 'Entrepreneur' },
  { id: 'other', label: 'Other' },
];

export const INTEREST_OPTIONS = [
  { id: 'software_dev', label: 'Software Development' },
  { id: 'ai', label: 'Artificial Intelligence' },
  { id: 'data_science', label: 'Data Science' },
  { id: 'cybersecurity', label: 'Cybersecurity' },
  { id: 'uiux', label: 'UI/UX Design' },
  { id: 'product_management', label: 'Product Management' },
  { id: 'robotics', label: 'Robotics' },
  { id: 'video_editing', label: 'Video Editing and Animation' },
  { id: 'cloud_devops', label: 'Cloud/DevOps' },
  { id: 'digital_marketing', label: 'Digital Marketing' },
  { id: 'career_development', label: 'Career Development' },
  { id: 'not_sure', label: 'Not sure yet' },
  { id: 'other', label: 'Other' },
];

export const NOT_SURE_INTEREST_ID = 'not_sure';
export const OTHER_OPTION_ID = 'other';
