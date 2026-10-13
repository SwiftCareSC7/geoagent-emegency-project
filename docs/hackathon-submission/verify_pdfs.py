"""Checks the built PDFs and records chapter page numbers for the report's table of contents.

Usage:
  python verify_pdfs.py toc <report.pdf>            -> writes .build/toc-pages.json from hidden @@cNN@@ markers
  python verify_pdfs.py check <pitch.pdf> <report.pdf> <png-dir>
Requires PyMuPDF (pymupdf).
"""
import json
import re
import sys
from pathlib import Path

import pymupdf as fitz

HERE = Path(__file__).resolve().parent
PLACEHOLDERS = ["[ENTER TEAM NAME]", "[TEAM MEMBER 1", "[TEAM MEMBER 2", "[TEAM MEMBER 3", "[TEAM MEMBER 4",
                "[PASTE WEBSITE URL HERE]", "[PASTE GOOGLE DRIVE VIDEO LINK HERE]"]
# Patterns that must never appear in a published document.
SECRET_PATTERNS = [r"mongodb(\+srv)?://[^\s]*:[^\s]*@", r"sk-or-[A-Za-z0-9]{10,}", r"-----BEGIN [A-Z ]*PRIVATE KEY",
                   r"JWT_SECRET\s*=\s*\S+", r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}"]


def toc(report):
    doc = fitz.open(report)
    pages = {}
    for i, page in enumerate(doc, start=1):
        for mk in re.findall(r"@@([\w-]+)@@", page.get_text()):
            pages.setdefault(mk, i)
    (HERE / ".build").mkdir(exist_ok=True)
    (HERE / ".build/toc-pages.json").write_text(json.dumps(pages, indent=1))
    print("toc pages:", pages)


def check(pitch, report, png_dir):
    out = Path(png_dir)
    out.mkdir(parents=True, exist_ok=True)
    problems = []
    texts = {}
    for name, path in (("pitch", pitch), ("report", report)):
        doc = fitz.open(path)
        sizes = {(round(p.rect.width), round(p.rect.height)) for p in doc}
        text = "\n".join(p.get_text() for p in doc)
        texts[name] = text
        print(f"{name}: {doc.page_count} pages, sizes(pt)={sizes}, chars={len(text)}")
        for ph in PLACEHOLDERS:
            if ph not in text:
                problems.append(f"{name}: placeholder missing: {ph}")
        for pat in SECRET_PATTERNS:
            if re.search(pat, text):
                problems.append(f"{name}: possible secret matches {pat}")
        if "{{" in text or "@@" in text:
            problems.append(f"{name}: unreplaced template token")
        for i, page in enumerate(doc, start=1):
            # Text drawn past the page edge means clipping or overflow.
            for b in page.get_text("blocks"):
                x0, y0, x1, y1 = b[:4]
                if x1 > page.rect.width + 1 or y1 > page.rect.height + 1:
                    problems.append(f"{name} p{i}: text outside page: {b[4][:40]!r}")
            page.get_pixmap(dpi=70).save(out / f"{name}-{i:02d}.png")
    # Facts that must agree between the two documents.
    for fact in ["80", "12", "16", "358", "OSRM", "50", "250", "86"]:
        for name in texts:
            if fact not in texts[name]:
                problems.append(f"{name}: expected fact '{fact}' not found")
    print("\n".join(problems) if problems else "all checks passed")
    return 1 if problems else 0


if __name__ == "__main__":
    if sys.argv[1] == "toc":
        toc(sys.argv[2])
    else:
        sys.exit(check(*sys.argv[2:5]))
