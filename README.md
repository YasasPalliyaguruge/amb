# AMB Portfolio and Booking System

![AMB portfolio and booking system cover](assets/recruiter/cover.png)

> **Portfolio lens:** A polished service-business experience where expressive visual storytelling meets a real booking flow, Firebase roles, and maintainable operational documentation.

This is the portfolio and consultation-booking site for Aadhila M. Biswas. It includes the public site, booking journey, authenticated patient and admin areas, Firebase wiring, Firestore rules, and the scrolling artwork sequences used on the homepage.

## Run it locally

Node.js 18 or newer is required.

```bash
npm ci
npm run dev
```

Vite serves the app on port 3000. The Firebase web configuration is read from `firebase-applet-config.json`; review the Firestore and Storage rules before connecting the site to a production project.

## Checks

```bash
npm run lint
npm test
npm run build
```

Browser smoke tests are available through `npm run test:e2e`. Playwright needs its browser binaries installed first:

```bash
npx playwright install
```

## Project notes

- Homepage artwork is served from `public/art` and mapped in `src/theme/frameSequenceManifest.ts`.
- Firebase setup and email setup are described in [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) and [docs/EMAIL_SETUP_GUIDE.md](docs/EMAIL_SETUP_GUIDE.md).
- [docs/STATUS_AND_PLAN.md](docs/STATUS_AND_PLAN.md) records the working product plan.
