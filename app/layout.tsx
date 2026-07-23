import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://smiinii.github.io/lol.vs/"),
  title: "LOL.VS — 플레이 판정과 피드백",
  description: "짧은 롤 플레이 영상을 올리고 근거 있는 의견과 다음 플레이 피드백을 받는 서비스",
  openGraph: {
    title: "LOL.VS — 플레이 판정과 피드백",
    description: "롤 플레이 영상을 올리고 근거 있는 의견과 다음 플레이 방법을 확인하세요.",
    url: "https://smiinii.github.io/lol.vs/",
    siteName: "LOL.VS",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "https://smiinii.github.io/lol.vs/og.png", width: 1200, height: 630, alt: "LOL.VS 소셜 미리보기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LOL.VS — 플레이 판정과 피드백",
    description: "롤 플레이 영상을 올리고 근거 있는 의견과 다음 플레이 방법을 확인하세요.",
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
