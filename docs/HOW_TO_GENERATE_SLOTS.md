# How to Generate Booking Slots (First-Time Setup)

The Consultation Desk calendar is designed to read directly from your live database. Because you just connected a brand-new Firebase database, there are currently **0 slots created**.

The system does not automatically assume you work 24/7. As the site owner, you must manually define your working schedule by generating slots. Once you generate them, they instantly appear on the public booking calendar.

### Follow these steps to generate your first slots:

1. Start your server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in your browser.
3. Scroll to the top and click the **"Login"** button in the Navigation Bar.
4. Sign in with Google using your admin email: **`yasaspalliyaguruge@gmail.com`**.
5. Once logged in, click your Profile icon in the top right to open the dropdown menu.
6. Click **"Admin Dashboard"**.
7. In your Admin Dashboard, click the **"Manage Availability"** tab.
8. Choose today's date (or tomorrow's date) on the date selector.
9. Click the **"Generate Slots"** button (it will auto-create 45-minute sessions from 9 AM to 5 PM).
10. Go back to the homepage (`/`) and scroll down to the **Consultation Desk**. Click the date you just generated slots for.

**You will instantly see all the time slots appear, beautifully formatted!** You can then click one and follow through the entire 3-step booking flow to verify it works flawlessly.
