// Settings module - simplified for workspace-based configuration.
// Workspace config is now stored in each workspace folder's config.json.
// This module re-exports workspace functions for backward compatibility.

export {
  getRecentWorkspaces,
  addRecentWorkspace,
  removeRecentWorkspace,
  getWorkspaceConfig,
} from "./workspace";
