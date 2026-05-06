import Script from "next/script";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata = {
  title: "근거리 시력 자가점검 · AfterNOON",
  description:
    "6개 문항으로 근거리 시생활의 어려움을 1분 만에 점검해 보세요. AfterNOON이 제공하는 자가 설문입니다.",
  openGraph: {
    title: "근거리 시력 자가점검 · AfterNOON",
    description: "1분이면 끝나는 근거리 시생활 자가 설문. 가족·지인에게도 공유해 보세요.",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "근거리 시력 자가점검 · AfterNOON",
    description: "1분이면 끝나는 근거리 시생활 자가 설문.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#00CE90",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트 (CDN) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/[email protected]/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        {children}

        {/* GA4 — NEXT_PUBLIC_GA_ID 가 있을 때만 로드 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
