"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "home" | "detail" | "submit" | "ranking" | "guide" | "admin";
type CaseMode = "judgement" | "feedback";
type Category = "솔로랭크" | "파티랭크" | "내전";
type UserRole = "member" | "admin" | "judge";
type CaseStatus = "pending" | "published" | "rejected" | "completed";

type Account = {
  id: string;
  nickname: string;
  pin: string;
  role: UserRole;
};

type SessionUser = Omit<Account, "pin">;

type CaseRecord = {
  id: string;
  mode: CaseMode;
  category: Category;
  title: string;
  question: string;
  context: string;
  position: string;
  champion: string;
  gameTime: string;
  aClaim?: string;
  bClaim?: string;
  thought?: string;
  feedbackFocus?: string;
  videoName: string;
  videoSize: number;
  videoDuration: number;
  authorId: string;
  authorName: string;
  status: CaseStatus;
  createdAt: string;
};

type CommentRecord = {
  id: string;
  caseId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type ExpertRecord = {
  id: string;
  caseId: string;
  authorName: string;
  kind: CaseMode;
  result?: "A" | "B";
  timestamp: string;
  reason: string;
  nextPlay: string;
  createdAt: string;
};

const ACCOUNT_KEY = "lolvs-accounts-v3";
const SESSION_KEY = "lolvs-session-v3";
const CASE_KEY = "lolvs-cases-v3";
const COMMENT_KEY = "lolvs-comments-v3";
const EXPERT_KEY = "lolvs-expert-v3";
const MAX_ACTIVE_VIDEOS = 10;
const MAX_VIDEO_SECONDS = 120;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const DB_NAME = "lolvs-video-beta-v3";
const STORE_NAME = "case-videos";

const ADMIN_ACCOUNT: Account = {
  id: "demo-admin",
  nickname: "LOL.VS 관리자",
  pin: "0000",
  role: "admin",
};

const DEMO_MEMBER: Account = {
  id: "demo-member",
  nickname: "플레이어01",
  pin: "1111",
  role: "member",
};

const modeLabel = (mode: CaseMode) => (mode === "judgement" ? "플레이 판정" : "플레이 피드백");
const formatBytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024 / 1024))}MB`;
const formatDuration = (seconds: number) => {
  const minute = Math.floor(seconds / 60);
  const second = Math.round(seconds % 60);
  return `${minute}:${String(second).padStart(2, "0")}`;
};
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVideo(id: string, file: File) {
  const db = await openVideoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function loadVideo(id: string): Promise<Blob | null> {
  const db = await openVideoDb();
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

async function removeVideo(id: string) {
  const db = await openVideoDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function inspectVideo(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 정보를 확인할 수 없습니다."));
    };
    video.src = url;
  });
}

function Logo() {
  return (
    <button className="brand" type="button" aria-label="LOL.VS 홈으로">
      LOL<span>.</span><b>VS</b>
    </button>
  );
}

function LoginGate({ onLogin }: { onLogin: (account: SessionUser) => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const enter = (account: Account) => {
    const session = { id: account.id, nickname: account.nickname, role: account.role };
    writeLocal(SESSION_KEY, session);
    onLogin(session);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanNickname = nickname.trim();
    const cleanPin = pin.trim();
    setError("");

    if (cleanNickname.length < 2) {
      setError("닉네임은 2자 이상 입력해주세요.");
      return;
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      setError("로그인 번호는 숫자 4자리로 입력해주세요.");
      return;
    }

    const accounts = readLocal<Account[]>(ACCOUNT_KEY, [ADMIN_ACCOUNT, DEMO_MEMBER]);
    if (tab === "signup") {
      if (accounts.some((account) => account.nickname === cleanNickname)) {
        setError("이미 사용 중인 닉네임입니다.");
        return;
      }
      const account: Account = {
        id: crypto.randomUUID(),
        nickname: cleanNickname,
        pin: cleanPin,
        role: "member",
      };
      writeLocal(ACCOUNT_KEY, [...accounts, account]);
      enter(account);
      return;
    }

    const found = accounts.find((account) => account.nickname === cleanNickname && account.pin === cleanPin);
    if (!found) {
      setError("닉네임 또는 로그인 번호를 확인해주세요.");
      return;
    }
    enter(found);
  };

  return (
    <main className="login-page">
      <div className="login-atmosphere" aria-hidden="true" />
      <section className="login-intro">
        <Logo />
        <p className="eyebrow">LEAGUE PLAY REVIEW</p>
        <h1>
          누가 잘못했는지 판정받고,
          <br />
          <em>다음 플레이 방법까지 확인하세요.</em>
        </h1>
        <p className="login-description">
          짧은 롤 영상을 올리면 플레이어들의 의견과
          <br />
          근거가 남는 판정·피드백을 받을 수 있습니다.
        </p>
        <div className="login-points">
          <span><i>01</i> 실제 플레이 영상</span>
          <span><i>02</i> 근거 중심 댓글</span>
          <span><i>03</i> 관리자 검토 후 공개</span>
        </div>
      </section>

      <section className="login-panel" aria-label="로그인">
        <header>
          <span className="status-dot" />
          <div>
            <b>프로토타입 베타</b>
            <small>가입 후 바로 사건을 등록할 수 있습니다.</small>
          </div>
        </header>
        <div className="auth-tabs" role="tablist">
          <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")} type="button">로그인</button>
          <button className={tab === "signup" ? "active" : ""} onClick={() => setTab("signup")} type="button">회원가입</button>
        </div>
        <form onSubmit={submit}>
          <label>
            활동 닉네임
            <input
              autoComplete="username"
              maxLength={12}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="사이트에서 사용할 닉네임"
              value={nickname}
            />
          </label>
          <label>
            로그인 번호
            <input
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="숫자 4자리"
              type="password"
              value={pin}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button auth-submit" type="submit">
            {tab === "login" ? "LOL.VS 시작하기" : "가입하고 시작하기"}
          </button>
        </form>
        <div className="demo-logins">
          <span>데모 계정으로 확인</span>
          <div>
            <button type="button" onClick={() => enter(DEMO_MEMBER)}>일반 사용자</button>
            <button type="button" onClick={() => enter(ADMIN_ACCOUNT)}>관리자</button>
          </div>
        </div>
        <p className="prototype-note">현재 닉네임 로그인은 프로토타입 전용입니다.</p>
      </section>
    </main>
  );
}

function AppHeader({
  user,
  view,
  setView,
  onLogout,
}: {
  user: SessionUser;
  view: View;
  setView: (view: View) => void;
  onLogout: () => void;
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div onClick={() => setView("home")}><Logo /></div>
        <nav aria-label="주요 메뉴">
          <button className={view === "home" || view === "detail" || view === "submit" ? "active" : ""} onClick={() => setView("home")}>홈</button>
          <button className={view === "ranking" ? "active" : ""} onClick={() => setView("ranking")}>랭킹</button>
          <button className={view === "guide" ? "active" : ""} onClick={() => setView("guide")}>가이드</button>
          {user.role === "admin" && (
            <button className={view === "admin" ? "active admin-nav" : "admin-nav"} onClick={() => setView("admin")}>검토함</button>
          )}
        </nav>
        <div className="account-menu">
          <span className={`role-badge role-${user.role}`}>{user.role === "admin" ? "ADMIN" : "MEMBER"}</span>
          <div>
            <b>{user.nickname}</b>
            <small>{user.role === "admin" ? "전체 권한" : "사건 등록 · 댓글"}</small>
          </div>
          <button type="button" onClick={onLogout}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}

function SlotMeter({ used }: { used: number }) {
  const remaining = Math.max(0, MAX_ACTIVE_VIDEOS - used);
  return (
    <div className="slot-meter" aria-label={`영상 슬롯 ${used}/${MAX_ACTIVE_VIDEOS}`}>
      <div className="slot-meter-copy">
        <span><i className="status-dot" /> 현재 접수 가능</span>
        <strong>{remaining}<small>개 남음</small></strong>
      </div>
      <div className="slot-track">
        {Array.from({ length: MAX_ACTIVE_VIDEOS }, (_, index) => (
          <i className={index < used ? "used" : ""} key={index} />
        ))}
      </div>
      <p>진행 중인 영상은 최대 10개입니다. 완료·반려된 영상이 삭제되면 새 자리가 열립니다.</p>
    </div>
  );
}

function HomeView({
  cases,
  user,
  onSubmit,
  onOpen,
}: {
  cases: CaseRecord[];
  user: SessionUser;
  onSubmit: () => void;
  onOpen: (id: string) => void;
}) {
  const [mode, setMode] = useState<"all" | CaseMode>("all");
  const [category, setCategory] = useState<"전체" | Category>("전체");
  const visibleCases = cases.filter((item) => item.status === "published" || item.status === "completed");
  const filtered = visibleCases.filter(
    (item) => (mode === "all" || item.mode === mode) && (category === "전체" || item.category === category),
  );
  const used = cases.filter((item) => item.status === "pending" || item.status === "published").length;
  const isFull = used >= MAX_ACTIVE_VIDEOS;

  return (
    <main className="page-shell">
      <section className="home-hero">
        <div>
          <p className="eyebrow">LOL.VS OPEN BETA</p>
          <h1>
            누가 잘못했는지 판정받고,
            <br />
            <em>다음 플레이 방법까지 확인하세요.</em>
          </h1>
          <p>핵심 장면을 올리고, 플레이어들의 근거 있는 의견을 받아보세요.</p>
          <button className="primary-button write-button" disabled={isFull || user.role === "judge"} onClick={onSubmit}>
            {isFull ? "현재 접수 마감" : "영상으로 글쓰기"}
            <span>＋</span>
          </button>
        </div>
        <SlotMeter used={used} />
      </section>

      <section className="board-section">
        <header className="board-header">
          <div>
            <p className="eyebrow">PLAY REVIEW BOARD</p>
            <h2>플레이를 함께 봅니다</h2>
          </div>
          <div className="mode-tabs">
            <button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>전체</button>
            <button className={mode === "judgement" ? "active" : ""} onClick={() => setMode("judgement")}>플레이 판정</button>
            <button className={mode === "feedback" ? "active" : ""} onClick={() => setMode("feedback")}>플레이 피드백</button>
          </div>
        </header>
        <div className="category-tabs">
          {(["전체", "솔로랭크", "파티랭크", "내전"] as const).map((item) => (
            <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-board">
            <div className="empty-mark"><span>▶</span></div>
            <p className="eyebrow">FIRST CASE</p>
            <h3>아직 공개된 플레이가 없습니다.</h3>
            <p>첫 장면을 등록하면 관리자 검토 후 이곳에서 의견을 받을 수 있습니다.</p>
            <button className="secondary-button" disabled={isFull || user.role === "judge"} onClick={onSubmit}>
              첫 영상 등록하기
            </button>
          </div>
        ) : (
          <div className="case-list">
            {filtered.map((item) => (
              <button className={`case-row ${item.status === "completed" ? "completed" : ""}`} key={item.id} onClick={() => onOpen(item.id)}>
                <div className="case-thumb">
                  <span>▶</span>
                  <small>{formatDuration(item.videoDuration)}</small>
                </div>
                <div className="case-copy">
                  <span className={`mode-pill mode-${item.mode}`}>{modeLabel(item.mode)}</span>
                  <h3>{item.title}</h3>
                  <p>{item.authorName} · {item.category} · {formatDate(item.createdAt)}</p>
                </div>
                <div className="case-question">
                  <small>{item.status === "completed" ? "완료" : "의견을 기다리는 중"}</small>
                  <p>{item.question}</p>
                </div>
                <span className="row-arrow">→</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SubmitView({
  user,
  cases,
  onCancel,
  onCreated,
}: {
  user: SessionUser;
  cases: CaseRecord[];
  onCancel: () => void;
  onCreated: (record: CaseRecord) => void;
}) {
  const [mode, setMode] = useState<CaseMode>("judgement");
  const [category, setCategory] = useState<Category>("솔로랭크");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const used = cases.filter((item) => item.status === "pending" || item.status === "published").length;

  const chooseFile = async (nextFile: File | null) => {
    setFileError("");
    setFile(null);
    setDuration(0);
    if (!nextFile) return;
    if (!nextFile.type.startsWith("video/")) {
      setFileError("영상 파일만 등록할 수 있습니다.");
      return;
    }
    if (nextFile.size > MAX_VIDEO_BYTES) {
      setFileError("영상은 500MB 이하로 올려주세요.");
      return;
    }
    try {
      const seconds = await inspectVideo(nextFile);
      if (!Number.isFinite(seconds) || seconds > MAX_VIDEO_SECONDS) {
        setFileError("핵심 장면만 담은 2분 이하 영상을 올려주세요.");
        return;
      }
      setFile(nextFile);
      setDuration(seconds);
    } catch {
      setFileError("영상 정보를 읽을 수 없습니다. MP4 또는 WebM 파일을 사용해주세요.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || used >= MAX_ACTIVE_VIDEOS || user.role === "judge") return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const record: CaseRecord = {
      id: crypto.randomUUID(),
      mode,
      category,
      title: String(data.get("title") ?? "").trim(),
      question: String(data.get("question") ?? "").trim(),
      context: String(data.get("context") ?? "").trim(),
      position: String(data.get("position") ?? "").trim(),
      champion: String(data.get("champion") ?? "").trim(),
      gameTime: String(data.get("gameTime") ?? "").trim(),
      aClaim: mode === "judgement" ? String(data.get("aClaim") ?? "").trim() : undefined,
      bClaim: mode === "judgement" ? String(data.get("bClaim") ?? "").trim() : undefined,
      thought: mode === "feedback" ? String(data.get("thought") ?? "").trim() : undefined,
      feedbackFocus: mode === "feedback" ? String(data.get("feedbackFocus") ?? "").trim() : undefined,
      videoName: file.name,
      videoSize: file.size,
      videoDuration: duration,
      authorId: user.id,
      authorName: user.nickname,
      status: user.role === "admin" ? "published" : "pending",
      createdAt: new Date().toISOString(),
    };
    try {
      await saveVideo(record.id, file);
      onCreated(record);
    } finally {
      setSaving(false);
    }
  };

  if (used >= MAX_ACTIVE_VIDEOS) {
    return (
      <main className="page-shell narrow-page">
        <div className="simple-empty">
          <span>10 / 10</span>
          <h1>현재 영상 접수가 마감되었습니다.</h1>
          <p>진행 중인 사건이 완료되면 새로운 영상을 등록할 수 있습니다.</p>
          <button className="secondary-button" onClick={onCancel}>홈으로 돌아가기</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell submit-page">
      <header className="page-heading">
        <button onClick={onCancel}>← 돌아가기</button>
        <p className="eyebrow">NEW PLAY</p>
        <h1>어떤 도움을 받고 싶나요?</h1>
        <p>목적에 맞는 글을 선택하면 필요한 내용만 간단히 받습니다.</p>
      </header>

      <div className="mode-selector">
        <button className={mode === "judgement" ? "active judgement" : "judgement"} onClick={() => setMode("judgement")}>
          <span>A / B</span>
          <div>
            <strong>플레이 판정</strong>
            <small>누구의 판단이 더 문제였는지 의견을 받습니다.</small>
          </div>
        </button>
        <button className={mode === "feedback" ? "active feedback" : "feedback"} onClick={() => setMode("feedback")}>
          <span>↗</span>
          <div>
            <strong>플레이 피드백</strong>
            <small>내 선택을 복기하고 다음 플레이 방법을 찾습니다.</small>
          </div>
        </button>
      </div>

      <form className="submit-form" onSubmit={submit} ref={formRef}>
        <section className="form-card">
          <header><span>01</span><div><h2>영상 등록</h2><p>핵심 장면이 잘 보이는 2분 이하 영상을 선택하세요.</p></div></header>
          <label className={`video-drop ${file ? "has-file" : ""}`}>
            <input accept="video/mp4,video/webm,video/quicktime" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} type="file" />
            {file ? (
              <>
                <span className="upload-check">✓</span>
                <strong>{file.name}</strong>
                <small>{formatBytes(file.size)} · {formatDuration(duration)} · 다른 영상 선택</small>
              </>
            ) : (
              <>
                <span className="upload-icon">↑</span>
                <strong>영상 파일 선택</strong>
                <small>MP4, WebM, MOV · 최대 500MB · 최대 2분</small>
              </>
            )}
          </label>
          {fileError && <p className="form-error">{fileError}</p>}
        </section>

        <section className="form-card">
          <header><span>02</span><div><h2>장면 정보</h2><p>영상을 보기 전에 필요한 정보만 적어주세요.</p></div></header>
          <div className="field-grid two">
            <label>제목<input name="title" maxLength={60} placeholder="장면이 궁금해지는 제목" required /></label>
            <label>게임 유형
              <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
                <option>솔로랭크</option><option>파티랭크</option><option>내전</option>
              </select>
            </label>
            <label>내 포지션<input name="position" placeholder="예: 정글" required /></label>
            <label>플레이한 챔피언<input name="champion" placeholder="예: 리 신" required /></label>
            <label>게임 시간<input name="gameTime" placeholder="예: 24:05" required /></label>
            <label>가장 궁금한 질문<input name="question" maxLength={100} placeholder={mode === "judgement" ? "누구의 판단이 더 문제였나요?" : "이 상황에서 더 나은 선택은 무엇인가요?"} required /></label>
          </div>
          <label>상황 설명<textarea name="context" maxLength={600} placeholder="영상만으로 알기 어려운 팀 상황과 콜을 적어주세요." required /></label>
        </section>

        <section className="form-card">
          <header><span>03</span><div><h2>{mode === "judgement" ? "양측 입장" : "내 생각과 목표"}</h2><p>{mode === "judgement" ? "두 입장을 최대한 공정하게 정리해주세요." : "왜 그렇게 플레이했는지 솔직하게 남겨주세요."}</p></div></header>
          {mode === "judgement" ? (
            <div className="field-grid two claims">
              <label>A측 입장<textarea name="aClaim" maxLength={500} placeholder="A측은 왜 이 선택이 맞았다고 생각하나요?" required /></label>
              <label>B측 입장<textarea name="bClaim" maxLength={500} placeholder="B측은 왜 다른 선택이 필요했다고 생각하나요?" required /></label>
            </div>
          ) : (
            <div className="field-grid two">
              <label>당시 내 생각<textarea name="thought" maxLength={500} placeholder="무엇을 보고 어떤 판단을 했는지 적어주세요." required /></label>
              <label>받고 싶은 피드백<textarea name="feedbackFocus" maxLength={500} placeholder="동선, 스킬 사용, 포지셔닝 등 궁금한 점을 적어주세요." required /></label>
            </div>
          )}
        </section>

        <label className="privacy-check">
          <input required type="checkbox" />
          <span>Riot ID, 채팅, 개인정보가 노출되지 않는지 확인했습니다.</span>
        </label>
        <div className="submit-actions">
          <div>
            <strong>{user.role === "admin" ? "관리자 게시" : "관리자 검토 후 공개"}</strong>
            <small>{user.role === "admin" ? "관리자 계정의 글은 바로 공개됩니다." : "검토 중에는 다른 사용자에게 보이지 않습니다."}</small>
          </div>
          <button className="primary-button" disabled={!file || saving} type="submit">{saving ? "영상 저장 중…" : "검토 요청하기"}</button>
        </div>
      </form>
    </main>
  );
}

function DetailView({
  item,
  user,
  comments,
  expert,
  onBack,
  onComment,
  onRoleRequest,
  onExpertSubmit,
}: {
  item: CaseRecord;
  user: SessionUser;
  comments: CommentRecord[];
  expert?: ExpertRecord;
  onBack: () => void;
  onComment: (body: string) => void;
  onRoleRequest: (kind: CaseMode) => void;
  onExpertSubmit: (record: ExpertRecord) => void;
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const [comment, setComment] = useState("");
  const [showExpertForm, setShowExpertForm] = useState(false);

  useEffect(() => {
    let url = "";
    loadVideo(item.id).then((blob) => {
      if (!blob) return;
      url = URL.createObjectURL(blob);
      setVideoUrl(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.id]);

  const submitExpert = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onExpertSubmit({
      id: crypto.randomUUID(),
      caseId: item.id,
      authorName: user.nickname,
      kind: item.mode,
      result: item.mode === "judgement" ? (String(data.get("result")) as "A" | "B") : undefined,
      timestamp: String(data.get("timestamp") ?? "").trim(),
      reason: String(data.get("reason") ?? "").trim(),
      nextPlay: String(data.get("nextPlay") ?? "").trim(),
      createdAt: new Date().toISOString(),
    });
    setShowExpertForm(false);
  };

  return (
    <main className="page-shell detail-page">
      <button className="back-link" onClick={onBack}>← 목록으로</button>
      <header className="detail-heading">
        <div>
          <span className={`mode-pill mode-${item.mode}`}>{modeLabel(item.mode)}</span>
          <h1>{item.title}</h1>
          <p>{item.authorName} · {item.category} · {item.position} / {item.champion} · 조회 기록 없음</p>
        </div>
        <button
          className={item.mode === "judgement" ? "expert-action judgement" : "expert-action feedback"}
          onClick={() => user.role === "admin" ? setShowExpertForm(true) : onRoleRequest(item.mode)}
        >
          {item.mode === "judgement" ? "판정하기" : "피드백하기"}
        </button>
      </header>

      <div className="detail-layout">
        <section className="detail-main">
          <div className="video-stage">
            {videoUrl ? <video controls playsInline src={videoUrl} /> : <div className="video-loading">영상을 불러오는 중입니다.</div>}
          </div>
          <div className="case-brief">
            <div><small>핵심 질문</small><strong>{item.question}</strong></div>
            <div><small>게임 시간</small><strong>{item.gameTime}</strong></div>
          </div>
          {expert && (
            <section className="expert-result">
              <header>
                <span>{expert.kind === "judgement" ? "공식 판정" : "전문 피드백"}</span>
                <strong>{expert.kind === "judgement" ? `${expert.result}측 판단` : "다음 플레이 제안"}</strong>
                <small>{expert.authorName} · {formatDate(expert.createdAt)}</small>
              </header>
              <div><b>{expert.timestamp}</b><p>{expert.reason}</p></div>
              <footer><span>다음 플레이</span><p>{expert.nextPlay}</p></footer>
            </section>
          )}
          <section className="comments">
            <header><h2>댓글 <b>{comments.length}</b></h2><span>플레이에 대한 의견을 남겨주세요.</span></header>
            <form onSubmit={(event) => { event.preventDefault(); if (!comment.trim()) return; onComment(comment.trim()); setComment(""); }}>
              <textarea maxLength={800} onChange={(event) => setComment(event.target.value)} placeholder="결과보다 당시 볼 수 있었던 정보를 중심으로 적어주세요." value={comment} />
              <button type="submit">댓글 등록</button>
            </form>
            {comments.length === 0 ? (
              <div className="comment-empty">아직 댓글이 없습니다. 첫 의견을 남겨주세요.</div>
            ) : (
              <div className="comment-list">
                {comments.map((entry) => (
                  <article key={entry.id}>
                    <span>{entry.authorName.slice(0, 1)}</span>
                    <div><header><strong>{entry.authorName}</strong><small>{formatDate(entry.createdAt)}</small></header><p>{entry.body}</p></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
        <aside className="detail-aside">
          <section>
            <p className="eyebrow">SCENE CONTEXT</p>
            <h2>작성자가 본 상황</h2>
            <p>{item.context}</p>
          </section>
          {item.mode === "judgement" ? (
            <>
              <section className="claim-card a"><span>A</span><div><small>A측 입장</small><p>{item.aClaim}</p></div></section>
              <section className="claim-card b"><span>B</span><div><small>B측 입장</small><p>{item.bClaim}</p></div></section>
            </>
          ) : (
            <>
              <section><small>당시 내 생각</small><p>{item.thought}</p></section>
              <section><small>받고 싶은 피드백</small><p>{item.feedbackFocus}</p></section>
            </>
          )}
        </aside>
      </div>

      {showExpertForm && user.role === "admin" && (
        <div className="modal-layer" role="dialog" aria-modal="true">
          <form className="modal-card expert-form-modal" onSubmit={submitExpert}>
            <button className="modal-close" onClick={() => setShowExpertForm(false)} type="button">×</button>
            <p className="eyebrow">{item.mode === "judgement" ? "OFFICIAL JUDGEMENT" : "EXPERT FEEDBACK"}</p>
            <h2>{item.mode === "judgement" ? "근거가 남는 판정을 작성해주세요." : "다음 플레이에 도움이 되는 피드백을 남겨주세요."}</h2>
            {item.mode === "judgement" && (
              <div className="result-picker">
                <label><input defaultChecked name="result" type="radio" value="A" /><span>A측 판단</span></label>
                <label><input name="result" type="radio" value="B" /><span>B측 판단</span></label>
              </div>
            )}
            <label>핵심 타임스탬프<input name="timestamp" placeholder="예: 24:05" required /></label>
            <label>판단 근거<textarea name="reason" placeholder="당시 확인할 수 있었던 정보와 판단 근거를 적어주세요." required /></label>
            <label>다음에 더 나은 선택<textarea name="nextPlay" placeholder="같은 상황에서 시도할 수 있는 구체적인 선택을 적어주세요." required /></label>
            <button className="primary-button" type="submit">{item.mode === "judgement" ? "판정 등록하기" : "피드백 등록하기"}</button>
          </form>
        </div>
      )}
    </main>
  );
}

function AdminView({
  cases,
  onApprove,
  onReject,
  onOpen,
}: {
  cases: CaseRecord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const pending = cases.filter((item) => item.status === "pending");
  const published = cases.filter((item) => item.status === "published" || item.status === "completed");
  return (
    <main className="page-shell admin-page">
      <header className="page-heading">
        <p className="eyebrow">ADMIN REVIEW</p>
        <h1>영상 검토함</h1>
        <p>개인정보와 내용 적합성을 확인한 뒤 공개하세요.</p>
      </header>
      <div className="admin-summary">
        <div><small>검토 대기</small><strong>{pending.length}</strong></div>
        <div><small>현재 공개</small><strong>{published.length}</strong></div>
        <div><small>남은 슬롯</small><strong>{Math.max(0, MAX_ACTIVE_VIDEOS - pending.length - published.filter((item) => item.status === "published").length)}</strong></div>
      </div>
      <section className="admin-list">
        <header><h2>검토가 필요한 영상</h2><span>{pending.length}건</span></header>
        {pending.length === 0 ? (
          <div className="admin-empty">새로운 검토 요청이 없습니다.</div>
        ) : pending.map((item) => (
          <article key={item.id}>
            <div>
              <span className={`mode-pill mode-${item.mode}`}>{modeLabel(item.mode)}</span>
              <h3>{item.title}</h3>
              <p>{item.authorName} · {item.videoName} · {formatBytes(item.videoSize)}</p>
            </div>
            <div className="admin-actions">
              <button onClick={() => onOpen(item.id)}>미리보기</button>
              <button className="reject" onClick={() => onReject(item.id)}>반려·삭제</button>
              <button className="approve" onClick={() => onApprove(item.id)}>게시 승인</button>
            </div>
          </article>
        ))}
      </section>
      <section className="admin-list published-admin-list">
        <header><h2>공개 중인 영상</h2><span>{published.length}건</span></header>
        {published.length === 0 ? (
          <div className="admin-empty">현재 공개된 영상이 없습니다.</div>
        ) : published.map((item) => (
          <article key={item.id}>
            <div>
              <span className={`mode-pill mode-${item.mode}`}>{modeLabel(item.mode)}</span>
              <h3>{item.title}</h3>
              <p>{item.authorName} · {item.status === "completed" ? "판정·피드백 완료" : "의견 접수 중"} · {formatBytes(item.videoSize)}</p>
            </div>
            <div className="admin-actions">
              <button onClick={() => onOpen(item.id)}>게시물 보기</button>
              <button className="reject" onClick={() => onReject(item.id)}>게시물·영상 삭제</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function RankingView() {
  return (
    <main className="page-shell quiet-page">
      <header className="page-heading">
        <p className="eyebrow">REVIEWER RECORD</p>
        <h1>판정자 랭킹</h1>
        <p>실제 판정과 인정 데이터가 쌓이면 순위가 공개됩니다.</p>
      </header>
      <div className="ranking-empty">
        <span>—</span>
        <h2>아직 집계할 판정이 없습니다.</h2>
        <p>첫 공식 판정이 등록되면 참여 수와 인정 수를 기준으로 기록을 시작합니다.</p>
      </div>
    </main>
  );
}

function GuideView() {
  return (
    <main className="page-shell guide-page">
      <header className="page-heading">
        <p className="eyebrow">HOW LOL.VS WORKS</p>
        <h1>장면에서 다음 플레이까지</h1>
        <p>짧게 올리고, 근거로 이야기하고, 다음 선택을 가져갑니다.</p>
      </header>
      <section className="guide-steps">
        {[
          ["01", "로그인", "활동 닉네임으로 가입합니다."],
          ["02", "영상 등록", "2분 이하 핵심 장면을 올립니다."],
          ["03", "관리자 검토", "개인정보와 내용을 확인합니다."],
          ["04", "의견과 피드백", "댓글과 전문 피드백을 확인합니다."],
        ].map(([number, title, description]) => (
          <article key={number}><span>{number}</span><h2>{title}</h2><p>{description}</p></article>
        ))}
      </section>
      <section className="guide-rules">
        <article>
          <p className="eyebrow">WHO CAN POST</p>
          <h2>사건 등록</h2>
          <p>일반 사용자는 플레이 판정과 플레이 피드백 영상을 등록할 수 있습니다. 판정자는 판정의 독립성을 위해 사건을 등록하지 않습니다.</p>
        </article>
        <article>
          <p className="eyebrow">WHO CAN REVIEW</p>
          <h2>판정과 전문 피드백</h2>
          <p>현재는 관리자만 작성할 수 있습니다. 실제 서비스를 사용하고 싶은 고티어 플레이어는 개발자에게 권한을 요청할 수 있습니다.</p>
        </article>
        <article>
          <p className="eyebrow">PRIVACY FIRST</p>
          <h2>닉네임으로 참여</h2>
          <p>사이트 활동에는 Riot ID 대신 별도 닉네임을 사용합니다. 영상 속 Riot ID, 채팅과 개인정보는 반드시 가려주세요.</p>
        </article>
      </section>
    </main>
  );
}

function RoleRequestModal({ kind, onClose }: { kind: CaseMode; onClose: () => void }) {
  return (
    <div className="modal-layer role-modal-layer" role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
      <section className="modal-card role-request-modal">
        <button className="modal-close" onClick={onClose} type="button">×</button>
        <span className={kind === "judgement" ? "request-symbol judgement" : "request-symbol feedback"}>
          {kind === "judgement" ? "A/B" : "↗"}
        </span>
        <p className="eyebrow">{kind === "judgement" ? "JUDGEMENT ACCESS" : "FEEDBACK ACCESS"}</p>
        <h2 id="role-modal-title">{kind === "judgement" ? "판정자 권한이 필요합니다." : "피드백 권한이 필요합니다."}</h2>
        <p className="request-main-copy">
          사용하고 싶으면
          <br />
          <strong>개발자에게 슬랙 DM 부탁드립니다.</strong>
        </p>
        <p className="request-sub-copy">프로토타입에서는 확인된 고티어 사용자에게 직접 권한을 열어드립니다.</p>
        <button className="primary-button" onClick={onClose} type="button">확인했습니다</button>
      </section>
    </div>
  );
}

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<View>("home");
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [experts, setExperts] = useState<ExpertRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [roleRequest, setRoleRequest] = useState<CaseMode | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const accounts = readLocal<Account[]>(ACCOUNT_KEY, []);
      if (accounts.length === 0) writeLocal(ACCOUNT_KEY, [ADMIN_ACCOUNT, DEMO_MEMBER]);
      setUser(readLocal<SessionUser | null>(SESSION_KEY, null));
      setCases(readLocal<CaseRecord[]>(CASE_KEY, []));
      setComments(readLocal<CommentRecord[]>(COMMENT_KEY, []));
      setExperts(readLocal<ExpertRecord[]>(EXPERT_KEY, []));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selected = useMemo(() => cases.find((item) => item.id === selectedId), [cases, selectedId]);

  const saveCases = (next: CaseRecord[]) => {
    setCases(next);
    writeLocal(CASE_KEY, next);
  };

  const openCase = (id: string) => {
    setSelectedId(id);
    setView("detail");
  };

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setView("home");
  };

  const createCase = (record: CaseRecord) => {
    saveCases([record, ...cases]);
    setView(record.status === "published" ? "detail" : "home");
    setSelectedId(record.id);
    setToast(record.status === "published" ? "영상이 공개되었습니다." : "검토 요청이 접수되었습니다.");
  };

  const approve = (id: string) => {
    saveCases(cases.map((item) => item.id === id ? { ...item, status: "published" } : item));
    setToast("게시를 승인했습니다.");
  };

  const reject = async (id: string) => {
    await removeVideo(id);
    saveCases(cases.filter((item) => item.id !== id));
    const nextComments = comments.filter((item) => item.caseId !== id);
    setComments(nextComments);
    writeLocal(COMMENT_KEY, nextComments);
    setToast("영상과 게시물을 삭제했습니다.");
  };

  const addComment = (caseId: string, body: string) => {
    if (!user) return;
    const next = [
      ...comments,
      { id: crypto.randomUUID(), caseId, authorId: user.id, authorName: user.nickname, body, createdAt: new Date().toISOString() },
    ];
    setComments(next);
    writeLocal(COMMENT_KEY, next);
  };

  const addExpert = (record: ExpertRecord) => {
    const nextExperts = [...experts.filter((item) => item.caseId !== record.caseId), record];
    setExperts(nextExperts);
    writeLocal(EXPERT_KEY, nextExperts);
    saveCases(cases.map((item) => item.id === record.caseId ? { ...item, status: "completed" } : item));
    setToast(record.kind === "judgement" ? "공식 판정을 등록했습니다." : "전문 피드백을 등록했습니다.");
  };

  if (!ready) return <div className="boot-screen"><Logo /></div>;
  if (!user) return <LoginGate onLogin={setUser} />;

  return (
    <div className="app">
      <AppHeader user={user} view={view} setView={setView} onLogout={logout} />
      {view === "home" && <HomeView cases={cases} user={user} onSubmit={() => setView("submit")} onOpen={openCase} />}
      {view === "submit" && <SubmitView user={user} cases={cases} onCancel={() => setView("home")} onCreated={createCase} />}
      {view === "detail" && selected && (
        <DetailView
          item={selected}
          user={user}
          comments={comments.filter((item) => item.caseId === selected.id)}
          expert={experts.find((item) => item.caseId === selected.id)}
          onBack={() => setView(user.role === "admin" && selected.status === "pending" ? "admin" : "home")}
          onComment={(body) => addComment(selected.id, body)}
          onRoleRequest={setRoleRequest}
          onExpertSubmit={addExpert}
        />
      )}
      {view === "ranking" && <RankingView />}
      {view === "guide" && <GuideView />}
      {view === "admin" && user.role === "admin" && <AdminView cases={cases} onApprove={approve} onReject={reject} onOpen={openCase} />}
      {roleRequest && <RoleRequestModal kind={roleRequest} onClose={() => setRoleRequest(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      <footer className="site-footer">
        <Logo />
        <p>판정은 신중하게, 피드백은 다음 플레이에 도움이 되게.</p>
        <span>LOL.VS PROTOTYPE BETA</span>
      </footer>
    </div>
  );
}
