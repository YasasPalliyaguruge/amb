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
