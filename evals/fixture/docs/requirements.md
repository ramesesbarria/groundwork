# Ledger: requirements

A small Node.js library and command-line tool for tracking personal expenses.

## Today

- Entries have a date (`YYYY-MM-DD`), a category, an optional description and an amount.
- `src/ledger.js`: create a ledger, add entries, totals by category, balance, entries in a date range.
- `src/report.js`: a plain-text report with a dated header, one line per category and a total.
- `src/cli.js`: `add` and `report` commands; the ledger file is `$LEDGER_FILE` or `ledger.json`.
- Tests run with `node --test`.

## Constraints

See `docs/decisions.md`. In short: integer cents, no runtime dependencies, ISO dates, pure functions.
