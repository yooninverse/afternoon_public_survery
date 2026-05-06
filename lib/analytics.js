/**
 * GA4 이벤트 트래킹 래퍼
 * - 운영: window.gtag('event', ...) 호출
 * - 개발: console.log로 폴백 (DebugView로도 같이 확인 가능)
 *
 * GA4 customs:
 *  - 이벤트명은 snake_case (GA4 권장)
 *  - 파라미터 키도 snake_case
 *  - score / question_index 등 숫자/문자 파라미터는
 *    GA4 Admin > Custom definitions 에서 "Custom dimension/metric"으로
 *    등록해야 보고서에서 dimension으로 활용 가능
 */

export function track(event, params = {}) {
  if (typeof window === "undefined") return;

  // GA4
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }

  // 자체 로그 훅 (필요시 활용)
  if (typeof window.afterNoonTrack === "function") {
    try {
      window.afterNoonTrack(event, params);
    } catch (_) {
      /* swallow */
    }
  }

  // dev 가시성
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[VFQ track]", event, params);
  }
}
