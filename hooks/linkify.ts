export type Repo = { owner: string; name: string }

export type Ref = { owner: string; name: string; number: number }

// The title of `owner/name#number`, once known.
export type TitleOf = (key: string) => string | undefined

// What linkify wrote: the reply's text, and which ref each link it added points at.
export type Linked = { text: string; links: Map<string, string> }

export const refKey = (ref: Ref) => `${ref.owner}/${ref.name}#${ref.number}`

// Code fences, inline code, markdown links and autolinks are left as written.
const SKIP = /(```[\s\S]*?(?:```|$)|`[^`\n]*`|!?\[[^\]\n]*\]\([^)\n]*\)|<https?:[^>\s]*>)/

const REF =
  /https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(?:issues|pull)\/(\d+)(?![\w/])|(?<![\w/&#.-])(?:([\w.-]+)\/)?([\w.-]+)?#(\d+)\b/g

export const parseRemote = (url: string): Repo | undefined => {
  const match = /github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url.trim())

  const [, owner, name] = match ?? []

  return owner !== undefined && name !== undefined ? { owner, name } : undefined
}

const resolve = (match: RegExpExecArray, repo: Repo | undefined): Ref | undefined => {
  const [, urlOwner, urlName, urlNumber, owner, name, number] = match

  if (urlOwner !== undefined && urlName !== undefined) {
    return { owner: urlOwner, name: urlName, number: Number(urlNumber) }
  }

  if (owner !== undefined && name !== undefined) {
    return { owner, name, number: Number(number) }
  }

  if (repo === undefined) {
    return undefined
  }

  // `repo#N` names the session's repo only when the names agree; `#N` always does.
  if (name !== undefined && name.toLowerCase() !== repo.name.toLowerCase()) {
    return undefined
  }

  return { ...repo, number: Number(number) }
}

const escape = (text: string) => text.replace(/[\\[\]*_`<>]/g, c => `\\${c}`)

const eachRef = (
  text: string,
  repo: Repo | undefined,
  replace: (ref: Ref, written: string) => string,
) =>
  text
    .split(SKIP)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(REF, (...args) => {
            const match = args.slice(0, -2) as unknown as RegExpExecArray
            const ref = resolve(match, repo)

            return ref ? replace(ref, match[0]) : match[0]
          }),
    )
    .join('')

export const findRefs = (text: string, repo: Repo | undefined): Ref[] => {
  const refs = new Map<string, Ref>()
  eachRef(text, repo, (ref, written) => {
    refs.set(refKey(ref), ref)

    return written
  })

  return [...refs.values()]
}

export const linkify = (text: string, repo: Repo | undefined, titleOf: TitleOf): Linked => {
  const links = new Map<string, string>()
  const linked = eachRef(text, repo, (ref, written) => {
    const key = refKey(ref)
    const title = titleOf(key)

    if (title === undefined) {
      return written
    }

    const href = written.startsWith('https://')
      ? written
      : `https://github.com/${ref.owner}/${ref.name}/issues/${ref.number}`
    links.set(href, key)

    return `[${escape(`${ref.name}#${ref.number} (${title})`)}](${href})`
  })

  return { text: linked, links }
}
