#!/usr/bin/env bash
# Two-worktree shared-context demo. The local merge is a simulation of a reviewed PR merge,
# not a real review. The CLI under test is supplied with GW_CLI; there is no npx fallback.
set -euo pipefail

: "${GW_CLI:?Set GW_CLI to the local CLI, e.g. GW_CLI=\"node cli/dist/bin.js\"}"
read -r -a GW <<< "$GW_CLI"
ORIG="$PWD"
case "${GW[1]:-}" in
  /*|[A-Za-z]:[\\/]*) ;;
  *) if [ "${#GW[@]}" -ge 2 ] && [ -e "$ORIG/${GW[1]}" ]; then GW[1]="$ORIG/${GW[1]}"; fi ;;
esac
ROOT="$(mktemp -d "${TMPDIR:-/tmp}/gw-team-demo.XXXXXX")"
cleanup() { rm -rf "$ROOT" 2>/dev/null || true; }
trap cleanup EXIT
if [ "${GW_KEEP:-0}" = "1" ]; then trap - EXIT; echo "kept: $ROOT"; fi

git init -q --bare "$ROOT/origin.git"
git -C "$ROOT/origin.git" symbolic-ref HEAD refs/heads/main
git init -q --initial-branch=main "$ROOT/repo"
cd "$ROOT/repo"
git config user.email demo@example.com
git config user.name Demo
git remote add origin "$ROOT/origin.git"

"${GW[@]}" --version
if [ -n "${GW_ROOT:-}" ]; then git -C "$GW_ROOT" rev-parse --short HEAD; fi
"${GW[@]}" init --adapter none >/dev/null 2>&1
node -e "const fs=require('fs'); const p='.groundwork/config.json'; const c=JSON.parse(fs.readFileSync(p,'utf8')); c.integration='pr'; fs.writeFileSync(p, JSON.stringify(c,null,2)+'\n');"

mkdir -p .groundwork/decisions .groundwork/cards .groundwork/evidence
cat > .groundwork/decisions/0001-session-storage.md <<'EOF'
---
id: 0001
title: Session storage
status: proposed
date: 2026-10-18
---
Use signed cookies.
EOF
cat > .groundwork/decisions/0002-analytics.md <<'EOF'
---
id: 0002
title: Analytics
status: proposed
date: 2026-10-18
---
Use a third-party analytics tool.
EOF
cat > test-auth.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
grep -q "server-side sessions" .groundwork/decisions/0001-session-storage.md
grep -q "auth" auth.txt
echo "test-auth: passed"
EOF
cat > test-profile.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
grep -q "profile" profile.txt
echo "test-profile: passed"
EOF
cat > test-integration.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
grep -q "server-side sessions" .groundwork/decisions/0001-session-storage.md
grep -q "profile" profile.txt
echo "test-integration: passed"
EOF
chmod +x test-auth.sh test-profile.sh test-integration.sh
echo app > app.txt
git add -A
git commit -qm "baseline app and decisions"
B0=$(git rev-parse HEAD)

card() { # id status
  cat > ".groundwork/cards/$1.md" <<EOF
---
id: $1
title: Task $1
phase: 1
status: $2
depends_on: []
---
## Goal
Fixture task $1.
## Acceptance criteria
- [x] Fixture behavior works.
## Evidence
- [fixture](../evidence/$1/old.txt)
## History
- 2026-10-18 created
EOF
  mkdir -p ".groundwork/evidence/$1"
  echo "fixture $1" > ".groundwork/evidence/$1/old.txt"
}
card 1.1 todo
card 1.2 todo
card 1.3 done
cat >> .groundwork/cards/1.3.md <<'EOF'
- 2026-10-18 done
- 2026-10-18 approved by human
EOF
git add -A
git commit -qm "cards"
B1=$(git rev-parse HEAD)

"${GW[@]}" reassess 1.1 --target main --dep decision:0001 >/dev/null
"${GW[@]}" reassess 1.2 --target main --dep decision:0001 >/dev/null
"${GW[@]}" reassess 1.3 --target main --dep decision:0001 >/dev/null
git add -A
git commit -qm "context snapshots"
START=$(git rev-parse HEAD)
git push -qu origin main

git worktree add -q -b gw/1.1 ../dev-a main
git worktree add -q -b gw/1.2 ../dev-b main
[ "$(git -C ../dev-a rev-parse HEAD)" = "$START" ]
[ "$(git -C ../dev-b rev-parse HEAD)" = "$START" ]

# Dev A: intentional decision change, unrelated decision change, real test, context reassessment.
cd ../dev-a
cat > .groundwork/decisions/0001-session-storage.md <<'EOF'
---
id: 0001
title: Session storage
status: proposed
date: 2026-10-18
---
Use server-side sessions.
EOF
cat > .groundwork/decisions/0002-analytics.md <<'EOF'
---
id: 0002
title: Analytics
status: proposed
date: 2026-10-18
---
Use a vendor.
EOF
echo auth > auth.txt
mkdir -p .groundwork/work/1.1
cat > .groundwork/work/1.1/HANDOFF.md <<'EOF'
# Handoff
- **Current card:** 1.1 Auth
- **Next step:** review the auth change
EOF
./test-auth.sh > .groundwork/evidence/1.1/test-auth.txt
sed -i 's/^status: todo$/status: awaiting-approval/' .groundwork/cards/1.1.md
sed -i 's|## Evidence|## Evidence\n- [test-auth.txt](../evidence/1.1/test-auth.txt), passed|' .groundwork/cards/1.1.md
"${GW[@]}" reassess 1.1 --target origin/main >/dev/null
set +e
OUT=$("${GW[@]}" check --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -eq 0 ]
git add -A
git commit -qm "[1.1] auth"
cd ../repo
git merge --no-ff gw/1.1 -m "Merge PR #1 (simulated reviewed merge)"
git push -q origin main

# Dev B: started at the same baseline; sees A's incoming decision before integrating.
cd ../dev-b
echo profile > profile.txt
mkdir -p .groundwork/work/1.2
cat > .groundwork/work/1.2/HANDOFF.md <<'EOF'
# Handoff
- **Current card:** 1.2 Profile
- **Next step:** integrate upstream and reassess
EOF
./test-profile.sh > .groundwork/evidence/1.2/test-profile.txt
sed -i 's|## Evidence|## Evidence\n- [test-profile.txt](../evidence/1.2/test-profile.txt), passed|' .groundwork/cards/1.2.md
git add -A
git commit -qm "[1.2] profile"
[ "$(git -C ../repo rev-parse gw/1.1)" != "$(git -C ../repo rev-parse gw/1.2)" ]
[ "$(git -C ../repo merge-base gw/1.1 gw/1.2)" = "$START" ]
git fetch -q origin
set +e
OUT=$("${GW[@]}" check --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -ne 0 ]
grep -q "freshness: behind target" <<<"$OUT"
grep -q "decision:0001:.*verdict=reassess (incoming upstream change)" <<<"$OUT"
! grep -q "decision:0002" <<<"$OUT"
! grep -q "1.3" <<<"$OUT"

# Marking the current task done must not bypass context validation.
sed -i 's/^status: todo$/status: done/' .groundwork/cards/1.2.md
set +e
OUT=$("${GW[@]}" check --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -ne 0 ]
grep -q "decision:0001" <<<"$OUT"
sed -i 's/^status: done$/status: todo/' .groundwork/cards/1.2.md

# Integrate main. Freshness clears; the recorded snapshot is still stale.
git merge --no-ff origin/main -m "Merge main into gw/1.2 (simulated)"
[ -f .groundwork/work/1.1/HANDOFF.md ]
[ -f .groundwork/work/1.2/HANDOFF.md ]
set +e
OUT=$("${GW[@]}" check --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -ne 0 ]
grep -q "freshness: ok" <<<"$OUT"
grep -q "decision:0001:.*verdict=reassess" <<<"$OUT"
! grep -q "decision:0002" <<<"$OUT"

# Reassess after inspecting, then deliberately change the decision further.
cat > .groundwork/decisions/0001-session-storage.md <<'EOF'
---
id: 0001
title: Session storage
status: proposed
date: 2026-10-18
---
Use server-side sessions in Redis.
EOF
./test-integration.sh > .groundwork/evidence/1.2/test-integration.txt
sed -i 's|## Evidence|## Evidence\n- [test-integration.txt](../evidence/1.2/test-integration.txt), passed|' .groundwork/cards/1.2.md
"${GW[@]}" reassess 1.2 --target origin/main >/dev/null
set +e
OUT=$("${GW[@]}" check --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -eq 0 ]
grep -q "decision:0001:.*verdict=ok" <<<"$OUT"
! grep -q "decision:0002" <<<"$OUT"
git add -A
git commit -qm "[1.2] reassess decision 0001"

# A later upstream change triggers reassessment again.
cd ../repo
cat > .groundwork/decisions/0001-session-storage.md <<'EOF'
---
id: 0001
title: Session storage
status: proposed
date: 2026-10-18
---
Use server-side sessions with a shared store.
EOF
git add -A
git commit -qm "upstream decision change (simulated)"
git push -q origin main
cd ../dev-b
git fetch -q origin
set +e
OUT=$("${GW[@]}" check --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -ne 0 ]
grep -q "decision:0001:.*verdict=reassess (upstream changed since the last acknowledgment)" <<<"$OUT"

# Integrate the new upstream change; the recorded snapshot is stale again until reassessment.
git merge --no-ff -X theirs origin/main -m "Merge upstream decision into gw/1.2 (simulated)"
set +e
OUT=$("${GW[@]}" check --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -ne 0 ]
grep -q "freshness: ok" <<<"$OUT"
grep -q "decision:0001:.*verdict=reassess" <<<"$OUT"

"${GW[@]}" reassess 1.2 --target origin/main >/dev/null
"${GW[@]}" check --base origin/main
cat > .groundwork/work/1.2/HANDOFF.md <<'EOF'
# Handoff
- **Phase:** 1
- **Current card:** 1.2 Profile
- **Status:** ready for PR review
- **Next step:** merge PR #2 after review
EOF
git add -A
git commit -qm "[1.2] ready for review"
git push -q origin gw/1.2
git push -q origin gw/1.2:refs/pull/2/head

# Advance main with an unrelated change, then create the simulated merge ref.
cd ../repo
echo unrelated > unrelated.txt
git add -A
git commit -qm "unrelated main change (simulated)"
git push -q origin main
git merge --no-ff gw/1.2 -m "Merge PR #2 (simulated reviewed merge)"
git push -q origin main
git push -q origin "$(git rev-parse HEAD):refs/pull/2/merge"

# A fresh clone must resume from tracked records, not ignored local state.
cd "$ROOT"
git clone -q -b main origin.git fresh
cd fresh
git fetch -q origin refs/pull/2/head:refs/remotes/origin/pr-head refs/pull/2/merge:refs/remotes/origin/pr-merge
[ -f .groundwork/cards/1.2.md ]
[ -f .groundwork/decisions/0001-session-storage.md ]
[ -f .groundwork/work/1.2/context.json ]
[ -f .groundwork/work/1.2/HANDOFF.md ]
[ -f .groundwork/evidence/1.2/test-integration.txt ]
git ls-files --error-unmatch .groundwork/work/1.2/context.json .groundwork/work/1.2/HANDOFF.md >/dev/null
[ ! -e .groundwork/.approvals ]
git switch -q gw/1.2
"${GW[@]}" status | grep -q "1.2 Profile"

# Head checks the PR head; merge checks and tests the simulated merge result.
git switch -q --detach origin/pr-head
set +e
OUT=$("${GW[@]}" check --task 1.2 --base origin/main 2>&1); CODE=$?
set -e
echo "$OUT"
[ "$CODE" -ne 0 ]
grep -q "freshness: behind target" <<<"$OUT"
grep -q "decision:0001:.*verdict=ok" <<<"$OUT"

git switch -q --detach origin/pr-merge
"${GW[@]}" check --task 1.2 --base origin/main
./test-integration.sh
echo "DEMO PASS"
