---
title: "ShelfLog — Project Scaffold"
slug: "shelflog-project-scaffold-reference"
status: active
category: infrastructure
priority: critical
owner: "east35"
phase: null
kind: null
sdd_lane: null
dependencies: []
tags: ["shelflog"]
updated_at: "2026-03-09T16:27:17.542305+00:00"
created_at: "2026-03-09T16:25:54.894529+00:00"
---
## ShelfLog — Project Scaffold Reference



## Stack

- **Runtime:** Node v25.2.1, npm v11.6.2
  - **Bundler:** Vite 6 + `@vitejs/plugin-react`
  - **Language:** TypeScript ~5.7 (strict mode)
  - **UI:** React 19
  - **Styling:** Tailwind CSS v4 (plugin-based via `@tailwindcss/vite` — no
  `tailwind.config.js`)
  - **Components:** shadcn/ui (Radix primitives)
  - **State:** Zustand v5
  - **Search:** Fuse.js v7

  ## Dependencies

  ### Runtime
  | Package | Version |
  |---|---|
  | react | ^19.0.0 |
  | react-dom | ^19.0.0 |
  | zustand | ^5.0.11 |
  | fuse.js | ^7.1.0 |
  | lucide-react | ^0.577.0 |
  | @radix-ui/react-select | ^2.2.6 |
  | @radix-ui/react-slot | ^1.2.4 |
  | class-variance-authority | ^0.7.1 |
  | clsx | ^2.1.1 |
  | tailwind-merge | ^3.5.0 |

  ### Dev
  | Package | Version |
  |---|---|
  | vite | ^6.2.0 |
  | @vitejs/plugin-react | ^4.3.4 |
  | tailwindcss | ^4.2.1 |
  | @tailwindcss/vite | ^4.2.1 |
  | typescript | ~5.7.2 |
  | @types/react | ^19.0.10 |
  | @types/react-dom | ^19.0.4 |
  | @types/node | ^25.3.5 |
  | eslint + plugins | ^9.21.0 |

  ## File Structure
  src/
    App.tsx                   # Shell UI (header, search, card list)
    main.tsx
    index.css                 # @import "tailwindcss"
    vite-env.d.ts
    types/index.ts            # Item, MediaType, Status, OwnershipSource
    data/seed.ts              # 10 real items from Yamtrack CSV
    store/useShelfStore.ts    # Zustand store + Fuse.js fuzzy search
    lib/utils.ts              # shadcn cn() utility
    components/ui/            # badge, button, card, input, select

  ## Config Notes
  - `vite.config.ts`: `@` alias → `./src`
  - `tsconfig.app.json`: paths `@/*` → `./src/*`, strict, noEmit
  - Tailwind v4: **no** `tailwind.config.js` — just `@import "tailwindcss"` in
  `index.css`
  - shadcn init: if `src/index.css` doesn't exist first, generated files use
  `@/` literally — move manually

  ## Scripts
  npm run dev       # vite dev server
  npm run build     # tsc -b && vite build
  npm run preview   # vite preview
  npm run lint      # eslint