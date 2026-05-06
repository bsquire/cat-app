const { version } = await Bun.file("package.json").json();

async function randomCatUrl(): Promise<string> {
  const res = await fetch("https://api.thecatapi.com/v1/images/search");
  const [cat] = await res.json() as { url: string }[];
  return cat.url;
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/cat") {
      return new Response(JSON.stringify({ url: await randomCatUrl() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname !== "/") {
      return new Response("Not Found", { status: 404 });
    }

    const catUrl = await randomCatUrl();

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
      gap: 1.5rem;
      background: #0f0f1a;
      font-family: system-ui, sans-serif;
      padding: 2rem;
    }
    h1 { color: #e8e8f0; font-size: 2rem; letter-spacing: -0.02em; }
    img {
      max-width: min(90vw, 640px);
      max-height: 70vh;
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
      object-fit: contain;
      transition: opacity 0.3s;
    }
    img.loading { opacity: 0.4; }
    .timer {
      color: #888;
      font-size: 0.9rem;
    }
    .version {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      color: #444;
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <h1>Random Cat</h1>
  <img id="cat" src="${catUrl}" alt="A random cat photo" />
  <p class="timer">Next cat in <span id="countdown">10</span>s</p>
  <p class="version">v${version}</p>
  <script>
    const img = document.getElementById('cat');
    const countdown = document.getElementById('countdown');
    let seconds = 10;

    async function nextCat() {
      img.classList.add('loading');
      const res = await fetch('/api/cat');
      const { url } = await res.json();
      const next = new Image();
      next.onload = () => { img.src = url; img.classList.remove('loading'); };
      next.src = url;
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
