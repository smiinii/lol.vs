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
type Reply = { id: number; name: string; tier: string; text: string };
type CommentItem = {
  id: number;
  name: string;
  tier: string;
  text: string;
  evidence: string;
  vote: VoteSide;
  likes: number;
  replies: Reply[];
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;
const USER_KEY = "lolvs-demo-user";
const CASE_KEY = "lolvs-local-case";
const VIDEO_KEY = "latest-case-video";

const compactCases = [
  { title: "바론 스틸 시도, 이건 미드 잘못인가요?", author: "정글은못말려", tier: "다이아몬드 IV", category: "솔로랭크", meta: "25분 전", time: "마감까지 1일 9시간", a: 71, b: 29, comments: 96, clip: "00:25", image: asset("/media/gameplay-detail.png") },
  { title: "라인전 푸시 후 다이브, 누구 잘못일까요?", author: "탑은외로워", tier: "플래티넘 I", category: "파티랭크", meta: "1시간 전", time: "마감까지 20시간", a: 45, b: 55, comments: 73, clip: "00:28", image: asset("/media/gameplay-feed.png") },
  { title: "용 앞 한타에서 포지셔닝 문제?", author: "서폿의하루", tier: "에메랄드 III", category: "일반게임", meta: "3시간 전", time: "마감까지 18시간", a: 34, b: 66, comments: 54, clip: "00:31", image: asset("/media/gameplay-feed.png") },
  { title: "바텀 2대2 교전, 원딜과 서폿 중 누구 판단이 문제였나요?", author: "바텀연구소", tier: "다이아몬드 II", category: "솔로랭크", meta: "4시간 전", time: "마감까지 16시간", a: 57, b: 43, comments: 81, clip: "00:34", image: asset("/media/gameplay-detail.png") },
  { title: "전령 앞에서 먼저 물린 탑, 팀이 버렸다는 게 맞나요?", author: "탑텔있음", tier: "에메랄드 I", category: "파티랭크", meta: "5시간 전", time: "마감까지 15시간", a: 63, b: 37, comments: 42, clip: "00:22", image: asset("/media/gameplay-feed.png") },
  { title: "상대 정글 위치를 알았는데도 카정 간 선택, 무리였나요?", author: "블루내꺼", tier: "플래티넘 II", category: "솔로랭크", meta: "6시간 전", time: "마감까지 14시간", a: 41, b: 59, comments: 68, clip: "00:29", image: asset("/media/gameplay-detail.png") },
  { title: "미드 로밍을 따라가지 않은 게 잘못인가요?", author: "라인먼저", tier: "에메랄드 IV", category: "일반게임", meta: "7시간 전", time: "마감까지 13시간", a: 52, b: 48, comments: 39, clip: "00:26", image: asset("/media/gameplay-feed.png") },
  { title: "한타 전 와드하러 간 서폿, 팀 이탈로 봐야 하나요?", author: "시야점수왕", tier: "다이아몬드 III", category: "솔로랭크", meta: "8시간 전", time: "마감까지 12시간", a: 28, b: 72, comments: 105, clip: "00:38", image: asset("/media/gameplay-detail.png") },
  { title: "탑 억제기 대신 용 합류, 이 판단이 맞았을까요?", author: "운영이먼저", tier: "마스터 24P", category: "파티랭크", meta: "9시간 전", time: "마감까지 11시간", a: 76, b: 24, comments: 117, clip: "00:33", image: asset("/media/gameplay-feed.png") },
  { title: "정글이 콜한 다이브를 거절한 미드가 잘못인가요?", author: "핑은찍었어", tier: "플래티넘 I", category: "솔로랭크", meta: "10시간 전", time: "마감까지 10시간", a: 49, b: 51, comments: 64, clip: "00:27", image: asset("/media/gameplay-detail.png") },
  { title: "포킹 조합인데 먼저 진입한 탱커, 누구 콜이 맞나요?", author: "한타각보는중", tier: "에메랄드 II", category: "일반게임", meta: "11시간 전", time: "마감까지 9시간", a: 32, b: 68, comments: 77, clip: "00:36", image: asset("/media/gameplay-feed.png") },
  { title: "바론 버스트 중 상대 정글을 막지 못한 책임은 누구에게?", author: "강타는있음", tier: "다이아몬드 I", category: "파티랭크", meta: "12시간 전", time: "마감까지 8시간", a: 66, b: 34, comments: 91, clip: "00:30", image: asset("/media/gameplay-detail.png") },
  { title: "라인 프리징 중 로밍 간 서폿, 원딜이 억울할 만한가요?", author: "혼자먹을게", tier: "골드 I", category: "솔로랭크", meta: "13시간 전", time: "마감까지 7시간", a: 58, b: 42, comments: 45, clip: "00:24", image: asset("/media/gameplay-feed.png") },
  { title: "첫 용을 포기하고 유충을 택한 교환, 손해인가요?", author: "오브젝트계산", tier: "에메랄드 III", category: "일반게임", meta: "14시간 전", time: "마감까지 6시간", a: 47, b: 53, comments: 58, clip: "00:32", image: asset("/media/gameplay-detail.png") },
  { title: "텔레포트가 있는데도 한타에 늦은 탑, 고의적인 건가요?", author: "사이드운영", tier: "플래티넘 III", category: "파티랭크", meta: "15시간 전", time: "마감까지 5시간", a: 69, b: 31, comments: 83, clip: "00:35", image: asset("/media/gameplay-feed.png") },
  { title: "마지막 한타에서 원딜을 지키지 않은 서폿 판단", author: "원딜지켜줘", tier: "다이아몬드 IV", category: "솔로랭크", meta: "16시간 전", time: "마감까지 4시간", a: 38, b: 62, comments: 112, clip: "00:41", image: asset("/media/gameplay-detail.png") },
  { title: "상대 텔 위치를 놓친 미드, 콜을 안 한 탑 책임도 있나요?", author: "미아핑세번", tier: "에메랄드 II", category: "솔로랭크", meta: "17시간 전", time: "마감까지 3시간", a: 54, b: 46, comments: 49, clip: "00:27", image: asset("/media/gameplay-feed.png") },
  { title: "용을 앞두고 귀환한 원딜, 오브젝트 포기 판단이 맞나요?", author: "템은사야지", tier: "플래티넘 I", category: "파티랭크", meta: "18시간 전", time: "마감까지 3시간", a: 36, b: 64, comments: 62, clip: "00:30", image: asset("/media/gameplay-detail.png") },
  { title: "유리한 한타 뒤 바론 대신 억제기를 민 선택", author: "운영토론회", tier: "다이아몬드 III", category: "일반게임", meta: "19시간 전", time: "마감까지 2시간", a: 61, b: 39, comments: 88, clip: "00:35", image: asset("/media/gameplay-feed.png") },
  { title: "레드 양보를 거절한 정글, 성장 차이면 정당한가요?", author: "버프는공유", tier: "에메랄드 IV", category: "솔로랭크", meta: "20시간 전", time: "마감까지 2시간", a: 43, b: 57, comments: 71, clip: "00:23", image: asset("/media/gameplay-detail.png") },
  { title: "사이드 압박 중 본대가 교전한 상황, 합류가 늦었나요?", author: "스플릿장인", tier: "다이아몬드 II", category: "파티랭크", meta: "21시간 전", time: "마감까지 1시간", a: 72, b: 28, comments: 93, clip: "00:39", image: asset("/media/gameplay-feed.png") },
  { title: "상대 궁극기를 뺀 뒤 바로 재진입한 콜, 성급했나요?", author: "쿨타임체크", tier: "플래티넘 II", category: "일반게임", meta: "22시간 전", time: "마감까지 1시간", a: 48, b: 52, comments: 56, clip: "00:28", image: asset("/media/gameplay-detail.png") },
  { title: "첫 갱 실패 뒤 같은 라인을 다시 간 정글 판단", author: "한번만더", tier: "골드 I", category: "솔로랭크", meta: "23시간 전", time: "마감까지 58분", a: 29, b: 71, comments: 84, clip: "00:26", image: asset("/media/gameplay-feed.png") },
  { title: "한타 승리 후 귀환 핑을 무시한 추격, 누구 콜이 문제였나요?", author: "집에갈시간", tier: "에메랄드 I", category: "파티랭크", meta: "1일 전", time: "마감까지 42분", a: 65, b: 35, comments: 99, clip: "00:32", image: asset("/media/gameplay-detail.png") },
];

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
    replies: [{ id: 11, name: "바위게장인", tier: "에메랄드 IV", text: "저도 합류 핑이 없었던 점까지 같이 봐야 한다고 생각해요." }],
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
];

const rankingSeed = [
  ["판결요정", "마스터 132P", "87%", "42개", "9,840"],
  ["맵리딩중", "다이아몬드 I", "84%", "39개", "9,210"],
  ["한타복기왕", "에메랄드 II", "82%", "51개", "8,760"],
  ["와드먼저", "다이아몬드 IV", "79%", "34개", "8,110"],
  ["천천히보자", "플래티넘 I", "78%", "46개", "7,820"],
];

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

function Logo({ onClick }: { onClick: () => void }) {
  return <button className="logo" onClick={onClick} aria-label="LOL.VS 홈">LOL<span>.</span>VS</button>;
}

function VerifiedBadge({ tier, demo = false }: { tier: string; demo?: boolean }) {
  return <span className="verified-badge"><span className="mini-rank">◆</span>{tier} · {demo ? "데모 인증" : "인증"}<span className="verify-dot">✓</span></span>;
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

function Home({ openDetail, localCase, localVideoUrl, onSubmit, onSearch }: { openDetail: (local?: boolean, title?: string) => void; localCase: LocalCase | null; localVideoUrl: string; onSubmit: () => void; onSearch: (query: string) => void }) {
  const [category, setCategory] = useState("전체");
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [popularCycle, setPopularCycle] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setPopularCycle((cycle) => cycle + 1), 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  const filtered = compactCases.filter((item) => category === "전체" || item.category === category);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const pageItems = filtered.slice((page - 1) * 6, page * 6);
  const popularPosts = popularCycle % 2 === 0 ? weeklyPosts : [weeklyPosts[2], weeklyPosts[0], weeklyPosts[1], weeklyPosts[4], weeklyPosts[3]];
  const showLocal = localCase && (category === "전체" || localCase.category === category);
  return (
    <main className="page-shell home-layout">
      <section className="feed-column">
        <div className="home-title-row compact-title"><div className="home-brand-copy"><span className="home-kicker"><i /> LOL 플레이 판결소</span><h1><b>억울한 장면,</b><em>함께 판결합니다</em></h1><p>티어가 인증된 플레이어의 투표와 근거 있는 피드백을 확인해 보세요.</p><div className="home-brand-tags"><span>◆ 티어 인증</span><span>● 장면 중심</span><span>VS 근거 피드백</span></div></div><div className="home-primary-actions"><form className="home-search" onSubmit={(event) => { event.preventDefault(); if (searchText.trim()) onSearch(searchText.trim()); }}><span>⌕</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="사건 검색" aria-label="사건 검색" /><button type="submit">검색</button></form><button className="home-write-button" onClick={onSubmit}><span>＋</span> 글쓰기</button></div></div>
        <div className="toolbar">
          <div className="category-tabs" role="tablist" aria-label="게임 유형">
            {["전체", "솔로랭크", "파티랭크", "일반게임"].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => { setCategory(item); setPage(1); }}>{item}</button>)}
          </div>
          <button className="sort-button">최신순⌄</button>
        </div>

        {showLocal && (
          <button className="uploaded-case-banner" onClick={() => openDetail(true, localCase.title)}>
            <span className="uploaded-thumb">{localVideoUrl ? <video src={localVideoUrl} muted /> : <span>▶</span>}</span>
            <span><small>방금 등록한 사건 · {localCase.category}</small><strong>{localCase.title}</strong><em>{localCase.author} · {localCase.tier} 데모 인증</em></span>
            <b>판결 보기 →</b>
          </button>
        )}

        <div className="case-board-heading"><div><h2>진행 중인 사건</h2><span>{filtered.length}개의 판결</span></div><small>모든 사건을 같은 형식으로 빠르게 둘러보세요.</small></div>
        <div className="case-list board-style">
          {pageItems.map((item) => (
            <button className="case-row" key={item.title} onClick={() => openDetail(false, item.title)}>
              <span className="thumb"><img src={item.image} alt="" /><i>▶</i><small>{item.clip}</small></span>
              <span className="case-copy"><strong>{item.title}</strong><span className="author-line">{item.author} <VerifiedBadge tier={item.tier} /></span><small>{item.category} · {item.meta}</small></span>
              <span className="row-votes"><small>{item.time}</small><VoteBar a={item.a} b={item.b} compact /></span>
              <span className="comment-count">◯ {item.comments}</span>
            </button>
          ))}
          {!filtered.length && !showLocal && <div className="empty-state">이 카테고리의 사건을 준비하고 있습니다.</div>}
        </div>
        {pageCount > 1 && <nav className="pagination" aria-label="사건 목록 페이지">{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} className={page === number ? "active" : ""} onClick={() => { setPage(number); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{number}</button>)}</nav>}
      </section>

      <aside className="right-rail">
        <section className="rail-card hot-card"><div className="hot-card-head"><div><span><i /> LIVE RANK</span><h2>주간 인기 글</h2></div><small>30분마다 업데이트</small></div><ol>{popularPosts.map((post, index) => <li key={post.title}><button onClick={() => openDetail(false, post.title)}><span className={index < 3 ? "rank hot" : "rank"}>{index + 1}</span><img src={asset(index === 0 ? "/media/gameplay-detail.png" : "/media/gameplay-feed.png")} alt="" /><span className="hot-copy"><strong>{post.title}</strong><small>{post.meta}</small></span><em className={`trend-${post.trend}`}>{post.trend === "up" ? "▲" : post.trend === "down" ? "▼" : "—"} {post.delta || ""}</em></button></li>)}</ol><div className="hot-update-note"><span>↻</span><p><b>다음 갱신까지 30분 이내</b><small>투표·댓글 활동을 반영합니다</small></p></div></section>
        <section className="rail-card"><h2>인증 티어 분포 <small>ⓘ</small></h2><div className="tier-bar"><span /><span /><span /><span /><span /></div><div className="tier-labels"><span>12%<small>아이언–골드</small></span><span>28%<small>플래티넘</small></span><span>31%<small>에메랄드</small></span><span>19%<small>다이아</small></span><span>8%<small>마스터+</small></span></div><p>로그인 데모에서는 선택한 티어가 데모 인증으로 표시됩니다.</p></section>
        <section className="rail-card principles brand-principles"><div className="principles-head"><span>VS</span><div><small>LOL.VS STANDARD</small><h2>좋은 판결은<br />이렇게 만듭니다</h2></div></div><div className="principle-list"><article><b>01</b><span><strong>장면을 정확히</strong><small>타임스탬프와 플레이 상황을 함께 봅니다.</small></span></article><article><b>02</b><span><strong>감정보다 근거를</strong><small>잘잘못과 다음 선택을 구분해 말합니다.</small></span></article><article><b>03</b><span><strong>사람보다 플레이를</strong><small>공격 대신 개선할 수 있는 의견을 남깁니다.</small></span></article></div><div className="principles-sign"><i /><span>판결은 선명하게, 피드백은 따뜻하게.</span><i /></div></section>
      </aside>
    </main>
  );
}

function Detail({ setView, toast, user, requireLogin, localCase, localVideoUrl, viewingLocal, selectedTitle }: {
  setView: (view: View) => void;
  toast: (message: string) => void;
  user: User | null;
  requireLogin: () => void;
  localCase: LocalCase | null;
  localVideoUrl: string;
  viewingLocal: boolean;
  selectedTitle: string;
}) {
  const [vote, setVote] = useState<VoteSide | null>(null);
  const [feedback, setFeedback] = useState("");
  const [evidence, setEvidence] = useState("");
  const [commentVote, setCommentVote] = useState<VoteSide | null>(null);
  const [comments, setComments] = useState(commentsSeed);
  const [likedComments, setLikedComments] = useState<number[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const result = vote === "A" ? { a: 59, b: 41 } : { a: 58, b: 42 };
  const title = viewingLocal && localCase ? localCase.title : selectedTitle;
  const aClaim = viewingLocal && localCase ? localCase.aClaim : "미드가 바론 시야를 확보하지 않고 라인을 밀다가 합류했습니다. 미드의 지도 관리 소홀과 합류 지연이 원인입니다.";
  const bClaim = viewingLocal && localCase ? localCase.bClaim : "정글이 바론 핑을 찍지 않았고, 미드가 라인을 밀 수밖에 없는 상황이었습니다. 팀 전체의 판단 실수가 더 큽니다.";
  const author = viewingLocal && localCase ? localCase.author : "한타는팀운";
  const tier = viewingLocal && localCase ? localCase.tier : "다이아몬드 IV";
  const videoSrc = viewingLocal && localVideoUrl ? localVideoUrl : asset("/media/demo.mp4");
  const voteStorageKey = user ? `lolvs-vote:${user.nickname}:${title}` : "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVote(null);
      setCommentVote(null);
      if (!voteStorageKey) return;
      const savedVote = localStorage.getItem(voteStorageKey) as VoteSide | null;
      if (savedVote === "A" || savedVote === "B") { setVote(savedVote); setCommentVote(savedVote); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [voteStorageKey]);

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return requireLogin();
    if (!feedback.trim() || !evidence.trim()) return toast("피드백과 판단 근거를 함께 적어주세요.");
    if (!vote && !commentVote) return toast("A 또는 B 중 판결을 먼저 선택해 주세요.");
    const selectedVote = vote ?? commentVote;
    if (!selectedVote) return;
    const item: CommentItem = { id: Date.now(), name: user.nickname, tier: user.tier, text: feedback.trim(), evidence: evidence.trim(), vote: selectedVote, likes: 0, replies: [] };
    if (!vote) {
      setVote(selectedVote);
      localStorage.setItem(voteStorageKey, selectedVote);
    }
    setComments([item, ...comments]);
    setFeedback("");
    setEvidence("");
    toast("판결과 피드백을 함께 등록했습니다.");
  };

  const addReply = (commentId: number) => {
    if (!user) return requireLogin();
    if (!replyText.trim()) return;
    setComments(comments.map((comment) => comment.id === commentId ? { ...comment, replies: [...comment.replies, { id: Date.now(), name: user.nickname, tier: user.tier, text: replyText.trim() }] } : comment));
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

  return (
    <main className="page-shell detail-layout">
      <section className="detail-main">
        <button className="back-link" onClick={() => setView("home")}>← 홈으로</button>
        <div className="detail-title-row"><div className="detail-title"><span>판결 진행 중</span><h1>{title}</h1></div><button className="inline-report" onClick={() => requestReport("게시물")}>⚑ 게시물 신고</button></div>
        <div className="video-card real-video"><video src={videoSrc} controls playsInline poster={viewingLocal ? undefined : asset("/media/gameplay-detail.png")}>브라우저가 영상을 지원하지 않습니다.</video></div>
        <div className="video-author-row"><div className="author"><span className="avatar small">{author[0]}</span><strong>{author}</strong><VerifiedBadge tier={tier} demo={viewingLocal} /></div><div>조회 3,842 · 댓글 {comments.length + 126}</div></div>
        <div className="claims"><article className="claim claim-a"><h2>A측 주장</h2><p>{aClaim}</p><span>A</span></article><article className="claim claim-b"><h2>B측 주장</h2><p>{bClaim}</p><span>B</span></article></div>
        <section className="timeline"><h2>사건 타임라인 & 상황 요약</h2><div><span><b>23:40</b>시야 장악 시작</span><i>→</i><span><b>23:52</b>라인 푸시 시작</span><i>→</i><span><b>24:18</b>교전 준비</span><i>→</i><span><b>24:31</b>전투 개시</span></div></section>

        <section className="comments-section">
          <div className="comments-heading"><h2>댓글 {comments.length + 126}</h2><span>투표 선택과 판단 근거 공개</span></div>
          {user ? (
            <form className="comment-composer" onSubmit={addComment}>
              <div className="comment-compose-top"><div><strong>판결과 피드백 남기기</strong><small>{vote ? `내 판결은 ${vote} 잘못으로 등록되어 있습니다.` : "댓글을 등록할 때 선택한 판결도 함께 반영됩니다."}</small></div><div className="judgement-choice"><button type="button" disabled={!!vote} className={commentVote === "A" ? "selected a" : "a"} onClick={() => setCommentVote("A")}>A 잘못</button><button type="button" disabled={!!vote} className={commentVote === "B" ? "selected b" : "b"} onClick={() => setCommentVote("B")}>B 잘못</button></div></div><div className="comment-fields"><input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="예: 24:18 미드 합류 전 바론을 시작함" aria-label="판단 근거" /><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="다음 플레이에 도움이 될 피드백을 남겨주세요." aria-label="피드백 작성" /></div><div className="comment-submit-row"><span>선택한 판결과 근거는 댓글에 공개됩니다.</span><button type="submit">댓글 등록</button></div>
            </form>
          ) : <button className="login-lock" onClick={requireLogin}>로그인하고 판결 근거와 피드백 남기기 →</button>}
          {comments.map((item, index) => (
            <article className="comment" key={item.id}>
              <span className="comment-avatar">{item.name[0]}</span>
              <div>
                <div className="comment-meta"><strong>{item.name}</strong><VerifiedBadge tier={item.tier} demo={item.name === user?.nickname} /><span className={`comment-vote vote-${item.vote.toLowerCase()}`}>{item.vote} 잘못 선택</span><small>{index + 1}시간 전</small></div>
                <p>{item.text}</p><blockquote><b>판단 근거</b>{item.evidence}</blockquote>
                <div className="comment-actions"><button className={likedComments.includes(item.id) ? "liked" : ""} onClick={() => likeComment(item.id)}>{likedComments.includes(item.id) ? "♥" : "♡"} {item.likes}</button><button onClick={() => { if (!user) requireLogin(); else setReplyingTo(replyingTo === item.id ? null : item.id); }}>답글 {item.replies.length ? item.replies.length : ""}</button><button className="comment-report" onClick={() => requestReport(`${item.name}님의 댓글`)}>신고</button></div>
                {item.replies.map((reply) => <div className="reply" key={reply.id}><span className="comment-avatar">{reply.name[0]}</span><div className="reply-body"><div className="reply-head"><span><strong>{reply.name}</strong><VerifiedBadge tier={reply.tier} demo={reply.name === user?.nickname} /></span><button className="reply-report" onClick={() => requestReport(`${reply.name}님의 대댓글`)}>신고</button></div><p>{reply.text}</p></div></div>)}
                {replyingTo === item.id && <div className="reply-form"><input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`${item.name}님에게 답글 남기기`} aria-label="대댓글 작성" /><button onClick={() => addReply(item.id)}>등록</button></div>}
              </div>
            </article>
          ))}
        </section>
      </section>

      <aside className="vote-rail">
        <section className="vote-card"><div className="deadline">◷ 마감까지 <strong>2일 14시간</strong></div><div className="vote-body current-result"><h2>현재 판결</h2><VoteBar a={result.a} b={result.b} /><p className="vote-hint">댓글을 등록할 때 선택한 판결이 투표에 함께 반영됩니다.</p>{vote && <p className="my-vote">내 판결: <b>{vote} 잘못</b></p>}</div></section>
        <section className="guide-card"><h2>판결 가이드</h2><ul><li>객관적인 장면을 기준으로 판단해 주세요.</li><li>댓글에는 선택한 판결과 판단 근거가 함께 공개됩니다.</li><li>비난보다 다음 플레이에 도움 되는 피드백을 남겨 주세요.</li></ul></section>
      </aside>
      {reportTarget && <ReportModal target={reportTarget} close={() => setReportTarget(null)} onSubmit={(reason) => { const target = reportTarget; setReportTarget(null); toast(`${target} 신고가 접수되었습니다: ${reason}`); }} />}
    </main>
  );
}

function Ranking({ user }: { user: User | null }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const candidates = rankingSeed.map((row, index) => ({ rank: index + 1, name: row[0], tier: row[1], accuracy: row[2], feedback: row[3], points: row[4] }));
  const currentRank = user ? { rank: 326, name: user.nickname, tier: user.tier, accuracy: "61%", feedback: "8개", points: "1,250" } : null;
  const userIsTopFive = user ? rankingSeed.some((row) => row[0].toLowerCase() === user.nickname.toLowerCase()) : false;
  if (currentRank && !userIsTopFive) candidates.push(currentRank);
  const match = searched ? candidates.find((item) => item.name.toLowerCase() === query.trim().toLowerCase()) : undefined;
  const frameNames = ["challenger", "grandmaster", "master", "diamond", "emerald"];
  return <main className="page-shell section-page ranking-page"><form className="rank-search rank-search-first" onSubmit={(event) => { event.preventDefault(); setSearched(Boolean(query.trim())); }}><div><strong>판별자 검색</strong><span>다른 판별자의 순위와 활동 점수를 찾아보세요.</span></div><label><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} placeholder="닉네임 입력" aria-label="판별자 닉네임 검색" /></label><button type="submit">검색</button></form>{searched && (match ? <section className="rank-result"><b>{match.rank}위</b><span className="avatar">{match.name[0]}</span><div><strong>{match.name} · {match.points}P</strong><small>{match.tier} · 적중률 {match.accuracy}</small></div><em>{match.rank <= 5 ? "TOP 5" : "상위 31%"}</em></section> : <div className="rank-empty">일치하는 판별자를 찾지 못했습니다. 닉네임을 다시 확인해 주세요.</div>)}<section className="score-rules"><div><b>+15</b><span>최종 판결과 일치</span></div><div><b>+1</b><span>피드백 공감 1개</span></div><div><b>+5</b><span>판결 참여 1회당</span></div><div><b>-20</b><span>신고 제재 확정</span></div></section><section className="ranking-card elite-ranking"><div className="ranking-head"><span>순위</span><span>판별자</span><span>적중률</span><span>도움 피드백</span><span>점수</span></div>{rankingSeed.map((row, index) => <div className={index < 3 ? `ranking-row podium rank-${index + 1}` : "ranking-row"} key={row[0]}><b className="rank-number"><span>{["1ST", "2ND", "3RD"][index] ?? ""}</span>{index + 1}</b><span className="rank-player"><i className={`rank-frame ${frameNames[index]}`}><b>{row[0][0]}</b></i><span><strong>{row[0]}</strong><small>{row[1]} · 인증</small></span></span><span>{row[2]}</span><span>{row[3]}</span><strong>{row[4]}P</strong></div>)}{currentRank && !userIsTopFive && <><div className="ranking-divider"><span>내 순위</span></div><div className="ranking-row current-rank-row"><b className="rank-number">{currentRank.rank}</b><span className="rank-player"><i className="rank-frame current"><b>{currentRank.name[0]}</b></i><span><strong>{currentRank.name}</strong><small>{currentRank.tier} · 데모 인증</small></span></span><span>{currentRank.accuracy}</span><span>{currentRank.feedback}</span><strong>{currentRank.points}P</strong></div></>}{!user && <div className="rank-login-note">로그인하면 TOP 5 아래에서 내 순위를 바로 확인할 수 있습니다.</div>}</section></main>;
}

function Guide() {
  const steps = [["01", "먼저 둘러보기", "로그인하지 않아도 사건 영상과 의견, 판별자 랭킹을 모두 볼 수 있어요."], ["02", "활동 정보로 로그인", "지금은 사이트 닉네임과 티어를 선택해 데모 로그인합니다. Riot 인증은 추후 연결됩니다."], ["03", "판결과 댓글을 한 번에", "A/B 판결을 고르고 근거와 피드백을 등록하면 투표도 동시에 반영됩니다."], ["04", "다음 플레이에 적용", "공감받은 의견과 대댓글을 읽고 다음 게임에서 바꿀 한 가지를 찾아보세요."]];
  return <main className="page-shell section-page guide-page"><section className="guide-intro"><span>처음 오셨나요?</span><h1><b>억울함을 풀고,</b><em>다음 플레이는 더 선명하게.</em></h1><p>LOL.VS는 승패를 탓하는 곳이 아니라, 짧은 장면을 함께 보고 더 나은 선택을 찾는 공간입니다.</p><div className="guide-ad-badges"><span>티어 인증 의견</span><span>장면 중심 판결</span><span>바로 쓰는 피드백</span></div></section><section className="guide-flow"><div className="guide-flow-title"><h2>네 단계면 충분해요</h2></div><div className="guide-steps">{steps.map(([number, title, body]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{body}</p></article>)}</div></section><div className="guide-grid"><section className="guide-panel accent-teal"><span className="guide-icon">✓</span><h2>사건 제보 체크리스트</h2><ul><li>핵심 장면이 잘 보이는 짧은 영상을 올려주세요.</li><li>A측과 B측 입장을 각각 공정하게 적어주세요.</li><li>실제 Riot ID나 상대방의 개인정보는 가려주세요.</li><li>판결 기간은 1일, 3일, 7일 중 선택할 수 있습니다.</li></ul></section><section className="guide-panel accent-coral"><span className="guide-icon">!</span><h2>이럴 때 신고해 주세요</h2><ul><li>욕설·인신공격 또는 혐오 표현</li><li>반복 광고나 무관한 도배</li><li>타인의 개인정보 및 Riot ID 노출</li><li>조작된 영상이나 고의적인 허위 설명</li></ul></section></div><section className="faq"><h2>자주 묻는 질문</h2><details open><summary>티어는 정말 인증되나요?</summary><p>현재 공개 버전은 Riot API 연결 전이라 사용자가 선택한 티어를 ‘데모 인증’으로 표시합니다. 실제 인증처럼 오해하지 않도록 구분했습니다.</p></details><details><summary>영상은 어디에 저장되나요?</summary><p>현재 GitHub Pages 버전에서는 선택한 기기의 브라우저 저장소에만 저장됩니다. 다른 사람과 공유되는 서버 업로드는 백엔드 연결 후 가능합니다.</p></details><details><summary>로그인하지 않아도 볼 수 있나요?</summary><p>네. 모든 읽기 화면은 공개되어 있고 판결·댓글 등록, 대댓글, 글쓰기, 사건 제보, 신고만 로그인이 필요합니다.</p></details></section></main>;
}

function SearchResults({ query, openDetail, localCase }: { query: string; openDetail: (local?: boolean, title?: string) => void; localCase: LocalCase | null }) {
  const keyword = query.toLowerCase();
  const cases = [
    ...(localCase ? [{ title: localCase.title, category: localCase.category, local: true }] : []),
    ...compactCases.map((item) => ({ title: item.title, category: item.category, local: false })),
    ...weeklyPosts.map(({ title }) => ({ title, category: "주간 인기", local: false })),
  ].filter((item, index, array) => item.title.toLowerCase().includes(keyword) && array.findIndex((other) => other.title === item.title) === index);
  return <main className="page-shell section-page search-page"><div className="search-heading"><span>사건 검색</span><h1>“{query}” 검색 결과</h1><p>진행 중인 사건과 주간 인기 판결에서 찾았습니다.</p></div><section className="search-result-section"><div><h2>사건</h2><b>{cases.length}</b></div>{cases.length ? <div className="search-result-list">{cases.map((item) => <button key={item.title} onClick={() => openDetail(item.local, item.title)}><span>판결</span><strong>{item.title}</strong><small>{item.category} · 사건 열기 →</small></button>)}</div> : <p className="search-none">일치하는 사건이 없습니다.</p>}</section></main>;
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
    if (!file) return toast("실제 영상 파일을 선택해 주세요.");
    const form = new FormData(event.currentTarget);
    const item: LocalCase = { title: String(form.get("title")), category: String(form.get("category")), aClaim: String(form.get("aClaim")), bClaim: String(form.get("bClaim")), author: user.nickname, tier: user.tier };
    setSaving(true);
    try { await storeVideo(file); localStorage.setItem(CASE_KEY, JSON.stringify(item)); onSubmitted(item, preview); toast("영상과 사건이 이 브라우저에 저장되었습니다."); setView("home"); } catch { toast("영상을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); } finally { setSaving(false); }
  };
  return <main className="submit-page page-shell"><button className="back-link" onClick={() => setView("home")}>← 홈으로</button><div className="submit-heading"><h1>억울했던 장면을 제보해 주세요</h1><p>선택한 영상은 현재 기기의 브라우저에 저장되며 바로 재생해 볼 수 있습니다.</p></div><form className="submit-form" onSubmit={submit}><section><label>1. 영상 업로드</label><input ref={inputRef} className="sr-only" type="file" accept="video/*" onChange={chooseFile} />{preview ? <div className="upload-preview"><video src={preview} controls /><button type="button" onClick={() => inputRef.current?.click()}>영상 다시 선택</button></div> : <button type="button" className="upload-box" onClick={() => inputRef.current?.click()}><span>↥</span><strong>내 기기에서 실제 영상 선택</strong><small>MP4, WebM 등 · 200MB 이하 권장</small></button>}</section><section><label htmlFor="case-title">2. 사건 제목</label><input id="case-title" name="title" required placeholder="예: 바론 스틸 시도, 미드가 잘못한 걸까요?" /></section><section><label htmlFor="case-category">3. 게임 카테고리</label><select id="case-category" name="category" defaultValue="솔로랭크"><option>솔로랭크</option><option>파티랭크</option><option>일반게임</option></select></section><div className="form-split"><section><label htmlFor="a-claim">4. A측 주장</label><textarea id="a-claim" name="aClaim" required placeholder="A측이 억울한 이유를 적어주세요." /></section><section><label htmlFor="b-claim">5. B측 입장</label><textarea id="b-claim" name="bClaim" required placeholder="B측은 이 상황을 어떻게 봤을까요?" /></section></div><section><label>6. 판결 기간</label><div className="duration"><label><input type="radio" name="duration" value="1" />1일</label><label><input type="radio" name="duration" value="3" defaultChecked />3일</label><label><input type="radio" name="duration" value="7" />7일</label></div></section><div className="submit-notice"><span>ⓘ</span><p><strong>기기 로컬 저장 데모입니다.</strong><br />서버와 Riot API 연결 전이라 다른 사용자에게 공유되지는 않습니다.</p></div><button type="submit" className="primary-button full" disabled={saving}>{saving ? "영상 저장 중…" : "사건 등록하기"}</button></form></main>;
}

function LoginModal({ close, onLogin }: { close: () => void; onLogin: (user: User) => void }) {
  const [nickname, setNickname] = useState("");
  const [tier, setTier] = useState("골드 IV");
  const submit = (event: FormEvent) => { event.preventDefault(); if (nickname.trim().length < 2) return; onLogin({ nickname: nickname.trim(), tier }); };
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal login-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="profile-emblem">VS</span><h2 id="login-title">데모 로그인</h2><p>Riot API 연결 전까지 활동 닉네임과 티어를 직접 선택합니다.</p><label>사이트 활동 닉네임<input value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={12} required placeholder="2~12자" autoFocus /></label><label>현재 티어<select value={tier} onChange={(event) => setTier(event.target.value)}>{["아이언 I", "브론즈 I", "실버 I", "골드 IV", "플래티넘 IV", "에메랄드 IV", "다이아몬드 IV", "마스터"].map((item) => <option key={item}>{item}</option>)}</select></label><div className="demo-warning">선택한 티어는 실제 Riot 인증이 아닌 <b>데모 인증</b>으로 표시됩니다.</div><button className="primary-button full" type="submit">이 정보로 로그인</button></form></div>;
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
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedCase) {
        setLocalCase(JSON.parse(storedCase));
        loadStoredVideo().then((blob) => { if (blob) setLocalVideoUrl(URL.createObjectURL(blob)); }).catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const showToast = (message: string) => { setToastMessage(message); window.setTimeout(() => setToastMessage(""), 2800); };
  const requireLogin = () => { setLoginOpen(true); showToast("로그인이 필요한 기능입니다."); };
  const login = (nextUser: User) => { localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); setUser(nextUser); setLoginOpen(false); showToast(`${nextUser.nickname}님, 로그인했습니다.`); };
  const logout = () => { localStorage.removeItem(USER_KEY); setUser(null); setProfileOpen(false); showToast("로그아웃했습니다."); };
  const openSubmit = () => { if (!user) requireLogin(); else setView("submit"); };
  const openDetail = (local = false, title?: string) => { setViewingLocal(local); if (title) setSelectedCaseTitle(title); setView("detail"); };
  const search = (query: string) => { setSearchQuery(query); setView("search"); };

  return <div className="app-root"><Header view={view} setView={setView} user={user} onLogin={() => setLoginOpen(true)} onProfile={() => setProfileOpen(true)} />
    {view === "home" && <Home openDetail={openDetail} localCase={localCase} localVideoUrl={localVideoUrl} onSubmit={openSubmit} onSearch={search} />}
    {view === "detail" && <Detail setView={setView} toast={showToast} user={user} requireLogin={requireLogin} localCase={localCase} localVideoUrl={localVideoUrl} viewingLocal={viewingLocal} selectedTitle={selectedCaseTitle} />}
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
