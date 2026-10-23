#!/usr/bin/env python3
"""Check that relative links and #anchors in the repo's Markdown files resolve.

Usage:
    python3 scripts/check_links.py            # check every tracked *.md file
    python3 scripts/check_links.py README.md  # check specific files

External links (http, https, mailto) are skipped. Anchors are matched against
GitHub-style heading slugs. Exits non-zero if any link is broken.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINK_RE = re.compile(r"(?<!\!)\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")


def slugify(heading: str) -> str:
    """Approximate GitHub's heading anchor algorithm."""
    text = re.sub(r"`([^`]*)`", r"\1", heading)          # inline code
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)  # links
    text = text.strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)                  # drop punctuation
    return text.replace(" ", "-")


def strip_code(lines):
    in_fence = False
    for line in lines:
        if FENCE_RE.match(line):
            in_fence = not in_fence
            yield ""
            continue
        yield "" if in_fence else re.sub(r"`[^`]*`", "", line)


def anchors_for(path: Path, cache={}):
    if path not in cache:
        seen, slugs = {}, set()
        for line in strip_code(path.read_text(encoding="utf-8").splitlines()):
            m = HEADING_RE.match(line)
            if not m:
                continue
            slug = slugify(m.group(2))
            n = seen.get(slug, 0)
            seen[slug] = n + 1
            slugs.add(slug if n == 0 else f"{slug}-{n}")
        cache[path] = slugs
    return cache[path]


def markdown_files(args):
    if args:
        return [Path(a).resolve() for a in args]
    out = subprocess.run(["git", "ls-files", "*.md"], cwd=ROOT,
                         capture_output=True, text=True, check=True).stdout
    return [ROOT / p for p in out.split()]


def check(md: Path):
    errors = []
    for lineno, line in enumerate(strip_code(md.read_text(encoding="utf-8").splitlines()), 1):
        for target in LINK_RE.findall(line):
            if re.match(r"^[a-z][a-z0-9+.-]*:", target, re.I):
                continue  # http:, https:, mailto:, ...
            path_part, _, anchor = target.partition("#")
            dest = (md.parent / path_part).resolve() if path_part else md
            if not dest.exists():
                errors.append(f"{md.relative_to(ROOT)}:{lineno}: missing file {target}")
            elif anchor and dest.suffix == ".md" and anchor.lower() not in anchors_for(dest):
                errors.append(f"{md.relative_to(ROOT)}:{lineno}: missing anchor {target}")
    return errors


def main(argv):
    files = markdown_files(argv[1:])
    errors = [e for md in files for e in check(md)]
    for e in errors:
        print(e)
    print(f"Checked {len(files)} Markdown files: {len(errors)} broken link(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
