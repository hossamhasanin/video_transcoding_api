---
name: format
description: Run all formatters and linters to match CI pipeline expectations. Use when the user says "format", "lint", "/format", or asks to ensure code passes CI checks before pushing.
version: 1.0.0
---

# Format & Lint Project

Run all formatting and linting checks that the CI pipeline (`.github/workflows/ci.yml`) enforces, and auto-fix where possible.

## Steps

### 1. Backend — Black formatter

```bash
cd backend && source .venv/bin/activate && black .
```

Auto-formats all Python files to match CI's `black --check --diff .` step.

### 2. Backend — Flake8 fatal errors (must pass)

```bash
cd backend && source .venv/bin/activate && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv,.venv
```

This must exit with code 0 (zero errors). Any failures here block CI. Fix them before proceeding.

### 3. Backend — Flake8 warnings (informational)

```bash
cd backend && source .venv/bin/activate && flake8 . --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics --exclude=venv,.venv
```

Reports warnings but does not block CI. Fix these when reasonable.

### 4. Frontend — ESLint

```bash
cd frontend && npx eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --max-warnings 0
```

Must produce zero output (no errors, no warnings). Fix any issues found.

### 5. Report results

Summarize which checks passed and which needed fixes. If any fatal checks fail, explain what was wrong and what was fixed.

## Notes

- Always `source .venv/bin/activate` before backend commands
- The `--exclude=venv,.venv` flag on flake8 prevents scanning dependencies
- CI runs on Python 3.10 + Node 20, but local formatting is compatible regardless of exact versions
- If tools aren't installed, remind the user: `pip install black flake8` in the backend venv
