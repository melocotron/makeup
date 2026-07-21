// Shim for `import "server-only"` so server-only modules can be imported
// in Vitest test environment. The real package throws at runtime in client
// bundles; we don't care about that guarantee inside unit tests.
export {};
