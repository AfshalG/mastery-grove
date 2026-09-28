"""Cuts the tour clips (tour-out/*.webm, from `bun run tour`) into one video: tour-out/mastery-grove-tour.mp4.

Title card, the main journey (the wait while Gemini plants a forest from a photo is sped up), the class room as a
2x2 grid (both students and the teacher, lined up in time), the phone clip on the sky, then an end card.
Needs ffmpeg. Usage: python3 tour/assemble.py
"""
import json
import subprocess
from pathlib import Path

OUT = Path("tour-out")
PARTS = OUT / "parts"
W, H, FPS = 1440, 900, 25
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an"]


def run(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def marks(name):
    data = json.loads((OUT / f"{name}.marks.json").read_text())
    return data["started"] / 1000, data["marks"]


def still(png, seconds, dest):
    run("-loop", "1", "-t", str(seconds), "-i", str(png), "-vf", f"scale={W}:{H},fps={FPS},fade=t=in:d=0.4,fade=t=out:st={seconds - 0.4}:d=0.4", *ENC, str(dest))
    return dest


def clip(src, start, end, dest, speed=1.0):
    vf = f"scale={W}:{H},fps={FPS}"
    if speed != 1.0:
        vf = f"setpts=PTS/{speed},{vf}"
    run("-ss", f"{start:.2f}", "-to", f"{end:.2f}", "-i", str(src), "-vf", vf, *ENC, str(dest))
    return dest


def main():
    PARTS.mkdir(parents=True, exist_ok=True)
    cards = OUT / "cards"
    pieces = [still(cards / "title.png", 5, PARTS / "00-title.mp4")]

    # The main journey, with the photo-to-forest wait sped up 8x.
    _, m = marks("main")
    src = OUT / "main.webm"
    a, b = m.get("grow-start"), m.get("grow-done")
    if a is not None and b is not None and b - a > 6:
        pieces += [
            clip(src, 0.8, a + 3, PARTS / "10-main-a.mp4"),
            clip(src, a + 3, b - 1, PARTS / "11-main-wait.mp4", speed=8),
            clip(src, b - 1, m["end"], PARTS / "12-main-b.mp4"),
        ]
    else:
        pieces.append(clip(src, 0.8, m["end"], PARTS / "10-main.mp4"))

    # The class room: the teacher opening it, then a grid once both students are in, lined up in wall-clock time.
    if (OUT / "class-teacher.webm").exists():
        pieces.append(still(cards / "class.png", 5, PARTS / "20-class-card.mp4"))
        t0, tm = marks("class-teacher")
        a0, am = marks("class-aisha")
        w0, wm = marks("class-wei")
        # Wall-clock moment everyone is in, and the moment the tour ended.
        both = w0 + wm["both-in"]
        done = w0 + wm["end"]
        pieces.append(clip(OUT / "class-teacher.webm", 0.8, both - t0, PARTS / "21-class-open.mp4"))
        grid = PARTS / "22-class-grid.mp4"
        length = done - both
        half = f"scale={W // 2}:{H // 2},fps={FPS}"
        run(
            "-ss", f"{both - a0:.2f}", "-t", f"{length:.2f}", "-i", str(OUT / "class-aisha.webm"),
            "-ss", f"{both - w0:.2f}", "-t", f"{length:.2f}", "-i", str(OUT / "class-wei.webm"),
            "-ss", f"{both - t0:.2f}", "-t", f"{length:.2f}", "-i", str(OUT / "class-teacher.webm"),
            "-loop", "1", "-t", f"{length:.2f}", "-i", str(cards / "classCorner.png"),
            "-filter_complex",
            f"[0:v]{half}[a];[1:v]{half}[w];[2:v]{half}[t];[3:v]{half}[c];[a][w]hstack=2[top];[t][c]hstack=2[bottom];[top][bottom]vstack=2[v]",
            "-map", "[v]", *ENC, str(grid),
        )
        pieces.append(grid)

    # The phone, on the sky with a caption beside it.
    if (OUT / "phone.webm").exists():
        _, pm = marks("phone")
        phone = PARTS / "30-phone.mp4"
        run(
            "-loop", "1", "-i", str(cards / "phone-bg.png"),
            "-ss", "0.8", "-to", f"{pm['end']:.2f}", "-i", str(OUT / "phone.webm"),
            "-filter_complex",
            # About 1:1 with the phone's own 390x844 screen, in an ink-coloured bezel.
            f"[1:v]scale=-2:{H - 72},pad=iw+24:ih+24:12:12:color=0x2f2a22,fps={FPS}[p];[0:v]scale={W}:{H},fps={FPS}[bg];[bg][p]overlay=x=W-w-190:y=(H-h)/2:shortest=1[v]",
            "-map", "[v]", *ENC, str(phone),
        )
        pieces.append(phone)

    pieces.append(still(cards / "end.png", 5, PARTS / "90-end.mp4"))

    listing = PARTS / "concat.txt"
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in pieces))
    silent = OUT / "tour-video-only.mp4"
    run("-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(silent))
    final = OUT / "mastery-grove-tour.mp4"
    # A silent audio track, so every player treats it as an ordinary video.
    run("-i", str(silent), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-c:v", "copy", "-c:a", "aac", "-movflags", "+faststart", str(final))
    print(final)


if __name__ == "__main__":
    main()
