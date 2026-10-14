import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { DETAILS_JQ, inkOn, parseDetails, statusOf } from './details'
import type { Details } from './details'
import { findRefs, linkify, parseRemote, refKey } from './linkify'
import type { Ref, Repo } from './linkify'

const openCards = atom({ plugin: 'gh-issue-links', key: 'openCards' } as const, [])

// Lookups are cheap to redo, so a reload starting them over is fine.
const details = new Map<string, Details | null>()
const pending = new Set<string>()
// The working directory's repo, looked up again after each change of directory.
let repo: Promise<Repo | undefined> | undefined

async function lookUpRepo($: EngineInterface) {
  const { exitCode, stdout } = await $.process.run(['git', 'remote', 'get-url', 'origin'])

  return exitCode === 0 ? parseRemote(stdout) : undefined
}

async function fetchDetails($: EngineInterface, ref: Ref) {
  const key = refKey(ref)
  pending.add(key)

  try {
    const { exitCode, stdout } = await $.process.run(
      ['gh', 'api', `repos/${ref.owner}/${ref.name}/issues/${ref.number}`, '--jq', DETAILS_JQ],
      { timeoutMs: 10_000 },
    )
    details.set(key, exitCode === 0 ? parseDetails(stdout) : null)
  } catch {
    details.set(key, null)
  } finally {
    pending.delete(key)
  }

  $.ui.invalidate('ui.render')
}

const titleOf = (key: string) => details.get(key)?.title

export const register: Register = on => {
  on('classic.CwdChanged', ($, e, next) => {
    repo = undefined

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    repo ??= lookUpRepo($)
    const sessionRepo = await repo

    for (const ref of findRefs(e.props.text, sessionRepo)) {
      const key = refKey(ref)

      if (!details.has(key) && !pending.has(key)) {
        void fetchDetails($, ref)
      }
    }

    const { text, links } = linkify(e.props.text, sessionRepo, titleOf)

    // Cards need clicks, which only the fullscreen terminal reports; elsewhere
    // the rewritten text is drawn by the engine as any reply is.
    if (e.surface !== 'terminal' || e.viewport?.isFullscreen !== true || links.size === 0) {
      return next({ ...e, props: { ...e.props, text } })
    }

    const { Box, Markdown, Text } = $.ui.resolve(e)
    const open = await read($, openCards)
    const shown = [...new Set(links.values())].filter(key => open.includes(`${e.requestId} ${key}`))
    const width = Math.min(72, (e.viewport?.columns ?? 80) - 4)

    return (
      <Box flexDirection="row">
        <Box width={2} flexShrink={0}>
          <Text>{e.props.isFirstOfReply ? '●' : ' '}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Markdown
            key="reply"
            text={text}
            pressableLinks={[...links.keys()]}
            onLinkPress={link => {
              const card = `${e.requestId} ${links.get(link.href)}`

              return update($, openCards, cards =>
                cards.includes(card) ? cards.filter(c => c !== card) : [...cards, card],
              )
            }}
          />
          {shown.map(key => {
            const issue = details.get(key)

            if (!issue) {
              return null
            }

            const status = statusOf(issue)

            return (
              <Box
                key={`card ${key}`}
                flexDirection="column"
                borderStyle="round"
                borderColor="subtle"
                paddingX={1}
                width={width}
              >
                <Text>
                  <Text bold color={status.color}>{status.text}</Text>
                  <Text dimColor>{`  ${key.replace('#', ' #')}`}</Text>
                </Text>
                <Text bold>{issue.title}</Text>
                {issue.labels.length > 0 && (
                  <Text>
                    {issue.labels.map((label, i) => (
                      <Text key={`label ${i}`}>
                        {i > 0 ? ' ' : ''}
                        <Text backgroundColor={`#${label.color}`} color={inkOn(label.color)}>
                          {` ${label.name} `}
                        </Text>
                      </Text>
                    ))}
                  </Text>
                )}
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })
}
