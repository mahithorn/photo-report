"""Generate small test JPEGs with EXIF DateTimeOriginal (needs Pillow).

Files are named in the opposite order of their capture time, so the
"sort by time taken" feature has something to prove.
"""
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).parent / "fixtures"
out.mkdir(exist_ok=True)
shots = [  # (file name, capture time, colour, size)
    ("a.jpg", "2026:05:01 10:30:00", (200, 60, 60), (800, 600)),
    ("b.jpg", "2026:05:01 09:15:00", (60, 160, 80), (600, 800)),
    ("c.jpg", "2026:05:01 08:00:00", (60, 90, 200), (800, 600)),
    ("d.jpg", "2026:05:01 11:45:00", (220, 180, 40), (800, 800)),
    ("e.jpg", "2026:05:01 12:10:00", (140, 70, 170), (1000, 600)),
]
for name, taken, colour, size in shots:
    img = Image.new("RGB", size, colour)
    ImageDraw.Draw(img).text((20, 20), name, fill=(255, 255, 255))
    exif = Image.Exif()
    exif[0x8769] = {0x9003: taken}  # Exif IFD -> DateTimeOriginal
    img.save(out / name, "JPEG", quality=80, exif=exif.tobytes())
    print("wrote", out / name, taken)
