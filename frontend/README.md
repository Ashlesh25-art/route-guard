# RouteGuard Frontend

React + Vite frontend scaffold for the RouteGuard operations platform.

## Run

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

## Environment

Copy `.env.example` and set values:

- `VITE_API_URL`
- `VITE_SOCKET_URL`

## Structure

- `src/config`: API and endpoint constants
- `src/context`: auth and socket providers
- `src/hooks`: shared hooks
- `src/dummy`: local fallback data
- `src/components`: UI building blocks
- `src/pages`: role-based pages
