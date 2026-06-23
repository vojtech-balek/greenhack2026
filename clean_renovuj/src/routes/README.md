# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory is a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or `app/layout.tsx` -- those are Next.js / Remix conventions. The only root layout is `src/routes/__root.tsx`.

## App Pages

- `__root.tsx` defines the root app shell, global providers, document head, not-found handling, and error handling.
- `index.tsx` is the main renovation flow at `/`, including address lookup, goals, property summary, financials, urgency, community, stakeholder personas, and distribution steps.
- `contact.tsx` is the contact page.
- `manifesto.tsx` is the manifesto page.
- `api/` contains server route handlers exposed under `/api/*`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic -- bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat -- read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell -- wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
