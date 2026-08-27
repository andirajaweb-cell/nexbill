/**
 * DEPRECATED — superseded by scripts/whatsapp-bot.mts.
 *
 * Baileys v7's "whatsapp-rust-bridge" dependency is ESM-only (no CommonJS
 * "require" export condition). This project's package.json has no
 * "type":"module", so tsx/Node treated this plain .ts file as CommonJS and
 * transpiled its `import` statements into `require()` calls — which then
 * failed to resolve that dependency (ERR_PACKAGE_PATH_NOT_EXPORTED) the
 * moment `npm run bot:whatsapp` tried to start.
 *
 * The .mts extension forces Node to always treat that file as native ESM,
 * regardless of package.json "type", which resolves the dependency
 * correctly. `npm run bot:whatsapp` now points at whatsapp-bot.mts.
 *
 * This file is no longer used and is safe to delete.
 */
export {};
