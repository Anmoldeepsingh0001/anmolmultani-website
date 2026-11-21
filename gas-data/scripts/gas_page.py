#!/usr/bin/env python3
"""
Builds gas-prices.json for /pei-gas-prices.html: today's PEI price and a forecast
for the next IRAC change (Tuesday / Friday at 12:01 a.m.). No alerts, no visitor data.

Public data only:
  - IRAC current + historical petroleum price schedules (irac.pe.ca)
  - NYMEX RBOB gasoline futures (Yahoo Finance chart API)
  - Bank of Canada USD/CAD (Valet API)

Run by .github/workflows/refresh-gas-prices.yml. Model code lives in pei_gas_core.py
(same engine as the tracker on Anmol's Mac).
"""
import datetime as dt, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
os.environ.setdefault("GAS_DATA_DIR", os.path.join(REPO, "gas-data"))
os.environ.setdefault("GAS_CONFIG", os.path.join(REPO, "gas-data", "config.json"))
sys.path.insert(0, HERE)
import pei_gas_core as T  # noqa: E402

OUT = os.path.join(REPO, "gas-prices.json")


def build():
    irac, _new = T.update_irac(since="2024-01-01")
    try:
        T.update_market()
    except Exception as e:
        print("::warning::market data fetch failed, using cached:", e)
    market = T.read_csv(T.MARKET_CSV)
    pred, _pts = T.predict(irac, market, [])
    cur = [r for r in irac if T.d(r["date"]) <= T.today()][-1]
    hist = [[r["date"], float(r["reg_min"])] for r in irac if r["date"] >= "2025-01-01" and T.d(r["date"]) <= T.today()]
    data = {
        "current": {"date": cur["date"], "min": float(cur["reg_min"]), "max": float(cur["reg_max"]),
                    "diesel": float(cur["dsl_min"]), "rack": float(cur["reg_rack"]), "faa": float(cur["reg_faa"]),
                    "tax": float(cur["reg_excise"]) + float(cur["reg_prov"]), "margin": 5.0},
        "next": {"effective": pred["effective"], "decision_day": pred["decision_day"], "official": pred["official"],
                 "min": pred["pred_min"], "max": pred["pred_max"], "change": pred["change"],
                 "rack": pred["pred_rack"], "days_in": pred["days_in"], "days_expected": pred["days_expected"]},
        "accuracy": {"avg_error_cents": pred["stats"]["mae"], "direction_pct": pred["stats"]["dir_acc"],
                     "periods": pred["stats"]["n"]},
        "market_through": market[-1]["date"] if market else None,
        "history": hist,
    }
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    old.pop("updated", None)
    if old != data:
        data["updated"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
        json.dump(data, open(OUT, "w"), separators=(",", ":"))
        print("gas-prices.json updated")
    else:
        print("no change")
    return data, pred


if __name__ == "__main__":
    build()
