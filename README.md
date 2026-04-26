# AMB Portfolio & Booking System

This repo contains the public portfolio, booking flow, patient/admin dashboards, Firebase wiring, and Firestore rules for Aadhila M. Biswas.

## Documentation

1. [Current Status & Future Plan](docs/STATUS_AND_PLAN.md)
2. [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
3. [Automated Email Setup Guide](docs/EMAIL_SETUP_GUIDE.md)

## Running Locally

Prerequisites: Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000`

## Environment Notes

- Firebase config is loaded from `firebase-applet-config.json`.
- Artwork is served from `public/art`.
- `VITE_GEMINI_API_KEY` is optional and only used by the AI chat widget.
- `VITE_PERF_ENDPOINT` is optional and can receive browser performance beacons (`ttfb`, `fcp`, `lcp`, `cls`, `inp`, `public-ready`).
- `VITE_DISABLE_SW=true` disables the production service worker if you need to bypass caching during a rollout.

## Reliability & Performance Notes

- The public site uses a production-only service worker for basic shell/static asset caching.
- Browser performance metrics are emitted as `window` events named `amb:performance-metric` and can optionally be forwarded with `navigator.sendBeacon`.
- The public Spline intro/runtime is only warmed on the homepage route to keep dashboards lighter.
