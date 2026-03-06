# Post-Mortem: API Key Exposure & Application Data Failures
**Date:** 2026-03-06
**Severity:** High
**Status:** Resolved
**Author:** Engineering

---

## Summary

A Polygon.io API key was identified as potentially exposed in the Bloomberg Terminal application's git history. During the key rotation process, four related application defects were discovered and remediated: empty key writes due to shell variable scoping, market data failure across all endpoints caused by incorrect Next.js route configuration, news feed degradation to mock data, and loss of UI state on page refresh.

All issues have been fully resolved and verified in production.

---

## Timeline

| Time | Event |
|------|-------|
| T+00 | Polygon API key exposure in git history identified (commit `1d912db` had removed hardcoded fallback but key remained in history) |
| T+10 | Key rotation initiated — Polygon marked mandatory, Finnhub and FRED marked recommended |
| T+25 | First key write attempt failed silently — shell variable not exported to Python subprocess; all keys written as empty strings |
| T+40 | Empty key issue identified; re-entry via `getpass.getpass()` completed successfully for all four keys |
| T+55 | Market data confirmed non-loading; root cause identified as `force-static` on `/api/quote` route |
| T+65 | All 19 API routes patched from `force-static` to `force-dynamic`; market data restored |
| T+75 | News feed confirmed serving mock data with non-functional `url: '#'` placeholders |
| T+80 | News restored after server restart picked up new Finnhub key |
| T+90 | UI state reset-on-refresh issue identified and fixed via Zustand `partialize` update |
| T+105 | Vercel environment variables updated; production redeployed |
| T+110 | Smoke tests passed across all endpoints; incident closed |

---

## Root Causes

### RC-1: API Key Exposure in Git History
The Polygon API key was previously hardcoded as a fallback value in source code. Although the hardcoded value was removed in a later commit, the key remained readable in git history. Any party with repository access could have retrieved it.

### RC-2: Shell Variable Scoping (Key Write Failure)
Keys were captured using `IFS= read -rs VAR` in a shell session, then written to `.env.local` via a Python subprocess using `os.environ.get('VAR')`. Shell variables set with `read` are not exported to child process environments by default. Python received empty strings for all keys, silently writing blank values to the file.

### RC-3: Incorrect Next.js Route Directive (`force-static`)
All 19 API routes were annotated with `export const dynamic = 'force-static'`. In Next.js App Router, this directive causes `request.nextUrl.searchParams` to be empty (query parameters are dynamic and unavailable at static render time). Routes that depended on query parameters — including `/api/quote`, which powers the heatmap and all market data — returned validation errors for every request.

### RC-4: News Feed Mock Data Fallback
With the Polygon and Finnhub keys blank (RC-2), both news providers failed silently. The Finnhub client's `catch` block returned hardcoded mock articles with `url: '#'`, which the frontend correctly refused to open but displayed as real headlines.

### RC-5: UI State Not Persisted Across Refresh
The Zustand terminal store used the `persist` middleware with a `partialize` function that excluded `activeSymbol`, `activeView`, and `activeTab` from localStorage serialization. On every page refresh, the application reverted to the default `market-overview` view with no active symbol.

---

## Impact

| Area | Impact |
|------|--------|
| Security | Polygon API key potentially accessible via git history |
| Market Data | Heatmap and all quote endpoints returning errors (full data outage) |
| News Feed | Real articles replaced with non-clickable mock headlines |
| User Experience | Active view and selected symbol lost on every page refresh |
| Rate Limiting | Ineffective across all routes due to `force-static` stripping request headers |

---

## Remediation

| # | Action | File(s) Changed |
|---|--------|-----------------|
| 1 | Rotated Polygon, Finnhub, and FRED API keys via provider dashboards | — |
| 2 | Replaced shell `read` + `os.environ` pattern with `getpass.getpass()` for secure in-process key entry | — |
| 3 | Updated all new keys in `.env.local` and Vercel environment variables | `.env.local`, Vercel dashboard |
| 4 | Changed `force-static` to `force-dynamic` on all 19 API routes | `src/app/api/**/route.ts` |
| 5 | Added `activeSymbol`, `activeView`, `activeTab` to Zustand `partialize` list | `src/store/terminal.ts` |
| 6 | Redeployed to production and verified via smoke tests | — |

---

## Smoke Test Results (Post-Remediation)

| Endpoint | Result |
|----------|--------|
| `GET /api/quote?symbols=AAPL` | AAPL $260.29 — pass |
| `GET /api/news` | Real article URLs returned — pass |
| `GET /api/fred/yield-curve` | Yield data returned — pass |

---

## Action Items

| Priority | Item | Owner |
|----------|------|-------|
| High | Audit full git history for any other hardcoded secrets; purge if found using `git filter-repo` | Engineering |
| High | Add pre-commit hook (e.g. `gitleaks` or `detect-secrets`) to block secret commits | Engineering |
| Medium | Add server startup validation that asserts required env vars are non-empty | Engineering |
| Medium | Add integration test that hits `/api/quote` and asserts a non-error response | Engineering |
| Low | Move to `force-dynamic` as the project default; only opt into `force-static` explicitly where appropriate | Engineering |

---

## Lessons Learned

- **Shell variables are not environment variables.** `read VAR` sets a local shell variable. Child processes (Python, Node) only inherit exported variables. Use `export VAR` or prompt directly inside the subprocess.
- **`force-static` silently breaks dynamic routes.** Next.js does not warn when a `force-static` route attempts to read query params — it simply returns empty values. All API routes that read from `request` must use `force-dynamic`.
- **Silent fallbacks mask real failures.** The mock news fallback made the application appear functional while actually serving fabricated data. Fallbacks should log errors prominently or surface a visible error state.
- **Persist what users expect to survive a refresh.** Active navigation state is part of the user session and should be treated as persistent data.
