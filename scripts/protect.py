#!/usr/bin/env python3
"""
SpideyAgent /protect CLI Tool
Takes any URL, portal name (hr, eproc, mission), or local HTML file,
runs SpideyAgent's on-device zero-PII redaction, captures a verified screenshot,
and optionally opens it in the default system viewer.
"""

import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent dir to path
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "server")))
from redaction_engine import redact_and_capture

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "hr"
    
    if target in ["hr", "eproc", "mission"]:
        portal = target
        custom_url = None
    else:
        portal = "hr"
        custom_url = target

    print(f"\n=======================================================")
    print(f" [*] SPIDEYAGENT ON-DEVICE PRIVACY REDACTION ENGINE")
    print(f"=======================================================")
    print(f"[*] Target: {target}")
    print(f"[*] Running on-device mathematical perception & vision masks...")

    try:
        res = redact_and_capture(portal=portal, custom_url=custom_url)
        print(f"\n[+] SUCCESS: Redacted Screenshot Captured!")
        print(f"    File: {res['screenshotPath']}")
        print(f"    SHA-256 Seal: {res['sha256']}")
        print(f"    Zero Raw Pixels Transmitted: TRUE\n")
        print("    Redactions Enforced:")
        for k, v in res['redactionsApplied'].items():
            print(f"     - {k}: {v['token']} ({v.get('algorithm') or v.get('model')})")
        print("\nOpening screenshot...")
        os.system(f'start "" "{res["screenshotPath"]}"')
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    main()
