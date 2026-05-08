const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm monorepo: watch the workspace root, and resolve modules from
// apps/mobile/node_modules first, then workspace root. Disable hierarchical
// lookup so transitive deps (e.g. react-query inside @multica/core) resolve
// to a single copy — without this you get "Cannot read property 'useContext'
// of null" because two React/react-query copies enter the bundle.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Pin webidl-conversions to v5 in the bundle. v8.0.1 (transitive of jsdom in
// the workspace) references SharedArrayBuffer.prototype at module top-level
// and crashes Hermes. With disableHierarchicalLookup, Metro picks v8 from
// <workspaceRoot>/node_modules instead of the v5 that whatwg-url-without-
// unicode actually declares (^5.0.0). v5 is Hermes-clean and API-compatible
// for the URL polyfill chain that consumes it at runtime.
const WEBIDL_V5 = path.resolve(
  workspaceRoot,
  "node_modules/.pnpm/webidl-conversions@5.0.0/node_modules/webidl-conversions/lib/index.js",
);
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "webidl-conversions") {
    return { type: "sourceFile", filePath: WEBIDL_V5 };
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
