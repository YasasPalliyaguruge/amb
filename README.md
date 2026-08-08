# AMB Portfolio and Consultation Booking Platform

![AMB portfolio and booking system cover](assets/recruiter/cover.png)

**AMB is a live portfolio, consultation-booking, client self-service, and practice-administration platform created for Aadhila M. Biswas.** It combines a highly visual public experience with authenticated patient and administrator workflows backed by Firebase.

The application is currently hosted and operational. Its public storytelling, booking flow, client portal, availability management, media administration, website settings, analytics, and audit tools are connected within one configurable application.

## Implemented functionality

### Public portfolio and consultation experience

- Configurable homepage with profile, ethos, academic credentials, clinical practice, artwork, consultation, and booking sections
- Administrator-controlled section order and visibility
- Animated visual storytelling with Framer Motion, GSAP, and sequenced artwork frames
- Responsive navigation and section-based deep links
- Consultation information and interactive booking workflow
- Runtime theme controls and configurable website content
- Reduced-motion support, lazy-loaded sections, route loading states, and an application error boundary

### Client and patient portal

- Firebase Authentication-based sign-in
- Protected patient dashboard
- Upcoming and previous appointment views
- Appointment cancellation and rescheduling
- Personal phone-number and timezone management
- Real-time updates from Firestore

### Practice administration

- Role-protected administrator dashboard
- Real-time appointment, client, availability, media, settings, and audit-log subscriptions
- Search and filtering by client, appointment status, service, and date
- Create bookings for clients from the administration area
- Reschedule appointments and update appointment status
- Client records and consultation notes
- Administrator-account management

### Availability and scheduling

- Add and remove individual appointment slots
- Generate availability across date ranges
- Generate recurring weekly availability
- Duplicate a day or an entire week of availability
- Block date ranges with an operational reason
- Configure days off, buffer time, and default consultation duration

### Website and media administration

- Edit website copy and homepage configuration
- Control homepage section order and visibility
- Upload and manage media assets
- Assign uploaded media to public website positions
- Configure the application theme through the Theme Studio
- Review administrative actions through the audit log

### Operational insights

- Appointment totals and status summaries
- Upcoming workload indicators
- Repeat-client counts
- Availability coverage and blocked-date tracking
- Service-demand summaries
- Monthly appointment trends

## Technology

| Area | Technology |
| --- | --- |
| Application | React 19, TypeScript, Vite |
| Routing | React Router |
| Backend services | Firebase Authentication, Firestore, Firebase Storage |
| Hosting | Firebase Hosting |
| Styling and interaction | Tailwind CSS, Framer Motion, GSAP |
| Dates and scheduling | date-fns, React Calendar |
| Feedback | React Hot Toast |
| Unit testing | Vitest |
| Browser testing | Playwright |

## Application routes

```text
/                    Public portfolio and consultation booking
/patient-dashboard   Authenticated client appointment portal
/admin-dashboard     Role-protected administration workspace
```

The public homepage is assembled from administrator-configurable sections. Authenticated routes redirect users who do not have the required session or role.

## Firebase data areas

The application works with Firebase collections and settings for:

- Users and roles
- Appointments
- Published availability
- Media assets
- Website and practice settings
- Audit logs

Firestore and Storage access is controlled by the checked-in rules. Review and deploy those rules against the intended Firebase project before using a new environment.

## Local setup

### Requirements

- Node.js 18 or newer
- A Firebase project with Authentication, Firestore, Storage, and Hosting configured
- Firebase CLI when deploying Firebase resources

### Installation

```bash
git clone https://github.com/YasasPalliyaguruge/amb.git
cd amb
npm ci
npm run dev
```

The development server listens on port `3000` and is exposed on the local network by the Vite configuration.

Firebase web configuration is read from `firebase-applet-config.json`. Connect the repository to your own Firebase project and follow the setup guides before deploying rules or creating administrator access.

## Quality checks

```bash
npm run lint       # TypeScript compile check
npm test           # Vitest test suite
npm run build      # Production build
npm run test:e2e   # Playwright browser tests
```

Install the Playwright browser binaries before running the end-to-end suite for the first time:

```bash
npx playwright install
```

## Firebase deployment

The checked-in Firebase configuration serves the Vite `dist` directory, rewrites application routes to `index.html`, and includes security headers for the hosted single-page application.

A typical deployment workflow is:

```bash
npm run build
firebase deploy --only firestore:rules,firestore:indexes,storage,hosting
```

Use a Firebase project owned by the responsible deployment team. Confirm authorized authentication domains, administrator bootstrap procedures, Firestore rules, Storage rules, email delivery, and privacy requirements before publishing a new environment.

## Documentation

- [Firebase setup](docs/FIREBASE_SETUP.md)
- [Email-delivery setup](docs/EMAIL_SETUP_GUIDE.md)
- [Availability generation](docs/HOW_TO_GENERATE_SLOTS.md)
- [Project status and release checklist](docs/STATUS_AND_PLAN.md)

Homepage artwork is stored in `public/art` and mapped through `src/theme/frameSequenceManifest.ts`.

## What this project demonstrates

- Building a visually distinctive professional portfolio without separating it from the real service workflow
- Designing public, client, and administrator experiences within one React application
- Implementing real-time scheduling and operational administration with Firebase
- Creating configurable website content, media, themes, roles, analytics, and auditability
- Maintaining automated TypeScript, unit-test, build, and browser-test workflows
