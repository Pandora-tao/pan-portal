# Dragon Boat Festival Workspace

pnpm workspace for the Dragon Boat Festival activity apps.

## Apps

- `@dragon-boat/portal`: navigation portal.
- `@dragon-boat/lucky-draw`: Dragon Boat Festival lucky draw sub app, mounted at `/lucky-draw/`.

## Scripts

```bash
pnpm install
pnpm dev
pnpm dev:all
pnpm build
pnpm type-check
```

## Local routes

Start all apps together so the portal can proxy sub app routes:

```bash
pnpm dev:all
```

- Portal: `http://localhost:666`
- Lucky draw route: `http://localhost:666/lucky-draw/`
- Lucky draw dev server: `http://localhost:5173/lucky-draw/`
