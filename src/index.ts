import { createClient } from "redis";

const { version } = await Bun.file("package.json").json();

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST ?? "redis"}:6379`,
});
redis.on("error", (err) => console.error("Redis:", err.message));
await redis.connect();

const HISTORY_KEY = "cat:history";
const HISTORY_LIMIT = 20;

async function randomCatUrl(): Promise<string> {
  const res = await fetch("https://api.thecatapi.com/v1/images/search");
  const [cat] = await res.json() as { url: string }[];
  await redis.lPush(HISTORY_KEY, cat.url);
  await redis.lTrim(HISTORY_KEY, 0, HISTORY_LIMIT - 1);
  return cat.url;
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/cat") {
      const catUrl = await randomCatUrl();
      const history = await redis.lRange(HISTORY_KEY, 0, -1);
      return new Response(JSON.stringify({ url: catUrl, history }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname !== "/") {
      return new Response("Not Found", { status: 404 });
    }

    const catUrl = await randomCatUrl();
    const history = await redis.lRange(HISTORY_KEY, 0, -1);

    const thumbsHtml = history
      .map(u => `<img class="thumb" src="${u}" data-url="${u}" alt="previous cat" />`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Random Cat</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      background: #0f0f1a;
      font-family: system-ui, sans-serif;
      padding: 2rem 2rem 5rem;
    }
    h1 { color: #e8e8f0; font-size: 2rem; letter-spacing: -0.02em; }
    #cat {
      max-width: min(90vw, 640px);
      max-height: 60vh;
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.6);
      object-fit: contain;
      transition: opacity 0.3s;
    }
    #cat.loading { opacity: 0.4; }
    .timer { color: #888; font-size: 0.9rem; }
    .history {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: min(90vw, 640px);
    }
    .history-label { color: #555; font-size: 0.8rem; }
    .thumbs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }
    .thumbs::-webkit-scrollbar { height: 4px; }
    .thumbs::-webkit-scrollbar-track { background: #1a1a2e; }
    .thumbs::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
    .thumb {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: 8px;
      flex-shrink: 0;
      cursor: pointer;
      opacity: 0.65;
      transition: opacity 0.2s, transform 0.2s;
    }
    .thumb:hover { opacity: 1; transform: scale(1.08); }
    .version {
      position: fixed;
      bottom: 2rem;
      right: 1.5rem;
      color: #444;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <h1>Random Cat</h1>
  <img id="cat" src="${catUrl}" alt="A random cat photo" />
  <p class="timer">Next cat in <span id="countdown">10</span>s</p>
  <div class="history">
    <p class="history-label">Recent cats</p>
    <div class="thumbs" id="thumbs">${thumbsHtml}</div>
  </div>
  <p class="version">v${version}</p>
  <script>
    const catImg = document.getElementById('cat');
    const countdown = document.getElementById('countdown');
    const thumbs = document.getElementById('thumbs');
    let seconds = 10;

    function updateThumbs(history) {
      thumbs.innerHTML = history
        .map(u => \`<img class="thumb" src="\${u}" data-url="\${u}" alt="previous cat" />\`)
        .join('');
    }

    thumbs.addEventListener('click', e => {
      const u = e.target.dataset.url;
      if (u) { catImg.src = u; seconds = 10; countdown.textContent = seconds; }
    });

    async function nextCat() {
      catImg.classList.add('loading');
      const res = await fetch('/api/cat');
      const { url, history } = await res.json();
      const next = new Image();
      next.onload = () => { catImg.src = url; catImg.classList.remove('loading'); };
      next.src = url;
      updateThumbs(history);
      seconds = 10;
    }

    setInterval(() => {
      seconds--;
      countdown.textContent = seconds;
      if (seconds <= 0) nextCat();
    }, 1000);
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
