# gh-issue-links

A Claude Code mod that turns GitHub issue and PR references in Claude's replies into links labelled `repo#N (title)`, the way the desktop app does.

- `#123` links to the working directory's repo (its `origin` remote), `repo#123` too when `repo` is that repo's name, and `owner/repo#123` and `github.com/.../issues/N` or `.../pull/N` URLs anywhere.
- Titles come from `gh api`, so `gh` must be installed and logged in. A reference whose lookup fails is left as written.
- In the fullscreen terminal, a plain click on a link toggles a card under the reply with the issue's status (open, closed as completed / not planned / duplicate, merged, draft) and its labels. Ctrl+click still opens it.

## Install

```
/plugin install gh-issue-links --marketplace adamico/gh-issue-links
```

## Develop

```
claude plugin validate .
claude plugin test .
```
