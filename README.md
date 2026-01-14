# node-red-helper

En enkel, selvhostet katalog med Node-RED oppskrifter og copy/paste-kode for Home Assistant.

## Innhold

- Ferdige oppskrifter (function node + node-liste).
- Kopierbare felter for Action node / Events node.
- Feilsøking for vanlige problemer (f.eks. actionable notifications).

## Kom i gang lokalt

```bash
python3 -m http.server --directory web 8080
```

Åpne `http://localhost:8080`.

## Docker (ZimaOS / Portainer)

Bygg lokalt:

```bash
docker build -t node-red-helper .
```

Kjør:

```bash
docker run --rm -p 8080:80 node-red-helper
```

Eller bruk compose:

```bash
docker compose up --build
```

Åpne `http://<server-ip>:8080`.

## Legg til flere oppskrifter

Oppdater listen i `web/app.js` og legg til flere `recipes`.
