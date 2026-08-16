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

  // On mobile, selecting a session from the drawer should close the drawer so
  // the conversation is actually usable. Without this, the drawer stays open
  // over the chat and blocks tool rows / messages.
  ctx.effect(() => {
    const onClick = (event: MouseEvent): void => {
      if (!window.matchMedia(MOBILE_QUERY).matches) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[class$="_sessionRow"]') === null) return
      if (document.querySelector('[role="dialog"]') !== null) return
      if (document.documentElement.getAttribute('data-mobile-nav') !== 'open') return
      ctx.layout.toggleSidebar()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, 'ui-mobile: auto-close drawer on session select')

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
}
