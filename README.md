# Treeni Liukuri

Valmentajan ohjelma sisään, sarjat ulos — yksi näkymä salilla.

Training log PWA in English and Finnish. Vaadin 25 + Hilla (React) + Spring Boot 4, Java 21. All
training data stays in the browser (localStorage), so the installed app works offline. See
[SCOPE.md](SCOPE.md) for phases, data model, parser grammar and open questions.

## Screens

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/screens/tanaan.png" width="240" alt="Today"><br><b>Today</b> (Tänään)<br>Today's exercises with target and last result, set dots, rest timer, and one-tap <i>Same as last time</i>.</td>
    <td align="center" width="33%"><img src="docs/screens/sarja.png" width="240" alt="Set sheet"><br><b>Set</b> (Sarja)<br>Bottom sheet: weight ±2.5 kg, reps grid, last 3 sessions, <i>Log set · start rest</i>.</td>
    <td align="center" width="33%"><img src="docs/screens/muistio-flag.png" width="240" alt="Log"><br><b>Log</b> (Muistio)<br>Type like Notes (<code>Squat 80 9 8 10</code>), parsed live into weight × reps chips, with one-tap fixes.</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screens/kehitys.png" width="240" alt="Progress"><br><b>Progress</b> (Kehitys)<br>5-week training rhythm and trend lines for the main lifts with the next target.</td>
    <td align="center"><img src="docs/screens/ohjelma.png" width="240" alt="Program"><br><b>Program</b> (Ohjelma)<br><i>How do you feel today?</i>, this week's plan, the progression rules, and the language switch.</td>
    <td align="center" valign="middle"><b>Offline-first PWA</b><br>Install from the browser; all data stays on the device. Export as text or CSV.</td>
  </tr>
</table>

<sub>Screenshots of the production build with the built-in demo data.</sub>

### Suomeksi / Finnish

The app is fully available in Finnish. Finnish screenshots:
[Tänään](docs/screens/fi/tanaan.png) ·
[Sarja](docs/screens/fi/sarja.png) ·
[Muistio](docs/screens/fi/muistio-flag.png) ·
[Kehitys](docs/screens/fi/kehitys.png) ·
[Ohjelma](docs/screens/fi/ohjelma.png)

<p>
  <img src="docs/screens/fi/tanaan.png" width="120" alt="Tänään">
  <img src="docs/screens/fi/sarja.png" width="120" alt="Sarja">
  <img src="docs/screens/fi/muistio-flag.png" width="120" alt="Muistio">
  <img src="docs/screens/fi/kehitys.png" width="120" alt="Kehitys">
  <img src="docs/screens/fi/ohjelma.png" width="120" alt="Ohjelma">
</p>

## Languages

- English and Finnish UI (`src/main/frontend/lib/i18n.ts`, no extra dependencies).
- First launch follows the browser locale (`fi*` → Finnish, anything else → English). A manual
  choice in **Program → Language** is saved in localStorage and wins from then on.
- Numbers and dates follow the language (fi `82,5` · `Ke 14.10`, en `82.5` · `Wed 14 Oct`). The
  log parser accepts both `82,5` and `82.5` in either language.
- The coach text and CSV export follow the language. CSV keeps the Treenipäiväkirja column order:
  fi `päivämäärä;ab_viikko;treenityyppi;liike;sarja;toistot;kg;muistiinpanot` (`;`, decimal comma),
  en `date,ab_week,workout_type,exercise,set,reps,kg,notes` (`,`, decimal point).
- Demo data is localized and is re-created when you switch language. Your own entries are never
  translated.

## Requirements
- JDK 21+ (Maven comes with `./mvnw`)
- Node.js is optional: the Vaadin plugin downloads one to `~/.vaadin` when needed. Running the
  unit tests via `mvn test` uses `npx` from your PATH.

## Run (development)
```bash
./mvnw                       # = spring-boot:run, http://localhost:8080 (Vite hot reload)
```

## Tests
```bash
npm install && npx vitest run      # parser, plan paste, rules, export, i18n (54 tests)
./mvnw test                        # same tests from Maven (skip with -DskipTests)
```

## Production build
```bash
./mvnw -Pproduction package
java -jar target/treeni-liukuri-1.0-SNAPSHOT.jar      # PORT env var overrides 8080
```
The production build includes the PWA manifest and service worker (offline). Dev mode doesn't
register the service worker.

## Docker
```bash
docker build -t treeni-liukuri .
docker run -p 8080:8080 treeni-liukuri
```

## Deploy a test URL

### Fly.io (recommended)
`fly.toml` is included (region `arn` Stockholm, 512 MB, scales to zero when idle).
1. Create a Fly.io account and add a payment card (Fly asks for one even when usage stays small).
2. `curl -L https://fly.io/install.sh | sh && fly auth login`
3. `fly launch --copy-config --no-deploy` (pick a unique app name if `treeni-liukuri` is taken), then `fly deploy`
4. Open `https://<app>.fly.dev`. HTTPS is automatic, which the PWA install and the service worker need.

### Render (alternative, no card)
`render.yaml` is included. Render dashboard → New → Blueprint → connect the GitHub repo
(Render's GitHub app needs access to the repo). The free web service sleeps after
inactivity (~1 min cold start for a Spring Boot app).

## Data & privacy
Nothing leaves the device unless you tap **Send to coach** (Lähetä Valmentajalle; share/clipboard)
or download a CSV. There is no Google Sheets sync. That's a later, opt-in phase (the Treenipäiväkirja sheet
belongs to Valmentaja).

## License
MIT, see [LICENSE](LICENSE).
