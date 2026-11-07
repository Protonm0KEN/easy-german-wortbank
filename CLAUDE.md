# Easy German Wortbank

Static GitHub Pages site: one German study dashboard per Easy German video. Live at https://protonm0ken.github.io/easy-german-wortbank/

- Source is in `src/`. Built files (`index.html`, `lessons/*.html`, `assets/`) are committed, because Pages serves this branch as is.
- New video: add `src/lessons/lNN-topic.js` (copy the shape of `l01-post-office.js`, including `drills` with 2–3 sentences per verb), register it in `src/lessons/index.js`, then `npm install && npm run build`.
- Never rename lesson ids or entry keys: progress in the browser is keyed on them.
- Every lesson needs all tabs: Roadmap, Tagesmix, Spickzettel, Transkript, Verben, Training, Redemittel, Nomen & Adj., Grammatik, Goethe B2, Fehler, SRS, Fortschritt.
- Roadmap tasks are computed in `roadmap()` in `src/app.jsx` from progress in the other tabs, and every task runs inline in the Roadmap tab. Words, verbs and phrases are learned in fast, tap-only `LearnSession` packs (meet → recognise or listen → recall; verbs add a Perfekt choice; phrases use word tiles; no typing, no full conjugation tables; "I know it already" skips to one check). The student found typing and conjugation drills too slow, so keep Roadmap tasks quick. Learned items go into SRS for the next day.
- Each lesson file has `cheat` (4–6 German key takeaways for the Spickzettel), `ru` (Russian translation for every noun, adjective, verb and phrase, keyed by the German) and `img` (one emoji per noun, adjective and verb).
- Tagesmix (`buildMix`) mixes learned items, grammar and mistakes from all videos into one daily review. The study timer counts only active, visible time, and `pace()` predicts months for the target number of videos.
- Each lesson has `lesen`: a Goethe B2 Lesen set in the exam format (Teil 1–5, 30 items, gloss per Teil for tap-to-translate). See `src/lessons/l01-lesen.js`; new videos need their own set.
- `transcript` on a lesson is optional. Never invent one: use the real transcript the student pastes or sends. Without it, the Transkript tab lets the student paste it in the browser.
