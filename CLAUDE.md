# Claude Code Rules

## 0. TDD Approach (Mandatory)

Always follow Test-Driven Development when implementing features or fixing bugs:

1. **Write failing tests first** - Before writing any code, write tests that describe the expected behavior
2. **Run tests** - Verify tests fail as expected
3. **Implement the code** - Write the minimum code needed to make tests pass
4. **Run tests again** - Verify all tests pass
5. **Refactor if needed** - Clean up code while keeping tests passing
6. **Never mark a task complete until all tests pass**

**Important:** Tests should be written in a separate test file following the project conventions (e.g., `.test.ts`, `.spec.ts`, `*.test.tsx`).

---

## 0.1 Git Branching & Pull Request Workflow (Mandatory)

This rule governs **how every code change lands in git** in this monorepo. It is **not optional**, overrides any older guidance below, and applies to every agent, skill, and ad-hoc edit.

This monorepo contains **two independent git repositories**:

| Repo                                | Path                          | GitHub remote                                |
|-------------------------------------|-------------------------------|----------------------------------------------|
| Frontend (`MythKraken.Dashboard`)   | `/var/www/kraken/Dashboard`   | `Myth-Developers/MythKraken.Dashboard`       |
| Backend  (`MythKraken.Backend`)     | `/var/www/kraken/Backend`     | `Myth-Developers/MythKraken.Backend`         |

**Before staging or committing anything**, identify which repo the file lives in (`git -C <path> rev-parse --show-toplevel`) and apply the matching policy below. Frontend and Backend are different repos with different histories — treat them as two parallel pipelines.

### Frontend (Dashboard) — commit directly, no PR required

- Allowed **only** when the current Dashboard branch matches the pattern `dev-week<N>-<month>` (e.g., `dev-week1-may`, `dev-week3-jun`).
- On a matching branch, frontend commits land directly on it. No feature branch, no PR.
- If the current branch does **not** match the pattern (e.g., `main`, a release branch, an unrelated feature branch), **STOP** and ask the user how to proceed before editing.
- The orchestrator's `pr-expert` step is a **no-op** for Dashboard-only tasks on a `dev-week<N>-<month>` branch — it just pushes the branch to `origin`.

### Backend (`MythKraken.Backend`) — feature branch + PR is MANDATORY

Any change to a file under `/var/www/kraken/Backend` (a.k.a. `MythKraken.Backend/`) **must** land via the following procedure. Direct commits to whatever the current parent branch is are **forbidden** — every change goes through a feature branch and a PR back to the parent.

> **The backend's parent branch can be ANY branch** — `main`, `dev`, `sprint/may-week1`, `fix/<...>`, `feat/<...>`, etc. The `dev-week<N>-<month>` pattern is **frontend-only**. Do **not** assume or enforce that pattern when working on the Backend; just capture whatever branch the user is on and use it as the PR base.

**Procedure (must run BEFORE the first edit to any backend file):**

1. **Capture the parent branch** — whatever branch the Backend repo is currently on. This is the branch the PR will target. It is **not** required to match any particular pattern:
   ```bash
   PARENT_BRANCH=$(git -C /var/www/kraken/Backend branch --show-current)
   # PARENT_BRANCH is whatever branch the user is on — could be `main`, `dev`,
   # `fix/article-batch-workspace-invariant`, `sprint/may-week1`, etc.
   ```
   Persist it (e.g., in `state.json.parentBranch` for orchestrator runs, or in your task notes for ad-hoc work) so the PR step can read it later.

2. **Create the feature branch** from the parent:
   ```bash
   # Naming: <type>/<short-kebab-description>-<YYYYMMDD>
   #   <type> ∈ { feat, fix, chore, refactor, docs, test }
   FEATURE_BRANCH="<type>/<short-description>-$(date +%Y%m%d)"
   git -C /var/www/kraken/Backend checkout -b "$FEATURE_BRANCH"
   ```

3. **Implement → test → commit** on the feature branch, following the TDD section (§0) and the Post-Task Error Checking section (§6) of this file. Track every commit SHA — they go in the PR body.

4. **Push and open the PR back to the parent branch:**
   ```bash
   git -C /var/www/kraken/Backend push -u origin "$FEATURE_BRANCH"
   gh -R Myth-Developers/MythKraken.Backend pr create \
     --base "$PARENT_BRANCH" \
     --head "$FEATURE_BRANCH" \
     --title "<type>(<scope>): <one-line summary>" \
     --body-file <pr-body.md>
   ```

5. **Never auto-merge.** The PR is opened for human review only.

### Mixed (frontend + backend changes in one task)

These are two independent repos — handle them as two parallel pipelines:

- Frontend commits → land directly on the active `dev-week<N>-<month>` branch.
- Backend commits → land on a NEW feature branch + open a PR to its parent branch.

Each repo gets its own PR (or no-PR) per the rules above. Do **not** try to combine them into one branch or one PR — they cannot share history.

### Hard prohibitions

- ❌ Never commit a backend change directly to `main`, `dev-*`, or any long-lived branch. Backend changes always go through a feature branch + PR.
- ❌ Never force-push any branch. If a history rewrite seems necessary, ask the user.
- ❌ Never auto-merge a PR. PRs are opened for human review.
- ❌ Never push to a branch you didn't create unless the user explicitly authorized that branch in the current scope.
- ❌ Never skip this section to "save time" — the rule applies even for one-line backend fixes.

### How the orchestrator handles this

The `mythkraken-orchestrator` pipeline is repo-aware:

- **Phase 0 (pre-flight):** detect the touched repos from the task scope. For each touched backend repo, run "Capture parent branch + create feature branch" **before Phase 4 (EJECUTAR)**. Persist `parentBranch` and `featureBranch` to `state.json`.
- **`pr-expert` (final step):**
  - Dashboard touched, on `dev-week<N>-<month>` → just `git push origin <branch>`. No PR.
  - Backend touched → open PR with `head=<featureBranch>`, `base=<parentBranch>`. Title: `<type>(<scope>): <summary>`.
  - Both touched → both pipelines run; one PR per touched repo (Dashboard's may be skipped per the rule above).

If you (Claude) are working **outside the orchestrator** (ad-hoc edits, bug fix, doc tweak), you are still bound by these rules — apply them manually before editing.

---

## Specialized Agents (Mandatory Usage)

When working on specific domains, you MUST invoke the appropriate specialized agent to get expert guidance:

### 1. UI/UX Design Expert

**When to call**: For any task involving UI design, styling, responsive layouts, CSS, visual components, animations, or user experience improvements.

**Agent**: `ui-ux-designer-expert`

**Examples**:
- Creating or modifying visual components
- Working with CSS, Tailwind, or styling libraries
- Responsive design implementations
- Color schemes, typography, or visual themes
- Animations and transitions
- Layout design and structure

### 2. Senior React Developer (Atoms/Components)

**When to call**: For any React development task, especially those involving component architecture, atomic design, hooks, or state management.

**Agent**: `senior-react-developer`

**Examples**:
- Creating new React components
- Implementing hooks or custom hooks
- Component composition and architecture
- State management solutions
- React performance optimization
- TypeScript with React patterns

### 3. Senior C# Developer

**When to call**: For any task involving C# code, .NET development, backend services, APIs, or C#-specific implementations.

**Agent**: `senior-csharp-developer`

**Examples**:
- Backend API development in C#
- Entity Framework or database operations
- C# class libraries or services
- .NET Core/5+ applications
- C# best practices and patterns

**Important**: Always spawn the appropriate specialized agent using the Task tool with `subagent_type: general-purpose` and provide detailed context about the task. Do not attempt to solve domain-specific expert tasks without consulting the relevant agent first.

## 1. Data Attributes for DOM Elements

For every `div` or HTML element, add a `data-` attribute with a unique and meaningful identifier. This enables quick element location and easier refactoring.

```tsx
// Instead of:
<div className="container">...</div>

// Use:
<div data-article-viewer-container className="container">...</div>
```

Use kebab-case for the attribute value and make it descriptive of the component's purpose and location. For nested elements, include parent context:

```tsx
<div data-article-viewer-sidebar>
  <div data-article-viewer-sidebar-item>...</div>
  <div data-article-viewer-sidebar-content>...</div>
</div>
```

## 2. Universal Component Folder Structure

**Every** tsx component (pages, functional components, UI components, feature modules) must live in its own folder with the same name as the component. This applies universally across the entire codebase.

### Folder Template (Applies to All Components)

```
src/[location]/[ComponentName]/
├── [ComponentName].tsx     # Main component (entry point)
├── types.ts                # All TypeScript interfaces/types for this component
├── constants.ts            # Static constants (config values, enum maps, etc.)
├── hooks/                  # Custom hooks containing business logic
│   ├── use[ComponentName].ts
│   └── use[SubLogic].ts
├── atoms/                  # Atomic/primitive elements (smallest building blocks)
│   ├── Badge.tsx
│   └── IconWrapper.tsx
├── helpers/                # Utility functions (pure functions, no React/hooks)
│   ├── formatDate.ts
│   └── validation.ts
├── ui/                     # Sub-components that are presentational/internal
│   ├── SubComponent.tsx
│   └── AnotherSub.tsx
└── components/             # Child components that are more complex features
    ├── ChildFeature/
    │   ├── ChildFeature.tsx
    │   ├── types.ts
    │   ├── constants.ts
    │   ├── hooks/
    │   ├── atoms/
    │   ├── helpers/
    │   ├── ui/
    │   └── components/
    └── AnotherChild/
        └── AnotherChild.tsx
```

### Layer Types

| Layer | Folder | Purpose | Contains Logic |
|-------|--------|---------|---------------|
| Atoms | `atoms/` | Atomic/primitive elements (smallest building blocks: badges, icons, labels) | No |
| UI | `ui/` | Sub-components that are presentational/internal | No |
| Components | `components/` | Child feature components with complex logic | No (via hooks) |
| Hooks | `hooks/` | All business logic (state, effects, callbacks) | Yes |
| Helpers | `helpers/` | Pure utility functions (no React/hooks) | No |
| Constants | `constants.ts` | Static values (config, enum maps, defaults) | No |
| Types | `types.ts` | TypeScript interfaces and type aliases | N/A |

### Rules

1. **One component per folder** - Each component (`.tsx` file) lives in its own folder matching its name
2. **No flat files** - Never create `.tsx` files directly in `components/`, `pages/`, or `ui/` directories
3. **Types in parent folder** - All interfaces for a component go in the component's `types.ts`, not in the component file
4. **Business logic in hooks** - All state, effects, callbacks, and logic go in `hooks/`
5. **UI layer is pure** - Components in `ui/` folders must be presentational only (no hooks, no state)
6. **Atoms are the smallest blocks** - Components in `atoms/` are pure primitives (single HTML elements or very simple compositions)
7. **Helpers are pure functions** - No React imports, no hooks, just utility logic
8. **Constants are static** - No runtime logic, just configuration values and enum mappings
9. **Component layer uses hooks** - Components in `components/` folders get logic via hooks from their parent's `hooks/` folder
10. **Hierarchical structure** - Child components follow the same pattern recursively
11. **File line limits** - Keep files focused and small:
    - **TSX files**: Maximum **800 lines**. If a component exceeds this, split it into smaller sub-components or extract logic into hooks/helpers.
    - **All other files** (`.ts`, `.tsx`, `.css`, etc.): Maximum **300 lines**. If a file exceeds this, split it into multiple focused files (e.g., split `useUser.ts` into `useUserProfile.ts`, `useUserSettings.ts`).

### When to Split a File

When a file approaches the line limit, split by responsibility:

| File Type | Split Criteria |
|-----------|----------------|
| `hooks/*.ts` | Split by state domain (e.g., `useUserAuth.ts`, `useUserPreferences.ts` instead of one `useUser.ts`) |
| `types.ts` | Split into domain-specific type files (e.g., `types/user.ts`, `types/article.ts`) |
| `constants.ts` | Split by feature or constant category (e.g., `constants/theme.ts`, `constants/config.ts`) |
| `helpers/*.ts` | Already one function per file — if >300 lines, the function is doing too much — break it down |
| `tsx` components | Extract presentational sub-components to `ui/` or `components/`, extract logic to `hooks/` |

### Splitting Example

```typescript
// ❌ BAD: useArticle.ts (450 lines — over limit)
// Contains: user state, editor state, article data, comments, tags, categories, images, SEO...

// ✅ GOOD: split into focused hooks
src/pages/Article/hooks/
├── useArticle.ts           // Article CRUD, loading, error handling (~150 lines)
├── useArticleEditor.ts     // Editor state, autosave, undo/redo (~200 lines)
├── useArticleComments.ts   // Comment fetching, posting, moderation (~120 lines)
├── useArticleTags.ts       // Tag management, autocomplete (~80 lines)
├── useArticleSEO.ts        // Meta, keywords, readability score (~100 lines)
└── useArticleImages.ts     // Image upload, gallery, optimization (~140 lines)
```

```tsx
// ❌ BAD: ArticleHeader.tsx (950 lines — over limit)
// Contains: title, author, metadata, actions, toolbar, share buttons, status badge...

// ✅ GOOD: extract into child components
src/pages/Article/components/ArticleHeader/
├── ArticleHeader.tsx       // Layout wrapper, composition (~50 lines)
├── types.ts
├── hooks/
│   └── useArticleHeader.ts
├── atoms/
│   ├── StatusBadge.tsx     // (~30 lines)
│   └── ShareButton.tsx     // (~40 lines)
└── ui/
    ├── TitleDisplay.tsx     // Title rendering, editing (~80 lines)
    ├── AuthorMeta.tsx       // Author info, avatar, date (~100 lines)
    ├── HeaderToolbar.tsx    // Action buttons, dropdowns (~150 lines)
    └── MetadataBar.tsx     // Tags, category, read time (~120 lines)
```

### Example: UI Component (GlassCard)

```
src/components/ui/GlassCard/
├── GlassCard.tsx           # Main component
├── types.ts                # GlassCardProps interface
├── constants.ts            # Animation durations, default class mappings
├── hooks/                  # (empty if purely presentational)
├── atoms/                  # Internal atomic elements
│   └── GlassBorder.tsx
├── helpers/                # (empty if purely presentational)
└── components/             # (empty or contains internal sub-components)
```

```tsx
// src/components/ui/GlassCard/GlassCard.tsx
import type { GlassCardProps } from './types';

export function GlassCard({ children, className = '', 'data-testid': testId }: GlassCardProps) {
  return (
    <div
      data-glass-card
      data-testid={testId}
      className={`glass-card ${className}`}
    >
      {children}
    </div>
  );
}
```

```typescript
// src/components/ui/GlassCard/types.ts
export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}
```

```typescript
// src/components/ui/GlassCard/constants.ts
export const GLASS_CARD_ANIMATION_DURATION = 300;
export const DEFAULT_GLASS_CLASS = 'glass-card-default';
```

### Example: Page Component (Article)

```
src/pages/Article/
├── Article.tsx             # Page component (entry point)
├── types.ts                # Article, Author, ArticleStatus interfaces
├── constants.ts            # Article status values, pagination defaults
├── hooks/
│   ├── useArticle.ts
│   └── useArticleEditor.ts
├── atoms/
│   ├── ArticleStatusBadge.tsx
│   └── AuthorAvatar.tsx
├── helpers/
│   ├── formatDate.ts
│   └── articleValidation.ts
├── ui/
│   ├── ArticleMeta.tsx
│   └── ArticleStats.tsx
└── components/
    ├── ArticleEditor/
    │   ├── ArticleEditor.tsx
    │   ├── types.ts
    │   ├── constants.ts
    │   ├── hooks/
    │   │   └── useArticleEditor.ts
    │   ├── atoms/
    │   │   └── EditorToolbarButton.tsx
    │   ├── helpers/
    │   │   └── wordCount.ts
    │   └── ui/
    │       └── EditorToolbar.tsx
    └── ArticleHeader/
        ├── ArticleHeader.tsx
        ├── types.ts
        ├── constants.ts
        ├── hooks/
        │   └── useArticleHeader.ts
        ├── atoms/
        │   └── Title.tsx
        ├── helpers/
        │   └── seoScore.ts
        └── ui/
            ├── TitleDisplay.tsx
            └── BackButton.tsx
```

### Example: Feature Component (DataGrid)

```
src/components/data-grid/DataGrid/
├── DataGrid.tsx            # Main component
├── types.ts
├── constants.ts            # Column type definitions, default sort orders
├── hooks/
│   ├── useDataGrid.ts
│   └── useDataGridFilters.ts
├── atoms/
│   ├── SortIndicator.tsx
│   └── FilterIcon.tsx
├── helpers/
│   ├── columnWidth.ts
│   └── filterOperators.ts
├── ui/
│   ├── DataGridToolbar.tsx
│   └── DataGridPagination.tsx
└── components/
    ├── DataGridTable/
    │   ├── DataGridTable.tsx
    │   ├── types.ts
    │   ├── constants.ts
    │   ├── hooks/
    │   │   └── useDataGridTable.ts
    │   ├── atoms/
    │   │   └── TableRow.tsx
    │   ├── helpers/
    │   │   └── rowSelection.ts
    │   └── ui/
    │       └── TableCell.tsx
    └── DataGridColumnHeader/
        ├── DataGridColumnHeader.tsx
        ├── types.ts
        ├── hooks/
        │   └── useColumnSort.ts
        ├── atoms/
        │   └── SortIcon.tsx
        └── helpers/
            └── columnVisibility.ts
```

### When to Use Each Folder

- **`atoms/`** - Smallest building blocks: Badge, Icon, Label, Button, Avatar. Pure presentational, no hooks.
- **`ui/`** - Internal sub-components that are presentational but more complex than atoms. May compose multiple atoms.
- **`components/`** - Child features that have their own business logic, multiple states, or are complex enough to warrant their own folder structure.
- **`helpers/`** - Pure utility functions: formatting, validation, calculations. No React imports, no hooks.
- **`constants/`** - Static configuration: enum maps, default values, config objects. No runtime logic.

### Import Patterns

```tsx
// Imports from same component
import { type GlassCardProps } from './types';
import { GLASS_CARD_ANIMATION_DURATION } from './constants';
import { useGlassCardAnimation } from './hooks';
import { GlassBorder } from './atoms';
import { cn } from './helpers';

// Imports from parent
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassCardProps } from '@/components/ui/GlassCard/types';
import { useArticleEditor } from '../../hooks';
import { ARTICLE_STATUS_LABELS } from '../../constants';
import { formatDate } from '../../helpers';

// Cross-component imports
import { GlassCard } from '@/components/ui/GlassCard';
import { useDataGridFilters } from '@/components/data-grid/DataGrid/hooks';
```

## 5. Internationalization (i18n) for All Static Text

All static UI text (labels, buttons, messages, placeholders, tooltips) must use i18n. Text from API responses can be displayed directly without translation.

### Translation File Structure

Translations are scoped per feature/page and live in `frontend/src/locales/{namespace}/{lang}.json`:

```
frontend/src/locales/
├── common/          # Shared UI elements (buttons, labels, errors)
│   ├── en.json
│   ├── pt.json
│   └── ...
├── layout/          # Layout components (sidebar, header, footer)
│   └── ...
├── article/         # Article page and sub-components
│   └── ...
├── chat/            # Chat page
│   └── ...
└── [feature]/      # One namespace per feature/page
    └── ...
```

### Namespace Scoping Rules

Each component or page gets its own namespace. Map component folders to namespaces:

| Component Location | Namespace | Translation File |
|-------------------|-----------|-----------------|
| `@src/pages/Article/` | `article` | `frontend/src/locales/article/{lang}.json` |
| `@src/pages/ChatPage/` | `chat` | `frontend/src/locales/chat/{lang}.json` |
| `@src/components/ui/GlassCard/` | `ui` | `frontend/src/locales/ui/{lang}.json` |
| `@src/components/data-grid/` | `dataGrid` | `frontend/src/locales/dataGrid/{lang}.json` |
| `@src/layouts/` | `layout` | `frontend/src/locales/layout/{lang}.json` |
| Shared/common | `common` | `frontend/src/locales/common/{lang}.json` |

**Rule:** Never create a new namespace for a single component. If a component is small and its text is already covered by a parent namespace, use the parent's namespace instead.

### Key Naming Convention

Keys follow a dot-notation hierarchy: `{section}.{subsection}.{element}`

```
{namespace}.{section}.{subsection}.{element}
```

- **Namespace prefix** — matches the folder name
- **Section** — logical group (e.g., `header`, `form`, `errors`, `actions`)
- **Subsection** — subgroup (optional, for complex forms)
- **Element** — specific UI element (e.g., `title`, `placeholder`, `saveButton`)

```
"article.form.title": "Edit Article"
"article.form.fields.title.placeholder": "Enter article title"
"article.form.actions.saveButton": "Save"
"article.form.actions.cancelButton": "Cancel"
"article.errors.titleRequired": "Title is required"
```

### How to Use Translations

```tsx
// Use the useTranslation hook with the namespace
import { useTranslation } from 'react-i18next';

// In a component that maps to the "article" namespace
const { t } = useTranslation('article');

// In a shared/common component
const { t } = useTranslation('common');
```

### NEVER Show Literal Translation Keys

If a translation key is missing in a language file, the app must never display the raw key (e.g., `"article.form.title"`). Use these safeguards:

1. **Always provide English fallback** — Every key must exist in `en.json`. Other languages fall back to English.
2. **Register namespace in i18n.ts** — Add new namespaces to `frontend/src/i18n/i18n.ts` so they're loaded at startup:
   ```typescript
   // frontend/src/i18n/i18n.ts
   import enMyFeature from '../locales/myFeature/en.json';
   import ptMyFeature from '../locales/myFeature/pt.json';
   // ... other languages

   const resources = {
     en: { myFeature: enMyFeature },
     pt: { myFeature: ptMyFeature },
     // ...
   };
   ```
3. **Prefer explicit keys over fallback** — Don't use `t('key', { defaultValue: '...' })` to bypass missing keys. Add the key to `en.json` instead.
4. **Test in a non-English language** — Always verify translations render correctly in at least one non-English language before marking a task complete.

### Dynamic Values and Pluralization

```tsx
// Variables in translations: use {{variableName}} in the JSON
// JSON: "article.wordCount": "Word count: {{count}}"
// TSX:
t('article.wordCount', { count: 150 })

// Pluralization: use i18next count functionality
// JSON:
// "article.itemCount_one": "{{count}} item",
// "article.itemCount_other": "{{count}} items"
// TSX:
t('article.itemCount', { count: items.length })
```

### Shared vs Feature-Specific Text

| Text Type | Location | Example |
|-----------|----------|---------|
| Buttons (generic) | `common/` | `"common.buttons.save": "Save"` |
| Error messages (shared) | `common/` | `"common.errors.required": "This field is required"` |
| Page-specific labels | `{page}/` | `"article.sidebar.title": "Article Settings"` |
| Feature-specific messages | `{feature}/` | `"chat.messages.welcome": "Welcome to chat"` |
| Form placeholders | `{page}/` | `"article.form.title.placeholder": "Enter title..."` |
| From API response | Direct display | `article.title` (no translation) |

### Translation Workflow

1. Identify all static text in a component (no translation if data comes from API)
2. Determine the correct namespace (create new only if no existing namespace fits)
3. Add the key to `en.json` first (English is the source of truth)
4. Add the key with English fallback to all other language files
5. Register the namespace in `frontend/src/i18n/i18n.ts` if new
6. Use `t('namespace.key')` in the component
7. Test rendering in at least one non-English language

### Example

```tsx
// ❌ BAD: Hardcoded static text
<button>Save</button>
<span>Loading...</span>
<p>Are you sure you want to delete this item?</p>

// ✅ GOOD: Use i18n
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('article');

<button>{t('article.form.actions.saveButton')}</button>
<span>{t('common.status.loading')}</span>
<p>{t('common.confirmations.deleteItem')}</p>
```

```json
// frontend/src/locales/article/en.json
{
  "form": {
    "actions": {
      "saveButton": "Save",
      "cancelButton": "Cancel"
    }
  }
}

// frontend/src/locales/common/en.json
{
  "status": {
    "loading": "Loading..."
  },
  "confirmations": {
    "deleteItem": "Are you sure you want to delete this item?"
  }
}
```

## 6. Post-Task Error Checking (Mandatory - Language Agnostic)

After any task that involves file updates, changes, or new file creations:

1. **Identify the language(s)** - Determine what programming language(s) were modified
2. **Run lint check** - Execute the appropriate linter for each language (e.g., ESLint, RuboCop, Pylint, Clippy, etc.)
3. **Run type check** - Execute the type checker for the language (e.g., TypeScript `tsc`, Rust `cargo check`, Python type hints, etc.)
4. **Run build/compile** - Execute the build/compile command to verify no build errors
5. **Run tests** - Execute the test suite to verify all tests still pass
6. **Iterate and fix** - If any errors are found, fix them and repeat the checks
7. **Only mark task complete** - When all lint, type, and build checks pass without errors

**Language-specific examples:**
- **TypeScript/JavaScript**: `eslint`, `tsc --noEmit`, `npm run build`
- **Rust**: `cargo clippy`, `cargo check`, `cargo build`
- **Python**: `pylint`, `mypy`, `python -m py_compile`
- **Go**: `golangci-lint`, `go vet`, `go build`
- **Ruby**: `rubocop`, `ruby -c`
- **Java**: `checkstyle`, `javac`, `mvn compile`
- **C/C++**: `clang-tidy`, `gcc -Wall`, `make`

**Important:** This applies to all Write, Edit, and file creation operations. Never skip this verification step. Adapt the checks based on the specific language(s) involved in the task.

---

## 7. E2E Testing with Real Backend

### Dev infrastructure (systemd services — do NOT start/restart manually)

The local stack is managed by systemd. Never run `npm run dev`, `dotnet run`, or `cloudflared tunnel` manually — the services already exist:

| Service | Role | Port |
|---|---|---|
| `kraken-dashboard.service` | Vite dev server (Dashboard) | 5173 |
| `kraken-backend.service` | .NET API (`ASPNETCORE_ENVIRONMENT=Development`) | 5134 |
| `cloudflared-kraken.service` | Tunnel: `kraken.menustudioai.com` → :5173, `api-kraken-backend.menustudioai.com` → :5134 | — |
| `storybook.service` | Storybook | 6006 |
| `cloudflared-storybook.service` | Tunnel for Storybook | — |

**Mandatory pre-flight before any browser-driven test (Playwright spec OR live `flow-<name>-*` agent)**:

```bash
systemctl is-active kraken-dashboard kraken-backend cloudflared-kraken
# Expect three "active" lines. If any is not active, stop and report — do not auto-start anything.
journalctl -u kraken-backend -n 100 --no-pager      # backend logs
journalctl -u kraken-dashboard -n 100 --no-pager    # frontend logs
```

### MANDATORY manual login for live flow-test agents

Live test agents generated by `flow-test-builder` (`flow-<name>-validator` / `flow-<name>-auditor`) **must** perform login through the real `/auth/login` UI form using credentials from `.env.e2e`. **Forbidden**:

- Calling `POST /api/auth/login` directly and then injecting a session cookie.
- Skipping the login screen by pre-loading a `sid` cookie.
- Using auth mocks "to save time".

Reason: real auth is part of every user-flow. Bugs in the form, post-login redirect, middleware-ready signal, or automatic workspace selection only surface via real login. Also, agent-browser cannot inject `HttpOnly` cookies — UI login is the only functional path.

For Playwright `.spec.ts` files in `e2e/`, the `realBackend.fixture` (which calls `POST /api/auth/login` server-side and seeds the cookie) is allowed because that's a fixture for compiled tests, not a live user-simulating agent.

### Real Backend Session Fixture (Playwright .spec.ts only)

For E2E tests that need a real authenticated session (not mocked APIs), use the `realBackend.fixture`:

```typescript
import { test, expect } from './fixtures/realBackend.fixture';

test('my real backend test', async ({ authenticatedPage, authState }) => {
  // authenticatedPage has a real sid cookie from POST /api/auth/login
  // authState has userData, workspaces, sessionId
});
```

**Fixture location**: `frontend/e2e/fixtures/realBackend.fixture.ts`

**What it does**:
1. Reads credentials from `.env.e2e` (or `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` env vars)
2. Calls `POST /api/auth/login` against the real backend to get a valid `sid` session cookie
3. Seeds the browser context with the real `sid` cookie
4. Fetches user data and workspace list from the real backend
5. Sets `currentWorkspaceId` in localStorage to the first workspace

**Environment setup**: Create `frontend/.env.e2e` (gitignored):
```
E2E_TEST_EMAIL=user2@myth.com
E2E_TEST_PASSWORD=123123
E2E_BASE_URL=http://localhost:5134
E2E_FRONTEND_URL=http://localhost:5173
```

### Seeding Test Users via Database

If no suitable test user exists, use the MySQL connection from `MythKraken.Backend/appsettings.Secrets.json`:

```bash
# Read connection string from secrets
# Default: Server=localhost;Port=3306;Database=krakendb;Uid=root;Pwd=myth
mysql -u root -pmyth krakendb -e "
  INSERT INTO users (id, email, password_hash, firstname, lastname, access_flags, language)
  VALUES (UUID(), 'e2e-test@myth.com', '<bcrypt_hash>', 'E2E', 'Test', 18446744073709551615, 'pt-BR');
"
```

**How to find the connection string**: Read `MythKraken.Backend/appsettings.Secrets.json` → `ConnectionStrings.default`. Parse `Uid` and `Pwd` for MySQL auth.

**How to find or create a test user**:
1. Check existing users: `mysql -u root -pmyth krakendb -e "SELECT id, email, firstname FROM users LIMIT 10;"`
2. Create one if needed via `POST /api/auth/register` or direct DB insert
3. Ensure the user has workspace membership: `INSERT INTO workspace_members ...`

### E2E Test Conventions

- Use `realBackend.fixture` for tests that need real API responses (workspace guard, auth flows, data integrity)
- Use `base.fixture` with `mockApi` for isolated UI tests (no backend dependency)
- All E2E tests go in `frontend/e2e/*.spec.ts`
- Test fixtures are exported from `frontend/e2e/fixtures/index.ts`
- Capture and verify console logs to confirm guard/middleware execution paths

---

## 8. MythKraken Backend Rules (C#/.NET)

When working in the `MythKraken.Backend/` directory, also apply the following rules:

### Stack & Projects

- **Stack**: .NET 8, ASP.NET Core Web API, MySQL 8+ (RepoDb), SignalR, session-based auth with 2FA, OpenAI (GPT-4) / Cerebras
- **Solution (5 projects)**:

| Project | Role |
|---------|------|
| MythKraken.API | Presentation – controllers, hubs, middleware |
| MythKraken.Core | Domain – entities, interfaces, enums, no external deps |
| MythKraken.Data | Data access – repositories, migrations |
| MythKraken.Infra | Infrastructure – services, implementations |
| MythKraken.Connectors | External API clients (OpenAI, Serper, ScrapingBee, etc.) |

### Architecture – Layer Boundaries

- **Entities, interfaces, enums, DTOs** → MythKraken.Core (Models/, Interfaces/, Enums/)
- **Repository implementations** → MythKraken.Data (Repositories/, Repositories/Auth/, Repositories/ACL/)
- **Service implementations** → MythKraken.Infra (Services/, Tools/, Log/, Media/)
- **External API clients** → MythKraken.Connectors (one folder per connector)
- **Endpoints, hubs, middleware** → MythKraken.API (Controllers/, Hubs/, Middleware/)

**Dependency rules:**
- Core must not reference API, Data, Infra, or Connectors.
- API must not reference Data or Connectors directly for business types; use Core interfaces and DI.
- Only Infra, Data, and Connectors reference Core.

### C# Standards

- **Async**: Suffix async methods with `Async` (e.g. `GetByIdAsync`); prefer `ValueTask` when appropriate; avoid `async void` except for event handlers.
- **Nullability**: Use nullable reference types and `?`; avoid `#nullable disable` in new code.
- **Naming**: PascalCase for public members; interfaces with `I` prefix (e.g. `IAskAI`); DTOs with suffixes (Request, Response, Options, Model).
- **Error handling**: Do not swallow exceptions; log and rethrow or return a typed result.

### API Controllers

- Use `[ApiController]` and `[Route("api/[controller]")]`.
- Use `[RequireWorkspaceFlag(WorkspaceRoleFlags.*)]` for workspace-scoped actions.
- Use dedicated request/response models (Core.Models.Requests, Core.Models.Responses); do not expose entities as API contracts.
- Return `IActionResult` / `ActionResult<T>` with correct status codes; use `Ok()`, `Created()`, `BadRequest()`, `NotFound()`, `Unauthorized()`, `Forbid()`.

### Data Layer

- Use RepoDb for MySQL access (configured in DBManager via `UseMySql`).
- DBManager reads ConnectionStrings from IConfiguration; use `GetConnectionString(name)`.
- **Migrations**: `MythKraken.Data/migrations/` — `inst.sql` (initial), then `NNN_Description.sql`. Migrations run automatically on startup via MigrationManager. Do not change `inst.sql` arbitrarily.
- Repository interface in Core; implementation in Data/Repositories/.

### Connectors

- Pattern per connector: `*Client.cs` (HTTP client), `*Options.cs` (config from appsettings), `*Request.cs` / `*Response.cs` / `*Models.cs` for DTOs.
- Use `IOptions`/`IOptionsSnapshot` for configuration; do not hardcode API keys.
- Contract (e.g. `IAskAI`, `IScraper`) lives in Core; implementation in MythKraken.Connectors.
- **Existing connectors**: OpenAI, Cerebras, Serper, SearchAPI, SemRush, DataForSEO, ScrapingBee, BraveSearch, DepositPhotos, GoogleNaturalLanguage, Kernel, Recaptcha, DiscoverSnoop.

### Testing

- Use separate test projects (e.g. MythKraken.API.Tests) or `*.Tests/` folders; match the project under test.
- Test method names: descriptive (e.g. `MethodName_Scenario_ExpectedBehavior` or Given/When/Then).
- Prefer mocking Core interfaces (repositories, services); avoid duplicating business logic in tests.
- Integration tests: use dedicated config (e.g. `appsettings.Test.json`) and never point to production data.

### Post-Task Error Checking (C#/.NET)

After any backend task:
1. Run `dotnet build` to verify compilation
2. Run `dotnet test` to verify all tests pass
3. Iterate and fix any errors before marking complete

### E2E Testing with Real Backend

**Real Backend Session Fixture**: `frontend/e2e/fixtures/realBackend.fixture.ts`

- Authenticates via `POST /api/auth/login` to get a real `sid` session cookie
- Seeds browser context with real cookies, fetches user data and workspace list
- Credentials loaded from `frontend/.env.e2e` (gitignored) or `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` env vars
- Use for E2E tests that need real API responses, not mocked endpoints

```typescript
import { test, expect } from './fixtures/realBackend.fixture';
test('real backend test', async ({ authenticatedPage, authState }) => { ... });
```

**Seeding Test Users**: Use MySQL connection from `MythKraken.Backend/appsettings.Secrets.json` (`ConnectionStrings.default`):
- Default: `Server=localhost;Port=3306;Database=krakendb;Uid=root;Pwd=myth`
- Check users: `mysql -u root -pmyth krakendb -e "SELECT id, email FROM users;"`
- Create user via `POST /api/auth/register` or direct DB insert if needed
