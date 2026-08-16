/**
 * Mobile layout enhancement plugin, browser half.
 *
 * This is intentionally an additive plugin: it does not replace the built-in
 * root layout. It reuses the original `sidebar`, `conversation`, `details`,
 * and `shell.overlay` slots, and only:
 *
 *  1. injects the narrow-screen stylesheet (via the CSS module import);
 *  2. registers one floating navigation toggle in `shell.overlay`.
 *
 * The toggle drives the built-in `ctx.layout.toggleSidebar()`, so the
 * original SidebarRoot remains the single source of truth for the drawer
 * content.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls ui-layout's SlotMap merge so `shell.overlay` resolves.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { MobileNavButton } from './MobileNavButton.tsx'
import type { MobileNavInjected } from './MobileNavButton.tsx'
import { TopRightMenu } from './TopRightMenu.tsx'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'layout']

/**
 * Mount the mobile enhancement.
 * @param ctx - browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const MOBILE_QUERY = '(max-width: 768px)'
  const FRAME_SELECTOR = '[class$="_frame"]'


  // Sync the CSS drawer attribute from the built-in layout's source of truth
  // (`data-sidebar-collapsed` on AppFrame). This covers the initial state,
  // the built-in collapse button, Esc/other close paths, and desktop↔mobile
  // breakpoint changes.
  const syncMobileNav = (): void => {
    const mobile = window.matchMedia(MOBILE_QUERY).matches
    const frame = document.querySelector(FRAME_SELECTOR)
    const collapsed = frame?.hasAttribute('data-sidebar-collapsed') ?? true
    if (mobile) {
      document.documentElement.setAttribute('data-mobile-nav', collapsed ? 'closed' : 'open')
    } else {
      document.documentElement.removeAttribute('data-mobile-nav')
    }
  }

  syncMobileNav()

  // The component owns the drawer-state attribute; this callback only drives
  // the built-in layout service. Keeping the attribute update here too would
  // flip it twice per tap (the component sets it, then this closure reads the
  // just-updated value and toggles it back).
  const toggleSidebar = (): void => {
    ctx.layout.toggleSidebar()
  }

  const injected = (): MobileNavInjected => ({ toggleSidebar })

  ctx.effect(() => {
    const dispose = ctx.slots.register({
      name: 'shell.overlay',
      id: 'mobile-nav-toggle',
      order: -100,
      inject: injected,
    }, MobileNavButton)
    return dispose
  }, 'ui-mobile: floating nav toggle')

  // Top-right "+" menu: consolidates the hidden session-log button and the
  // 对话/轨迹 view tabs into one phone-friendly dropdown.
  ctx.effect(() => {
    const dispose = ctx.slots.register({
      name: 'shell.overlay',
      id: 'mobile-top-menu',
      order: 90,
    }, TopRightMenu)
    return dispose
  }, 'ui-mobile: top-right actions menu')

  // On mobile, selecting a session (or tapping the built-in new-session
  // button) from the drawer should close the drawer so the conversation is
  // actually usable. Without this, the drawer stays open over the chat and
  // blocks tool rows / messages / the composer.
  ctx.effect(() => {
    const onClick = (event: MouseEvent): void => {
      if (!window.matchMedia(MOBILE_QUERY).matches) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[class$="_sessionRow"], [class$="_newSession"], button[aria-label="新建会话"]') === null) return
      if (document.querySelector('[role="dialog"]') !== null) return
      if (document.documentElement.getAttribute('data-mobile-nav') !== 'open') return
      ctx.layout.toggleSidebar()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, 'ui-mobile: auto-close drawer on session select / new session')

  // Follow the built-in AppFrame's collapsed state so any sidebar close path
  // keeps the mobile drawer attribute in sync.
  ctx.effect(() => {
    const observer = new MutationObserver(syncMobileNav)
    const target = document.querySelector(FRAME_SELECTOR) ?? document.body
    observer.observe(target, {
      childList: target === document.body,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-sidebar-collapsed'],
    })
    return () => observer.disconnect()
  }, 'ui-mobile: built-in sidebar toggle sync')

  // Keep the attribute correct when crossing the mobile breakpoint.
  ctx.effect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = (): void => syncMobileNav()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, 'ui-mobile: mobile breakpoint sync')

  // Keep only the count + duration on the composer stats line, and strip the
  // 首 token / tok tail from each message's time row (MessageIconActions
  // .timeEnd/.timeStart) so nothing overflows the narrow viewport. The built-in
  // rows are 时间 · 用时 · 首token 平均 · tok/s — we drop the trailing groups and
  // keep the clock + run duration.

  // Disabled pending a reported regression: the global body MutationObserver
  // (childList+subtree → prune() with getBoundingClientRect on every DOM
  // change) is the prime suspect for the "composer disappears after scrolling
  // a long way and returning to bottom" issue. The command menu's 命令 group
  // title is already hidden by CSS (display:none), and the "+" button tooltip
  // is a cosmetic hover bubble, so dropping this JS has no functional loss.
  // Re-enable once the regression is isolated and fixed.
  // ctx.effect(() => {
  //   const prune = (): void => {
  //     document.querySelectorAll('[class*="_groupTitle"][data-source="command"]').forEach((el) => { el.remove() })
  //     const addBtn = document.querySelector<HTMLElement>('[data-composer-card] button[class*="_add"]')
  //     const addRect = addBtn?.getBoundingClientRect()
  //     document.querySelectorAll('[role="tooltip"]').forEach((tip) => {
  //       const r = tip.getBoundingClientRect()
  //       if (r.width === 0 || r.height === 0) return
  //       if (addRect && Math.abs(r.left + r.width / 2 - (addRect.left + addRect.width / 2)) < 120 && r.bottom <= addRect.top) {
  //         tip.remove()
  //       }
  //     })
  //   }
  //   const observer = new MutationObserver(prune)
  //   observer.observe(document.body, { childList: true, subtree: true })
  //   prune()
  //   return () => observer.disconnect()
  // }, 'ui-mobile: strip command group title + "+" tooltip')

  // On phones, the "+" command button pops the virtual keyboard and then
  // traps it: the built-in keepFocus refocuses the composer textarea on
  // mousedown, and the command menu's search input programmatically grabs
  // focus on open. With the keyboard up, outside taps land on the keyboard
  // instead of the page, so the menu can only be dismissed via "+" again.
  // Two capture-phase interceptions keep the keyboard down on mobile while
  // the menu stays usable (tapping the search input itself still focuses it).
  ctx.effect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const isMobile = (): boolean => mql.matches

    // 1) Stop the built-in keepFocus handler from refocusing the textarea
    //    when the "+" button is tapped. Capture stopPropagation skips the
    //    button's own mousedown handler; the click that opens the menu still
    //    fires (click is a separate event).
    const onMouseDownCapture = (event: MouseEvent): void => {
      if (!isMobile()) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-composer-card] button[class*="_add"]') === null) return
      event.stopPropagation()
    }

    // 2) Prevent the command menu's search input from programmatically
    //    grabbing focus on open. A capture-phase focus listener can cancel the
    //    focus change via preventDefault; a user tap on the input itself is
    //    allowed (last pointer target is the input).
    let lastPointerTarget: EventTarget | null = null
    // Only the command menu participates in the composer-tap dismissal. It is
    // identified by the "+" button's aria-expanded state (the button toggles
    // it) rather than the group title — the title node is removed by
    // "ui-mobile: strip command menu group title," so it cannot be the anchor.
    const hasCommandMenu = (): boolean => document
      .querySelector<HTMLElement>('[data-composer-card] button[class*="_add"]')
      ?.getAttribute('aria-expanded') === 'true'

    const onPointerDownCapture = (event: PointerEvent): void => {
      lastPointerTarget = event.target
      const target = event.target
      if (!(target instanceof Element)) return
      // Only run when the command menu is actually open.
      const cmdOpen = hasCommandMenu()
      if (!cmdOpen) return
      if (target.closest('[data-composer-card] [class*="_menu"]') !== null) return
      if (target.closest('button[class*="_add"]') !== null) return
      if (target.closest('[data-composer-card]') !== null) {
        // Tapping anywhere on the input bar closes the command menu.
        document.querySelector<HTMLElement>('[data-composer-card] button[class*="_add"]')?.click()
      }
    }
    const onFocusCapture = (event: FocusEvent): void => {
      if (!isMobile()) return
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (!target.matches('input[class*="_search"]')) return
      if (lastPointerTarget instanceof Node && (lastPointerTarget === target || target.contains(lastPointerTarget))) return
      event.preventDefault()
    }

    document.addEventListener('mousedown', onMouseDownCapture, true)
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    document.addEventListener('focus', onFocusCapture, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDownCapture, true)
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
      document.removeEventListener('focus', onFocusCapture, true)
    }
  }, 'ui-mobile: keep command-menu keyboard down on phones')
}
