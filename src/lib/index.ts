/**
 * occulite-ui: the barrel. Every subpath (`occulite-ui/table`, `/i18n`, `/theme`, `/embedding`,
 * `/dialog`, `/notices`, `/icons`, `/format`, `/clipboard`) is re-exported here, so an app may
 * import from the package root or narrowly; both tree-shake.
 */
export * from './components/index.js';
export * from './table/index.js';
export * from './i18n/index.js';
export * from './theme/index.js';
export * from './embedding/index.js';
export * from './notices/index.js';
export * from './icons/index.js';
export * from './format.js';
export * from './clipboard.js';
export * from './externalLink.js';
export * from './storage.js';
