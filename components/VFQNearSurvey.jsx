"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * AfterNOON · 근거리 시력 불편 자가점검 (모바일)
 * - DS: AfterNOON 디자인시스템 토큰 준수 (#00CE90 primary)
 * - 타깃: 60-70대 노안 — 본문 17~18px / 터치 64px+
 * - 스코어링: NEI VFQ-25 표준 변환식 (1=100, 2=75, 3=50, 4=25, 5=0, 6=NA)
 * - 분석: lib/analytics.js → GA4 (window.gtag) 로 전송
 * - 공유 링크:
 *     · 점수 포함: ?s=N (0~100) → SharedView
 *     · 설문만:    ?from=share → 랜딩에 추천 배지 노출
 * - 결과 화면 1차 CTA: 애프터눈 안과 목록 페이지로 직접 이동
 * - 결과 화면 위계: 안과 보기 → 공유 2종 → 응답 요약(정보) → 다시 하기
 */

// ============ 상수 ============
const HOSPITALS_URL = "https://afternoon.clop.ai";

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
      headline: "일상에서 불편함이 거의 없으시군요!",
      message: "안과 정기방문을 통해 지금같은 시력을 유지해보세요.",
      tone: "good",
    };
  if (score >= 60)
    return {
      emoji: "🙂",
      headline: "큰 어려움은 없지만, 살펴볼 만해요",
      message: "한 번쯤 안과에서 눈 상태를 점검해 보시길 권해드려요.",
      tone: "okay",
    };
  if (score >= 40)
    return {
      emoji: "😐",
      headline: "종종 불편함을 느끼시네요",
      message: "노안·백내장·안구건조 등이 영향을 줄 수 있어요. 안과에서 한 번 살펴보시길 권해드려요.",
      tone: "warn",
    };
  if (score >= 20)
    return {
      emoji: "😟",
      headline: "불편함을 자주 느끼시네요",
      message: "일상이 더 힘들어지기 전에 가까운 안과에서 검사를 받아보세요.",
      tone: "warn",
    };
  return {
    emoji: "😣",
    headline: "시력 때문에 일상이 많이 힘드신 것 같아요",
    message: "빠른 시일 내 안과에서 검사를 받아보시길 권해드려요.",
    tone: "bad",
  };
}

// 점수는 쿼리스트링(?s=)이 아니라 URL 프래그먼트(#s=)로 전달한다.
// 프래그먼트는 서버/분석툴(GA page_location 등)로 전송되지 않으므로
// 건강 자가점수가 분석 로그에 남지 않는다.
function parseHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash);
}

function parseSharedScore() {
  if (typeof window === "undefined") return null;
  try {
    const s = parseHashParams().get("s");
    if (s === null) return null;
    const n = parseInt(s, 10);
    if (!Number.isInteger(n) || n < 0 || n > 100) return null;
    return n;
  } catch {
    return null;
  }
}

function parseReferral() {
  if (typeof window === "undefined") return null;
  try {
    const from = parseHashParams().get("from");
    return from === "share" ? "share" : null;
  } catch {
    return null;
  }
}

function buildShareUrl(mode, score) {
  const fallback = "https://afternoon.clop.ai/vfq-near";
  if (typeof window === "undefined") return fallback;
  try {
    const u = new URL(window.location.href);
    // 기존 점수/추천 파라미터는 쿼리·해시 양쪽에서 모두 제거
    u.searchParams.delete("s");
    u.searchParams.delete("from");
    u.hash = "";
    const hashParams = new URLSearchParams();
    if (mode === "with_score" && score != null) {
      hashParams.set("s", String(score));
    } else if (mode === "survey_only") {
      hashParams.set("from", "share");
    }
    const h = hashParams.toString();
    return u.toString() + (h ? "#" + h : "");
  } catch {
    return fallback;
  }
}

function clearSharedParam() {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    // 레거시 쿼리 파라미터(?s=, ?from=)도 함께 정리
    u.searchParams.delete("s");
    u.searchParams.delete("from");
    const q = u.searchParams.toString();
    const newUrl = u.pathname + (q ? "?" + q : "");
    window.history.replaceState({}, "", newUrl);
  } catch {
    /* ignore */
  }
}

// ============ 메인 ============
export default function VFQNearSurvey() {
  const [stage, setStage] = useState("landing");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(Array(6).fill(null));
  const [showShare, setShowShare] = useState(false);
  const [shareMode, setShareMode] = useState(null);
  const [shareToast, setShareToast] = useState("");
  const [sharedScore, setSharedScore] = useState(null);
  const [referral, setReferral] = useState(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const score = parseSharedScore();
    const ref = parseReferral();
    if (score !== null) {
      setSharedScore(score);
      setStage("shared_view");
      track("vfq_shared_view", { shared_score: score });
    } else if (ref === "share") {
      setReferral("share");
      track("vfq_landing_view", { referral: "share" });
    } else {
      track("vfq_landing_view");
    }
  }, []);

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
    track("vfq_start_click", referral ? { referral } : {});
    setIdx(0);
    setAnswers(Array(6).fill(null));
    setStage("survey");
  };

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

  const handleViewHospitals = () => {
    track("vfq_view_hospitals_click", { score: result.score });
    if (typeof window !== "undefined") {
      window.location.href = HOSPITALS_URL;
    }
  };

  const handleShare = async (mode) => {
    track("vfq_share_open", { share_type: mode });
    setShareMode(mode);

    const score = mode === "with_score" ? result.score : null;
    const url = buildShareUrl(mode, score);
    const text =
      mode === "with_score"
        ? "1분이면 끝나는 근거리 시력 자가 점검, 같이 해보실래요? (애프터눈)"
        : "근거리 시력으로 인한 일상의 불편함을 점검해봤어요. 같이 보시겠어요?(애프터눈)";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "AfterNOON · 근거리 시력 불편 자가점검",
          text,
          url,
        });
        track("vfq_share_click", {
          method: "web_share_api",
          share_type: mode,
          shared_score: score,
        });
      } catch (_) {
        /* user cancelled */
      }
    } else {
      setShowShare(true);
    }
  };

  const copyLink = async () => {
    const mode = shareMode || "with_score";
    const score = mode === "with_score" ? result.score : null;
    const url = buildShareUrl(mode, score);
    try {
      await navigator.clipboard.writeText(url);
      setShareToast("링크가 복사되었어요");
      track("vfq_share_click", {
        method: "copy_link",
        share_type: mode,
        shared_score: score,
      });
    } catch {
      setShareToast("복사에 실패했어요. 길게 눌러 직접 복사해 주세요.");
    }
    setTimeout(() => setShareToast(""), 2400);
    setShowShare(false);
  };

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
        {stage === "landing" && (
          <Landing C={C} onStart={handleStart} referral={referral} />
        )}

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
            onViewHospitals={handleViewHospitals}
            onShareWithScore={() => handleShare("with_score")}
            onShareSurveyOnly={() => handleShare("survey_only")}
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
                  track("vfq_share_click", {
                    method: "kakao_placeholder",
                    share_type: shareMode,
                  });
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

function Landing({ C, onStart, referral }) {
  return (
    <div style={{ padding: "32px 24px 120px" }}>
      <div style={{ fontSize: 14, color: C.sub, fontWeight: 600, letterSpacing: 0.2 }}>
        AfterNOON · 자가 점검
      </div>

      {referral === "share" && (
        <div
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: C.primaryLight,
            borderRadius: 999,
            fontSize: 13,
            color: C.text,
            fontWeight: 600,
          }}
        >
          <span>💬</span>
          <span>지인이 시력 자가점검을 추천해줬어요</span>
        </div>
      )}

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
        짧은 60초 설문만으로
        <br />
        나의 시력이 일상에 얼마나 영향을 주는지 점검할 수 있어요
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
          글자, 영수증, 손작업 등…
        </div>
        <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>
          일상 생활에서의 시력을 되돌아봐요
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
          "본인 인증 없이 간편하게",
          "점수로 해석하는 나의 안구 건강",
          "가족·지인에게 내 점수와 자가점검 설문도 공유해보세요",
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
        본 점검은 의학적 진단을 대체하지 않으며, 일상에서 느끼는 시력 관련 불편을 가늠하기 위한 자가 설문입니다.
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
          fontSize: 25,
          lineHeight: 1.35,
          fontWeight: 700,
          margin: "8px 0 24px",
          color: C.text,
        }}
      >
        지인의 근거리 시력은
        <br />
        일상에 얼마나 영향을 줄까요?
      </h1>

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
          '나는 어떨까?' 60초면 확인할 수 있어요
        </div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55 }}>
          6개 문항으로 간단하게
          <br />
          나의 근거리 시력 점수를 확인해보세요
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.ph, marginTop: 24, lineHeight: 1.5 }}>
        본 점검은 의학적 진단을 대체하지 않으며, 일상에서 느끼는 시력 관련 불편을 가늠하기 위한 자가 설문입니다.
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
          내 근거리 시력 불편도 점검해보기
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

function Results({
  C,
  answers,
  result,
  interp,
  onViewHospitals,
  onShareWithScore,
  onShareSurveyOnly,
  onRestart,
}) {
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
          근거리 시력 불편 자가점검
        </h1>
      </div>

      {/* 점수 카드 */}
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

      {/* 1차 CTA: 애프터눈 안과 보기 */}
      <div
        style={{
          margin: "0 16px 16px",
          padding: "20px",
          background: C.primaryLight,
          border: `1px solid ${C.divider}`,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: C.text,
            marginBottom: 6,
            lineHeight: 1.45,
          }}
        >
          지금 애프터눈에서<br />검사결과지까지 제공하는<br />안과를 만나보세요
        </div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, marginBottom: 14 }}>
          가까운 안과를 찾고, 검사 결과지까지 받아볼 수 있어요.
        </div>
        <button
          onClick={onViewHospitals}
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
          애프터눈 안과 보기
        </button>
      </div>

      {/* 2차 액션: 공유 버튼 2종 — 응답 요약 위로 위치 변경 */}
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <button
          onClick={onShareWithScore}
          style={{
            width: "100%",
            minHeight: 60,
            background: C.card,
            color: C.primary,
            fontSize: 16,
            fontWeight: 700,
            border: `2px solid ${C.primary}`,
            borderRadius: 8,
            cursor: "pointer",
            lineHeight: 1.4,
            padding: "10px 12px",
          }}
        >
          🏆 내 점수와 함께 설문 공유하기
        </button>

        <button
          onClick={onShareSurveyOnly}
          style={{
            width: "100%",
            height: 56,
            background: C.card,
            color: C.sub,
            fontSize: 15,
            fontWeight: 600,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          💬 설문만 공유하기
        </button>
      </div>

      {/* 정보 영역: 응답 요약 — 헤더 라벨 명확화 + 톤 약화 */}
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
            fontSize: 13,
            fontWeight: 600,
            color: C.sub,
            borderBottom: `1px solid ${C.divider}`,
            background: C.bg,
          }}
        >
          내가 응답한 내용 보기
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

      {/* 4차 액션: 다시 하기 */}
      <div style={{ padding: "0 16px" }}>
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
        본 결과는 NEI VFQ-25(미국 국립안연구소 시각기능 설문)의 근거리 영역 6문항을 기반으로 산출된 시생활 자가 점수이며, 의학적 진단을 대체하지 않습니다.
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
