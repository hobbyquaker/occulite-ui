# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/) - in 0.x a minor version may break, and this file says
what and how to migrate; a patch never breaks.

## [Unreleased]

### Added

- `DataTable`: a column's `emptyLast: true` keeps its empty cells last when it is sorted
  descending too; by default the direction reverses the whole order, empty cells included.

## [0.1.0] - 2026-10-27

The first release: the generic UI of homematic-manager, extracted into a package of its own.

### Added

- Design tokens (`occulite-ui/tokens.css`) with a light theme and a blue-grey dark theme, defined
  for `prefers-color-scheme` and for an explicit `data-theme`; the global base rules
  (`occulite-ui/base.css`); both together as `occulite-ui/app.css`. The row height of every table
  is the token `--hmm-row-height` (30 px).
- Components: `DataTable` (virtualised, column filters, sorting, resizable and fitting columns,
  sub-rows, rename, copy button, context menu), `Dialog` (movable, resizable), `MultiSelect` (also
  single selection), `ContextMenu`, `Tabs`, `Toolbar`, `ToolbarButton`, `PrimaryToolbarButton`,
  `Tooltip`, `TooltipBubble`, `Loader`, `Notices`, `ThemeSwitch`, `LanguageSwitch`, `GithubLink`,
  `Icon`.
- `occulite-ui/i18n`: a translator with plurals and placeholders, the kit's own German and English
  strings, `addMessages()` for an app's catalogue, `initI18n()` (stored choice, the shell's
  language, the `ol-lang` cookie, the browser) and `setLanguage()`. Every text of a component is a
  prop and falls back to the catalogue reactively.
- `occulite-ui/theme`: `initTheme()` with `system`/`light`/`dark` stored under the app's own key,
  following openccu-lite's shell (`follow: 'shell'`) or not (`follow: 'none'`); `setTheme`,
  `cycleTheme`, `isDark`, `resolvedTheme`.
- `occulite-ui/embedding`: `ShellEmbedding`, the frame side of openccu-lite's embedding contract,
  and its constants.
- `occulite-ui/notices` (`NoticesStore`), `occulite-ui/table` (the table model, column widths,
  `LocalColumnWidths`), `occulite-ui/icons`, `occulite-ui/format`, `occulite-ui/clipboard`.
- An eslint rule set that bans `window.confirm`, `prompt` and `alert`.
