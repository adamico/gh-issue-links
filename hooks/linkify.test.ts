import { describe, expect, test } from 'claude-code/testing'

import { findRefs, linkify, parseRemote } from './linkify'

const repo = { owner: 'me', name: 'foobar' }
const titles = new Map<string, string | null>([
  ['me/foobar#123', 'the title'],
  ['other/lib#7', 'a [bracket]'],
  ['me/foobar#9', null],
])
const titleOf = (key: string) => titles.get(key) ?? undefined

describe('linkify', () => {
  test('a bare #N in the session repo', async () => {
    expect(linkify('see #123.', repo, titleOf).text).toBe(
      'see [foobar#123 (the title)](https://github.com/me/foobar/issues/123).',
    )
  })

  test('repo#N, owner/repo#N and URLs', async () => {
    expect(linkify('foobar#123', repo, titleOf).text).toContain('[foobar#123 (the title)]')
    expect(linkify('other/lib#7', repo, titleOf).text).toBe(
      '[lib#7 (a \\[bracket\\])](https://github.com/other/lib/issues/7)',
    )
    expect(linkify('https://github.com/me/foobar/pull/123', repo, titleOf).text).toBe(
      '[foobar#123 (the title)](https://github.com/me/foobar/pull/123)',
    )
  })

  test('leaves unknown, failed, code and existing links alone', async () => {
    for (const text of ['#999', '#9', '`#123`', '```\n#123\n```', '[x](https://github.com/me/foobar/issues/123)', 'a&#123;', 'other#123']) {
      expect(linkify(text, repo, titleOf).text).toBe(text)
    }
    expect(linkify('#123', undefined, titleOf).text).toBe('#123')
  })

  test('says which ref each link points at', async () => {
    expect([...linkify('#123 and https://github.com/me/foobar/pull/123', repo, titleOf).links]).toEqual([
      ['https://github.com/me/foobar/issues/123', 'me/foobar#123'],
      ['https://github.com/me/foobar/pull/123', 'me/foobar#123'],
    ])
  })

  test('finds each ref once', async () => {
    expect(findRefs('#1 #1 x/y#2 `#3`', repo)).toEqual([
      { owner: 'me', name: 'foobar', number: 1 },
      { owner: 'x', name: 'y', number: 2 },
    ])
  })

  test('parses remotes', async () => {
    expect(parseRemote('git@github.com:me/foobar.git\n')).toEqual(repo)
    expect(parseRemote('https://github.com/me/foobar')).toEqual(repo)
    expect(parseRemote('https://gitlab.com/me/foobar')).toBeUndefined()
  })
})
