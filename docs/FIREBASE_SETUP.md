# Firebase environment setup

> **Project context:** Setup guidance for the [AMB Portfolio and Booking System](../README.md). Firebase project IDs, rules, and authorized domains are environment-specific—verify each item in the Firebase console before changing it.

## Ownership first

Use a Firebase project controlled by the person or team responsible for the site. Do not rely on a temporary or third-party-owned project for a deployment you need to maintain. Record the project owner, billing owner, and recovery path outside this repository.

## Local configuration

1. Create a Firebase web app in the chosen project.
2. Copy the web configuration into the project’s local configuration file or environment variables expected by the application.
3. Keep the local file untracked. Browser configuration values identify a Firebase project; they do not replace properly scoped Firestore and Storage rules.
4. Restart the dev server after configuration changes.

## Authentication and allowed origins

1. Enable only the sign-in providers the application uses.
2. Add `localhost` while developing, then add each real deployment domain before release.
3. Configure a support contact and review OAuth consent settings.
4. Test sign-in and sign-out from a clean browser profile.

## Firestore rules and roles

1. Review `firestore.rules` as code before deployment.
2. Deploy the reviewed rules to the intended Firebase project with the Firebase CLI or console.
3. Create an administrator through a deliberate bootstrap process; do not hard-code a personal email address as an access-control shortcut.
4. Verify a normal user cannot read administrative data or change booking availability.

## Verification checklist

- [ ] The Firebase project is owned by the deployment team.
- [ ] Local configuration is present but untracked.
- [ ] Required sign-in provider and production domains are enabled.
- [ ] Reviewed Firestore rules are deployed to the correct project.
- [ ] Admin access is granted through a documented bootstrap process.
- [ ] A normal-user account and an admin account have both been tested.
- [ ] Email and storage integrations are checked separately before launch.
