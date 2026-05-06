const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname !== "/") {
      return new Response("Not Found", { status: 404 });
    }

    const res = await fetch("https://api.thecatapi.com/v1/images/search");
    const [cat] = await res.json() as { url: string }[];

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
    }
    a {
      color: #7eb8f7;
      font-size: 1rem;
      text-decoration: none;
      padding: 0.6rem 1.4rem;
      border: 1px solid #7eb8f7;
      border-radius: 8px;
      transition: background 0.15s;
    }
    a:hover { background: rgba(126, 184, 247, 0.1); }
  </style>
</head>
<body>
  <h1>Random Cat</h1>
  <img src="${cat.url}" alt="A random cat photo" />
  <a href="/">Show another</a>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
