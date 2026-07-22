import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://smiinii.github.io/lol.vs/"),
  title: "LOL.VS — 억울한 장면, 함께 판결합니다",
  description: "티어가 인증된 플레이어들과 롤 플레이를 함께 보고 투표와 피드백을 나누는 커뮤니티 프로토타입",
  openGraph: {
    title: "LOL.VS — 억울한 장면, 함께 판결합니다",
    description: "티어 인증 플레이어들의 투표와 피드백",
    url: "https://smiinii.github.io/lol.vs/",
    siteName: "LOL.VS",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "https://smiinii.github.io/lol.vs/og.png", width: 1200, height: 630, alt: "LOL.VS 소셜 미리보기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LOL.VS — 억울한 장면, 함께 판결합니다",
    description: "티어 인증 플레이어들의 투표와 피드백",
    images: ["https://smiinii.github.io/lol.vs/og.png"],
  },
  icons: {
    icon: [{ url: "https://smiinii.github.io/lol.vs/favicon-v3.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "https://smiinii.github.io/lol.vs/favicon-v3.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
