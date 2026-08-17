# dsh-client-ui-mobile

A mobile layout enhancement plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) `dsh web` UI.

This is an **additive plugin**: it does not replace the built-in layout. It only applies mobile / narrow-screen (≤768px) adaptations while leaving desktop completely untouched.

> 中文版说明见 [README.zh.md](./README.zh.md)

## Features

- Hide the 56px sidebar rail on phones; the conversation area becomes full-width.
- Floating navigation toggle (44×44 touch target) that opens the built-in sidebar as a phone drawer.
- Overlay backdrop only covers the area outside the drawer, so drawer controls stay tappable.
- Top-right actions menu consolidating the hidden session-log button and the chat / trajectory view tabs.
- Full-screen mobile settings panel with a horizontal navigation strip.
- Tool-call rows optimized for phones: taller rows, wrapping summaries, stacked IN/OUT, visible Inspect control.
- Question composer (question popup) safe handling for very long titles: title area has its own internal scroll, options stay visible and never overlap the title.
- Message time rows are trimmed to `time · duration` and ellipsized to avoid overflow on narrow screens.
- Selecting a session **or tapping “New session”** in the phone drawer automatically closes the drawer so the composer/content is not covered.
- Extended touch targets (≥44×44) for primary controls.
- Desktop is completely unaffected.

## Requirements

- `dsh web` (Harness 0.1 series)
- Depends on the built-in `@deepseek-ai/dsh-client-runtime` and `@deepseek-ai/dsh-client-ui-layout` services (`ctx.layout` and the `shell.overlay` slot). These ship with `dsh web`; no separate install needed.

## Installation

This package declares a `dsh.bundle`, so it is mounted as a profile layer automatically by `dsh plugin add`.

### Option 1: npm (recommended)

```sh
# From npm
dsh plugin --profile web add dsh-client-ui-mobile
```

### Option 2: GitHub

```sh
dsh plugin --profile web add github:GithungDang/dsh-client-ui-mobile#v0.1.0
```

### Option 3: local directory / tarball

```sh
dsh plugin --profile web add ./dsh-client-ui-mobile
dsh plugin --profile web add ./dsh-client-ui-mobile-0.1.0.tgz
```

After installation, restart `dsh web` and open `http://127.0.0.1:13080` to see the floating navigation toggle.

### Manual patch

Append `cordis.patch.yml` to your profile’s `cordis.patch.yml` (or use `dsh web --patch ./cordis.patch.yml`) and make sure the package is resolvable by the loader (e.g. symlinked into `$DSH_HOME/profiles/node_modules/`).

## Development

```sh
pnpm install      # first run; prepare builds automatically
pnpm build        # tsdown → lib/index.js + lib/client.js
pnpm typecheck    # tsc --noEmit
```

Development loop: edit `src/` → `pnpm build` → refresh the browser page. `dsh web` development mode has HMR, so bundle changes are pushed automatically; no server restart needed.

## How it works

- **Browser half** (`src/client/index.ts`) registers a floating navigation toggle in the `shell.overlay` slot and reuses the built-in `ctx.layout.toggleSidebar()`.
- **Styles** (`src/client/MobileNavButton.module.css`) are driven by the `data-mobile-nav` attribute: on phones the built-in sidebar becomes a fixed drawer, the rail is hidden, and settings / tool rows / question popups are adapted.
- **Node half** (`src/index.ts`) is empty; it only makes the package loadable by the dsh loader.
- All side effects (slot registration, event listeners, MutationObserver, matchMedia) are attached to `ctx.effect()` disposers and cleaned up on unload.

Build output follows the dsh web client-plugin contract: `lib/client.js` is a CJS closure-factory for `window.__ModuleLoader__.load({ id, factory })`, and CSS Modules are inlined by lightningcss into a `<style data-plugin>` tag.

## Known limitations

- Styles rely on built-in CSS Module class suffixes (e.g. `[class$="_frame"]`, `[class$="_sidebarCol"]`). If upstream changes its class-name strategy, this plugin needs to be updated.
- Background scrolling is not locked while the drawer is open.
- Transitions are intentionally kept minimal.

## License

MIT
