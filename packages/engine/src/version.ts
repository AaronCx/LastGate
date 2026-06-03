/**
 * Engine version, kept in lockstep with packages/engine/package.json.
 *
 * The build (`bun build`) targets node with rootDir=src, so we can't import
 * package.json from here without tripping tsc's rootDir constraint. Instead this
 * constant is the single runtime source of truth and version.test.ts asserts it
 * matches package.json — so they can't silently drift.
 */
export const ENGINE_VERSION = "0.3.0";
