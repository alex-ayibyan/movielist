# Ma Liste de Films

Een eigen filmlijst-website (Franstalig) die films opzoekt via [TMDB](https://www.themoviedb.org).
Je kunt alleen bestaande films toevoegen; poster, jaar, regisseur, speelduur, genres, cast,
land, score en beschrijving komen automatisch mee. Afvinken wat je gezien hebt kan met één klik.

Bestanden: `index.html`, `style.css`, `app.js`. Geen build-stap, geen server nodig.

## 1. TMDB-sleutel aanvragen (gratis)

1. Maak een account op https://www.themoviedb.org/signup
2. Ga naar **Settings → API** (https://www.themoviedb.org/settings/api) en vraag een sleutel aan
   (type "Developer", persoonlijk gebruik).
3. Kopieer de **API Key** (v3) of de **API Read Access Token** (v4). Beide werken.

De sleutel zet je straks in de website zelf via **Réglages**. Hij wordt alleen in je browser
bewaard en staat dus niet in je GitHub-repository.

## 2. Hosten op GitHub Pages

1. Maak op GitHub een nieuwe repository, bijvoorbeeld `filmlijst` (Public).
2. Upload `index.html`, `style.css`, `app.js` en `README.md`
   (**Add file → Upload files**, of met git):
   ```bash
   git init
   git add .
   git commit -m "Ma Liste de Films"
   git branch -M main
   git remote add origin https://github.com/<jouw-gebruikersnaam>/filmlijst.git
   git push -u origin main
   ```
3. Ga in de repository naar **Settings → Pages**.
   Kies bij *Source* **Deploy from a branch**, branch **main**, map **/ (root)**, en klik **Save**.
4. Na een minuutje staat je site op `https://<jouw-gebruikersnaam>.github.io/filmlijst/`.
5. Open de site, klik op **Réglages**, plak je TMDB-sleutel en klik **Enregistrer**.

## Goed om te weten

- **Opslag:** je lijst wordt in de browser opgeslagen (localStorage). Op een ander apparaat of
  in een andere browser begin je met een lege lijst. Gebruik **Exporter / Importer** in
  Réglages om je lijst te bewaren of over te zetten.
- **Browsergegevens wissen** wist ook je lijst. Exporteer dus af en toe een back-up.
- **Lokaal testen:** `python -m http.server 8000` in deze map, en open http://localhost:8000
- TMDB vraagt om bronvermelding; die staat onderaan de pagina.
