import Link from "next/link";

/**
 * 설문 페이지 공통 푸터.
 * 회사명·사업자번호 등 거창한 표기 없이, 법적으로 필요한
 * 개인정보 처리방침 링크만 가볍게 노출한다.
 */
export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #f0f0f0",
        padding: "20px 16px",
        textAlign: "center",
        fontSize: 12,
        color: "#9e9e9e",
      }}
    >
      <Link
        href="/privacy"
        style={{ color: "#616161", textDecoration: "none", fontWeight: 500 }}
      >
        개인정보 처리방침
      </Link>
      <span style={{ margin: "0 6px", color: "#e0e0e0" }}>·</span>
      <span>AfterNOON</span>
    </footer>
  );
}
