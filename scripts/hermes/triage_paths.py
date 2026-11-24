"""Checkout and per-run evidence directory shared by the triage scripts."""
import os
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUTPUT = Path(os.environ["FOKUS_TRIAGE_DIR"]).resolve()
DATA = OUTPUT / "fokus_open_prs.json"
