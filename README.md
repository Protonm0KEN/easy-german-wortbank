# Easy German Wortbank

German study dashboards built from Easy German videos, one page per video.

- `index.html` is the home page with all videos and shared flashcards.
- `lessons/` holds one dashboard per video.
- `assets/` holds the built app.
- `src/` holds the code. Each video is one file in `src/lessons/`.

To add a video, copy a lesson file in `src/lessons/`, add it to `src/lessons/index.js`, then run `npm install` and `npm run build`.

Progress is stored in the browser. Use Export progress and Import progress in Fortschritt to move it between devices.
