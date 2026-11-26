#!/usr/bin/env python3
"""Deal Finder engine (runs in GitHub Actions). Data lives in deals/data/.

  python3 .github/deal-finder/deals.py list [--item ID]
  python3 .github/deal-finder/deals.py record ITEM --price 149.99 --store "Sporting Life" --url URL \
        [--regular 219.99] [--title "..."] [--stock yes|no] [--verified yes|no]
  python3 .github/deal-finder/deals.py check            # buy alerts due (JSON)
  python3 .github/deal-finder/deals.py mark-alerted ITEM PRICE
  python3 .github/deal-finder/deals.py summary          # rebuild deals/data/summary.json for the page
"""
import argparse, json, os, sys
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "deals", "data")
WATCH, PRICES = os.path.join(DATA, "watchlist.json"), os.path.join(DATA, "prices")
ALERTS, SUMMARY = os.path.join(DATA, "alerts.json"), os.path.join(DATA, "summary.json")

DROP = 0.15        # email when 15%+ below baseline
RUN_WINDOW_H = 4   # records within 4h of the newest one = latest check
MIN_DAYS = 3       # days of history before the tracked average is the baseline


def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=2)
    os.replace(tmp, path)


def watchlist():
    return [i for i in load(WATCH, []) if i.get("active", True)]


def prices(item):
    out, path = [], os.path.join(PRICES, f"{item}.jsonl")
    if os.path.exists(path):
        for line in open(path):
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            if r.get("item") == item:
                out.append(r)
    return sorted(out, key=lambda r: r["ts"])


def summarize(item_id):
    recs = [r for r in prices(item_id) if r.get("price")]
    empty = {"best": None, "lead": None, "baseline": None, "baseline_kind": None, "regular": None,
             "daily": [], "latest": [], "low90": None, "checked": None}
    if not recs:
        return empty
    newest = datetime.fromisoformat(recs[-1]["ts"])
    latest = [r for r in recs if datetime.fromisoformat(r["ts"]) >= newest - timedelta(hours=RUN_WINDOW_H)]
    buyable = [r for r in latest if r.get("in_stock", True)]
    verified = [r for r in buyable if r.get("verified", True)]
    best = min(verified, key=lambda r: r["price"]) if verified else None
    lead = min(buyable, key=lambda r: r["price"]) if buyable else None
    if lead and best and lead["price"] >= best["price"]:
        lead = None  # unverified lead only matters if it beats the verified best

    cutoff = (datetime.now() - timedelta(days=90)).date().isoformat()
    lows = {}
    for r in recs:
        d = r["ts"][:10]
        if d >= cutoff and r.get("in_stock", True) and r.get("verified", True):
            if d not in lows or r["price"] < lows[d]["price"]:
                lows[d] = r
    daily = [{"date": d, "price": lows[d]["price"], "store": lows[d]["store"]} for d in sorted(lows)]

    regs = [r["regular"] for r in latest if r.get("regular")]
    regular = (best or {}).get("regular") or (max(regs) if regs else None)
    baseline, kind = None, None
    if best:
        prior = [x["price"] for x in daily if x["date"] < best["ts"][:10]]
        if len(prior) >= MIN_DAYS:
            baseline, kind = round(sum(prior) / len(prior), 2), "tracked average"
        elif regular and regular > best["price"]:
            baseline, kind = regular, "regular price"
    return {"best": best, "lead": lead, "baseline": baseline, "baseline_kind": kind, "regular": regular,
            "daily": daily, "latest": sorted(latest, key=lambda r: (not r.get("in_stock", True), r["price"])),
            "low90": min((x["price"] for x in daily), default=None), "checked": recs[-1]["ts"]}


def check():
    sent = load(ALERTS, {})
    out = []
    for it in watchlist():
        s = summarize(it["id"])
        best = s["best"]
        if not best:
            continue
        p, reasons = best["price"], []
        if it.get("target") and p <= it["target"]:
            reasons.append(f"at or under your target of ${it['target']:.2f}")
        if s["baseline"] and p <= s["baseline"] * (1 - DROP):
            reasons.append(f"{round((1 - p / s['baseline']) * 100)}% below the {s['baseline_kind']} (${s['baseline']:.2f})")
        if not reasons:
            continue
        prev = sent.get(it["id"])
        if prev and datetime.now() - datetime.fromisoformat(prev["ts"]) < timedelta(days=14) and p > prev["price"] * 0.98:
            continue
        others = [r for r in s["latest"] if r is not best and r.get("in_stock", True) and r.get("verified", True)][:3]
        out.append({"item": it["id"], "name": it["name"], "size": it.get("size"), "price": p, "store": best["store"],
                    "url": best["url"], "title": best.get("title"), "reasons": reasons,
                    "others": [{"store": r["store"], "price": r["price"], "url": r["url"]} for r in others]})
    return out


def build_summary():
    items = []
    for it in watchlist():
        items.append({**it, **summarize(it["id"])})
    save(SUMMARY, {"updated": datetime.now().isoformat(timespec="seconds"), "items": items})


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    l = sub.add_parser("list"); l.add_argument("--item", default="")
    r = sub.add_parser("record"); r.add_argument("item")
    r.add_argument("--price", type=float, required=True); r.add_argument("--store", required=True)
    r.add_argument("--url", required=True); r.add_argument("--regular", type=float)
    r.add_argument("--title", default=""); r.add_argument("--stock", default="yes", choices=["yes", "no"])
    r.add_argument("--verified", default="yes", choices=["yes", "no"])
    sub.add_parser("check"); sub.add_parser("summary")
    m = sub.add_parser("mark-alerted"); m.add_argument("item"); m.add_argument("price", type=float)
    a = ap.parse_args()

    if a.cmd == "list":
        items = [i for i in watchlist() if not a.item or i["id"] == a.item]
        print(json.dumps(items, indent=2))
    elif a.cmd == "record":
        if not any(i["id"] == a.item for i in watchlist()):
            sys.exit(f"unknown item id: {a.item}")
        if not a.url.startswith("http"):
            sys.exit("url must be a full https link")
        if not 0 < a.price < 100000:
            sys.exit("price looks wrong")
        rec = {"item": a.item, "ts": datetime.now().isoformat(timespec="seconds"), "price": round(a.price, 2),
               "regular": round(a.regular, 2) if a.regular else None, "store": a.store.strip()[:60],
               "url": a.url.strip(), "title": a.title.strip()[:160], "in_stock": a.stock == "yes",
               "verified": a.verified == "yes"}
        os.makedirs(PRICES, exist_ok=True)
        with open(os.path.join(PRICES, f"{a.item}.jsonl"), "a") as f:
            f.write(json.dumps(rec) + "\n")
        print("recorded", rec["store"], rec["price"], "" if rec["verified"] else "(unverified)")
    elif a.cmd == "check":
        print(json.dumps(check(), indent=2))
    elif a.cmd == "mark-alerted":
        sent = load(ALERTS, {})
        sent[a.item] = {"price": a.price, "ts": datetime.now().isoformat(timespec="seconds")}
        save(ALERTS, sent)
    elif a.cmd == "summary":
        build_summary()
        print("summary.json written")


if __name__ == "__main__":
    main()
