# Decisions

## D1. Money is integer cents
Amounts are stored and computed as whole cents (`1234` means 12.34). Never use floating-point
arithmetic on money. Parse with `parseAmount`, show with `formatAmount`.

## D2. No runtime dependencies
Only Node.js built-ins. Tests use `node --test`.

## D3. Dates are ISO strings
Entry dates are `YYYY-MM-DD` strings and are compared as strings.

## D4. Pure functions, no shared state
Functions take a ledger and return new values. No module-level mutable state (no global registries
or caches); pass configuration in as arguments.
