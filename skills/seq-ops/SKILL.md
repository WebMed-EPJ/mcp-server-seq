---
name: seq-ops
description: >
  Expert Seq log analysis for DevOps — use for incident investigation, system
  health checks, error pattern detection, and post-deployment monitoring. Invoke
  proactively whenever the user mentions alerts, errors in dev or prod, something
  being broken or slow, log queries, or asks to "check the system". Also use for
  morning health checks, deployment follow-ups, or any time you'd naturally want
  to look at structured logs to answer a question.
compatibility: "Requires the mcp-server-seq MCP server. Install with: claude mcp add --transport stdio --env SEQ_BASE_URL=<url> --env SEQ_API_KEY=<key> seq -- npx -y mcp-seq"
---

# Seq Operations

You have four Seq tools. Under the WebMed marketplace plugin they're served by two MCP
servers — **`seq-prod`** (production Seq, `seq.intern.webmed.no`) and **`seq-test`** (the
test environment, `seq.k8s.webmedepj.no`). The examples below use the **`seq-prod:`** prefix
since incident work is usually about prod; **swap `seq-prod:` for `seq-test:`** to run the
exact same query against the test environment.

| Tool | Purpose |
|------|---------|
| `seq-prod:get_alert_state` | Current state of all configured alerts (firing / ok / suppressed) — **usually unavailable, see the caveat below** |
| `seq-prod:get_signals` | List saved named filters — call this early to discover available signal IDs |
| `seq-prod:get_events` | Query structured log events with filters, time ranges, and pagination |
| `seq-prod:sql_query` | Run SQL-style aggregations (count, sum, mean, percentile, group by, time-slicing) — use instead of `seq-prod:get_events` for rollups |

**Reach for `seq-prod:sql_query`, not `seq-prod:get_events`, whenever the answer is a number or a breakdown** — "how many errors", "which service is worst", "p95 latency over time". `seq-prod:get_events` returns raw rows you'd have to count by hand (and large result sets get truncated); `seq-prod:sql_query` computes the aggregate server-side.

**But budget it.** An aggregate scans every event in the window, and on prod that is ~1 million events per hour — so `sql_query` is also the tool that times out. Read **[Query cost](#query-cost--how-not-to-time-out)** before your first query and set `range` explicitly on every call.

> ### ⚠️ `get_alert_state` is usually unavailable — expect `403 Forbidden`
>
> The hosted Seq connector (`seq-prod` / `seq-test` via the marketplace plugin) authenticates
> with a **shared, server-side API key that is scoped to read-only access**. Seq's **alert-state
> API requires elevated permissions** that this key does not have, so `seq-prod:get_alert_state`
> (and `seq-test:get_alert_state`) will **almost always fail with `403 Forbidden ("Unauthorized")`**.
>
> This is an expected permissions limitation, **not an outage and not a transient error** — do
> **not** retry it, and do not report the 403 as "Seq is down". The other three tools
> (`get_signals`, `get_events`, `sql_query`) work fine on the standard read-only key.
>
> **To actually read alert state**, the end user must configure a **personal Seq API key that
> carries more than read-only rights** — i.e. a Seq account/role permitted to read alerts — and
> point the connector at that key instead of the shared read-only one (set `SEQ_API_KEY` to the
> personal key on a local/standalone install; for the hosted plugin this has to be arranged with
> whoever operates the hosted gatekeeper). Until that is in place, treat alert state as
> unavailable and derive the picture from `get_events` / `sql_query` instead.

## Setup (for users installing this skill)

Via the **WebMed marketplace plugin** (`seq-ops@webmed`) the `seq-prod` and `seq-test`
servers are already wired to the hosted gatekeeper — nothing to add. For a standalone /
local install, name the server `seq-prod` so the tool prefixes in this skill match:

```bash
claude mcp add --transport stdio \
  --env SEQ_BASE_URL=http://localhost:5341 \
  --env SEQ_API_KEY=your-api-key \
  seq-prod -- npx -y mcp-seq
```

---

## Personal data is masked before you see it

Every response from these tools passes through the server's redaction step, so
log content reaches you with personal data already replaced by markers:
`[FNR_1]` (fødselsnummer), `[NAME_1]`, `[PHONE_1]`, `[EMAIL_1]` and — because a
WebMed EPJ patient is identified by one — `[GUID_1]` for every GUID in the text.

Three things follow, and they matter for how you investigate:

- **A marker is not corruption and not a bug.** Report the finding around it;
  never tell the user the log looks malformed because of a marker.
- **Never ask the user to paste the raw value back**, and never try to
  reconstruct it from other fields. The value is gone on purpose; if the
  investigation genuinely needs it, the user opens Seq themselves.
- **Markers are numbered per response, and you may follow them.** Within ONE
  answer, `[GUID_1]` is the same value everywhere it appears — in a property, in
  the message quoting it, and in every other event of that answer. So "these
  fourteen lines concern the same patient" is a conclusion you may draw and
  should. Across TWO calls it is not: the numbering restarts in encounter order,
  so `[GUID_1]` in one answer and `[GUID_1]` in the next are unrelated. Never
  carry a marker from an earlier result into a later one — re-run the query wide
  enough to hold everything you need to compare.

Machine identifiers skip the **GUID** pass: `TraceId`, `SpanId`, `ParentId`,
`ParentSpanId`, the event `Id` and its `Links` keep their ids, so correlating a
request across services and paging with `after` work exactly as before. Use those
for correlation — they are what they are for. They are not exempt from redaction
as such: the ordinary PII pass still runs on them, so treat a marker in one of
these fields as a redaction like any other, not as a malformed id.

## Query cost — how not to time out

Every Seq call has a hard per-request timeout (**30 s** by default; `SEQ_REQUEST_TIMEOUT_MS` on the
server). A timeout here is almost never "Seq is down" — it is a query that scanned too many events.
**Cost tracks the number of events in the window, and WebMed prod ingests roughly 1 million events
per hour** (~26 million per day).

Measured on prod, `select count(*) as n from stream group by @Level`:

| `range` | events scanned | elapsed |
|---------|----------------|---------|
| `15m`   | ~0.4 M         | 1.5 s |
| `1h`    | ~1.2 M         | 2.6 s |
| `6h`    | ~4 M           | 8.2 s |
| `12h`   | ~8 M           | 11 s |
| `1d`    | ~26 M          | 11.5 s warm — **over 30 s (timed out) on a cold cache** |

Two things follow, and they are the whole reason queries fail:

- **The same query can succeed once and fail the next time.** A cold cache tripled the `1d` query
  above. Treat anything past ~10 s as already unsafe, not as "fine".
- **`1d` is `sql_query`'s default when `range` is omitted** — so a query with no range runs the most
  expensive window available. **Always set `range` explicitly.**

### Six rules

1. **Start narrow, widen deliberately.** `15m` or `1h` first; widen one step at a time, and only
   because a narrow window came back empty.
2. **Filter before you group.** A selective `where` cuts the aggregation work — the 6 h query above
   dropped from 8.2 s to 2.6 s with `where @Level in ['Error','Fatal'] and Environment = '<slug>'`.
   `@Level` is the cheapest big win: errors are a fraction of a percent of the stream.
3. **Coarse time buckets.** `group by time(5m)` over an hour, never `time(5s)` — a fine bucket over a
   wide window returns thousands of slices and gets truncated. Aim for 12–60 slices.
4. **A long horizon is not one wide query.** "Has this happened this month" → probe specific days
   with `fromDateUtc`/`toDateUtc`, or bucket coarsely (`group by time(1d)`), rather than one 30 d
   aggregate.
5. **Only the listed `range` values exist:** `1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d`.
   `4h`, `8h`, `3d` are rejected before the query even runs — use `fromDateUtc`/`toDateUtc` for any
   other window.
6. **Keep `count` small on `get_events`.** 5 is usually plenty to identify a pattern. A single .NET
   error event with its stack trace runs several thousand characters, so a big `count` is truncated
   anyway — and the truncation costs you the query, not just the extra rows.

### Which tool is cheaper depends on the question

- **`get_events` scans newest-first and stops once it has `count` matches.** So a wide range is
  cheap when matches are common (`@Level = 'Fatal'` over `30d` returns instantly) and expensive when
  they are rare — a filter matching nothing scans the entire window.
- **`sql_query` always scans the whole window**, because an aggregate has to.

So: "how many / which is worst / is it spiking" → `sql_query` on a **narrow** window. "Show me what
the error actually says" → `get_events` with `count: 5`.

### When a call does time out

Do **not** retry the same query — a retry that happens to hit a warm cache teaches you nothing and
usually just burns another 30 s. Step down this ladder instead:

1. **Halve the window** (`1d` → `6h` → `1h` → `15m`).
2. **Add a selective predicate** — `@Level in ['Error','Fatal']`, then `Environment = '<slug>'` or
   `Application = '<name>'`.
3. **Coarsen the rollup** — a coarser `group by time(...)`, a coarser grouping column, or a `limit`.
4. **Switch tool** — if you only need examples rather than a number, `get_events` with a small
   `count`.
5. Only if a **narrow 15 m** query also times out is Seq itself likely unhealthy. Say so; don't keep
   hammering it.

An opaque transport failure (`MCP server connection lost`, a dropped request) means the *client's*
budget expired before the server could return its own timeout message. Same cause, same ladder.

## Investigation Workflow

Follow this sequence — don't jump straight to events without first knowing what signals exist.

### Step 1 — Orient
Always start here:
1. `seq-prod:get_signals` → what named filters exist? Note their IDs — they're your shortcuts.
2. `seq-prod:get_alert_state` → any currently firing alerts? **Expect this to return `403 Forbidden` on the shared read-only key** (see the caveat above) — if it does, that's normal, skip it and move on; only when it succeeds (a personal key with alert rights is configured) should you use it. Don't retry the 403.

**Scoping to a customer / office (WebMed prod).** Each customer (legekontor / office) is a distinct tenant. Every event carries an **`Environment`** property whose value is a short tenant **slug**. In production each tenant also has a saved signal titled **`WebMed - {Name}`** using the display name. **The slug is an assigned identifier — often an abbreviation — and is NOT derivable from the display name. Never guess it:**

> `Environment = 'storoklinikken'` ⇄ signal `WebMed - Storoklinikken`
> `Environment = 'hortenkomls'`    ⇄ signal `WebMed - Horten kommunale legesenter`

So when the user names a customer, resolve the slug rather than constructing it:
- **Preferred:** call `seq-prod:get_signals`, match the title by its `WebMed -` prefix plus the display name (match loosely — spacing/casing vary), and pass that signal `id` to `seq-prod:get_events`/`seq-prod:sql_query`. The signal encodes the exact tenant filter, so you never touch the slug.
- **Name ⇄ slug mapping lives in Lime CRM** — look it up there (the Lime MCP connector exposes the office records) when you have a name but not the slug, or need to turn an `Environment` value from a query back into a real customer name.
- Only after you've confirmed the slug from one of the above, filter directly: `filter: Environment = '{slug}'` (e.g. `Environment = 'hortenkomls'`).

### Step 2 — Scope
Pick a time range based on what you know:
- Vague request ("check the system") → `range: "1h"` first, then `6h` if it looks quiet (`4h` is not a valid value)
- Active incident reported N minutes ago → `range: "1h"` or tighter
- Post-deployment → target the window after the deploy time

### Step 3 — Query
When investigating a reported symptom, start by searching for the **literal terms** the user mentioned before expanding. If someone says "timeout errors", first run:
```
filter: @Message like '%timeout%' or @Exception like '%TimeoutException%'
range: "1h"
```
This grounds your investigation in what was actually reported and avoids missing the specific thing that triggered the alert. Text search itself is not the expensive part — a `like` over 1 h measured 1.6 s on prod — but a `like` that matches **nothing** has to scan the whole window, so keep the window narrow until you know the term appears.

Then broaden — even when focused on a named service, always run a parallel broad error query for the same timeframe:
```
# Literal symptom first (match what was reported)
filter: @Message like '%<symptom>%'

# Targeted service query
filter: @Level in ['Error', 'Fatal'] and Application = 'my-service'

# Broad sweep — same window, all services
filter: @Level in ['Error', 'Fatal']
range: "1h"
```

The service the user names is often a red herring or just one part of a larger incident. Running the broad sweep catches adjacent failures happening simultaneously.

Use `render: true` to get human-readable messages instead of raw templates.

Use `after: <lastEventId>` to paginate if results are truncated.

### Step 4 — Quantify
Once you've seen the raw events, switch to `seq-prod:sql_query` to measure the shape of the problem instead of eyeballing rows:
```sql
-- Which services are erroring, worst first?
select count(*) as n from stream where @Level in ['Error','Fatal'] group by Application order by n desc limit 20

-- Is it spiking? Errors per 5-minute slice
select count(*) as n from stream where @Level = 'Error' group by time(5m)

-- Latency tail on the suspect endpoint
select percentile(Elapsed, 95) as p95 from stream where RequestPath like '/api/checkout%' group by time(1m)
```
Scope the same way as `seq-prod:get_events` — pass a `signal`, a `range`, or explicit `fromDateUtc`/`toDateUtc` — and **always** set the window: omitting `range` runs the 24 h default (see [Query cost](#query-cost--how-not-to-time-out)).

### Step 5 — Pattern
Before concluding, ask:
- Is this error new or pre-existing?
- Is frequency increasing, stable, or spiking? (the `group by time(...)` query above answers this directly)
- Is it isolated to one service or spreading?
- Does timing correlate with a deployment or traffic change?
- Is there a more severe concurrent issue in a different service?

---

## Seq Query Syntax Reference

```
# Level filtering
@Level = 'Error'
@Level in ['Error', 'Fatal']

# Text search
@Message like '%timeout%'
@Exception like '%NullReferenceException%'

# Property filters
StatusCode >= 500
RequestPath like '/api/checkout%'
Application = 'my-service'
UserId = 'user-123'
Environment = 'hortenkomls'   # tenant slug — opaque/abbreviated; resolve via seq-prod:get_signals or Lime CRM (signal: WebMed - Horten kommunale legesenter)

# Combining
@Level = 'Error' and Application = 'payments' and StatusCode >= 500

# Time range shortcuts: 1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d
```

The same filter expressions work as the `where` clause of a `seq-prod:sql_query`.

### Aggregations (`seq-prod:sql_query`)

```sql
-- Count by group. The grouping column comes back automatically — don't select it.
select count(*) as n from stream where @Level = 'Error' group by Application order by n desc limit 20

-- Time series (one row per slice): days (d), hours (h), minutes (m), seconds (s), ms
-- A time() slice is implicit in the timeseries result, so it isn't selected.
select count(*) as n from stream group by time(5m)

-- Distinct / sum / mean / percentile
select count(distinct(UserId)) as users from stream where StatusCode >= 500
select percentile(Elapsed, 95) as p95, mean(Elapsed) as avg from stream where RequestPath like '/api/%' group by RequestPath
```

#### Three syntax rules Seq enforces with a `400`

Each of these is rejected outright, so getting them wrong costs a whole round trip:

| Rule | ✗ Rejected | ✓ Accepted |
|------|-----------|-----------|
| Label an aggregate to sort on it | `... group by Application order by count(*) desc` | `select count(*) as n ... order by n desc` |
| Don't select the grouping column | `select Environment, count(*) as n ... group by Environment` — returns `Environment` **twice** | `select count(*) as n ... group by Environment` |
| `distinct` takes parentheses | `count(distinct UserId)` | `count(distinct(UserId))` |

Add `limit` to bound large rowsets. A `group by time(...)` result comes back as **time slices**, not
rows — too many slices are truncated, so pick a bucket that yields tens of slices, not thousands.

---

## Severity Classification

| Severity | Criteria | Response |
|----------|----------|----------|
| **P0** | Multiple services down, revenue/data impact | Immediate escalation |
| **P1** | Single critical service failing | Urgent investigation |
| **P2** | Degraded performance, partial failures | Investigate within the hour |
| **P3** | Low-frequency errors, no user impact | Monitor and schedule |

---

## Output Format

Always present findings in this structure:

```
**IMMEDIATE ACTIONS REQUIRED**
[P0/P1 issues that need attention right now, or "None"]

**TRENDING CONCERNS**
[Patterns that are worsening or worth watching]

**SYSTEM HEALTH**
[Overall assessment — services checked, error rates, notable patterns]

**RECOMMENDATIONS**
[Specific next steps: what to investigate further, what to fix, what to monitor]
```

Include **specific identifiers** wherever found: workspace IDs, transaction IDs, request IDs, user emails, parameter store paths, Lambda names, file+line numbers. These are what engineers need to take action — a report that says "there was a NullReferenceException in the payment service" is far less useful than one that also says "AlaresDataSource.cs:55, ReportWorkspaceId: 09c03054, Lambda: run-report-workspace-stage-function-prod".

Keep it actionable — the person reading this may be mid-incident. Lead with what matters most.

---

## Common Scenarios

**Morning health check**
→ Quantify first, cheaply: `seq-prod:sql_query` → `select count(*) as n from stream where @Level in ['Error','Fatal'] group by Application order by n desc limit 20` with `range: "6h"` (`8h` is not a valid value — the ladder is `6h` or `12h`)
→ Then pull examples for the worst one: `seq-prod:get_events` with `filter: @Level in ['Error','Fatal'] and Application = '<name>'`, `count: 5`
→ Note any services with unusually high error counts compared to normal
→ (You can try `seq-prod:get_alert_state`, but it's normally `403` on the shared key — see the caveat above)

**Active incident**
→ If `seq-prod:get_alert_state` is available (personal key with alert rights), use it to confirm scope; otherwise (the usual `403` case) go straight to `seq-prod:get_events` / `seq-prod:sql_query` on the affected service and a broad `@Level in ['Error','Fatal']` sweep
→ Look for the first occurrence of the error — when did it start?
→ Check if it correlates with a deployment or config change

**Post-deployment monitoring**
→ Compare error rates before and after the deploy time
→ Watch for new exception types that didn't exist pre-deploy
→ Check downstream services for cascading effects

**Performance investigation**
→ `filter: ResponseTime > 5000` (adjust threshold to context)
→ Look for timeout patterns: `@Message like '%timeout%' or @Exception like '%TimeoutException%'`
→ Quantify the tail rather than eyeballing rows: `select percentile(Elapsed, 95) as p95 from stream where RequestPath like '/api/%' group by RequestPath order by p95 desc limit 20`

**Single customer / office reported a problem**
→ Resolve the tenant first: find their signal via `seq-prod:get_signals` (title `WebMed - {Name}`) and scope with its `id`, or get the slug from Lime CRM — don't guess it
→ Then quantify: `seq-prod:sql_query` → `select count(*) as n from stream where @Level = 'Error' and Environment = 'hortenkomls' group by time(5m)`, `range: "1h"`
→ Compare against the fleet — is only this office affected, or is it a broader incident?

**Which customers are affected? (cross-tenant triage)**
→ `seq-prod:sql_query` → `select count(*) as n from stream where @Level in ['Error','Fatal'] group by Environment order by n desc limit 20`, `range: "15m"` to start — this one is cheap because `@Level` filters out almost the whole stream before grouping
→ Surfaces the worst-hit offices in one call instead of querying signals one by one
→ The result lists raw `Environment` slugs — map them back to customer names via Lime CRM before reporting
