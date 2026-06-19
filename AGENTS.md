# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React TypeScript app. The entry points are `index.tsx` and `App.tsx`, with route-level screens in `pages/`. Shared UI lives in `components/`, including GridRush-specific UI in `components/gridrush/`. Client state, Supabase access, data services, and domain logic are in `services/`, with GridRush logic grouped under `services/gridrush/`. Static assets are in `public/`, SQL schemas and migrations are in `database/` and `supabase/`, and maintenance scripts are in `scripts/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server on port `3000`.
- `npm run build`: create a production build and run TypeScript/Vite validation.
- `npm run preview`: serve the production build locally for verification.
- `npm run wealth-tax`: run `scripts/weekly-wealth-tax.ts` with `tsx`.

Create a local environment file from `.env.example` when needed. Browser-exposed variables use the `VITE_` prefix, such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Coding Style & Naming Conventions

Use TypeScript and React functional components. Name React components and page files in `PascalCase` (`GridRushGame.tsx`, `PlayerStats.tsx`), hooks with the `use` prefix, and services/stores in `camelCase` (`authStore.ts`, `gridrushService.ts`). Follow the existing style: single quotes, semicolons, JSX with Tailwind utility classes, and two-space indentation in most source files. Prefer the `@` alias for root imports when it improves readability.

## Testing Guidelines

There is currently no configured test runner or `npm test` script. For now, validate changes with `npm run build` and targeted manual checks in `npm run dev`. When adding tests, colocate them near the code or use a `tests/` directory, name files `*.test.ts` or `*.test.tsx`, and add the corresponding script to `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `Add hidden study tool page at /#/s route` and `Fix incorrect game rules on GridRush info page`. Keep commits focused and describe user-visible behavior or the bug fixed. Pull requests should include a brief summary, validation steps, linked issues when applicable, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Do not commit local secrets or `.env` files. Keep Supabase schema changes in `database/` or `supabase/migrations/` with clear filenames, and document any required environment variables or manual migration steps in the pull request.
