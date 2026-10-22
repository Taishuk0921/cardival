# Cardival

Static front end (`public/index.html`) + small Node/Express back end (`server.js`).
Back end: short card links (`/c/abc123`), feedback storage, rate limiting.

## Run it on your computer
1. Install Node.js 18+ (nodejs.org)
2. In this folder:  `npm install`  then  `npm start`
3. Open http://localhost:3000

Edit `WHATSAPP_NUMBER` at the top of the script in `public/index.html`.

## Read feedback
Copy `.env.example` to `.env` (or set the env vars on your host), then:
`curl -H "x-admin-key: YOUR_KEY" https://your-site/api/feedback`

## Put it online (not localhost)
**Easiest: Render.com / Railway.app**
1. Push this folder to a GitHub repo.
2. Create a "Web Service" from the repo. Build: `npm install`. Start: `npm start`.
3. Add env vars: `ADMIN_KEY`, and `DATA_DIR=/var/data`.
4. Attach a persistent disk mounted at `/var/data` (otherwise cards and feedback are erased on each redeploy).
5. Add your own domain in the host's settings. HTTPS is automatic.

**Your own VPS (Ubuntu)**
1. Install Node 20, then upload this folder and run `npm install`.
2. `sudo npm i -g pm2 && pm2 start server.js --name cardival && pm2 save && pm2 startup`
3. Install Nginx and proxy your domain to `http://127.0.0.1:3000`.
4. `sudo certbot --nginx -d yourdomain.com` for free HTTPS.

## Later
Swap the JSON files for SQLite/Postgres when traffic grows.
