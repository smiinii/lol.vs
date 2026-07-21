"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useRef, useState } from "react";

type View = "home" | "community" | "ranking" | "guide" | "detail" | "submit";
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
  { title: "바론 스틸 시도, 이건 미드 잘못인가요?", author: "정글은못말려", tier: "다이아몬드 IV", category: "솔로랭크", meta: "25분 전", time: "마감까지 1일 9시간", a: 71, b: 29, comments: 96, image: asset("/media/gameplay-detail.png") },
  { title: "라인전 푸시 후 다이브, 누구 잘못일까요?", author: "탑은외로워", tier: "플래티넘 I", category: "파티랭크", meta: "1시간 전", time: "마감까지 20시간", a: 45, b: 55, comments: 73, image: asset("/media/gameplay-feed.png") },
  { title: "용 앞 한타에서 포지셔닝 문제?", author: "서폿의하루", tier: "에메랄드 III", category: "일반게임", meta: "3시간 전", time: "마감까지 18시간", a: 34, b: 66, comments: 54, image: asset("/media/gameplay-feed.png") },
];

const weeklyPosts = [
  ["바론 스틸, 이건 누구 잘못?", "댓글 212 · 투표 1.2만"],
  ["탑 다이브 교환, 합리적인 선택?", "댓글 158 · 투표 8,745"],
  ["용 한타 진입 타이밍 논란", "댓글 134 · 투표 6,312"],
  ["미드 로밍 vs 라인 손해", "댓글 98 · 투표 5,102"],
  ["정글 동선 꼬임, 누구 책임?", "댓글 87 · 투표 4,210"],
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

function Header({ view, setView, user, onLogin, onProfile, onSubmit }: {
  view: View;
  setView: (view: View) => void;
  user: User | null;
  onLogin: () => void;
  onProfile: () => void;
  onSubmit: () => void;
}) {
  const menus: [View, string][] = [["home", "홈"], ["community", "커뮤니티"], ["ranking", "랭킹"], ["guide", "가이드"]];
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo onClick={() => setView("home")} />
        <nav aria-label="주요 메뉴">
          {menus.map(([target, label]) => <button key={target} className={view === target ? "active" : ""} onClick={() => setView(target)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          <label className="search desktop-only"><span>⌕</span><input aria-label="사이트 검색" placeholder="글과 사건 검색" /></label>
          <button className="submit-small" onClick={onSubmit}>사건 제보</button>
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

function Home({ openDetail, localCase, localVideoUrl }: { openDetail: (local?: boolean) => void; localCase: LocalCase | null; localVideoUrl: string }) {
  const [category, setCategory] = useState("전체");
  const filtered = compactCases.filter((item) => category === "전체" || item.category === category);
  const showLocal = localCase && (category === "전체" || localCase.category === category);
  return (
    <main className="page-shell home-layout">
      <section className="feed-column">
        <div className="home-title-row compact-title"><div><h1>억울한 장면, 함께 판결합니다</h1><p>티어가 인증된 플레이어의 투표와 근거 있는 피드백을 확인해 보세요.</p></div></div>
        <div className="toolbar">
          <div className="category-tabs" role="tablist" aria-label="게임 유형">
            {["전체", "솔로랭크", "파티랭크", "일반게임"].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <button className="sort-button">최신순⌄</button>
        </div>

        {showLocal && (
          <button className="uploaded-case-banner" onClick={() => openDetail(true)}>
            <span className="uploaded-thumb">{localVideoUrl ? <video src={localVideoUrl} muted /> : <span>▶</span>}</span>
            <span><small>방금 등록한 사건 · {localCase.category}</small><strong>{localCase.title}</strong><em>{localCase.author} · {localCase.tier} 데모 인증</em></span>
            <b>판결 보기 →</b>
          </button>
        )}

        <article className="feature-card">
          <div className="case-meta-row"><div className="author"><span className="avatar small">한</span><strong>한타는팀운</strong><VerifiedBadge tier="다이아몬드 IV" /></div><div className="case-deadline">마감까지 <strong>2일 14시간</strong> · 댓글 128</div></div>
          <button className="feature-media" onClick={() => openDetail(false)} aria-label="대표 사건 상세보기">
            <div className="side-panel side-a"><span>A 잘못</span><strong>62<small>%</small></strong><em>812표</em></div>
            <div className="game-shot"><img src={asset("/media/gameplay-feed.png")} alt="미드 라인 교전 영상 장면" /><span className="play">▶</span></div>
            <div className="side-panel side-b"><span>B 잘못</span><strong>38<small>%</small></strong><em>501표</em></div>
          </button>
          <div className="duel-bar"><span style={{ width: "62%" }} /><i>VS</i></div>
          <div className="feature-footer"><span>ⓘ 투표 결과는 참여 후 공개됩니다.</span><button onClick={() => openDetail(false)}>판결 보기 →</button></div>
        </article>

        <div className="case-list">
          {filtered.map((item, index) => (
            <button className="case-row" key={item.title} onClick={() => openDetail(false)}>
              <span className="thumb"><img src={item.image} alt="" /><small>00:{25 + index * 3}</small></span>
              <span className="case-copy"><strong>{item.title}</strong><span className="author-line">{item.author} <VerifiedBadge tier={item.tier} /></span><small>{item.category} · {item.meta}</small></span>
              <span className="row-votes"><small>{item.time}</small><VoteBar a={item.a} b={item.b} compact /></span>
              <span className="comment-count">◯ {item.comments}</span>
            </button>
          ))}
          {!filtered.length && !showLocal && <div className="empty-state">이 카테고리의 사건을 준비하고 있습니다.</div>}
        </div>
      </section>

      <aside className="right-rail">
        <section className="rail-card hot-card"><h2><span>◆</span> 주간 인기 글</h2><ol>{weeklyPosts.map(([title, meta], index) => <li key={title}><span className={index < 3 ? "rank hot" : "rank"}>{index + 1}</span><img src={asset(index === 0 ? "/media/gameplay-detail.png" : "/media/gameplay-feed.png")} alt="" /><span><strong>{title}</strong><small>{meta}</small></span></li>)}</ol></section>
        <section className="rail-card"><h2>인증 티어 분포 <small>ⓘ</small></h2><div className="tier-bar"><span /><span /><span /><span /><span /></div><div className="tier-labels"><span>12%<small>아이언–골드</small></span><span>28%<small>플래티넘</small></span><span>31%<small>에메랄드</small></span><span>19%<small>다이아</small></span><span>8%<small>마스터+</small></span></div><p>로그인 데모에서는 선택한 티어가 데모 인증으로 표시됩니다.</p></section>
        <section className="rail-card principles"><h2>좋은 판결은 이렇게 만듭니다</h2><p><b>◎</b><span><strong>선택에 근거 남기기</strong><small>어떤 장면을 봤는지 타임스탬프와 함께 적습니다.</small></span></p><p><b>◇</b><span><strong>공격보다 개선점</strong><small>다음 플레이에 도움 되는 의견을 권장합니다.</small></span></p><p><b>◉</b><span><strong>악의적 이용 신고</strong><small>신고 사유를 선택해 운영 검토를 요청할 수 있습니다.</small></span></p></section>
      </aside>
    </main>
  );
}

function Detail({ setView, toast, user, requireLogin, localCase, localVideoUrl, viewingLocal }: {
  setView: (view: View) => void;
  toast: (message: string) => void;
  user: User | null;
  requireLogin: () => void;
  localCase: LocalCase | null;
  localVideoUrl: string;
  viewingLocal: boolean;
}) {
  const [vote, setVote] = useState<VoteSide | null>(null);
  const [feedback, setFeedback] = useState("");
  const [evidence, setEvidence] = useState("");
  const [commentVote, setCommentVote] = useState<VoteSide>("A");
  const [comments, setComments] = useState(commentsSeed);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const result = vote === "A" ? { a: 59, b: 41 } : { a: 58, b: 42 };
  const title = viewingLocal && localCase ? localCase.title : "바론 스틸 시도, 이건 미드 잘못인가요?";
  const aClaim = viewingLocal && localCase ? localCase.aClaim : "미드가 바론 시야를 확보하지 않고 라인을 밀다가 합류했습니다. 미드의 지도 관리 소홀과 합류 지연이 원인입니다.";
  const bClaim = viewingLocal && localCase ? localCase.bClaim : "정글이 바론 핑을 찍지 않았고, 미드가 라인을 밀 수밖에 없는 상황이었습니다. 팀 전체의 판단 실수가 더 큽니다.";
  const author = viewingLocal && localCase ? localCase.author : "한타는팀운";
  const tier = viewingLocal && localCase ? localCase.tier : "다이아몬드 IV";
  const videoSrc = viewingLocal && localVideoUrl ? localVideoUrl : asset("/media/demo.mp4");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedVote = localStorage.getItem(viewingLocal ? "lolvs-local-vote" : "lolvs-default-vote") as VoteSide | null;
      if (savedVote === "A" || savedVote === "B") setVote(savedVote);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewingLocal]);

  const chooseVote = (side: VoteSide) => {
    if (!user) return requireLogin();
    if (vote) return toast("이미 이 사건에 투표했습니다.");
    setVote(side);
    setCommentVote(side);
    localStorage.setItem(viewingLocal ? "lolvs-local-vote" : "lolvs-default-vote", side);
    toast(`${side} 잘못으로 투표했습니다.`);
  };

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return requireLogin();
    if (!feedback.trim() || !evidence.trim()) return toast("피드백과 판단 근거를 함께 적어주세요.");
    const item: CommentItem = { id: Date.now(), name: user.nickname, tier: user.tier, text: feedback.trim(), evidence: evidence.trim(), vote: commentVote, likes: 0, replies: [] };
    setComments([item, ...comments]);
    setFeedback("");
    setEvidence("");
    toast("판결 근거와 피드백을 등록했습니다.");
  };

  const addReply = (commentId: number) => {
    if (!user) return requireLogin();
    if (!replyText.trim()) return;
    setComments(comments.map((comment) => comment.id === commentId ? { ...comment, replies: [...comment.replies, { id: Date.now(), name: user.nickname, tier: user.tier, text: replyText.trim() }] } : comment));
    setReplyText("");
    setReplyingTo(null);
    toast("대댓글을 등록했습니다.");
  };

  const requestReport = () => {
    if (!user) return requireLogin();
    setReportOpen(true);
  };

  return (
    <main className="page-shell detail-layout">
      <section className="detail-main">
        <button className="back-link" onClick={() => setView("home")}>← 홈으로</button>
        <div className="detail-title"><span>판결 진행 중</span><h1>{title}</h1></div>
        <div className="video-card real-video"><video src={videoSrc} controls playsInline poster={viewingLocal ? undefined : asset("/media/gameplay-detail.png")}>브라우저가 영상을 지원하지 않습니다.</video></div>
        <div className="video-author-row"><div className="author"><span className="avatar small">{author[0]}</span><strong>{author}</strong><VerifiedBadge tier={tier} demo={viewingLocal} /></div><div>조회 3,842 · 댓글 {comments.length + 126}</div></div>
        <div className="claims"><article className="claim claim-a"><h2>A측 주장</h2><p>{aClaim}</p><span>A</span></article><article className="claim claim-b"><h2>B측 주장</h2><p>{bClaim}</p><span>B</span></article></div>
        <section className="timeline"><h2>사건 타임라인 & 상황 요약</h2><div><span><b>23:40</b>시야 장악 시작</span><i>→</i><span><b>23:52</b>라인 푸시 시작</span><i>→</i><span><b>24:18</b>교전 준비</span><i>→</i><span><b>24:31</b>전투 개시</span></div></section>

        <section className="comments-section">
          <div className="comments-heading"><h2>댓글 {comments.length + 126}</h2><span>투표 선택과 판단 근거 공개</span></div>
          {user ? (
            <form className="comment-form evidence-form" onSubmit={addComment}>
              <div className="comment-fields"><div className="judgement-choice"><span>내 판결</span><button type="button" className={commentVote === "A" ? "selected a" : "a"} onClick={() => setCommentVote("A")}>A 잘못</button><button type="button" className={commentVote === "B" ? "selected b" : "b"} onClick={() => setCommentVote("B")}>B 잘못</button></div><input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="판단 근거 또는 타임스탬프 (필수)" aria-label="판단 근거" /><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="어떻게 플레이하면 더 좋았을까요?" aria-label="피드백 작성" /></div><button type="submit">등록</button>
            </form>
          ) : <button className="login-lock" onClick={requireLogin}>로그인하고 판결 근거와 피드백 남기기 →</button>}
          {comments.map((item, index) => (
            <article className="comment" key={item.id}>
              <span className="comment-avatar">{item.name[0]}</span>
              <div>
                <div><strong>{item.name}</strong><VerifiedBadge tier={item.tier} demo={item.name === user?.nickname} /><span className={`comment-vote vote-${item.vote.toLowerCase()}`}>{item.vote} 잘못 선택</span><small>{index + 1}시간 전</small></div>
                <p>{item.text}</p><blockquote><b>판단 근거</b>{item.evidence}</blockquote>
                <span>♡ {item.likes} · <button onClick={() => { if (!user) requireLogin(); else setReplyingTo(replyingTo === item.id ? null : item.id); }}>답글 {item.replies.length ? item.replies.length : ""}</button></span>
                {item.replies.map((reply) => <div className="reply" key={reply.id}><span className="comment-avatar">{reply.name[0]}</span><div><strong>{reply.name}</strong><VerifiedBadge tier={reply.tier} demo={reply.name === user?.nickname} /><p>{reply.text}</p></div></div>)}
                {replyingTo === item.id && <div className="reply-form"><input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`${item.name}님에게 답글 남기기`} aria-label="대댓글 작성" /><button onClick={() => addReply(item.id)}>등록</button></div>}
              </div>
            </article>
          ))}
        </section>
      </section>

      <aside className="vote-rail">
        <section className="vote-card"><div className="deadline">◷ 마감까지 <strong>2일 14시간</strong></div><div className="vote-body"><h2>{vote ? "현재 판결" : "판결에 참여하기"}</h2>{vote ? <VoteBar a={result.a} b={result.b} /> : <p className="blind-vote">결과는 로그인 후 투표하면 공개됩니다.</p>}<div className="big-vote-buttons"><button className={vote === "A" ? "chosen a" : "a"} onClick={() => chooseVote("A")}>👍 A 잘못</button><button className={vote === "B" ? "chosen b" : "b"} onClick={() => chooseVote("B")}>👍 B 잘못</button></div><p className="vote-warning">ⓘ 투표 후에는 변경할 수 없습니다</p>{!user && <p className="guest-notice">로그인해야 투표할 수 있습니다.</p>}</div><button className="report" onClick={requestReport}>⚑ 신고하기 <span>›</span></button></section>
        <section className="guide-card"><h2>판결 가이드</h2><ul><li>객관적인 장면을 기준으로 판단해 주세요.</li><li>댓글에는 선택한 판결과 판단 근거가 함께 공개됩니다.</li><li>비난보다 다음 플레이에 도움 되는 피드백을 남겨 주세요.</li></ul></section>
      </aside>
      {reportOpen && <ReportModal close={() => setReportOpen(false)} onSubmit={(reason) => { setReportOpen(false); toast(`신고가 접수되었습니다: ${reason}`); }} />}
    </main>
  );
}

function Community({ user, requireLogin, toast }: { user: User | null; requireLogin: () => void; toast: (message: string) => void }) {
  const [tab, setTab] = useState("전체");
  const [composer, setComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState([
    { category: "자유", title: "이번 패치 이후 정글 동선 다들 어떻게 잡나요?", author: "맵리딩중", tier: "다이아몬드 I", comments: 34, views: 1280 },
    { category: "듀오 모집", title: "오늘 저녁 플래티넘 원딜과 듀오하실 서폿 구해요", author: "바텀듀오", tier: "플래티넘 II", comments: 12, views: 486 },
    { category: "패치 토론", title: "신규 아이템 이후 탱커 체감이 달라졌네요", author: "탑은단단해", tier: "에메랄드 III", comments: 51, views: 2120 },
    { category: "질문", title: "라인 프리징을 풀어야 하는 정확한 타이밍이 궁금합니다", author: "배우는중", tier: "골드 I", comments: 22, views: 734 },
  ]);
  const write = () => { if (!user) return requireLogin(); setComposer(true); };
  const addPost = (event: FormEvent) => { event.preventDefault(); if (!user || !title.trim() || !content.trim()) return; setPosts([{ category: tab === "전체" ? "자유" : tab, title: title.trim(), author: user.nickname, tier: user.tier, comments: 0, views: 1 }, ...posts]); setTitle(""); setContent(""); setComposer(false); toast("커뮤니티 글을 등록했습니다."); };
  const visiblePosts = posts.filter((post) => tab === "전체" || post.category === tab);
  return <main className="page-shell section-page"><div className="section-hero"><div><small>COMMUNITY</small><h1>소환사의 라운지</h1><p>판결 밖의 게임 이야기, 질문, 듀오 모집을 자유롭게 나눠보세요.</p></div><button className="primary-button" onClick={write}>글쓰기</button></div><div className="community-layout"><section className="board-card"><div className="board-tabs">{["전체", "자유", "듀오 모집", "패치 토론", "질문"].map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>{composer && <form className="board-composer" onSubmit={addPost}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="글 제목" aria-label="커뮤니티 글 제목" /><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="함께 이야기할 내용을 적어주세요." aria-label="커뮤니티 글 내용" /><div><button type="button" onClick={() => setComposer(false)}>취소</button><button type="submit">등록</button></div></form>}<div className="board-list">{visiblePosts.map((post, index) => <button key={`${post.title}-${index}`} onClick={() => toast("게시글 상세 화면은 다음 개발 단계에서 연결됩니다.")}><span className="board-category">{post.category}</span><span><strong>{post.title}</strong><small>{post.author} · {post.tier} 인증</small></span><span><b>댓글 {post.comments}</b><small>조회 {post.views.toLocaleString()}</small></span></button>)}</div></section><aside className="board-side"><section className="rail-card"><h2>커뮤니티 이용 원칙</h2><p>게임 닉네임을 노출하거나 특정 사용자를 공격하지 마세요.</p><p>듀오 모집 시 외부 개인정보 공유에 주의해 주세요.</p></section><section className="rail-card"><h2>지금 많이 보는 주제</h2><div className="topic-tags"><span>#패치노트</span><span>#라인관리</span><span>#듀오모집</span><span>#한타복기</span></div></section></aside></div></main>;
}

function Ranking({ user }: { user: User | null }) {
  return <main className="page-shell section-page"><div className="section-hero"><div><small>JUDGE RANKING</small><h1>도움이 되는 판결자 랭킹</h1><p>최종 다수 판결과 일치한 투표, 공감을 받은 피드백, 꾸준한 참여를 합산합니다.</p></div></div><section className="score-rules"><div><b>+15</b><span>최종 판결과 일치</span></div><div><b>+1</b><span>피드백 공감 1개</span></div><div><b>+5</b><span>근거 있는 댓글 작성</span></div><div><b>-20</b><span>신고 제재 확정</span></div></section><section className="ranking-card"><div className="ranking-head"><span>순위</span><span>판결자</span><span>적중률</span><span>도움 피드백</span><span>점수</span></div>{rankingSeed.map((row, index) => <div className={index < 3 ? "ranking-row top" : "ranking-row"} key={row[0]}><b>{index + 1}</b><span><strong>{row[0]}</strong><small>{row[1]} · 인증</small></span><span>{row[2]}</span><span>{row[3]}</span><strong>{row[4]}P</strong></div>)}</section>{user && <section className="my-rank"><span className="avatar">{user.nickname[0]}</span><div><small>내 예상 순위</small><strong>{user.nickname} · 1,250P</strong><VerifiedBadge tier={user.tier} demo /></div><b>상위 31%</b></section>}</main>;
}

function Guide() {
  return <main className="page-shell section-page"><div className="section-hero"><div><small>LOL.VS GUIDE</small><h1>억울함을 피드백으로 바꾸는 방법</h1><p>처음 방문했다면 아래 네 단계만 기억하세요.</p></div></div><section className="guide-steps">{[["01", "구경하기", "로그인 없이 사건, 커뮤니티, 랭킹과 가이드를 모두 볼 수 있습니다."], ["02", "데모 로그인", "현재는 활동 닉네임과 티어를 선택해 로그인합니다. 실제 Riot 인증은 추후 연결됩니다."], ["03", "투표와 근거", "A/B 중 하나를 선택하고 어떤 장면을 근거로 판단했는지 피드백에 남깁니다."], ["04", "다음 플레이로", "인기 의견과 대댓글을 읽고 실제 플레이에서 바꿀 한 가지를 가져갑니다."]].map(([number, title, body]) => <article key={number}><b>{number}</b><h2>{title}</h2><p>{body}</p></article>)}</section><div className="guide-grid"><section className="guide-panel"><h2>사건 제보 체크리스트</h2><ul><li>3분 이내의 핵심 장면을 올려주세요.</li><li>A측과 B측 입장을 각각 공정하게 적어주세요.</li><li>실제 Riot ID나 상대방의 개인정보는 가려주세요.</li><li>판결 기간은 1일, 3일, 7일 중 선택할 수 있습니다.</li></ul></section><section className="guide-panel"><h2>신고가 필요한 경우</h2><ul><li>욕설·인신공격 또는 혐오 표현</li><li>반복 광고나 무관한 도배</li><li>타인의 개인정보 및 Riot ID 노출</li><li>조작된 영상이나 고의적인 허위 설명</li></ul></section></div><section className="faq"><h2>자주 묻는 질문</h2><details open><summary>티어는 정말 인증되나요?</summary><p>현재 공개 버전은 Riot API 연결 전이라 사용자가 선택한 티어를 ‘데모 인증’으로 표시합니다. 실제 인증처럼 오해하지 않도록 구분했습니다.</p></details><details><summary>영상은 어디에 저장되나요?</summary><p>현재 GitHub Pages 버전에서는 선택한 기기의 브라우저 저장소에만 저장됩니다. 다른 사람과 공유되는 서버 업로드는 백엔드 연결 후 가능합니다.</p></details><details><summary>로그인하지 않아도 볼 수 있나요?</summary><p>네. 모든 읽기 화면은 공개되어 있고 투표, 댓글, 대댓글, 글쓰기, 사건 제보, 신고만 로그인이 필요합니다.</p></details></section></main>;
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

function ReportModal({ close, onSubmit }: { close: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("욕설 또는 인신공격");
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal report-modal" onSubmit={(event) => { event.preventDefault(); onSubmit(reason); }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="profile-emblem report-icon">!</span><h2 id="report-title">사건 신고하기</h2><p>검토가 필요한 이유를 선택해 주세요.</p>{["욕설 또는 인신공격", "스팸·광고", "개인정보 노출", "허위 또는 조작된 내용", "기타 운영정책 위반"].map((item) => <label className="report-option" key={item}><input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} />{item}</label>)}<button className="danger-button full" type="submit">이 사유로 신고 접수</button></form></div>;
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
  const openDetail = (local = false) => { setViewingLocal(local); setView("detail"); };

  return <div className="app-root"><Header view={view} setView={setView} user={user} onLogin={() => setLoginOpen(true)} onProfile={() => setProfileOpen(true)} onSubmit={openSubmit} />
    {view === "home" && <Home openDetail={openDetail} localCase={localCase} localVideoUrl={localVideoUrl} />}
    {view === "detail" && <Detail setView={setView} toast={showToast} user={user} requireLogin={requireLogin} localCase={localCase} localVideoUrl={localVideoUrl} viewingLocal={viewingLocal} />}
    {view === "community" && <Community user={user} requireLogin={requireLogin} toast={showToast} />}
    {view === "ranking" && <Ranking user={user} />}
    {view === "guide" && <Guide />}
    {view === "submit" && user && <SubmitCase setView={setView} toast={showToast} user={user} onSubmitted={(item, url) => { setLocalCase(item); setLocalVideoUrl(url); }} />}
    <footer><Logo onClick={() => setView("home")} /><p>티어는 진짜로, 닉네임은 자유롭게. 함께 보는 롤 플레이 커뮤니티.</p><small>LOL.VS는 Riot Games가 보증하거나 후원하는 서비스가 아닙니다.</small></footer>
    {loginOpen && <LoginModal close={() => setLoginOpen(false)} onLogin={login} />}
    {profileOpen && user && <ProfileModal user={user} close={() => setProfileOpen(false)} logout={logout} />}
    {toastMessage && <div className="toast" role="status">✓ {toastMessage}</div>}
  </div>;
}
