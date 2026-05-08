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

module.exports = withNativeWind(config, { input: "./global.css" });
