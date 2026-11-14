# Cardival (Vercel version)

```
cardival/
  api/        back end functions (cards, card, events, feedback, health)
  lib/        shared helper (util.js)
  public/     the website (index.html, admin.html, logos, icons)
  vercel.json routes
  package.json
```

## Settings (Vercel -> Project -> Settings -> Environment Variables)
| Name | What it does |
|---|---|
| `ADMIN_KEY` | Secret key for the /admin page (required) |
| `FEEDBACK_WEBHOOK_URL` | Optional Discord/Slack webhook: each feedback also arrives there |
| `CALENDAR_ICS_URLS` | Optional comma-separated iCal links for the "Coming up" section |
| `BLOB_READ_WRITE_TOKEN` | Added automatically when you connect a Blob store (Storage tab) |

The Blob store must be created as **Public**. Cards, photos and feedback are saved in it.

## Update the site
Edit files, then `git add .`, `git commit -m "message"`, `git push`. Vercel redeploys by itself.

## Notes
- Vercel's free (Hobby) plan is for non-commercial use.
- Requests to the API are limited to about 4.5 MB (4 photos of up to 450 KB each fit).
- Read feedback at https://YOUR-SITE/admin with your ADMIN_KEY.

## Adding cards and art
Cards live in `public/cards.json`. Put artwork in `public/cards/` and see `public/cards/README.txt`.
Visitors can also choose a text style (Clean, Round, Classic, all with Bangla support) and a text color.

## Link previews
`public/og.png` is the picture shown when the site link is shared. The address inside `public/index.html`
(`https://cardival.vercel.app/og.png`) must match your real domain.
