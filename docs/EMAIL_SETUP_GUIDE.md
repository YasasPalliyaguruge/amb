# Email delivery setup

> **Project context:** Deployment runbook for the [AMB Portfolio and Booking System](../README.md). Use a test mailbox first, and never commit SMTP credentials, app passwords, or production sender addresses.

## What this covers

The booking flow can create a document in the Firestore `mail` collection. A Firebase email extension or a separately owned server-side worker must be configured to deliver that message. Creating the document alone does not send email.

## Before you configure delivery

- Confirm that the `mail` collection’s document shape matches the delivery tool you choose.
- Use a verified sender domain or a test sender that you control.
- Store credentials in the extension configuration or a secrets manager—not in the repository, browser code, or a Firestore document.
- Keep write access to `mail` restricted to trusted server-side code or carefully reviewed rules.

## Firebase extension path

1. Open the [Trigger Email from Firestore extension](https://extensions.dev/extensions/firebase/firestore-send-email) in the Firebase console.
2. Select the intended Firebase project and install the extension.
3. Configure `mail` as the email-document collection.
4. Add the provider connection details using a dedicated, least-privilege credential.
5. Set a verified default sender and any required reply-to address.
6. Review the extension’s data, billing, and retry settings before enabling production traffic.

## Prove the integration safely

1. Run the application against a development Firebase project.
2. Create one test booking using a non-sensitive test recipient.
3. Check the generated `mail` document, extension logs, and delivered message.
4. Confirm failures do not expose booking data or credentials in client-visible errors.
5. Repeat the check after any rule, provider, or template change.

## Release checklist

- [ ] Sender identity is verified.
- [ ] Secrets are stored outside the repository.
- [ ] Firestore rules prevent arbitrary email-document writes.
- [ ] A test booking has been delivered and inspected.
- [ ] An owner knows where to review delivery failures.
