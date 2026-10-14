// Each open card: `<message requestId> <owner/name#number>`.
export type OpenCards = readonly string[]

declare module 'claude-code' {
  interface PluginState {
    'gh-issue-links': { openCards: OpenCards }
  }
}
