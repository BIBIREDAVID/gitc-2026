import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SCHOOL_OPTIONS,
  BUS_PICKUP_POINTS,
  BUS_NOTE,
  YES_NO,
  GENDER_OPTIONS,
  ROLE_OPTIONS,
  INTEREST_OPTIONS,
  NOT_SURE_INTEREST_ID,
  OTHER_OPTION_ID,
} from '../config/formOptions';
import {
  validateFullName,
  validateEmail,
  normalizePhone,
  validateInterests,
} from '../lib/validation';
import { submitRegistration, RegistrationError } from '../lib/api';
import TextField from '../components/form/TextField';
import RadioGroup from '../components/form/RadioGroup';
import CheckboxGroup from '../components/form/CheckboxGroup';
import Checkbox from '../components/form/Checkbox';
import ProgressBar from '../components/form/ProgressBar';
import './Register.css';

const DRAFT_KEY = 'gitc2026:registration-draft';
const TOTAL_STEPS = 3;
const STEP_LABELS = ['About you', 'Logistics', 'Interests & consent'];

const STEP_FIELDS = [
  ['fullName', 'email', 'whatsapp'],
  ['pickup', 'pickupOther', 'pickupPoint', 'isStudent', 'department', 'laptop'],
  ['gender', 'role', 'roleOther', 'interests', 'interestsOther', 'consent'],
];

const initialForm = {
  fullName: '',
  email: '',
  whatsapp: '',
  pickup: '',
  pickupOther: '',
  pickupPoint: '',
  isStudent: '',
  department: '',
  laptop: '',
  gender: '',
  role: '',
  roleOther: '',
  interests: [],
  interestsOther: '',
  consent: false,
  website: '', // honeypot
  src: '',
};

function validateStep(index, form) {
  const errors = {};

  if (index === 0) {
    const nameErr = validateFullName(form.fullName);
    if (nameErr) errors.fullName = nameErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) errors.email = emailErr;

    const { error: phoneErr } = normalizePhone(form.whatsapp);
    if (phoneErr) errors.whatsapp = phoneErr;
  }

  if (index === 1) {
    if (!form.pickup) errors.pickup = 'Select where you will be coming from.';
    if (form.pickup === OTHER_OPTION_ID && !form.pickupOther.trim()) {
      errors.pickupOther = 'Tell us your university or location.';
    }
    if (!form.isStudent) errors.isStudent = 'Let us know if you are a student.';
    if (form.isStudent === 'yes' && !form.department.trim()) {
      errors.department = 'Enter your department.';
    }
    if (!form.laptop) errors.laptop = 'Let us know if you have a functional laptop.';
  }

  if (index === 2) {
    if (!form.gender) errors.gender = 'Select your gender.';
    if (!form.role) errors.role = 'Select what best describes you.';
    if (form.role === OTHER_OPTION_ID && !form.roleOther.trim()) {
      errors.roleOther = 'Tell us what best describes you.';
    }
    const interestsErr = validateInterests(form.interests);
    if (interestsErr) errors.interests = interestsErr;
    if (form.interests.includes(OTHER_OPTION_ID) && !form.interestsOther.trim()) {
      errors.interestsOther = 'Tell us what else you are interested in.';
    }
    if (!form.consent) errors.consent = 'You need to agree before registering.';
  }

  return errors;
}

const ERROR_MESSAGES = {
  already_registered: (
    <>
      Looks like you're already registered with this email or number.{' '}
      <Link to="/find-ticket">Find your ticket</Link> instead.
    </>
  ),
  closed: 'Registration is currently closed.',
  full: "We've reached capacity for this event. Check back in case a spot opens up.",
  invalid: 'Some of your details could not be validated. Please check the form and try again.',
};
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const fieldRefs = useRef({});

  // Load any saved draft, then let a ?src= / utm_source URL param override it.
  // setHydrated is batched with the setForm/setStep calls below so the
  // persistence effect never fires against a stale (pre-draft) form value.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.form) setForm((f) => ({ ...f, ...saved.form }));
        if (typeof saved?.step === 'number') setStep(saved.step);
      }
    } catch {
      // sessionStorage unavailable (private mode etc.) — ignore and start fresh.
    }

    const params = new URLSearchParams(window.location.search);
    const src = params.get('src') || params.get('utm_source');
    if (src) setForm((f) => ({ ...f, src }));

    setHydrated(true);
  }, []);

  // Persist progress so a refresh doesn't lose answers.
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }));
    } catch {
      // ignore write failures
    }
  }, [hydrated, form, step]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => {
      if (!(name in e)) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  }

  function toggleInterest(id) {
    setForm((f) => {
      let next;
      if (id === NOT_SURE_INTEREST_ID) {
        next = f.interests.includes(id) ? [] : [NOT_SURE_INTEREST_ID];
      } else {
        const withoutNotSure = f.interests.filter((i) => i !== NOT_SURE_INTEREST_ID);
        next = withoutNotSure.includes(id)
          ? withoutNotSure.filter((i) => i !== id)
          : [...withoutNotSure, id];
      }
      return {
        ...f,
        interests: next,
        interestsOther: next.includes(OTHER_OPTION_ID) ? f.interestsOther : '',
      };
    });
    setErrors((e) => {
      if (!('interests' in e)) return e;
      const next = { ...e };
      delete next.interests;
      return next;
    });
  }

  function focusFirstError(stepIndex, stepErrors) {
    const order = STEP_FIELDS[stepIndex];
    const firstKey = order.find((key) => stepErrors[key]);
    if (firstKey) {
      const node = fieldRefs.current[firstKey];
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      node?.focus();
      node?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }

  function handleNext() {
    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      focusFirstError(step, stepErrors);
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      focusFirstError(step, stepErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Fields are sent raw (not pre-normalised) — the `register` Cloud
    // Function re-validates and normalises everything server-side, which is
    // the actual source of truth. The honeypot `website` field rides along
    // too: the server returns a fake success without writing if it's set,
    // in case a bot calls the API directly and skips this client entirely.
    const payload = {
      fullName: form.fullName,
      email: form.email,
      whatsapp: form.whatsapp,
      pickup: form.pickup,
      pickupOther: form.pickup === OTHER_OPTION_ID ? form.pickupOther : '',
      pickupPoint: form.pickupPoint,
      isStudent: form.isStudent,
      department: form.isStudent === 'yes' ? form.department : '',
      laptop: form.laptop,
      gender: form.gender,
      role: form.role,
      roleOther: form.role === OTHER_OPTION_ID ? form.roleOther : '',
      interests: form.interests,
      interestsOther: form.interests.includes(OTHER_OPTION_ID) ? form.interestsOther : '',
      consent: form.consent,
      src: form.src,
      website: form.website,
    };

    try {
      const { ticketCode } = await submitRegistration(payload);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      navigate(`/ticket/${ticketCode}`);
    } catch (err) {
      const code = err instanceof RegistrationError ? err.code : null;
      setSubmitError(ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGE);
      setSubmitting(false);
    }
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="register-page">
      <div className="register-card">
        <form
          className="register-form"
          onSubmit={isLastStep ? handleSubmit : (e) => e.preventDefault()}
          noValidate
        >
          <p className="mono-label">Register for GITC 2026</p>
          <h1 className="register-form-title">Save your seat</h1>

          <ProgressBar step={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

          {/* Honeypot — hidden from sighted users and screen readers. */}
          <div className="visually-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setField('website', e.target.value)}
            />
          </div>

          {step === 0 && (
            <div className="register-step">
              <TextField
                ref={(el) => (fieldRefs.current.fullName = el)}
                id="fullName"
                label="Full name"
                required
                autoComplete="name"
                placeholder="e.g. Ada Lovelace"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                error={errors.fullName}
              />
              <TextField
                ref={(el) => (fieldRefs.current.email = el)}
                id="email"
                label="Email address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                error={errors.email}
              />
              <TextField
                ref={(el) => (fieldRefs.current.whatsapp = el)}
                id="whatsapp"
                label="WhatsApp number"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                placeholder="0803 123 4567"
                hint="We'll use this to send your ticket and event updates."
                value={form.whatsapp}
                onChange={(e) => setField('whatsapp', e.target.value)}
                error={errors.whatsapp}
              />
            </div>
          )}

          {step === 1 && (
            <div className="register-step">
              <RadioGroup
                ref={(el) => (fieldRefs.current.pickup = el)}
                id="pickup"
                legend="What school are you coming from?"
                required
                options={SCHOOL_OPTIONS}
                value={form.pickup}
                onChange={(val) => setField('pickup', val)}
                error={errors.pickup}
              />
              {form.pickup === OTHER_OPTION_ID && (
                <TextField
                  ref={(el) => (fieldRefs.current.pickupOther = el)}
                  id="pickupOther"
                  label="Your university or location"
                  required
                  placeholder="e.g. University of Lagos"
                  value={form.pickupOther}
                  onChange={(e) => setField('pickupOther', e.target.value)}
                  error={errors.pickupOther}
                />
              )}

              <RadioGroup
                ref={(el) => (fieldRefs.current.pickupPoint = el)}
                id="pickupPoint"
                legend="Pickup point for mobilization (optional)"
                options={BUS_PICKUP_POINTS}
                value={form.pickupPoint}
                onChange={(val) => setField('pickupPoint', val)}
                hint={BUS_NOTE}
              />

              <RadioGroup
                ref={(el) => (fieldRefs.current.isStudent = el)}
                id="isStudent"
                legend="Are you a student?"
                required
                options={YES_NO}
                value={form.isStudent}
                onChange={(val) => setField('isStudent', val)}
                error={errors.isStudent}
              />
              {form.isStudent === 'yes' && (
                <TextField
                  ref={(el) => (fieldRefs.current.department = el)}
                  id="department"
                  label="Which department are you in?"
                  required
                  placeholder="e.g. Computer Science"
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value)}
                  error={errors.department}
                />
              )}

              <RadioGroup
                ref={(el) => (fieldRefs.current.laptop = el)}
                id="laptop"
                legend="Do you have a functional laptop?"
                required
                options={YES_NO}
                value={form.laptop}
                onChange={(val) => setField('laptop', val)}
                error={errors.laptop}
              />
            </div>
          )}

          {step === 2 && (
            <div className="register-step">
              <RadioGroup
                ref={(el) => (fieldRefs.current.gender = el)}
                id="gender"
                legend="Gender"
                required
                options={GENDER_OPTIONS}
                value={form.gender}
                onChange={(val) => setField('gender', val)}
                error={errors.gender}
              />

              <RadioGroup
                ref={(el) => (fieldRefs.current.role = el)}
                id="role"
                legend="What best describes you?"
                required
                options={ROLE_OPTIONS}
                value={form.role}
                onChange={(val) => setField('role', val)}
                error={errors.role}
              />
              {form.role === OTHER_OPTION_ID && (
                <TextField
                  ref={(el) => (fieldRefs.current.roleOther = el)}
                  id="roleOther"
                  label="Tell us more"
                  required
                  placeholder="What best describes you?"
                  value={form.roleOther}
                  onChange={(e) => setField('roleOther', e.target.value)}
                  error={errors.roleOther}
                />
              )}

              <CheckboxGroup
                ref={(el) => (fieldRefs.current.interests = el)}
                id="interests"
                legend="Which areas are you interested in?"
                required
                hint="Choose at least one. Picking 'Not sure yet' clears other picks."
                options={INTEREST_OPTIONS}
                values={form.interests}
                onToggle={toggleInterest}
                error={errors.interests}
              />
              {form.interests.includes(OTHER_OPTION_ID) && (
                <TextField
                  ref={(el) => (fieldRefs.current.interestsOther = el)}
                  id="interestsOther"
                  label="Tell us more"
                  required
                  placeholder="What else are you interested in?"
                  value={form.interestsOther}
                  onChange={(e) => setField('interestsOther', e.target.value)}
                  error={errors.interestsOther}
                />
              )}

              <Checkbox
                ref={(el) => (fieldRefs.current.consent = el)}
                id="consent"
                required
                checked={form.consent}
                onChange={(e) => setField('consent', e.target.checked)}
                error={errors.consent}
                label={
                  <>
                    I agree that GITC may use my details to organise the event and contact me
                    about it. <Link to="/privacy">Privacy note</Link>.
                  </>
                }
              />

              {submitError && (
                <p className="register-error" role="alert">
                  {submitError}
                </p>
              )}
            </div>
          )}

          <div className="register-nav">
            {step > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleBack}
                disabled={submitting}
              >
                Back
              </button>
            )}
            {!isLastStep && (
              <button type="button" className="btn-primary" onClick={handleNext}>
                Next
              </button>
            )}
            {isLastStep && (
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
