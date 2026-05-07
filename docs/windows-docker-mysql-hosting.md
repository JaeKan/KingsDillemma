# Windows Docker + MySQL Hosting

This project can now run without Netlify by serving the Vite build and the same `/api/agenda` contract from a Node server backed by MySQL.

## What Is Preserved

- Same frontend route and same-origin API path: `/api/agenda`.
- Same JSON request/response shapes for `GET`, `login`, `logout`, `reset`, `discard`, `choose`, `saveInventory`, `saveHouseProgress`, `calculateFinalScores`, and `endSession`.
- Same `kd_agenda_session` HttpOnly cookie behavior.
- Same production reset-code rule: set `LOGIN_CODE`, otherwise reset is disabled in production.
- Same static cache intent: fingerprinted `/assets/*` are immutable, HTML is revalidated.
- Same game-state model: one canonical `GameState` JSON document, now stored in MySQL table `agenda_game_state`.

## Run Locally With Docker

1. Install Docker Desktop for Windows and start it.
2. If Docker Desktop or WSL was just installed, restart Windows before starting the stack.
3. Copy `.env.docker.example` to `.env`.
4. Replace `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `LOGIN_CODE` in `.env`.
5. Start the stack:

```powershell
docker compose up --build -d
```

6. Open `http://localhost:3000`.

Other devices on the same LAN can use `http://<windows-host-ip>:3000` if Windows Firewall and router rules allow it. A domain is only required for the optional Caddy HTTPS overlay.

Useful commands:

```powershell
docker compose logs -f web
docker compose ps
docker compose down
```

Do not run `docker compose down -v` unless you intentionally want to delete the MySQL game-state volume.

## Production Notes

- Put the Windows host behind HTTPS before real players use it. Netlify provided HTTPS automatically; Docker does not.
- For a domain with built-in Caddy HTTPS, set `DOMAIN` in `.env`, point DNS to the Windows host, then run:

```powershell
docker compose -f docker-compose.yml -f docker-compose.https.yml up --build -d
```

- If you use Caddy or another reverse proxy, set `APP_PORT=127.0.0.1:3000` in `.env` if you want the Node app port bound only to localhost.
- You can also use Nginx Proxy Manager, Cloudflare Tunnel, or a router-level TLS terminator instead of the included Caddy overlay.
- If the app is behind a proxy, forward `X-Forwarded-Proto: https`; the Node server trusts proxy headers so secure cookies are set correctly.
- Keep MySQL unexposed to the public internet. The compose file only exposes the web service by default.
- Back up the `mysql-data` Docker volume before Windows or Docker maintenance.

## Import Existing State

Netlify Blob data is not automatically copied into MySQL. If you have an exported `active-game.json`, import it with:

```powershell
$env:MYSQL_HOST="127.0.0.1"
$env:MYSQL_PORT="3306"
$env:MYSQL_DATABASE="kings_dilemma"
$env:MYSQL_USER="kings_dilemma"
$env:MYSQL_PASSWORD="<your password>"
npm run mysql:import -- .\active-game.json
```

If you need the current production Netlify Blob state and do not already have it as JSON, export must be done from Netlify with credentials or a temporary admin export path before shutting Netlify down.
