import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";
import { lessons, themes } from "../app/data.ts";

const answerKey = "ACBCCCBBBBBDCDDABACDCDDACACCACABDDAAACADDADDCBACDC";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete poetry study homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>古诗词比较阅读｜50 组互动自学<\/title>/i);
  assert.match(html, /四步比较法/);
  assert.match(html, /完整收录 PDF 中的 50 组古诗词比较阅读/);
  assert.equal((html.match(/class="lesson-card"/g) ?? []).length, 50);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Codex is working/i);
});

test("keeps all lesson data aligned with the PDF answer key", () => {
  assert.equal(lessons.length, 50);
  assert.deepEqual(lessons.map((lesson) => lesson.id), Array.from({ length: 50 }, (_, index) => index + 1));
  assert.equal(lessons.map((lesson) => String.fromCharCode(65 + lesson.answer)).join(""), answerKey);
  assert.deepEqual(themes, ["全部", "边塞家国", "羁旅乡思", "山水田园", "送别怀人", "咏史抒怀"]);

  for (const lesson of lessons) {
    assert.equal(lesson.works.length, 2, `第 ${lesson.id} 组应有两篇对读诗文`);
    assert.equal(lesson.choices.length, 4, `第 ${lesson.id} 组应有四个选项`);
    assert.ok(Number.isInteger(lesson.answer) && lesson.answer >= 0 && lesson.answer < lesson.choices.length);
    assert.ok(lesson.page >= 1 && lesson.page <= 20, `第 ${lesson.id} 组 PDF 页码超出范围`);
    assert.ok(lesson.prompt.trim() && lesson.explanation.trim() && lesson.focus.trim());
    for (const work of lesson.works) {
      assert.ok(work.title.trim() && work.author.trim() && work.text.trim());
    }
  }
});

test("ships one non-empty narration file for every lesson", async () => {
  const audioRoot = new URL("../public/audio/", import.meta.url);
  const expected = Array.from({ length: 50 }, (_, index) => `lesson-${String(index + 1).padStart(2, "0")}.mp3`);
  const actual = (await readdir(audioRoot)).filter((file) => /^lesson-\d{2}\.mp3$/.test(file)).sort();
  assert.deepEqual(actual, expected);

  for (const file of actual) {
    const fileStat = await stat(new URL(file, audioRoot));
    assert.ok(fileStat.size > 1024, `${file} 音频文件异常`);
  }
});

test("builds a GitHub Pages site with repository-scoped asset paths", async () => {
  const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>古诗词比较阅读｜50 组互动自学<\/title>/);
  assert.match(html, /\/8shang_gushi_duibi_yuedu\/assets\/[^"']+\.js/);
  assert.match(html, /\/8shang_gushi_duibi_yuedu\/assets\/[^"']+\.css/);

  const copiedAudio = await stat(new URL("../docs/audio/lesson-50.mp3", import.meta.url));
  const copiedArtwork = await stat(new URL("../docs/art/spring.jpg", import.meta.url));
  assert.ok(copiedAudio.size > 1024);
  assert.ok(copiedArtwork.size > 1024);
});
