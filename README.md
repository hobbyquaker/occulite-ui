# occulite-ui

openccu-lite's look for apps and addons: a Svelte 5 UI kit with the design tokens, a light and a
blue-grey dark theme, German and English strings, a virtualised `DataTable`, dialogs, menus,
tooltips, toasts, toolbars and the theme and language handling - and the frame side of
openccu-lite's embedding contract, so a page inside the system's shell follows the shell's theme
and language.

Its consumers are [homematic-manager](https://github.com/hobbyquaker/homematic-manager), the
system's own web interface ([occulited](https://github.com/hobbyquaker/occulited)) and the addons
for openccu-lite and the classic CCU.

**Status: 0.x.** The API is settling; in 0.x a minor version may break (the
[CHANGELOG](CHANGELOG.md) says what and how to migrate), a patch never does. The CSS prefixes
`--hmm-*`, `hmm-*` and `ol-*` stay through 0.x and are renamed before 1.0.

## Install

```sh
npm install occulite-ui
```

`svelte` (^5.40) is a peer dependency; the package has no runtime dependencies. It is a source
package: the `.svelte` files are compiled by your app's Svelte, so there is one Svelte runtime and
your compiler options apply.

## Vite setup

Vite with `@sveltejs/vite-plugin-svelte` is all it needs - the package carries the `svelte` export
condition. TypeScript consumers need `"moduleResolution": "bundler"` (or `node16`/`nodenext`).

When you link a local checkout of the kit (`npm link`, a workspace), keep a single Svelte:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [svelte()],
  resolve: {dedupe: ['svelte']},
});
```

## Usage

```ts
// main.ts
import 'occulite-ui/app.css';
import {mount} from 'svelte';
import {addMessages, initI18n} from 'occulite-ui/i18n';
import {initTheme} from 'occulite-ui/theme';

import App from './App.svelte';
import {MESSAGES} from './messages.js';

addMessages(MESSAGES); // your strings, over the kit's; yours win
initI18n({storageKey: 'myapp.language'}); // follows openccu-lite's shell while embedded
initTheme({storageKey: 'myapp.theme'}); // 'system' | 'light' | 'dark'

mount(App, {target: document.getElementById('app')!});
```

```svelte
<script lang="ts">
  import {DataTable, Notices, Tabs, ThemeSwitch} from 'occulite-ui';
  import {NoticesStore} from 'occulite-ui/notices';
  import {t} from 'occulite-ui/i18n';
  import {cycleTheme, theme} from 'occulite-ui/theme';

  const notices = new NoticesStore();
  let tab = $state('devices');
</script>

{#if !theme.followsShell}
  <ThemeSwitch theme={theme.choice} onclick={cycleTheme} />
{/if}
<Tabs tabs={[{id: 'devices', label: t('Devices')}]} bind:active={tab} />
<DataTable rows={[]} columns={[{key: 'name', label: t('Name')}]} getId={(row) => row.id} />
<Notices notices={notices.visible} ondismiss={(id) => notices.dismiss(id)} />
```

### What is in it

| Import                                           | What                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `occulite-ui`                                    | every component and helper below (tree-shakable)                                                      |
| `occulite-ui/components/<Name>.svelte`           | one component                                                                                         |
| `occulite-ui/app.css`                            | `tokens.css` + `base.css`, import once                                                                |
| `occulite-ui/tokens.css`, `occulite-ui/base.css` | the custom properties alone; the global rules alone                                                   |
| `occulite-ui/i18n`                               | `t`, `has`, `translations`, `addMessages`, `initI18n`, `setLanguage`, `i18n.language`, the translator |
| `occulite-ui/theme`                              | `theme`, `initTheme`, `setTheme`, `cycleTheme`, `isDark`, `resolvedTheme`, `applyTheme`               |
| `occulite-ui/embedding`                          | `ShellEmbedding`, `shellEmbedding()`, the contract's constants                                        |
| `occulite-ui/table`                              | the table model, column widths, `LocalColumnWidths`, `setDataTableEnvironment`, `ROW_HEIGHT`          |
| `occulite-ui/dialog`                             | `Dialog` and its geometry helpers                                                                     |
| `occulite-ui/notices`                            | `NoticesStore`                                                                                        |
| `occulite-ui/icons`                              | icons as data (`IconData`), drawn by `Icon` and the toolbar buttons                                   |
| `occulite-ui/format`, `occulite-ui/clipboard`    | time and duration formatting; copying text                                                            |

Every visible text of a component is a prop; when it is absent, the component falls back to the
kit's catalogue in the page's language, and re-renders when the language changes.

A denser app sets `--hmm-row-height` to another height (26 px, say) and passes the same number to
`DataTable`'s `rowHeight`: the virtualiser needs it as a number.

### Inside openccu-lite's shell

The system frames an addon page as a same-origin iframe, puts `theme=` and `lang=` on the frame
URL and posts `{type: 'openccu-lite:theme', theme, lang}` to it on every change. With
`follow: 'shell'` (the default) `initTheme` and `initI18n` follow that, and `theme.followsShell`
tells a page to hide its own theme switch. A page opened on its own (a tab, a classic CCU, a
desktop app) keeps its own choice; `follow: 'none'` ignores the shell altogether. The kit reads the
shell's `ol-lang` cookie but never writes it.

### No browser dialogs

Never `window.confirm`, `prompt` or `alert`: they block the page, cannot be styled or translated
and are suppressed in some frames. Ask through a dialog, tell through a notice. The kit's own
eslint config bans the three; the same two rules in an app's config:

```js
// eslint.config.js, in a config object's `rules`
'no-restricted-globals': ['error', 'confirm', 'prompt', 'alert'],
'no-restricted-properties': [
    'error',
    {object: 'window', property: 'confirm'},
    {object: 'window', property: 'prompt'},
    {object: 'window', property: 'alert'},
],
```

## Support

- Svelte `^5.40` (CI tests the floor and the current version), Node 22 and 24 for the tooling.
- Evergreen browsers (Chromium, Firefox, Safari of the last two years).

## Development

```sh
npm ci
npx playwright install --with-deps chromium   # once: the component tests run in a real chromium
npm run lint && npm run typecheck && npm test
npm run build && npm run publint && npm run pack:check && npm run size
```

`npm run test:jsdom` runs the same tests without a browser, as a fallback; CI reports on the
browser run. `npm run size` builds three typical import sets with Vite and fails when one is more
than 10 % over `size-budget.json` (`node scripts/size-report.mjs --update` rewrites the budget).

## Releasing

The first publish is done by hand, because npm's trusted publishing can only be configured for a
package that exists:

1. On a clean checkout of `main` with green CI: `npm ci && npm test && npm run build && npm run pack:check`.
2. `npm login` (an account with publish rights; two-factor authentication on), then
   `npm publish --access public`. The `prepack` script builds `dist/` again; the tarball is the one
   `npm run pack:check` listed.
3. Tag the commit: `git tag -a v0.1.0 -m v0.1.0 && git push origin v0.1.0`, and create the GitHub
   release with the title `v0.1.0` and the CHANGELOG section as its notes.
4. On npmjs.com, package settings → _Trusted publishing_: add GitHub Actions with the owner
   `hobbyquaker`, the repository `occulite-ui` and the workflow `release.yml`. Then, under
   _Publishing access_, require two-factor authentication and disallow tokens.
5. In the GitHub repository, set the Actions variable `NPM_TRUSTED_PUBLISHING` to `true`.

From then on a release is: bump `version` in `package.json`, move the CHANGELOG's section from
"unreleased" to the date, commit, push a `v<version>` tag. `release.yml` tests, checks that the tag
matches the version, publishes with provenance (`next` for a prerelease, `latest` otherwise) and
creates the GitHub release, titled with the tag.

## License

MIT, see [LICENSE](LICENSE). The code was written for homematic-manager and the openccu-lite
web interface by the same author and is relicensed MIT here. The vendored GitHub mark is listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
