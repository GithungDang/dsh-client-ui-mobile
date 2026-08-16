/**
 * dsh-client-ui-mobile — node half.
 *
 * Deliberately empty: this package only enhances the browser surface. The
 * node half exists so the plugin appears in the loader / cordis.yml; all
 * behavior ships through the package's `./client` browser bundle.
 */

/** Plugin id used by the cordis loader. */
export const name = 'dsh-client-ui-mobile'

/** Host plugin body — no host-side behavior. */
export function apply(): void {}
