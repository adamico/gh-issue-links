export type Label = { name: string; color: string }

export type Details = {
  title: string
  state: 'open' | 'closed'
  reason: string | null
  isPullRequest: boolean
  isMerged: boolean
  isDraft: boolean
  labels: Label[]
}

// What `gh api` is asked for: the issue (or PR) shaped into Details.
export const DETAILS_JQ =
  '{title, state, reason: .state_reason, isPullRequest: (.pull_request != null), ' +
  'isMerged: (.pull_request.merged_at != null), isDraft: (.draft == true), ' +
  'labels: [.labels[] | {name, color}]}'

export const parseDetails = (json: string): Details | null => {
  try {
    const details = JSON.parse(json) as Details

    return typeof details.title === 'string' ? details : null
  } catch {
    return null
  }
}

export type Status = { text: string; color: string }

export const statusOf = (details: Details): Status => {
  if (details.isMerged) {
    return { text: '⑂ Merged', color: 'merged' }
  }

  if (details.state === 'open') {
    return details.isDraft
      ? { text: '○ Draft', color: 'inactive' }
      : { text: '○ Open', color: 'success' }
  }

  if (details.isPullRequest) {
    return { text: '⊘ Closed', color: 'error' }
  }

  switch (details.reason) {
    case 'not_planned':
      return { text: '⊘ Closed as not planned', color: 'inactive' }
    case 'duplicate':
      return { text: '⊘ Closed as duplicate', color: 'inactive' }
    default:
      return { text: '✓ Closed as completed', color: 'merged' }
  }
}

// Black or white text, whichever reads better on the label's colour.
export const inkOn = (hex: string) => {
  const n = Number.parseInt(hex, 16)
  const luma = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255

  return luma > 0.6 ? '#000000' : '#ffffff'
}
