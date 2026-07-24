"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CommentRow, isSupabaseConfigured, supabase } from "@/lib/supabase";

type View = "home" | "ranking" | "guide" | "detail" | "submit" | "search" | "admin";
type NavigationState = { view: View; title?: string; local?: boolean; query?: string };
type VoteSide = "A" | "B";
type CaseMode = "judgement" | "feedback";
type User = { nickname: string; tier: string; peakTier?: string; primaryRole?: string; isAdmin?: boolean };
type LocalCase = {
  title: string;
  mode: CaseMode;
  category: string;
  aClaim?: string;
  bClaim?: string;
  thought?: string;
  author: string;
  tier: string;
  approved?: boolean;
};
type Reply = { id: number; name: string; tier: string; text: string; vote?: VoteSide };
type FeedbackSegment = { start: number; end: number; text: string };
type CommentItem = {
  id: number;
  name: string;
  tier: string;
  text: string;
  evidence?: string;
  segments?: FeedbackSegment[];
  vote?: VoteSide;
  likes: number;
  replies: Reply[];
};
type CaseActivity = { comments: number; likes: number };
type JudgeVerdictDraft = { side: VoteSide; timestamp: string; visibleInfo: string; reason: string; nextChoice: string; confidence: number };
type ExpertFeedbackDraft = { timestamp: string; observedInfo: string; analysis: string; nextChoice: string; author?: string; tier?: string; role?: string };
type ResolvedVerdict = { side: VoteSide; judge: string; judgeTier: string; judgeRole: string; peakTier: string; timestamp: string; visibleInfo: string; reason: string; nextChoice: string; confidence: number; recognitions: number; acceptance: number; positionJudgements: number; decidedAt: string };

function mapCommentRows(rows: CommentRow[]): CommentItem[] {
  const roots = rows
    .filter((row) => row.parent_id === null)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return roots.map((row) => ({
    id: Number(row.id),
    name: row.nickname,
    tier: row.tier,
    text: row.content,
    evidence: row.evidence ?? undefined,
    segments: Array.isArray(row.segments)
      ? row.segments
          .filter((segment): segment is FeedbackSegment => (
            typeof segment === "object"
            && segment !== null
            && typeof segment.start === "number"
            && typeof segment.end === "number"
            && typeof segment.text === "string"
          ))
      : [],
    vote: row.vote ?? undefined,
    likes: row.likes,
    replies: rows
      .filter((reply) => reply.parent_id === row.id)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .map((reply) => ({
        id: Number(reply.id),
        name: reply.nickname,
        tier: reply.tier,
        text: reply.content,
        vote: reply.vote ?? undefined,
      })),
  }));
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;
const navigableViews: View[] = ["home", "ranking", "guide", "detail", "submit", "search", "admin"];
const USER_KEY = "lolvs-demo-user";
const CASE_KEY = "lolvs-local-case-v2";
const VIDEO_KEY = "latest-case-video-v2";
const PERSONAL_RANKING_KEY = "lolvs-personal-ranking-v1";

function formatVideoTime(value: number) {
  const safeValue = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function navigationFromHash(hash: string): NavigationState {
  const [rawView, rawParams = ""] = hash.replace(/^#/, "").split("?");
  const view = navigableViews.includes(rawView as View) ? rawView as View : "home";
  const params = new URLSearchParams(rawParams);
  return {
    view,
    title: params.get("title") ?? undefined,
    local: params.has("local") ? params.get("local") === "1" : undefined,
    query: params.get("query") ?? undefined,
  };
}

function navigationToHash(view: View, state: Omit<NavigationState, "view"> = {}) {
  if (view === "home") return "";
  const params = new URLSearchParams();
  if (state.title) params.set("title", state.title);
  if (typeof state.local === "boolean") params.set("local", state.local ? "1" : "0");
  if (state.query) params.set("query", state.query);
  const query = params.toString();
  return `#${view}${query ? `?${query}` : ""}`;
}

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

const REAL_CASE_TITLE = "이게 내가 잘못? ㅋ";

const compactCases = [
  {
    title: REAL_CASE_TITLE,
    author: "루크",
    tier: "",
    category: "솔로랭크",
    meta: "방금 전",
    time: "판정 대기 중",
    aClaim: "리신이 룰루를 잡으러 갔어야 했다.",
    bClaim: "리신이 유나라를 잡고 올라가는 게 맞다.",
    a: 0,
    b: 0,
    comments: 0,
    clip: "PLAY",
    video: asset("/media/lee-sin.mp4"),
    mode: "judgement" as const,
    likes: 0,
  },
  {
    title: "용 한타 전 먼저 들어간 게 맞나요?",
    author: "파티리더",
    tier: "에메랄드 II",
    category: "파티랭크",
    meta: "12분 전",
    time: "판정 대기 중",
    aClaim: "용이 나오기 전에 먼저 자리를 잡고 교전을 열었어야 했다.",
    bClaim: "아군이 도착하기 전이라 한 번 더 기다렸어야 했다.",
    a: 0,
    b: 0,
    comments: 0,
    clip: "00:31",
    video: asset("/media/lee-sin.mp4"),
    mode: "judgement" as const,
    likes: 0,
  },
  {
    title: "바텀 다이브, 합류가 늦은 게 문제인가요?",
    author: "합류핑찍음",
    tier: "플래티넘 I",
    category: "파티랭크",
    meta: "25분 전",
    time: "판정 대기 중",
    aClaim: "웨이브가 들어갈 때 바로 다이브를 시작하는 게 맞았다.",
    bClaim: "상대 정글 위치를 확인한 뒤 합류를 기다렸어야 했다.",
    a: 0,
    b: 0,
    comments: 0,
    clip: "00:24",
    video: asset("/media/lee-sin.mp4"),
    mode: "judgement" as const,
    likes: 0,
  },
  {
    title: "미드 로밍을 따라가지 않은 판단, 누구 잘못?",
    author: "내전정글",
    tier: "다이아몬드 IV",
    category: "내전",
    meta: "41분 전",
    time: "판정 대기 중",
    aClaim: "미드가 사라진 순간 바로 따라가서 교전을 막았어야 했다.",
    bClaim: "시야가 없어서 라인을 밀고 손해를 줄이는 판단이 맞았다.",
    a: 0,
    b: 0,
    comments: 0,
    clip: "00:28",
    video: asset("/media/lee-sin.mp4"),
    mode: "judgement" as const,
    likes: 0,
  },
  {
    title: "바론 앞 시야 싸움, 먼저 걸어야 했나요?",
    author: "시야체크",
    tier: "에메랄드 I",
    category: "내전",
    meta: "58분 전",
    time: "판정 대기 중",
    aClaim: "상대가 흩어진 타이밍에 먼저 교전을 열었어야 했다.",
    bClaim: "와드가 부족해서 시야부터 확보하는 게 맞았다.",
    a: 0,
    b: 0,
    comments: 0,
    clip: "00:35",
    video: asset("/media/lee-sin.mp4"),
    mode: "judgement" as const,
    likes: 0,
  },
];

const resolvedVerdicts: Record<string, ResolvedVerdict> = {};
const topJudges = [
  { name: "루크", tier: "챌린저", role: "정글", judgements: 0, recognitions: 0, acceptance: 0 },
  { name: "천상계판독기", tier: "챌린저", role: "탑", judgements: 0, recognitions: 0, acceptance: 0 },
  { name: "맵리딩중", tier: "그랜드마스터", role: "정글", judgements: 0, recognitions: 0, acceptance: 0 },
  { name: "라인의정석", tier: "그랜드마스터", role: "미드", judgements: 0, recognitions: 0, acceptance: 0 },
  { name: "시야먼저", tier: "마스터", role: "서포터", judgements: 0, recognitions: 0, acceptance: 0 },
];
const commentsSeed: CommentItem[] = [];
const feedbackCommentsSeed: CommentItem[] = [];
const judgeRankingSeed: string[][] = topJudges.map((judge) => [judge.name, judge.tier, "0", "0", "0"]);

function registerPersonalRanking(rows: string[][], user: User) {
  const tier = user.isAdmin ? "챌린저" : user.tier;
  const index = rows.findIndex((row) => row[0].toLowerCase() === user.nickname.toLowerCase());
  if (index === -1) return [...rows, [user.nickname, tier, "0 / 0", "0", "0"]];
  return rows.map((row, rowIndex) => rowIndex === index ? [user.nickname, tier, row[2], row[3], row[4]] : row);
}

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

async function deleteStoredVideo(): Promise<void> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("videos", "readwrite");
    transaction.objectStore("videos").delete(VIDEO_KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
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
  if (user?.isAdmin) menus.push(["admin", "승인 관리"]);
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
              <span className="profile-copy desktop-only"><strong>{user.nickname}</strong><small>{user.isAdmin ? "관리자 · 승인 권한" : `${user.tier} · 데모 인증`}</small></span>
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
  return side ? <span className={`comment-vote vote-${side.toLowerCase()}`}>{side} 동의</span> : null;
}

function Home({ openDetail, localCase, localVideoUrl, onSubmit, onSearch }: { openDetail: (local?: boolean, title?: string) => void; localCase: LocalCase | null; localVideoUrl: string; onSubmit: () => void; onSearch: (query: string) => void }) {
  const [category, setCategory] = useState("전체");
  const [serviceMode, setServiceMode] = useState<CaseMode>("judgement");
  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [judgeIndex, setJudgeIndex] = useState(0);
  const [caseActivity, setCaseActivity] = useState<Record<string, CaseActivity>>({});

  const loadCaseActivity = useCallback(async () => {
    if (supabase) {
      const { data, error } = await supabase
        .from("comments")
        .select("case_id, likes");
      if (error) {
        console.error("홈 활동 수를 불러오지 못했습니다.", error);
        return;
      }
      const nextActivity = (data ?? []).reduce<Record<string, CaseActivity>>((activity, row) => {
        const current = activity[row.case_id] ?? { comments: 0, likes: 0 };
        activity[row.case_id] = {
          comments: current.comments + 1,
          likes: current.likes + Number(row.likes ?? 0),
        };
        return activity;
      }, {});
      setCaseActivity(nextActivity);
      return;
    }

    const nextActivity = compactCases.reduce<Record<string, CaseActivity>>((activity, item) => {
      const saved = localStorage.getItem(`lolvs-comments:${item.title}`);
      const storedComments = saved ? JSON.parse(saved) as CommentItem[] : [];
      activity[item.title] = {
        comments: storedComments.reduce((count, comment) => count + 1 + comment.replies.length, 0),
        likes: storedComments.reduce((count, comment) => count + comment.likes, 0),
      };
      return activity;
    }, {});
    setCaseActivity(nextActivity);
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadCaseActivity(); }, 0);
    const client = supabase;
    if (!client) return () => window.clearTimeout(loadTimer);
    const channel = client
      .channel("home-case-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => void loadCaseActivity())
      .subscribe();
    return () => {
      window.clearTimeout(loadTimer);
      void client.removeChannel(channel);
    };
  }, [loadCaseActivity]);

  useEffect(() => {
    const timer = window.setInterval(() => setJudgeIndex((index) => (index + 1) % topJudges.length), 6000);
    return () => window.clearInterval(timer);
  }, []);
  const filtered = compactCases.filter((item) => item.mode === serviceMode && (category === "전체" || item.category === category) && Boolean(resolvedVerdicts[item.title]) === showResolved);
  const casesPerPage = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / casesPerPage));
  const pageItems = filtered.slice((page - 1) * casesPerPage, page * casesPerPage);
  const showLocal = !showResolved && localCase && localCase.approved !== false && localCase.mode === serviceMode && (category === "전체" || localCase.category === category);
  const currentJudge = topJudges[judgeIndex];
  const moveJudge = (direction: number) => setJudgeIndex((index) => (index + direction + topJudges.length) % topJudges.length);
  return (
    <main className="page-shell clean-home">
      <div className="clean-home-grid">
        <section className="feed-column">
          <header className="clean-home-intro">
            <div>
              <h1>누가 잘못했는지 판정받고,<em>다음 플레이 방법까지 확인하세요.</em></h1>
            </div>
            <button className="clean-write-button" onClick={onSubmit}>글쓰기</button>
          </header>

          <div className="clean-mode-tabs" role="tablist" aria-label="게시판 종류">
            <button role="tab" aria-selected={serviceMode === "judgement"} className={serviceMode === "judgement" ? "active" : ""} onClick={() => { setServiceMode("judgement"); setPage(1); setShowResolved(false); }}>플레이 판정</button>
            <button role="tab" aria-selected={serviceMode === "feedback"} className={serviceMode === "feedback" ? "active" : ""} onClick={() => { setServiceMode("feedback"); setPage(1); setShowResolved(false); }}>플레이 피드백</button>
          </div>

          <div className="clean-toolbar">
            <div className="clean-category-tabs" role="tablist" aria-label="게임 유형">
              {["전체", "솔로랭크", "파티랭크", "내전"].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => { setCategory(item); setPage(1); }}>{item}</button>)}
            </div>
            <div className="clean-toolbar-actions">
              {serviceMode === "judgement" && <button className={showResolved ? "clean-resolved-filter active" : "clean-resolved-filter"} onClick={() => { setShowResolved((value) => !value); setPage(1); }}>{showResolved ? "진행 중" : "판정 완료"}</button>}
              <form className="clean-search" onSubmit={(event) => { event.preventDefault(); if (searchText.trim()) onSearch(searchText.trim()); }}>
                <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="장면 검색" aria-label="사건 검색" />
                <button type="submit" aria-label="검색">⌕</button>
              </form>
            </div>
          </div>

          {showLocal && (
            <button className="uploaded-case-banner" onClick={() => openDetail(true, localCase.title)}>
              <span className="uploaded-thumb">{localVideoUrl ? <video src={localVideoUrl} muted /> : <span>▶</span>}</span>
              <span><small>방금 등록한 사건 · {localCase.category}</small><strong>{localCase.title}</strong><em>{localCase.author} · {localCase.tier} 데모 인증</em></span>
              <b>판결 보기 →</b>
            </button>
          )}

          <div className="clean-case-list">
            {pageItems.map((item) => { const resolved = resolvedVerdicts[item.title]; const activity = caseActivity[item.title] ?? { comments: item.comments, likes: item.likes }; return (
              <button className={resolved ? "clean-case-row case-resolved" : "clean-case-row"} key={item.title} onClick={() => openDetail(false, item.title)}>
                <span className="thumb"><video src={item.video} muted playsInline preload="metadata" /><i>▶</i><small>{item.clip}</small>{resolved && <b className="resolved-stamp">판정 완료</b>}</span>
                <span className="case-copy"><strong>{item.title}</strong><span className="author-line">{item.author}{item.tier && <VerifiedBadge tier={item.tier} inline />}</span><small>{item.category} · {item.meta}{resolved ? ` · ${resolved.side}측 잘못` : ""}</small></span>
                <span className="case-status">
                  {serviceMode === "judgement" ? <span className="row-votes"><small className={resolved ? "resolved-time" : ""}>{resolved ? "판정 완료" : item.time}</small><VoteBar a={item.a} b={item.b} compact /></span> : <span className="feedback-row-summary"><small>{item.time}</small><span><b>전문 피드백 {Math.max(1, Math.round(activity.comments / 24))}개</b><em>댓글 {activity.comments}</em></span></span>}
                  <span className="case-engagement"><span><i className="like-icon" aria-hidden="true">♥</i><b>{activity.likes}</b></span><span><i className="comment-icon" aria-hidden="true" /><b>{activity.comments}</b></span></span>
                </span>
              </button>
            ); })}
            {!filtered.length && !showLocal && <div className="empty-state">이 카테고리의 사건을 준비하고 있습니다.</div>}
          </div>
          {pageCount > 1 && <nav className="pagination" aria-label="사건 목록 페이지">{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} className={page === number ? "active" : ""} onClick={() => { setPage(number); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{number}</button>)}</nav>}
        </section>
        <aside className="clean-right-rail">
          <section className="judge-slider-card" aria-roledescription="carousel" aria-label="인기 판정자">
            <header><span><i /> 인기 판정자</span></header>
            <div className="judge-slide" key={currentJudge.name}>
              <em>TOP {String(judgeIndex + 1).padStart(2, "0")}</em>
              <span className="judge-slide-avatar">{currentJudge.name[0]}</span>
              <strong>{currentJudge.name}<i>✓</i></strong>
              <small>{currentJudge.tier} · {currentJudge.role} · Riot 인증</small>
              <dl>
                <div><dt>수용률</dt><dd>{currentJudge.acceptance}%</dd></div>
                <div><dt>인정</dt><dd>{currentJudge.recognitions.toLocaleString("ko-KR")}</dd></div>
                <div><dt>판정</dt><dd>{currentJudge.judgements}</dd></div>
              </dl>
            </div>
            <footer>
              <button onClick={() => moveJudge(-1)} aria-label="이전 판정자">‹</button>
              <span className="judge-dots">{topJudges.map((judge, index) => <button key={judge.name} className={judgeIndex === index ? "active" : ""} onClick={() => setJudgeIndex(index)} aria-label={`${index + 1}위 ${judge.name}`} />)}</span>
              <em>{judgeIndex + 1} / {topJudges.length}</em>
              <button onClick={() => moveJudge(1)} aria-label="다음 판정자">›</button>
            </footer>
          </section>
          <section className="clean-hot-card">
            <header><h2><i className="live-dot" /> 실시간 인기 글</h2></header>
            <ol>{compactCases.map((post, index) => { const activity = caseActivity[post.title] ?? { comments: post.comments, likes: post.likes }; return <li key={post.title}><button onClick={() => openDetail(false, post.title)}><span className="rank hot">{index + 1}</span><span><strong>{post.title}</strong><small>댓글 {activity.comments} · 좋아요 {activity.likes}</small></span><em className="trend-same">—</em></button></li>; })}</ol>
          </section>
        </aside>
      </div>
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
  const [evidence, setEvidence] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [commentSegments, setCommentSegments] = useState<FeedbackSegment[]>([{ start: 0, end: 5, text: "" }]);
  const [comments, setComments] = useState<CommentItem[]>(viewingLocal ? [] : commentsSeed);
  const [likedComments, setLikedComments] = useState<number[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);
  const [replyText, setReplyText] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; owner: string; label: string } | null>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [composerOpen, setComposerOpen] = useState(false);
  const [recognizedVerdict, setRecognizedVerdict] = useState(false);
  const [recognitionCount, setRecognitionCount] = useState(0);
  const [pendingVote, setPendingVote] = useState<VoteSide | null>(null);
  const [judgeModalOpen, setJudgeModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [expertFeedback, setExpertFeedback] = useState<ExpertFeedbackDraft | null>(null);
  const [localVoteCounts, setLocalVoteCounts] = useState({ A: 0, B: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const title = viewingLocal && localCase ? localCase.title : selectedTitle;
  const selectedCase = compactCases.find((item) => item.title === title);
  const emptyActivityCase = viewingLocal || Boolean(selectedCase);
  const detailMode: CaseMode = viewingLocal && localCase ? localCase.mode : selectedCase?.mode ?? "judgement";
  const resolvedVerdict = detailMode === "judgement" && !viewingLocal ? resolvedVerdicts[title] : undefined;
  const aClaim = viewingLocal && localCase ? localCase.aClaim ?? "" : selectedCase?.aClaim ?? "";
  const bClaim = viewingLocal && localCase ? localCase.bClaim ?? "" : selectedCase?.bClaim ?? "";
  const playThought = viewingLocal && localCase ? localCase.thought ?? "당시 어떤 판단으로 플레이했는지 작성하지 않았습니다." : "라인을 먼저 밀어 두면 상대보다 빠르게 합류할 수 있다고 생각했습니다. 상대 정글 위치를 정확히 확인하지 못했지만, 아군이 바로 교전을 열지는 않을 것으로 판단했습니다.";
  const author = viewingLocal && localCase ? localCase.author : selectedCase?.author ?? "";
  const tier = viewingLocal && localCase ? localCase.tier : selectedCase?.tier ?? "";
  const videoSrc = viewingLocal && localVideoUrl ? localVideoUrl : selectedCase?.video ?? "";
  const localVoteLedgerKey = emptyActivityCase ? `lolvs-local-votes:${title}` : "";
  const voteStorageKey = user ? `lolvs-vote:${user.nickname}:${title}` : "";
  const verdictStorageKey = user ? `lolvs-verdict:${user.nickname}:${title}` : "";
  const feedbackStorageKey = user ? `lolvs-expert-feedback:${user.nickname}:${title}` : "";
  const recognitionStorageKey = user && resolvedVerdict ? `lolvs-recognition:${user.nickname}:${title}` : "";
  const commentStorageKey = `lolvs-comments:${title}`;
  const likedCommentsStorageKey = user ? `lolvs-comment-likes:${user.nickname}:${title}` : "";
  const diamondCase = tier.includes("다이아몬드");
  const judgeRequirement = diamondCase ? "그랜드마스터" : "마스터";
  const canJudge = Boolean(detailMode === "judgement" && user && (user.isAdmin || tierLevel(user.tier) >= (diamondCase ? 8 : 7)));
  const canGiveFeedback = Boolean(detailMode === "feedback" && user && (user.isAdmin || tierLevel(user.tier) >= (diamondCase ? 8 : 7)));
  const localVoteTotal = localVoteCounts.A + localVoteCounts.B;
  const localAPercent = localVoteTotal ? Math.round(localVoteCounts.A / localVoteTotal * 100) : 0;
  const result = emptyActivityCase
    ? { a: localAPercent, b: localVoteTotal ? 100 - localAPercent : 0 }
    : vote === "A" ? { a: 59, b: 41 } : vote === "B" ? { a: 57, b: 43 } : { a: 58, b: 42 };
  const baseCommentCount = detailMode === "feedback" ? feedbackCommentsSeed.length : commentsSeed.length;
  const commentTotal = emptyActivityCase ? comments.length : (detailMode === "feedback" ? 38 : 125) + Math.max(0, comments.length - baseCommentCount);
  const commentPageCount = Math.max(1, Math.ceil(comments.length / 5));
  const visibleComments = comments.slice((commentPage - 1) * 5, commentPage * 5);
  const segmentMax = Math.max(1, Math.floor(videoDuration));

  const loadComments = useCallback(async () => {
    if (supabase) {
      const { data, error } = await supabase
        .from("comments")
        .select("id, case_id, parent_id, nickname, tier, content, evidence, segments, vote, likes, created_at")
        .eq("case_id", title)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("댓글을 불러오지 못했습니다.", error);
        return;
      }
      setComments(mapCommentRows((data ?? []) as CommentRow[]));
    } else {
      const savedComments = localStorage.getItem(commentStorageKey);
      setComments(savedComments ? JSON.parse(savedComments) as CommentItem[] : emptyActivityCase ? [] : detailMode === "feedback" ? feedbackCommentsSeed : commentsSeed);
    }
    setLikedComments(likedCommentsStorageKey ? JSON.parse(localStorage.getItem(likedCommentsStorageKey) ?? "[]") as number[] : []);
    setCommentPage(1);
  }, [commentStorageKey, detailMode, emptyActivityCase, likedCommentsStorageKey, title]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadComments(); }, 0);
    const client = supabase;
    if (!client) return () => window.clearTimeout(loadTimer);
    const channelKey = Array.from(title).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0);
    const channel = client
      .channel(`comments-${channelKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => void loadComments())
      .subscribe();
    return () => {
      window.clearTimeout(loadTimer);
      void client.removeChannel(channel);
    };
  }, [loadComments, title]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVote(null);
      setOfficialVerdict(null);
      setLocalVoteCounts({ A: 0, B: 0 });
      if (localVoteLedgerKey) {
        const ledger = JSON.parse(localStorage.getItem(localVoteLedgerKey) ?? "{}") as Record<string, VoteSide>;
        const sides = Object.values(ledger);
        setLocalVoteCounts({
          A: sides.filter((side) => side === "A").length,
          B: sides.filter((side) => side === "B").length,
        });
        const savedLocalVote = user ? ledger[user.nickname] : undefined;
        if (savedLocalVote === "A" || savedLocalVote === "B") setVote(savedLocalVote);
      }
      if (!voteStorageKey) return;
      const savedVote = localStorage.getItem(voteStorageKey) as VoteSide | null;
      const savedVerdict = localStorage.getItem(verdictStorageKey) as VoteSide | null;
      if (!localVoteLedgerKey && (savedVote === "A" || savedVote === "B")) setVote(savedVote);
      if (savedVerdict === "A" || savedVerdict === "B") setOfficialVerdict(savedVerdict);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [voteStorageKey, verdictStorageKey, localVoteLedgerKey, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecognitionCount(resolvedVerdict?.recognitions ?? 0);
      setRecognizedVerdict(Boolean(recognitionStorageKey && localStorage.getItem(recognitionStorageKey) === "true"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recognitionStorageKey, resolvedVerdict]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExpertFeedback(null);
      if (!feedbackStorageKey || detailMode !== "feedback") return;
      const savedFeedback = localStorage.getItem(feedbackStorageKey);
      if (savedFeedback) setExpertFeedback(JSON.parse(savedFeedback) as ExpertFeedbackDraft);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [feedbackStorageKey, detailMode]);

  const requestOpinionVote = (side: VoteSide) => {
    if (!user) return requireLogin();
    if (vote) return toast("의견 투표는 한 번만 가능하며 변경할 수 없습니다.");
    setPendingVote(side);
  };

  const submitOpinionVote = (side: VoteSide) => {
    setVote(side);
    localStorage.setItem(voteStorageKey, side);
    if (emptyActivityCase && user) {
      const ledger = JSON.parse(localStorage.getItem(localVoteLedgerKey) ?? "{}") as Record<string, VoteSide>;
      ledger[user.nickname] = side;
      localStorage.setItem(localVoteLedgerKey, JSON.stringify(ledger));
      const sides = Object.values(ledger);
      setLocalVoteCounts({
        A: sides.filter((savedSide) => savedSide === "A").length,
        B: sides.filter((savedSide) => savedSide === "B").length,
      });
    }
    setPendingVote(null);
    toast(`${side}측 주장에 동의했습니다.`);
  };

  const submitOfficialVerdict = (draft: JudgeVerdictDraft) => {
    if (!user) return requireLogin();
    if (!canJudge) return toast(`${diamondCase ? "다이아몬드 사건은" : "공식 판결은"} ${judgeRequirement} 이상부터 가능합니다.`);
    if (officialVerdict) return toast("공식 판결은 등록 후 변경할 수 없습니다.");
    setOfficialVerdict(draft.side);
    localStorage.setItem(verdictStorageKey, draft.side);
    localStorage.setItem(`${verdictStorageKey}:document`, JSON.stringify(draft));
    setJudgeModalOpen(false);
    toast(`${draft.side}측 잘못으로 공식 판결과 전체 근거를 등록했습니다.`);
  };

  const submitExpertFeedback = (draft: ExpertFeedbackDraft) => {
    if (!user) return requireLogin();
    if (!canGiveFeedback) return toast(`${diamondCase ? "다이아몬드 플레이는" : "전문 피드백은"} ${judgeRequirement} 이상부터 작성할 수 있습니다.`);
    if (expertFeedback) return toast("이 플레이에 이미 전문 피드백을 등록했습니다.");
    const savedFeedback = { ...draft, author: user.nickname, tier: user.tier, role: user.primaryRole ?? "포지션 미설정" };
    setExpertFeedback(savedFeedback);
    localStorage.setItem(feedbackStorageKey, JSON.stringify(savedFeedback));
    setFeedbackModalOpen(false);
    toast("근거와 다음 플레이 방법을 포함한 전문 피드백을 등록했습니다.");
  };

  const updateCommentSegment = (index: number, patch: Partial<FeedbackSegment>) => {
    setCommentSegments((segments) => segments.map((segment, segmentIndex) => {
      if (segmentIndex !== index) return segment;
      const next = { ...segment, ...patch };
      if (patch.start !== undefined && next.start >= next.end) next.end = Math.min(segmentMax, next.start + 1);
      if (patch.end !== undefined && next.end <= next.start) next.start = Math.max(0, next.end - 1);
      return next;
    }));
  };

  const addCommentSegment = () => {
    if (commentSegments.length >= 5) return toast("영상 구간은 댓글 하나에 최대 5개까지 추가할 수 있습니다.");
    const previous = commentSegments[commentSegments.length - 1];
    const start = Math.min(segmentMax - 1, previous?.end ?? 0);
    const end = Math.min(segmentMax, start + Math.max(1, Math.min(5, segmentMax)));
    setCommentSegments((segments) => [...segments, { start, end, text: "" }]);
  };

  const removeCommentSegment = (index: number) => {
    if (commentSegments.length === 1) return toast("피드백 구간은 하나 이상 필요합니다.");
    setCommentSegments((segments) => segments.filter((_, segmentIndex) => segmentIndex !== index));
  };

  const jumpToSegment = (start: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = start;
    void videoRef.current.play();
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return requireLogin();
    const normalizedSegments = commentSegments.map((segment) => ({
      start: Math.max(0, Math.min(segmentMax, Math.floor(segment.start))),
      end: Math.max(0, Math.min(segmentMax, Math.floor(segment.end))),
      text: segment.text.trim(),
    }));
    if (videoDuration <= 0) return toast("영상 길이를 확인한 뒤 다시 시도해 주세요.");
    if (normalizedSegments.some((segment) => !segment.text)) return toast("각 영상 구간마다 피드백을 작성해 주세요.");
    if (normalizedSegments.some((segment) => segment.end <= segment.start)) return toast("종료 시간은 시작 시간보다 뒤여야 합니다.");
    const item: CommentItem = {
      id: Date.now(),
      name: user.nickname,
      tier: user.tier,
      text: "구간별 피드백",
      evidence: evidence.trim() || undefined,
      segments: normalizedSegments,
      vote: detailMode === "judgement" ? vote ?? undefined : undefined,
      likes: 0,
      replies: [],
    };
    if (supabase) {
      const { error } = await supabase.from("comments").insert({
        case_id: title,
        parent_id: null,
        nickname: item.name,
        tier: item.tier,
        content: item.text,
        evidence: item.evidence ?? null,
        segments: item.segments,
        vote: item.vote ?? null,
      });
      if (error) return toast(`댓글을 저장하지 못했습니다: ${error.message}`);
      await loadComments();
    } else {
      const nextComments = [item, ...comments];
      setComments(nextComments);
      localStorage.setItem(commentStorageKey, JSON.stringify(nextComments));
    }
    setCommentPage(1);
    setComposerOpen(false);
    setEvidence("");
    setCommentSegments([{ start: 0, end: Math.min(5, segmentMax), text: "" }]);
    toast(isSupabaseConfigured ? "댓글을 모든 사용자에게 공개했습니다." : "댓글과 판단 근거를 등록했습니다.");
  };

  const addReply = async (commentId: number) => {
    if (!user) return requireLogin();
    if (!replyText.trim()) return;
    if (supabase) {
      const { error } = await supabase.from("comments").insert({
        case_id: title,
        parent_id: commentId,
        nickname: user.nickname,
        tier: user.tier,
        content: replyText.trim(),
        evidence: null,
        segments: [],
        vote: detailMode === "judgement" ? vote ?? null : null,
      });
      if (error) return toast(`대댓글을 저장하지 못했습니다: ${error.message}`);
      await loadComments();
    } else {
      const nextComments = comments.map((comment) => comment.id === commentId ? { ...comment, replies: [...comment.replies, { id: Date.now(), name: user.nickname, tier: user.tier, text: replyText.trim(), vote: detailMode === "judgement" ? vote ?? undefined : undefined }] } : comment);
      setComments(nextComments);
      localStorage.setItem(commentStorageKey, JSON.stringify(nextComments));
    }
    setExpandedReplies((ids) => ids.includes(commentId) ? ids : [...ids, commentId]);
    setReplyText("");
    setReplyingTo(null);
    toast("대댓글을 등록했습니다.");
  };

  const requestReport = (target: string) => {
    if (!user) return requireLogin();
    setReportTarget(target);
  };

  const deleteComment = async () => {
    if (!user || !deleteTarget) return requireLogin();
    if (!user.isAdmin && deleteTarget.owner !== user.nickname) {
      setDeleteTarget(null);
      return toast("본인이 작성한 댓글만 삭제할 수 있습니다.");
    }
    if (supabase) {
      const { error } = await supabase.from("comments").delete().eq("id", deleteTarget.id);
      if (error) return toast(`댓글을 삭제하지 못했습니다: ${error.message}`);
      await loadComments();
    } else {
      const nextComments = comments
        .filter((comment) => comment.id !== deleteTarget.id)
        .map((comment) => ({ ...comment, replies: comment.replies.filter((reply) => reply.id !== deleteTarget.id) }));
      setComments(nextComments);
      localStorage.setItem(commentStorageKey, JSON.stringify(nextComments));
    }
    setDeleteTarget(null);
    toast("댓글을 삭제했습니다.");
  };

  const likeComment = async (commentId: number) => {
    if (!user) return requireLogin();
    if (likedComments.includes(commentId)) return toast("이미 좋아요를 눌렀습니다.");
    const nextLikedComments = [...likedComments, commentId];
    setLikedComments(nextLikedComments);
    if (likedCommentsStorageKey) localStorage.setItem(likedCommentsStorageKey, JSON.stringify(nextLikedComments));
    if (supabase) {
      const { error } = await supabase.rpc("increment_comment_likes", { target_comment_id: commentId });
      if (error) {
        setLikedComments(likedComments);
        if (likedCommentsStorageKey) localStorage.setItem(likedCommentsStorageKey, JSON.stringify(likedComments));
        return toast(`좋아요를 반영하지 못했습니다: ${error.message}`);
      }
      await loadComments();
    } else {
      const nextComments = comments.map((comment) => comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment);
      setComments(nextComments);
      localStorage.setItem(commentStorageKey, JSON.stringify(nextComments));
    }
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
        <div className="detail-title-row"><div className="detail-title"><span className={detailMode === "judgement" ? "detail-mode-badge judgement" : "detail-mode-badge feedback"}>{detailMode === "judgement" ? "플레이 판정" : "플레이 피드백"}</span>{resolvedVerdict && <span className="detail-resolved-badge">판결 완료 · {resolvedVerdict.side}측 잘못</span>}<h1>{title}</h1></div><div className="detail-title-actions"><button className="inline-report" onClick={() => requestReport("게시물")}>⚑ 게시물 신고</button>{canJudge && !resolvedVerdict && <button className={officialVerdict ? "judge-jump-button submitted" : "judge-jump-button"} disabled={Boolean(officialVerdict)} onClick={() => setJudgeModalOpen(true)}>{officialVerdict ? "판결 제출 완료" : "판결하기"}</button>}{canGiveFeedback && <button className={expertFeedback ? "expert-feedback-button submitted" : "expert-feedback-button"} disabled={Boolean(expertFeedback)} onClick={() => setFeedbackModalOpen(true)}>{expertFeedback ? "피드백 제출 완료" : "피드백 주기"}</button>}</div></div>
        <div className="detail-post-meta"><div className="author"><span className="avatar small">{author[0]}</span><span className="post-author-copy"><small>작성자</small><strong>{author}</strong></span>{tier && <VerifiedBadge tier={tier} demo={emptyActivityCase} inline />}</div><span className="post-view-count">조회수 <b>{emptyActivityCase ? 0 : "3,842"}</b></span></div>
        <div className="video-card real-video">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const duration = Math.max(1, Math.floor(event.currentTarget.duration));
              setVideoDuration(duration);
              setCommentSegments((segments) => segments.map((segment, index) => (
                index === 0 && segment.start === 0 && segment.end === 5 && !segment.text
                  ? { ...segment, end: Math.min(5, duration) }
                  : { ...segment, start: Math.min(segment.start, duration - 1), end: Math.min(Math.max(segment.end, 1), duration) }
              )));
            }}
          >
            브라우저가 영상을 지원하지 않습니다.
          </video>
        </div>
        {detailMode === "judgement" && <section className="positions-card main-positions-card">
          <header><h2>양측 주장</h2></header>
          <div className="positions-body">
            <article className="position-item position-a"><div className="position-label"><b>A</b><strong>A측 주장</strong></div><p>{aClaim}</p></article>
            <div className="position-divider"><span>VS</span></div>
            <article className="position-item position-b"><div className="position-label"><b>B</b><strong>B측 주장</strong></div><p>{bClaim}</p></article>
          </div>
        </section>}
        {resolvedVerdict && <section className="inline-resolved-verdict official-verdict-document">
          <header><div><span>OFFICIAL VERDICT · 판결 완료</span><h2><b>{resolvedVerdict.side}측 잘못</b>으로 공식 판결했습니다.</h2></div><time>{resolvedVerdict.decidedAt}</time></header>
          <div className="verdict-document-body">
            <aside className="verdict-judge-profile"><div className="verdict-judge-name"><span>{resolvedVerdict.judge[0]}</span><div><small>공식 판정자</small><strong>{resolvedVerdict.judge}<i>✓</i></strong><em>{resolvedVerdict.judgeTier} · {resolvedVerdict.judgeRole}</em></div></div><dl><div><dt>최고 티어</dt><dd>{resolvedVerdict.peakTier}</dd></div><div><dt>{resolvedVerdict.judgeRole} 판정</dt><dd>{resolvedVerdict.positionJudgements}회</dd></div><div><dt>판정 수용률</dt><dd>{resolvedVerdict.acceptance}%</dd></div></dl></aside>
            <div className="verdict-evidence-grid"><article><span>01</span><div><b>핵심 타임스탬프</b><p>{resolvedVerdict.timestamp}</p></div></article><article><span>02</span><div><b>당시 확인할 수 있었던 정보</b><p>{resolvedVerdict.visibleInfo}</p></div></article><article className="wide"><span>03</span><div><b>판단의 근거</b><p>{resolvedVerdict.reason}</p></div></article><article className="wide next-play"><span>04</span><div><b>다음에 더 나은 선택</b><p>{resolvedVerdict.nextChoice}</p></div></article></div>
          </div>
          <footer><span className="verdict-confidence"><small>판정 확신도</small><b>{resolvedVerdict.confidence}%</b><i><em style={{ width: `${resolvedVerdict.confidence}%` }} /></i></span><button className={recognizedVerdict ? "recognition-button recognized" : "recognition-button"} onClick={recognizeOfficialVerdict}><span>{recognizedVerdict ? "♥" : "♡"}</span><b>{recognizedVerdict ? "이 판결을 인정했습니다" : "이 판결 인정"}</b><em>{recognitionCount.toLocaleString("ko-KR")}</em></button></footer>
        </section>}
        {detailMode === "feedback" && expertFeedback && <section className="expert-feedback-document">
          <header><span>EXPERT FEEDBACK</span><h2>상위 티어가 남긴 플레이 개선안</h2><small>{expertFeedback.author ?? user?.nickname} · {expertFeedback.tier ?? user?.tier} · {expertFeedback.role ?? user?.primaryRole}</small></header>
          <div><article><span>01</span><b>핵심 장면</b><p>{expertFeedback.timestamp}</p></article><article><span>02</span><b>확인한 정보</b><p>{expertFeedback.observedInfo}</p></article><article><span>03</span><b>플레이 분석과 근거</b><p>{expertFeedback.analysis}</p></article><article className="next-play"><span>04</span><b>다음 플레이 방법</b><p>{expertFeedback.nextChoice}</p></article></div>
        </section>}

        <section className="comments-section">
          <div className="comments-heading"><div><h2>댓글 <b>{commentTotal}</b></h2><span>{detailMode === "judgement" ? "영상 구간별 근거 · 투표 시 선택 공개" : "영상 구간별로 플레이 피드백을 남길 수 있습니다."}</span></div><button onClick={() => { if (!user) requireLogin(); else setComposerOpen(!composerOpen); }}>{composerOpen ? "닫기" : "댓글 쓰기"}</button></div>
          {composerOpen && user && <form className="comment-composer segment-comment-composer" onSubmit={addComment}>
            <div className="segment-composer-head">
              <div><span>VIDEO FEEDBACK</span><strong>영상 구간별로 피드백을 남겨주세요.</strong><small>전체 영상 {videoDuration > 0 ? formatVideoTime(videoDuration) : "길이 확인 중"}</small></div>
              <button type="button" onClick={addCommentSegment}>+ 구간 추가</button>
            </div>
            <div className="segment-editor-list">
              {commentSegments.map((segment, index) => <article className="segment-editor" key={index}>
                <header><span>PART {String(index + 1).padStart(2, "0")}</span><strong>{formatVideoTime(segment.start)} — {formatVideoTime(segment.end)}</strong>{commentSegments.length > 1 && <button type="button" onClick={() => removeCommentSegment(index)}>삭제</button>}</header>
                <div className="segment-time-controls">
                  <label><span>시작 시간 <b>{formatVideoTime(segment.start)}</b></span><input type="range" min="0" max={segmentMax} step="1" value={segment.start} onChange={(event) => updateCommentSegment(index, { start: Number(event.target.value) })} aria-label={`파트 ${index + 1} 시작 시간`} /></label>
                  <label><span>종료 시간 <b>{formatVideoTime(segment.end)}</b></span><input type="range" min="0" max={segmentMax} step="1" value={segment.end} onChange={(event) => updateCommentSegment(index, { end: Number(event.target.value) })} aria-label={`파트 ${index + 1} 종료 시간`} /></label>
                </div>
                <textarea value={segment.text} onChange={(event) => updateCommentSegment(index, { text: event.target.value })} placeholder="이 구간에서 보인 판단과 더 나은 플레이 방법을 적어주세요." aria-label={`파트 ${index + 1} 피드백`} />
              </article>)}
            </div>
            <div className={detailMode === "feedback" ? "segment-summary-fields feedback-summary" : "segment-summary-fields"}>
              {detailMode === "judgement" && <input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="판단 근거 요약 (선택)" aria-label="판단 근거 요약" />}
              <button className="segment-comment-submit" type="submit">피드백 등록</button>
            </div>
          </form>}
          {visibleComments.map((item, index) => (
            <article className="comment parent-comment" key={item.id}>
              <span className="comment-avatar">{item.name[0]}</span>
              <div>
                <div className="comment-meta"><strong>{item.name}</strong><VerifiedBadge tier={item.tier} demo={item.name === user?.nickname} inline />{detailMode === "judgement" && <OpinionBadge side={activityVoteFor(item.name, item.vote)} />}<small>{(commentPage - 1) * 5 + index + 1}시간 전</small></div>
                {item.text !== "구간별 피드백" && <p>{item.text}</p>}
                {item.segments && item.segments.length > 0 && <div className="segment-feedback-list">
                  {item.segments.map((segment, segmentIndex) => <article key={`${item.id}-${segmentIndex}`}>
                    <button type="button" onClick={() => jumpToSegment(segment.start)}><span>▶</span>{formatVideoTime(segment.start)}–{formatVideoTime(segment.end)}</button>
                    <p>{segment.text}</p>
                  </article>)}
                </div>}
                {item.evidence && <blockquote><b>판단 근거 요약</b>{item.evidence}</blockquote>}
                <div className="comment-actions"><button className={likedComments.includes(item.id) ? "liked" : ""} onClick={() => likeComment(item.id)}>{likedComments.includes(item.id) ? "♥" : "♡"} {item.likes}</button>{item.replies.length > 0 && <button className="reply-toggle" onClick={() => toggleReplies(item.id)}>{expandedReplies.includes(item.id) ? "답글 접기" : `답글 ${item.replies.length}개 보기`}</button>}<button onClick={() => { if (!user) return requireLogin(); setReplyingTo(replyingTo === item.id ? null : item.id); setExpandedReplies((ids) => ids.includes(item.id) ? ids : [...ids, item.id]); }}>답글 달기</button>{user && (user.isAdmin || item.name === user.nickname) && <button className="comment-delete" onClick={() => setDeleteTarget({ id: item.id, owner: item.name, label: `${item.name}님의 댓글` })}>삭제</button>}<button className="comment-report" onClick={() => requestReport(`${item.name}님의 댓글`)}>신고</button></div>
                {expandedReplies.includes(item.id) && item.replies.map((reply) => <div className="reply" key={reply.id}><span className="reply-arrow">↳</span><span className="comment-avatar">{reply.name[0]}</span><div className="reply-body"><div className="reply-head"><span><em>답글</em><strong>{reply.name}</strong><VerifiedBadge tier={reply.tier} demo={reply.name === user?.nickname} inline />{detailMode === "judgement" && <OpinionBadge side={activityVoteFor(reply.name, reply.vote)} />}</span><span className="reply-management">{user && (user.isAdmin || reply.name === user.nickname) && <button className="reply-delete" onClick={() => setDeleteTarget({ id: reply.id, owner: reply.name, label: `${reply.name}님의 대댓글` })}>삭제</button>}<button className="reply-report" onClick={() => requestReport(`${reply.name}님의 대댓글`)}>신고</button></span></div><p>{reply.text}</p></div></div>)}
                {replyingTo === item.id && <div className="reply-form"><input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`${item.name}님에게 답글 남기기`} aria-label="대댓글 작성" /><button onClick={() => addReply(item.id)}>등록</button></div>}
              </div>
            </article>
          ))}
          {comments.length === 0 && <div className="comments-empty"><strong>아직 댓글이 없습니다.</strong><span>첫 번째 의견을 남겨보세요.</span></div>}
        </section>
        {comments.length > 0 && <nav className="comment-pagination standalone-comment-pagination" aria-label="댓글 페이지">{Array.from({ length: commentPageCount }, (_, index) => index + 1).map((number) => <button key={number} className={commentPage === number ? "active" : ""} onClick={() => setCommentPage(number)}>{number}</button>)}</nav>}
      </section>

      <aside className="vote-rail">
        {detailMode === "judgement" ? <>
          {resolvedVerdict ? <section className="vote-card resolved-opinion-card"><div className="deadline resolved-deadline">투표 마감 · 최종 의견</div><div className="vote-body current-result"><h2>커뮤니티 투표 결과</h2><VoteBar a={result.a} b={result.b} /><p className="closed-vote-note">총 1,313명 참여 · 투표가 종료되었습니다.</p></div></section> : <section className="vote-card"><div className="deadline">◷ 마감까지 <strong>2일 14시간</strong></div><div className="vote-body current-result"><h2>어느 주장에 동의하나요?</h2><VoteBar a={result.a} b={result.b} />{emptyActivityCase && <p className="local-vote-total">현재 <b>{localVoteTotal}</b>명 참여</p>}<div className="opinion-vote-buttons"><button className={vote === "A" ? "a chosen" : "a"} onClick={() => requestOpinionVote("A")}>A 동의</button><button className={vote === "B" ? "b chosen" : "b"} onClick={() => requestOpinionVote("B")}>B 동의</button></div><p className="vote-hint">티어와 관계없이 모든 인증 사용자가 한 번씩 참여할 수 있습니다.</p>{vote && <p className="my-vote">내 의견: <b>{vote}측 주장에 동의</b></p>}</div></section>}
          <section className="guide-card"><h2>참여 가이드</h2><ul><li>의견 투표와 댓글은 모든 인증 사용자가 참여합니다.</li><li>공식 판결은 마스터 이상, 다이아 사건은 그랜드마스터 이상만 가능합니다.</li><li>비난보다 다음 플레이에 도움 되는 근거를 남겨 주세요.</li></ul></section>
        </> : <>
          <section className="feedback-intent-card"><header><span>작성자의 생각</span><h2>이렇게 판단하고 플레이했습니다.</h2></header><p>{playThought}</p><footer>결과가 아니라 당시 의도를 기준으로 피드백해 주세요.</footer></section>
          <section className="guide-card feedback-participation-guide"><h2>플레이 피드백 참여 가이드</h2><ul><li>댓글은 모든 인증 사용자가 자유롭게 참여합니다.</li><li>전문 피드백은 마스터 이상만 작성할 수 있습니다.</li><li>다이아몬드 플레이는 그랜드마스터 이상이 피드백합니다.</li><li>타임스탬프와 근거, 다음 플레이 방법을 함께 남겨 주세요.</li></ul></section>
        </>}
      </aside>
      {reportTarget && <ReportModal target={reportTarget} close={() => setReportTarget(null)} onSubmit={(reason) => { const target = reportTarget; setReportTarget(null); toast(`${target} 신고가 접수되었습니다: ${reason}`); }} />}
      {deleteTarget && <DeleteCommentModal label={deleteTarget.label} close={() => setDeleteTarget(null)} confirm={() => void deleteComment()} />}
      {pendingVote && <VoteConfirmModal side={pendingVote} close={() => setPendingVote(null)} confirm={() => submitOpinionVote(pendingVote)} />}
      {judgeModalOpen && <JudgeVerdictModal close={() => setJudgeModalOpen(false)} requirement={judgeRequirement} submit={submitOfficialVerdict} />}
      {feedbackModalOpen && <ExpertFeedbackModal close={() => setFeedbackModalOpen(false)} requirement={judgeRequirement} submit={submitExpertFeedback} />}
    </main>
  );
}

function PersonalActivityMetric({ value }: { value: string }) {
  const [votes, matches] = value.split(" / ");
  return <span className="personal-activity-metric"><span><b>{votes}</b><small>참여</small></span><i /><span><b>{matches}</b><small>합의 일치</small></span></span>;
}

function Ranking({ personalRanking }: { personalRanking: string[][] }) {
  const [mode, setMode] = useState<"personal" | "judge">("personal");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [rankingPage, setRankingPage] = useState(1);
  const ranking = mode === "personal" ? personalRanking : judgeRankingSeed;
  const rankingPageSize = 20;
  const rankingPageCount = Math.max(1, Math.ceil(ranking.length / rankingPageSize));
  const visibleRanking = ranking.slice((rankingPage - 1) * rankingPageSize, rankingPage * rankingPageSize);
  const candidates = ranking.map((row, index) => ({ rank: index + 1, name: row[0], tier: row[1], metricA: row[2], metricB: row[3], points: row[4] }));
  const match = searched ? candidates.find((item) => item.name.toLowerCase() === query.trim().toLowerCase()) : undefined;
  const changeMode = (nextMode: "personal" | "judge") => { setMode(nextMode); setSearched(false); setQuery(""); setRankingPage(1); };
  return (
    <main className="page-shell section-page ranking-page">
      <div className="ranking-toolbar">
        <div className="ranking-tabs" role="tablist" aria-label="랭킹 종류">
          <button role="tab" aria-selected={mode === "personal"} className={mode === "personal" ? "active personal" : "personal"} onClick={() => changeMode("personal")}><b>개인 랭킹</b></button>
          <button role="tab" aria-selected={mode === "judge"} className={mode === "judge" ? "active judge" : "judge"} onClick={() => changeMode("judge")}><b>판결자 랭킹</b></button>
        </div>
        <form className="rank-inline-search" onSubmit={(event) => { event.preventDefault(); setSearched(Boolean(query.trim())); }}>
          <label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} placeholder="닉네임으로 찾기" aria-label="랭킹에서 닉네임으로 찾기" /></label>
          <button type="submit">검색</button>
        </form>
      </div>
      {searched && (match ? <section className="rank-result"><b>{match.rank}위</b><span className="avatar">{match.name[0]}</span><div><strong>{match.name} · {match.points}P</strong><small>{match.tier} · {mode === "personal" ? `투표 참여 ${match.metricA.split(" / ")[0]}회 · 합의 일치 ${match.metricA.split(" / ")[1]}회` : `받은 인정 ${match.metricB}`}</small></div><em>{match.rank <= 5 ? "TOP 5" : "상위 31%"}</em></section> : <div className="rank-empty">일치하는 사용자를 찾지 못했습니다. 닉네임을 다시 확인해 주세요.</div>)}
      {mode === "personal" ? <section className="score-rules personal-score-rules"><div><b>+5</b><span>의견 투표 참여</span></div><div><b>+15</b><span>최종 합의와 일치</span></div><div><b>+1</b><span>판단 근거 공감</span></div><div><b>-20</b><span>신고 제재 확정</span></div></section> : <section className="score-rules judge-score-rules"><div><b>+5</b><span>공식 판결 참여</span></div><div><b>+1</b><span>판결·근거 인정</span></div><div><b>-100</b><span>신고 제재 확정</span></div><div><b>OUT</b><span>누적 -100점<br />자격 박탈 · 판결 금지</span></div></section>}
      <section className="ranking-card elite-ranking">
        <div className="ranking-head"><span>순위</span><span>{mode === "personal" ? "플레이어" : "판결자"}</span><span>{mode === "personal" ? "투표 활동" : "판결 참여"}</span><span>{mode === "personal" ? "근거 공감" : "받은 인정"}</span><span>점수</span></div>
        {visibleRanking.map((row, index) => { const rank = (rankingPage - 1) * rankingPageSize + index + 1; return <div className={rank <= 3 ? `ranking-row podium rank-${rank}` : "ranking-row"} key={row[0]}><b className="rank-number"><span>{["1ST", "2ND", "3RD"][rank - 1] ?? ""}</span>{rank}</b><span className="rank-player"><strong>{row[0]}</strong><small>{row[1]} · {mode === "personal" ? "인증" : "판결 자격"}</small></span>{mode === "personal" ? <PersonalActivityMetric value={row[2]} /> : <span>{row[2]}</span>}<span>{row[3]}</span><strong>{row[4]}P</strong></div>; })}
        {!ranking.length && <div className="rank-empty">아직 집계된 랭킹이 없습니다.</div>}
      </section>
      {ranking.length > rankingPageSize && <nav className="ranking-pagination" aria-label="랭킹 페이지">{Array.from({ length: rankingPageCount }, (_, index) => index + 1).map((number) => <button key={number} className={rankingPage === number ? "active" : ""} onClick={() => { setRankingPage(number); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{number}</button>)}</nav>}
    </main>
  );
}

function Guide() {
  return <main className="page-shell section-page guide-page">
    <section className="guide-intro"><span>처음 오셨나요?</span><h1><b>억울함을 풀고,</b><em>다음 플레이는 더 선명하게.</em></h1><p>짧은 장면을 함께 보고 더 나은 선택을 찾습니다.</p></section>
    <section className="guide-section usage-guide"><div className="guide-section-heading"><span>사용 순서</span><h2><b>장면에서</b><em>답변까지</em></h2></div><div className="usage-steps"><article><b>01</b><div><strong>유형 선택</strong><small>플레이 판정 또는 피드백</small></div></article><article><b>02</b><div><strong>장면과 생각 확인</strong><small>영상·양측 입장·플레이 의도</small></div></article><article><b>03</b><div><strong>의견 나누기</strong><small>투표와 댓글은 모두 참여</small></div></article><article><b>04</b><div><strong>전문 답변 확인</strong><small>공식 판결 또는 상위 티어 피드백</small></div></article></div></section>
    <section className="guide-section policy-board"><div className="guide-section-heading"><span>참여 권한</span><h2><b>누가 무엇을</b><em>할 수 있나요?</em></h2></div><div className="policy-cards"><article className="policy-opinion"><span className="policy-token">01</span><div><h3>의견 투표 · 댓글</h3><p>A/B 의견 또는 자유로운 댓글</p></div><strong>모든 인증 사용자</strong></article><article className="policy-verdict"><span className="policy-token">02</span><div><h3>공식 판결</h3><p>누가 더 잘못했는지 근거로 판단</p></div><strong>마스터 이상</strong></article><article className="policy-feedback"><span className="policy-token">03</span><div><h3>전문 피드백</h3><p>플레이 분석과 다음 선택 제안</p></div><strong>마스터 이상</strong></article><article className="policy-submit"><span className="policy-token">04</span><div><h3>게시글 작성</h3><p>영상과 상황 또는 플레이 의도 등록</p></div><strong>다이아 이하</strong></article></div><p className="diamond-policy-note">다이아몬드 사용자의 플레이 판결과 전문 피드백은 그랜드마스터 이상만 작성할 수 있습니다.</p></section>
    <section className="guide-privacy"><span className="privacy-shield">✓</span><div><small>티어는 인증하고, 활동은 자유롭게</small><h2>Riot ID 대신 사이트 닉네임으로 참여합니다.</h2><p>실제 계정과 티어는 인증에만 사용하고 게시글·투표·댓글에는 선택한 활동 닉네임이 표시됩니다.</p></div></section>
    <div className="guide-grid guide-core-grid">
      <section className="guide-panel guide-choice-panel">
        <header><span>게시판 선택</span><h2>어떤 방식으로 도움받을까요?</h2><p>글을 올릴 때 원하는 결과에 맞춰 유형을 선택합니다.</p></header>
        <div className="guide-choice-list">
          <article><span>01</span><div><b>플레이 판정</b><p>누가 더 잘못했는지 A/B 책임을 판단받습니다.</p></div><em>A/B 책임</em></article>
          <article><span>02</span><div><b>플레이 피드백</b><p>잘못을 가리기보다 장단점과 다음 선택을 확인합니다.</p></div><em>성장·복기</em></article>
        </div>
      </section>
      <section className="guide-panel guide-result-panel">
        <header><span>답변 구분</span><h2>일반 참여와 전문 답변은 다릅니다.</h2><p>모두가 남기는 의견과 자격을 갖춘 상위 티어의 답변을 구분합니다.</p></header>
        <div className="guide-result-flow">
          <article><span>참여</span><b>투표 · 댓글</b><p>모든 인증 사용자가 의견을 자유롭게 남깁니다.</p></article>
          <i>→</i>
          <article><span>전문</span><b>판결 · 피드백</b><p>상위 티어가 근거와 다음 플레이 방법을 작성합니다.</p></article>
        </div>
        <div className="verdict-essentials" aria-label="전문 답변 필수 항목"><span>타임스탬프</span><span>확인 정보</span><span>판단 근거</span><span>다음 선택</span></div>
      </section>
    </div>
    <section className="faq"><h2>서비스 안내</h2><details open><summary>티어는 정말 인증되나요?</summary><p>현재 공개 버전은 Riot API 연결 전이라 사용자가 선택한 티어를 ‘데모 인증’으로 표시합니다. 실제 서비스에서는 Riot 인증 결과로 권한을 결정할 예정입니다.</p></details><details><summary>업로드한 영상은 어디에 저장되나요?</summary><p>현재 프로토타입에서는 선택한 기기의 브라우저에만 저장됩니다. 서버 업로드는 백엔드 연결 후 제공됩니다.</p></details></section>
  </main>;
}

function SearchResults({ query, openDetail, localCase }: { query: string; openDetail: (local?: boolean, title?: string) => void; localCase: LocalCase | null }) {
  const keyword = query.toLowerCase();
  const cases = [
    ...(localCase ? [{ title: localCase.title, category: localCase.category, local: true }] : []),
    ...compactCases.map((item) => ({ title: item.title, category: item.category, local: false })),
  ].filter((item, index, array) => item.title.toLowerCase().includes(keyword) && array.findIndex((other) => other.title === item.title) === index);
  return <main className="page-shell section-page search-page"><div className="search-heading"><span>사건 검색</span><h1>“{query}” 검색 결과</h1><p>진행 중인 사건과 실시간 인기 판결에서 찾았습니다.</p></div><section className="search-result-section"><div><h2>사건</h2><b>{cases.length}</b></div>{cases.length ? <div className="search-result-list">{cases.map((item) => <button key={item.title} onClick={() => openDetail(item.local, item.title)}><span>판결</span><strong>{item.title}</strong><small>{item.category} · 사건 열기 →</small></button>)}</div> : <p className="search-none">일치하는 사건이 없습니다.</p>}</section></main>;
}

function SubmitCase({ setView, toast, user, onSubmitted }: { setView: (view: View) => void; toast: (message: string) => void; user: User; onSubmitted: (item: LocalCase, url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<CaseMode>("judgement");
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
    if (isMasterPlus(user.tier) && !user.isAdmin) return toast("마스터 이상은 공식 판결자 역할로 참여하며 사건을 작성할 수 없습니다.");
    if (!file) return toast("실제 영상 파일을 선택해 주세요.");
    const form = new FormData(event.currentTarget);
    const item: LocalCase = { title: String(form.get("title")), mode, category: String(form.get("category")), aClaim: String(form.get("aClaim") ?? ""), bClaim: String(form.get("bClaim") ?? ""), thought: String(form.get("thought") ?? ""), author: user.nickname, tier: user.tier, approved: Boolean(user.isAdmin) };
    setSaving(true);
    try { await storeVideo(file); localStorage.setItem(CASE_KEY, JSON.stringify(item)); onSubmitted(item, preview); toast(user.isAdmin ? "관리자 게시물이 바로 등록되었습니다." : "영상이 접수되었습니다. 관리자 승인 후 공개됩니다."); setView("home"); } catch { toast("영상을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); } finally { setSaving(false); }
  };
  return <main className="submit-page page-shell"><button className="back-link" onClick={() => setView("home")}>← 홈으로</button><div className="submit-heading"><h1>어떤 도움을 받고 싶나요?</h1><p>판정을 받을지, 플레이를 지적받고 성장할지 먼저 선택해 주세요.</p></div><form className="submit-form" onSubmit={submit}><section><label>1. 게시글 유형</label><div className="case-mode-choice"><label><input type="radio" name="mode" value="judgement" checked={mode === "judgement"} onChange={() => setMode("judgement")} /><span><b>플레이 판정</b><small>누가 더 잘못했는지 공식 판정과 근거를 받습니다.</small></span></label><label><input type="radio" name="mode" value="feedback" checked={mode === "feedback"} onChange={() => setMode("feedback")} /><span><b>플레이 피드백</b><small>잘한 점과 문제점, 다음 플레이 방법을 받습니다.</small></span></label></div></section><section><label>2. 영상 업로드</label><input ref={inputRef} className="sr-only" type="file" accept="video/*" onChange={chooseFile} />{preview ? <div className="upload-preview"><video src={preview} controls /><button type="button" onClick={() => inputRef.current?.click()}>영상 다시 선택</button></div> : <button type="button" className="upload-box" onClick={() => inputRef.current?.click()}><span>↥</span><strong>내 기기에서 실제 영상 선택</strong><small>MP4, WebM 등 · 200MB 이하 권장</small></button>}</section><section><label htmlFor="case-title">3. 게시글 제목</label><input id="case-title" name="title" required placeholder={mode === "judgement" ? "예: 바론 스틸 시도, 미드가 잘못한 걸까요?" : "예: 이 장면에서 더 좋은 선택이 있었을까요?"} /></section><section><label htmlFor="case-category">4. 게임 카테고리</label><select id="case-category" name="category" defaultValue="솔로랭크"><option>솔로랭크</option><option>파티랭크</option><option>내전</option></select></section>{mode === "judgement" ? <div className="form-split"><section><label htmlFor="a-claim">5. A측 상황</label><textarea id="a-claim" name="aClaim" required placeholder="A측에서 본 상황과 판단을 적어주세요." /></section><section><label htmlFor="b-claim">6. B측 상황</label><textarea id="b-claim" name="bClaim" required placeholder="B측에서 본 상황과 판단을 적어주세요." /></section></div> : <section className="play-thought-field"><label htmlFor="play-thought">5. 당시 플레이 의도와 고민</label><textarea id="play-thought" name="thought" required placeholder="왜 이런 선택을 했는지, 당시 무엇을 보고 어떤 결과를 기대했는지 적어주세요." /><small>상위 티어 피드백 제공자가 결과가 아닌 당시 판단을 이해하는 데 사용합니다.</small></section>}<section><label>{mode === "judgement" ? "7" : "6"}. 참여 기간</label><div className="duration"><label><input type="radio" name="duration" value="1" />1일</label><label><input type="radio" name="duration" value="3" defaultChecked />3일</label><label><input type="radio" name="duration" value="7" />7일</label></div></section><div className="submit-notice"><span>ⓘ</span><p><strong>{user.isAdmin ? "관리자 게시" : "관리자 승인 후 공개"}</strong><br />{user.isAdmin ? "관리자 계정으로 등록한 게시물은 바로 공개됩니다." : "일반 사용자의 영상은 승인 관리 화면에서 확인한 뒤 공개됩니다."}</p></div><button type="submit" className="primary-button full" disabled={saving}>{saving ? "영상 저장 중…" : user.isAdmin ? "게시글 바로 등록하기" : "관리자 승인 요청하기"}</button></form></main>;
}

function AdminApproval({ localCase, localVideoUrl, approve, remove, openDetail }: { localCase: LocalCase | null; localVideoUrl: string; approve: () => void; remove: () => void; openDetail: () => void }) {
  const pending = localCase?.approved === false;
  return <main className="page-shell section-page admin-approval-page"><div className="section-heading"><span>ADMIN</span><h1>게시물 승인 관리</h1><p>사용자가 올린 영상과 내용을 확인한 뒤 공개 여부를 결정합니다.</p></div>{!localCase ? <section className="approval-empty"><strong>검토 대기 0건</strong><p>새로 접수된 영상이 없습니다.</p></section> : <section className="approval-card"><div className="approval-video">{localVideoUrl ? <video src={localVideoUrl} controls playsInline /> : <span>영상을 불러오는 중입니다.</span>}</div><div className="approval-copy"><span className={localCase.mode === "judgement" ? "detail-mode-badge judgement" : "detail-mode-badge feedback"}>{localCase.mode === "judgement" ? "플레이 판정" : "플레이 피드백"}</span><h2>{localCase.title}</h2><p>{localCase.author} · {localCase.tier} · {localCase.category}</p><strong className={pending ? "pending-status" : "approved-status"}>{pending ? "승인 대기 중" : "현재 공개 중"}</strong><div className="approval-actions"><button className="secondary-button" onClick={openDetail}>내용 미리보기</button><button className="danger-button" onClick={remove}>게시물·영상 삭제</button>{pending && <button className="primary-button" onClick={approve}>게시 승인</button>}</div></div></section>}</main>;
}

function LoginModal({ close, onLogin }: { close: () => void; onLogin: (user: User) => void }) {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tier, setTier] = useState("다이아몬드 IV");
  const [peakTier, setPeakTier] = useState("다이아몬드");
  const [primaryRole, setPrimaryRole] = useState("정글");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanNickname = nickname.trim();
    if (cleanNickname.length < 2 || password.length < 4) return setLoginError("닉네임과 비밀번호 4자리를 입력해주세요.");
    if (cleanNickname === "루크") {
      if (password !== "0091") return setLoginError("관리자 비밀번호가 올바르지 않습니다.");
      return onLogin({ nickname: "루크", tier: "관리자", peakTier: "관리자", isAdmin: true });
    }
    onLogin({ nickname: cleanNickname, tier, peakTier, primaryRole, isAdmin: false });
  };
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal login-modal judge-profile-login" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="profile-emblem">VS</span><h2 id="login-title">로그인</h2><p>게시글은 누구나 볼 수 있습니다. 댓글과 영상 등록은 로그인 후 이용해주세요.</p><label>사이트 활동 닉네임<input value={nickname} onChange={(event) => { setNickname(event.target.value); setLoginError(""); }} minLength={2} maxLength={12} required placeholder="2~12자" /></label><label>비밀번호<input value={password} onChange={(event) => { setPassword(event.target.value); setLoginError(""); }} minLength={4} maxLength={12} required type="password" placeholder="4자리 이상" /></label>{nickname.trim() !== "루크" && <><div className="login-profile-grid"><label>현재 티어<select value={tier} onChange={(event) => setTier(event.target.value)}>{["아이언 I", "브론즈 I", "실버 I", "골드 IV", "플래티넘 IV", "에메랄드 IV", "다이아몬드 IV", "마스터", "그랜드마스터", "챌린저"].map((item) => <option key={item}>{item}</option>)}</select></label><label>최고 티어<select value={peakTier} onChange={(event) => setPeakTier(event.target.value)}>{["골드", "플래티넘", "에메랄드", "다이아몬드", "마스터", "그랜드마스터", "챌린저"].map((item) => <option key={item}>{item}</option>)}</select></label></div><label>주 포지션<select value={primaryRole} onChange={(event) => setPrimaryRole(event.target.value)}>{["탑", "정글", "미드", "원딜", "서포터"].map((item) => <option key={item}>{item}</option>)}</select></label></>} {loginError && <p className="login-error">{loginError}</p>}<div className="demo-warning">{nickname.trim() === "루크" ? <><b>관리자 로그인</b> · 승인 관리 권한으로 접속합니다.</> : <>현재 계정과 티어 정보는 프로토타입용 <b>데모 인증</b>입니다.</>}</div><button className="primary-button full" type="submit">로그인하기</button></form></div>;
}

function ProfileModal({ user, close, logout }: { user: User; close: () => void; logout: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="profile-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className="modal-close" onClick={close} aria-label="닫기">×</button><span className="profile-emblem">{user.nickname[0]}</span><h2 id="profile-title">{user.nickname}</h2>{user.isAdmin ? <span className="admin-profile-badge">LOL.VS 관리자</span> : <VerifiedBadge tier={user.tier} demo />}<div className="profile-play-info"><span><small>{user.isAdmin ? "계정" : "최고 티어"}</small><b>{user.isAdmin ? "관리자" : user.peakTier ?? user.tier}</b></span><span><small>{user.isAdmin ? "권한" : "주 포지션"}</small><b>{user.isAdmin ? "게시물 승인 · 판결" : user.primaryRole ?? "미설정"}</b></span></div><button className="secondary-button full" onClick={logout}>로그아웃</button></section></div>;
}

function ReportModal({ target, close, onSubmit }: { target: string; close: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("욕설 또는 인신공격");
  const [details, setDetails] = useState("");
  const type = target === "게시물" ? "게시물" : "댓글";
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal report-modal" onSubmit={(event) => { event.preventDefault(); if (details.trim()) onSubmit(`${reason} · ${details.trim()}`); }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="profile-emblem report-icon">!</span><h2 id="report-title">{type} 신고하기</h2><p><strong>{target}</strong><br />사유를 선택하고 구체적인 내용을 적어주세요.</p>{["욕설 또는 인신공격", "스팸·광고", "개인정보 노출", "허위 또는 조작된 내용", "기타 운영정책 위반"].map((item) => <label className="report-option" key={item}><input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} />{item}</label>)}<label className="report-details"><span>상세 신고 사유</span><textarea required maxLength={300} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="어떤 부분이 문제인지 구체적으로 적어주세요." aria-label="상세 신고 사유" /><small>{details.length}/300</small></label><button className="danger-button full" type="submit">신고 접수</button></form></div>;
}

function VoteConfirmModal({ side, close, confirm }: { side: VoteSide; close: () => void; confirm: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className={`profile-modal vote-confirm vote-confirm-${side.toLowerCase()}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vote-confirm-title"><button className="modal-close" onClick={close} aria-label="닫기">×</button><span className="vote-confirm-side">{side}</span><h2 id="vote-confirm-title">{side}측 주장에 동의할까요?</h2><p>투표를 완료하면 변경할 수 없습니다.<br />작성한 댓글과 대댓글에도 이 선택이 표시됩니다.</p><div><button className="secondary-button" onClick={close}>다시 생각하기</button><button className="vote-confirm-submit" onClick={confirm}>동의 확정</button></div></section></div>;
}

function DeleteCommentModal({ label, close, confirm }: { label: string; close: () => void; confirm: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="profile-modal delete-comment-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-comment-title"><button className="modal-close" onClick={close} aria-label="닫기">×</button><span className="delete-comment-icon">×</span><h2 id="delete-comment-title">댓글을 삭제할까요?</h2><p><strong>{label}</strong><br />삭제한 내용은 다시 복구할 수 없습니다.</p><div><button className="secondary-button" onClick={close}>취소</button><button className="delete-comment-confirm" onClick={confirm}>삭제하기</button></div></section></div>;
}

function JudgeVerdictModal({ close, requirement, submit }: { close: () => void; requirement: string; submit: (draft: JudgeVerdictDraft) => void }) {
  const [side, setSide] = useState<VoteSide | null>(null);
  const [timestamp, setTimestamp] = useState("24:05");
  const [visibleInfo, setVisibleInfo] = useState("");
  const [reason, setReason] = useState("");
  const [nextChoice, setNextChoice] = useState("");
  const [confidence, setConfidence] = useState("90");
  const ready = Boolean(side && timestamp.trim() && visibleInfo.trim().length >= 5 && reason.trim().length >= 10 && nextChoice.trim().length >= 5);
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal judge-verdict-modal rich-verdict-form" onSubmit={(event) => { event.preventDefault(); if (ready && side) submit({ side, timestamp: timestamp.trim(), visibleInfo: visibleInfo.trim(), reason: reason.trim(), nextChoice: nextChoice.trim(), confidence: Number(confidence) }); }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="judge-verdict-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><div className="rich-verdict-head"><span className="judge-modal-label">공식 판정 · {requirement} 이상</span><h2 id="judge-verdict-title">근거가 남는 판정을 작성해 주세요.</h2><p>결과뿐 아니라 당시 정보와 다음에 더 나은 선택까지 작성해야 제출할 수 있습니다.</p></div><div className="judge-side-picker"><button type="button" className={side === "A" ? "a selected" : "a"} onClick={() => setSide("A")}><b>A</b><span>A측 잘못</span></button><button type="button" className={side === "B" ? "b selected" : "b"} onClick={() => setSide("B")}><b>B</b><span>B측 잘못</span></button></div><div className="verdict-required-grid"><label><span>핵심 타임스탬프</span><input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} required placeholder="예: 24:05" /></label><label><span>판정 확신도</span><select value={confidence} onChange={(event) => setConfidence(event.target.value)}><option value="70">70% · 추가 확인 필요</option><option value="80">80% · 근거 충분</option><option value="90">90% · 확신함</option><option value="100">100% · 명확함</option></select></label><label className="full"><span>당시 확인할 수 있었던 정보</span><textarea value={visibleInfo} onChange={(event) => setVisibleInfo(event.target.value)} required placeholder="예: 상대 정글은 시야에서 사라졌고, 아군 미드는 라인을 정리 중이었습니다." /></label><label className="full"><span>판단의 근거</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={500} required placeholder="누가 왜 더 큰 책임이 있는지 장면을 기준으로 설명해 주세요." /></label><label className="full next-choice-field"><span>다음에 더 나은 선택</span><textarea value={nextChoice} onChange={(event) => setNextChoice(event.target.value)} required placeholder="같은 상황에서 먼저 해야 할 행동이나 확인할 정보를 알려주세요." /></label></div><div className="verdict-submit-row"><span><i>✓</i> 모든 항목은 판정 결과와 함께 공개됩니다.</span><button className="judge-verdict-submit" type="submit" disabled={!ready}>공식 판정 제출</button></div></form></div>;
}

function ExpertFeedbackModal({ close, requirement, submit }: { close: () => void; requirement: string; submit: (draft: ExpertFeedbackDraft) => void }) {
  const [timestamp, setTimestamp] = useState("00:25");
  const [observedInfo, setObservedInfo] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [nextChoice, setNextChoice] = useState("");
  const ready = timestamp.trim().length >= 3 && observedInfo.trim().length >= 5 && analysis.trim().length >= 10 && nextChoice.trim().length >= 5;
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal rich-verdict-form expert-feedback-modal" onSubmit={(event) => { event.preventDefault(); if (ready) submit({ timestamp: timestamp.trim(), observedInfo: observedInfo.trim(), analysis: analysis.trim(), nextChoice: nextChoice.trim() }); }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="expert-feedback-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><div className="rich-verdict-head"><span className="feedback-modal-label">전문 피드백 · {requirement} 이상</span><h2 id="expert-feedback-title">다음 플레이에 도움이 되는 피드백을 남겨주세요.</h2><p>잘못을 가리기보다 당시 판단을 분석하고 더 나은 선택을 근거와 함께 제안합니다.</p></div><div className="verdict-required-grid"><label><span>핵심 타임스탬프</span><input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} required placeholder="예: 00:25" /></label><label><span>확인한 정보</span><input value={observedInfo} onChange={(event) => setObservedInfo(event.target.value)} required placeholder="예: 상대 정글 위치 미확인" /></label><label className="full"><span>플레이 분석과 근거</span><textarea value={analysis} onChange={(event) => setAnalysis(event.target.value)} minLength={10} maxLength={500} required placeholder="작성자의 의도와 실제 장면을 비교해 어떤 판단이 좋았고 무엇을 놓쳤는지 설명해 주세요." /></label><label className="full next-choice-field"><span>다음 플레이 방법</span><textarea value={nextChoice} onChange={(event) => setNextChoice(event.target.value)} required placeholder="같은 상황에서 먼저 확인할 정보와 권장 행동을 적어주세요." /></label></div><div className="verdict-submit-row"><span><i>✓</i> 타임스탬프와 근거, 개선안이 함께 공개됩니다.</span><button className="expert-feedback-submit" type="submit" disabled={!ready}>전문 피드백 등록</button></div></form></div>;
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
  const [selectedCaseTitle, setSelectedCaseTitle] = useState(REAL_CASE_TITLE);
  const [searchQuery, setSearchQuery] = useState("");
  const [personalRanking, setPersonalRanking] = useState<string[][]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedUser = localStorage.getItem(USER_KEY);
      const storedCase = localStorage.getItem(CASE_KEY);
      const storedRanking = JSON.parse(localStorage.getItem(PERSONAL_RANKING_KEY) ?? "[]") as string[][];
      if (storedUser) {
        const storedProfile = JSON.parse(storedUser) as User;
        const savedUser = storedProfile.nickname === "루크"
          ? { nickname: "루크", tier: "관리자", peakTier: "관리자", isAdmin: true }
          : { ...storedProfile, peakTier: storedProfile.peakTier ?? storedProfile.tier, primaryRole: storedProfile.primaryRole ?? "정글" };
        const nextRanking = registerPersonalRanking(storedRanking, savedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(savedUser));
        localStorage.setItem(PERSONAL_RANKING_KEY, JSON.stringify(nextRanking));
        setUser(savedUser);
        setPersonalRanking(nextRanking);
      } else {
        setPersonalRanking(storedRanking);
      }
      if (storedCase) {
        const savedCase = JSON.parse(storedCase) as LocalCase;
        setLocalCase({ ...savedCase, mode: savedCase.mode ?? "judgement" });
        loadStoredVideo().then((blob) => { if (blob) setLocalVideoUrl(URL.createObjectURL(blob)); }).catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const baseUrl = `${window.location.pathname}${window.location.search}`;
    const initialState = navigationFromHash(window.location.hash);
    const restoreTimer = window.setTimeout(() => {
      setView(initialState.view);
      if (initialState.title) setSelectedCaseTitle(initialState.title);
      if (typeof initialState.local === "boolean") setViewingLocal(initialState.local);
      if (initialState.query) setSearchQuery(initialState.query);
    }, 0);
    window.history.replaceState(initialState, "", `${baseUrl}${navigationToHash(initialState.view, initialState)}`);
    const restoreView = (event: PopStateEvent) => {
      const savedState = event.state as NavigationState | null;
      const state = savedState && navigableViews.includes(savedState.view) ? savedState : navigationFromHash(window.location.hash);
      setView(state.view);
      setLoginOpen(false);
      setProfileOpen(false);
      if (state.title) setSelectedCaseTitle(state.title);
      if (typeof state.local === "boolean") setViewingLocal(state.local);
      if (state.query) setSearchQuery(state.query);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", restoreView);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("popstate", restoreView);
    };
  }, []);

  const showToast = (message: string) => { setToastMessage(message); window.setTimeout(() => setToastMessage(""), 2800); };
  const requireLogin = () => { setLoginOpen(true); showToast("로그인이 필요한 기능입니다."); };
  const navigate = (nextView: View, state: Omit<NavigationState, "view"> = {}) => {
    if (state.title) setSelectedCaseTitle(state.title);
    if (typeof state.local === "boolean") setViewingLocal(state.local);
    if (state.query) setSearchQuery(state.query);
    setView(nextView);
    const baseUrl = `${window.location.pathname}${window.location.search}`;
    window.history.pushState({ view: nextView, ...state } satisfies NavigationState, "", `${baseUrl}${navigationToHash(nextView, state)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const login = (nextUser: User) => {
    const nextRanking = registerPersonalRanking(personalRanking, nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(PERSONAL_RANKING_KEY, JSON.stringify(nextRanking));
    setPersonalRanking(nextRanking);
    setUser(nextUser);
    setLoginOpen(false);
    showToast(`${nextUser.nickname}님, 로그인했습니다. 개인 랭킹에 등록되었습니다.`);
  };
  const logout = () => { localStorage.removeItem(USER_KEY); setUser(null); setProfileOpen(false); navigate("home"); showToast("로그아웃했습니다."); };
  const openSubmit = () => {
    if (!user) return requireLogin();
    if (isMasterPlus(user.tier) && !user.isAdmin) return showToast("마스터 이상은 사건을 작성할 수 없으며 공식 판결자로 참여합니다.");
    navigate("submit");
  };
  const openDetail = (local = false, title?: string) => navigate("detail", { local, title });
  const search = (query: string) => navigate("search", { query });

  return <div className="app-root"><Header view={view} setView={navigate} user={user} onLogin={() => setLoginOpen(true)} onProfile={() => setProfileOpen(true)} />
    {view === "home" && <Home openDetail={openDetail} localCase={localCase} localVideoUrl={localVideoUrl} onSubmit={openSubmit} onSearch={search} />}
    {view === "detail" && <Detail toast={showToast} user={user} requireLogin={requireLogin} localCase={localCase} localVideoUrl={localVideoUrl} viewingLocal={viewingLocal} selectedTitle={selectedCaseTitle} />}
    {view === "ranking" && <Ranking personalRanking={personalRanking} />}
    {view === "guide" && <Guide />}
    {view === "search" && <SearchResults query={searchQuery} openDetail={openDetail} localCase={localCase} />}
    {view === "submit" && user && <SubmitCase setView={navigate} toast={showToast} user={user} onSubmitted={(item, url) => { setLocalCase(item); setLocalVideoUrl(url); }} />}
    {view === "admin" && user?.isAdmin && <AdminApproval localCase={localCase} localVideoUrl={localVideoUrl} approve={() => { if (!localCase) return; const approvedCase = { ...localCase, approved: true }; localStorage.setItem(CASE_KEY, JSON.stringify(approvedCase)); setLocalCase(approvedCase); showToast("게시물을 승인해 홈에 공개했습니다."); }} remove={() => { localStorage.removeItem(CASE_KEY); deleteStoredVideo().catch(() => undefined); if (localVideoUrl) URL.revokeObjectURL(localVideoUrl); setLocalCase(null); setLocalVideoUrl(""); showToast("게시물과 영상을 삭제했습니다."); }} openDetail={() => openDetail(true, localCase?.title)} />}
    <footer><Logo onClick={() => navigate("home")} /><p>티어는 진짜로, 닉네임은 자유롭게. 함께 판결하는 롤 플레이 판결소.</p><small>LOL.VS는 Riot Games가 보증하거나 후원하는 서비스가 아닙니다.</small></footer>
    {loginOpen && <LoginModal close={() => setLoginOpen(false)} onLogin={login} />}
    {profileOpen && user && <ProfileModal user={user} close={() => setProfileOpen(false)} logout={logout} />}
    {toastMessage && <div className="toast" role="status">✓ {toastMessage}</div>}
  </div>;
}
