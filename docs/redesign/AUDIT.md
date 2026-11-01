# Blend Redesign Audit

**Status:** Phase 0 complete; scope confirmed; Phase 1 approved and in progress.

## Executive summary

CollaboNet is a React marketplace with one public marketing/auth entry page, a
protected application shell, and 13 other routed screens. The existing frontend
already has a class-based light/dark theme, semantic CSS tokens, shared UI
primitives, and domain components. A redesign can build on these rather than
introducing a second token or component system.

The confirmed pilot is the dashboard at `/app/overview`. The existing `/`
landing page is the target for the conversion-hero reference. There is no
current waitlist page or separate showcase page; neither will be added.

The supplied [Figma file](https://www.figma.com/design/BHt6HTeoBEVu5m2KHjOv7K/Ux-flow)
is viewable in guest mode. Its `references` page has six generic image layers
and separate `Landing page` and `Dashboard` layers. Because the six image
layers are not individually named to match the four concepts in the brief,
the written reference descriptions remain the source for their intended
mapping. The screenshots below record the current product only; they are not
visual comparisons to those references.

## Confirmed scope mapping

| Reference | Confirmed existing page | Audit notes |
|---|---|---|
| 1. Waitlist/coming-soon hero | **None (gap)** | No waitlist route or email-capture flow was found; do not add a route. |
| 2. Showcase hero/stat bento | **None (gap)** | No separate showcase route was found; do not add a route. |
| 3. Conversion hero/before-after | `/` — `Landing` | This is the existing public marketplace and demo-entry page. Keep its actual copy and actions; no before/after proof or metrics should be fabricated. |
| 4. Dashboard shell/widgets | `/app/overview` — `Overview` | Proposed first pilot. It is protected, role-aware, and uses seeded demo data. |
| Other screens afterwards | All remaining existing routes listed below | Migrate one screen at a time after the pilot is approved. |

## Stack and existing patterns

- **Framework/runtime:** React 19.0.0, Create React App (`react-scripts` 5.0.1)
  with CRACO 7.
- **Routing:** React Router 7, with authentication/role/verification guards in
  `frontend/src/App.js`.
- **Data/state:** Axios API client with credentialed requests;
  TanStack Query for server state; React contexts for authentication and theme.
- **Styling:** Tailwind CSS 3.4.17, PostCSS, CSS variables, and utility classes.
  Tokens and typography are in `frontend/src/styles/theme.css` and
  `frontend/src/styles/typography.css`; global styles are imported by
  `frontend/src/index.js`.
- **Components:** Radix-based components under `frontend/src/components/ui`,
  shared marketplace components in `frontend/src/components/common.jsx`,
  application/dashboard components, chat/media components, and a separate
  `frontend/src/components/base` set used by some application components.
- **Theme:** `frontend/src/lib/theme.jsx` applies `.dark` to the root element
  and persists `light`, `dark`, or `system` in local storage.
- **Tests:** CRA/Jest tests are present alongside calendar, messaging,
  notifications, settings, and signature-pad behavior.
- **Package management:** `frontend/package.json` declares Yarn 1 via
  `packageManager`, while both `frontend/yarn.lock` and
  `frontend/package-lock.json` exist. There is also a root `package-lock.json`.
  The user previously requested npm installation; use npm for this phase and
  avoid regenerating the unrelated Yarn lockfile or root lockfile. Existing
  package/lockfile modifications are preserved.
- **Blend package:** `@juspay/blend-design-system` and `blend-studio` are not
  installed in the frontend.

## Route and screen inventory

| Route | Screen | Existing behavior and UI building blocks |
|---|---|---|
| `/` | `Landing` | Public marketplace introduction, demo preview, and creator/sponsor demo-login actions; uses API/auth, Sonner feedback, and Framer Motion. |
| `/onboarding` | `Onboarding` | Authenticated account-type/profile setup; calls the API and navigates through onboarding steps. |
| `/verify` | `Verification` | Authenticated identity/social verification form; uses shared Input, Textarea, and Button. |
| `/payment/success` | `PaymentSuccess` | Payment return state; reads URL parameters and API state, then navigates. |
| `/payment/cancel` | `PaymentCancel` | Payment-cancel return state; reads URL parameters and offers navigation. |
| `/app` | Redirect | Redirects to `/app/overview`; parent is guarded by authenticated, role-selected, verified user state. |
| `/app/overview` | `Overview` | Role-specific KPI tiles, next step, invitations/requests, activity and collaboration summaries; API-backed actions and shared Button/EmptyState components. |
| `/app/explore` | `Explore` | Role-aware creator/campaign discovery, filters, details, and connection/application flows; API queries, dialogs, forms, and shared UI components. |
| `/app/campaigns` | `Campaigns` | Campaign/brief management, applications, invitations, and create/edit flows; API queries, tabs, dialogs, forms, and shared UI components. |
| `/app/messages` | `Messages` | Full-height messaging experience with thread/detail queries, attachments, uploads, voice notes, read receipts, and chat-specific components. |
| `/app/contracts` | `Contracts` | Deal/contract list and negotiation/signing flows; API queries, dialogs, forms, status pills, and custom `SignaturePad`. |
| `/app/calendar` | `CalendarPage` | Calendar navigation, event data and event form; `dayjs`, a custom calendar utility, dialogs, and explicit error/retry UI. |
| `/app/project-board` | `ProjectBoard` | Project-board UI with locally persisted board data and create/edit controls; errors are currently logged to the console. |
| `/app/account` | `Account` | User/company profile, rates, templates and settings forms; API-backed queries, dialogs, shared form controls, and status pills. |
| `/app/notifications` | `Notifications` | Filtered, paginated notification feed; infinite query with explicit error/retry UI. |
| OAuth hash callback | `AuthCallback` | Handles OAuth callback session hash during routing; not a standalone page route. |

The protected shell is `frontend/src/components/Shell.jsx`. It supplies the
desktop `DashboardSidebar`, a mobile header/menu, notification and message
counts, account/logout menus, a settings modal, and route-specific layout
handling (including the full-bleed messages view).

## Current UI findings

These are source and baseline-screen observations, not a completed contrast or
keyboard audit:

- **Landing:** It already functions as a conversion/demo-entry page, so it is
  the only existing fit for Reference 3. The hero includes a simulated product
  preview and animated content. Existing animation/reduced-motion behavior
  needs a focused audit before retaining or changing motion. The Google mark in
  the login UI uses its own brand colors; do not recolor or copy assets from the
  reference images.
- **Landing action hierarchy:** Creator and Sponsor demo actions have distinct
  role outcomes. Reconcile the "one primary action" direction with preserving
  both without silently changing how demo login works.
- **Overview:** The current screen has a clear heading, role-specific KPI
  tiles, a next-step action, and an empty invitation state. Its query only
  branches on loading/absent data, not an explicit error/retry state. The shell
  has responsive navigation and count badges but no desktop top-bar search
  control. Preserve the existing actions and role permissions.
- **Other query-driven screens:** Notifications and Calendar explicitly render
  query errors with retry. Overview does not. Explore, Campaigns, Contracts,
  Messages, and Account use API queries but do not expose a consistent
  screen-level error/retry treatment in the inspected code. Verify each
  independent query and its existing fallback before redesigning its states.
- **Project board:** Persistence failures are logged to the console; validate
  what feedback users currently receive before changing the presentation.
- **Shared patterns:** The app has reusable buttons, inputs, dialogs, tabs,
  selects, checkboxes, badges, cards, avatars, skeletons, and status/empty
  state helpers. Several app-specific widgets remain domain behavior rather
  than generic design-system primitives.
- **Accessibility:** Existing components include focus styling and some
  reduced-motion handling, but WCAG contrast, complete keyboard paths, labels,
  announcement behavior, and overlay escape behavior have not been verified
  across all routes. Treat these as Phase 4 checks, not as passing findings.

## Tentative component map

The mappings below are conceptual only. Blend is not installed, so no Blend
exports or local types have been verified. In Phase 1, inspect the installed
package's exports/types and
[Storybook](https://blend.juspay.design/storybook/) before selecting
components.

| Existing CollaboNet UI | Potential Blend counterpart | Proposed treatment |
|---|---|---|
| `components/ui/button` | `ButtonV2` (if present in the installed version) | Prefer the existing component until API and style compatibility are checked. |
| `components/ui/input` | `TextInputV2` | Preserve labels, validation, and current form behavior. |
| `components/ui/card` and `StatTile` | `CardV2` / `StatCard` | Use for presentation only; keep API-derived data and actions. |
| `components/ui/avatar`, `badge`, and `StatusPill` | `Avatar`, `Tag`/badge equivalents | Keep status meaning in text/icon as well as color. |
| `components/ui/dialog`, `drawer`, `select`, `tabs`, `checkbox` | Corresponding Blend primitives | Verify actual exports, keyboard behavior, and styling before migration. |
| `PageHead`, `EmptyState`, `SectionTitle` | Compose from Blend primitives | Keep small project-specific composition where Blend has no exact equivalent. |
| `SignaturePad`, chat/media, calendar, project-board and role-aware widgets | No assumed one-to-one mapping | Retain domain components; restyle their surfaces with the chosen tokens. |
| `DashboardSidebar` and shell menus | Blend navigation/menu equivalents, if suitable | Preserve current destinations, counts, guards, account actions, and mobile behavior. |

## Token map

| Existing source | Current role | Blend integration direction |
|---|---|---|
| `frontend/src/styles/theme.css` | Primitive and semantic `--color-*` variables; light/dark mappings; radii and shadows | Map by semantic meaning, not by raw color values. Confirm Blend token names and values from the installed package before mapping. |
| `frontend/src/styles/typography.css` | Named typography ramp (`--text-*`) and weights/line-heights | Map hierarchy to Blend typography tokens while preserving readable content density. |
| `frontend/src/lib/theme.jsx` | `.dark` class, `light`/`dark`/`system` selection, local-storage persistence | Integrate the Blend provider with this existing theme mechanism; avoid a competing theme source. |
| Tailwind utility classes and component CSS | Layout, spacing, responsive behavior and component details | Reuse existing utilities where compatible; do not create a second global token system. |
| `frontend/src/lib/api.js` status classes | Status colors currently expressed as utility classes | Move toward semantic status tokens during affected screen work; keep visible text/icons so meaning is not color-only. |

Exact token-to-token mappings remain open until the package's actual generated
tokens and provider API are inspected.

## Compatibility risks and gates

1. **React peer range:** Published Blend `0.0.38` exports the V2 components
   preferred by the brief, but requires React and ReactDOM `^18.3.1 ||
   >=19.2.1`; this app declares `19.0.0`. Published `0.0.25` accepts React 19
   but does not export the V2 component set. Choose between upgrading
   React/ReactDOM to `19.2.1` for V2 or keeping React `19.0.0` and using the
   older component API. Do not force-install around the incompatibility.
2. **Styling and global CSS:** The Blend package describes a
   styled-components-based component library and provides a global stylesheet.
   This app uses Tailwind/PostCSS and substantial global theme CSS. Resets,
   element styles, specificity, CSS ordering, and dark-mode variables need a
   coexistence test before importing Blend styles.
3. **TypeScript/bundler:** The app uses CRA/webpack via CRACO, with
   `moduleResolution: "node"` and an ES5 target in `frontend/tsconfig.json`.
   Check the actual Blend package's exports, types, and module syntax against
   this toolchain before changing compiler settings.
4. **Theme/provider:** Existing theme state supports three modes and writes the
   `.dark` root class. A second independent provider could cause palette or
   hydration-like flashes; preserve the current source of truth.
5. **Lockfiles:** Yarn metadata/lockfile and npm lockfiles coexist. Use npm as
   previously requested, preserve pre-existing changes, and do not stage or
   rewrite unrelated lockfiles.
6. **Reference material:** The supplied Figma page has six generic image
   layers, which are not individually mapped to the four written concepts.
   Use the written descriptions for scope; brand, colors, copy, and assets
   remain governed by the design-system source of truth.
7. **CLI packaging:** Published `blend-studio@0.1.6` declares the dependency
   `@juspay/blend-design-system: workspace:*`; npm rejects this with
   `EUNSUPPORTEDPROTOCOL`. The CLI cannot be invoked through ordinary `npx`
   until the publisher fixes that manifest.

## Baseline screenshots

Captured the current UI at widths **375, 768, 1280, and 1440 px**, in **light
and dark** mode: 14 routes × 8 states = **112 PNGs** in `before/`.

Files use `<route-slug>-<width>-<theme>.png`, for example:

- [`before/landing-375-light.png`](./before/landing-375-light.png)
- [`before/landing-1440-dark.png`](./before/landing-1440-dark.png)
- [`before/app-overview-1280-light.png`](./before/app-overview-1280-light.png)

The landing screenshots were captured signed out. Protected screens were
captured using the seeded Creator demo account; this is a visual baseline, not
a representation of every role or every loading/error state.

## Proposed migration order and rollback

1. Scope mapping above is confirmed; no new waitlist or showcase routes.
2. Work on `redesign/blend-ui`, preserving the existing dirty worktree. Use
   npm as previously requested. Resolve the React/Blend peer-version choice
   before adding the runtime package.
3. Integrate Blend in a separate, reviewable step. Verify provider/theme and
   global CSS coexistence; compare unmigrated screens against these baselines.
4. Pilot `/app/overview`, keeping its current API calls, query keys, role
   branching, actions, and navigation unchanged.
5. Stop for review of the dashboard before migrating the other confirmed
   screens one at a time.
6. For rollback, revert only the integration or per-screen migration commit;
   keep existing components until all confirmed screens are migrated and
   approved.

No application-code, dependency, or configuration changes were made as part of
this Phase 0 audit.
