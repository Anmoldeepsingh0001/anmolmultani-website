#!/usr/bin/env python3
"""Email buy alerts via Gmail. Needs secrets GMAIL_USER, GMAIL_APP_PASSWORD, ALERT_TO."""
import json, os, smtplib, subprocess, sys
from email.message import EmailMessage

HERE = os.path.dirname(os.path.abspath(__file__))
DEALS = [sys.executable, os.path.join(HERE, "deals.py")]
user, pw, to = (os.environ.get(k, "").strip() for k in ("GMAIL_USER", "GMAIL_APP_PASSWORD", "ALERT_TO"))

alerts = json.loads(subprocess.check_output(DEALS + ["check"]))
if not alerts:
    print("no alerts due"); sys.exit(0)
if not (user and pw and to):
    print(f"{len(alerts)} alert(s) due but Gmail secrets are not set; skipping email"); sys.exit(0)

with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
    s.login(user, pw)
    for a in alerts:
        m = EmailMessage()
        m["Subject"] = f"🔥 Buy now: {a['name']} — ${a['price']:.2f} at {a['store']}"
        m["From"], m["To"] = f"Deal Finder <{user}>", to
        lines = [f"{a['name']}{' · size ' + a['size'] if a.get('size') else ''}",
                 f"${a['price']:.2f} at {a['store']}", a["url"], "",
                 "Why: " + "; ".join(a["reasons"]), ""]
        if a["others"]:
            lines.append("Next best:")
            lines += [f"  ${o['price']:.2f} at {o['store']}: {o['url']}" for o in a["others"]]
            lines.append("")
        lines += ["Check the price and size on the page before you buy.", "", "https://anmolmultani.ca/deals/"]
        m.set_content("\n".join(lines))
        s.send_message(m)
        subprocess.check_call(DEALS + ["mark-alerted", a["item"], str(a["price"])])
        print("emailed:", a["name"], a["price"])
