#!/usr/bin/env python3
"""Generate the 50 lesson recordings with Microsoft Xiaoxiao via edge-tts."""

import argparse
import asyncio
import json
import re
from pathlib import Path

try:
    import edge_tts
except ImportError as exc:
    raise SystemExit(
        "缺少 edge-tts。请先运行：python3 -m pip install -r scripts/requirements-audio.txt"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
WORK_PATTERN = re.compile(
    r'\{ title: "((?:[^"\\]|\\.)*)", author: "((?:[^"\\]|\\.)*)", text: "((?:[^"\\]|\\.)*)" \}'
)


def decode_js_string(value: str) -> str:
    return json.loads(f'"{value}"')


def read_works(data_file: Path) -> list[dict[str, str]]:
    source = data_file.read_text(encoding="utf-8")
    works = [
        {
            "title": decode_js_string(title),
            "author": decode_js_string(author),
            "text": decode_js_string(text),
        }
        for title, author, text in WORK_PATTERN.findall(source)
    ]
    if len(works) != 100:
        raise RuntimeError(f"应读取到 100 首诗文，实际读取到 {len(works)} 首")
    return works


def read_rules(rule_file: Path) -> list[dict[str, str]]:
    rules = json.loads(rule_file.read_text(encoding="utf-8"))
    return sorted(rules, key=lambda item: len(item["source"]), reverse=True)


def corrected(text: str, rules: list[dict[str, str]]) -> str:
    for rule in rules:
        text = text.replace(rule["source"], rule["spoken"])
    return text


def lesson_text(works: list[dict[str, str]], lesson_index: int, rules: list[dict[str, str]]) -> str:
    parts: list[str] = []
    for position, work in enumerate(works, 1):
        body = work["text"].replace("\n", "。")
        parts.append(f"对读{position}。{work['title']}。{work['author']}。{body}")
    return corrected("。".join(parts), rules)


async def generate_one(
    lesson_id: int,
    text: str,
    output: Path,
    voice: str,
    rate: str,
    force: bool,
) -> dict[str, object]:
    target = output / f"lesson-{lesson_id:02d}.mp3"
    if target.exists() and target.stat().st_size > 2048 and not force:
        print(f"[{lesson_id:02d}/50] 已存在，跳过")
    else:
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                communicate = edge_tts.Communicate(text, voice, rate=rate, volume="+0%")
                await communicate.save(str(target))
                print(f"[{lesson_id:02d}/50] 已生成 {target.name}")
                last_error = None
                break
            except Exception as exc:  # edge service can occasionally reset a stream
                last_error = exc
                if attempt < 3:
                    await asyncio.sleep(attempt * 1.5)
        if last_error is not None:
            raise last_error
    return {
        "id": lesson_id,
        "file": f"/audio/{target.name}",
        "bytes": target.stat().st_size,
        "voice": voice,
        "rate": rate,
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default="zh-CN-XiaoxiaoNeural")
    parser.add_argument("--rate", default="-12%")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    data_file = ROOT / "app" / "data.ts"
    rule_file = ROOT / "scripts" / "poetry_pronunciations.json"
    output = ROOT / "public" / "audio"
    output.mkdir(parents=True, exist_ok=True)

    all_works = read_works(data_file)
    rules = read_rules(rule_file)
    manifest: list[dict[str, object]] = []
    for lesson_id in range(1, 51):
        pair = all_works[(lesson_id - 1) * 2 : lesson_id * 2]
        text = lesson_text(pair, lesson_id, rules)
        manifest.append(
            await generate_one(lesson_id, text, output, args.voice, args.rate, args.force)
        )

    (output / "manifest.json").write_text(
        json.dumps(
            {
                "voice": args.voice,
                "rate": args.rate,
                "pronunciationTable": "scripts/poetry_pronunciations.json",
                "lessons": manifest,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    total = sum(int(item["bytes"]) for item in manifest)
    print(f"完成：50 组，共 {total / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    asyncio.run(main())
