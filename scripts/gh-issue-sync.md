# `scripts/gh-issue-sync.py` — one-shot GitHub Issues → Multica sync

A manual reconciliation tool. Reads a config file listing GitHub repos, walks
each repo's issues via the `gh` CLI, and upserts them into the Multica board
via the `multica` CLI. Run by hand when the board feels stale — there is no
daemon and no timer.

Long-term direction: file issues directly in Multica and stop using GitHub
Issues for tracked repos. At that point this script becomes obsolete by design.

## Behavior

For each configured `owner/repo`:

1. Find the Multica project whose attached `github_repo` resource matches the
   repo URL. If none exists and `auto_create_projects` is true (default),
   create one (`title = <repo-name>`, `icon = 📦`, `status = active`,
   `--repo <url>`).
2. List issues in that project, indexed by the `Source: <github-url>` footer
   embedded in each card's description on create.
3. For every GitHub issue (open and closed):
   - **Open and no matching card** → create one in `backlog` with the issue
     body plus a `Source: <github-url>` footer.
   - **Closed and no matching card** → ignored. The sync mirrors the active
     board, not the GitHub archive, so historical closed issues never get
     filed retroactively.
   - **Matching card and GitHub issue closed and card not yet `done`** → move
     the card to `done`.
   - **Otherwise** → no-op. Title, body, and status of open-issue cards are
     never overwritten — once a card exists, the human and agents own it.

Idempotent on re-run: the URL footer is the dedupe key. Re-syncing produces
zero writes when nothing has changed on either side.

## Config

`~/.config/multica/gh-sync.json`:

```json
{
  "repos": ["Josephkready/multica", "Josephkready/ttl-clean"],
  "owners": ["Josephkready"],
  "auto_create_projects": true
}
```

- `repos` — explicit `owner/repo` allowlist.
- `owners` — every non-fork, non-archived repo for these owners (via
  `gh repo list <owner> --no-archived --source`). Unions with `repos`.
- `auto_create_projects` — when a configured repo has no matching Multica
  project, create one. Default `true`.

Auth: uses whatever the host's `gh` CLI and `multica` CLI are already set up
with. No separate token plumbing.

## Usage

```bash
# Full run — every repo from the config
scripts/gh-issue-sync.py

# Single repo (overrides config; ignores 'owners')
scripts/gh-issue-sync.py --repo Josephkready/multica

# Preview without writing
scripts/gh-issue-sync.py --dry-run

# Non-default config path
scripts/gh-issue-sync.py --config /path/to/custom.json
```

Exits non-zero only if at least one repo errored. Summary line:
`N created, M closed, K unchanged, I ignored (closed on GH, never synced), X skipped, E errors`.

## What's out of scope

- **GitHub labels.** Multica labels are workspace-scoped and must be created
  separately; the sync ignores `gh` labels.
- **Comments.** The card is a pointer (the `Source:` link), not a mirror.
- **Reopen handling.** Once a card flips to `done`, the sync won't move it
  back if the GitHub issue is reopened. Bump it manually in Multica.
- **Multica → GitHub direction.** Closing a Multica card does not close the
  GitHub issue. (`--push-closes` is a possible future flag.)

## Verification recipe

1. `scripts/gh-issue-sync.py --dry-run --repo <owner/x>` — sanity-check what
   would happen.
2. Drop `--dry-run` — perform the real sync.
3. Re-run without `--dry-run` — confirm the summary is all-unchanged (0
   created, 0 closed).
4. Close one issue on GitHub, re-run — confirm `1 closed` in the summary and
   the corresponding card flips to `done` in the Multica UI.
