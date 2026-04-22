# 📧 Firebase Trigger Email Setup Guide

The code for booking an appointment already writes a new email document to the `mail` collection in your Firestore database. To actually SEND these emails to the patients and to yourself, you need to install the **Trigger Email from Firestore** extension.

Follow these steps exactly:

### Step 1: Get an App Password (if using Gmail)
If you want the emails to be sent from your Gmail account (`yasaspalliyaguruge@gmail.com`):
1. Go to your Google Account Manage page: https://myaccount.google.com/security
2. Enable **2-Step Verification** if you haven't already.
3. Search for **"App Passwords"** in the top search bar.
4. Create a new App Password named "Firebase Email".
5. Copy the 16-character password provided. Keep it safe.

### Step 2: Install the Extension
1. Go to the Firebase Extensions hub: [Trigger Email from Firestore](https://extensions.dev/extensions/firebase/firestore-send-email)
2. Click **Install in Firebase Console**.
3. Select your new project (`aadhilambiswas`).
4. Follow the setup wizard. You will be asked to configure the following variables:
   
   - **Email documents collection:** `mail`
   - **SMTP connection URI:**  
     If using the Gmail app password you just created, enter:
     `smtps://yasaspalliyaguruge%40gmail.com:YOUR_16_CHAR_APP_PASSWORD@smtp.gmail.com:465`
     *(Replace `YOUR_16_CHAR_APP_PASSWORD` with the password from Step 1, without spaces)*
   - **Default FROM address:** `Aadhila M. Biswas <yasaspalliyaguruge@gmail.com>`
   - **Users collection:** (Leave blank)
   - **Templates collection:** (Leave blank)

5. Click **Install Extension** and wait for it to deploy (takes about 3-5 minutes).

### Step 3: Test It!
1. Go to your local website `http://localhost:3000`.
2. Ensure you have generated slots from the Admin Dashboard.
3. Book an appointment. 
4. Check your inbox! The extension will automatically detect the new document in the `mail` collection and trigger a real email to the patient.
