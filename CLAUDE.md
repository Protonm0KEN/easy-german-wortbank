# Easy German Wortbank

Static GitHub Pages site: one German study dashboard per Easy German video. Live at https://protonm0ken.github.io/easy-german-wortbank/

- Source is in `src/`. Built files (`index.html`, `lessons/*.html`, `assets/`) are committed, because Pages serves this branch as is.
- New video: add `src/lessons/lNN-topic.js` (copy the shape of `l01-post-office.js`, including `drills` with 2–3 sentences per verb), register it in `src/lessons/index.js`, then `npm install && npm run build`.
- Never rename lesson ids or entry keys: progress in the browser is keyed on them.
- Every lesson needs all tabs: Roadmap, Spickzettel, Verben, Training, Redemittel, Nomen & Adj., Grammatik, Goethe B2, Fehler, SRS, Fortschritt.
- Roadmap tasks are computed in `roadmap()` in `src/app.jsx` from progress in the other tabs; only reading tasks are ticked by hand.
- Each lesson file has `cheat`: 4–6 key takeaways in German for the Spickzettel.
