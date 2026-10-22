# Cardival

Front end: `public/index.html` (+ `public/admin.html` for developers). Back end: `server.js` (Node + Express).

## Run on your computer
`npm install` then `npm start`, open http://localhost:3000

## Settings (environment variables on Render, or a `.env` file locally)
| Name | What it does |
|---|---|
| `ADMIN_KEY` | Secret key to read feedback at `/admin` |
| `DATA_DIR` | Folder for saved cards, photos and feedback (use a persistent disk) |
| `FEEDBACK_WEBHOOK_URL` | Optional Discord or Slack webhook: every feedback message also arrives there instantly |
| `CALENDAR_ICS_URLS` | Optional, comma-separated iCal links for the "Coming up" festivals section |

## Reading feedback (developers)
Open `https://your-site/admin`, type the `ADMIN_KEY`, click Load. You can download a CSV.
For a copy that survives restarts on free hosting, also set `FEEDBACK_WEBHOOK_URL`.

## Festivals from Google Calendar
The site reads iCal feeds and refreshes every 6 hours. To control it yourself: in Google Calendar open the calendar's
Settings, then "Integrate calendar", copy the "Public address in iCal format", and put it in `CALENDAR_ICS_URLS`.
Events you add there appear on the site automatically (the calendar must be public; repeating events are skipped).

## Photos
Photos are resized in the browser, stored in `DATA_DIR/photos`, and shown only on that card's share link.
