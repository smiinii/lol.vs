"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useRef, useState } from "react";

type View = "home" | "ranking" | "guide" | "detail" | "submit" | "search";
type VoteSide = "A" | "B";
type CaseMode = "judgement" | "feedback";
type User = { nickname: string; tier: string; peakTier?: string; primaryRole?: string };
type LocalCase = {
  title: string;
  mode: CaseMode;
  category: string;
  aClaim?: string;
  bClaim?: string;
  thought?: string;
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
type JudgeVerdictDraft = { side: VoteSide; timestamp: string; visibleInfo: string; reason: string; nextChoice: string; confidence: number };
type ExpertFeedbackDraft = { timestamp: string; observedInfo: string; analysis: string; nextChoice: string; author?: string; tier?: string; role?: string };
type ResolvedVerdict = { side: VoteSide; judge: string; judgeTier: string; judgeRole: string; peakTier: string; timestamp: string; visibleInfo: string; reason: string; nextChoice: string; confidence: number; recognitions: number; acceptance: number; positionJudgements: number; decidedAt: string };

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;
const USER_KEY = "lolvs-demo-user";
const CHALLENGER_TEST_KEY = "lolvs-challenger-test-v1";
const CASE_KEY = "lolvs-local-case";
const VIDEO_KEY = "latest-case-video";
const DEMO_ACCOUNTS: User[] = [
  { nickname: "억울한플레이어", tier: "다이아몬드 IV", peakTier: "다이아몬드 I", primaryRole: "미드" },
  { nickname: "판결하는사람", tier: "챌린저", peakTier: "챌린저", primaryRole: "정글" },
];

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
].map((item, index) => ({ ...item, mode: index % 3 === 1 && item.title !== "전령 앞에서 먼저 물린 탑, 팀이 버렸다는 게 맞나요?" && item.title !== "미드 로밍을 따라가지 않은 게 잘못인가요?" ? ("feedback" as const) : ("judgement" as const), likes: item.comments * 2 + 41 - index * 2 }));

const resolvedVerdicts: Record<string, ResolvedVerdict> = {
  "전령 앞에서 먼저 물린 탑, 팀이 버렸다는 게 맞나요?": { side: "A", judge: "맵리딩중", judgeTier: "그랜드마스터 612P", judgeRole: "정글", peakTier: "챌린저 781P", timestamp: "24:05", visibleInfo: "상대 정글과 미드가 시야에서 사라졌고, 아군 딜러는 강가에 합류하기 전이었습니다.", reason: "상대 위치가 확인되지 않은 상태에서 먼저 시야 밖으로 진입했고, 팀이 합류할 수 있는 거리도 아니었습니다. 후속 대응보다 선진입 판단의 책임이 더 큽니다.", nextChoice: "강가 입구에 시야를 먼저 확보하고, 딜러 합류 거리와 상대 위치를 확인한 뒤 진입해야 합니다.", confidence: 92, recognitions: 1284, acceptance: 89, positionJudgements: 184, decidedAt: "오늘 02:18" },
  "미드 로밍을 따라가지 않은 게 잘못인가요?": { side: "B", judge: "판결요정", judgeTier: "챌린저 942P", judgeRole: "미드", peakTier: "챌린저 1,021P", timestamp: "12:42", visibleInfo: "미드는 라인 손실 핑을 남겼고, 사이드 교전은 합류 시간을 확인하지 않은 채 먼저 시작됐습니다.", reason: "미드가 먼저 라인 손실을 알렸지만 교전 시작 핑이 늦었습니다. 로밍을 따라가지 않은 선택보다 아군 상황을 확인하지 않고 교전을 연 판단이 더 큰 원인입니다.", nextChoice: "교전 시작 전 미드의 라인 상태와 합류 가능 시간을 확인하고, 불가능하면 시야만 확보한 뒤 빠져야 합니다.", confidence: 88, recognitions: 1769, acceptance: 93, positionJudgements: 231, decidedAt: "어제 23:41" },
};

const topJudges = [
  { name: "판결요정", tier: "챌린저 942P", role: "미드", judgements: 248, recognitions: 6821, acceptance: 93 },
  { name: "맵리딩중", tier: "그랜드마스터 612P", role: "정글", judgements: 184, recognitions: 5930, acceptance: 89 },
  { name: "라인의정석", tier: "챌린저 811P", role: "탑", judgements: 172, recognitions: 5426, acceptance: 91 },
  { name: "바텀연구원", tier: "그랜드마스터 488P", role: "원딜", judgements: 156, recognitions: 4890, acceptance: 87 },
  { name: "시야먼저", tier: "마스터 376P", role: "서포터", judgements: 139, recognitions: 4312, acceptance: 86 },
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

const feedbackCommentsSeed: CommentItem[] = [
  { id: 501, name: "라인연구중", tier: "에메랄드 I", text: "라인을 먼저 밀고 합류하려던 의도는 이해됩니다. 다만 상대 정글이 보이지 않을 때는 한 웨이브를 포기하더라도 강가 입구를 먼저 확인하는 편이 안전해 보여요.", evidence: "00:24 상대 정글 위치가 사라진 뒤에도 미니맵 확인 없이 이동했습니다.", likes: 84, replies: [] },
  { id: 502, name: "미드복기노트", tier: "다이아몬드 III", text: "스킬을 쓰기 전 한 번 더 거리를 벌렸다면 상대 진입기를 빼고 교전할 수 있었습니다. 다음에는 딜보다 상대 핵심 스킬을 먼저 확인해 보세요.", evidence: "00:27 상대 진입기가 남아 있는 상태에서 먼저 사거리 안으로 들어갔습니다.", likes: 67, replies: [{ id: 520, name: "천천히보자", tier: "마스터", text: "동의합니다. 여기서는 피해량보다 스킬 교환 순서를 보는 게 핵심입니다." }] },
  { id: 503, name: "와드먼저", tier: "플래티넘 I", text: "작성자가 노린 선택 자체는 좋았어요. 핑을 한 번 더 남겨서 팀이 같은 타이밍에 움직이게 했으면 성공 확률이 높아졌을 것 같습니다.", likes: 51, replies: [] },
  { id: 504, name: "한타복기왕", tier: "마스터", text: "교전 시작보다 빠져나올 경로를 먼저 정했으면 좋겠습니다. 진입 전 아군 위치와 상대 주요 스킬 두 가지만 확인하는 습관을 들여보세요.", evidence: "00:29 아군 원딜과의 거리가 화면 한 칸 이상 벌어진 상태였습니다.", likes: 46, replies: [] },
  { id: 505, name: "다음플레이", tier: "에메랄드 II", text: "결과는 아쉬웠지만 상대 시선을 끌어준 점은 좋았습니다. 다음에는 같은 움직임을 하더라도 아군이 이득을 볼 수 있는 타이밍인지 먼저 확인하면 좋겠어요.", likes: 39, replies: [] },
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
  const [serviceMode, setServiceMode] = useState<CaseMode>("judgement");
  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [popularCycle, setPopularCycle] = useState(0);
  const [judgeIndex, setJudgeIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setPopularCycle((cycle) => cycle + 1), 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setJudgeIndex((index) => (index + 1) % topJudges.length), 6000);
    return () => window.clearInterval(timer);
  }, []);
  const filtered = compactCases.filter((item) => item.mode === serviceMode && (category === "전체" || item.category === category) && Boolean(resolvedVerdicts[item.title]) === showResolved);
  const casesPerPage = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / casesPerPage));
  const pageItems = filtered.slice((page - 1) * casesPerPage, page * casesPerPage);
  const popularPosts = popularCycle % 2 === 0 ? weeklyPosts : [weeklyPosts[2], weeklyPosts[0], weeklyPosts[1], weeklyPosts[4], weeklyPosts[3]];
  const showLocal = !showResolved && localCase && localCase.mode === serviceMode && (category === "전체" || localCase.category === category);
  const currentJudge = topJudges[judgeIndex];
  const moveJudge = (direction: number) => setJudgeIndex((index) => (index + direction + topJudges.length) % topJudges.length);
  return (
    <main className="page-shell clean-home">
      <div className="clean-home-grid">
        <section className="feed-column">
          <header className="clean-home-intro">
            <div>
              <span className="clean-eyebrow">검증된 플레이 판정</span>
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
            {pageItems.map((item) => { const resolved = resolvedVerdicts[item.title]; return (
              <button className={resolved ? "clean-case-row case-resolved" : "clean-case-row"} key={item.title} onClick={() => openDetail(false, item.title)}>
                <span className="thumb"><img src={item.image} alt="" /><i>▶</i><small>{item.clip}</small>{resolved && <b className="resolved-stamp">판정 완료</b>}</span>
                <span className="case-copy"><strong>{item.title}</strong><span className="author-line">{item.author}<VerifiedBadge tier={item.tier} inline /></span><small>{item.category} · {item.meta}{resolved ? ` · ${resolved.side}측 잘못` : ""}</small></span>
                <span className="case-status">
                  {serviceMode === "judgement" ? <span className="row-votes"><small className={resolved ? "resolved-time" : ""}>{resolved ? "판정 완료" : item.time}</small><VoteBar a={item.a} b={item.b} compact /></span> : <span className="feedback-row-summary"><small>{item.time}</small><span><b>전문 피드백 {Math.max(1, Math.round(item.comments / 24))}개</b><em>댓글 {item.comments}</em></span></span>}
                  <span className="case-engagement"><span><i className="like-icon" aria-hidden="true">♥</i><b>{item.likes}</b></span><span><i className="comment-icon" aria-hidden="true" /><b>{item.comments}</b></span></span>
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
            <ol>{popularPosts.map((post, index) => <li key={post.title}><button onClick={() => openDetail(false, post.title)}><span className={index < 3 ? "rank hot" : "rank"}>{index + 1}</span><span><strong>{post.title}</strong><small>{post.meta}</small></span><em className={`trend-${post.trend}`}>{post.trend === "up" ? "▲" : post.trend === "down" ? "▼" : "—"} {post.delta || ""}</em></button></li>)}</ol>
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
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [expertFeedback, setExpertFeedback] = useState<ExpertFeedbackDraft | null>(null);
  const result = vote === "A" ? { a: 59, b: 41 } : vote === "B" ? { a: 57, b: 43 } : { a: 58, b: 42 };
  const title = viewingLocal && localCase ? localCase.title : selectedTitle;
  const detailMode: CaseMode = viewingLocal && localCase ? localCase.mode : compactCases.find((item) => item.title === title)?.mode ?? "judgement";
  const resolvedVerdict = detailMode === "judgement" && !viewingLocal ? resolvedVerdicts[title] : undefined;
  const aClaim = viewingLocal && localCase ? localCase.aClaim ?? "" : "미드가 바론 시야를 확보하지 않고 라인을 밀다가 합류했습니다. 미드의 지도 관리 소홀과 합류 지연이 원인입니다.";
  const bClaim = viewingLocal && localCase ? localCase.bClaim ?? "" : "정글이 바론 핑을 찍지 않았고, 미드가 라인을 밀 수밖에 없는 상황이었습니다. 팀 전체의 판단 실수가 더 큽니다.";
  const playThought = viewingLocal && localCase ? localCase.thought ?? "당시 어떤 판단으로 플레이했는지 작성하지 않았습니다." : "라인을 먼저 밀어 두면 상대보다 빠르게 합류할 수 있다고 생각했습니다. 상대 정글 위치를 정확히 확인하지 못했지만, 아군이 바로 교전을 열지는 않을 것으로 판단했습니다.";
  const author = viewingLocal && localCase ? localCase.author : "한타는팀운";
  const tier = viewingLocal && localCase ? localCase.tier : "다이아몬드 IV";
  const videoSrc = viewingLocal && localVideoUrl ? localVideoUrl : asset("/media/demo.mp4");
  const voteStorageKey = user ? `lolvs-vote:${user.nickname}:${title}` : "";
  const verdictStorageKey = user ? `lolvs-verdict:${user.nickname}:${title}` : "";
  const feedbackStorageKey = user ? `lolvs-expert-feedback:${user.nickname}:${title}` : "";
  const recognitionStorageKey = user && resolvedVerdict ? `lolvs-recognition:${user.nickname}:${title}` : "";
  const diamondCase = tier.includes("다이아몬드");
  const judgeRequirement = diamondCase ? "그랜드마스터" : "마스터";
  const canJudge = Boolean(detailMode === "judgement" && user && tierLevel(user.tier) >= (diamondCase ? 8 : 7));
  const canGiveFeedback = Boolean(detailMode === "feedback" && user && tierLevel(user.tier) >= (diamondCase ? 8 : 7));
  const baseCommentCount = detailMode === "feedback" ? feedbackCommentsSeed.length : commentsSeed.length;
  const commentTotal = (detailMode === "feedback" ? 38 : 125) + Math.max(0, comments.length - baseCommentCount);
  const commentPageCount = Math.max(1, Math.ceil(comments.length / 5));
  const visibleComments = comments.slice((commentPage - 1) * 5, commentPage * 5);

  useEffect(() => {
    setComments(detailMode === "feedback" ? feedbackCommentsSeed : commentsSeed);
    setCommentPage(1);
  }, [detailMode, title]);

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
    setPendingVote(null);
    toast(`${side}측 잘못으로 의견 투표했습니다.`);
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

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return requireLogin();
    if (!feedback.trim()) return toast("댓글 내용을 입력해 주세요.");
    if (detailMode === "judgement" && !evidence.trim()) return toast("댓글과 판단 근거를 함께 적어주세요.");
    const item: CommentItem = { id: Date.now(), name: user.nickname, tier: user.tier, text: feedback.trim(), evidence: evidence.trim() || undefined, vote: detailMode === "judgement" ? vote ?? undefined : undefined, likes: 0, replies: [] };
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
    setComments(comments.map((comment) => comment.id === commentId ? { ...comment, replies: [...comment.replies, { id: Date.now(), name: user.nickname, tier: user.tier, text: replyText.trim(), vote: detailMode === "judgement" ? vote ?? undefined : undefined }] } : comment));
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
        <div className="detail-title-row"><div className="detail-title"><span className={detailMode === "judgement" ? "detail-mode-badge judgement" : "detail-mode-badge feedback"}>{detailMode === "judgement" ? "플레이 판정" : "플레이 피드백"}</span>{resolvedVerdict && <span className="detail-resolved-badge">판결 완료 · {resolvedVerdict.side}측 잘못</span>}<h1>{title}</h1></div><div className="detail-title-actions"><button className="inline-report" onClick={() => requestReport("게시물")}>⚑ 게시물 신고</button>{canJudge && !resolvedVerdict && <button className={officialVerdict ? "judge-jump-button submitted" : "judge-jump-button"} disabled={Boolean(officialVerdict)} onClick={() => setJudgeModalOpen(true)}>{officialVerdict ? "판결 제출 완료" : "판결하기"}</button>}{canGiveFeedback && <button className={expertFeedback ? "expert-feedback-button submitted" : "expert-feedback-button"} disabled={Boolean(expertFeedback)} onClick={() => setFeedbackModalOpen(true)}>{expertFeedback ? "피드백 제출 완료" : "피드백 주기"}</button>}</div></div>
        <div className="detail-post-meta"><div className="author"><span className="avatar small">{author[0]}</span><span className="post-author-copy"><small>작성자</small><strong>{author}</strong></span><VerifiedBadge tier={tier} demo={viewingLocal} inline /></div><span className="post-view-count">조회수 <b>3,842</b></span></div>
        <div className="video-card real-video"><video src={videoSrc} controls playsInline poster={viewingLocal ? undefined : asset("/media/gameplay-detail.png")}>브라우저가 영상을 지원하지 않습니다.</video></div>
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
          <div className="comments-heading"><div><h2>댓글 <b>{commentTotal}</b></h2><span>{detailMode === "judgement" ? "모든 인증 사용자 참여 · 의견 투표 시 선택 공개" : "댓글은 모든 인증 사용자가 자유롭게 참여합니다."}</span></div><button onClick={() => { if (!user) requireLogin(); else setComposerOpen(!composerOpen); }}>{composerOpen ? "닫기" : "댓글 쓰기"}</button></div>
          {composerOpen && user && <form className="comment-composer compact-composer" onSubmit={addComment}><div className="comment-fields">{detailMode === "judgement" && <input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="판단 근거 또는 타임스탬프" aria-label="판단 근거" />}<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder={detailMode === "judgement" ? "댓글을 입력하세요." : "플레이에 대한 의견이나 질문을 남겨주세요."} aria-label="댓글 작성" /></div><button className="compact-comment-submit" type="submit">등록</button></form>}
          {visibleComments.map((item, index) => (
            <article className="comment parent-comment" key={item.id}>
              <span className="comment-avatar">{item.name[0]}</span>
              <div>
                <div className="comment-meta"><strong>{item.name}</strong><VerifiedBadge tier={item.tier} demo={item.name === user?.nickname} inline />{detailMode === "judgement" && <OpinionBadge side={activityVoteFor(item.name, item.vote)} />}<small>{(commentPage - 1) * 5 + index + 1}시간 전</small></div>
                <p>{item.text}</p>{item.evidence && <blockquote><b>판단 근거</b>{item.evidence}</blockquote>}
                <div className="comment-actions"><button className={likedComments.includes(item.id) ? "liked" : ""} onClick={() => likeComment(item.id)}>{likedComments.includes(item.id) ? "♥" : "♡"} {item.likes}</button>{item.replies.length > 0 && <button className="reply-toggle" onClick={() => toggleReplies(item.id)}>{expandedReplies.includes(item.id) ? "답글 접기" : `답글 ${item.replies.length}개 보기`}</button>}<button onClick={() => { if (!user) return requireLogin(); setReplyingTo(replyingTo === item.id ? null : item.id); setExpandedReplies((ids) => ids.includes(item.id) ? ids : [...ids, item.id]); }}>답글 달기</button><button className="comment-report" onClick={() => requestReport(`${item.name}님의 댓글`)}>신고</button></div>
                {expandedReplies.includes(item.id) && item.replies.map((reply) => <div className="reply" key={reply.id}><span className="reply-arrow">↳</span><span className="comment-avatar">{reply.name[0]}</span><div className="reply-body"><div className="reply-head"><span><em>답글</em><strong>{reply.name}</strong><VerifiedBadge tier={reply.tier} demo={reply.name === user?.nickname} inline />{detailMode === "judgement" && <OpinionBadge side={activityVoteFor(reply.name, reply.vote)} />}</span><button className="reply-report" onClick={() => requestReport(`${reply.name}님의 대댓글`)}>신고</button></div><p>{reply.text}</p></div></div>)}
                {replyingTo === item.id && <div className="reply-form"><input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`${item.name}님에게 답글 남기기`} aria-label="대댓글 작성" /><button onClick={() => addReply(item.id)}>등록</button></div>}
              </div>
            </article>
          ))}
        </section>
        <nav className="comment-pagination standalone-comment-pagination" aria-label="댓글 페이지">{Array.from({ length: commentPageCount }, (_, index) => index + 1).map((number) => <button key={number} className={commentPage === number ? "active" : ""} onClick={() => setCommentPage(number)}>{number}</button>)}</nav>
      </section>

      <aside className="vote-rail">
        {detailMode === "judgement" ? <>
          {resolvedVerdict ? <section className="vote-card resolved-opinion-card"><div className="deadline resolved-deadline">투표 마감 · 최종 의견</div><div className="vote-body current-result"><h2>커뮤니티 투표 결과</h2><VoteBar a={result.a} b={result.b} /><p className="closed-vote-note">총 1,313명 참여 · 투표가 종료되었습니다.</p></div></section> : <section className="vote-card"><div className="deadline">◷ 마감까지 <strong>2일 14시간</strong></div><div className="vote-body current-result"><h2>의견 투표</h2><VoteBar a={result.a} b={result.b} /><div className="opinion-vote-buttons"><button className={vote === "A" ? "a chosen" : "a"} onClick={() => requestOpinionVote("A")}>A 잘못</button><button className={vote === "B" ? "b chosen" : "b"} onClick={() => requestOpinionVote("B")}>B 잘못</button></div><p className="vote-hint">티어와 관계없이 모든 인증 사용자가 한 번씩 참여할 수 있습니다.</p>{vote && <p className="my-vote">내 의견: <b>{vote} 잘못</b></p>}</div></section>}
          <section className="positions-card"><header><div><h2>양측 주장</h2><p>게시물 작성자가 정리한 입장입니다.</p></div><span><b>A</b><i>VS</i><em>B</em></span></header><article className="position-item position-a"><div className="position-label"><b>A</b><strong>A측 주장</strong></div><p>{aClaim}</p></article><div className="position-divider"><span>VS</span></div><article className="position-item position-b"><div className="position-label"><b>B</b><strong>B측 주장</strong></div><p>{bClaim}</p></article></section>
          <section className="guide-card"><h2>참여 가이드</h2><ul><li>의견 투표와 댓글은 모든 인증 사용자가 참여합니다.</li><li>공식 판결은 마스터 이상, 다이아 사건은 그랜드마스터 이상만 가능합니다.</li><li>비난보다 다음 플레이에 도움 되는 근거를 남겨 주세요.</li></ul></section>
        </> : <>
          <section className="feedback-intent-card"><header><span>작성자의 생각</span><h2>이렇게 판단하고 플레이했습니다.</h2></header><p>{playThought}</p><footer>결과가 아니라 당시 의도를 기준으로 피드백해 주세요.</footer></section>
          <section className="guide-card feedback-participation-guide"><h2>플레이 피드백 참여 가이드</h2><ul><li>댓글은 모든 인증 사용자가 자유롭게 참여합니다.</li><li>전문 피드백은 마스터 이상만 작성할 수 있습니다.</li><li>다이아몬드 플레이는 그랜드마스터 이상이 피드백합니다.</li><li>타임스탬프와 근거, 다음 플레이 방법을 함께 남겨 주세요.</li></ul></section>
        </>}
      </aside>
      {reportTarget && <ReportModal target={reportTarget} close={() => setReportTarget(null)} onSubmit={(reason) => { const target = reportTarget; setReportTarget(null); toast(`${target} 신고가 접수되었습니다: ${reason}`); }} />}
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
        {currentRank && !userIsTopFive && <><div className="ranking-divider"><span>내 순위</span></div><div className="ranking-row current-rank-row"><b className="rank-number">{currentRank.rank}</b><span className="rank-player"><strong>{currentRank.name}</strong><small>{currentRank.tier} · 데모 인증</small></span>{mode === "personal" ? <PersonalActivityMetric value={currentRank.metricA} /> : <span>{currentRank.metricA}</span>}<span>{currentRank.metricB}</span><strong>{currentRank.points}P</strong></div></>}
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
    ...weeklyPosts.map(({ title }) => ({ title, category: "실시간 인기", local: false })),
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
    if (isMasterPlus(user.tier)) return toast("마스터 이상은 공식 판결자 역할로 참여하며 사건을 작성할 수 없습니다.");
    if (!file) return toast("실제 영상 파일을 선택해 주세요.");
    const form = new FormData(event.currentTarget);
    const item: LocalCase = { title: String(form.get("title")), mode, category: String(form.get("category")), aClaim: String(form.get("aClaim") ?? ""), bClaim: String(form.get("bClaim") ?? ""), thought: String(form.get("thought") ?? ""), author: user.nickname, tier: user.tier };
    setSaving(true);
    try { await storeVideo(file); localStorage.setItem(CASE_KEY, JSON.stringify(item)); onSubmitted(item, preview); toast("영상과 사건이 이 브라우저에 저장되었습니다."); setView("home"); } catch { toast("영상을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); } finally { setSaving(false); }
  };
  return <main className="submit-page page-shell"><button className="back-link" onClick={() => setView("home")}>← 홈으로</button><div className="submit-heading"><h1>어떤 도움을 받고 싶나요?</h1><p>판정을 받을지, 플레이를 지적받고 성장할지 먼저 선택해 주세요.</p></div><form className="submit-form" onSubmit={submit}><section><label>1. 게시글 유형</label><div className="case-mode-choice"><label><input type="radio" name="mode" value="judgement" checked={mode === "judgement"} onChange={() => setMode("judgement")} /><span><b>플레이 판정</b><small>누가 더 잘못했는지 공식 판정과 근거를 받습니다.</small></span></label><label><input type="radio" name="mode" value="feedback" checked={mode === "feedback"} onChange={() => setMode("feedback")} /><span><b>플레이 피드백</b><small>잘한 점과 문제점, 다음 플레이 방법을 받습니다.</small></span></label></div></section><section><label>2. 영상 업로드</label><input ref={inputRef} className="sr-only" type="file" accept="video/*" onChange={chooseFile} />{preview ? <div className="upload-preview"><video src={preview} controls /><button type="button" onClick={() => inputRef.current?.click()}>영상 다시 선택</button></div> : <button type="button" className="upload-box" onClick={() => inputRef.current?.click()}><span>↥</span><strong>내 기기에서 실제 영상 선택</strong><small>MP4, WebM 등 · 200MB 이하 권장</small></button>}</section><section><label htmlFor="case-title">3. 게시글 제목</label><input id="case-title" name="title" required placeholder={mode === "judgement" ? "예: 바론 스틸 시도, 미드가 잘못한 걸까요?" : "예: 이 장면에서 더 좋은 선택이 있었을까요?"} /></section><section><label htmlFor="case-category">4. 게임 카테고리</label><select id="case-category" name="category" defaultValue="솔로랭크"><option>솔로랭크</option><option>파티랭크</option><option>내전</option></select></section>{mode === "judgement" ? <div className="form-split"><section><label htmlFor="a-claim">5. A측 상황</label><textarea id="a-claim" name="aClaim" required placeholder="A측에서 본 상황과 판단을 적어주세요." /></section><section><label htmlFor="b-claim">6. B측 상황</label><textarea id="b-claim" name="bClaim" required placeholder="B측에서 본 상황과 판단을 적어주세요." /></section></div> : <section className="play-thought-field"><label htmlFor="play-thought">5. 당시 플레이 의도와 고민</label><textarea id="play-thought" name="thought" required placeholder="왜 이런 선택을 했는지, 당시 무엇을 보고 어떤 결과를 기대했는지 적어주세요." /><small>상위 티어 피드백 제공자가 결과가 아닌 당시 판단을 이해하는 데 사용합니다.</small></section>}<section><label>{mode === "judgement" ? "7" : "6"}. 참여 기간</label><div className="duration"><label><input type="radio" name="duration" value="1" />1일</label><label><input type="radio" name="duration" value="3" defaultChecked />3일</label><label><input type="radio" name="duration" value="7" />7일</label></div></section><div className="submit-notice"><span>ⓘ</span><p><strong>기기 로컬 저장 데모입니다.</strong><br />서버와 Riot API 연결 전이라 다른 사용자에게 공유되지는 않습니다.</p></div><button type="submit" className="primary-button full" disabled={saving}>{saving ? "영상 저장 중…" : "게시글 등록하기"}</button></form></main>;
}

function LoginModal({ close, onLogin }: { close: () => void; onLogin: (user: User) => void }) {
  const [nickname, setNickname] = useState("");
  const [tier, setTier] = useState("챌린저");
  const [peakTier, setPeakTier] = useState("챌린저");
  const [primaryRole, setPrimaryRole] = useState("정글");
  const submit = (event: FormEvent) => { event.preventDefault(); if (nickname.trim().length < 2) return; onLogin({ nickname: nickname.trim(), tier, peakTier, primaryRole }); };
  return <div className="modal-backdrop" onMouseDown={close}><form className="profile-modal login-modal judge-profile-login" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-title"><button className="modal-close" type="button" onClick={close} aria-label="닫기">×</button><span className="profile-emblem">VS</span><h2 id="login-title">데모 로그인</h2><p>역할별 계정으로 바로 체험하거나 직접 프로필을 만들 수 있습니다.</p><div className="demo-account-picker"><span>빠른 데모 계정</span><div>{DEMO_ACCOUNTS.map((account, index) => <button type="button" key={account.nickname} onClick={() => onLogin({ ...account })}><b>{index === 0 ? "글쓰기 계정" : "판정 계정"}</b><strong>{account.nickname}</strong><small>{account.tier} · {account.primaryRole}</small></button>)}</div></div><div className="custom-profile-divider"><span>직접 설정</span></div><label>사이트 활동 닉네임<input value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={12} required placeholder="2~12자" /></label><div className="login-profile-grid"><label>현재 티어<select value={tier} onChange={(event) => setTier(event.target.value)}>{["아이언 I", "브론즈 I", "실버 I", "골드 IV", "플래티넘 IV", "에메랄드 IV", "다이아몬드 IV", "마스터", "그랜드마스터", "챌린저"].map((item) => <option key={item}>{item}</option>)}</select></label><label>최고 티어<select value={peakTier} onChange={(event) => setPeakTier(event.target.value)}>{["골드", "플래티넘", "에메랄드", "다이아몬드", "마스터", "그랜드마스터", "챌린저"].map((item) => <option key={item}>{item}</option>)}</select></label></div><label>주 포지션<select value={primaryRole} onChange={(event) => setPrimaryRole(event.target.value)}>{["탑", "정글", "미드", "원딜", "서포터"].map((item) => <option key={item}>{item}</option>)}</select></label>{isMasterPlus(tier) && <div className="judge-profile-note"><b>공식 판정자 프로필</b><span>현재·최고 티어와 주 포지션이 판결문에 표시되며 같은 포지션 사건에 우선 연결됩니다.</span></div>}<div className="demo-warning">선택한 정보는 실제 Riot 인증이 아닌 <b>데모 인증</b>으로 표시됩니다.</div><button className="primary-button full" type="submit">이 정보로 로그인</button></form></div>;
}

function ProfileModal({ user, close, logout, switchAccount }: { user: User; close: () => void; logout: () => void; switchAccount: (user: User) => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="profile-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className="modal-close" onClick={close} aria-label="닫기">×</button><span className="profile-emblem">{user.nickname[0]}</span><h2 id="profile-title">{user.nickname}</h2><VerifiedBadge tier={user.tier} demo /><div className="profile-play-info"><span><small>최고 티어</small><b>{user.peakTier ?? user.tier}</b></span><span><small>주 포지션</small><b>{user.primaryRole ?? "미설정"}</b></span></div><div className="demo-account-switcher"><span>데모 계정 전환</span>{DEMO_ACCOUNTS.map((account, index) => <button key={account.nickname} className={user.nickname === account.nickname ? "active" : ""} onClick={() => switchAccount({ ...account })}><span>{index === 0 ? "글" : "판"}</span><div><b>{index === 0 ? "글쓰기 계정" : "판정 계정"}</b><small>{account.nickname} · {account.tier}</small></div><em>{user.nickname === account.nickname ? "사용 중" : "전환"}</em></button>)}</div><p>다이아 계정은 글쓰기, 챌린저 계정은 공식 판정을 체험할 수 있습니다.</p><button className="secondary-button full" onClick={logout}>로그아웃</button></section></div>;
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
  const [selectedCaseTitle, setSelectedCaseTitle] = useState("바론 스틸 시도, 이건 미드 잘못인가요?");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedUser = localStorage.getItem(USER_KEY);
      const storedCase = localStorage.getItem(CASE_KEY);
      if (storedUser) {
        const storedProfile = JSON.parse(storedUser) as User;
        const savedUser = { ...storedProfile, peakTier: storedProfile.peakTier ?? storedProfile.tier, primaryRole: storedProfile.primaryRole ?? "정글" };
        if (!localStorage.getItem(CHALLENGER_TEST_KEY)) {
          const challengerUser = { ...savedUser, tier: "챌린저", peakTier: "챌린저" };
          localStorage.setItem(USER_KEY, JSON.stringify(challengerUser));
          localStorage.setItem(CHALLENGER_TEST_KEY, "complete");
          setUser(challengerUser);
        } else setUser(savedUser);
      }
      if (storedCase) {
        const savedCase = JSON.parse(storedCase) as LocalCase;
        setLocalCase({ ...savedCase, mode: savedCase.mode ?? "judgement" });
        loadStoredVideo().then((blob) => { if (blob) setLocalVideoUrl(URL.createObjectURL(blob)); }).catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const showToast = (message: string) => { setToastMessage(message); window.setTimeout(() => setToastMessage(""), 2800); };
  const requireLogin = () => { setLoginOpen(true); showToast("로그인이 필요한 기능입니다."); };
  const login = (nextUser: User) => { localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); localStorage.setItem(CHALLENGER_TEST_KEY, "complete"); setUser(nextUser); setLoginOpen(false); showToast(`${nextUser.nickname}님, 로그인했습니다.`); };
  const switchDemoAccount = (nextUser: User) => { localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); localStorage.setItem(CHALLENGER_TEST_KEY, "complete"); setUser(nextUser); showToast(`${nextUser.nickname} 계정으로 전환했습니다.`); };
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
    {profileOpen && user && <ProfileModal user={user} close={() => setProfileOpen(false)} logout={logout} switchAccount={switchDemoAccount} />}
    {toastMessage && <div className="toast" role="status">✓ {toastMessage}</div>}
  </div>;
}
