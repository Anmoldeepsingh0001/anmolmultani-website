#!/usr/bin/env python3
"""
PEI Gas Price Tracker — Charlottetown rack -> IRAC pump price.

How PEI pricing works (IRAC methodology):
  pump price = (Period Average Rack + wholesale margin 5.0 + forward averaging adj
                + federal excise + PE provincial tax + retail margin 7.0-8.0) x 1.15 HST
  Adjustments take effect 12:01 a.m. every Tuesday and Friday (Mon/Thu at midnight).
  The "Period Average Rack" is the average Charlottetown terminal rack over the
  previous pricing window (Petro-Canada's twice-weekly averages use the same
  windows: Tue-Thu racks -> Fri-Mon price, Fri-Mon racks -> Tue-Thu price).

Commands:
  python3 tracker.py update            fetch everything, predict, send alerts, rebuild page
  python3 tracker.py backfill [YYYY]   load IRAC history since Jan 1 of YYYY (default 2024)
  python3 tracker.py rack 124.6 [YYYY-MM-DD]   log a Petro-Canada Charlottetown REG rack you saw
  python3 tracker.py serve [port]      host the dashboard at http://localhost:8787
  python3 tracker.py test-alert        send a test push to your phone
  python3 tracker.py backtest          show how well the model predicted past changes
Standard library only. No pip installs.
"""
import csv, datetime as dt, html, json, os, re, ssl, statistics, sys, time, urllib.request, urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get("GAS_DATA_DIR") or os.path.join(ROOT, "data")
SITE = os.path.join(ROOT, "site")
CONFIG = os.environ.get("GAS_CONFIG") or os.path.join(ROOT, "config.json")
IRAC_CSV = os.path.join(DATA, "irac_prices.csv")
MARKET_CSV = os.path.join(DATA, "market_daily.csv")
RACK_CSV = os.path.join(DATA, "rack_manual.csv")
STATE = os.path.join(DATA, "state.json")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; PEI gas tracker; personal use)"}
L_PER_GAL = 3.785411784
HST = 0.15
# Futures overshoot the local rack a little: only pass through 90% of the predicted rack move.
# Backtest 2024-2026: avg miss 2.21 -> 2.14 c/L, direction accuracy unchanged or better.
DAMP = 0.9

IRAC_FIELDS = ["date", "reg_rack", "mid_rack", "prem_rack", "dsl_rack",
               "reg_wm", "reg_faa", "mid_faa", "prem_faa", "dsl_faa",
               "reg_excise", "dsl_excise", "reg_prov", "dsl_prov",
               "reg_min", "reg_max", "mid_min", "mid_max", "prem_min", "prem_max", "dsl_min", "dsl_max",
               "furnace_rack", "furnace_max"]


# ---------------------------------------------------------------- utils
def load_config():
    cfg = {"ntfy_server": "https://ntfy.sh", "ntfy_topic": "", "alert_below": 0,
           "alert_min_change": 1.0, "daily_digest": True, "retail_min": 7.0}
    if os.path.exists(CONFIG):
        cfg.update(json.load(open(CONFIG)))
    return cfg


def fetch(url, tries=3):
    ctx = ssl.create_default_context()
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fields):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    os.replace(tmp, path)


def load_state():
    return json.load(open(STATE)) if os.path.exists(STATE) else {}


def save_state(s):
    json.dump(s, open(STATE, "w"), indent=2)


def d(s):
    return dt.date.fromisoformat(s)


def today():
    return dt.date.today()


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- IRAC
def _flatten(page):
    page = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    txt = html.unescape(re.sub(r"<[^>]+>", "|", page))
    return [t.strip() for t in re.split(r"\s*\|\s*", txt) if t.strip()]


def _after(tok, label, n, start=0):
    i = tok.index(label, start)
    vals = []
    j = i + 1
    while len(vals) < n and j < len(tok):
        v = num(tok[j])
        if v is not None:
            vals.append(v)
        j += 1
    return vals, i


def parse_irac(page):
    tok = _flatten(page)
    head = next(t for t in tok if t.startswith("Petroleum Prices –") or t.startswith("Petroleum Prices -"))
    m = re.search(r"([A-Z][a-z]+ \d{1,2}, \d{4})", head)
    date = dt.datetime.strptime(m.group(1), "%B %d, %Y").date().isoformat()
    rack, i = _after(tok, "Period Average Rack", 4)
    wm, _ = _after(tok, "Wholesale Margin", 4, i)
    faa, _ = _after(tok, "Forward Averaging Adjustment", 4, i)
    exc, _ = _after(tok, "Federal Excise Tax", 4, i)
    prov, _ = _after(tok, "PE Provincial Tax", 4, i)
    ss, _ = _after(tok, "PUMP PRICE (SS)", 8, i)
    row = dict(date=date, reg_rack=rack[0], mid_rack=rack[1], prem_rack=rack[2], dsl_rack=rack[3],
               reg_wm=wm[0], reg_faa=faa[0], mid_faa=faa[1], prem_faa=faa[2], dsl_faa=faa[3],
               reg_excise=exc[0], dsl_excise=exc[3], reg_prov=prov[0], dsl_prov=prov[3],
               reg_min=ss[0], reg_max=ss[1], mid_min=ss[2], mid_max=ss[3],
               prem_min=ss[4], prem_max=ss[5], dsl_min=ss[6], dsl_max=ss[7])
    try:
        k = tok.index("Furnace Oil – " + m.group(1)) if ("Furnace Oil – " + m.group(1)) in tok else \
            next(n for n, t in enumerate(tok) if t.startswith("Furnace Oil"))
        fr, _ = _after(tok, "Period Average Rack", 1, k)
        fm, _ = _after(tok, "Maximum Price (After Tax)", 1, k)
        row.update(furnace_rack=fr[0], furnace_max=fm[0])
    except (StopIteration, ValueError, IndexError):
        pass
    return row


def irac_dates():
    page = fetch("https://irac.pe.ca/petrol/historical-pricing-data/")
    return sorted(set(re.findall(r"<option value='(\d{4}-\d{2}-\d{2})'", page)))


def irac_get(date=None):
    if date is None:
        return parse_irac(fetch("https://irac.pe.ca/petrol/current-petroleum-prices/"))
    return parse_irac(fetch("https://irac.pe.ca/petrol/historical-pricing-data/?effDate=" + date))


def update_irac(since="2024-01-01", verbose=False):
    rows = {r["date"]: r for r in read_csv(IRAC_CSV)}
    new = []
    try:
        cur = irac_get()
        if cur["date"] not in rows:
            new.append(cur["date"])
        rows[cur["date"]] = cur
    except Exception as e:
        print("IRAC current page failed:", e)
    try:
        wanted = [x for x in irac_dates() if x >= since and x not in rows]
    except Exception as e:
        print("IRAC date list failed:", e)
        wanted = []
    for n, x in enumerate(wanted):
        try:
            r = irac_get(x)
            if r["date"] == x:
                rows[x] = r
                new.append(x)
            if verbose:
                print(f"  {n + 1}/{len(wanted)} {x} reg {r['reg_min']}")
        except Exception as e:
            print("  skip", x, e)
        time.sleep(0.4)
    out = sorted(rows.values(), key=lambda r: r["date"])
    write_csv(IRAC_CSV, out, IRAC_FIELDS)
    return out, sorted(set(new))


# ---------------------------------------------------------------- market
def update_market(start="2023-12-01"):
    """Daily NYMEX RBOB gasoline futures (USD/gal) + Bank of Canada USD/CAD -> cents/L CAD."""
    p1 = int(dt.datetime.combine(d(start), dt.time()).timestamp())
    p2 = int(time.time()) + 86400
    j = json.loads(fetch(f"https://query1.finance.yahoo.com/v8/finance/chart/RB=F?period1={p1}&period2={p2}&interval=1d"))
    res = j["chart"]["result"][0]
    rb = {}
    for ts, c in zip(res["timestamp"], res["indicators"]["quote"][0]["close"]):
        if c:
            # Yahoo stamps futures bars at the NY session date
            day = (dt.datetime.fromtimestamp(ts, dt.timezone.utc) - dt.timedelta(hours=5)).date()
            if day.weekday() < 5:
                rb[day.isoformat()] = c
    fxj = json.loads(fetch(f"https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?start_date={start}"))
    fx = {o["d"]: float(o["FXUSDCAD"]["v"]) for o in fxj["observations"] if o.get("FXUSDCAD")}
    rows, last_fx = [], None
    for day in sorted(rb):
        last_fx = fx.get(day, last_fx) or (fx[max(k for k in fx if k <= day)] if any(k <= day for k in fx) else None)
        if not last_fx:
            continue
        cpl = rb[day] * last_fx / L_PER_GAL * 100
        rows.append(dict(date=day, rbob_usd_gal=round(rb[day], 4), usdcad=last_fx, rbob_cpl=round(cpl, 2)))
    write_csv(MARKET_CSV, rows, ["date", "rbob_usd_gal", "usdcad", "rbob_cpl"])
    return rows


# ---------------------------------------------------------------- model
def window_for(eff, prev_eff):
    """Market closes that feed the rack average for an adjustment effective `eff`.
    Rack posted on day D reflects the prior day's futures close. Offsets were chosen by
    backtesting 2024-2026 IRAC data: closes from (prev_eff - 2) to (eff - 3)."""
    return prev_eff - dt.timedelta(days=2), eff - dt.timedelta(days=3)


def mean_in(market, a, b):
    v = [r["rbob_cpl"] for r in market if a.isoformat() <= r["date"] <= b.isoformat()]
    return (sum(v) / len(v), len(v)) if v else (None, 0)


def pump_from_rack(rack, faa, excise, prov, retail):
    return round((rack + 5.0 + faa + excise + prov + retail) * (1 + HST), 1)


def build_model(irac, market):
    mk = [dict(date=r["date"], rbob_cpl=float(r["rbob_cpl"])) for r in market]
    pts = []
    for prev, cur in zip(irac, irac[1:]):
        a, b = window_for(d(cur["date"]), d(prev["date"]))
        m, n = mean_in(mk, a, b)
        if m is None:
            continue
        pts.append(dict(date=cur["date"], rack=float(cur["reg_rack"]), rbob=m, basis=float(cur["reg_rack"]) - m,
                        pump=float(cur["reg_min"]), prev_pump=float(prev["reg_min"])))
    by_date = {r["date"]: r for r in irac}
    # walk-forward backtest: basis = previous period's (rack - futures); predict the CHANGE
    rerr, perr, dir_hits, dir_n = [], [], 0, 0
    for i in range(1, len(pts)):
        prev = by_date[pts[i - 1]["date"]]
        pred_rack = float(prev["reg_rack"]) + DAMP * (pts[i]["rbob"] + pts[i - 1]["basis"] - float(prev["reg_rack"]))
        pred_pump = change_pump(prev, pred_rack, by_date[pts[i]["date"]])
        pts[i]["pred_rack"] = round(pred_rack, 1)
        pts[i]["pred_pump"] = pred_pump
        if pts[i]["date"] >= "2025-11-01":   # last 12 months
            rerr.append(abs(pred_rack - pts[i]["rack"]))
            perr.append(abs(pred_pump - pts[i]["pump"]))
            actual_chg = pts[i]["pump"] - pts[i]["prev_pump"]
            if abs(actual_chg) >= 1.0:
                dir_n += 1
                dir_hits += (actual_chg > 0) == (pred_pump - pts[i]["prev_pump"] > 0)
    stats = dict(n=len(perr), mae=round(statistics.mean(perr), 1) if perr else None,
                 rack_mae=round(statistics.mean(rerr), 1) if rerr else None,
                 dir_acc=round(100 * dir_hits / dir_n) if dir_n else None, dir_n=dir_n)
    return pts, stats


def change_pump(prev, pred_rack, cur_taxes=None):
    """Next pump min = previous pump min + 1.15 x (rack change - previous forward-averaging adj
    + any tax change). Avoids needing to know the retail margin IRAC used."""
    t = cur_taxes or prev
    dtax = (float(t["reg_excise"]) + float(t["reg_prov"])) - (float(prev["reg_excise"]) + float(prev["reg_prov"]))
    delta = pred_rack - float(prev["reg_rack"]) - float(prev["reg_faa"]) + dtax
    return round(float(prev["reg_min"]) + delta * (1 + HST), 1)


def next_adjustment(after):
    x = after + dt.timedelta(days=1)
    while x.weekday() not in (1, 4):  # Tue, Fri
        x += dt.timedelta(days=1)
    return x


def predict(irac, market, manual):
    pts, stats = build_model(irac, market)
    # IRAC posts the new schedule the afternoon before it takes effect: a row dated after
    # today is an announced (official) upcoming price, not the price at the pump right now.
    announced = irac[-1] if d(irac[-1]["date"]) > today() else None
    in_force = [r for r in irac if d(r["date"]) <= today()]
    last = in_force[-1] if in_force else irac[-1]
    last_eff = d(last["date"])
    eff = d(announced["date"]) if announced else next_adjustment(today())
    prev_eff = last_eff
    a, b = window_for(eff, prev_eff)
    mk = [dict(date=r["date"], rbob_cpl=float(r["rbob_cpl"])) for r in market]
    m, n = mean_in(mk, a, b)
    expected_days = sum(1 for k in range((b - a).days + 1) if (a + dt.timedelta(days=k)).weekday() < 5)
    basis = pts[-1]["basis"] if pts and pts[-1]["date"] == last["date"] else (pts[-1]["basis"] if pts else 0.0)
    model_rack = (float(last["reg_rack"]) + DAMP * (m + basis - float(last["reg_rack"]))) if m is not None else float(last["reg_rack"])
    # manual Petro-Canada rack entries inside the rack window (rack days = close days + 1)
    ra, rb_ = a + dt.timedelta(days=1), b + dt.timedelta(days=1)
    man = [float(r["reg_rack"]) for r in manual if ra.isoformat() <= r["date"] <= rb_.isoformat()]
    source = "market model"
    rack = model_rack
    if man:
        rack = sum(man) / len(man)
        source = f"your {len(man)} Petro-Canada rack entr{'y' if len(man) == 1 else 'ies'}"
    pump = change_pump(last, rack)
    pmax = round(pump + 1.2, 1)
    if announced:
        pump, pmax, rack = float(announced["reg_min"]), float(announced["reg_max"]), float(announced["reg_rack"])
        source = "IRAC (official)"
    chg = round(pump - float(last["reg_min"]), 1)
    return dict(effective=eff.isoformat(), decision_day=(eff - dt.timedelta(days=1)).isoformat(),
                window_from=a.isoformat(), window_to=b.isoformat(), days_in=n, days_expected=expected_days,
                complete=n >= expected_days and today() > b, basis=round(basis, 1),
                pred_rack=round(rack, 1), model_rack=round(model_rack, 1), source=source,
                pred_min=pump, pred_max=pmax, change=chg, official=bool(announced),
                current_dsl=float(last["dsl_min"]), current_rack=float(last["reg_rack"]),
                current_faa=float(last["reg_faa"]), current_tax=float(last["reg_excise"]) + float(last["reg_prov"]),
                current_min=float(last["reg_min"]), current_max=float(last["reg_max"]),
                current_date=last["date"], stats=stats), pts


# ---------------------------------------------------------------- alerts
def notify(cfg, title, msg, priority=3, tags="fuelpump"):
    if not cfg.get("ntfy_topic"):
        print("[no ntfy_topic set] ", title, "|", msg)
        return False
    url = cfg["ntfy_server"].rstrip("/") + "/" + cfg["ntfy_topic"]
    req = urllib.request.Request(url, data=msg.encode("utf-8"), method="POST", headers={
        "Title": title.encode("ascii", "ignore").decode(), "Priority": str(priority), "Tags": tags, **UA})
    try:
        urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()).read()
        print("pushed:", title)
        return True
    except Exception as e:
        print("push failed:", e)
        return False


def arrow(x):
    return "▲" if x > 0 else ("▼" if x < 0 else "■")


def run_alerts(cfg, irac, new_dates, pred, state):
    sent = state.setdefault("sent", {})
    last = irac[-1]
    # 1) new official price posted
    if last["date"] not in sent.get("posted", []) and len(irac) > 1:
        prev = irac[-2]
        chg = round(float(last["reg_min"]) - float(prev["reg_min"]), 1)
        eff = d(last["date"]).strftime("%a %b %d")
        title = f"PEI gas {arrow(chg)} {abs(chg):.1f}c - now {last['reg_min']}-{last['reg_max']}"
        msg = (f"Regular self-serve {last['reg_min']}–{last['reg_max']} ¢/L, effective 12:01 a.m. {eff}.\n"
               f"Change {chg:+.1f}¢. Diesel {last['dsl_min']}. Period average rack {last['reg_rack']}.")
        pri = 4 if abs(chg) >= cfg["alert_min_change"] * 3 else 3
        if not sent.get("posted"):   # first run: don't spam, just mark
            sent["posted"] = [last["date"]]
        elif notify(cfg, title, msg, pri, "fuelpump," + ("chart_with_upwards_trend" if chg > 0 else "chart_with_downwards_trend")):
            sent["posted"] = (sent.get("posted", []) + [last["date"]])[-20:]
    # 2) prediction on decision day (Mon / Thu) — tells you whether to fill up today
    key = pred["effective"]
    if today().isoformat() == pred["decision_day"] and key not in sent.get("predicted", []) \
            and dt.datetime.now().hour >= 7:
        c = pred["change"]
        if c >= cfg["alert_min_change"]:
            advice, pri, tag = "Fill up TODAY — price likely going up at midnight.", 4, "warning"
        elif c <= -cfg["alert_min_change"]:
            advice, pri, tag = "Wait until tomorrow — price likely dropping at midnight.", 3, "moneybag"
        else:
            advice, pri, tag = "Little or no change expected.", 2, "zzz"
        title = f"Tonight: gas likely {arrow(c)} ~{abs(c):.1f}c (to ~{pred['pred_min']})"
        msg = (f"{advice}\nForecast regular self-serve ~{pred['pred_min']}–{pred['pred_max']} ¢/L from 12:01 a.m. "
               f"{d(pred['effective']).strftime('%a %b %d')} (now {pred['current_min']}).\n"
               f"Based on {pred['source']}; est. rack {pred['pred_rack']}. Typical error ±{pred['stats']['mae']}¢.")
        if notify(cfg, title, msg, pri, "fuelpump," + tag):
            sent["predicted"] = (sent.get("predicted", []) + [key])[-20:]
    # 3) threshold
    below = float(cfg.get("alert_below") or 0)
    if below and float(last["reg_min"]) <= below and sent.get("below") != last["date"]:
        if notify(cfg, f"PEI gas at {last['reg_min']} - below your {below} target", "Good time to fill up.", 4, "tada"):
            sent["below"] = last["date"]
    # 4) weekday reminder to grab the Petro-Canada rack (skipped if already logged today)
    logged = any(r["date"] == today().isoformat() for r in read_csv(RACK_CSV))
    if cfg.get("rack_reminder", True) and today().weekday() < 5 and not logged \
            and sent.get("reminder") != today().isoformat() and dt.datetime.now().hour >= 7:
        url = cfg["ntfy_server"].rstrip("/") + "/" + cfg["ntfy_topic"] if cfg.get("ntfy_topic") else None
        if url:
            req = urllib.request.Request(url, method="POST", data=(
                "Tap to open Petro-Canada rack prices. On your Mac, click the 'Send rack' bookmark.").encode(),
                headers={"Title": "Log today's Charlottetown rack", "Priority": "2", "Tags": "memo",
                         "Click": "https://www.petro-canada.ca/en/business/rack-prices", **UA})
            try:
                urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()).read()
                sent["reminder"] = today().isoformat()
            except Exception as e:
                print("reminder failed:", e)
    # 5) daily digest (low priority, once a day after the market data refreshes)
    if cfg.get("daily_digest") and sent.get("digest") != today().isoformat() and dt.datetime.now().hour >= 7:
        c = pred["change"]
        msg = (f"Now {pred['current_min']}–{pred['current_max']}. Next change {d(pred['effective']).strftime('%a %b %d')} "
               f"12:01 a.m.: trending {arrow(c)} {c:+.1f}¢ (est. rack {pred['pred_rack']}, "
               f"{pred['days_in']}/{pred['days_expected']} days in window).")
        if notify(cfg, "PEI gas daily", msg, 2, "fuelpump"):
            sent["digest"] = today().isoformat()


# ---------------------------------------------------------------- dashboard
def build_site(irac, market, manual, pred, pts):
    os.makedirs(SITE, exist_ok=True)
    payload = dict(
        generated=dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        irac=[{k: r[k] for k in ("date", "reg_rack", "reg_min", "reg_max", "dsl_min", "reg_faa", "reg_excise", "reg_prov")} for r in irac],
        market=[dict(date=r["date"], cpl=float(r["rbob_cpl"])) for r in market],
        manual=manual, pred=pred,
        backtest=[dict(date=p["date"], actual=p["pump"], pred=p.get("pred_pump")) for p in pts if p.get("pred_pump")],
        latest=irac[-1])
    tpl = open(os.path.join(ROOT, "dashboard_template.html")).read()
    out = tpl.replace("/*__DATA__*/null", json.dumps(payload))
    open(os.path.join(SITE, "index.html"), "w").write(out)


# ---------------------------------------------------------------- commands
def cmd_update(verbose=False):
    cfg = load_config()
    irac, new = update_irac(since=cfg.get("backfill_since", "2024-01-01"), verbose=verbose)
    try:
        market = update_market()
    except Exception as e:
        print("market data failed, using cached:", e)
    market = read_csv(MARKET_CSV)
    manual = read_csv(RACK_CSV)
    pred, pts = predict(irac, market, manual)
    state = load_state()
    run_alerts(cfg, irac, new, pred, state)
    state["last_run"] = dt.datetime.now().isoformat(timespec="seconds")
    save_state(state)
    build_site(irac, market, manual, pred, pts)
    print(f"Current {pred['current_min']}-{pred['current_max']} ({pred['current_date']}). "
          f"Next {pred['effective']}: ~{pred['pred_min']} ({pred['change']:+.1f}) via {pred['source']}. "
          f"Backtest MAE {pred['stats']['mae']}c, direction {pred['stats']['dir_acc']}%")


def cmd_rack(value, date=None):
    date = date or today().isoformat()
    rows = [r for r in read_csv(RACK_CSV) if r["date"] != date]
    rows.append(dict(date=date, reg_rack=float(value)))
    write_csv(RACK_CSV, sorted(rows, key=lambda r: r["date"]), ["date", "reg_rack"])
    print(f"Logged rack {value} for {date}")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=SITE, **k)

    def do_GET(self):
        # /add?rack=124.6&date=YYYY-MM-DD  — used by the "Send rack" bookmark
        if self.path.startswith("/add"):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            try:
                self._save(float(q["rack"][0]), q.get("date", [today().isoformat()])[0])
            except Exception as e:
                return self.send_error(400, str(e))
            self.send_response(303)
            self.send_header("Location", "/?saved=" + q["rack"][0])
            return self.end_headers()
        return super().do_GET()

    def _save(self, rack, date):
        cmd_rack(rack, date)
        irac, market, manual = read_csv(IRAC_CSV), read_csv(MARKET_CSV), read_csv(RACK_CSV)
        pred, pts = predict(irac, market, manual)
        build_site(irac, market, manual, pred, pts)

    def do_POST(self):
        if self.path != "/rack":
            return self.send_error(404)
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        f = urllib.parse.parse_qs(body)
        try:
            cmd_rack(float(f["rack"][0]), f.get("date", [today().isoformat()])[0])
            irac, market, manual = read_csv(IRAC_CSV), read_csv(MARKET_CSV), read_csv(RACK_CSV)
            pred, pts = predict(irac, market, manual)
            build_site(irac, market, manual, pred, pts)
        except Exception as e:
            return self.send_error(400, str(e))
        self.send_response(303)
        self.send_header("Location", "/")
        self.end_headers()

    def log_message(self, *a):
        pass


def main():
    a = sys.argv[1:] or ["update"]
    os.makedirs(DATA, exist_ok=True)
    if a[0] == "update":
        cmd_update()
    elif a[0] == "backfill":
        cfg = load_config()
        update_irac(since=(a[1] if len(a) > 1 else "2024") + "-01-01", verbose=True)
        cmd_update()
    elif a[0] == "rack":
        cmd_rack(a[1], a[2] if len(a) > 2 else None)
    elif a[0] == "serve":
        port = int(a[1]) if len(a) > 1 else 8787
        print(f"Dashboard: http://localhost:{port}  (Ctrl+C to stop)")
        ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
    elif a[0] == "test-alert":
        notify(load_config(), "PEI gas tracker connected", "Alerts from your Mac are working.", 3, "white_check_mark")
    elif a[0] == "backtest":
        _, stats = build_model(read_csv(IRAC_CSV), read_csv(MARKET_CSV))
        print(stats)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
