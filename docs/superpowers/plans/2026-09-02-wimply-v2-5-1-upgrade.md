# Wimply V2.5.1 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the prefix Mines failure and deliver the requested Wimply V2.5.1 branding, XP, Aviator, casino-result, and command-interface upgrades without removing existing functionality.

**Architecture:** Keep the existing command loader, slash-command definitions, prefix adapter, Prisma services, and interaction handlers. Fix prefix construction errors at the message boundary, centralize version/logo presentation helpers, make `/xp` dual-purpose (user info by default, administrator management when an action is supplied), and keep game state in existing services.

**Tech Stack:** TypeScript, discord.js v14, Prisma, PostgreSQL, Zod.

**Spec:** User-provided Wimply V2.5.1 upgrade requirements.

## Global Constraints

- Target version is **Wimply V2.5.1**.
- Preserve slash commands and `#`/`!` prefix commands.
- Do not remove existing economy/game functionality.
- Mines mine count is **1–24** and `#mines` must return a command-specific usage response.
- Aviator crash point is fixed at **100.00×** for now and must be easy to switch later.
- Use the guild custom `Wimply_logo` emoji where available instead of generic robot branding.
- Banner belongs on owner/bot screens and gambling final scenes, not ordinary responses.
- Cash-out requires activity and must settle exactly once.
- Keep dependencies minimal and do not weaken TypeScript checks.

---

### Task 1: Fix prefix argument-error routing

**Files:**
- Modify: `src/events/messageCreate.ts`

- [ ] Move prefix adapter construction inside the same error boundary as command execution so missing required arguments become intentional command errors rather than uncaught construction failures.
- [ ] Preserve the existing `GAMBLE_USAGE` messages for Mines and the other casino commands.
- [ ] Verify unknown commands and normal command failures still use the existing error handler.

### Task 2: Version and branding foundation

**Files:**
- Modify: `src/utils/presentation.ts`
- Modify: `src/utils/errorHandler.ts`
- Modify: `src/commands/bot.ts`
- Modify: `src/commands/owner.ts`
- Modify: `package.json`

- [ ] Change the release version to `2.5.1` and the visible version to `Wimply V2.5.1`.
- [ ] Add a reusable Wimply-logo resolver that finds `Wimply_logo` in the guild and falls back to a neutral text-safe mark, never a generic robot identity.
- [ ] Keep normal footers professional and remove stale V2.1.1/legacy stamp presentation.
- [ ] Ensure errors use the logo and banner where available.
- [ ] Redesign bot/owner screens while keeping owner pings suppressed.

### Task 3: User XP and level information

**Files:**
- Modify: `src/commands/admin/xp.ts`
- Create: `src/commands/level.ts`

- [ ] Make `/xp` and `#xp` show the requesting user's XP profile when no administrator action is supplied.
- [ ] Preserve administrator XP actions when an action is supplied and enforce Administrator permission for those actions.
- [ ] Add `/level` and `#level` with level, current XP, next-level XP, progress, and remaining XP.
- [ ] Use the repository's existing level formula consistently.

### Task 4: XP level-up notification delivery

**Files:**
- Modify: `src/events/messageCreate.ts`

- [ ] Compare the user's level before and after message XP award.
- [ ] Send one configured notification when the level increases and `GuildConfig.levelUpEnabled` is true.
- [ ] Support `{user}` and `{level}` placeholders.
- [ ] Add Wimply branding without spamming notifications.

### Task 5: Aviator fixed 100× crash

**Files:**
- Modify: `src/services/aviatorService.ts`
- Modify: `src/events/interactionCreate.ts`

- [ ] Replace random crash selection with a single easy-to-change configuration value of `100`.
- [ ] Keep multiplier calculation and cash-out validation server-authoritative.
- [ ] Add banner to final Aviator result screens.
- [ ] Keep animation edits rate-limit conscious.

### Task 6: Casino final-result presentation

**Files:**
- Modify: `src/events/interactionCreate.ts`

- [ ] Add the bot banner to Mines, Aviator, Chicken Cross Road, and Higher/Lower final result embeds handled here.
- [ ] Preserve the banner as a large lower image rather than a thumbnail.
- [ ] Fix the Mines hit-result formatting and keep settled-board wording.

### Task 7: Verification and repository audit

**Files:**
- Repository-wide

- [ ] Search for stale `V2.1.1`, `V2.1`, and `V2.0` visible references.
- [ ] Search for inappropriate `🤖` Wimply branding.
- [ ] Search for TODO/FIXME and unused imports/locals introduced by the changes.
- [ ] Run `npm ci` and `npm run build`.
- [ ] Inspect the resulting commit and CI status before declaring success.

---
