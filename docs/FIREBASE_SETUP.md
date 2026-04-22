# 🔥 Firebase Setup — Fix Login & Database Access

## Why Login is Broken

The Firebase project (`ai-studio-applet-webapp-8bc57`) was provisioned by **Google AI Studio** and
owned by the AI Studio account. Running on **localhost** fails because:

1. **`auth/unauthorized-domain`** — `localhost` is not in Firebase's authorized domains list
2. **`permission-denied`** — The `firestore.rules` file in this project has never been deployed to Firebase;
   Firestore is using the default "deny all" rules

---

## ✅ Option A — Fix the Existing AI Studio Project (5 minutes)

This uses the existing Firebase project but requires you to log in to Firebase Console
with the **AI Studio Google account** (the one that created the AI Studio project).

### Step 1 — Add localhost to Authorized Domains

Open this URL in your browser:
```
https://console.firebase.google.com/project/ai-studio-applet-webapp-8bc57/authentication/settings
```
→ Scroll to **"Authorized domains"**
→ Click **"Add domain"** → type `localhost` → click **"Add"**

### Step 2 — Enable Google Sign-In Provider

```
https://console.firebase.google.com/project/ai-studio-applet-webapp-8bc57/authentication/providers
```
→ Click **Google** → toggle **Enabled** → set a support email → **Save**

### Step 3 — Deploy Firestore Rules

Two ways to do this:

**3a. Paste rules manually (no CLI needed):**
```
https://console.firebase.google.com/project/ai-studio-applet-webapp-8bc57/firestore/rules
```
→ Copy the entire content of `firestore.rules` from this project
→ Paste into the editor → click **"Publish"**

**3b. Via Firebase CLI (requires IAM access):**
```cmd
firebase deploy --only firestore:rules --project ai-studio-applet-webapp-8bc57
```
_(This fails if your account is not an Editor on the project — see Option B instead)_

---

## ✅ Option B — Create Your Own Firebase Project (10 minutes, recommended)

This gives you full ownership and control. You'll use `developer.yasas@gmail.com`.

### Step 1 — Create the project

1. Go to: https://console.firebase.google.com/
2. Click **"Add project"**
3. Name it: `amb-portfolio` (or anything)
4. Disable Google Analytics (optional)
5. Click **Create project**

### Step 2 — Enable Authentication

1. In your new project → **Build → Authentication → Get started**
2. Click **Google** provider → toggle **Enabled**
3. Set your email as the support email → **Save**
4. Go to **Settings** tab → **Authorized domains** → **Add domain** → type `localhost` → **Add**

### Step 3 — Create Firestore Database

1. **Build → Firestore Database → Create database**
2. Select **"Start in production mode"** (we'll deploy our rules)
3. Choose a location (e.g. `asia-south1` for Sri Lanka)
4. Click **Done**

### Step 4 — Get your Firebase config

1. **Project settings** (gear icon) → **Your apps** → **Add app** → Web app (`</>`)
2. Register the app (any nickname)
3. Copy the `firebaseConfig` object — you'll need these values

### Step 5 — Update `.env.local`

Open `C:\Users\asus tuf 15\Desktop\aad\.env.local` and fill in your values:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_DATABASE_ID=(default)
```

> **Note:** Set `VITE_FIREBASE_DATABASE_ID=(default)` — your personal project uses the default database,
> not a custom-named one like the AI Studio project.

### Step 6 — Deploy Firestore Rules via CLI

```cmd
firebase login
firebase deploy --only firestore:rules --project your-project-id
```

---

## ✅ Make Yourself Admin

Both options: when you first sign in with Google, your Firestore document will be created
with role `client`. To grant yourself `admin`:

**Via Firebase Console → Firestore:**
1. Go to: Firestore → Data → `users` collection
2. Find your user document (document ID = your uid)
3. Click the `role` field → change value from `client` to `admin`

**Or via Firebase CLI:**
```cmd
firebase firestore:update users/YOUR_UID role=admin --project YOUR_PROJECT_ID
```

> The email `yasaspalliyaguruge@gmail.com` is **hardcoded as admin** in the rules and AuthContext.
> If that's your sign-in email, you'll automatically get admin role.

---

## ✅ Seed Initial Availability (after login)

Once logged in as admin:
1. Go to `/admin-dashboard`
2. **Manage Availability** tab → pick a date
3. Click **"Generate Slots"** to create time slots

---

## Verification Checklist

- [ ] Authorized Domains includes `localhost`
- [ ] Google provider is enabled
- [ ] Firestore rules deployed (not default deny-all)
- [ ] `.env.local` updated (if using your own project)
- [ ] Dev server restarted after changing `.env.local`
- [ ] `GEMINI_API_KEY` set in `.env.local`
