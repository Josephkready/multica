#!/usr/bin/env python3
"""One-shot GitHub Issues -> Multica board sync.

Reads ~/.config/multica/gh-sync.json, walks the configured GitHub repos via
the `gh` CLI, and upserts each issue into the Multica board via the `multica`
CLI. New cards land in `backlog`. Cards whose GitHub issue has been closed get
flipped to `done`. Idempotency is keyed on a `Source: <github-url>` footer
appended to each card's description.

Run by hand when the board falls behind GitHub. Not a daemon, not a timer.

Usage:
    scripts/gh-issue-sync.py
    scripts/gh-issue-sync.py --repo Josephkready/multica
    scripts/gh-issue-sync.py --dry-run
    scripts/gh-issue-sync.py --config /path/to/gh-sync.json
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

DEFAULT_CONFIG = Path.home() / ".config" / "multica" / "gh-sync.json"
SOURCE_MARKER = "Source: "
SOURCE_SEPARATOR = "\n\n---\n"


@dataclass
class Config:
    repos: list[str] = field(default_factory=list)
    owners: list[str] = field(default_factory=list)
    auto_create_projects: bool = True


@dataclass
class Summary:
    created: int = 0
    closed: int = 0
    unchanged: int = 0
    skipped: int = 0
    errors: int = 0


def run(cmd: list[str], *, input_: str | None = None) -> str:
    result = subprocess.run(
        cmd, capture_output=True, text=True, input=input_, check=False
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"{' '.join(cmd)} failed ({result.returncode}): {result.stderr.strip()}"
        )
    return result.stdout


def load_config(path: Path) -> Config:
    if not path.exists():
        sys.exit(
            f"Config not found at {path}. Create it with at least: "
            '{"repos": ["owner/repo", ...]}'
        )
    raw = json.loads(path.read_text())
    return Config(
        repos=list(raw.get("repos", [])),
        owners=list(raw.get("owners", [])),
        auto_create_projects=bool(raw.get("auto_create_projects", True)),
    )


def expand_owners(owners: Iterable[str]) -> list[str]:
    found: list[str] = []
    for owner in owners:
        out = run([
            "gh", "repo", "list", owner,
            "--no-archived", "--source-only",
            "--limit", "200",
            "--json", "nameWithOwner,isFork",
        ])
        for repo in json.loads(out):
            if repo.get("isFork"):
                continue
            found.append(repo["nameWithOwner"])
    return found


def resolve_repos(config: Config, override: str | None) -> list[str]:
    if override:
        return [override]
    repos = list(config.repos) + expand_owners(config.owners)
    seen: set[str] = set()
    deduped: list[str] = []
    for r in repos:
        if r not in seen:
            seen.add(r)
            deduped.append(r)
    return deduped


def fetch_gh_issues(repo: str) -> list[dict]:
    out = run([
        "gh", "issue", "list",
        "--repo", repo,
        "--state", "all",
        "--limit", "500",
        "--json", "number,title,body,state,url",
    ])
    return json.loads(out)


def list_projects() -> list[dict]:
    return json.loads(run(["multica", "project", "list", "--output", "json"]))


def list_project_resources(project_id: str) -> list[dict]:
    return json.loads(run([
        "multica", "project", "resource", "list", project_id, "--output", "json",
    ]))


def build_repo_to_project_index() -> dict[str, str]:
    """Map normalized GitHub repo URL -> Multica project ID."""
    index: dict[str, str] = {}
    for project in list_projects():
        try:
            resources = list_project_resources(project["id"])
        except RuntimeError:
            continue
        for resource in resources:
            if resource.get("resource_type") != "github_repo":
                continue
            url = (resource.get("resource_ref") or {}).get("url")
            if url:
                index[normalize_repo_url(url)] = project["id"]
    return index


def normalize_repo_url(url: str) -> str:
    return url.rstrip("/").lower()


def repo_url(owner_repo: str) -> str:
    return f"https://github.com/{owner_repo}"


def list_issues_for_project(project_id: str) -> list[dict]:
    """All issues in a project across pagination."""
    all_issues: list[dict] = []
    offset = 0
    page = 200
    while True:
        out = run([
            "multica", "issue", "list",
            "--project", project_id,
            "--limit", str(page),
            "--offset", str(offset),
            "--output", "json",
        ])
        payload = json.loads(out)
        issues = payload.get("issues", [])
        all_issues.extend(issues)
        if not payload.get("has_more"):
            break
        offset += page
    return all_issues


def extract_source_url(description: str | None) -> str | None:
    """Return the URL from the trailing `Source: <url>` footer, if present.

    Scans bottom-up so a `Source:` line inside the user-authored body (which
    sits above the appended footer) can't shadow the real footer.
    """
    if not description:
        return None
    for line in reversed(description.splitlines()):
        line = line.strip()
        if line.startswith(SOURCE_MARKER):
            return line[len(SOURCE_MARKER):].strip()
    return None


def build_description(body: str, gh_url: str) -> str:
    body = (body or "").rstrip()
    footer = f"{SOURCE_MARKER}{gh_url}"
    if body:
        return f"{body}{SOURCE_SEPARATOR}{footer}"
    return footer


def ensure_project(
    repo: str,
    index: dict[str, str],
    *,
    auto_create: bool,
    dry_run: bool,
) -> str | None:
    url = repo_url(repo)
    pid = index.get(normalize_repo_url(url))
    if pid:
        return pid
    if not auto_create:
        print(f"  no Multica project attached to {url} (auto_create_projects=false)")
        return None
    title = repo.split("/", 1)[1]
    if dry_run:
        print(f"  would create project '{title}' (--repo {url})")
        return None
    out = run([
        "multica", "project", "create",
        "--title", title,
        "--icon", "📦",
        "--status", "active",
        "--repo", url,
        "--output", "json",
    ])
    project = json.loads(out)
    pid = project["id"]
    index[normalize_repo_url(url)] = pid
    print(f"  created project '{title}' ({pid})")
    return pid


def sync_repo(
    repo: str,
    project_id: str,
    *,
    dry_run: bool,
    summary: Summary,
) -> None:
    gh_issues = fetch_gh_issues(repo)
    multica_issues = list_issues_for_project(project_id)
    by_source = {
        extract_source_url(i.get("description")): i
        for i in multica_issues
        if extract_source_url(i.get("description"))
    }

    for gh in gh_issues:
        gh_url = gh["url"]
        gh_state = gh["state"].lower()
        existing = by_source.get(gh_url)
        if existing is None:
            action = create_card(repo, project_id, gh, dry_run=dry_run)
        elif gh_state == "closed" and existing["status"] != "done":
            action = close_card(existing, dry_run=dry_run)
        else:
            action = "unchanged"
        setattr(summary, action, getattr(summary, action) + 1)


def create_card(repo: str, project_id: str, gh: dict, *, dry_run: bool) -> str:
    title = gh["title"]
    desc = build_description(gh.get("body") or "", gh["url"])
    prefix = "  [dry-run] would create" if dry_run else "  create"
    print(f"{prefix}: {repo}#{gh['number']} — {title}")
    if dry_run:
        return "created"
    run([
        "multica", "issue", "create",
        "--project", project_id,
        "--title", title,
        "--description-stdin",
        "--status", "backlog",
        "--output", "json",
    ], input_=desc)
    return "created"


def close_card(existing: dict, *, dry_run: bool) -> str:
    prefix = "  [dry-run] would close" if dry_run else "  close"
    print(f"{prefix}: {existing['identifier']} (was {existing['status']})")
    if dry_run:
        return "closed"
    run([
        "multica", "issue", "update", existing["id"],
        "--status", "done",
        "--output", "json",
    ])
    return "closed"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_CONFIG,
        help=f"Config file path (default: {DEFAULT_CONFIG})",
    )
    parser.add_argument(
        "--repo", help="Sync only this owner/repo (overrides config)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would change without writing to Multica",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    repos = resolve_repos(config, args.repo)
    if not repos:
        sys.exit("No repos to sync (config 'repos' and 'owners' are both empty).")

    print(f"Syncing {len(repos)} repo(s){' [DRY RUN]' if args.dry_run else ''}:")
    for r in repos:
        print(f"  - {r}")
    print()

    index = build_repo_to_project_index()
    summary = Summary()

    for repo in repos:
        print(f"== {repo} ==")
        try:
            project_id = ensure_project(
                repo, index,
                auto_create=config.auto_create_projects,
                dry_run=args.dry_run,
            )
        except RuntimeError as e:
            print(f"  error mapping repo to project: {e}", file=sys.stderr)
            summary.errors += 1
            continue
        if project_id is None:
            summary.skipped += 1
            continue
        try:
            sync_repo(repo, project_id, dry_run=args.dry_run, summary=summary)
        except RuntimeError as e:
            print(f"  error: {e}", file=sys.stderr)
            summary.errors += 1

    print()
    print(
        f"Summary: {summary.created} created, "
        f"{summary.closed} closed, "
        f"{summary.unchanged} unchanged, "
        f"{summary.skipped} skipped, "
        f"{summary.errors} errors"
    )
    return 1 if summary.errors else 0


if __name__ == "__main__":
    sys.exit(main())
