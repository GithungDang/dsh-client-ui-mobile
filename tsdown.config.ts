/**
 * Standalone build for dsh-client-ui-mobile.
 *
 * Two artifacts, matching the dsh web client-plugin contract
 * (docs/subsystems/client-modules.md in deepseek-harness):
 *
 * - `lib/index.js`  — node half, loaded by the dsh loader from package main.
 * - `lib/client.js` — browser half: a CJS closure-factory bundle handed to
 *   `window.__ModuleLoader__.load({ id, factory })`. The browser module table
 *   answers the externals below; everything else is inlined. CSS Modules are
 *   compiled with lightningcss and injected as a `<style data-plugin>` tag at
 *   factory execution (the loader removes plugin-owned tags on unload).
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, relative, resolve as resolvePath, sep } from 'node:path'
import { transform } from 'lightningcss'
import type { UserConfig } from 'tsdown'

const ID = 'dsh-client-ui-mobile'

/**
 * Browser-side externals answered by the dsh web loader module table
 * (platform seed entries plus the documented runtime store exemption).
 * Any other `@deepseek-ai/*` value import is a build error: cross-plugin
 * collaboration goes through cordis services; type-only imports are erased
 * and never reach the bundle.
 */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

/** Virtual-id wrapper keeping module CSS away from tsdown's own css pipeline. */
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

const nodeConfig: UserConfig = {
  name: ID,
  entry: 'src/index.ts',
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  clean: false,
}

const clientConfig: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  // The rule is the module table itself: externals stay external (neverBundle),
  // everything else inlines (alwaysBundle). A require() the table cannot answer
  // is a runtime throw.
  deps: {
    neverBundle: EXTERNALS,
    alwaysBundle: (id: string) => (EXTERNALS.includes(id) ? undefined : true),
  },
  // Inline node-idiom deps (zustand/immer) read process.env.NODE_ENV /
  // import.meta.env.MODE; define both so the inlined copies keep the right
  // branch. The bare `import.meta.env` key covers truthiness probes.
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  plugins: [
    {
      name: 'dsh-css-modules-inline',
      resolveId(source: string, importer: string | undefined) {
        if (!source.endsWith('.module.css')) return null
        const abs = importer !== undefined ? sourceAssetPath(source, importer) : source
        return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
      },
      async load(virtualId: string) {
        if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
        const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
        // The virtual id otherwise hides the physical stylesheet from the watch graph.
        this.addWatchFile(fileId)
        const source = await readFile(fileId)
        const { code, exports: cssExports } = transform({
          filename: fileId,
          code: source,
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        const classMap: Record<string, string> = {}
        for (const [local, exp] of Object.entries(cssExports ?? {})) classMap[local] = exp.name
        // One <style data-plugin> per module file; idempotent under re-evaluation.
        const tagId = `${ID}/${basename(fileId)}`
        return [
          `const css = ${JSON.stringify(code.toString())};`,
          `const tagId = ${JSON.stringify(tagId)};`,
          `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {`,
          '  const tag = document.createElement(\'style\');',
          `  tag.dataset.plugin = ${JSON.stringify(ID)};`,
          '  tag.dataset.pluginCss = tagId;',
          '  tag.textContent = css;',
          '  document.head.appendChild(tag);',
          '}',
          `export default ${JSON.stringify(classMap)};`,
        ].join('\n')
      },
    },
    {
      name: 'dsh-client-bundle-purity',
      resolveId(source: string) {
        if (!source.startsWith('@deepseek-ai/')) return null
        if (EXTERNALS.includes(source)) return null
        throw new Error(
          `client bundle purity: "${source}" is not a platform module or type-only import — `
          + 'cross-plugin value imports are forbidden; collaborate through cordis services',
        )
      },
    },
  ],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

/** Resolve an emitted JS asset import against its source-tree counterpart. */
function sourceAssetPath(source: string, importer: string): string {
  const emitted = resolvePath(dirname(importer), source)
  if (existsSync(emitted)) return emitted
  const marker = `${sep}lib${sep}types${sep}`
  const boundary = emitted.indexOf(marker)
  if (boundary < 0) return emitted
  return resolvePath(emitted.slice(0, boundary), 'src', emitted.slice(boundary + marker.length))
}

export default ({ env }: { env: Record<string, string | undefined> }) => [nodeConfig, clientConfig]
