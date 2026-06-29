import Link from "next/link";

export const metadata = {
  title: "개인정보 처리방침 · AfterNOON 자가점검",
  description:
    "애프터눈 자가점검 설문의 개인정보 처리방침입니다. 본 설문은 이름·연락처를 수집하지 않으며, 응답 점수를 서버에 저장하지 않습니다.",
  robots: { index: true, follow: true },
};

const SHELL = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "32px 20px 80px",
  color: "#222",
  lineHeight: 1.7,
  fontSize: 15,
};

export default function PrivacyPage() {
  return (
    <main style={SHELL}>
      <p style={{ color: "#9e9e9e", fontSize: 13, marginBottom: 4 }}>
        AfterNOON · 자가 점검
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px" }}>
        개인정보 처리방침
      </h1>

      <p style={{ color: "#616161", marginBottom: 28 }}>
        주식회사 클롭(이하 “회사”)은 애프터눈 자가점검 설문(이하 “설문”)을 운영하며,
        「개인정보 보호법」을 준수하여 본 처리방침을 수립·공개합니다. 본 처리방침은
        별도의 회원가입 없이 이용하는 설문 페이지에 한하여 적용되며, 애프터눈 회원
        서비스에는 회사의 별도 개인정보 처리방침이 적용됩니다.
      </p>

      <Section title="제1조 (수집하는 개인정보 항목 및 목적)">
        <p>
          본 설문은 이용자의 이름·연락처 등 직접적인 식별정보를 수집하지 않으며,
          설문 응답 점수를 회사 서버에 저장하지 않습니다. 다만 서비스 이용 통계 및
          품질 개선을 위하여 아래 정보가 자동으로 수집될 수 있습니다.
        </p>
        <ul style={UL}>
          <li>수집항목: 쿠키, 기기·브라우저 정보, 서비스 이용 기록(방문·클릭 등)</li>
          <li>수집목적: 설문 서비스의 이용 통계 분석 및 품질 개선</li>
          <li>보유기간: 아래 제3조의 분석 도구 사업자가 정한 보관 정책에 따름</li>
        </ul>
      </Section>

      <Section title="제2조 (개인정보 자동 수집 장치 — 쿠키)">
        <p>
          본 설문은 이용 통계 분석을 위해 쿠키(Cookie)를 사용합니다. 이용자는 웹
          브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 거부하더라도 설문
          이용에는 제한이 없습니다.
        </p>
        <ul style={UL}>
          <li>크롬: 설정 &gt; 개인정보 보호 및 보안 &gt; 쿠키 및 기타 사이트 데이터</li>
          <li>사파리(모바일): 기기 설정 &gt; Safari &gt; 고급 &gt; 모든 쿠키 차단</li>
        </ul>
      </Section>

      <Section title="제3조 (국외 이전 — 분석 도구 사용)">
        <p>
          본 설문은 이용 통계 분석을 위해 아래의 국외 분석 도구를 사용하며, 이
          과정에서 제1조의 정보가 국외로 이전될 수 있습니다.
        </p>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={TH}>이전받는 자</th>
                <th style={TH}>이전 목적</th>
                <th style={TH}>이전 국가</th>
                <th style={TH}>이전 항목</th>
                <th style={TH}>이전 방법</th>
                <th style={TH}>보유·이용 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={TD}>Google LLC (Google Analytics)</td>
                <td style={TD}>이용 통계 분석 및 서비스 개선</td>
                <td style={TD}>미국</td>
                <td style={TD}>쿠키, 기기·브라우저 정보, 이용 기록</td>
                <td style={TD}>서비스 이용 시점에 네트워크를 통한 전송</td>
                <td style={TD}>사업자 정책에 따름</td>
              </tr>
              <tr>
                <td style={TD}>Microsoft Corporation (Microsoft Clarity)</td>
                <td style={TD}>이용 통계 분석 및 서비스 개선</td>
                <td style={TD}>미국</td>
                <td style={TD}>쿠키, 기기·브라우저 정보, 이용 기록</td>
                <td style={TD}>서비스 이용 시점에 네트워크를 통한 전송</td>
                <td style={TD}>사업자 정책에 따름</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="제4조 (개인정보 보호책임자 및 문의)">
        <p>설문 이용과 관련한 개인정보 문의는 아래로 접수하실 수 있습니다.</p>
        <ul style={UL}>
          <li>개인정보 보호책임자: 김현준</li>
          <li>이메일: service@clop.ai</li>
        </ul>
      </Section>

      <Section title="제5조 (처리방침의 변경)">
        <p>
          본 처리방침의 내용을 변경할 경우 설문 페이지를 통해 공지합니다.
        </p>
        <ul style={UL}>
          <li>시행일자: 2026.06.29</li>
        </ul>
      </Section>

      <div style={{ marginTop: 40 }}>
        <Link
          href="/"
          style={{
            color: "#00A877",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← 자가점검으로 돌아가기
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{title}</h2>
      <div style={{ color: "#424242" }}>{children}</div>
    </section>
  );
}

const UL = { margin: "10px 0 0", paddingLeft: 18, color: "#424242" };
const TABLE = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  minWidth: 560,
};
const TH = {
  border: "1px solid #e0e0e0",
  background: "#f5f5f5",
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const TD = {
  border: "1px solid #e0e0e0",
  padding: "8px 10px",
  verticalAlign: "top",
};
