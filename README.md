# Dragon Boat Festival Workspace

pnpm workspace for the Dragon Boat Festival activity apps.

## Apps

- `@dragon-boat/portal`: navigation portal.
- `@dragon-boat/lucky-draw`: Dragon Boat Festival lucky draw sub app, mounted at `/lucky-draw/`.
- `@dragon-boat/pan-chat`: persona chat sub app, mounted at `/chat/`.

## Scripts

```bash
pnpm install
pnpm dev
pnpm dev:chat
pnpm dev:all
pnpm build
pnpm type-check
```

## Chat app configuration

The chat backend reads persona material from `packages/pan-chat/data/profile.md` by default. You can point it to another file with `PAN_PROFILE_PATH`.

Set these environment variables before starting `pnpm dev:chat` or `pnpm dev:all`:

```bash
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

`LLM_BASE_URL` can be any OpenAI-compatible chat completions endpoint.

## Local routes

Start all apps together so the portal can proxy sub app routes:

```bash
pnpm dev:all
```

- Portal: `http://localhost:666`
- Lucky draw route: `http://localhost:666/lucky-draw/`
- Lucky draw dev server: `http://localhost:5173/lucky-draw/`
- Chat route: `http://localhost:666/chat/`
- Chat dev server: `http://localhost:5174/chat/`
