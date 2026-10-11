# ARISE — Real-Life Solo Leveling Website

Mobile-first habit/RPG dashboard with blue glow styling, email/password sign-in, cloud-synced progress, levels 1–100, E–S ranks, quests, stats, meals, sleep tracking, and achievements.

## Files
- `index.html` — app structure and sign-in screen
- `style.css` — responsive blue-glow interface
- `app.js` — quest logic and Firebase Auth/Firestore sync
- `firestore.rules` — user-private profile access rules

## Important
Cloud sync requires your own Firebase project. The app is **not connected until you add your Firebase web configuration**. Never share Firebase service-account credentials or private keys. The web config is intended for client apps; security comes from Authentication and Firestore rules.

## Setup from an Android phone

### 1. Create a Firebase project
1. Open https://console.firebase.google.com/ in Chrome.
2. Create a project, for example `arise-hunter-system`.
3. In Project settings, add a Web app (`</>` icon). Register it and copy the Firebase config object.

### 2. Enable sign-in
1. Firebase Console → Build → Authentication → Get started.
2. Open Sign-in method.
3. Enable **Email/Password** and save.

### 3. Create the database
1. Firebase Console → Build → Firestore Database → Create database.
2. Start in production mode.
3. Open Rules and replace the rules with the contents of `firestore.rules`, then Publish.

### 4. Add your Firebase config
1. Open `app.js` in a code editor.
2. Replace the placeholder values in `firebaseConfig` with the values from your Firebase web app.
3. Save the file.

### 5. Host it on HTTPS
Use a static host that supports HTTPS, such as GitHub Pages, Netlify, or Cloudflare Pages:
- Upload `index.html`, `style.css`, `app.js` to one repository/site.
- Do not upload service-account JSON files or private keys.
- Deploy the site. Open the HTTPS URL on your Android phone.
- In Firebase Authentication settings, add your deployed domain under **Authorized domains** if needed.

### 6. Use it across devices
Create an account on one device, then sign in with the same email/password on another device. The profile is stored in Firestore under that account's UID.

## XP and levels
- The daily quest list totals 100 XP.
- Lifetime XP determines level: every 100 lifetime XP advances one level, up to Level 100.
- Ranks: E (1–10), D (11–20), C (21–40), B (41–60), A (61–80), S (81–100).
- The app awards XP only when you check off a quest. Unchecking reverses that quest's XP.
- Meal logging is tracked separately from quest XP; the meal quests are the XP-bearing breakfast, lunch, and dinner items.
- Stat values start at 10 and increase/decrease when quests are checked/unchecked, bounded from 10 to 100.
- This is a personal habit tracker, not medical or fitness advice.

## Current limitations
- This is a practical starter app, not a production audited service.
- The profile is saved as one Firestore document. Keep data small.
- No password reset flow, social login, notifications, or admin console is included yet.
- For browser-module imports, run through a web server/HTTPS host; opening `index.html` directly as a local file may not work.
