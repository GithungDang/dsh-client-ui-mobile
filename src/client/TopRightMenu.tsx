/**
 * Top-right "+" menu for phones.
 *
 * The mobile header hides the built-in session-log button and the 对话/轨迹
 * view tabs; this menu consolidates them into one touch-friendly affordance.
 * Each item clicks the corresponding hidden built-in control, so the actual
 * view-switch / session-log logic stays in the shell (no reimplementation).
 */
import { useEffect, useRef, useState } from 'react'
import css from './TopRightMenu.module.css'

/** One menu action targeting a hidden built-in control. */
type Action = 'log' | 'chat' | 'trajectory'

/**
 * Render the top-right "+" button and its dropdown.
 * @returns the button and, while open, the three-action menu.
 */
export function TopRightMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on any pointer interaction outside the menu.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (rootRef.current !== null && event.target instanceof Node && rootRef.current.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const run = (action: Action): void => {
    const header = document.querySelector('[data-phase] header')
    if (action === 'log') {
      const logButton = document.querySelector<HTMLElement>('[class$="_sessionLogButton"]')
      logButton?.click()
    } else {
      const tabs = header?.querySelectorAll<HTMLElement>('[class*="_tabs"] [class*="_tab"]')
      const tab = tabs?.[action === 'chat' ? 0 : 1]
      tab?.click()
    }
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={css.layer}>
      <button
        type="button"
        className={css.toggle}
        aria-label="更多操作"
        aria-expanded={open}
        onClick={() => { setOpen(value => !value) }}
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className={css.menu} role="menu" aria-label="更多操作">
          <button type="button" role="menuitem" className={css.item} onClick={() => { run('log') }}>
            下载会话内容
          </button>
          <button type="button" role="menuitem" className={css.item} onClick={() => { run('chat') }}>
            对话
          </button>
          <button type="button" role="menuitem" className={css.item} onClick={() => { run('trajectory') }}>
            轨迹
          </button>
        </div>
      )}
    </div>
  )
}
