import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://smiinii.github.io/lol.vs/"),
  title: "LOL.VS — 판정받고, 다음 플레이까지 확인하세요",
  description: "검증된 판정자가 핵심 타임스탬프와 근거, 다음에 더 나은 선택까지 알려주는 롤 플레이 판정·피드백 서비스",
  openGraph: {
    title: "LOL.VS — 판정받고, 다음 플레이까지 확인하세요",
    description: "검증된 판정자의 근거 있는 판정과 다음 플레이 피드백",
    url: "https://smiinii.github.io/lol.vs/",
    siteName: "LOL.VS",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "https://smiinii.github.io/lol.vs/og.png", width: 1200, height: 630, alt: "LOL.VS 소셜 미리보기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LOL.VS — 판정받고, 다음 플레이까지 확인하세요",
    description: "검증된 판정자의 근거 있는 판정과 다음 플레이 피드백",
    images: ["https://smiinii.github.io/lol.vs/og.png"],
  },
  icons: {
    icon: [{ url: "https://smiinii.github.io/lol.vs/favicon-v4.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "https://smiinii.github.io/lol.vs/favicon-v4.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
