"use client";

import { FormEvent, useMemo, useState } from "react";

type View = "home" | "detail" | "submit";
type Vote = "A" | "B" | null;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

const compactCases = [
  {
    title: "바론 스틸 시도, 이건 미드 잘못인가요?",
    author: "정글은못말려",
    tier: "다이아몬드 IV",
    meta: "솔로 랭크 · 25분 전",
    time: "마감까지 1일 9시간",
    a: 71,
    b: 29,
    comments: 96,
    image: asset("/media/gameplay-detail.png"),
  },
  {
    title: "라인전 푸시 후 다이브, 누구 잘못일까요?",
    author: "탑은외로워",
    tier: "플래티넘 I",
    meta: "솔로 랭크 · 1시간 전",
    time: "마감까지 20시간",
    a: 45,
    b: 55,
    comments: 73,
    image: asset("/media/gameplay-feed.png"),
  },
  {
    title: "용 앞 한타에서 포지셔닝 문제?",
    author: "서폿의하루",
    tier: "에메랄드 III",
    meta: "일반 게임 · 3시간 전",
    time: "마감까지 18시간",
    a: 34,
    b: 66,
    comments: 54,
    image: asset("/media/gameplay-feed.png"),
  },
];

const hotCases = [
  ["바론 스틸, 이건 누구 잘못?", "댓글 212 · 투표 1.2만"],
  ["탑 다이브 교환, 합리적인 선택?", "댓글 158 · 투표 8,745"],
  ["용 한타 진입 타이밍 논란", "댓글 134 · 투표 6,312"],
  ["미드 로밍 vs 라인 손해", "댓글 98 · 투표 5,102"],
  ["정글 동선 꼬임, 누구 책임?", "댓글 87 · 투표 4,210"],
];

const commentsSeed = [
  {
    name: "전령의눈",
    tier: "플래티넘 II",
    text: "미드가 라인 관리한 건 아쉽지만, 시야 없이 먼저 들어간 상황을 더 크게 봐야 할 것 같아요.",
    likes: 256,
  },
  {
    name: "바텀은신이야",
    tier: "다이아몬드 III",
    text: "바론 체력이 낮았어도 팀원 합류 핑을 확인하고 시도했으면 결과가 달랐을 것 같습니다.",
    likes: 138,
  },
];

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="logo" onClick={onClick} aria-label="LOL.VS 홈">
      LOL<span>.</span>VS
    </button>
  );
}

function VerifiedBadge({ tier }: { tier: string }) {
  return (
    <span className="verified-badge">
      <span className="mini-rank" aria-hidden="true">◆</span>
      {tier} · 인증 <span className="verify-dot">✓</span>
    </span>
  );
}

function Header({ view, setView, onProfile }: { view: View; setView: (view: View) => void; onProfile: () => void }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo onClick={() => setView("home")} />
        <nav aria-label="주요 메뉴">
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>판결 진행 중</button>
          <button onClick={() => setView("home")}>커뮤니티</button>
          <button onClick={() => setView("home")}>랭킹</button>
          <button className="desktop-only" onClick={() => setView("home")}>가이드</button>
        </nav>
        <div className="header-actions">
          <label className="search desktop-only">
            <span>⌕</span>
            <input aria-label="사건 검색" placeholder="사건 검색" />
          </label>
          <button className="submit-small" onClick={() => setView("submit")}>사건 제보</button>
          <button className="profile" onClick={onProfile} aria-label="인증 프로필 열기">
            <span className="avatar">V</span>
            <span className="profile-copy desktop-only">
              <strong>판결하는사람</strong>
              <small>다이아몬드 IV · 인증</small>
            </span>
            <span className="chevron">⌄</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function VoteBar({ a, b, compact = false }: { a: number; b: number; compact?: boolean }) {
  return (
    <div className={compact ? "vote-summary compact" : "vote-summary"} aria-label={`A ${a}%, B ${b}%`}>
      <div className="bar"><span className="bar-a" style={{ width: `${a}%` }} /><span className="bar-b" style={{ width: `${b}%` }} /></div>
      <div className="vote-labels"><b>A {a}%</b><b>B {b}%</b></div>
    </div>
  );
}

function Home({ setView }: { setView: (view: View) => void }) {
  const [category, setCategory] = useState("전체");

  return (
    <main className="page-shell home-layout">
      <section className="feed-column">
        <div className="home-title-row">
          <div>
            <p className="eyebrow">TIER VERIFIED JUDGEMENT</p>
            <h1>억울한 장면, 함께 판결합니다</h1>
            <p>검증된 플레이어들의 피드백으로 그 장면을 다시 바라보세요.</p>
          </div>
          <button className="primary-button" onClick={() => setView("submit")}><span>↥</span> 사건 제보하기</button>
        </div>

        <div className="toolbar">
          <div className="category-tabs" role="tablist" aria-label="게임 유형">
            {["전체", "솔로 랭크", "일반 게임"].map((item) => (
              <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          <button className="sort-button">최신순⌄</button>
        </div>

        <article className="feature-card">
          <div className="case-meta-row">
            <div className="author"><span className="avatar small">V</span><strong>한타는팀운</strong><VerifiedBadge tier="다이아몬드 IV" /></div>
            <div className="case-deadline">마감까지 <strong>2일 14시간</strong> · 댓글 128</div>
          </div>
          <button className="feature-media" onClick={() => setView("detail")} aria-label="대표 사건 상세보기">
            <div className="side-panel side-a"><span>A 잘못</span><strong>62<small>%</small></strong><em>812표</em></div>
            <div className="game-shot"><img src={asset("/media/gameplay-feed.png")} alt="미드 라인 교전 영상 장면" /><span className="play">▶</span></div>
            <div className="side-panel side-b"><span>B 잘못</span><strong>38<small>%</small></strong><em>501표</em></div>
          </button>
          <div className="duel-bar"><span style={{ width: "62%" }} /><i>VS</i></div>
          <div className="feature-footer"><span>ⓘ 투표에 참여하고 플레이 피드백을 남겨보세요.</span><button onClick={() => setView("detail")}>판결 참여하기 →</button></div>
        </article>

        <div className="case-list">
          {compactCases.map((item, index) => (
            <button className="case-row" key={item.title} onClick={() => setView("detail")}>
              <span className="thumb"><img src={item.image} alt="" /><small>00:{25 + index * 3}</small></span>
              <span className="case-copy">
                <strong>{item.title}</strong>
                <span className="author-line">{item.author} <VerifiedBadge tier={item.tier} /></span>
                <small>{item.meta}</small>
              </span>
              <span className="row-votes">
                <small>{item.time}</small>
                <VoteBar a={item.a} b={item.b} compact />
              </span>
              <span className="comment-count">◯ {item.comments}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="right-rail">
        <section className="rail-card hot-card">
          <h2><span>◆</span> 주간 뜨는 재판</h2>
          <ol>
            {hotCases.map(([title, meta], index) => (
              <li key={title}>
                <span className={index < 3 ? "rank hot" : "rank"}>{index + 1}</span>
                <img src={asset(index === 0 ? "/media/gameplay-detail.png" : "/media/gameplay-feed.png")} alt="" />
                <span><strong>{title}</strong><small>{meta}</small></span>
              </li>
            ))}
          </ol>
          <button className="rail-more">더보기 →</button>
        </section>

        <section className="rail-card">
          <h2>인증 티어 분포 <small>ⓘ</small></h2>
          <div className="tier-bar"><span /><span /><span /><span /><span /></div>
          <div className="tier-labels"><span>12%<small>아이언–골드</small></span><span>28%<small>플래티넘</small></span><span>31%<small>에메랄드</small></span><span>19%<small>다이아</small></span><span>8%<small>마스터+</small></span></div>
          <p>인증된 티어로 더 신뢰할 수 있는 판결을 제공합니다.</p>
        </section>

        <section className="rail-card principles">
          <h2>LOL.VS는 공정한 판결을 지향합니다</h2>
          <p><b>◎</b><span><strong>실명 대신 인증된 실력</strong><small>실제 게임 닉네임은 공개하지 않습니다.</small></span></p>
          <p><b>◇</b><span><strong>악의적 이용 방지</strong><small>신고와 운영 기준으로 건강한 토론을 만듭니다.</small></span></p>
          <p><b>◉</b><span><strong>결론보다 유용한 피드백</strong><small>다음 플레이에 도움이 되는 의견을 권장합니다.</small></span></p>
        </section>
      </aside>
    </main>
  );
}

function Detail({ setView, toast }: { setView: (view: View) => void; toast: (message: string) => void }) {
  const [vote, setVote] = useState<Vote>(null);
  const [feedback, setFeedback] = useState("");
  const [comments, setComments] = useState(commentsSeed);
  const result = useMemo(() => vote === "A" ? { a: 59, b: 41 } : vote === "B" ? { a: 58, b: 42 } : { a: 58, b: 42 }, [vote]);

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (!feedback.trim()) return;
    setComments([{ name: "판결하는사람", tier: "다이아몬드 IV", text: feedback.trim(), likes: 0 }, ...comments]);
    setFeedback("");
    toast("의견이 프로토타입에 추가됐습니다.");
  };

  const chooseVote = (next: Exclude<Vote, null>) => {
    if (vote) return;
    setVote(next);
    toast(`${next} 잘못으로 투표했습니다.`);
  };

  return (
    <main className="page-shell detail-layout">
      <section className="detail-main">
        <button className="back-link" onClick={() => setView("home")}>← 사건 게시판으로</button>
        <div className="detail-title"><span>판결 진행 중</span><h1>바론 스틸 시도, 이건 미드 잘못인가요?</h1></div>
        <div className="video-card">
          <img src={asset("/media/gameplay-detail.png")} alt="바론 앞 교전 영상 장면" />
          <button className="video-play" aria-label="영상 재생" onClick={() => toast("영상 재생을 체험하는 프로토타입입니다.")}>▶</button>
        </div>
        <div className="video-author-row">
          <div className="author"><span className="avatar small">V</span><strong>한타는팀운</strong><VerifiedBadge tier="다이아몬드 IV" /></div>
          <div>조회 3,842 · 댓글 128 · ··</div>
        </div>

        <div className="claims">
          <article className="claim claim-a"><h2>A측 주장</h2><p>미드가 바론 시야를 확보하지 않고 라인을 밀다가 합류했습니다. 미드의 지도 관리 소홀과 합류 지연이 원인입니다.</p><span>A</span></article>
          <article className="claim claim-b"><h2>B측 주장</h2><p>정글이 바론 핑을 찍지 않았고, 미드가 라인을 밀 수밖에 없는 상황이었습니다. 팀 전체의 판단 실수가 더 큽니다.</p><span>B</span></article>
        </div>

        <section className="timeline"><h2>사건 타임라인 & 상황 요약</h2><div><span><b>23:40</b>바론 시야 장악 시작</span><i>→</i><span><b>23:52</b>미드 라인 푸시 시작</span><i>→</i><span><b>24:18</b>바론 체력 50%</span><i>→</i><span><b>24:31</b>스틸 실패 & 전투 개시</span></div></section>

        <section className="comments-section">
          <div className="comments-heading"><h2>댓글 {comments.length + 126}</h2><span>인증 티어만 표시 · 최신순</span></div>
          <form className="comment-form" onSubmit={addComment}>
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="어떻게 플레이하면 더 좋았을까요?" aria-label="피드백 작성" />
            <button type="submit">등록</button>
          </form>
          {comments.map((item, index) => (
            <article className="comment" key={`${item.name}-${index}`}>
              <span className="comment-avatar">{item.name[0]}</span>
              <div><div><strong>{item.name}</strong><VerifiedBadge tier={item.tier} /><small>{index + 1}시간 전</small></div><p>{item.text}</p><span>♡ {item.likes} · 답글</span></div>
            </article>
          ))}
        </section>
      </section>

      <aside className="vote-rail">
        <section className="vote-card">
          <div className="deadline">◷ 마감까지 <strong>2일 14시간</strong></div>
          <div className="vote-body">
            <h2>{vote ? "현재 판결" : "판결에 참여하기"}</h2>
            {vote ? <VoteBar a={result.a} b={result.b} /> : <p className="blind-vote">다른 사람의 선택은 투표 후 공개됩니다.</p>}
            <div className="big-vote-buttons">
              <button className={vote === "A" ? "chosen a" : "a"} onClick={() => chooseVote("A")} disabled={!!vote}>👍 A 잘못</button>
              <button className={vote === "B" ? "chosen b" : "b"} onClick={() => chooseVote("B")} disabled={!!vote}>👍 B 잘못</button>
            </div>
            <p className="vote-warning">ⓘ 투표 후에는 변경할 수 없습니다</p>
          </div>
          <button className="report">⚑ 신고하기 <span>⌄</span></button>
        </section>
        <section className="guide-card"><h2>판결 가이드</h2><ul><li>영상 속 객관적인 사실을 기준으로 판단해 주세요.</li><li>감정적인 비난보다 개선할 점을 남겨 주세요.</li><li>근거가 되는 타임스탬프를 함께 적으면 좋아요.</li></ul></section>
      </aside>
    </main>
  );
}

function SubmitCase({ setView, toast }: { setView: (view: View) => void; toast: (message: string) => void }) {
  const [fileReady, setFileReady] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast("사건이 등록되었습니다. 판결을 기다려 주세요!");
    setView("home");
  };

  return (
    <main className="submit-page page-shell">
      <button className="back-link" onClick={() => setView("home")}>← 사건 게시판으로</button>
      <div className="submit-heading"><p className="eyebrow">SUBMIT A CASE</p><h1>억울했던 장면을 제보해 주세요</h1><p>사실을 차분히 적어주면 더 정확한 피드백을 받을 수 있어요.</p></div>
      <form className="submit-form" onSubmit={submit}>
        <section>
          <label>1. 영상 업로드</label>
          <button type="button" className={fileReady ? "upload-box ready" : "upload-box"} onClick={() => setFileReady(true)}>
            <span>{fileReady ? "✓" : "↥"}</span><strong>{fileReady ? "baron-fight.mp4" : "클립을 끌어놓거나 선택하세요"}</strong><small>MP4 · 2GB 이하 · 최대 3분</small>
          </button>
        </section>
        <section><label htmlFor="case-title">2. 사건 제목</label><input id="case-title" required placeholder="예: 바론 스틸 시도, 미드가 잘못한 걸까요?" /></section>
        <div className="form-split"><section><label htmlFor="a-claim">3. A측 주장</label><textarea id="a-claim" required placeholder="내가 억울한 이유와 당시 상황을 적어주세요." /></section><section><label htmlFor="b-claim">4. B측 입장</label><textarea id="b-claim" required placeholder="상대방은 이 상황을 어떻게 봤을까요?" /></section></div>
        <section><label>5. 판결 기간</label><div className="duration"><label><input type="radio" name="duration" value="1" />1일</label><label><input type="radio" name="duration" value="3" defaultChecked />3일</label><label><input type="radio" name="duration" value="7" />7일</label></div></section>
        <div className="submit-notice"><span>ⓘ</span><p><strong>실제 Riot ID는 공개되지 않습니다.</strong><br />사이트 활동명과 인증 티어만 다른 사용자에게 표시됩니다.</p></div>
        <button type="submit" className="primary-button full">사건 제보하기</button>
      </form>
    </main>
  );
}

function ProfileModal({ close, toast }: { close: () => void; toast: (message: string) => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="profile-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className="modal-close" onClick={close} aria-label="닫기">×</button>
        <span className="profile-emblem">◆</span>
        <h2 id="profile-title">판결하는사람</h2>
        <VerifiedBadge tier="다이아몬드 IV" />
        <p>실제 Riot ID는 공개하지 않고<br />인증된 현재 티어만 보여드려요.</p>
        <button className="primary-button full" onClick={() => { toast("Riot 계정 인증 화면을 체험하는 프로토타입입니다."); close(); }}>Riot 계정 다시 인증하기</button>
      </section>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [profileOpen, setProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2600);
  };

  return (
    <div className="app-root">
      <Header view={view} setView={setView} onProfile={() => setProfileOpen(true)} />
      {view === "home" && <Home setView={setView} />}
      {view === "detail" && <Detail setView={setView} toast={showToast} />}
      {view === "submit" && <SubmitCase setView={setView} toast={showToast} />}
      <footer><Logo onClick={() => setView("home")} /><p>티어는 진짜로, 닉네임은 자유롭게. 함께 보는 롤 플레이 커뮤니티.</p><small>LOL.VS는 Riot Games가 보증하거나 후원하는 서비스가 아닙니다.</small></footer>
      {profileOpen && <ProfileModal close={() => setProfileOpen(false)} toast={showToast} />}
      {toastMessage && <div className="toast" role="status">✓ {toastMessage}</div>}
    </div>
  );
}
