import Script from "next/script";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export const metadata = {
  title: "근거리 시력 불편 자가점검 · AfterNOON",
  description:
    "6개 문항으로 시력이 일상에 주는 불편을 1분 만에 점검해 보세요. AfterNOON이 제공하는 자가 설문입니다.",
  openGraph: {
    title: "근거리 시력 불편 자가점검 · AfterNOON",
    description: "1분이면 끝나는 시력 자가 설문. 가족·지인에게도 공유해 보세요.",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "근거리 시력 불편 자가점검 · AfterNOON",
    description: "1분이면 끝나는 시력 자가 설문.",
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
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/[email protected]/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        {children}

        {/* Google Analytics 4 */}
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
                // 점수는 URL 프래그먼트(#s=)로 전달되어 GA로 전송되지 않지만,
                // 과거에 공유된 레거시 ?s= 링크가 열릴 때를 대비해
                // page_location에서 쿼리스트링을 제거(redact)한 뒤 전송한다.
                gtag('config', '${GA_ID}', {
                  send_page_view: true,
                  page_location: (location.origin + location.pathname),
                });
              `}
            </Script>
          </>
        )}

        {/* Microsoft Clarity */}
        {CLARITY_ID && (
          <Script id="clarity-init" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_ID}");
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
