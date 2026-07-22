"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useRef, useState } from "react";

type View = "home" | "ranking" | "guide" | "detail" | "submit" | "search";
type VoteSide = "A" | "B";
type User = { nickname: string; tier: string };
type LocalCase = {
  title: string;
  category: string;
  aClaim: string;
  bClaim: string;
  author: string;
  tier: string;
};
type Reply = { id: number; name: string; tier: string; text: string; vote?: VoteSide };
type CommentItem = {
  id: number;
  name: string;
  tier: string;
  text: string;
  evidence?: string;
  vote?: VoteSide;
  likes: number;
  replies: Reply[];
};
type ResolvedVerdict = { side: VoteSide; judge: string; judgeTier: string; reason: string; recognitions: number; decidedAt: string };

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;
const USER_KEY = "lolvs-demo-user";
const CHALLENGER_TEST_KEY = "lolvs-challenger-test-v1";
const CASE_KEY = "lolvs-local-case";
const VIDEO_KEY = "latest-case-video";

const tierLevel = (tier: string) => {
  if (tier.includes("챌린저")) return 9;
  if (tier.includes("그랜드마스터")) return 8;
  if (tier.includes("마스터")) return 7;
  if (tier.includes("다이아몬드")) return 6;
  if (tier.includes("에메랄드")) return 5;
  if (tier.includes("플래티넘")) return 4;
  if (tier.includes("골드")) return 3;
  if (tier.includes("실버")) return 2;
  if (tier.includes("브론즈")) return 1;
  return 0;
};

const isMasterPlus = (tier: string) => tierLevel(tier) >= 7;

const compactCases = [
  { title: "바론 스틸 시도, 이건 미드 잘못인가요?", author: "정글은못말려", tier: "다이아몬드 IV", category: "솔로랭크", meta: "25분 전", time: "마감까지 1일 9시간", a: 71, b: 29, comments: 96, clip: "00:25", image: asset("/media/gameplay-detail.png") },
  { title: "라인전 푸시 후 다이브, 누구 잘못일까요?", author: "탑은외로워", tier: "플래티넘 I", category: "파티랭크", meta: "1시간 전", time: "마감까지 20시간", a: 45, b: 55, comments: 73, clip: "00:28", image: asset("/media/gameplay-feed.png") },
  { title: "용 앞 한타에서 포지셔닝 문제?", author: "서폿의하루", tier: "에메랄드 III", category: "내전", meta: "3시간 전", time: "마감까지 18시간", a: 34, b: 66, comments: 54, clip: "00:31", image: asset("/media/gameplay-feed.png") },
  { title: "바텀 2대2 교전, 원딜과 서폿 중 누구 판단이 문제였나요?", author: "바텀연구소", tier: "다이아몬드 II", category: "솔로랭크", meta: "4시간 전", time: "마감까지 16시간", a: 57, b: 43, comments: 81, clip: "00:34", image: asset("/media/gameplay-detail.png") },
  { title: "전령 앞에서 먼저 물린 탑, 팀이 버렸다는 게 맞나요?", author: "탑텔있음", tier: "에메랄드 I", category: "파티랭크", meta: "5시간 전", time: "마감까지 15시간", a: 63, b: 37, comments: 42, clip: "00:22", image: asset("/media/gameplay-feed.png") },
  { title: "상대 정글 위치를 알았는데도 카정 간 선택, 무리였나요?", author: "블루내꺼", tier: "플래티넘 II", category: "솔로랭크", meta: "6시간 전", time: "마감까지 14시간", a: 41, b: 59, comments: 68, clip: "00:29", image: asset("/media/gameplay-detail.png") },
  { title: "미드 로밍을 따라가지 않은 게 잘못인가요?", author: "라인먼저", tier: "에메랄드 IV", category: "내전", meta: "7시간 전", time: "마감까지 13시간", a: 52, b: 48, comments: 39, clip: "00:26", image: asset("/media/gameplay-feed.png") },
  { title: "한타 전 와드하러 간 서폿, 팀 이탈로 봐야 하나요?", author: "시야점수왕", tier: "다이아몬드 III", category: "솔로랭크", meta: "8시간 전", time: "마감까지 12시간", a: 28, b: 72, comments: 105, clip: "00:38", image: asset("/media/gameplay-detail.png") },
  { title: "탑 억제기 대신 용 합류, 이 판단이 맞았을까요?", author: "운영이먼저", tier: "다이아몬드 I", category: "파티랭크", meta: "9시간 전", time: "마감까지 11시간", a: 76, b: 24, comments: 117, clip: "00:33", image: asset("/media/gameplay-feed.png") },
  { title: "정글이 콜한 다이브를 거절한 미드가 잘못인가요?", author: "핑은찍었어", tier: "플래티넘 I", category: "솔로랭크", meta: "10시간 전", time: "마감까지 10시간", a: 49, b: 51, comments: 64, clip: "00:27", image: asset("/media/gameplay-detail.png") },
  { title: "포킹 조합인데 먼저 진입한 탱커, 누구 콜이 맞나요?", author: "한타각보는중", tier: "에메랄드 II", category: "내전", meta: "11시간 전", time: "마감까지 9시간", a: 32, b: 68, comments: 77, clip: "00:36", image: asset("/media/gameplay-feed.png") },
  { title: "바론 버스트 중 상대 정글을 막지 못한 책임은 누구에게?", author: "강타는있음", tier: "다이아몬드 I", category: "파티랭크", meta: "12시간 전", time: "마감까지 8시간", a: 66, b: 34, comments: 91, clip: "00:30", image: asset("/media/gameplay-detail.png") },
  { title: "라인 프리징 중 로밍 간 서폿, 원딜이 억울할 만한가요?", author: "혼자먹을게", tier: "골드 I", category: "솔로랭크", meta: "13시간 전", time: "마감까지 7시간", a: 58, b: 42, comments: 45, clip: "00:24", image: asset("/media/gameplay-feed.png") },
  { title: "첫 용을 포기하고 유충을 택한 교환, 손해인가요?", author: "오브젝트계산", tier: "에메랄드 III", category: "내전", meta: "14시간 전", time: "마감까지 6시간", a: 47, b: 53, comments: 58, clip: "00:32", image: asset("/media/gameplay-detail.png") },
  { title: "텔레포트가 있는데도 한타에 늦은 탑, 고의적인 건가요?", author: "사이드운영", tier: "플래티넘 III", category: "파티랭크", meta: "15시간 전", time: "마감까지 5시간", a: 69, b: 31, comments: 83, clip: "00:35", image: asset("/media/gameplay-feed.png") },
  { title: "마지막 한타에서 원딜을 지키지 않은 서폿 판단", author: "원딜지켜줘", tier: "다이아몬드 IV", category: "솔로랭크", meta: "16시간 전", time: "마감까지 4시간", a: 38, b: 62, comments: 112, clip: "00:41", image: asset("/media/gameplay-detail.png") },
  { title: "상대 텔 위치를 놓친 미드, 콜을 안 한 탑 책임도 있나요?", author: "미아핑세번", tier: "에메랄드 II", category: "솔로랭크", meta: "17시간 전", time: "마감까지 3시간", a: 54, b: 46, comments: 49, clip: "00:27", image: asset("/media/gameplay-feed.png") },
  { title: "용을 앞두고 귀환한 원딜, 오브젝트 포기 판단이 맞나요?", author: "템은사야지", tier: "플래티넘 I", category: "파티랭크", meta: "18시간 전", time: "마감까지 3시간", a: 36, b: 64, comments: 62, clip: "00:30", image: asset("/media/gameplay-detail.png") },
  { title: "유리한 한타 뒤 바론 대신 억제기를 민 선택", author: "운영토론회", tier: "다이아몬드 III", category: "내전", meta: "19시간 전", time: "마감까지 2시간", a: 61, b: 39, comments: 88, clip: "00:35", image: asset("/media/gameplay-feed.png") },
  { title: "레드 양보를 거절한 정글, 성장 차이면 정당한가요?", author: "버프는공유", tier: "에메랄드 IV", category: "솔로랭크", meta: "20시간 전", time: "마감까지 2시간", a: 43, b: 57, comments: 71, clip: "00:23", image: asset("/media/gameplay-detail.png") },
  { title: "사이드 압박 중 본대가 교전한 상황, 합류가 늦었나요?", author: "스플릿장인", tier: "다이아몬드 II", category: "파티랭크", meta: "21시간 전", time: "마감까지 1시간", a: 72, b: 28, comments: 93, clip: "00:39", image: asset("/media/gameplay-feed.png") },
  { title: "상대 궁극기를 뺀 뒤 바로 재진입한 콜, 성급했나요?", author: "쿨타임체크", tier: "플래티넘 II", category: "내전", meta: "22시간 전", time: "마감까지 1시간", a: 48, b: 52, comments: 56, clip: "00:28", image: asset("/media/gameplay-detail.png") },
  { title: "첫 갱 실패 뒤 같은 라인을 다시 간 정글 판단", author: "한번만더", tier: "골드 I", category: "솔로랭크", meta: "23시간 전", time: "마감까지 58분", a: 29, b: 71, comments: 84, clip: "00:26", image: asset("/media/gameplay-feed.png") },
  { title: "한타 승리 후 귀환 핑을 무시한 추격, 누구 콜이 문제였나요?", author: "집에갈시간", tier: "에메랄드 I", category: "파티랭크", meta: "1일 전", time: "마감까지 42분", a: 65, b: 35, comments: 99, clip: "00:32", image: asset("/media/gameplay-detail.png") },
].map((item, index) => ({ ...item, likes: item.comments * 2 + 41 - index * 2 }));

const resolvedVerdicts: Record<string, ResolvedVerdict> = {
  "전령 앞에서 먼저 물린 탑, 팀이 버렸다는 게 맞나요?": { side: "A", judge: "맵리딩중", judgeTier: "그랜드마스터 612P", reason: "상대 위치가 확인되지 않은 상태에서 먼저 시야 밖으로 진입했고, 팀이 합류할 수 있는 거리도 아니었습니다. 후속 대응보다 선진입 판단의 책임이 더 큽니다.", recognitions: 1284, decidedAt: "오늘 02:18" },
  "미드 로밍을 따라가지 않은 게 잘못인가요?": { side: "B", judge: "판결요정", judgeTier: "챌린저 942P", reason: "미드가 먼저 라인 손실을 알렸지만 교전 시작 핑이 늦었습니다. 로밍을 따라가지 않은 선택보다 아군 상황을 확인하지 않고 교전을 연 판단이 더 큰 원인입니다.", recognitions: 1769, decidedAt: "어제 23:41" },
};

const weeklyPosts = [
  { title: "바론 스틸, 이건 누구 잘못?", meta: "댓글 212 · 투표 1.2만", trend: "up", delta: 2 },
  { title: "탑 다이브 교환, 합리적인 선택?", meta: "댓글 158 · 투표 8,745", trend: "down", delta: 1 },
  { title: "용 한타 진입 타이밍 논란", meta: "댓글 134 · 투표 6,312", trend: "up", delta: 1 },
  { title: "미드 로밍 vs 라인 손해", meta: "댓글 98 · 투표 5,102", trend: "same", delta: 0 },
  { title: "정글 동선 꼬임, 누구 책임?", meta: "댓글 87 · 투표 4,210", trend: "down", delta: 2 },
];

const commentsSeed: CommentItem[] = [
  {
    id: 1,
    name: "전령의눈",
    tier: "플래티넘 II",
    text: "미드가 라인 관리한 건 아쉽지만, 시야 없이 먼저 들어간 상황을 더 크게 봐야 할 것 같아요.",
    evidence: "24:18 바론 체력 50%인데 미드가 아직 강가에 없었습니다.",
    vote: "A",
    likes: 256,
    replies: [{ id: 11, name: "바위게장인", tier: "에메랄드 IV", text: "저도 합류 핑이 없었던 점까지 같이 봐야 한다고 생각해요.", vote: "A" }],
  },
  {
    id: 2,
    name: "바텀은신이야",
    tier: "다이아몬드 III",
    text: "바론 체력이 낮았어도 팀원 합류 핑을 확인하고 시도했으면 결과가 달랐을 것 같습니다.",
    evidence: "23:52부터 미드가 라인을 밀고 있다는 사실을 팀이 알고 있었습니다.",
    vote: "B",
    likes: 138,
    replies: [],
  },
  ...Array.from({ length: 18 }, (_, index) => {
    const names = ["강타확인", "라인관리중", "와드두개", "한타천천히", "사이드장인", "핑찍고간다"];
    const tiers = ["에메랄드 II", "플래티넘 I", "다이아몬드 IV", "골드 I", "에메랄드 IV", "플래티넘 III"];
    const texts = [
      "이 장면만 보면 미드 합류보다 바론을 먼저 시작한 콜이 더 위험해 보입니다.",
      "라인 상황까지 같이 보면 한 명의 잘못으로 보기 어렵고, 시작 핑이 핵심인 것 같아요.",
      "상대 정글 위치가 보이지 않았기 때문에 버스트보다 입구 차단을 먼저 했어야 합니다.",
      "결과와 별개로 24분대 인원 배치를 보면 한 번 기다리는 선택이 더 안정적이었습니다.",
      "미드도 늦었지만 팀이 빠질 수 있는 타이밍이 두 번 있었던 점을 같이 봐야 합니다.",
      "다음에는 오브젝트 체력보다 아군 합류 상태를 먼저 확인하면 같은 실수를 줄일 수 있어요.",
    ];
    const evidence = ["24:18 미드가 강가에 도착하기 전에 바론 체력이 절반 아래였습니다.", "23:52 라인을 정리하는 동안 별도의 합류 핑이 확인되지 않습니다.", "24:05 상대 정글 위치가 사라진 뒤에도 시야 확보 없이 진행했습니다."];
    return {
      id: index + 20,
      name: names[index % names.length],
      tier: tiers[index % tiers.length],
      text: texts[index % texts.length],
      evidence: evidence[index % evidence.length],
      vote: index % 3 === 0 ? "B" : "A" as VoteSide,
      likes: 97 - index * 3,
      replies: index % 4 === 0 ? [{ id: index + 200, name: "복기하는사람", tier: "다이아몬드 II", text: "이 부분은 저도 영상 다시 보니 같은 생각입니다. 핑이 조금만 빨랐으면 달라졌을 것 같아요.", vote: index % 3 === 0 ? "B" as VoteSide : "A" as VoteSide }] : [],
    };
  }),
];

const judgeNames = ["판결요정", "맵리딩중", "한타복기왕", "와드먼저", "천천히보자"];
const personalNames = ["핑찍고간다", "라인은밀었어", "바론은천천히", "와드두개", "한타만보자"];
const judgeTiers = ["챌린저 942P", "그랜드마스터 612P", "마스터 438P", "마스터 276P", "마스터 154P"];
const personalTiers = ["다이아몬드 II", "에메랄드 I", "플래티넘 I", "다이아몬드 IV", "골드 I", "에메랄드 III"];
const formatScore = (value: number) => value.toLocaleString("ko-KR");

const judgeRankingSeed = Array.from({ length: 100 }, (_, index) => {
  const participation = Math.max(22, 160 - Math.floor(index * .46));
  const recognition = Math.max(80, 4200 - index * 13);
  const sanctions = index > 0 && index % 97 === 0 ? 1 : 0;
  const points = participation * 5 + recognition - sanctions * 100;
  return [judgeNames[index] ?? `판결복기${String(index + 1).padStart(3, "0")}`, judgeTiers[index] ?? `마스터 ${Math.max(1, 150 - Math.floor(index / 3))}P`, `${participation}회`, `${formatScore(recognition)}개`, formatScore(points)];
}).sort((a, b) => Number(b[4].replaceAll(",", "")) - Number(a[4].replaceAll(",", "")));

const personalRankingSeed = Array.from({ length: 100 }, (_, index) => {
  const votes = Math.max(42, 720 - index * 2);
  const agreementRate = Math.max(52, 91 - Math.floor(index / 8));
  const matches = Math.floor(votes * agreementRate / 100);
  const empathy = Math.max(20, 1600 - index * 5);
  const sanctions = index > 0 && index % 83 === 0 ? 1 : 0;
  const points = votes * 5 + matches * 15 + empathy - sanctions * 20;
  return [personalNames[index] ?? `플레이복기${String(index + 1).padStart(3, "0")}`, personalTiers[index % personalTiers.length], `${votes} / ${matches}`, `${formatScore(empathy)}개`, formatScore(points)];
}).sort((a, b) => Number(b[4].replaceAll(",", "")) - Number(a[4].replaceAll(",", "")));

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("lolvs-local-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("videos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeVideo(file: File) {
  const db = await openVideoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("videos", "readwrite");
    transaction.objectStore("videos").put(file, VIDEO_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function loadStoredVideo(): Promise<Blob | null> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("videos", "readonly").objectStore("videos").get(VIDEO_KEY);
    request.onsuccess = () => { db.close(); resolve(request.result ?? null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M16 7H31V48H22L13 56L15 48C9 48 6 44 6 38V18C6 11 10 7 16 7Z" className="brand-bubble-blue" />
      <path d="M33 7H48C54 7 58 11 58 18V38C58 44 55 48 49 48L51 56L42 48H33Z" className="brand-bubble-orange" />
      <text x="19" y="40" className="brand-letter" fontFamily="Arial, Helvetica, sans-serif" fontSize="26" fontWeight="700" textAnchor="middle">V</text>
      <text x="45" y="40" className="brand-letter" fontFamily="Arial, Helvetica, sans-serif" fontSize="28" fontWeight="700" textAnchor="middle">S</text>
    </svg>
  );
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="logo" onClick={onClick} aria-label="LOL.VS 홈">
      <BrandMark className="logo-mark" />
      <span className="logo-word" aria-hidden="true">
        <span className="logo-lol">LOL</span><span className="logo-dot">.</span><span className="logo-v">V</span><span className="logo-s">S</span>
      </span>
    </button>
  );
}

function VerifiedBadge({ tier, demo = false, inline = false }: { tier: string; demo?: boolean; inline?: boolean }) {
  return <span className="verified-badge">{inline && <span className="meta-separator">·</span>}{tier}<span className="meta-separator">·</span>{demo ? "데모 인증" : "인증"}<span className="verify-dot">✓</span></span>;
}

function Header({ view, setView, user, onLogin, onProfile }: {
  view: View;
  setView: (view: View) => void;
  user: User | null;
  onLogin: () => void;
  onProfile: () => void;
}) {
  const menus: [View, string][] = [["home", "홈"], ["ranking", "랭킹"], ["guide", "가이드"]];
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo onClick={() => setView("home")} />
        <nav aria-label="주요 메뉴">
          {menus.map(([target, label]) => <button key={target} className={view === target ? "active" : ""} onClick={() => setView(target)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          {user ? (
            <button className="profile" onClick={onProfile} aria-label="내 프로필 열기">
              <span className="avatar">{user.nickname[0]}</span>
              <span className="profile-copy desktop-only"><strong>{user.nickname}</strong><small>{user.tier} · 데모 인증</small></span>
              <span className="chevron">⌄</span>
            </button>
          ) : <button className="login-button" onClick={onLogin}>로그인</button>}
        </div>
      </div>
    </header>
  );
}

function VoteBar({ a, b, compact = false }: { a: number; b: number; compact?: boolean }) {
  return <div className={compact ? "vote-summary compact" : "vote-summary"} aria-label={`A ${a}%, B ${b}%`}><div className="bar"><span className="bar-a" style={{ width: `${a}%` }} /><span className="bar-b" style={{ width: `${b}%` }} /></div><div className="vote-labels"><b>A {a}%</b><b>B {b}%</b></div></div>;
}

function OpinionBadge({ side }: { side?: VoteSide }) {
  return side ? <span className={`comment-vote vote-${side.toLowerCase()}`}>{side} 의견</span> : null;
}

function Home({ openDetail, localCase, localVideoUrl, onSubmit, onSearch }: { openDetail: (local?: boolean, title?: string) => void; localCase: LocalCase | null; localVideoUrl: string; onSubmit: () => void; onSearch: (query: string) => void }) {
  const [category, setCategory] = useState("전체");
  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [popularCycle, setPopularCycle] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setPopularCycle((cycle) => cycle + 1), 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  const filtered = compactCases.filter((item) => (category === "전체" || item.category === category) && Boolean(resolvedVerdicts[item.title]) === showResolved);
  const casesPerPage = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / casesPerPage));
  const pageItems = filtered.slice((page - 1) * casesPerPage, page * casesPerPage);
  const popularPosts = popularCycle % 2 === 0 ? weeklyPosts : [weeklyPosts[2], weeklyPosts[0], weeklyPosts[1], weeklyPosts[4], weeklyPosts[3]];
  const showLocal = !showResolved && localCase && (category === "전체" || localCase.category === category);
  return (
    <main className="page-shell home-layout">
      <section className="feed-column">
        <div className="home-title-row compact-title"><div className="home-brand-copy"><h1><b>억울한 장면,</b><em>함께 판결합니다</em></h1><p>티어가 인증된 플레이어의 투표와 근거 있는 피드백을 확인해 보세요.</p></div><div className="home-primary-actions"><form className="home-search" onSubmit={(event) => { event.preventDefault(); if (searchText.trim()) onSearch(searchText.trim()); }}><span>⌕</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="사건 검색" aria-label="사건 검색" /><button type="submit">검색</button></form><button className="home-write-button" onClick={onSubmit}><span>＋</span> 글쓰기</button></div></div>
        <div className="toolbar">
          <div className="category-tabs" role="tablist" aria-label="게임 유형">
            {["전체", "솔로랭크", "파티랭크", "내전"].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => { setCategory(item); setPage(1); }}>{item}</button>)}
          </div>
          <button className={showResolved ? "resolved-filter active" : "resolved-filter"} onClick={() => { setShowResolved((value) => !value); setPage(1); }}><span>{showResolved ? "◷" : "✓"}</span>{showResolved ? "진행 중 보기" : "판결 완료 보기"}</button>
        </div>

        {showLocal && (
          <button className="uploaded-case-banner" onClick={() => openDetail(true, localCase.title)}>
            <span className="uploaded-thumb">{localVideoUrl ? <video src={localVideoUrl} muted /> : <span>▶</span>}</span>
            <span><small>방금 등록한 사건 · {localCase.category}</small><strong>{localCase.title}</strong><em>{localCase.author} · {localCase.tier} 데모 인증</em></span>
            <b>판결 보기 →</b>
          </button>
        )}

        <div className="case-board-heading"><div><h2>{showResolved ? "판결 완료된 사건" : "진행 중인 사건"}</h2><span>{filtered.length}개의 판결</span></div></div>
        <div className="case-list board-style">
          {pageItems.map((item) => { const resolved = resolvedVerdicts[item.title]; return (
            <button className={resolved ? "case-row case-resolved" : "case-row"} key={item.title} onClick={() => openDetail(false, item.title)}>
              <span className="thumb"><img src={item.image} alt="" /><i>▶</i><small>{item.clip}</small>{resolved && <b className="resolved-stamp">판결 완료</b>}</span>
              <span className="case-copy"><strong>{item.title}</strong><span className="author-line">{item.author}<VerifiedBadge tier={item.tier} inline /></span><small>{item.category} · {item.meta}{resolved ? ` · ${resolved.side}측 잘못` : ""}</small></span>
              <span className="case-status">
                <span className="row-votes"><small className={resolved ? "resolved-time" : ""}>{resolved ? "판결 완료" : item.time}</small><VoteBar a={item.a} b={item.b} compact /></span>
                <span className="case-engagement"><span><i className="like-icon" aria-hidden="true">♥</i><em>좋아요</em><b>{item.likes}</b></span><span><i className="comment-icon" aria-hidden="true" /><em>댓글</em><b>{item.comments}</b></span></span>
              </span>
            </button>
          ); })}
          {!filtered.length && !showLocal && <div className="empty-state">이 카테고리의 사건을 준비하고 있습니다.</div>}
        </div>
        {pageCount > 1 && <nav className="pagination" aria-label="사건 목록 페이지">{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} className={page === number ? "active" : ""} onClick={() => { setPage(number); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{number}</button>)}</nav>}
      </section>

      <aside className="right-rail">
        <section className="rail-card hot-card"><div className="hot-card-head"><h2><i className="live-dot" /><span>실시간</span> 인기 글</h2></div><ol>{popularPosts.map((post, index) => <li key={post.title}><button onClick={() => openDetail(false, post.title)}><span className={index < 3 ? "rank hot" : "rank"}>{index + 1}</span><img src={asset(index === 0 ? "/media/gameplay-detail.png" : "/media/gameplay-feed.png")} alt="" /><span className="hot-copy"><strong>{post.title}</strong><small>{post.meta}</small></span><em className={`trend-${post.trend}`}>{post.trend === "up" ? "▲" : post.trend === "down" ? "▼" : "—"} {post.delta || ""}</em></button></li>)}</ol></section>
        <section className="rail-card tier-card"><div className="tier-card-head"><div><h2><b>인증 티어</b><em>분포</em></h2><p>의견 참여자 기준</p></div><b>12,480명</b></div><div className="tier-bar" aria-label="인증 티어 참여자 분포"><span /><span /><span /><span /><span /></div><div className="tier-labels"><span>12%<small>아이언–골드</small></span><span>28%<small>플래티넘</small></span><span>31%<small>에메랄드</small></span><span>19%<small>다이아</small></span><span>8%<small>마스터+</small></span></div><div className="tier-summary"><i>✓</i><span>인증 사용자의 의견 참여만 집계합니다</span></div></section>
        <section className="rail-card principles brand-principles"><div className="principles-head"><span><BrandMark className="principles-mark" /></span><div><h2><b>좋은 판결은</b><em>이렇게 만듭니다</em></h2></div></div><div className="principle-list"><article><b>01</b><span><strong>장면을 정확히</strong><small>타임스탬프와 플레이 상황을 함께 봅니다.</small></span></article><article><b>02</b><span><strong>감정보다 근거를</strong><small>잘잘못과 다음 선택을 구분해 말합니다.</small></span></article><article><b>03</b><span><strong>사람보다 플레이를</strong><small>공격 대신 개선할 수 있는 의견을 남깁니다.</small></span></article></div><div className="principles-sign"><i /><span>판결은 선명하게, 피드백은 따뜻하게.</span><i /></div></section>
      </aside>
    </main>
  );
}

function Detail({ toast, user, requireLogin, localCase, localVideoUrl, viewingLocal, selectedTitle }: {
  toast: (message: string) => void;
  user: User | null;
  requireLogin: () => void;
  localCase: LocalCase | null;
  localVideoUrl: string;
  viewingLocal: boolean;
  selectedTitle: string;
}) {
  const [vote, setVote] = useState<VoteSide | null>(null);
  const [officialVerdict, setOfficialVerdict] = useState<VoteSide | null>(null);
  const [feedback, setFeedback] = useState("");
  const [evidence, setEvidence] = useState("");
  const [comments, setComments] = useState(commentsSeed);
  const [likedComments, setLikedComments] = useState<number[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);
  const [replyText, setReplyText] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [composerOpen, setComposerOpen] = useState(false);
  const [recognizedVerdict, setRecognizedVerdict] = useState(false);
  const [recognitionCount, setRecognitionCount] = useState(0);
  const [pendingVote, setPendingVote] = useState<VoteSide | null>(null);
  const [judgeModalOpen, setJudgeModalOpen] = useState(false);
  const result = vote === "A" ? { a: 59, b: 41 } : vote === "B" ? { a: 57, b: 43 } : { a: 58, b: 42 };
  const title = viewingLocal && localCase ? localCase.title : selectedTitle;
  const resolvedVerdict = viewingLocal ? undefined : resolvedVerdicts[title];
  const aClaim = viewingLocal && localCase ? localCase.aClaim : "미드가 바론 시야를 확보하지 않고 라인을 밀다가 합류했습니다. 미드의 지도 관리 소홀과 합류 지연이 원인입니다.";
  const bClaim = viewingLocal && localCase ? localCase.bClaim : "정글이 바론 핑을 찍지 않았고, 미드가 라인을 밀 수밖에 없는 상황이었습니다. 팀 전체의 판단 실수가 더 큽니다.";
  const author = viewingLocal && localCase ? localCase.author : "한타는팀운";
  const tier = viewingLocal && localCase ? localCase.tier : "다이아몬드 IV";
  const videoSrc = viewingLocal && localVideoUrl ? localVideoUrl : asset("/media/demo.mp4");
  const voteStorageKey = user ? `lolvs-vote:${user.nickname}:${title}` : "";
  const verdictStorageKey = user ? `lolvs-verdict:${user.nickname}:${title}` : "";
  const recognitionStorageKey = user && resolvedVerdict ? `lolvs-recognition:${user.nickname}:${title}` : "";
  const diamondCase = tier.includes("다이아몬드");
  const judgeRequirement = diamondCase ? "그랜드마스터" : "마스터";
  const canJudge = Boolean(user && tierLevel(user.tier) >= (diamondCase ? 8 : 7));
  const commentTotal = 125 + Math.max(0, comments.length - commentsSeed.length);
  const commentPageCount = Math.max(1, Math.ceil(comments.length / 5));
  const visibleComments = comments.slice((commentPage - 1) * 5, commentPage * 5);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVote(null);
      setOfficialVerdict(null);
      if (!voteStorageKey) return;
      const savedVote = localStorage.getItem(voteStorageKey) as VoteSide | null;
      const savedVerdict = localStorage.getItem(verdictStorageKey) as VoteSide | null;
      if (savedVote === "A" || savedVote === "B") setVote(savedVote);
      if (savedVerdict === "A" || savedVerdict === "B") setOfficialVerdict(savedVerdict);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [voteStorageKey, verdictStorageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecognitionCount(resolvedVerdict?.recognitions ?? 0);
      setRecognizedVerdict(Boolean(recognitionStorageKey && localStorage.getItem(recognitionStorageKey) === "true"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recognitionStorageKey, resolvedVerdict]);

  const requestOpinionVote = (side: VoteSide) => {
    if (!user) return requireLogin();
    if (vote) return toast("의견 투표는 한 번만 가능하며 변경할 수 없습니다.");
    setPendingVote(side);
  };

  const submitOpinionVote = (side: VoteSide) => {
    setVote(side);
    localStorage.setItem(voteStorageKey, side);
    setPendingVote(null);
    toast(`${side}측 잘못으로 의견 투표했습니다.`);
  };

  const submitOfficialVerdict = (side: VoteSide, reason: string) => {
    if (!user) return requireLogin();
    if (!canJudge) return toast(`${diamondCase ? "다이아몬드 사건은" : "공식 판결은"} ${judgeRequirement} 이상부터 가능합니다.`);
    if (officialVerdict) return toast("공식 판결은 등록 후 변경할 수 없습니다.");
    setOfficialVerdict(side);
    localStorage.setItem(verdictStorageKey, side);
    localStorage.setItem(`${verdictStorageKey}:reason`, reason);
    setJudgeModalOpen(false);
    toast(`${side}측 잘못으로 공식 판결과 근거를 등록했습니다.`);
  };

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return requireLogin();
    if (!feedback.trim() || !evidence.trim()) return toast("피드백과 판단 근거를 함께 적어주세요.");
    const item: CommentItem = { id: Date.now(), name: user.nickname, tier: user.tier, text: feedback.trim(), evidence: evidence.trim(), vote: vote ?? undefined, likes: 0, replies: [] };
    setComments([item, ...comments]);
    setCommentPage(1);
    setComposerOpen(false);
    setFeedback("");
    setEvidence("");
    toast("댓글과 판단 근거를 등록했습니다.");
  };

  const addReply = (commentId: number) => {
    if (!user) return requireLogin();
    if (!replyText.trim()) return;
    setComments(comments.map((comment) => comment.id === commentId ? { ...comment, replies: [...comment.replies, { id: Date.now(), name: user.nickname, tier: user.tier, text: replyText.trim(), vote: vote ?? undefined }] } : comment));
    setExpandedReplies((ids) => ids.includes(commentId) ? ids : [...ids, commentId]);
    setReplyText("");
    setReplyingTo(null);
    toast("대댓글을 등록했습니다.");
  };

  const requestReport = (target: string) => {
    if (!user) return requireLogin();
    setReportTarget(target);
  };

  const likeComment = (commentId: number) => {
    if (!user) return requireLogin();
    if (likedComments.includes(commentId)) return toast("이미 좋아요를 눌렀습니다.");
    setComments(comments.map((comment) => comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment));
    setLikedComments([...likedComments, commentId]);
  };

  const recognizeOfficialVerdict = () => {
    if (!user) return requireLogin();
    if (!resolvedVerdict) return;
    if (recognizedVerdict) return toast("이미 이 판결을 인정했습니다.");
    setRecognizedVerdict(true);
    setRecognitionCount((count) => count + 1);
    localStorage.setItem(recognitionStorageKey, "true");
    toast(`${resolvedVerdict.judge} 판결자의 근거를 인정했습니다.`);
  };

  const activityVoteFor = (name: string, savedVote?: VoteSide) => name === user?.nickname && vote ? vote : savedVote;
  const toggleReplies = (commentId: number) => setExpandedReplies((ids) => ids.includes(commentId) ? ids.filter((id) => id !== commentId) : [...ids, commentId]);

  return (
    <main className="page-shell detail-layout">
      <section className="detail-main">
        <div className="detail-title-row"><div className="detail-title">{resolvedVerdict && <span className="detail-resolved-badge">판결 완료 · {resolvedVerdict.side}측 잘못</span>}<h1>{title}</h1></div><div className="detail-title-actions"><button className="inline-report" onClick={() => requestReport("게시물")}>⚑ 게시물 신고</button>{canJudge && !resolvedVerdict && <button className={officialVerdict ? "judge-jump-button submitted" : "judge-jump-button"} disabled={Boolean(officialVerdict)} onClick={() => setJudgeModalOpen(true)}>{officialVerdict ? "판결 제출 완료" : "판결하기"}</button>}</div></div>
        <div className="detail-post-meta"><div className="author"><span className="avatar small">{author[0]}</span><span className="post-author-copy"><small>작성자</small><strong>{author}</strong></span><VerifiedBadge tier={tier} demo={viewingLocal} inline /></div><span className="post-view-count">조회수 <b>3,842</b></span></div>
        <div className="video-card real-video"><video src={videoSrc} controls playsInline poster={viewingLocal ? undefined : asset("/media/gameplay-detail.png")}>브라우저가 영상을 지원하지 않습니다.</video></div>
        {resolvedVerdict && <section className={`inline-resolved-verdict verdict-${resolvedVerdict.side.toLowerCase()}`}><header><div><span>공식 판결</span><h2><b>{resolvedVerdict.side}측 잘못</b>으로 판결했습니다.</h2></div><time>{resolvedVerdict.decidedAt}</time></header><div className="inline-verdict-body"><div className="inline-verdict-judge"><span>{resolvedVerdict.judge[0]}</span><div><small>판결자</small><strong>{resolvedVerdict.judge}</strong><em>{resolvedVerdict.judgeTier} · 인증</em></div></div><blockquote><b>판결 근거</b><p>{resolvedVerdict.reason}</p></blockquote><button className={recognizedVerdict ? "recognition-button recognized" : "recognition-button"} onClick={recognizeOfficialVerdict}><span>{recognizedVerdict ? "♥" : "♡"}</span><b>{recognizedVerdict ? "이 판결을 인정했습니다" : "이 판결 인정"}</b><em>{recognitionCount.toLocaleString("ko-KR")}</em></button></div></section>}

        <section className="comments-section">
          <div className="comments-heading"><div><h2>댓글 <b>{commentTotal}</b></h2><span>모든 인증 사용자 참여 · 의견 투표 시 선택 공개</span></div><button onClick={() => { if (!user) requireLogin(); else setComposerOpen(!composerOpen); }}>{composerOpen ? "닫기" : "댓글 쓰기"}</button></div>
          {composerOpen && user && <form className="comment-composer compact-composer" onSubmit={addComment}><div className="comment-fields"><input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="판단 근거 또는 타임스탬프" aria-label="판단 근거" /><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="댓글을 입력하세요." aria-label="댓글 작성" /></div><button className="compact-comment-submit" type="submit">등록</button></form>}
          {visibleComments.map((item, index) => (
            <article className="comment parent-comment" key={item.id}>
              <span className="comment-avatar">{item.name[0]}</span>
              <div>
                <div className="comment-meta"><strong>{item.name}</strong><VerifiedBadge tier={item.tier} demo={item.name === user?.nickname} inline /><OpinionBadge side={activityVoteFor(item.name, item.vote)} /><small>{(commentPage - 1) * 5 + index + 1}시간 전</small></div>
                <p>{item.text}</p>{item.evidence && <blockquote><b>판단 근거</b>{item.evidence}</blockquote>}
                <div className="comment-actions"><button className={likedComments.includes(item.id) ? "liked" : ""} onClick={() => likeComment(item.id)}>{likedComments.includes(item.id) ? "♥" : "♡"} {item.likes}</button>{item.replies.length > 0 && <button className="reply-toggle" onClick={() => toggleReplies(item.id)}>{expandedReplies.includes(item.id) ? "답글 접기" : `답글 ${item.replies.length}개 보기`}</button>}<button onClick={() => { if (!user) return requireLogin(); setReplyingTo(replyingTo === item.id ? null : item.id); setExpandedReplies((ids) => ids.includes(item.id) ? ids : [...ids, item.id]); }}>답글 달기</button><button className="comment-report" onClick={() => requestReport(`${item.name}님의 댓글`)}>신고</button></div>
                {expandedReplies.includes(item.id) && item.replies.map((reply) => <div className="reply" key={reply.id}><span className="reply-arrow">↳</span><span className="comment-avatar">{reply.name[0]}</span><div className="reply-body"><div className="reply-head"><span><em>답글</em><strong>{reply.name}</strong><VerifiedBadge tier={reply.tier} demo={reply.name === user?.nickname} inline /><OpinionBadge side={activityVoteFor(reply.name, reply.vote)} /></span><button className="reply-report" onClick={() => requestReport(`${reply.name}님의 대댓글`)}>신고</button></div><p>{reply.text}</p></div></div>)}
                {replyingTo === item.id && <div className="reply-form"><input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`${item.name}님에게 답글 남기기`} aria-label="대댓글 작성" /><button onClick={() => addReply(item.id)}>등록</button></div>}
              </div>
            </article>
          ))}
        </section>
        <nav className="comment-pagination standalone-comment-pagination" aria-label="댓글 페이지">{Array.from({ length: commentPageCount }, (_, index) => index + 1).map((number) => <button key={number} className={commentPage === number ? "active" : ""} onClick={() => setCommentPage(number)}>{number}</button>)}</nav>
      </section>

      <aside className="vote-rail">
        {resolvedVerdict ? <section className="vote-card resolved-opinion-card"><div className="deadline resolved-deadline">투표 마감 · 최종 의견</div><div className="vote-body current-result"><h2>커뮤니티 투표 결과</h2><VoteBar a={result.a} b={result.b} /><p className="closed-vote-note">총 1,313명 참여 · 투표가 종료되었습니다.</p></div></section> : <section className="vote-card"><div className="deadline">◷ 마감까지 <strong>2일 14시간</strong></div><div className="vote-body current-result"><h2>의견 투표</h2><VoteBar a={result.a} b={result.b} /><div className="opinion-vote-buttons"><button className={vote === "A" ? "a chosen" : "a"} onClick={() => requestOpinionVote("A")}>A 잘못</button><button className={vote === "B" ? "b chosen" : "b"} onClick={() => requestOpinionVote("B")}>B 잘못</button></div><p className="vote-hint">티어와 관계없이 모든 인증 사용자가 한 번씩 참여할 수 있습니다.</p>{vote && <p className="my-vote">내 의견: <b>{vote} 잘못</b></p>}</div></section>}
        <section className="positions-card"><header><div><h2>양측 주장</h2><p>게시물 작성자가 정리한 입장입니다.</p></div><span><b>A</b><i>VS</i><em>B</em></span></header><article className="position-item position-a"><div className="position-label"><b>A</b><strong>A측 주장</strong></div><p>{aClaim}</p></article><div className="position-divider"><span>VS</span></div><article className="position-item position-b"><div className="position-label"><b>B</b><strong>B측 주장</strong></div><p>{bClaim}</p></article></section>
        <section className="guide-card"><h2>참여 가이드</h2><ul><li>의견 투표와 댓글은 모든 인증 사용자가 참여합니다.</li><li>공식 판결은 마스터 이상, 다이아 사건은 그랜드마스터 이상만 가능합니다.</li><li>비난보다 다음 플레이에 도움 되는 근거를 남겨 주세요.</li></ul></section>
      </aside>
      {reportTarget && <ReportModal target={reportTarget} close={() => setReportTarget(null)} onSubmit={(reason) => { const target = reportTarget; setReportTarget(null); toast(`${target} 신고가 접수되었습니다: ${reason}`); }} />}
      {pendingVote && <VoteConfirmModal side={pendingVote} close={() => setPendingVote(null)} confirm={() => submitOpinionVote(pendingVote)} />}
      {judgeModalOpen && <JudgeVerdictModal close={() => setJudgeModalOpen(false)} requirement={judgeRequirement} submit={submitOfficialVerdict} />}
    </main>
  );
}

function Ranking({ user }: { user: User | null }) {
  const [mode, setMode] = useState<"personal" | "judge">("personal");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [rankingPage, setRankingPage] = useState(1);
  const ranking = mode === "personal" ? personalRankingSeed : judgeRankingSeed;
  const rankingPageSize = 20;
  const rankingPageCount = Math.ceil(ranking.length / rankingPageSize);
  const visibleRanking = ranking.slice((rankingPage - 1) * rankingPageSize, rankingPage * rankingPageSize);
  const candidates = ranking.map((row, index) => ({ rank: index + 1, name: row[0], tier: row[1], metricA: row[2], metricB: row[3], points: row[4] }));
  const currentRank = user
    ? mode === "personal"
      ? { rank: 76, name: user.nickname, tier: user.tier, metricA: "570 / 467", metricB: "1,225개", points: "11,080" }
      : isMasterPlus(user.tier)
        ? { rank: 88, name: user.nickname, tier: user.tier, metricA: "120회", metricB: "3,069개", points: "3,669" }
        : null
    : null;
  const userIsTopFive = user ? ranking.some((row) => row[0].toLowerCase() === user.nickname.toLowerCase()) : false;
  if (currentRank && !userIsTopFive) candidates.push(currentRank);
  const match = searched ? candidates.find((item) => item.name.toLowerCase() === query.trim().toLowerCase()) : undefined;
  const changeMode = (nextMode: "personal" | "judge") => { setMode(nextMode); setSearched(false); setQuery(""); setRankingPage(1); };
  return (
    <main className="page-shell section-page ranking-page">
      <div className="ranking-switch" role="tablist" aria-label="랭킹 종류">
        <span className="ranking-switch-label">랭킹 보기</span>
        <div>
          <button className={mode === "personal" ? "active personal" : "personal"} data-tooltip="투표 참여 · 최종 합의 · 근거 공감" aria-label="개인 랭킹: 투표 참여, 최종 합의, 근거 공감 기준" onClick={() => changeMode("personal")}><b>개인 랭킹</b></button>
          <button className={mode === "judge" ? "active judge" : "judge"} data-tooltip="공식 판결 · 판결 근거 인정" aria-label="판결자 랭킹: 공식 판결, 판결 근거 인정 기준" onClick={() => changeMode("judge")}><b>판결자 랭킹</b></button>
        </div>
      </div>
      <form className="rank-search" onSubmit={(event) => { event.preventDefault(); setSearched(Boolean(query.trim())); }}>
        <div><strong>{mode === "personal" ? "플레이어 검색" : "판결자 검색"}</strong><span>{mode === "personal" ? "투표와 근거 활동 순위를 찾아보세요." : "공식 판결과 인정 점수를 찾아보세요."}</span></div>
        <label><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} placeholder="닉네임 입력" aria-label="랭킹 닉네임 검색" /></label><button type="submit">검색</button>
      </form>
      {searched && (match ? <section className="rank-result"><b>{match.rank}위</b><span className="avatar">{match.name[0]}</span><div><strong>{match.name} · {match.points}P</strong><small>{match.tier} · {mode === "personal" ? `투표 / 합의 ${match.metricA}` : `받은 인정 ${match.metricB}`}</small></div><em>{match.rank <= 5 ? "TOP 5" : "상위 31%"}</em></section> : <div className="rank-empty">일치하는 사용자를 찾지 못했습니다. 닉네임을 다시 확인해 주세요.</div>)}
      {mode === "personal" ? <section className="score-rules personal-score-rules"><div><b>+5</b><span>의견 투표 참여</span></div><div><b>+15</b><span>최종 합의와 일치</span></div><div><b>+1</b><span>판단 근거 공감</span></div><div><b>-20</b><span>신고 제재 확정</span></div></section> : <section className="score-rules judge-score-rules"><div><b>+5</b><span>공식 판결 참여</span></div><div><b>+1</b><span>판결·근거 인정</span></div><div><b>-100</b><span>신고 제재 확정</span></div><div><b>OUT</b><span>누적 -100점<br />자격 박탈 · 판결 금지</span></div></section>}
      <section className="ranking-card elite-ranking">
        <div className="ranking-head"><span>순위</span><span>{mode === "personal" ? "플레이어" : "판결자"}</span><span>{mode === "personal" ? "투표 / 합의" : "판결 참여"}</span><span>{mode === "personal" ? "근거 공감" : "받은 인정"}</span><span>점수</span></div>
        {visibleRanking.map((row, index) => { const rank = (rankingPage - 1) * rankingPageSize + index + 1; return <div className={rank <= 3 ? `ranking-row podium rank-${rank}` : "ranking-row"} key={row[0]}><b className="rank-number"><span>{["1ST", "2ND", "3RD"][rank - 1] ?? ""}</span>{rank}</b><span className="rank-player"><strong>{row[0]}</strong><small>{row[1]} · {mode === "personal" ? "인증" : "판결 자격"}</small></span><span>{row[2]}</span><span>{row[3]}</span><strong>{row[4]}P</strong></div>; })}
        {currentRank && !userIsTopFive && <><div className="ranking-divider"><span>내 순위</span></div><div className="ranking-row current-rank-row"><b className="rank-number">{currentRank.rank}</b><span className="rank-player"><strong>{currentRank.name}</strong><small>{currentRank.tier} · 데모 인증</small></span><span>{currentRank.metricA}</span><span>{currentRank.metricB}</span><strong>{currentRank.points}P</strong></div></>}
        {!user && <div className="rank-login-note">로그인하면 내 순위를 바로 확인할 수 있습니다.</div>}
        {mode === "judge" && user && !isMasterPlus(user.tier) && <div className="rank-login-note">마스터 이상부터 공식 판결자 랭킹에 등록됩니다.</div>}
      </section>
      <nav className="ranking-pagination" aria-label="랭킹 페이지">{Array.from({ length: rankingPageCount }, (_, index) => index + 1).map((number) => <button key={number} className={rankingPage === number ? "active" : ""} onClick={() => { setRankingPage(number); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{number}</button>)}</nav>
    </main>
  );
}

function Guide() {
  return <main className="page-shell section-page guide-page">
    <section className="guide-intro"><span>처음 오셨나요?</span><h1><b>억울함을 풀고,</b><em>다음 플레이는 더 선명하게.</em></h1><p>짧은 장면을 함께 보고 더 나은 선택을 찾습니다.</p></section>
    <section className="guide-section usage-guide"><div className="guide-section-heading"><span>사용 순서</span><h2><b>장면에서</b><em>판결까지</em></h2></div><div className="usage-steps"><article><b>01</b><div><strong>장면 확인</strong><small>영상과 양측 입장</small></div></article><article><b>02</b><div><strong>의견 투표</strong><small>A/B 한 번 선택</small></div></article><article><b>03</b><div><strong>근거 댓글</strong><small>타임스탬프와 피드백</small></div></article><article><b>04</b><div><strong>결과 확인</strong><small>의견과 공식 판결 비교</small></div></article></div></section>
    <section className="guide-section policy-board"><div className="guide-section-heading"><span>참여 권한</span><h2><b>누가 무엇을</b><em>할 수 있나요?</em></h2></div><div className="policy-cards"><article className="policy-opinion"><span className="policy-token">01</span><div><h3>의견 투표 · 댓글</h3><p>A/B 선택과 근거 피드백</p></div><strong>모든 인증 사용자</strong></article><article className="policy-verdict"><span className="policy-token">02</span><div><h3>공식 판결</h3><p>다이아 사건은 그랜드마스터 이상</p></div><strong>마스터 이상</strong></article><article className="policy-submit"><span className="policy-token">03</span><div><h3>사건 작성</h3><p>영상과 양측 입장 등록</p></div><strong>다이아 이하</strong></article></div></section>
    <section className="guide-privacy"><span className="privacy-shield">✓</span><div><small>티어는 인증하고, 활동은 자유롭게</small><h2>Riot ID 대신 사이트 닉네임으로 참여합니다.</h2><p>실제 계정과 티어는 인증에만 사용하고 게시글·투표·댓글에는 선택한 활동 닉네임이 표시됩니다.</p></div></section>
    <div className="guide-grid"><section className="guide-panel accent-teal"><span className="guide-icon">✓</span><h2>사건 제보 체크리스트</h2><ul><li>핵심 장면이 보이는 짧은 영상</li><li>공정하게 정리한 A측·B측 입장</li><li>Riot ID와 개인정보 가림 처리</li></ul></section><section className="guide-panel accent-coral"><span className="guide-icon">VS</span><h2>좋은 판결의 기준</h2><ul><li>결과보다 당시 보였던 정보를 확인합니다.</li><li>사람이 아니라 플레이를 평가합니다.</li><li>다음 선택에 도움이 되는 근거를 남깁니다.</li></ul></section></div>
    <section className="faq"><h2>서비스 안내</h2><details open><summary>티어는 정말 인증되나요?</summary><p>현재 공개 버전은 Riot API 연결 전이라 사용자가 선택한 티어를 ‘데모 인증’으로 표시합니다. 실제 서비스에서는 Riot 인증 결과로 권한을 결정할 예정입니다.</p></details><details><summary>업로드한 영상은 어디에 저장되나요?</summary><p>현재 프로토타입에서는 선택한 기기의 브라우저에만 저장됩니다. 서버 업로드는 백엔드 연결 후 제공됩니다.</p></details></section>
  </main>;
}

function SearchResults({ query, openDetail, localCase }: { query: string; openDetail: (local?: boolean, title?: string) => void; localCase: LocalCase | null }) {
  const keyword = query.toLowerCase();
  const cases = [
    ...(localCase ? [{ title: localCase.title, category: localCase.category, local: true }] : []),
    ...compactCases.map((item) => ({ title: item.title, category: item.category, local: false })),
    ...weeklyPosts.map(({ title }) => ({ title, category: "실시간 인기", local: false })),
  ].filter((item, index, array) => item.title.toLowerCase().includes(keyword) && array.findIndex((other) => other.title === item.title) === index);
  return <main className="page-shell section-page search-page"><div className="search-heading"><span>사건 검색</span><h1>“{query}” 검색 결과</h1><p>진행 중인 사건과 실시간 인기 판결에서 찾았습니다.</p></div><section className="search-result-section"><div><h2>사건</h2><b>{cases.length}</b></div>{cases.length ? <div className="search-result-list">{cases.map((item) => <button key={item.title} onClick={() => openDetail(item.local, item.title)}><span>판결</span><strong>{item.title}</strong><small>{item.category} · 사건 열기 →</small></button>)}</div> : <p className="search-none">일치하는 사건이 없습니다.</p>}</section></main>;
}

function SubmitCase({ setView, toast, user, onSubmitted }: { setView: (view: View) => void; toast: (message: string) => void; user: User; onSubmitted: (item: LocalCase, url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("video/")) return toast("영상 파일만 선택할 수 있습니다.");
    if (selected.size > 200 * 1024 * 1024) return toast("현재 데모에서는 200MB 이하 영상을 선택해 주세요.");
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isMasterPlus(user.tier)) return toast("마스터 이상은 공식 판결자 역할로 참여하며 사건을 작성할 수 없습니다.");
    if (!file) return toast("실제 영상 파일을 선택해 주세요.");
    const form = new FormData(event.currentTarget);
    const item: LocalCase = { title: String(form.get("title")), category: String(form.get("category")), aClaim: String(form.get("aClaim")), bClaim: String(form.get("bClaim")), author: user.nickname, tier: user.tier };
    setSaving(true);
    try { await storeVideo(file); localStorage.setItem(CASE_KEY, JSON.stringify(item)); onSubmitted(item, preview); toast("영상과 사건이 이 브라우저에 저장되었습니다."); setView("home"); } catch { toast("영상을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); } finally { setSaving(false); }
  };
  return <main className="submit-page page-shell"><button className="back-link" onClick={() => setView("home")}>← 홈으로</button><div className="submit-heading"><h1>억울했던 장면을 제보해 주세요</h1><p>선택한 영상은 현재 기기의 브라우저에 저장되며 바로 재생해 볼 수 있습니다.</p></div><form className="submit-form" onSubmit={submit}><section><label>1. 영상 업로드</label><input ref={inputRef} className="sr-only" type="file" accept="video/*" onChange={chooseFile} />{preview ? <div className="upload-preview"><video src={preview} controls /><button type="button" onClick={() => inputRef.current?.click()}>영상 다시 선택</button></div> : <button type="button" className="upload-box" onClick={() => inputRef.current?.click()}><span>↥</span><strong>내 기기에서 실제 영상 선택</strong><small>MP4, WebM 등 · 200MB 이하 권장</small></button>}</section><section><label htmlFor="case-title">2. 사건 제목</label><input id="case-title" name="title" required placeholder="예: 바론 스틸 시도, 미드가 잘못한 걸까요?" /></section><section><label htmlFor="case-category">3. 게임 카테고리</label><select id="case-category" name="category" defaultValue="솔로랭크"><option>솔로랭크</option><option>파티랭크</option><option>내전</option></select></section><div className="form-split"><section><label htmlFor="a-claim">4. A측 주장</label><textarea id="a-claim" name="aClaim" required placeholder="A측이 억울한 이유를 적어주세요." /></section><section><label htmlFor="b-claim">5. B측 입장</label><textarea id="b-claim" name="bClaim" required placeholder="B측은 이 상황을 어떻게 봤을까요?" /></section></div><section><label>6. 판결 기간</label><div className="duration"><label><input type="radio" name="duration" value="1" />1일</label><label><input type="radio" name="duration" value="3" defaultChecked />3일</label><label><input type="radio" name="duration" value="7" />7일</label></div></section><div className="submit-notice"><span>ⓘ</span><p><strong>기기 로컬 저장 데모입니다.</strong><br />서버와 Riot API 연결 전이라 다른 사용자에게 공유되지는 않습니다.</p></div><button type="submit" className="primary-button full" disabled={saving}>{saving ? "영상 저장 중…" : "사건 등록하기"}</button></form></main>;
}

function LoginModal({ close, onLogin }: { close: () => void; onLogin: (user: User) => void }) {
  const [nickname, setNickname] = useState("");
  const [tier, setTier] = useState("챌린저");
  const submit = (event: FormEvent) => { event.preventDefault(); if (nickname.trim().length < 2) return; onLogin({ nickname: nickname.trim(), tier }); };
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal login-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="profile-emblem">VS</span><h2 id="login-title">데모 로그인</h2><p>Riot API 연결 전까지 활동 닉네임과 티어를 직접 선택합니다.</p><label>사이트 활동 닉네임<input value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={12} required placeholder="2~12자" autoFocus /></label><label>현재 티어<select value={tier} onChange={(event) => setTier(event.target.value)}>{["아이언 I", "브론즈 I", "실버 I", "골드 IV", "플래티넘 IV", "에메랄드 IV", "다이아몬드 IV", "마스터", "그랜드마스터", "챌린저"].map((item) => <option key={item}>{item}</option>)}</select></label><div className="demo-warning">선택한 티어는 실제 Riot 인증이 아닌 <b>데모 인증</b>으로 표시됩니다.</div><button className="primary-button full" type="submit">이 정보로 로그인</button></form></div>;
}

function ProfileModal({ user, close, logout }: { user: User; close: () => void; logout: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="profile-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className="modal-close" onClick={close} aria-label="닫기">×</button><span className="profile-emblem">{user.nickname[0]}</span><h2 id="profile-title">{user.nickname}</h2><VerifiedBadge tier={user.tier} demo /><p>이 브라우저에 저장된 데모 프로필입니다.<br />실제 Riot ID는 연결하지 않았습니다.</p><button className="secondary-button full" onClick={logout}>로그아웃</button></section></div>;
}

function ReportModal({ target, close, onSubmit }: { target: string; close: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("욕설 또는 인신공격");
  const [details, setDetails] = useState("");
  const type = target === "게시물" ? "게시물" : "댓글";
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal report-modal" onSubmit={(event) => { event.preventDefault(); if (details.trim()) onSubmit(`${reason} · ${details.trim()}`); }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="profile-emblem report-icon">!</span><h2 id="report-title">{type} 신고하기</h2><p><strong>{target}</strong><br />사유를 선택하고 구체적인 내용을 적어주세요.</p>{["욕설 또는 인신공격", "스팸·광고", "개인정보 노출", "허위 또는 조작된 내용", "기타 운영정책 위반"].map((item) => <label className="report-option" key={item}><input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} />{item}</label>)}<label className="report-details"><span>상세 신고 사유</span><textarea required maxLength={300} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="어떤 부분이 문제인지 구체적으로 적어주세요." aria-label="상세 신고 사유" /><small>{details.length}/300</small></label><button className="danger-button full" type="submit">신고 접수</button></form></div>;
}

function VoteConfirmModal({ side, close, confirm }: { side: VoteSide; close: () => void; confirm: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className={`profile-modal vote-confirm vote-confirm-${side.toLowerCase()}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vote-confirm-title"><button className="modal-close" onClick={close} aria-label="닫기">×</button><span className="vote-confirm-side">{side}</span><h2 id="vote-confirm-title">{side}측 잘못으로 투표할까요?</h2><p>투표를 완료하면 변경할 수 없습니다.<br />작성한 댓글과 대댓글에도 이 의견이 표시됩니다.</p><div><button className="secondary-button" onClick={close}>다시 생각하기</button><button className="vote-confirm-submit" onClick={confirm}>투표 확정</button></div></section></div>;
}

function JudgeVerdictModal({ close, requirement, submit }: { close: () => void; requirement: string; submit: (side: VoteSide, reason: string) => void }) {
  const [side, setSide] = useState<VoteSide | null>(null);
  const [reason, setReason] = useState("");
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal judge-verdict-modal" onSubmit={(event) => { event.preventDefault(); if (side && reason.trim().length >= 10) submit(side, reason.trim()); }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="judge-verdict-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="judge-modal-label">공식 판결 · {requirement} 이상</span><h2 id="judge-verdict-title">어느 쪽의 잘못인가요?</h2><p>영상에서 확인한 장면을 근거로 판결해 주세요.<br />제출한 판결은 변경할 수 없습니다.</p><div className="judge-side-picker"><button type="button" className={side === "A" ? "a selected" : "a"} onClick={() => setSide("A")}><b>A</b><span>A측 잘못</span></button><button type="button" className={side === "B" ? "b selected" : "b"} onClick={() => setSide("B")}><b>B</b><span>B측 잘못</span></button></div><label className="judge-reason-field"><span>판결 근거</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={500} required placeholder="예: 24:05 상대 정글 위치가 사라진 뒤에도 시야 없이 진입했습니다." /><small>{reason.length}/500 · 최소 10자</small></label><button className="judge-verdict-submit" type="submit" disabled={!side || reason.trim().length < 10}>판결 제출하기</button></form></div>;
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [localCase, setLocalCase] = useState<LocalCase | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState("");
  const [viewingLocal, setViewingLocal] = useState(false);
  const [selectedCaseTitle, setSelectedCaseTitle] = useState("바론 스틸 시도, 이건 미드 잘못인가요?");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedUser = localStorage.getItem(USER_KEY);
      const storedCase = localStorage.getItem(CASE_KEY);
      if (storedUser) {
        const savedUser = JSON.parse(storedUser) as User;
        if (!localStorage.getItem(CHALLENGER_TEST_KEY)) {
          const challengerUser = { ...savedUser, tier: "챌린저" };
          localStorage.setItem(USER_KEY, JSON.stringify(challengerUser));
          localStorage.setItem(CHALLENGER_TEST_KEY, "complete");
          setUser(challengerUser);
        } else setUser(savedUser);
      }
      if (storedCase) {
        setLocalCase(JSON.parse(storedCase));
        loadStoredVideo().then((blob) => { if (blob) setLocalVideoUrl(URL.createObjectURL(blob)); }).catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const showToast = (message: string) => { setToastMessage(message); window.setTimeout(() => setToastMessage(""), 2800); };
  const requireLogin = () => { setLoginOpen(true); showToast("로그인이 필요한 기능입니다."); };
  const login = (nextUser: User) => { localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); localStorage.setItem(CHALLENGER_TEST_KEY, "complete"); setUser(nextUser); setLoginOpen(false); showToast(`${nextUser.nickname}님, 로그인했습니다.`); };
  const logout = () => { localStorage.removeItem(USER_KEY); setUser(null); setProfileOpen(false); showToast("로그아웃했습니다."); };
  const openSubmit = () => {
    if (!user) return requireLogin();
    if (isMasterPlus(user.tier)) return showToast("마스터 이상은 사건을 작성할 수 없으며 공식 판결자로 참여합니다.");
    setView("submit");
  };
  const openDetail = (local = false, title?: string) => { setViewingLocal(local); if (title) setSelectedCaseTitle(title); setView("detail"); };
  const search = (query: string) => { setSearchQuery(query); setView("search"); };

  return <div className="app-root"><Header view={view} setView={setView} user={user} onLogin={() => setLoginOpen(true)} onProfile={() => setProfileOpen(true)} />
    {view === "home" && <Home openDetail={openDetail} localCase={localCase} localVideoUrl={localVideoUrl} onSubmit={openSubmit} onSearch={search} />}
    {view === "detail" && <Detail toast={showToast} user={user} requireLogin={requireLogin} localCase={localCase} localVideoUrl={localVideoUrl} viewingLocal={viewingLocal} selectedTitle={selectedCaseTitle} />}
    {view === "ranking" && <Ranking user={user} />}
    {view === "guide" && <Guide />}
    {view === "search" && <SearchResults query={searchQuery} openDetail={openDetail} localCase={localCase} />}
    {view === "submit" && user && <SubmitCase setView={setView} toast={showToast} user={user} onSubmitted={(item, url) => { setLocalCase(item); setLocalVideoUrl(url); }} />}
    <footer><Logo onClick={() => setView("home")} /><p>티어는 진짜로, 닉네임은 자유롭게. 함께 판결하는 롤 플레이 판결소.</p><small>LOL.VS는 Riot Games가 보증하거나 후원하는 서비스가 아닙니다.</small></footer>
    {loginOpen && <LoginModal close={() => setLoginOpen(false)} onLogin={login} />}
    {profileOpen && user && <ProfileModal user={user} close={() => setProfileOpen(false)} logout={logout} />}
    {toastMessage && <div className="toast" role="status">✓ {toastMessage}</div>}
  </div>;
}
