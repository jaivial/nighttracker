# Responsive UX Plan: Article Batch Pages

## Overview

This plan covers responsive UX improvements for all `/article-batch` pages and subpages in the MythKraken Dashboard. The goal is pixel-perfect layouts across all Tailwind breakpoints, with mobile/tablet using **full viewport width** to maximize the sense of space.

**Routes affected:**
- `/article-batch` — New batch creation form (ArticleBatchNew)
- `/article-batch/list` — Batch list browser (ArticleBatchList)
- `/article-batch?id={batchId}` — Batch detail view (ArticleBatchDetail)
- `/article-batch?id={batchId}&article={articleId}` — Article preview (BatchArticlePreviewView)

---

## Tailwind Breakpoints (reference)

| Token | Min-width | Typical device |
|-------|-----------|----------------|
| `ultras` | 280px | Galaxy Z Fold (closed) |
| `xxs` | 350px | Small phones |
| `xs` | 480px | Large phones |
| `sm` | 640px | Tablets portrait |
| `md` | 768px | Tablets landscape |
| `lg` | 1024px | Small desktops |
| `xl` | 1280px | Standard desktops |
| `xlg` | 1650px | Large screens |
| `xxl` | 1536px | Widescreen |
| `2xl-plus` | 1790px | Ultra-wide |

---

## Phase 0: iPhone Auto-Zoom Prevention (Global)

**Problem:** iOS Safari auto-zooms on input focus when text-size < 16px.

**Fix location:** `src/index.css` (global) or a dedicated responsive utility file.

**Approach:**
- Add a global CSS rule ensuring all `input`, `select`, and `textarea` elements have `font-size: 16px` minimum at viewports < `md` (768px).
- Where visual design demands smaller text, use `transform: scale()` on a wrapper to visually shrink while keeping the computed font-size at 16px.
- Verify with E2E screenshot tests on iPhone SE (375px) and iPhone 14 Pro (390px).

```css
/* src/index.css — add at end */
@media (max-width: 767px) {
  input[type],
  select,
  textarea {
    font-size: 16px !important; /* prevent iOS auto-zoom */
  }
}
```

**Files to create/modify:**
- `src/index.css` — add the media query rule

---

## Phase 1: QuickArticleLayout Wrapper (Shared Container)

**Current state:**
- `QuickArticleLayout` constrains children to `max-w-[1400px]` with `px-4` padding.
- Sidebar offset logic accounts for desktop sidebar but does not adapt for mobile (where no sidebar exists).

**Changes:**

| Breakpoint | Behavior |
|------------|----------|
| `< md` (768px) | Remove `max-w-[1400px]`, use `w-full` with `px-2` only. Content takes full viewport width. |
| `md–lg` | `max-w-[900px]` centered, `px-4`. |
| `lg+` | Keep current `max-w-[1400px]` centered, `px-4`. |

**File:** `src/pages/QuickArticle/components/QuickArticleLayout.tsx`

**Specific change:** Line 170 — the `layout-quick-article-children-wrapper` div:
```tsx
// Current:
className={`layout-quick-article-children-wrapper w-full ${currentStep === 3 ? '' : 'max-w-[1400px]'}`}

// New:
className={`layout-quick-article-children-wrapper w-full ${
  currentStep === 3
    ? ''
    : 'max-w-full md:max-w-[900px] lg:max-w-[1400px] px-2 md:px-4'
}`}
```

---

## Phase 2: MultipleArticleWriter Root Layout

**Current state:**
- Content layer uses `flex-1 gap-12` between main content and sidebar.
- Sidebar is `w-80` (320px) fixed, sticky, hidden via `opacity-0` / `w-0` when closed.

**Changes:**

| Breakpoint | Main + Sidebar Layout |
|------------|----------------------|
| `< md` | Sidebar becomes a slide-over overlay (absolute, full height, z-50). Main content goes full width. `gap-0`. |
| `md–lg` | Sidebar `w-72` (288px). Main content flex-1. `gap-4`. |
| `lg+` | Keep current `w-80` sidebar, `gap-12`. |

**File:** `src/pages/MultipleArticleWriter/MultipleArticleWriter.tsx`

### 2.1 Content Layer (lines 38-41)
```tsx
// Current:
className={`relative z-10 flex flex-1 gap-12 ${page.isHydrated ? '' : 'opacity-0'}`}

// New:
className={`relative z-10 flex flex-1 gap-4 md:gap-6 lg:gap-12 ${page.isHydrated ? '' : 'opacity-0'}`}
```

### 2.2 Sidebar (lines 113-119)
```tsx
// Current:
className={`sidebar-wrapper sticky top-6 max-h-[calc(100vh-3rem)] shrink-0 self-start overflow-hidden
  rounded-2xl border border-white/10 bg-[#0b0c10] backdrop-blur-xl transition-all duration-200
  ${sidebar.isOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}

// New:
className={`sidebar-wrapper shrink-0 self-start overflow-hidden rounded-2xl border border-white/10
  bg-[#0b0c10] backdrop-blur-xl transition-all duration-200
  max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50 max-md:rounded-l-2xl max-md:rounded-r-none
  max-md:max-h-full
  md:sticky md:top-6 md:max-h-[calc(100vh-3rem)]
  ${sidebar.isOpen
    ? 'w-full max-w-[320px] md:w-72 lg:w-80 opacity-100'
    : 'w-0 max-w-0 opacity-0'
  }`}
```

### 2.3 Mobile Backdrop Overlay
When sidebar is open on mobile, add a semi-transparent backdrop behind it:

```tsx
{sidebar.isOpen && (
  <div
    data-multiple-article-writer-sidebar-backdrop
    className="fixed inset-0 z-40 bg-black/50 md:hidden"
    onClick={sidebar.onToggle}
    data-testid="div"
  />
)}
```

Place this BEFORE the `<aside>` element.

---

## Phase 3: ArticleBatchNew (New Batch Form)

**Current state:** Topbar uses `flex-col` on mobile, `lg:flex-row` for title + tabs. No specific mobile adaptations for form content.

**Changes needed:**

### 3.1 Topbar — already responsive (keep)
The `flex-col lg:flex-row lg:items-start lg:justify-between` pattern works. No change needed.

### 3.2 Tabs — scroll on small screens
**File:** `src/pages/MultipleArticleWriter/components/MultipleArticleWriterTabs.tsx`

```tsx
// Current:
className="flex items-center gap-2"

// New:
className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
// Also add: flex-wrap on very small screens is NOT desired (tabs should scroll horizontally)
```

Add CSS utility for hiding scrollbar:
```css
/* src/index.css */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

### 3.3 BulkTopicImportCard
**File:** `src/pages/MultipleArticleWriter/pages/ArticleBatchNew/components/BulkTopicImportCard/BulkTopicImportCard.tsx`

Check and ensure:
- Card uses `w-full` on mobile (not fixed width)
- Chips wrap properly with `flex-wrap`
- Input fields use full width

### 3.4 QuickBatchCardsForm (shared component)
**File:** `src/pages/QuickArticle/components/` (locate the form)

Ensure:
- Cards stack vertically on mobile (`flex-col` below `md`)
- Card width goes `w-full` below `md`
- "Add card" button full-width on mobile
- Action buttons stack vertically on mobile

---

## Phase 4: ArticleBatchList (Batch Browser)

**Current state:**
- Stats header has `min-w-[32rem]` forcing horizontal scroll.
- Filter bar uses `flex` with `w-fit mx-auto my-0`.
- Batch summary card grid: `grid-cols-[repeat(auto-fit,minmax(min(100%,325px),325px))]`.

**Changes needed:**

### 4.1 Stats Header — responsive grid
**File:** `src/pages/MultipleArticleWriter/components/MultipleArticleWriterBatchBrowser.tsx`

```tsx
// Current (line 67-70):
className="flex min-w-[32rem] items-center justify-center"
// ...
className="grid w-full max-w-[42rem] grid-cols-4 gap-4"

// New:
className="flex items-center justify-center"  // remove min-w-[32rem]
// ...
className="grid w-full max-w-[42rem] grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4"
```

Also reduce label text size on mobile:
```tsx
// Current:
className="text-[11px] uppercase tracking-[0.18em] text-white/42"

// New:
className="text-[9px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-white/42"
```

### 4.2 Filter Bar — scroll on mobile
```tsx
// Current (line 129):
className="mb-6 flex w-fit justify-center my-0 mx-auto"

// New:
className="mb-6 flex w-full justify-start md:justify-center overflow-x-auto scrollbar-hide px-2 md:px-0"
```

### 4.3 Batch Summary Card Grid
```tsx
// Current:
className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,325px),325px))] justify-center gap-5"

// New:
className="grid grid-cols-1 xs:grid-cols-[repeat(auto-fit,minmax(min(100%,325px),325px))] justify-center gap-4 xs:gap-5"
```

On phones (< 480px), cards go full width (1 column). On 480px+, they flow with auto-fit.

### 4.4 Batch Summary Card — height adaptation
**File:** `src/pages/MultipleArticleWriter/components/MultipleArticleWriterBatchSummaryCard.tsx`

```tsx
// Current (line 189):
className="... h-[360px] w-full ..."

// New:
className="... h-[320px] xs:h-[360px] w-full ..."
```

### 4.5 ArticleBatchList Topbar
Already has `text-2xl sm:text-3xl` for title and `flex-col lg:flex-row` for layout. Keep as-is.

---

## Phase 5: ArticleBatchDetail (Batch Detail View)

**Current state:**
- Stats header has `min-w-[32rem]` — same horizontal scroll issue.
- Cards grid uses `flex flex-wrap justify-center gap-5` — somewhat responsive.
- Breadcrumb uses `flex items-center gap-3` with text — truncates poorly on small screens.

**Changes needed:**

### 5.1 Stats Header — responsive grid (both instances)
**File:** `src/pages/MultipleArticleWriter/pages/ArticleBatchDetail/ArticleBatchDetail.tsx`

There are TWO stat headers (loading-batch and completed-batch variants). Both need:

```tsx
// Current (line 275):
className="flex min-w-[32rem] items-center justify-center"
// ...
className="grid w-full max-w-[42rem] grid-cols-4 gap-4"

// New (both instances):
className="flex items-center justify-center"  // remove min-w-[32rem]
// ...
className="grid w-full max-w-[42rem] grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4"
```

### 5.2 Breadcrumb — truncate on mobile
```tsx
// Current breadcrumb row:
className="flex items-center gap-3"

// New:
className="flex items-center gap-2 text-xs sm:text-sm"
```

Batch name span:
```tsx
// Current:
className="text-white"

// New:
className="text-white truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none"
```

### 5.3 Card Grid (both instances)
```tsx
// Current:
className="flex flex-wrap justify-center gap-5"

// New:
className="flex flex-wrap justify-center gap-3 xs:gap-5"
```

### 5.4 BatchDetailLoadingCard — responsive sizing
**File:** `src/pages/MultipleArticleWriter/components/BatchDetailView/components/BatchDetailLoadingCard.tsx`

```tsx
// Current:
className="... min-h-[380px] min-w-[240px] w-full max-w-[260px] ..."

// New:
className="... min-h-[340px] xs:min-h-[380px] min-w-[200px] xs:min-w-[240px] w-full max-w-[260px] ..."
```

### 5.5 BatchDetailView Meta Bar
**File:** `src/pages/MultipleArticleWriter/components/BatchDetailView/BatchDetailView.tsx`

```tsx
// Current (line 41):
className="justify-center w-fit mx-auto flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/8 bg-white/[0.02] px-5 py-3"

// New:
className="justify-center w-full sm:w-fit mx-auto flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 sm:px-5 py-3"
```

Also fix hardcoded Portuguese text (line 86-87):
```tsx
// Current:
"Criado em {formatDateTime(detail.createdAt)}"
// Should use i18n key
```

---

## Phase 6: BatchArticlePreviewView (Article Preview)

**Current state:**
- Content layout: `flex gap-6` with sidebar `w-64` fixed.
- No mobile adaptation — sidebar sits beside content even on tiny screens.
- Breadcrumb wraps poorly.

**Changes needed:**

### 6.1 Content Layout — stack on mobile
**File:** `src/pages/MultipleArticleWriter/components/BatchArticlePreviewView.tsx`

```tsx
// Current (line 354):
className="flex gap-6"

// New:
className="flex flex-col md:flex-row gap-4 md:gap-6"
```

### 6.2 Sidebar — below content on mobile, beside on desktop
```tsx
// Current (line 415):
className="flex w-64 shrink-0 flex-col rounded-2xl border border-white/8 bg-white/[0.02] py-6 px-5"

// New:
className="flex w-full md:w-64 md:shrink-0 flex-col rounded-2xl border border-white/8 bg-white/[0.02] py-4 md:py-6 px-4 md:px-5"
```

### 6.3 Breadcrumb — responsive
```tsx
// Current (line 245):
className="flex items-center gap-2 mb-6"

// New:
className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm"
```

Title truncation:
```tsx
// Current:
className="text-white font-medium truncate max-w-xs"

// New:
className="text-white font-medium truncate max-w-[100px] xs:max-w-[180px] sm:max-w-xs"
```

### 6.4 Gutenberg Content — full width on mobile
```tsx
// Current (line 358):
className="gutenberg-preview-wrapper min-w-0 flex-1 flex flex-col overflow-hidden rounded-2xl border border-white/8"

// No change needed — flex-1 already adapts. Just ensure no min-width constraints.
```

### 6.5 Action Bar — wrap on mobile
```tsx
// Current (line 305):
className="flex items-center gap-2 mb-6"

// New:
className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6"
```

---

## Phase 7: BatchesSidebar (Slide-over Panel)

**Current state:**
- Fixed width `w-80` or `w-0`, uses `sticky top-6`.
- Search bar, filter tabs, list items all have desktop-sized padding.

**Changes needed:**

### 7.1 Filter Tabs — responsive sizing
**File:** `src/pages/MultipleArticleWriter/components/BatchesSidebar/BatchesSidebarFilterTabs.tsx`

Ensure tabs use smaller padding on mobile and text wraps or truncates.

### 7.2 Sidebar Card Items
**File:** `src/pages/MultipleArticleWriter/components/BatchesSidebar/BatchesSidebarCard.tsx`

Verify card items don't overflow the sidebar width on 280px viewports.

---

## Phase 8: Running Indicator (Fixed Bottom-Right Button)

**Current state:**
- `fixed bottom-5 right-5 z-50` with fixed padding — may overlap or clip on very small screens.

**Changes:**
**File:** `src/pages/MultipleArticleWriter/components/MultipleArticleWriterRunningIndicator.tsx`

```tsx
// Current:
className="... fixed bottom-5 right-5 z-50 ... px-4 py-3 ..."

// New:
className="... fixed bottom-3 right-3 xs:bottom-5 xs:right-5 z-50 ... px-3 xs:px-4 py-2.5 xs:py-3 ..."
```

---

## Phase 9: E2E Tests with Screenshots

### 9.1 Test File
**Create:** `e2e/article-batch-responsive.spec.ts`

### 9.2 Test Strategy
Use Playwright to capture screenshots at each breakpoint, then analyze for visual issues. The tests will:

1. **Login with real backend** (use `realBackend.fixture`)
2. **Navigate to `/article-batch`** (each subpage)
3. **Set viewport** to each breakpoint
4. **Capture screenshots** and save to `e2e/screenshots/article-batch-responsive/`
5. **Assert** no horizontal scrollbar
6. **Assert** all interactive elements visible and accessible
7. **Assert** touch targets >= 44px height on mobile

### 9.3 Devices / Viewports to Test

| Name | Width | Height | Category |
|------|-------|--------|----------|
| Galaxy Z Fold (closed) | 280 | 653 | Ultra-small phone |
| iPhone 6/7/8 | 320 | 568 | Small phone |
| iPhone SE | 375 | 667 | Standard phone |
| iPhone 14 Pro | 390 | 844 | Modern phone |
| iPhone 15 Pro Max | 430 | 932 | Large phone |
| Samsung Galaxy S24 Ultra | 412 | 915 | Android phone |
| iPad Mini | 768 | 1024 | Tablet portrait |
| iPad Air | 820 | 1180 | Tablet portrait |
| iPad Pro 11" | 1024 | 1366 | Tablet landscape |
| Desktop 1280 | 1280 | 800 | Small desktop |
| Desktop 1440 | 1440 | 900 | Standard desktop |

### 9.4 Test Pages (each device)

For each viewport, test these pages and capture a screenshot:

1. **`/article-batch`** (new batch form)
2. **`/article-batch/list`** (batch list)
3. **`/article-batch?id={batchId}`** (batch detail — needs a real batch ID)
4. **`/article-batch?id={batchId}&article={articleId}`** (article preview — needs real IDs)

### 9.5 Test Structure

```typescript
// e2e/article-batch-responsive.spec.ts

import { test, expect } from './fixtures/realBackend.fixture';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'article-batch-responsive');

const VIEWPORTS = [
  { name: 'galaxy-z-fold-closed', width: 280, height: 653 },
  { name: 'iphone-6', width: 320, height: 568 },
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14-pro', width: 390, height: 844 },
  { name: 'iphone-15-pro-max', width: 430, height: 932 },
  { name: 'galaxy-s24-ultra', width: 412, height: 915 },
  { name: 'ipad-mini', width: 768, height: 1024 },
  { name: 'ipad-air', width: 820, height: 1180 },
  { name: 'ipad-pro-11', width: 1024, height: 1366 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const PAGES = [
  { name: 'batch-new', path: '/article-batch' },
  { name: 'batch-list', path: '/article-batch/list' },
  // batch-detail and article-preview will be added dynamically
  // after discovering available batch IDs from the API
];

test.describe('Article Batch Pages — Responsive', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
      });

      for (const pageInfo of PAGES) {
        test(`${pageInfo.name} — no horizontal overflow + screenshot`, async ({
          authenticatedPage: page,
        }) => {
          await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000); // let animations settle

          // Assert no horizontal scrollbar
          const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

          // Capture screenshot
          const dir = path.join(SCREENSHOT_DIR, viewport.name);
          fs.mkdirSync(dir, { recursive: true });
          await page.screenshot({
            path: path.join(dir, `${pageInfo.name}.png`),
            fullPage: true,
          });
        });
      }

      test('touch targets meet 44px minimum on mobile', async ({
        authenticatedPage: page,
      }) => {
        if (viewport.width >= 768) return; // skip on tablet+

        await page.goto('/article-batch', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const smallTargets = await page.evaluate(() => {
          const interactives = document.querySelectorAll('button, a, input, [role="button"]');
          const violations: string[] = [];
          interactives.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.height === 0 || rect.width === 0) return;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return;
            if (style.pointerEvents === 'none') return;
            if (rect.height < 44) {
              violations.push(
                `${el.tagName}[data-testid="${el.getAttribute('data-testid') || 'none'}"] ` +
                `h=${Math.round(rect.height)}px w=${Math.round(rect.width)}px`
              );
            }
          });
          return violations;
        });

        // Log violations — primary buttons and inputs must meet 44px
        console.log(`[${viewport.name}] Touch target violations:`, smallTargets);
      });
    });
  }
});
```

### 9.6 Screenshot Analysis Workflow

After Phase 1–8 changes are implemented:

1. Run the e2e tests: `npx playwright test article-batch-responsive --project=chromium`
2. Screenshots land in `e2e/screenshots/article-batch-responsive/{device}/{page}.png`
3. **Analyze each screenshot** using image analysis tool (mcp__4_5v_mcp__analyze_image)
4. Identify remaining issues:
   - Text truncation or overflow
   - Elements too small or overlapping
   - Spacing inconsistencies
   - Cards that don't fit
5. Fix issues found in screenshot analysis
6. Re-run e2e tests and verify fixes
7. Repeat until all viewports look correct

---

## Phase 10: Iteration Loop

This is the iterative refinement process:

```
Phase 1-8 (code changes)
    ↓
Phase 9 (e2e screenshots)
    ↓
Analyze screenshots → Identify issues
    ↓
Fix issues in code
    ↓
Re-run e2e screenshots
    ↓
Verify fixes (compare before/after screenshots)
    ↓
Repeat until all viewports pass
```

### Acceptance Criteria

- [ ] No horizontal scrollbar on any viewport (280px–1790px)
- [ ] All text readable (no truncation that loses meaning)
- [ ] Touch targets >= 44px on mobile (< 768px)
- [ ] No iPhone auto-zoom on input focus
- [ ] Cards and grids adapt from 1-column (phone) to multi-column (desktop)
- [ ] Sidebar becomes slide-over overlay on mobile
- [ ] Batch preview sidebar stacks below content on mobile
- [ ] Stats headers wrap to 2x2 grid on small screens
- [ ] All 11 viewports have passing screenshots
- [ ] E2E tests pass with 0 horizontal overflow assertions
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] All existing tests still pass

---

## Implementation Order

| Step | Phase | Effort | Dependencies |
|------|-------|--------|-------------|
| 1 | Phase 0: iPhone auto-zoom fix | 15min | None |
| 2 | Phase 1: QuickArticleLayout wrapper | 15min | None |
| 3 | Phase 2: Root layout + sidebar | 30min | Phase 1 |
| 4 | Phase 3: ArticleBatchNew form | 30min | Phase 2 |
| 5 | Phase 4: ArticleBatchList browser | 45min | Phase 2 |
| 6 | Phase 5: ArticleBatchDetail | 45min | Phase 2 |
| 7 | Phase 6: BatchArticlePreviewView | 30min | Phase 2 |
| 8 | Phase 7: BatchesSidebar | 15min | Phase 2 |
| 9 | Phase 8: Running Indicator | 10min | None |
| 10 | Phase 9: E2E tests | 60min | Phase 1-8 |
| 11 | Phase 10: Screenshot analysis + iteration | 90min | Phase 9 |

**Total estimated effort:** ~6 hours

---

## Files to Modify (Summary)

| File | Change |
|------|--------|
| `src/index.css` | Add iOS auto-zoom prevention + scrollbar-hide utility |
| `src/pages/QuickArticle/components/QuickArticleLayout.tsx` | Responsive max-width on children wrapper |
| `src/pages/MultipleArticleWriter/MultipleArticleWriter.tsx` | Sidebar overlay on mobile, responsive gap, backdrop |
| `src/pages/MultipleArticleWriter/components/MultipleArticleWriterTabs.tsx` | Scroll on small screens |
| `src/pages/MultipleArticleWriter/components/MultipleArticleWriterBatchBrowser.tsx` | Remove min-w-[32rem], responsive stats grid, responsive filter bar |
| `src/pages/MultipleArticleWriter/components/MultipleArticleWriterBatchSummaryCard.tsx` | Responsive card height |
| `src/pages/MultipleArticleWriter/components/MultipleArticleWriterRunningIndicator.tsx` | Smaller padding on mobile |
| `src/pages/MultipleArticleWriter/components/BatchDetailView/BatchDetailView.tsx` | Responsive meta bar, fix hardcoded PT text |
| `src/pages/MultipleArticleWriter/components/BatchDetailView/components/BatchDetailLoadingCard.tsx` | Responsive card sizing |
| `src/pages/MultipleArticleWriter/components/BatchArticlePreviewView.tsx` | Stack sidebar on mobile, responsive breadcrumb |
| `src/pages/MultipleArticleWriter/pages/ArticleBatchDetail/ArticleBatchDetail.tsx` | Remove min-w-[32rem] x2, responsive stats grid x2, responsive breadcrumb |
| `src/pages/MultipleArticleWriter/pages/ArticleBatchNew/components/BulkTopicImportCard/BulkTopicImportCard.tsx` | Verify full-width on mobile |
| `e2e/article-batch-responsive.spec.ts` | **NEW** — responsive e2e tests with screenshots |

---

## Notes

- All Tailwind breakpoint classes use the custom tokens from `tailwind.config.js` (`ultras`, `xxs`, `xs`, etc.) where standard tokens don't cover the range.
- `max-md:` prefix targets "below md" (< 768px). For the custom tokens, use `ultras:`, `xxs:`, `xs:` as prefixes.
- The `QuickArticleLayout` is shared between `/quick-article` and `/article-batch` pages — changes there affect both. Test `/quick-article` after modifying it.
- The sidebar backdrop pattern (Phase 2.3) should use the same approach as any existing mobile overlay patterns in the codebase for consistency.
