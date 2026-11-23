# Piano Roulette — Version 1.0

A personal, responsive web app / installable PWA for randomly choosing piano songs without repeats.
Example: https://andreas-braz.github.io/piano-roulette/

## Features

- Random selection without repeats until reset
- Selection history stored in Supabase, shared across devices
- Reset the current round at any time
- Add, edit and delete songs
- CSV import and export
- Search and filter by book
- Statistics: total, selected, remaining, and per-book progress
- Email/password authentication
- PWA install support

## What's inside?

- **index.html** - 	Application interface
- **styles.css** - 	Design and responsive layout
- **app.js** -  Application logic
- **supabase-setup.sql** - 	Database creation
- **manifest.webmanifest** -  Android installation
- **sw.js** -  PWA service worker
- **README.md** -  Setup instructions
- **assets/icon.svg** -  Application icon

## 1. Create the Supabase database

1. Create a free project at https://supabase.com/.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run all of `supabase-setup.sql`.
4. Open **Project Settings → API** (or the API keys section).
5. Copy the **Project URL** and the **anon / publishable public key**.

Never put the `service_role` or secret key in browser code.

## 2. Configure the app

Open `app.js` and replace:

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

with the Project URL and anon/public key from your Supabase project.

## 3. Run locally

The app uses ES modules, so open it through a local web server rather than double-clicking `index.html`.

For example, with Python installed:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## 4. Create your account

- Use your email and a password of at least 6 characters.
- If email confirmation is enabled in Supabase Auth, confirm the email before signing in.
- For a personal app, you can disable email confirmation in **Authentication → Providers → Email** if you prefer simpler signup. Keep a strong password.

## 5. Publish it free with GitHub Pages

1. Create a private GitHub repository, for example `piano-roulette`.
2. Upload all project files and folders.
3. In repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Wait for GitHub Pages to publish the site.
5. In Supabase **Authentication → URL Configuration**, add your published site URL to **Site URL** and **Redirect URLs**. Also add `http://localhost:8000/**` for local testing.
6. Open the published HTTPS URL on Android Chrome. Use the browser menu → **Install app** or **Add to Home screen**.

A private GitHub repository can still publish a public GitHub Pages site depending on your GitHub plan and repository settings. The app itself is protected by Supabase login and database Row Level Security; do not store secrets in the frontend.

## CSV format

The first row must contain column headings. Required headings: `Song`, `Book`. Optional: `Artist`, `Number`.

```csv
Song,Artist,Book,Number
Island Song,Adventure Time,Book 1,12
Wonderwall,Oasis,Book 2,5
Let It Be,The Beatles,Book 3,18
```

CSV export uses the same column names.

## Notes / current MVP limitations

- The first version selects randomly in the browser from the songs not yet selected. A unique database constraint prevents the same song being selected twice across devices. If two devices pick at exactly the same time, one succeeds and the other is asked to try again.
- Reset clears the selection history, not the song library.
- Newly added songs are immediately eligible, even during an existing round.
- Deleting a song also removes its selection record.
- If the free Supabase project pauses due to inactivity, opening the app may take a little longer while the database wakes up.
