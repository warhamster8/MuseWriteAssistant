# Project Muse - Agent Guidance

## Build Commands
```bash
npm run dev      # Start dev server
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

## Architecture
- **Framework**: React 19 + TypeScript + Vite
- **State**: Zustand with localStorage persistence and Supabase sync
- **Editor**: TipTap (ProseMirror-based) for rich text editing
- **Storage modes**: Local mode (localStorage) or Cloud mode (Supabase)
- **AI providers**: Groq (default), DeepSeek, Gemini via `src/lib/aiService.ts`

## Key Entry Points
- `src/App.tsx` - Main app shell, routing between views
- `src/store/useStore.ts` - Global Zustand store
- `src/lib/supabase.ts` - Supabase client initialization
- `src/lib/aiService.ts` - AI provider routing

## Data Flow
- Scene content is HTML from TipTap editor
- AI suggestions are parsed via `src/lib/aiParsing.ts` using emoji markers (❌/✅)
- Apply suggestion: string replace `original` → `suggestion` in scene HTML
- **Multiline parsing**: Regex strips `^\d+\.\s*` from continuation lines to avoid number prefixes being applied

## API Keys (.env)
- **Critical**: `.env` is gitignored, do NOT commit secrets
- Keys with `VITE_` prefix are bundled into client - acceptable for anon keys but risky for server-side secrets
- Sensitive keys (deepseekKey, geminiKey, groqKey) are excluded from localStorage persistence

## Supabase Schema
- Tables: `projects`, `chapters`, `scenes`, `characters`, `world_entries`, `notes`
- Schema files: `supabase_init.sql`, `supabase_schema.sql` (committed)
- `supabase_setup.sql` is gitignored (local config)

## Common Issues
- **Suggestion number prefixes**: When AI returns `4. some text` across multiple lines, the `aiParsing.ts` strips `^\d+\.\s*` patterns - this was a known bug fixed with multiline regex cleanup
- **TipTap innerHTML**: Content is HTML, not plain text - use `getPlainTextForAI()` for AI processing
- **Local mode**: All data persists in localStorage via `src/lib/storage.ts`

## Code Conventions
- TypeScript strict mode enabled
- No ESLint/Prettier config - relies on IDE defaults
- CSS: Tailwind + CSS variables for theming (`var(--accent)`, `var(--bg-deep)`)
- Motion: Framer Motion for animations