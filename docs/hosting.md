# Hosting

The whole of the host configuration is `vercel.json` at the repository root. It is short, and
both halves of it are load bearing, so this explains what each is for.

## The rewrite

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

The app is one page with client-side routing (`BrowserRouter` in `src/main.tsx`). The server has
no file at `/memorise`, so without this a request for that path is a 404.

That is not a theoretical problem. **An installed app relaunches at whatever screen it was last
on**, so the first person to close the app on the Memorise tab and open it the next morning would
be met with the host's 404 page. The rewrite hands every path the same document and lets the app
work out which screen it is.

Static files are matched before rewrites, so `/sw.js`, `/manifest.webmanifest`, the icons and
everything under `/assets/` are still served as themselves.

## The cache headers

Two rules, and they point in opposite directions on purpose.

**Everything, by default: revalidate.** `max-age=0, must-revalidate` lets the CDN hold a copy but
requires it to check before serving one. This is what `index.html` and `sw.js` need. If either
were cached hard, the update path would never fire: a phone with the app installed would keep
being handed the same `sw.js` it already had, decide there was nothing new, and stay on this
build permanently. There would be no way to reach it short of deleting and reinstalling the app.

**`/assets/*`: cache for a year, immutable.** Everything Vite writes there has a content hash in
its filename, so a changed file is a changed name and a name that exists never changes. This is
the four megabytes of corpus, so caching it hard is most of what makes a repeat visit instant.

The catch-all is listed first and the assets rule second, because the later match wins. If that
were ever to change, the failure is that hashed assets get revalidated too, which is slower and
still correct.

## Build settings

Vercel detects Vite and needs nothing set by hand. For the record:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
- Root directory: the repository root

## Netlify instead

Scope 12.1 names either. The equivalent `netlify.toml` would be a `[[redirects]]` block with
`from = "/*"`, `to = "/index.html"`, `status = 200`, plus two `[[headers]]` blocks carrying the
same two `Cache-Control` values. Nothing in the app knows which host it is on.
