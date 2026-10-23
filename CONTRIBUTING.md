# Contributing

Thanks for helping. This page lists the commands to build, test and lint each part of the
project, and the conventions for changes. Setup details are in
[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md).

## Layout

| Area | Path | Language |
|------|------|----------|
| C remote library, demo, examples | `include/`, `src/`, `examples/`, `Makefile` | C11, a little assembly |
| Simulator server, scheduler, adapters | `test_simulator/*.py`, `test_simulator/adapters/`, `test_simulator/gpu_runtime/` | Python 3.10+ |
| 3D front end | `test_simulator/web_static/js/`, `test_simulator/web_templates/` | JavaScript (Three.js) |
| Docs | `README.md`, `docs/`, `test_simulator/**/*.md` | Markdown |

## Build, test, lint

### C

```bash
make              # build bin/remote_control
make examples     # build all examples
make test         # C unit tests (tests/c/)
make sanitize     # C unit tests under ASan/UBSan
make clean
```

### Python

```bash
cd test_simulator
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest                                     # whole suite, in-process, no server needed
ruff check .                               # lint
```

See [test_simulator/TESTING.md](test_simulator/TESTING.md) for the test layout and manual checks.

### JavaScript

```bash
cd test_simulator
npx eslint web_static/js
```

### Docs

```bash
python3 scripts/check_links.py             # every relative link and #anchor in tracked *.md files
```

CI runs the C, Python and lint checks on pull requests.

## Making a change

1. Branch from `main`.
2. Keep changes focused; one logical change per commit.
3. Run the relevant commands above before pushing.
4. Update the docs in the same pull request when behaviour, commands, endpoints, config keys
   or keyboard shortcuts change. Describe only what exists; put ideas in [ROADMAP.md](ROADMAP.md).
5. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for user-visible changes.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, where
type is one of `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`.
Examples from history: `feat(simulator): …`, `perf(arm): …`, `docs(setup): …`.

### Adding a button

Follow the checklist in [docs/BUTTONS.md](docs/BUTTONS.md#adding-a-button); the C header,
`get_button_name()`, `test_simulator/button_codes.py` and the docs must stay in sync.

### Adding an API endpoint

Add the route in `test_simulator/web_server.py`, describe it in `test_simulator/openapi.yaml` and
[test_simulator/API.md](test_simulator/API.md), and add a test under `test_simulator/tests/`.

## Reporting bugs

Open a GitHub issue with what you ran, what you expected, what happened, and your OS, compiler
and Python versions.
