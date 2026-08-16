/**
 * Mobile floating navigation toggle.
 *
 * On narrow screens the built-in sidebar rail is hidden by the companion
 * stylesheet (MobileNavButton.module.css). This button lives in the additive
 * `shell.overlay` slot, so it floats above the app without replacing any
 * built-in layout component. Tapping it uses the original `ctx.layout`
 * service to flip the built-in narrow-sidebar expansion, and the stylesheet
 * turns that expanded sidebar into an overlay drawer instead of squeezing the
 * conversation column.
 */
import { useEffect, useState } from 'react'
import css from './MobileNavButton.module.css'

/** Injected face: the layout toggle supplied by the plugin body. */
export interface MobileNavInjected {
  /** Toggle the built-in sidebar through `ctx.layout` and mirror the CSS drawer state. */
  toggleSidebar: () => void
}

/** Full props: the injected face only (shell.overlay is a root-scope list slot with no owner share). */
export type MobileNavButtonProps = MobileNavInjected

/** Drawer state attribute read by the global mobile stylesheet. */
export const MOBILE_NAV_ATTRIBUTE = 'data-mobile-nav'

/** Render the floating mobile nav toggle and its optional backdrop. */
export function MobileNavButton({ toggleSidebar }: MobileNavButtonProps) {
  // The DOM attribute is the single source of truth for the CSS drawer; keep
  // the React state in sync even when the built-in sidebar is closed through
  // its own controls (or any other future path).
  const [open, setOpen] = useState(
    () => document.documentElement.getAttribute(MOBILE_NAV_ATTRIBUTE) === 'open',
  )

  useEffect(() => {
    const sync = (): void => {
      setOpen(document.documentElement.getAttribute(MOBILE_NAV_ATTRIBUTE) === 'open')
    }
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [MOBILE_NAV_ATTRIBUTE],
    })
    return () => observer.disconnect()
  }, [])

  const onToggle = (): void => {
    const next = !open
    setOpen(next)
    document.documentElement.setAttribute(MOBILE_NAV_ATTRIBUTE, next ? 'open' : 'closed')
    toggleSidebar()
  }

  return (
    <div className={css.layer}>
      {open && (
        <button
          type="button"
          className={css.backdrop}
          aria-label="关闭导航"
          onClick={onToggle}
        />
      )}
      <button
        type="button"
        className={css.toggle}
        aria-label={open ? '关闭导航' : '打开导航'}
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? (
          <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden>
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  )
}
