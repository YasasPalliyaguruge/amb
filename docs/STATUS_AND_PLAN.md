# Project status and release plan

> **Project context:** Current repository snapshot for the [AMB Portfolio and Booking System](../README.md). This is not a production-readiness certificate: Firebase ownership, access rules, email delivery, and deployment configuration still require an accountable release owner.

## What is present in the repository

- A public portfolio experience with the artwork sequence stored under `public/art`.
- A booking journey and authenticated areas for client and administrative use.
- Firebase application wiring, Firestore rules, and supporting setup notes.
- Availability management, booking records, and documented email-delivery integration points.
- A frontend test and quality toolchain.

## Local verification completed

During the repository audit, the following checks completed successfully:

```bash
npm run lint
npm test
npm run build
```

Browser smoke testing remains a separate step: install Playwright’s browser binaries before running `npm run test:e2e`.

## Before a public release

1. Confirm the Firebase project and billing account are owned by the deployment team.
2. Review and deploy Firestore and Storage rules for the production project.
3. Bootstrap administrator access without hard-coded personal accounts.
4. Configure authorized domains and test every enabled sign-in provider in a clean browser session.
5. Configure email delivery with a verified sender using the [email runbook](EMAIL_SETUP_GUIDE.md).
6. Populate approved public content, availability, and any required privacy or consent notices.
7. Run the checks above, then complete an end-to-end booking test with non-sensitive test data.

## Useful references

- [Firebase environment setup](FIREBASE_SETUP.md)
- [Generating booking availability](HOW_TO_GENERATE_SLOTS.md)
- [Email delivery setup](EMAIL_SETUP_GUIDE.md)
