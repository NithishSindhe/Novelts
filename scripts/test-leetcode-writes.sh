#!/usr/bin/env bash
#
# test-leetcode-writes.sh
#
# End-to-end verification of the LeetCode incremental-writes refactor.
# API + UI only (no direct DB access). All state is asserted by reading it
# back through GET /api/leetcode, GET /api/activity and GET /api/tracker.
#
# Phases:
#   0  Pre-flight   : tsc / lint / build            (blocking)
#   1  Auth         : 401/400 checks in PROD mode    (dev fallback OFF)
#   2  Functional   : solve / attempt / un-solve     (DEV mode)
#   3  PUT diff     : whole-state reconciliation      (DEV mode)
#   5  Regression   : notes / check-in / feed order   (DEV mode)
#   4  UI checklist : printed for manual browser test
#   6  Residue      : report test data left on dev user
#
# Decisions baked in:
#   - Uses the existing NEXT_PUBLIC_DEV_CLOUD_USER_ID (dev fallback) for auth.
#   - Derives a REAL problem key programmatically from lib/leetcodeData.ts.
#   - Option B lifecycle: the script starts its own dev + prod servers on free
#     ports (nothing is assumed to be running; port 3000 may be occupied).
#
set -uo pipefail

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEV_PORT="${DEV_PORT:-3100}"
PROD_PORT="${PROD_PORT:-3101}"
DEV_BASE="http://localhost:${DEV_PORT}"
PROD_BASE="http://localhost:${PROD_PORT}"

RUN_BUILD="${RUN_BUILD:-1}"      # set 0 to skip Phase 0 build (reuse existing .next)
RUN_PROD="${RUN_PROD:-1}"        # set 0 to skip Phase 1 (auth) which needs a prod server
TODAY="$(date +%Y-%m-%d)"

PASS=0
FAIL=0
DEV_PID=""
PROD_PID=""
TMPDIR="$(mktemp -d)"

# --------------------------------------------------------------------------
# Output helpers
# --------------------------------------------------------------------------
c_green() { printf '\033[32m%s\033[0m' "$1"; }
c_red()   { printf '\033[31m%s\033[0m' "$1"; }
c_blue()  { printf '\033[34m%s\033[0m' "$1"; }

hdr()  { printf '\n%s\n' "$(c_blue "==== $* ====")"; }
pass() { PASS=$((PASS+1)); printf '  %s %s\n' "$(c_green PASS)" "$1"; }
fail() { FAIL=$((FAIL+1)); printf '  %s %s\n' "$(c_red FAIL)" "$1"; [ $# -gt 1 ] && printf '        %s\n' "$2"; }

assert_eq() { # desc expected actual
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "expected [$2] got [$3]"; fi
}
assert_ne() { # desc notexpected actual
  if [ "$2" != "$3" ]; then pass "$1"; else fail "$1" "did not expect [$2]"; fi
}

cleanup() {
  [ -n "$DEV_PID" ]  && kill "$DEV_PID"  2>/dev/null
  [ -n "$PROD_PID" ] && kill "$PROD_PID" 2>/dev/null
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

# --------------------------------------------------------------------------
# Prereqs
# --------------------------------------------------------------------------
hdr "Prerequisites"
for bin in jq node curl npx; do
  command -v "$bin" >/dev/null 2>&1 || { fail "$bin installed"; echo "Missing $bin. Aborting."; exit 1; }
done
pass "jq / node / curl / npx present"

DEV_USER="$(grep -E '^NEXT_PUBLIC_DEV_CLOUD_USER_ID=' .env.local | head -1 | cut -d= -f2- | tr -d "\"' ")"
if [ -z "$DEV_USER" ]; then
  fail "NEXT_PUBLIC_DEV_CLOUD_USER_ID set in .env.local"
  echo "Dev fallback user id is required for API auth in dev mode. Aborting."; exit 1
fi
pass "dev user id resolved (${DEV_USER})"

# Derive two REAL problem keys straight from the source of truth.
KEYS="$(node --experimental-strip-types --input-type=module -e '
import("./lib/leetcodeData.ts").then((m) => {
  const p0 = m.LEETCODE_PATTERNS[0];
  const p1 = m.LEETCODE_PATTERNS[1] ?? m.LEETCODE_PATTERNS[0];
  const primary = p0.problems[p0.problems.length - 1]; // deep/obscure -> low residue
  const secondary = p1.problems[0];
  process.stdout.write(primary.key + "\n" + secondary.key + "\n");
}).catch((e) => { console.error(e); process.exit(1); });
' 2>"$TMPDIR/keyerr")"
KEY="$(printf '%s\n' "$KEYS"  | sed -n '1p')"
KEY2="$(printf '%s\n' "$KEYS" | sed -n '2p')"
if [ -z "$KEY" ] || [ -z "$KEY2" ]; then
  fail "derive real problem keys" "$(cat "$TMPDIR/keyerr")"; exit 1
fi
pass "derived keys: primary=[$KEY] secondary=[$KEY2]"

# --------------------------------------------------------------------------
# HTTP helpers
# --------------------------------------------------------------------------
status() { # method base path [json]
  local m="$1" b="$2" p="$3" d="${4:-}"
  if [ -n "$d" ]; then
    curl -s -o /dev/null -w '%{http_code}' -X "$m" "$b$p" -H 'Content-Type: application/json' -d "$d"
  else
    curl -s -o /dev/null -w '%{http_code}' -X "$m" "$b$p"
  fi
}
body() { # method base path [json]
  local m="$1" b="$2" p="$3" d="${4:-}"
  if [ -n "$d" ]; then
    curl -s -X "$m" "$b$p" -H 'Content-Type: application/json' -d "$d"
  else
    curl -s -X "$m" "$b$p"
  fi
}

wait_up() { # base label
  local b="$1" label="$2" i
  for i in $(seq 1 60); do
    local code; code="$(curl -s -o /dev/null -w '%{http_code}' "$b/api/leetcode" 2>/dev/null)"
    if [ "$code" != "000" ] && [ -n "$code" ]; then pass "$label reachable ($b, http $code)"; return 0; fi
    sleep 1
  done
  fail "$label reachable" "no response from $b/api/leetcode after 60s"; return 1
}

# --------------------------------------------------------------------------
# Phase 0 - Pre-flight
# --------------------------------------------------------------------------
hdr "Phase 0 - Pre-flight (blocking)"
if npx tsc --noEmit >"$TMPDIR/tsc.log" 2>&1; then pass "tsc --noEmit clean"; else fail "tsc --noEmit" "$(tail -5 "$TMPDIR/tsc.log")"; fi
if npx next lint >"$TMPDIR/lint.log" 2>&1; then pass "next lint clean"; else fail "next lint" "$(tail -8 "$TMPDIR/lint.log")"; fi
if [ "$RUN_BUILD" = "1" ]; then
  echo "  building (npm run build)... this can take a minute"
  if npm run build >"$TMPDIR/build.log" 2>&1; then pass "npm run build succeeded"; else fail "npm run build" "$(tail -20 "$TMPDIR/build.log")"; fi
else
  echo "  (skipped build; RUN_BUILD=0)"
fi

# --------------------------------------------------------------------------
# Phase 1 - Auth (PROD mode, dev fallback OFF)  -- MUST run before `next dev`,
# which rewrites .next and would destroy the production build.
# --------------------------------------------------------------------------
if [ "$RUN_PROD" = "1" ] && [ "$RUN_BUILD" = "1" ]; then
  hdr "Phase 1 - Auth checks (prod mode on :$PROD_PORT)"
  NODE_ENV=production npx next start -p "$PROD_PORT" >"$TMPDIR/prod.log" 2>&1 &
  PROD_PID=$!
  if wait_up "$PROD_BASE" "prod server"; then
    assert_eq "1.1 POST /solve unauth -> 401"   "401" "$(status POST "$PROD_BASE" /api/leetcode/solve '{"key":"x","solved":true}')"
    assert_eq "1.2 POST /attempt unauth -> 401" "401" "$(status POST "$PROD_BASE" /api/leetcode/attempt '{"key":"x"}')"
    assert_eq "1.3a GET /api/leetcode -> 401"   "401" "$(status GET  "$PROD_BASE" /api/leetcode)"
    assert_eq "1.3b GET /api/tracker -> 401"    "401" "$(status GET  "$PROD_BASE" /api/tracker)"
    assert_eq "1.3c GET /api/activity -> 401"   "401" "$(status GET  "$PROD_BASE" /api/activity)"
    assert_eq "1.3d POST /api/checkin -> 401"   "401" "$(status POST "$PROD_BASE" /api/checkin '{"date":"'$TODAY'"}')"
    assert_eq "1.3e POST /leetcode/notes ->401" "401" "$(status POST "$PROD_BASE" /api/leetcode/notes '{"kind":"problem","key":"x","note":"y"}')"
    assert_eq "1.3f POST /tracker/notes ->401"  "401" "$(status POST "$PROD_BASE" /api/tracker/notes '{"notes":[]}')"
  else
    echo "$(tail -20 "$TMPDIR/prod.log")"
  fi
  kill "$PROD_PID" 2>/dev/null; PROD_PID=""
else
  hdr "Phase 1 - Auth checks SKIPPED"
  echo "  (needs a production build; set RUN_BUILD=1 RUN_PROD=1 to enable)"
fi

# --------------------------------------------------------------------------
# Start DEV server (functional phases)
# --------------------------------------------------------------------------
hdr "Starting dev server on :$DEV_PORT"
npx next dev -p "$DEV_PORT" >"$TMPDIR/dev.log" 2>&1 &
DEV_PID=$!
wait_up "$DEV_BASE" "dev server" || { echo "$(tail -20 "$TMPDIR/dev.log")"; exit 1; }

# --------------------------------------------------------------------------
# Phase 2.0 - snapshot (residue baseline)
# --------------------------------------------------------------------------
hdr "Phase 2.0 - snapshot dev user state"
body GET "$DEV_BASE" /api/leetcode > "$TMPDIR/snapshot.json"
BASE_SOLVED="$(jq -r --arg k "$KEY" '.state.solved[$k] // false' "$TMPDIR/snapshot.json")"
BASE_ATT="$(jq -r --arg k "$KEY" '(.state.attempts[$k] // []) | length' "$TMPDIR/snapshot.json")"
pass "snapshot captured (primary key solved=$BASE_SOLVED attempts=$BASE_ATT)"

get_solved()  { body GET "$DEV_BASE" /api/leetcode | jq -r --arg k "$1" '.state.solved[$k] // false'; }
get_solvedat(){ body GET "$DEV_BASE" /api/leetcode | jq -r --arg k "$1" '.state.solvedAt[$k] // ""'; }
get_attlen()  { body GET "$DEV_BASE" /api/leetcode | jq -r --arg k "$1" '(.state.attempts[$k] // []) | length'; }
feed_has()    { body GET "$DEV_BASE" /api/activity | jq -e --arg id "$1" '.events[] | select(.id==$id)' >/dev/null 2>&1; }

# --------------------------------------------------------------------------
# Phase 2 - Functional
# --------------------------------------------------------------------------
hdr "Phase 2 - Functional (dev mode)"

# 2.1 solve insert
r="$(body POST "$DEV_BASE" /api/leetcode/solve "{\"key\":\"$KEY\",\"solved\":true}")"
assert_eq "2.1 solve returns ok" "true" "$(echo "$r" | jq -r '.ok')"
assert_eq "2.1 solved==true after solve" "true" "$(get_solved "$KEY")"
S1="$(get_solvedat "$KEY")"; assert_ne "2.1 solvedAt populated" "" "$S1"
if feed_has "lc-solved:$KEY"; then pass "2.1 feed has lc-solved event"; else fail "2.1 feed has lc-solved event"; fi

# 2.2 idempotent solve
body POST "$DEV_BASE" /api/leetcode/solve "{\"key\":\"$KEY\",\"solved\":true}" >/dev/null
assert_eq "2.2 solvedAt unchanged on repeat solve" "$S1" "$(get_solvedat "$KEY")"

# 2.3 explicit solvedAt on a fresh key (clear any residue first for determinism)
body POST "$DEV_BASE" /api/leetcode/solve "{\"key\":\"$KEY2\",\"solved\":false}" >/dev/null
FIXED="2020-01-02T03:04:05.000Z"
body POST "$DEV_BASE" /api/leetcode/solve "{\"key\":\"$KEY2\",\"solved\":true,\"solvedAt\":\"$FIXED\"}" >/dev/null
assert_eq "2.3 explicit solvedAt stored" "$FIXED" "$(get_solvedat "$KEY2")"

# 2.3b validation errors (authed, dev mode)
assert_eq "2.3b malformed JSON -> 400" "400" "$(status POST "$DEV_BASE" /api/leetcode/solve 'not-json')"
assert_eq "2.3c missing key -> 400"    "400" "$(status POST "$DEV_BASE" /api/leetcode/solve '{"solved":true}')"
assert_eq "2.3d non-bool solved -> 400" "400" "$(status POST "$DEV_BASE" /api/leetcode/solve '{"key":"x","solved":"yes"}')"
assert_eq "2.3e attempt missing key -> 400" "400" "$(status POST "$DEV_BASE" /api/leetcode/attempt '{}')"

# 2.4 attempt append
before="$(get_attlen "$KEY")"
r="$(body POST "$DEV_BASE" /api/leetcode/attempt "{\"key\":\"$KEY\"}")"
SAVED="$(echo "$r" | jq -r '.savedAt')"
assert_eq "2.4 attempt len +1" "$((before+1))" "$(get_attlen "$KEY")"
if feed_has "lc-attempt:$KEY:$SAVED"; then pass "2.4 feed has lc-attempt event"; else fail "2.4 feed has lc-attempt event" "savedAt=$SAVED"; fi

# 2.5 three more attempts
b2="$(get_attlen "$KEY")"
for _ in 1 2 3; do body POST "$DEV_BASE" /api/leetcode/attempt "{\"key\":\"$KEY\"}" >/dev/null; sleep 0.01; done
assert_eq "2.5 three attempts appended" "$((b2+3))" "$(get_attlen "$KEY")"

# 2.6 duplicate explicit attemptedAt is deduped
DUP="2019-06-07T08:09:10.000Z"
body POST "$DEV_BASE" /api/leetcode/attempt "{\"key\":\"$KEY\",\"attemptedAt\":\"$DUP\"}" >/dev/null
afterdup="$(get_attlen "$KEY")"
body POST "$DEV_BASE" /api/leetcode/attempt "{\"key\":\"$KEY\",\"attemptedAt\":\"$DUP\"}" >/dev/null
assert_eq "2.6 duplicate attempt deduped" "$afterdup" "$(get_attlen "$KEY")"

# 2.7 un-solve preserves attempts (core requirement)
att_before_unsolve="$(get_attlen "$KEY")"
body POST "$DEV_BASE" /api/leetcode/solve "{\"key\":\"$KEY\",\"solved\":false}" >/dev/null
assert_eq "2.7 solved==false after un-solve" "false" "$(get_solved "$KEY")"
assert_eq "2.7 attempts preserved on un-solve" "$att_before_unsolve" "$(get_attlen "$KEY")"
if feed_has "lc-solved:$KEY"; then fail "2.7 lc-solved feed event removed"; else pass "2.7 lc-solved feed event removed"; fi
if feed_has "lc-attempt:$KEY:$SAVED"; then pass "2.7 lc-attempt feed events remain"; else fail "2.7 lc-attempt feed events remain"; fi

# --------------------------------------------------------------------------
# Phase 3 - Whole-state PUT diff
# --------------------------------------------------------------------------
hdr "Phase 3 - Whole-state PUT diff (dev mode)"

# 3.1 no-op PUT: round-trip identical
STATE="$(body GET "$DEV_BASE" /api/leetcode | jq -c '.state')"
r="$(body PUT "$DEV_BASE" /api/leetcode "{\"state\":$STATE}")"
assert_eq "3.1 no-op PUT returns ok" "true" "$(echo "$r" | jq -r '.ok')"
STATE2="$(body GET "$DEV_BASE" /api/leetcode | jq -c '.state')"
assert_eq "3.1 solved set unchanged" \
  "$(echo "$STATE" | jq -cS '.solved')" "$(echo "$STATE2" | jq -cS '.solved')"
assert_eq "3.1 attempts unchanged" \
  "$(echo "$STATE" | jq -cS '.attempts')" "$(echo "$STATE2" | jq -cS '.attempts')"

# 3.2 PUT adds a solved key (re-solve KEY via PUT)
NS="$(echo "$STATE2" | jq -c --arg k "$KEY" '.solved[$k]=true | .solvedAt[$k]="2021-05-05T05:05:05.000Z"')"
body PUT "$DEV_BASE" /api/leetcode "{\"state\":$NS}" >/dev/null
assert_eq "3.2 added solved key present" "true" "$(get_solved "$KEY")"
if feed_has "lc-solved:$KEY"; then pass "3.2 feed re-materialized solve"; else fail "3.2 feed re-materialized solve"; fi

# 3.3 PUT omitting a solved key removes it, attempts preserved
att_keep="$(get_attlen "$KEY")"
DS="$(body GET "$DEV_BASE" /api/leetcode | jq -c --arg k "$KEY" 'del(.state.solved[$k]) | del(.state.solvedAt[$k]) | .state')"
body PUT "$DEV_BASE" /api/leetcode "{\"state\":$DS}" >/dev/null
assert_eq "3.3 omitted solved key removed" "false" "$(get_solved "$KEY")"
assert_eq "3.3 attempts preserved through PUT" "$att_keep" "$(get_attlen "$KEY")"

# 3.4 PUT with fewer attempts never deletes existing attempts
FEWER="$(body GET "$DEV_BASE" /api/leetcode | jq -c --arg k "$KEY" '.state.attempts[$k]=[] | .state')"
cur="$(get_attlen "$KEY")"
body PUT "$DEV_BASE" /api/leetcode "{\"state\":$FEWER}" >/dev/null
assert_eq "3.4 attempts append-only (not deleted by PUT)" "$cur" "$(get_attlen "$KEY")"

# --------------------------------------------------------------------------
# Phase 5 - Regression
# --------------------------------------------------------------------------
hdr "Phase 5 - Regression (dev mode)"

# 5.1 note survives solves/attempts/PUT
NOTETXT="verify-note-$(date +%s)"
body POST "$DEV_BASE" /api/leetcode/notes "{\"kind\":\"problem\",\"key\":\"$KEY\",\"note\":\"$NOTETXT\"}" >/dev/null
body POST "$DEV_BASE" /api/leetcode/solve "{\"key\":\"$KEY\",\"solved\":true}" >/dev/null
body POST "$DEV_BASE" /api/leetcode/attempt "{\"key\":\"$KEY\"}" >/dev/null
ST="$(body GET "$DEV_BASE" /api/leetcode | jq -c '.state')"
body PUT "$DEV_BASE" /api/leetcode "{\"state\":$ST}" >/dev/null
GOTNOTE="$(body GET "$DEV_BASE" /api/leetcode | jq -r --arg k "$KEY" '.state.problemNotes[$k] // ""')"
assert_eq "5.1 problem note not wiped by state sync" "$NOTETXT" "$GOTNOTE"

# 5.2 check-in endpoint records a leetcode source for today. NOTE: check-ins are
# driven by the client (checkInFromLeetcode -> /api/checkin), not by the /solve
# API, so this exercises /api/checkin directly.
body POST "$DEV_BASE" /api/checkin "{\"date\":\"$TODAY\",\"source\":\"leetcode\",\"kind\":\"leetcode_solved\",\"refKey\":\"$KEY\"}" >/dev/null
SRC="$(body GET "$DEV_BASE" /api/tracker | jq -r --arg d "$TODAY" '(.state.checkIns[$d].sources // []) | index("leetcode") // "none"')"
if [ "$SRC" = "none" ]; then fail "5.2 check-in has leetcode source for today" "sources missing"; else pass "5.2 check-in has leetcode source for today"; fi

# 5.3 feed newest-first, only rendered events
FEED="$(body GET "$DEV_BASE" /api/activity)"
ORDERED="$(echo "$FEED" | jq -r '[.events[].timestamp] | (. == (sort | reverse))')"
assert_eq "5.3 activity feed sorted newest-first" "true" "$ORDERED"
NULLIDS="$(echo "$FEED" | jq -r '[.events[] | select(.id==null)] | length')"
assert_eq "5.3 no null-id events in feed" "0" "$NULLIDS"

# --------------------------------------------------------------------------
# Phase 4 - Manual UI checklist
# --------------------------------------------------------------------------
hdr "Phase 4 - Manual UI checklist (browser, signed in, DevTools Network open)"
cat <<'EOF'
  [ ] 4.1 Mark a problem solved  -> exactly one POST /api/leetcode/solve, NO full PUT /api/leetcode
  [ ] 4.2 Record an attempt      -> one POST /api/leetcode/attempt, no redundant PUT
  [ ] 4.3 Un-solve               -> POST /solve {solved:false}; attempts survive a reload
  [ ] 4.4 Reload page            -> UI matches persisted state
  [ ] 4.5 Rapid multi-toggle     -> each is its own O(1) POST; no per-click full PUT
  [ ] 4.6 Recent-activity panel  -> matches GET /api/activity
  [ ] 4.7 Sign-in reconciliation -> offline local edits, then sign in: exactly ONE full PUT, nothing lost
  [ ] 4.8 Failure self-heal      -> block /solve in DevTools, mark solved, do another action:
          the suppressed signature is cleared and a later full PUT reconciles the missed solve
EOF

# --------------------------------------------------------------------------
# Phase 6 - Residue report
# --------------------------------------------------------------------------
hdr "Phase 6 - Residue report (dev user: $DEV_USER)"
echo "  Test data left on the dev user (API has no attempt-delete path):"
echo "    primary   key : $KEY"
echo "      solved now  : $(get_solved "$KEY")   (baseline: $BASE_SOLVED)"
echo "      attempts now: $(get_attlen "$KEY")   (baseline: $BASE_ATT)"
echo "    secondary key : $KEY2  (solved via 2.3, solvedAt=$FIXED)"
echo "  Note: attempt rows created here persist by design (append-only)."

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
hdr "Summary"
printf '  %s passed, %s failed\n' "$(c_green "$PASS")" "$([ "$FAIL" -gt 0 ] && c_red "$FAIL" || echo "$FAIL")"
[ "$FAIL" -eq 0 ] || exit 1
