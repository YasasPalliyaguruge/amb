# Generating booking availability

> **Project context:** Operator guide for the [AMB Portfolio and Booking System](../README.md). It describes a local/admin workflow, not a production availability policy.

## Before you begin

- Start the app with `npm run dev` and use the Firebase environment intended for testing.
- Sign in with an account that has the administrator role.
- Agree the working hours, appointment length, buffer time, and any blocked dates with the practice owner before creating slots.

## Create slots

1. Open the admin dashboard.
2. Go to the availability-management view.
3. Select a future date and confirm the proposed working window.
4. Generate the slots, then inspect the result before sharing the date publicly.
5. Open the public booking flow in a separate browser session and confirm that only the intended times are visible.

## Operating safely

- Generate only a short, reviewable range of dates at first.
- Use the day-off or block controls before opening availability, not after a booking has been made.
- Test cancellation and rescheduling with non-sensitive sample data.
- If the schedule is edited directly in Firestore, recheck the public calendar and audit trail.

## Handoff check

The workflow is ready for an owner review when an admin can create availability, a normal visitor can see only available slots, and a booking cannot consume the same slot twice.
