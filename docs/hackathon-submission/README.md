# Hackathon submission documents

| File | Purpose |
|---|---|
| `project-summary.md` | Evidence base for both PDFs: verified facts, feature matrix, test results, known defects. Update this first. |
| `report.html` | Source of `SwiftCare-GeoAgent-Technical-Report.pdf` (A4 portrait, 35 pages). |
| `pitch.html` | Source of `SwiftCare-GeoAgent-Hackathon-Pitch.pdf` (A4 landscape, 25 slides: pitch, page-by-page website walkthrough with "Say" lines, live-vs-simulated, 5-minute demo script, judge Q&A). |
| `styles.css` | Shared print design. |
| `submission.json` | Team name, four member names, website and Google Drive video links. Empty values print as placeholders. |
| `build.mjs`, `build.sh`, `verify_pdfs.py` | Render with the repo's Playwright Chromium, fill contents page numbers, then check placeholders, secrets, overflow and shared facts. |

## Fill in the team details and rebuild

1. Edit `submission.json`.
2. Run (needs a Python with `pymupdf`):

```bash
docs/hackathon-submission/build.sh ~/Documents python3
```

The PDFs are written to `~/Documents`. Rendered page previews go to `.build/png/` (git-ignored).

When values are filled in, `verify_pdfs.py` will report the placeholders as missing; that is expected.
