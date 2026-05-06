"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * AfterNOON · VFQ-NEAR 자가 설문 (모바일)
 * - DS: AfterNOON 디자인시스템 토큰 준수 (#00CE90 primary)
 * - 타깃: 60-70대 노안 — 본문 17~18px / 터치 64px+
 * - 스코어링: NEI VFQ-25 표준 변환식 (1=100, 2=75, 3=50, 4=25, 5=0, 6=NA)
 * - 분석: lib/analytics.js → GA4 (window.gtag) 로 전송
 * - 공유 링크: ?s=N (0~100) 형태로 점수 전달, 받는 사람은 SharedView 노출
 */

// ============ 상수 ============
const QUESTIONS = [
  "신문 혹은 책의 글자를 읽을 때 어느 정도 어려움을 느끼십니까?",
  "요리, 바느질, 가전제품 조작 등 손으로 하는 근거리 작업이나 취미 생활을 할 때 어느 정도 어려움을 느끼십니까?",
  "복잡한 선반에서 물건을 찾고자 할 때 시력으로 인하여 어느 정도 어려움을 느끼십니까?",
  "안경을 착용하고 스마트폰(작은 폰트), 약병, 법률서류와 같이 작은 글씨를 읽을 때 어느 정도 어려움을 느끼십니까?",
  "당신이 받은 계산서(영수증)가 정확한지를 파악할 때 시력으로 인하여 어느 정도 어려움을 느끼십니까?",
  "면도, 머리 손질, 화장과 같은 일을 할 때 시력으로 인하여 어느정도 어려움을 느끼십니까?",
];

const CHOICES = [
  { value: 1, label: "전혀 어려움이 없다" },
  { value: 2, label: "약간 어려움을 느낀다" },
  { value: 3, label: "중등도의 어려움을 느낀다" },
  { value: 4, label: "심한 어려움을 느낀다" },
  { value: 5, label: "시력이 안 좋아서 할 수 없다" },
  { value: 6, label: "다른 이유로, 혹은 관심이 없어서 하지 않는다" },
];

const SCORE_MAP = { 1: 100, 2: 75, 3: 50, 4: 25, 5: 0, 6: null };

// ============ 유틸 ============
function calcScore(answers) {
  const recoded = answers
    .map((a) => (a == null ? null : SCORE_MAP[a]))
    .filter((v) => v !== null && v !== undefined);
  const naCount = answers.filter((a) => a === 6).length;
  if (recoded.length === 0) return { score: null, naCount, validCount: 0 };
  const score = Math.round(recoded.reduce((s, v) => s + v, 0) / recoded.length);
  return { score, naCount, validCount: recoded.length };
}

function interpret(score) {
  if (score == null) {
    return {
      emoji: "🤔",
      headline: "평가가 어려워요",
      message: "응답 대부분이 ‘다른 이유로 하지 않음’이어서 점수를 산출할 수 없어요.",
      tone: "neutral",
    };
  }
  if (score >= 80)
    return {
      emoji: "😊",
      headline: "근거리 시생활이 편안한 편이에요",
      message: "지금처럼 정기적인 안과 검진으로 컨디션을 유지해 보세요.",
      tone: "good",
    };
  if (score >= 60)
    return {
      emoji: "🙂",
      headline: "큰 어려움은 없지만, 한 번쯤 살펴볼 만해요",
      message: "최근 1년 내 안과 검진 이력이 없다면 점검을 권해드려요.",
      tone: "okay",
    };
  if (score >= 40)
    return {
      emoji: "😐",
      headline: "근거리에서 종종 불편함이 느껴져요",
      message: "노안·백내장·안구건조 등이 영향을 줄 수 있어요. 안과 상담을 권해드려요.",
      tone: "warn",
    };
  if (score >= 20)
    return {
      emoji: "😟",
      headline: "근거리 작업에 자주 어려움을 겪고 계세요",
      message: "일상 영향이 누적되기 전에 가까운 안과에서 검사를 받아보세요.",
      tone: "warn",
    };
  return {
    emoji: "😣",
    headline: "근거리 시생활에 상당한 어려움이 있어요",
    message: "빠른 시일 내에 안과 검사를 받으시길 권해드려요.",
    tone: "bad",
  };
}

// 공유 URL 파싱: ?s=N (0~100, 정수) 만 유효한 값으로 인정
function parseSharedScore() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s");
    if (s === null) return null;
    const n = parseInt(s, 10);
    if (!Number.isInteger(n) || n < 0 || n > 100) return null;
    return n;
  } catch {
    return null;
  }
}

// 공유 URL 생성: 현재 location 기반에 ?s 만 갱신
function buildShareUrl(score) {
  const fallback = "https://afternoon.clop.ai/vfq-near";
  if (typeof window === "undefined") {
    return score != null ? `${fallback}?s=${score}` : fallback;
  }
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("s");
    if (score != null) u.searchParams.set("s", String(score));
    return u.toString();
  } catch {
    return fallback;
  }
}

// 현재 URL에서 ?s 만 제거 (페이지 reload 없이)
function clearSharedParam() {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("s");
    const newUrl = u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : "") + u.hash;
    window.history.replaceState({}, "", newUrl);
  } catch {
    /* ignore */
  }
}

// ============ 메인 ============
export default function VFQNearSurvey() {
  const [stage, setStage] = useState("landing"); // landing | shared_view | survey | results
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(Array(6).fill(null));
  const [showShare, setShowShare] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [shareToast, setShareToast] = useState("");
  const [sharedScore, setSharedScore] = useState(null);
  const initRef = useRef(false);

  // 첫 마운트: 공유 링크 여부 판단
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const score = parseSharedScore();
    if (score !== null) {
      setSharedScore(score);
      setStage("shared_view");
      track("vfq_shared_view", { shared_score: score });
    } else {
      track("vfq_landing_view");
    }
  }, []);

  // 단계 전환 트래킹 (초기 마운트 제외 — 위에서 처리)
  useEffect(() => {
    if (!initRef.current) return;
    if (stage === "survey") track("vfq_question_view", { question_index: idx + 1 });
    if (stage === "results") {
      const { score, naCount, validCount } = calcScore(answers);
      track("vfq_completed", { score, na_count: naCount, valid_count: validCount });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, idx]);

  const result = useMemo(() => calcScore(answers), [answers]);
  const interp = useMemo(() => interpret(result.score), [result.score]);
  const sharedInterp = useMemo(() => interpret(sharedScore), [sharedScore]);

  const handleStart = () => {
    track("vfq_start_click");
    setIdx(0);
    setAnswers(Array(6).fill(null));
    setStage("survey");
  };

  // 공유받은 화면에서 "내 점수도 확인하기" → URL 정리 + 랜딩으로
  const handleStartFromShared = () => {
    track("vfq_shared_start_click", { shared_score: sharedScore });
    clearSharedParam();
    setSharedScore(null);
    setStage("landing");
    track("vfq_landing_view");
  };

  const handlePick = (val) => {
    const next = [...answers];
    next[idx] = val;
    setAnswers(next);
    track("vfq_question_answered", { question_index: idx + 1, answer: val });
  };

  const handleNext = () => {
    if (answers[idx] == null) return;
    if (idx < QUESTIONS.length - 1) setIdx(idx + 1);
    else setStage("results");
  };

  const handlePrev = () => {
    if (idx === 0) {
      setStage("landing");
      return;
    }
    setIdx(idx - 1);
  };

  const handleRestart = () => {
    track("vfq_restart_click");
    setStage("landing");
  };

  const handleSave = () => {
    track("vfq_save_click", { score: result.score });
    setShowSave(true);
  };

  const handleShare = async () => {
    track("vfq_share_open");
    const score = result.score;
    const url = buildShareUrl(score);
    const text = "내 근거리 시력 자가점검 결과를 봐주세요. 1분이면 점검 가능해요. (애프터눈)";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "AfterNOON · 근거리 시력 자가점검", text, url });
        track("vfq_share_click", { method: "web_share_api", shared_score: score });
      } catch (_) {
        /* user cancelled */
      }
    } else {
      setShowShare(true);
    }
  };

  const copyLink = async () => {
    const score = result.score;
    const url = buildShareUrl(score);
    try {
      await navigator.clipboard.writeText(url);
      setShareToast("링크가 복사되었어요");
      track("vfq_share_click", { method: "copy_link", shared_score: score });
    } catch {
      setShareToast("복사에 실패했어요. 길게 눌러 직접 복사해 주세요.");
    }
    setTimeout(() => setShareToast(""), 2400);
    setShowShare(false);
  };

  // ===== DS 토큰 =====
  const C = {
    primary: "#00CE90",
    primaryLight: "#E2FFF7",
    focus: "#59DFB7",
    disabled: "#BDBDBD",
    text: "#222222",
    sub: "#616161",
    ph: "#9E9E9E",
    border: "#E0E0E0",
    divider: "#EEEEEE",
    bg: "#F5F5F5",
    card: "#FFFFFF",
    danger: "#FF3E3E",
    dangerBg: "#FFE5E5",
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          minHeight: "100vh",
          background: stage === "landing" || stage === "shared_view" ? C.card : C.bg,
          position: "relative",
          paddingBottom: 24,
        }}
      >
        {stage === "landing" && <Landing C={C} onStart={handleStart} />}

        {stage === "shared_view" && (
          <SharedView
            C={C}
            score={sharedScore}
            interp={sharedInterp}
            onStart={handleStartFromShared}
          />
        )}

        {stage === "survey" && (
          <Survey
            C={C}
            idx={idx}
            total={QUESTIONS.length}
            question={QUESTIONS[idx]}
            answer={answers[idx]}
            onPick={handlePick}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}

        {stage === "results" && (
          <Results
            C={C}
            answers={answers}
            result={result}
            interp={interp}
            onSave={handleSave}
            onShare={handleShare}
            onRestart={handleRestart}
          />
        )}

        {showShare && (
          <BottomSheet onClose={() => setShowShare(false)} C={C} title="공유하기">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SheetButton C={C} onClick={copyLink}>
                🔗 링크 복사하기
              </SheetButton>
              <SheetButton
                C={C}
                onClick={() => {
                  track("vfq_share_click", { method: "kakao_placeholder" });
                  setShareToast("카카오톡 공유는 준비 중이에요");
                  setTimeout(() => setShareToast(""), 2200);
                  setShowShare(false);
                }}
              >
                💬 카카오톡으로 공유 (준비 중)
              </SheetButton>
            </div>
          </BottomSheet>
        )}

        {showSave && (
          <Modal onClose={() => setShowSave(false)} C={C}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              결과를 저장해두시겠어요?
            </div>
            <div style={{ fontSize: 16, color: C.sub, lineHeight: 1.5, marginBottom: 24 }}>
              애프터눈에 간편 가입하시면 오늘 결과를 보관해두고
              <br />
              <b style={{ color: C.text }}>다음 검사 결과와 비교</b>해 볼 수 있어요.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  track("vfq_save_dismiss");
                  setShowSave(false);
                }}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.sub,
                  fontSize: 17,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                나중에
              </button>
              <button
                onClick={() => {
                  track("vfq_save_signup_redirect");
                  const target = "https://afternoon.clop.ai/signup?from=vfq_near";
                  if (typeof window !== "undefined") window.location.href = target;
                }}
                style={{
                  flex: 1.4,
                  height: 56,
                  borderRadius: 8,
                  border: "none",
                  background: C.primary,
                  color: "#fff",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                간편 가입하고 저장
              </button>
            </div>
          </Modal>
        )}

        {shareToast && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              bottom: 32,
              transform: "translateX(-50%)",
              background: "rgba(34,34,34,0.92)",
              color: "#fff",
              fontSize: 15,
              padding: "12px 20px",
              borderRadius: 8,
              zIndex: 100,
            }}
          >
            {shareToast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ 서브 컴포넌트 ============ */

function Landing({ C, onStart }) {
  return (
    <div style={{ padding: "32px 24px 120px" }}>
      <div style={{ fontSize: 14, color: C.sub, fontWeight: 600, letterSpacing: 0.2 }}>
        AfterNOON · 자가 점검
      </div>
      <h1
        style={{
          fontSize: 28,
          lineHeight: 1.35,
          fontWeight: 700,
          margin: "12px 0 16px",
          color: C.text,
        }}
      >
        가까이 있는 글씨,
        <br />
        얼마나 잘 보이세요?
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: C.sub, margin: 0 }}>
        6개 문항으로 근거리 시생활의 어려움을
        <br />
        간단히 점검해 드려요. 약 1분 소요됩니다.
      </p>
      <div
        style={{
          marginTop: 32,
          background: C.primaryLight,
          borderRadius: 16,
          padding: "24px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>👁️</div>
        <div style={{ fontSize: 16, color: C.text, fontWeight: 600 }}>
          글자, 영수증, 손작업…
        </div>
        <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>
          가까운 시야 활동을 점검해 보세요
        </div>
      </div>
      <ul
        style={{
          marginTop: 24,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {[
          "본인 인증 없이 바로 시작할 수 있어요",
          "결과는 점수와 한눈에 보는 해석으로 드려요",
          "가족·지인에게도 링크로 쉽게 공유할 수 있어요",
        ].map((t, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 15,
              color: C.sub,
            }}
          >
            <span style={{ color: C.primary, fontWeight: 700, marginTop: 1 }}>✓</span>
            {t}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 12, color: C.ph, marginTop: 24, lineHeight: 1.5 }}>
        본 점검은 의학적 진단을 대체하지 않으며, 일상의 시생활 어려움을 가늠하기 위한 자가 설문입니다.
      </p>
      <FixedCTA C={C}>
        <button
          onClick={onStart}
          style={{
            width: "100%",
            height: 60,
            background: C.primary,
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          시작하기
        </button>
      </FixedCTA>
    </div>
  );
}

function SharedView({ C, score, interp, onStart }) {
  return (
    <div style={{ padding: "32px 24px 120px" }}>
      <div style={{ fontSize: 14, color: C.sub, fontWeight: 600, letterSpacing: 0.2 }}>
        AfterNOON · 자가 점검
      </div>

      <div style={{ marginTop: 12, fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
        지인이 결과를 공유했어요
      </div>

      <h1
        style={{
          fontSize: 26,
          lineHeight: 1.35,
          fontWeight: 700,
          margin: "8px 0 24px",
          color: C.text,
        }}
      >
        지인의 근거리 시력은
        <br />
        어떨까요?
      </h1>

      {/* 공유받은 점수 카드 */}
      <div
        style={{
          padding: "32px 20px",
          background: C.card,
          borderRadius: 16,
          textAlign: "center",
          border: `1px solid ${C.divider}`,
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>{interp.emoji}</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          {interp.headline}
        </div>
        {score != null && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 4,
              padding: "10px 18px",
              background: C.primaryLight,
              borderRadius: 999,
            }}
          >
            <span style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}>점수</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: C.primary }}>{score}</span>
            <span style={{ fontSize: 14, color: C.sub }}>/ 100</span>
          </div>
        )}
      </div>

      {/* 본인 검사 권유 */}
      <div
        style={{
          marginTop: 28,
          padding: "20px",
          background: C.primaryLight,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: C.text,
            marginBottom: 6,
            lineHeight: 1.4,
          }}
        >
          나의 근거리 시력은 어떨까요?
        </div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55 }}>
          같은 6개 문항으로 1분이면 끝나요.
          <br />
          본인 인증도 필요하지 않아요.
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.ph, marginTop: 24, lineHeight: 1.5 }}>
        본 점검은 의학적 진단을 대체하지 않으며, 일상의 시생활 어려움을 가늠하기 위한 자가 설문입니다.
      </p>

      <FixedCTA C={C}>
        <button
          onClick={onStart}
          style={{
            width: "100%",
            height: 60,
            background: C.primary,
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          내 근거리 시생활 점수도 확인하기
        </button>
      </FixedCTA>
    </div>
  );
}

function Survey({ C, idx, total, question, answer, onPick, onNext, onPrev }) {
  const isLast = idx === total - 1;
  const canNext = answer != null;
  return (
    <div style={{ padding: "16px 0 120px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px 16px",
        }}
      >
        <button
          onClick={onPrev}
          aria-label="뒤로"
          style={{
            width: 44,
            height: 44,
            border: "none",
            background: "transparent",
            fontSize: 24,
            color: C.text,
            cursor: "pointer",
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}>
          <span style={{ color: C.primary }}>{idx + 1}</span> / {total}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            height: 6,
            background: C.divider,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((idx + 1) / total) * 100}%`,
              height: "100%",
              background: C.primary,
              transition: "width 240ms ease",
            }}
          />
        </div>
      </div>

      <div style={{ padding: "28px 20px 8px" }}>
        <div
          style={{
            fontSize: 13,
            color: C.sub,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          질문 {idx + 1}
        </div>
        <h2
          style={{
            fontSize: 21,
            lineHeight: 1.45,
            fontWeight: 700,
            margin: 0,
            color: C.text,
          }}
        >
          {question}
        </h2>
      </div>

      <div
        style={{
          padding: "20px 16px 0",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {CHOICES.map((c) => {
          const selected = answer === c.value;
          return (
            <button
              key={c.value}
              onClick={() => onPick(c.value)}
              style={{
                width: "100%",
                minHeight: 64,
                textAlign: "left",
                padding: "16px 18px",
                background: selected ? C.primaryLight : C.card,
                border: `2px solid ${selected ? C.primary : C.border}`,
                borderRadius: 12,
                color: C.text,
                fontSize: 17,
                fontWeight: selected ? 700 : 500,
                lineHeight: 1.45,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "border-color 120ms, background 120ms",
              }}
            >
              <span
                aria-hidden
                style={{
                  flex: "0 0 22px",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${selected ? C.primary : C.disabled}`,
                  background: selected ? C.primary : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selected && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: "#fff",
                      borderRadius: "50%",
                    }}
                  />
                )}
              </span>
              {c.label}
            </button>
          );
        })}
      </div>

      <FixedCTA C={C}>
        <button
          onClick={onNext}
          disabled={!canNext}
          style={{
            width: "100%",
            height: 60,
            background: canNext ? C.primary : C.disabled,
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            cursor: canNext ? "pointer" : "not-allowed",
          }}
        >
          {isLast ? "결과 보기" : "다음"}
        </button>
      </FixedCTA>
    </div>
  );
}

function Results({ C, answers, result, interp, onSave, onShare, onRestart }) {
  const { score, naCount } = result;
  return (
    <div style={{ padding: "16px 0 32px" }}>
      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}>점검 결과</div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: "6px 0 0",
            color: C.text,
            lineHeight: 1.4,
          }}
        >
          근거리 시생활 자가점검
        </h1>
      </div>

      <div
        style={{
          margin: "16px",
          padding: "28px 20px",
          background: C.card,
          borderRadius: 16,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>{interp.emoji}</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          {interp.headline}
        </div>
        {score != null && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 4,
              padding: "10px 18px",
              background: C.primaryLight,
              borderRadius: 999,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}>점수</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: C.primary }}>{score}</span>
            <span style={{ fontSize: 14, color: C.sub }}>/ 100</span>
          </div>
        )}
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: C.sub,
            margin: "0 auto",
            maxWidth: 320,
          }}
        >
          {interp.message}
        </p>
        {naCount > 0 && (
          <p style={{ fontSize: 12, color: C.ph, marginTop: 14 }}>
            ‘다른 이유로 / 관심 없음’ {naCount}문항은 평균에서 제외했어요.
          </p>
        )}
      </div>

      <div
        style={{
          margin: "0 16px 16px",
          padding: "20px",
          background: "#FFFDF5",
          border: `1px solid ${C.divider}`,
          borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          📌 지금 저장해두시면 비교 가능합니다
        </div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.5, marginBottom: 14 }}>
          오늘 결과를 보관해두면, 다음 점검 때 변화를 한눈에 볼 수 있어요.
        </div>
        <button
          onClick={onSave}
          style={{
            width: "100%",
            height: 52,
            background: C.primary,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          결과 저장하기
        </button>
      </div>

      <div
        style={{
          margin: "0 16px 16px",
          background: C.card,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            fontSize: 14,
            fontWeight: 700,
            color: C.text,
            borderBottom: `1px solid ${C.divider}`,
          }}
        >
          내 응답 요약
        </div>
        {answers.map((a, i) => {
          const choice = CHOICES.find((c) => c.value === a);
          return (
            <div
              key={i}
              style={{
                padding: "12px 16px",
                borderBottom:
                  i === answers.length - 1 ? "none" : `1px solid ${C.divider}`,
              }}
            >
              <div style={{ fontSize: 12, color: C.ph, fontWeight: 600, marginBottom: 2 }}>
                Q{i + 1}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: C.sub,
                  lineHeight: 1.4,
                  marginBottom: 4,
                }}
              >
                {QUESTIONS[i]}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                ↳ {choice ? choice.label : "—"}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          onClick={onShare}
          style={{
            width: "100%",
            height: 56,
            background: C.card,
            color: C.primary,
            fontSize: 16,
            fontWeight: 700,
            border: `2px solid ${C.primary}`,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          🔗 가족·지인에게 공유하기
        </button>
        <button
          onClick={onRestart}
          style={{
            width: "100%",
            height: 48,
            background: "transparent",
            color: C.sub,
            fontSize: 15,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          처음부터 다시 하기
        </button>
      </div>

      <p
        style={{
          fontSize: 11,
          color: C.ph,
          margin: "20px 16px 0",
          lineHeight: 1.6,
        }}
      >
        본 결과는 NEI VFQ-25의 표준 변환식을 기반으로 산출된 자가 점검 점수이며, 의학적 진단을 대체하지 않습니다.
        지속되는 불편감이 있다면 가까운 안과에서 진료를 받아 보세요.
      </p>
    </div>
  );
}

function FixedCTA({ children, C }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        background:
          "linear-gradient(180deg, rgba(245,245,245,0) 0%, rgba(245,245,245,0.9) 30%, #F5F5F5 100%)",
        paddingTop: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "12px 16px 16px",
          pointerEvents: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Modal({ children, onClose, C }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: C.card,
          borderRadius: "20px 20px 0 0",
          padding: "28px 20px 24px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BottomSheet({ children, onClose, C, title }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: C.card,
          borderRadius: "20px 20px 0 0",
          padding: "20px 20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 22,
              color: C.sub,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SheetButton({ children, onClick, C }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        height: 56,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        fontSize: 16,
        fontWeight: 600,
        color: C.text,
        textAlign: "left",
        padding: "0 18px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
