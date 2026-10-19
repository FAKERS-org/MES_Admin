# Workspace Rules & Guidelines

## Package Manager & Runtime (Bun)

This project strictly uses **Bun** (`bun`) as its JavaScript/TypeScript runtime and package manager.

- **Package Management:**
  - Always use `bun add <package>` instead of `npm install <package>` or `yarn add <package>`.
  - For dev dependencies: `bun add -d <package>`.
  - For removing dependencies: `bun remove <package>`.
  - To install existing dependencies: `bun install`.
  - **Do NOT** use `npm`, `npx`, `yarn`, or `pnpm`.
  - Maintain `bun.lock` as the single source of truth for dependencies. Do not generate or commit `package-lock.json`.

- **Executing Scripts & Binaries:**
  - Run development server: `bun run dev` (starts Next.js on port 3001).
  - Production build: `bun run build`.
  - Serve production build: `bun run start`.
  - Typecheck: `bun run typecheck` (`tsc --noEmit`).
  - OpenAPI schema generation: `bun run generate-api`.
  - Execute CLI packages: Use `bunx <command>` instead of `npx <command>`.

---

## Architecture & Conventions

- **Framework:** Next.js 15 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4.
  - Main configuration resides in `src/app/globals.css` using `@import "tailwindcss";` and `@theme inline`.
  - Fonts: Lexend (Latin) and Kantumruy Pro (Khmer) via `next/font/google`, mapped in `@theme inline` of `globals.css`.
- **State & Data Management:**
  - Server state: `@tanstack/react-query`.
  - Client state: `zustand`.
  - API requests: Typed API client with schema generated via `bun run generate-api`.
- **Backend Integration:**
  - Proxied via Next.js route handlers (`src/app/api/...`) to `MES_Api` (FastAPI) on port 8000.
  - JWT auth is handled server-side via `httpOnly` cookies.
