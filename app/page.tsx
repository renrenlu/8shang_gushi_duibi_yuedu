"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { lessons, themes } from "./data";

type SavedState = {
  answers: Record<number, number>;
  favorites: number[];
};

const artByTheme: Record<string, string> = {
  "边塞家国": "/art/frontier.jpg",
  "羁旅乡思": "/art/moon.jpg",
  "山水田园": "/art/spring.jpg",
  "送别怀人": "/art/moon.jpg",
  "咏史抒怀": "/art/frontier.jpg",
};

function initials(index: number) {
  return String.fromCharCode(65 + index);
}

const pronunciationRules: Array<[RegExp, string]> = [
  [/汉乐府/g, "汉月府"],
  [/岑参/g, "岑申"],
  [/燕然/g, "嫣然"],
  [/燕脂/g, "胭脂"],
  [/澹烟/g, "淡烟"],
  [/曾云/g, "层云"],
  [/的卢/g, "帝卢"],
  [/北陂/g, "北杯"],
  [/一陂/g, "一杯"],
  [/不胜寒/g, "不生寒"],
  [/不胜簪/g, "不生簪"],
  [/难着/g, "难卓"],
  [/候骑/g, "候冀"],
  [/千骑/g, "千冀"],
  [/铁骑/g, "铁冀"],
  [/飞鸟相与还/g, "飞鸟相与环"],
  [/终不还/g, "终不环"],
  [/久未还/g, "久未环"],
  [/长精神/g, "涨精神"],
  [/乐游原/g, "勒游原"],
  [/·/g, "，"],
];

function textForSpeech(text: string) {
  return pronunciationRules.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}

export default function Home() {
  const [currentId, setCurrentId] = useState(1);
  const [theme, setTheme] = useState<(typeof themes)[number]>("全部");
  const [search, setSearch] = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [speechRate, setSpeechRate] = useState(0.68);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRun = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("poetry-study-v1");
      if (raw) {
        const saved = JSON.parse(raw) as SavedState;
        setAnswers(saved.answers || {});
        setFavorites(saved.favorites || []);
      }
    } catch {
      // A fresh start is safe if local storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("poetry-study-v1", JSON.stringify({ answers, favorites }));
  }, [answers, favorites, hydrated]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const chineseVoices = synth.getVoices().filter((voice) => /zh|cmn/i.test(voice.lang));
      setVoices(chineseVoices);
      setVoiceName((currentName) => {
        if (currentName && chineseVoices.some((voice) => voice.name === currentName)) return currentName;
        const preferred = chineseVoices.find((voice) => /ting|xiaoxiao|meijia|mandarin|普通话|晓晓|婷婷/i.test(voice.name)) || chineseVoices[0];
        return preferred?.name || "";
      });
    };
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
      speechRun.current += 1;
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    speechRun.current += 1;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [currentId]);

  const current = lessons[currentId - 1];
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const themeMatch = theme === "全部" || lesson.theme === theme;
      const text = [lesson.focus, lesson.theme, ...lesson.works.flatMap((work) => [work.title, work.author, work.text])].join(" ").toLowerCase();
      return themeMatch && (!keyword || text.includes(keyword));
    });
  }, [search, theme]);

  const answeredCount = Object.keys(answers).length;
  const correctCount = lessons.filter((lesson) => answers[lesson.id] === lesson.answer).length;
  const selected = answers[current.id];
  const answered = selected !== undefined;

  const goTo = (id: number) => {
    setCurrentId(id);
    setShowAnswer(answers[id] !== undefined);
    setStudyOpen(true);
    window.setTimeout(() => document.getElementById("study")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  const choose = (choice: number) => {
    if (answered) return;
    setAnswers((prev) => ({ ...prev, [current.id]: choice }));
    setShowAnswer(true);
  };

  const resetCurrent = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[current.id];
      return next;
    });
    setShowAnswer(false);
  };

  const toggleFavorite = () => {
    setFavorites((prev) => prev.includes(current.id) ? prev.filter((id) => id !== current.id) : [...prev, current.id]);
  };

  const stopSpeaking = () => {
    if (!("speechSynthesis" in window)) return;
    speechRun.current += 1;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    const synth = window.speechSynthesis;
    const runId = speechRun.current + 1;
    speechRun.current = runId;
    synth.cancel();
    setIsSpeaking(true);

    const segments = current.works.flatMap((work) => [
      { text: `${work.title}。${work.author}。`, rate: Math.max(0.55, speechRate - 0.04), pause: 420 },
      ...work.text.split("\n").filter(Boolean).map((line) => ({ text: line, rate: speechRate, pause: 460 })),
    ]);
    const selectedVoice = voices.find((voice) => voice.name === voiceName);

    const playSegment = (index: number) => {
      if (speechRun.current !== runId) return;
      if (index >= segments.length) {
        setIsSpeaking(false);
        return;
      }
      const segment = segments[index];
      const utterance = new SpeechSynthesisUtterance(textForSpeech(segment.text));
      utterance.lang = selectedVoice?.lang || "zh-CN";
      utterance.voice = selectedVoice || null;
      utterance.rate = segment.rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => window.setTimeout(() => playSegment(index + 1), segment.pause);
      utterance.onerror = () => setIsSpeaking(false);
      synth.speak(utterance);
    };

    playSegment(0);
  };

  const nextLesson = () => {
    const next = current.id === lessons.length ? 1 : current.id + 1;
    setCurrentId(next);
    setShowAnswer(answers[next] !== undefined);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="回到页面顶部">
          <span className="brand-mark">诗</span>
          <span>
            <strong>古诗词比较阅读</strong>
            <small>50 组·自学成长册</small>
          </span>
        </a>
        <nav className="top-actions" aria-label="快捷操作">
          <a href="#library">题库</a>
          <a href="#method">学习方法</a>
          <button className="primary-small" onClick={() => goTo(currentId)}>继续学习</button>
        </nav>
      </header>

      <section id="top" className="hero">
        <img src="/art/spring.jpg" alt="春日湖畔、莺燕和行人的水彩画" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow">从诗句，走进一整片山河</p>
          <h1>读懂一首诗，<br />更要读出它与另一首的不同</h1>
          <p className="hero-copy">从意象、语言、手法和情感入手，完成 PDF 中全部 50 组比较阅读。每题都有即时判定和错项解析。</p>
          <div className="hero-buttons">
            <button className="primary" onClick={() => goTo(answeredCount ? Math.min(answeredCount + 1, 50) : 1)}>
              {answeredCount ? `继续第 ${Math.min(answeredCount + 1, 50)} 组` : "开始第 1 组"}
            </button>
            <a className="ghost" href="#method">先看学习方法</a>
          </div>
        </div>
        <div className="hero-stats" aria-label="学习进度">
          <div><strong>50</strong><span>组比较阅读</span></div>
          <div><strong>{answeredCount}</strong><span>已完成</span></div>
          <div><strong>{answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0}%</strong><span>当前正确率</span></div>
        </div>
      </section>

      <section id="method" className="method section-shell">
        <div className="section-heading">
          <span className="section-kicker">学习路径</span>
          <h2>四步比较法</h2>
          <p>先各自读懂，再放在一起看同与异。</p>
        </div>
        <div className="method-grid">
          {[
            ["壹", "定题材", "边塞、送别、山水还是怀古？先确定共同的话题。"],
            ["贰", "圈意象", "找月、雁、落日、春花等意象，看它们如何构成画面。"],
            ["叁", "辨手法", "关注比喻、用典、虚实、动静和视听角度。"],
            ["肆", "比情感", "同是写秋，是豪迈、旷达，还是孤寂、悲愤？"]
          ].map(([number, title, text]) => (
            <article className="method-card" key={number}>
              <span>{number}</span><h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="library" className="library section-shell">
        <div className="section-heading library-heading">
          <div>
            <span className="section-kicker">全部题库</span>
            <h2>选一组，开始精读</h2>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜诗题、作者或关键词" />
          </label>
        </div>

        <div className="filters" role="group" aria-label="按主题筛选">
          {themes.map((item) => (
            <button key={item} className={theme === item ? "active" : ""} onClick={() => setTheme(item)}>{item}</button>
          ))}
        </div>

        <div className="lesson-grid">
          {filtered.map((lesson) => {
            const done = answers[lesson.id] !== undefined;
            const correct = answers[lesson.id] === lesson.answer;
            return (
              <button className="lesson-card" key={lesson.id} onClick={() => goTo(lesson.id)}>
                <span className="lesson-number">{String(lesson.id).padStart(2, "0")}</span>
                <span className="lesson-body">
                  <small>{lesson.theme}·{lesson.focus}</small>
                  <strong>{lesson.works.map((work) => `《${work.title}》`).join(" × ")}</strong>
                  <span>{lesson.works.map((work) => work.author).join(" · ")}</span>
                </span>
                <span className={`lesson-state ${done ? (correct ? "correct" : "wrong") : ""}`} aria-label={done ? (correct ? "已答对" : "需复习") : "未完成"}>
                  {done ? (correct ? "✓" : "!") : "→"}
                </span>
              </button>
            );
          })}
        </div>
        {!filtered.length && <div className="empty-state">没有找到相关诗文，试试其他关键词。</div>}
      </section>

      {studyOpen && (
        <section id="study" className="study-section">
          <div className="study-shell">
            <aside className="study-aside">
              <div className="progress-ring" style={{ "--progress": `${(answeredCount / 50) * 360}deg` } as React.CSSProperties}>
                <div><strong>{answeredCount}</strong><small>/ 50</small></div>
              </div>
              <h3>我的学习册</h3>
              <p>数据保存在当前设备，下次打开可继续。</p>
              <div className="mini-stats">
                <span><b>{correctCount}</b>答对</span>
                <span><b>{answeredCount - correctCount}</b>待复习</span>
                <span><b>{favorites.length}</b>已收藏</span>
              </div>
              <button className="favorite-button" onClick={toggleFavorite}>
                {favorites.includes(current.id) ? "★ 已收藏本题" : "☆ 收藏本题"}
              </button>
              <span className="source-link">原 PDF 内容页：第 {current.page} 页</span>
            </aside>

            <article className="study-card">
              <div className="study-art">
                <img src={artByTheme[current.theme]} alt="与本组诗文主题相呼应的水彩插画" />
                <div className="study-art-copy">
                  <span>第 {String(current.id).padStart(2, "0")} 组</span>
                  <h2>{current.theme}</h2>
                  <p>比较点：{current.focus}</p>
                </div>
              </div>

              <div className="study-toolbar">
                <span>读·圈·比·悟</span>
                <div className="speech-controls">
                  <label>
                    <span>语速</span>
                    <select value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))} disabled={isSpeaking} aria-label="选择朗读语速">
                      <option value={0.58}>慢速</option>
                      <option value={0.68}>标准</option>
                      <option value={0.78}>稍快</option>
                    </select>
                  </label>
                  {voices.length > 1 && (
                    <label className="voice-picker">
                      <span>音色</span>
                      <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)} disabled={isSpeaking} aria-label="选择普通话音色">
                        {voices.map((voice) => <option value={voice.name} key={`${voice.name}-${voice.lang}`}>{voice.name}</option>)}
                      </select>
                    </label>
                  )}
                  <button className={isSpeaking ? "speaking" : ""} onClick={speak} aria-label={isSpeaking ? "停止朗读" : "朗读本组诗文"}>
                    {isSpeaking ? "■ 停止" : "▷ 听朗读"}
                  </button>
                </div>
              </div>

              <div className="poems-grid">
                {current.works.map((work, index) => (
                  <section className="poem" key={work.title}>
                    <span className="poem-label">对读 {index + 1}</span>
                    <h3>{work.title}</h3>
                    <p className="author">{work.author}</p>
                    <div className="poem-text">{work.text}</div>
                  </section>
                ))}
              </div>

              {current.notes && <details className="notes"><summary>打开注释</summary><p>{current.notes}</p></details>}

              <section className="question-card">
                <div className="question-topline">
                  <span>练一练</span>
                  <small>选择后立即判定</small>
                </div>
                <h3>{current.prompt}</h3>
                <div className="choices">
                  {current.choices.map((choice, index) => {
                    const isSelected = selected === index;
                    const isCorrect = showAnswer && index === current.answer;
                    const isWrong = showAnswer && isSelected && index !== current.answer;
                    return (
                      <button
                        key={choice}
                        onClick={() => choose(index)}
                        className={`${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                        disabled={answered}
                      >
                        <b>{initials(index)}</b><span>{choice}</span>
                        {isCorrect && <em>正确</em>}
                        {isWrong && <em>你选的</em>}
                      </button>
                    );
                  })}
                </div>

                {showAnswer && answered && (
                  <div className={`explanation ${selected === current.answer ? "right" : "review"}`}>
                    <strong>{selected === current.answer ? "答对了，你抓住了比较点。" : `正确答案：${initials(current.answer)}`}</strong>
                    <p>{current.explanation}</p>
                    <button onClick={resetCurrent}>再做一次</button>
                  </div>
                )}
              </section>

              <div className="study-footer">
                <button disabled={current.id === 1} onClick={() => { setCurrentId(current.id - 1); setShowAnswer(answers[current.id - 1] !== undefined); }}>← 上一组</button>
                <span>{current.id} / 50</span>
                <button className="next" onClick={nextLesson}>{current.id === 50 ? "回到第 1 组" : "下一组"} →</button>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="closing section-shell">
        <img src="/art/moon.jpg" alt="江月、孤舟和远山的水彩画" />
        <div>
          <span className="section-kicker">每日一组</span>
          <h2>学诗不必赶，但要常回头看。</h2>
          <p>把做错的题收藏起来，隔几天再读一次诗句、再辨一次选项，你会慢慢建立自己的古诗词“语感地图”。</p>
          <button className="primary" onClick={() => goTo(favorites[0] || 1)}>{favorites.length ? "复习收藏题" : "开始学习"}</button>
        </div>
      </section>

      <footer>
        <span>古诗词比较阅读·交互自学版</span>
        <span>内容根据《基础知识之古诗词比较阅读》逐页整理</span>
      </footer>
    </main>
  );
}
