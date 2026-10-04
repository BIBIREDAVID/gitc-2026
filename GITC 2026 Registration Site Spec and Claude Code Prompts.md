# GITC 2026 Registration Site: Spec and Claude Code Prompts

Oct 1, 2026 · @Bibiresanmi David

## Overview

This is a free, single-event registration site for Get Into Tech Conference 2.0 (GITC 2026) at LASU. The flyer is the hero, a short form collects attendee details, each registrant gets a QR ticket, and staff scan it at the door.

| Item | Decision |
| --- | --- |
| Event | Get Into Tech Conference 2.0, "GITC 2026", at LASU |
| Partner | Zenith Bank (logo on the flyer) |
| Cost | Free, no payment integration |
| Scope | One event only, no multi-event support |
| Date and time | TBA, editable from the admin portal |
| Capacity | Not set yet, added from the admin portal later |
| Email sender | Not set yet, configured later |
| Check-in | Yes, QR scan on the day, with a manual search fallback |
| Stack | React + Vite, Firebase (Firestore, Auth, Functions), Vercel |

The site must work while the date is TBA, capacity is unset and no email sender exists. That means: show "Date and time to be announced", treat empty capacity as unlimited, and show the ticket on screen even when email is switched off.

## Brand and design direction

The site should feel like an extension of the flyer: a dark, neon, tech-forward look. The colour values below are eyeballed from the flyer, so Claude Code should sample the real hex values from the image file and use those instead.

| Element | Direction from the flyer |
| --- | --- |
| Background | Near-black with a deep navy and purple glow, soft blurred light streaks |
| Primary gradient | Blue-violet to magenta-pink, as on the word "CONFERENCE" |
| Accent | Cyan, as on the "IS COMING SOON" dots and the signpost outlines |
| Highlight | Magenta block behind "2.0" |
| Headings | Heavy, wide, uppercase sans-serif (for example Unbounded, Syne or Archivo Expanded) |
| Small labels | Monospace, widely letter-spaced (for example JetBrains Mono or Space Mono), as in "GETTING INTO TECH CONFERENCE" |
| Imagery | The signpost with LASUCOM, YABATECH, LASU, UNILAG and MEDILAG, used as the visual for the bus pickup section |
| Partner | "In partnership with" Zenith Bank logo in the footer and on the landing page |

Rules for the build:

- Mobile first. Design at 375px wide and scale up.
- The flyer itself must be visible in full on the landing page, not cropped. Show it as the hero image, and compress it to a web format (WebP, under 250 KB) with a JPG fallback.
- Keep contrast high: white or near-white text on the dark background, with the gradient used only for emphasis.
- Generate an Open Graph preview image from the flyer so WhatsApp links look good.

## Registration form

The form has your 10 questions plus consent, in the order you gave. On mobile it is split into three steps with a progress bar: About you (1 to 3), Getting there (4 to 7), and You and tech (8 to 10).

| # | Field | Type | Options and rules |
| --- | --- | --- | --- |
| 1 | Full name | Short text | Required, at least 2 characters, trimmed |
| 2 | Email address | Email | Required, lowercased, must be unique |
| 3 | WhatsApp number | Phone | Required, must be unique, stored as +234XXXXXXXXXX (accepts 080..., +23480... and 23480...) |
| 4 | Where will you be coming from? | Single choice | UNILAG (Akoka), MEDILAG (Idi-Araba), YABATECH (Yaba), LASUCOM (Ikeja), Other university/location. Show the note: "Buses will be available at UNILAG, MEDILAG, YABATECH and LASUCOM for transportation to the GITC 2026 event at LASU." "Other" reveals a required text box. |
| 5 | Are you a student? | Single choice | Yes, No |
| 6 | Which department are you in? | Short text | Shown only if Q5 is Yes, then required |
| 7 | Do you have a functional laptop? | Single choice | Yes, No |
| 8 | Gender | Single choice | Male, Female, Prefer not to say |
| 9 | What best describes you? | Single choice | Undergraduate, Graduate, NYSC/Corps Member, Secondary School Student, Tech Professional, Entrepreneur, Other. "Other" reveals a text box. |
| 10 | Which areas are you interested in? | Checkboxes | Software Development, Artificial Intelligence, Data Science, Cybersecurity, UI/UX Design, Product Management, Robotics, Video Editing and Animation, Cloud/DevOps, Digital Marketing, Career Development, Not sure yet, Other. Select at least one. "Not sure yet" clears the others. "Other" reveals a text box. |
| + | Consent | Checkbox | Required. Links to a short privacy note. |

Hidden fields, never shown to the user:

- **Honeypot:** an empty text field that real users never fill. If it has a value, silently discard the submission.
- **Source:** read `?src=` or `utm_source` from the URL (for example `?src=whatsapp`) and store it, so the admin can see where sign-ups came from.

The options for Q4 to Q10 live in one config file in the code, so they can be changed without touching the form logic. A later phase moves them into the admin portal.

## Pages and user flows

| Route | Who | What it does |
| --- | --- | --- |
| `/` | Public | Landing page: the flyer as hero, event name, "Date and time to be announced" until set, a Register button, the bus pickup points, the Zenith partner line |
| `/register` | Public | Three-step form with live validation, a friendly duplicate message, and a loading state on submit |
| `/ticket/:code` | Public | Success and ticket page: confirmation, QR code, "Save image" button, WhatsApp share, Add to Calendar once a date is set |
| `/find-ticket` | Public | "Lost your ticket?" Enter email and WhatsApp number together; if both match one registration, show the ticket |
| `/admin` | Admin login | Event settings, registrations table, stats, CSV export |
| `/checkin` | Staff login | Camera QR scanner and manual search |

Landing page states the build must handle:

- **Date TBA:** show "Date and time to be announced" and hide the countdown and calendar button.
- **Date set:** show the date, time and a countdown, and enable Add to Calendar (Google link and `.ics` file).
- **Registration closed or capacity reached:** replace the Register button with "Registration is closed".

Admin portal:

- **Event settings:** title, date, time, venue, capacity (blank means unlimited), registration open toggle, optional deadline, and email on/off.
- **Registrations:** search by name, email or phone; filter by pickup point, student, laptop, checked in; CSV export of the filtered list.
- **Stats:** total registered, checked in, by pickup point, laptop yes or no, students vs non-students, interests, and sign-ups per day and per source.

Check-in page:

- **Scan result:** a full-screen green "Checked in" with the attendee's name, an amber "Already checked in at HH:MM", or a red "Ticket not found".
- **Fallback:** search by name or WhatsApp number and check in manually.
- **Live count:** checked in out of registered, shown at the top.

## Data model and security

All writes go through Cloud Functions using the Admin SDK, so visitors can never write to the database directly. Duplicates, capacity, validation and the honeypot are checked server-side in one transaction.

| Collection | Document | Holds | Who can read |
| --- | --- | --- | --- |
| `settings` | `event` | title, dateTime (null while TBA), venue, capacity (null means unlimited), registrationOpen, deadline, emailEnabled | Anyone |
| `registrations` | auto id | All 10 answers, consent, source, ticketCode, checkedIn, checkedInAt, checkedInBy, createdAt | Admin and staff |
| `tickets` | the ticket code | fullName, pickup, checkedIn only (no email or phone) | Anyone who knows the code (get, not list) |
| `uniques` | `e_<email>` and `p_<phone>` | the registration id | Nobody (functions only) |
| `stats` | `summary` | total, checkedIn, counts by pickup point | Admin and staff |

The ticket code is a random string of at least 20 characters. The QR code encodes only this code, never personal details.

Roles are Firebase Auth custom claims: `admin: true` for organisers and `staff: true` for door staff. A small script sets them by email.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() { return request.auth != null && request.auth.token.admin == true; }
    function isStaff() { return isAdmin() || (request.auth != null && request.auth.token.staff == true); }

    match /settings/{id}      { allow read: if true; allow write: if isAdmin(); }
    match /registrations/{id} { allow read: if isStaff(); allow write: if false; }
    match /tickets/{code}     { allow get: if true; allow list, write: if false; }
    match /stats/{id}         { allow read: if isStaff(); allow write: if false; }
    match /uniques/{id}       { allow read, write: if false; }
  }
}
```

The admin's event settings write goes straight to `settings/event` from the admin page, which the rules above allow for admins only.

## Cloud Functions, ticket and check-in logic

| Function | Caller | Logic |
| --- | --- | --- |
| `register` | Public | Reject if the honeypot is filled. Validate and normalise every field. Reject if registration is closed, past the deadline, or at capacity. In one transaction, create `uniques` docs for the email and phone (if either exists, return `already_registered`), then create the registration and ticket docs and update `stats`. Return the ticket code. |
| `findTicket` | Public | Take email and WhatsApp number. Return the ticket code only if both match the same registration, so one detail alone cannot expose anyone's ticket. |
| `checkIn` | Staff | Take a ticket code. In a transaction: if unknown, return `not_found`; if already used, return `already_checked_in` with the time; otherwise set checkedIn, time and staff id, update `stats`, and return `checked_in` with the name. |
| `checkInManual` | Staff | Same as `checkIn`, but takes a registration id from the manual search results. |
| `sendTicketEmail` | On registration created | Does nothing while email is switched off or no sender key exists. Otherwise sends the confirmation with the ticket link and QR code. |

Ticket and QR:

- The browser draws the QR code with the `qrcode` package, so the success page works even with no email set up.
- The ticket page offers "Save image", which exports the ticket card as a PNG to keep in the phone gallery.
- The check-in scanner uses `html5-qrcode` and must work on mobile Chrome and Safari. If the camera is blocked, show a message and the manual search.

Email, added later:

- Put the provider behind one small module so the sender can be swapped. Resend is the suggested default.
- Keep the API key and sender address in function config, not in the code. Until they exist, registration works and the ticket shows on screen.
- A 24-hour reminder email is a later scheduled function, and only runs once a date is set.

These functions need the Firebase Blaze (pay-as-you-go) plan. Usage for an event this size normally stays inside the free allowance.

## Setup checklist before the prompts

Do these once, then run the prompts in order.

- [ ] Install Node 20 or newer, Git, Claude Code and the Firebase CLI (`npm i -g firebase-tools`), then run `firebase login`.
- [ ] Create a Firebase project named `gitc-2026`. Turn on Firestore (production mode) and Authentication with the Email/Password provider. Upgrade to the Blaze plan so Cloud Functions can deploy.
- [ ] Add a web app in the Firebase project settings and keep the config values (apiKey, authDomain, projectId, appId and the rest) for `.env.local`.
- [ ] In Firebase Authentication, create one account for each organiser (admin) and each door staff member (staff). You will give their emails to the role script.
- [ ] Create an empty folder `gitc-2026`, open a terminal in it and start Claude Code there.
- [ ] Save the flyer image as `flyer-original.png` in that folder, so Claude Code can read it and sample the colours.
- [ ] Create a GitHub repository and a Vercel account for deployment.
- [ ] Decide the admin email addresses and staff email addresses (needed for Prompt 6).

## Claude Code prompts

Paste these one at a time, in order. After each one, run the app, check it works, and commit before moving on. Prompts 0 to 7 build the full site. Prompt 8 is for later additions.

### Prompt 0: project brief

```text
Create a CLAUDE.md file in this folder with the project brief below, and keep it up to date as we build. Do not write any app code yet.

PROJECT: GITC 2026 registration site. GITC is the "Get Into Tech Conference 2.0", hosted at LASU (Lagos State University), in partnership with Zenith Bank. The flyer is in flyer-original.png: dark, neon blue-violet to magenta gradient, cyan accents, wide heavy headings, monospace labels.

WHAT IT DOES: a free, single-event registration site. Visitors see the flyer, fill a form, get a QR ticket. Staff scan tickets at the door. Organisers manage everything from an admin portal.

STACK: plain JavaScript (JSX, no TypeScript), React + Vite, react-router-dom, Firebase (Firestore, Auth, Cloud Functions with the Admin SDK), deployed on Vercel. Cloud Functions in /functions.

RULES:
1. Mobile first. Design at 375px wide. Most users arrive from WhatsApp links on phones with weak connections.
2. No payments. The event is free.
3. Visitors never write to Firestore directly. All registration writes go through Cloud Functions, which use the Admin SDK and run in transactions.
4. Event date and time, capacity and the email sender are all TBA. The site must work while the date is empty, capacity is empty (meaning unlimited), and email is switched off.
5. Never put secrets in the code. Use .env.local for Vite variables (prefix VITE_) and Firebase function config or secrets for server keys. Keep a .env.example with every variable name and no values.
6. Roles use Firebase Auth custom claims: admin and staff.
7. Keep personal data minimal. Public documents must never contain email or phone.
8. Keep all form options in one config file, src/config/formOptions.js.

FOLDERS: src/ (app), src/config/, src/lib/, src/pages/, src/components/, functions/, scripts/, firestore.rules, .env.example.

After creating the file, show me its contents.
```

### Prompt 1: scaffold, theme and landing page

```text
Read CLAUDE.md and look at flyer-original.png.

1. Scaffold the app in this folder with Vite + React. Install react-router-dom, firebase, qrcode and html5-qrcode. Add scripts and a .gitignore (ignore .env.local, node_modules, dist). Create .env.example.
2. Sample the real colours from the flyer image (background, gradient start and end, cyan accent, magenta highlight) and define them as CSS variables in src/theme.css. Load two Google Fonts: a wide heavy display font for headings and a monospace font for small labels. Build a dark, neon theme that matches the flyer.
3. Make an optimised copy of the flyer: a script in /scripts using sharp that writes public/flyer.webp and public/flyer.jpg at max 1080px wide, each under 250 KB, and a 1200x630 Open Graph image at public/og.jpg. Run it.
4. Create src/lib/firebase.js that initialises Firebase from VITE_ variables. If the variables are missing, the app must still render using defaults, with no crash.
5. Create a hook useEventSettings that reads the Firestore document settings/event in real time and falls back to defaults: title "Get Into Tech Conference 2.0", dateTime null, venue "LASU", capacity null, registrationOpen true.
6. Build the landing page at / :
   - the flyer shown in full as the hero (not cropped), with a gradient glow behind it
   - event title and a mono label "GETTING INTO TECH CONFERENCE"
   - if dateTime is null show "Date and time to be announced" and hide the countdown; if set, show the date, time and a countdown
   - a large Register button linking to /register; if registrationOpen is false show "Registration is closed" instead
   - a "Free bus pickup points" section listing UNILAG (Akoka), MEDILAG (Idi-Araba), YABATECH (Yaba) and LASUCOM (Ikeja), with the text: Buses will be available at UNILAG, MEDILAG, YABATECH and LASUCOM for transportation to the GITC 2026 event at LASU.
   - a footer with "In partnership with Zenith Bank" as text, plus an image slot that loads public/zenith-logo.png if it exists and is hidden if not
7. Add Open Graph and Twitter meta tags in index.html using og.jpg, with title and description.

Run the dev server and check the page at 375px and 1280px wide. Fix any layout problems. Do not build the form yet.
```

### Prompt 2: registration form (front end)

```text
Read CLAUDE.md. Build the registration form at /register.

Options go in src/config/formOptions.js: pickup points (UNILAG - Akoka, MEDILAG - Idi-Araba, YABATECH - Yaba, LASUCOM - Ikeja, Other university/location), student (Yes, No), laptop (Yes, No), gender (Male, Female, Prefer not to say), role (Undergraduate, Graduate, NYSC/Corps Member, Secondary School Student, Tech Professional, Entrepreneur, Other), interests (Software Development, Artificial Intelligence, Data Science, Cybersecurity, UI/UX Design, Product Management, Robotics, Video Editing and Animation, Cloud/DevOps, Digital Marketing, Career Development, Not sure yet, Other).

Fields, in order:
1. Full name, short text, required, at least 2 characters.
2. Email address, required, valid format, trimmed and lowercased.
3. WhatsApp number, required. Accept 080..., +23480... and 23480... and normalise to +234XXXXXXXXXX. Reject anything that does not give 10 digits after the country code.
4. Where will you be coming from? Single choice, required. Show the bus note under it: Buses will be available at UNILAG, MEDILAG, YABATECH and LASUCOM for transportation to the GITC 2026 event at LASU. If "Other university/location" is chosen, show a required text box.
5. Are you a student? Single choice, required.
6. Which department are you in? Short text, shown only when Q5 is Yes, then required.
7. Do you have a functional laptop? Single choice, required.
8. Gender, single choice, required.
9. What best describes you? Single choice, required. "Other" shows a text box.
10. Which areas are you interested in? Checkboxes, at least one. Choosing "Not sure yet" clears the others, and choosing any other option clears "Not sure yet". "Other" shows a text box.
11. Consent checkbox, required: "I agree that GITC may use my details to organise the event and contact me about it." with a link to a short privacy note at /privacy (create a simple page).

Behaviour:
- Three steps on mobile with a progress bar and Back and Next buttons: step 1 is questions 1 to 3, step 2 is 4 to 7, step 3 is 8 to 11. Validate each step before moving on. On desktop keep the same steps in a centred card.
- Inline error messages under each field, in plain language, and move focus to the first error.
- Large tap targets (at least 44px), correct input types and autocomplete attributes, inputmode="tel" for the phone.
- A hidden honeypot text field called website, hidden from users and screen readers.
- Read src from the URL (?src= or utm_source) and keep it in state.
- Keep progress in sessionStorage so a refresh does not lose answers, and clear it after success.
- On submit, call a function submitRegistration(payload) in src/lib/api.js. For now implement it as a stub that waits one second and returns { ticketCode: "DEMO123" }, then navigate to /ticket/DEMO123. Show a loading state and disable the button while submitting. Handle the error codes already_registered, closed, full and invalid with friendly messages; for already_registered link to /find-ticket.

Do not connect Firebase functions yet. Test every conditional field and check the layout at 375px.
```

### Prompt 3: Cloud Functions and ticket page

```text
Read CLAUDE.md. Build the back end for registration and the ticket page.

In /functions (Node 20, firebase-functions v2, firebase-admin) create:

1. register (callable, region europe-west1 or the closest to Lagos available): input is the form payload.
   - If the honeypot field has a value, return a fake success without writing anything.
   - Validate and normalise every field again on the server using the same rules as the form. Return the error code invalid for bad data.
   - Read settings/event. If registrationOpen is false or the deadline has passed return closed. If capacity is set and stats/summary.total has reached it, return full.
   - In one Firestore transaction: check that uniques/e_<email> and uniques/p_<phone> do not exist (otherwise return already_registered), create both, create registrations/{autoId} with all answers, source, consent, createdAt, checkedIn false and a random ticketCode of at least 20 URL-safe characters, create tickets/{ticketCode} with only fullName, pickup and checkedIn, and increment stats/summary (total and byPickup).
   - Return { ticketCode }.
2. findTicket (callable): input email and WhatsApp number. Return the ticketCode only if both belong to the same registration, otherwise return not_found. Add a basic limit of 10 attempts per IP per hour.
3. sendTicketEmail (Firestore trigger on registrations create): a stub that does nothing unless settings/event.emailEnabled is true and an email provider key exists. Put the provider call in functions/src/email.js so it can be swapped later.

In the front end:
- Replace the stub in src/lib/api.js with real callable calls, using the Firebase emulators when running locally (add firebase.json, a functions emulator and a Firestore emulator setup, and an npm script to run them).
- Build /ticket/:code. Read tickets/{code} from Firestore. Show a confirmation message, the attendee name and pickup point, and a QR code of the code drawn with the qrcode package. Add a "Save ticket as image" button that downloads the ticket card as a PNG, a "Share on WhatsApp" link with a pre-filled message about GITC 2026 and the site URL, and an "Add to Calendar" button that only shows when the event date is set (Google Calendar link plus a downloadable .ics file). If the code does not exist, show a friendly not-found page.
- Build /find-ticket with the email and WhatsApp number form calling findTicket and redirecting to the ticket page.

Write firestore.rules exactly as in the spec: settings readable by anyone and writable by admins, registrations and stats readable by staff and admins, tickets allow get only, uniques closed. Use custom claims admin and staff.

Test the whole flow against the emulators: register, see the ticket, try a duplicate email, try a duplicate phone, fill the honeypot, set capacity to 1 and register twice. Report what you tested and the results.
```

### Prompt 4: admin portal

```text
Read CLAUDE.md. Build the admin portal at /admin.

Access:
- Email and password login with Firebase Auth. After login, read the ID token claims. If the user does not have admin: true, sign them out and show "This account does not have admin access."
- Keep the admin code in a separate lazy-loaded chunk so the public pages stay small.

Sections (tabs on desktop, a bottom or top menu on mobile):
1. Event settings: a form that writes settings/event. Fields: title, date and time (a datetime-local input interpreted as Africa/Lagos time and stored as a Firestore Timestamp, with a Clear button that sets it back to null for TBA), venue, capacity (blank means unlimited), registrationOpen toggle, registration deadline (optional), emailEnabled toggle. Show a live preview line of how the landing page will read.
2. Registrations: a real-time table from the registrations collection with columns name, email, WhatsApp, pickup point, student, department, laptop, gender, role, interests, source, registered at, checked in. Add a search box (name, email, phone), filters (pickup point, student, laptop, checked in), sort by date, and pagination. On mobile show each registration as a card instead of a wide table. Add a Delete action behind a confirmation dialog; deleting calls a new admin-only callable function adminDeleteRegistration that removes the registration, its ticket and both uniques documents in one transaction and updates stats.
3. Stats: cards for total registered, checked in, and spots left (when capacity is set). Then simple bar breakdowns drawn with plain CSS or SVG, no heavy chart library: by pickup point, laptop yes or no, student yes or no, by role, by interest, sign-ups per day, and by source. Use the theme colours.
4. Export: a button that downloads the currently filtered registrations as CSV. Use UTF-8 with a BOM so Excel opens it correctly, escape quotes and commas, and protect against spreadsheet formula injection by prefixing any cell that starts with =, +, - or @ with a single quote.

Update firestore.rules only if something new is needed. Test with the emulators: a non-admin must be blocked, settings changes must show on the landing page immediately, and the CSV must open correctly. Report what you tested.
```

### Prompt 5: check-in page

```text
Read CLAUDE.md. Build door check-in.

Functions (callable, staff or admin claim required):
- checkIn({ code }): in one transaction look up tickets/{code} and the matching registration. If unknown return not_found. If already checked in return already_checked_in with the check-in time and the name. Otherwise set checkedIn true, checkedInAt and checkedInBy on both the registration and the ticket, increment stats/summary.checkedIn, and return checked_in with the name and pickup point.
- checkInManual({ registrationId }): same logic, found by registration id.

Page /checkin:
- Email and password login, allowed for staff or admin claims only.
- A large camera view using html5-qrcode, back camera by default, scanning continuously. The QR holds only the ticket code, but also accept a scanned URL that ends in /ticket/<code>.
- Ignore repeat reads of the same code for 3 seconds.
- After each scan show a full-screen result for about 2.5 seconds: green with the name and "Checked in", amber with "Already checked in at HH:MM" and the name, or red with "Ticket not found". Add a short vibration on supported phones.
- If the camera is blocked or unavailable, show clear instructions and fall back to manual search.
- Manual search: a box that finds registrations by name or WhatsApp number (loaded once for staff and filtered in the browser) with a Check in button on each result.
- A live counter at the top: checked in of total registered, from stats/summary.
- If the device is offline, show a banner and do not report a check-in as successful.
- Make it usable one-handed on a phone: big buttons, high contrast, no small text.

Test in the emulators with a printed or on-screen QR: first scan, second scan of the same code, a made-up code, and manual check-in. Report the results.
```

### Prompt 6: roles, seed data and first deploy

```text
Read CLAUDE.md. Prepare the project for real use.

1. Write scripts/setRole.js (Node, firebase-admin) that takes an email and a role (admin or staff) and sets that custom claim on the Firebase Auth user. It must read credentials from the GOOGLE_APPLICATION_CREDENTIALS environment variable and never contain keys. Add the service account key file name to .gitignore.
2. Write scripts/seed.js that creates settings/event with the defaults (title "Get Into Tech Conference 2.0", dateTime null, venue "LASU", capacity null, registrationOpen true, emailEnabled false) and stats/summary with total 0, checkedIn 0 and an empty byPickup map, but only if they do not already exist.
3. Write a README.md with exact steps: create the Firebase project, fill .env.local from .env.example, run the seed script, assign roles with setRole.js, run the emulators, deploy with firebase deploy --only firestore:rules,functions, and deploy the front end to Vercel (including the VITE_ environment variables and an SPA rewrite in vercel.json).
4. Add a rules test using the Firebase emulator that proves: the public cannot read registrations, stats or uniques; the public cannot list tickets but can get one by code; the public cannot write anywhere; staff can read registrations but cannot change settings; admins can change settings.

Run the rules tests and show me the results. Do not run any command that touches my live Firebase project without telling me first and waiting for my confirmation.
```

### Prompt 7: polish, QA and launch

```text
Read CLAUDE.md. Do a launch-readiness pass on the whole app.

- Performance: check the mobile Lighthouse scores for / and /register, and fix anything below 90 for performance or accessibility. Use responsive images with the WebP flyer and a JPG fallback, lazy-load below-the-fold content, and keep the public JavaScript bundle small.
- Accessibility: visible focus states, labels on every input, error messages tied to fields with aria-describedby, sufficient colour contrast on the dark theme, and respect prefers-reduced-motion for any glow or animation.
- Robustness: a 404 page, an error boundary, friendly messages when Firebase is unreachable, and a loading state on every page that waits for data.
- Security review: confirm that no personal data is in any public document, that no secrets are in the repository, and that the callable functions reject malformed input. List any risks you find.
- Add a basic end-to-end test of the registration flow if it is quick to do.
- Check how the link preview looks by validating the Open Graph tags, and confirm the page title and description are right.

Then give me a short launch checklist: what to set in the admin portal (date, time, capacity), what to test on real phones, and what to do on the event day. Do not deploy anything yet.
```

### Prompt 8: additions for later

Run these separately, only when you are ready for them.

```text
A) Email and reminders. Read CLAUDE.md. Implement the email provider module in functions/src/email.js using Resend, with the API key and sender address read from Firebase function secrets (tell me the exact commands to set them). Send a confirmation email on registration with the attendee name, the event details (or "date to be announced"), the ticket link, and the QR code as an inline image. Respect settings/event.emailEnabled. Add a scheduled function that runs hourly and sends a reminder to everyone registered about 24 hours before dateTime, once only, tracked with a reminderSentAt field. It must do nothing while dateTime is null. If the date changes after a reminder was sent, allow one more reminder.

B) Bus capacity. Read CLAUDE.md. Add an optional seat limit for each pickup point in settings/event (busCapacity map, blank means unlimited). Enforce it in the register function inside the same transaction using stats/summary.byPickup. On the form, show "Bus full" next to a full pickup point and disable it while still allowing "Other". Add the limits to the admin settings form and show seats left per bus in the stats.

C) Admin-editable form questions. Read CLAUDE.md. Move the optional questions into a Firestore collection formFields that admins can add, reorder, hide and edit from the admin portal. Render the form from that collection, validate it on the server, store answers by field id, and keep the CSV export working with the new fields.
```

## Open items and later additions

Still to supply:

- [ ] **Date, time and exact venue at LASU.** Entered in the admin portal, no code change needed.
- [ ] **Capacity**, total and optionally per bus. Entered in the admin portal.
- [ ] **Email sender and domain**, needed before Prompt 8A.
- [ ] **Official Zenith Bank logo file** as `public/zenith-logo.png`. The logo on the flyer is too small to reuse cleanly.
- [ ] **Admin and staff email addresses** for Prompt 6.

Decisions I made that you can change:

- Gender is required, but "Prefer not to say" is an option, so nobody is forced to disclose.
- "Lost your ticket?" needs both email and WhatsApp number to match, so a stranger cannot pull up someone else's ticket.
- Visitors write only through Cloud Functions, which needs the Firebase Blaze plan. If you want to stay on the free Spark plan, say so and the duplicate and capacity checks would move into Firestore rules, which is more fragile.

To think about:

- **Under-18 attendees.** "Secondary School Student" is an option, so some registrants may be under 18. Decide whether you want an age note or parent or guardian consent, and have the privacy note checked against the Nigeria Data Protection Act 2023. I am not a lawyer, so treat that as a prompt to check, not legal advice.
- **WhatsApp reminders.** The official WhatsApp API costs money and needs approved message templates. Until then, export the CSV and send a broadcast manually, with email reminders handled by Prompt 8A.
- **Later ideas:** waitlist when full, post-event feedback form, certificates for attendees who checked in, and an announcement banner on the landing page.
