import { expect, test } from 'claude-code/testing'

const ISSUE = {
  title: 'Void Dragon harm and healing',
  state: 'closed',
  reason: 'completed',
  isPullRequest: false,
  isMerged: false,
  isDraft: false,
  labels: [{ name: 'bug', color: 'd73a4a' }],
}

// gh answers with the issue; git finds no repo, as outside a checkout.
const run = (argv: readonly string[]) => ({
  ...(argv[0] === 'gh'
    ? { exitCode: 0, stdout: JSON.stringify(ISSUE), stderr: '' }
    : { exitCode: 1, stdout: '', stderr: 'not a git repository' }),
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

const REPLY = {
  component: 'AssistantMessage',
  props: { text: 'Fixed in 5thlayer/voidworks#59.', isFirstOfReply: true },
} as const

test('a click on an issue link toggles its card', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{`engine: ${(e.props as { text: string }).text}`}</Text>
  })
  on('process.run', ($, e) => ({ value: run(e.argv) }))

  const ui = await $.ui.mount({
    plugin: 'gh-issue-links',
    surface: 'terminal',
    ...REPLY,
    viewport: { columns: 100, rows: 40, isFullscreen: true },
  })

  const href = 'https://github.com/5thlayer/voidworks/issues/59'
  expect((await ui.find({ key: 'reply' }))?.props.text).toBe(
    `Fixed in [voidworks#59 (Void Dragon harm and healing)](${href}).`,
  )
  expect(await ui.find({ text: /Closed as completed/ })).toBeUndefined()

  await ui.press({ key: 'reply', link: { href } })
  expect(await ui.find({ text: /Closed as completed/ })).toBeDefined()
  expect(await ui.find({ text: / bug / })).toBeDefined()

  await ui.press({ key: 'reply', link: { href } })
  expect(await ui.find({ text: /Closed as completed/ })).toBeUndefined()
})

test('outside the fullscreen terminal the engine draws the linked text', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{`engine: ${(e.props as { text: string }).text}`}</Text>
  })
  on('process.run', ($, e) => ({ value: run(e.argv) }))

  const ui = await $.ui.mount({
    plugin: 'gh-issue-links',
    surface: 'terminal',
    ...REPLY,
    viewport: { columns: 100, rows: 40, isFullscreen: false },
  })

  expect(await ui.find({ key: 'reply' })).toBeUndefined()
  expect(await ui.find({ text: /^engine: Fixed in \[voidworks#59 \(Void Dragon/ })).toBeDefined()
})
