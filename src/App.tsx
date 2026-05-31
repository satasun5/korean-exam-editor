import React, { useMemo, useRef, useState } from "react";
import { AlignCenter, AlignLeft, ArrowDown, ArrowUp, Copy, Eye, EyeOff, HelpCircle, Plus, Settings2, Trash2, X } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";

type BlockType = "text" | "equation" | "box";
type AlignType = "left" | "center";
type ModalName = "edit" | "help" | "latex" | null;
type EditableEl = HTMLTextAreaElement | HTMLInputElement;
type CaretRange = { start: number; end: number };

type ProblemBlock = {
  id: string;
  type: BlockType;
  align: AlignType;
  mt: number;
  mb: number;
  size: number;
  text?: string;
  latex?: string;
  title?: string;
  width?: number;
};

type TargetInfo = {
  el: EditableEl | null;
  setter: (value: React.SetStateAction<string>) => void;
  value: string;
  equationMode: boolean;
};

const BS = String.fromCharCode(92);
const NL = "\n";
const nums = ["①", "②", "③", "④", "⑤"];
const tex = (...parts: string[]) => parts.join("");
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const fontMap: Record<string, string> = {
  serif: '"Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", serif',
  sans: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  gothic: '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

const fontLabels: Record<string, string> = { serif: "명조형", sans: "고딕형", gothic: "기본 고딕", mono: "코드형" };

const defaultBody = "최고차항의 계수가 양수인 삼차함수 $f(x)$와 실수 $t$에 대하여 함수";
const derivativeDefinition = tex(BS, "displaystyle f'(a)=", BS, "lim_{h", BS, "to0}", BS, "frac{f(a+h)-f(a)}{h}");

const makeViewBox = (): ProblemBlock => ({
  id: uid(),
  type: "box",
  title: "<보 기>",
  text: ["ㄱ. 첫 번째 명제를 입력하세요.", "ㄴ. 두 번째 명제를 입력하세요.", "ㄷ. 세 번째 명제를 입력하세요."].join(NL + NL),
  align: "left",
  mt: 18,
  mb: 22,
  size: 22,
  width: 96,
});

const starterBlocks: ProblemBlock[] = [
  { id: uid(), type: "equation", latex: tex(BS, "displaystyle g(x)=", BS, "begin{cases}", "-f(x)&(x<t)", BS, BS, "f(x)&(x", BS, "ge t)", BS, "end{cases}"), align: "center", mt: 22, mb: 26, size: 30 },
  { id: uid(), type: "text", text: "는 실수 전체의 집합에서 연속이고 다음 조건을 만족시킨다.", align: "left", mt: 4, mb: 18, size: 23 },
  {
    id: uid(),
    type: "box",
    title: "",
    text: [
      "(가) 모든 실수 $a$에 대하여 $" + tex(BS, "lim_{x", BS, "to a+}", BS, "frac{g(x)}{x(x-2)}") + "$의 값이 존재한다.",
      "(나) $" + tex(BS, "lim_{x", BS, "to m+}", BS, "frac{g(x)}{x(x-2)}") + "$의 값이 음수가 되도록 하는 자연수 $m$의 집합은 $" + tex(BS, "left", BS, "{", "g(-1), -", BS, "frac{7}{2}g(1)", BS, "right", BS, "}") + "$이다.",
    ].join(NL + NL),
    align: "left",
    mt: 12,
    mb: 22,
    size: 22,
    width: 96,
  },
  { id: uid(), type: "text", text: "$g(-5)$의 값을 구하시오. (단, $" + tex("g(-1) ", BS, "neq -", BS, "frac{7}{2}g(1)") + "$) [4점]", align: "left", mt: 4, mb: 20, size: 23 },
];

const symbolTabs: Record<string, string[]> = {
  기본: [tex(BS, "frac{}{}"), "^{}", "_{}", tex(BS, "sqrt{}"), tex(BS, "sqrt[n]{}"), tex(BS, "left(", BS, "right)"), tex(BS, "left|", BS, "right|"), tex(BS, "begin{cases} & ", BS, BS, " & ", BS, "end{cases}"), tex(BS, "cdot"), tex(BS, "times"), tex(BS, "div")],
  "그리스·각": [tex(BS, "alpha"), tex(BS, "beta"), tex(BS, "gamma"), tex(BS, "theta"), tex(BS, "phi"), tex(BS, "lambda"), tex(BS, "mu"), tex(BS, "pi"), tex(BS, "Delta"), tex(BS, "angle ABC"), tex(BS, "angle A"), tex(BS, "triangle ABC"), tex(BS, "circ")],
  "함수·극한": ["f(x)", "g(x)", "h(t)", "f'(x)", "f''(x)", tex(BS, "lim_{x", BS, "to a}"), tex(BS, "lim_{x", BS, "to a+}"), tex(BS, "lim_{x", BS, "to a-}"), tex(BS, "lim_{x", BS, "to", BS, "infty}"), tex(BS, "text{에서 연속}"), tex(BS, "text{에서 불연속}")],
  "미분·적분": [tex(BS, "int_a^b"), tex(BS, "int"), tex(BS, ",dx"), tex(BS, "frac{d}{dx}"), derivativeDefinition, "F'(x)=f(x)", tex(BS, "sum"), tex(BS, "Delta x"), tex(BS, "max"), tex(BS, "min"), tex(BS, "text{극대}"), tex(BS, "text{극소}")],
  수열: ["a_n", "S_n", tex(BS, "sum_{k=1}^{n}"), "a_{n+1}", "a_1", tex("n", BS, "in", BS, "mathbb{N}"), tex(BS, "text{등차수열}"), tex(BS, "text{등비수열}")],
  삼각: [tex(BS, "sin x"), tex(BS, "cos x"), tex(BS, "tan x"), tex(BS, "pi"), tex(BS, "frac{", BS, "pi}{2}"), tex(BS, "sin", BS, "theta"), tex(BS, "cos", BS, "theta"), tex(BS, "tan", BS, "theta")],
  "기하·벡터": [tex(BS, "overline{AB}"), tex(BS, "vec{AB}"), tex(BS, "overrightarrow{AB}"), tex(BS, "perp"), tex(BS, "parallel"), "x^2+y^2=r^2", tex(BS, "frac{x^2}{a^2}+", BS, "frac{y^2}{b^2}=1")],
  "관계·집합": [tex(BS, "le"), tex(BS, "ge"), "<", ">", tex(BS, "neq"), "=", tex(BS, "in"), tex(BS, "notin"), tex(BS, "mathbb{R}"), tex(BS, "mathbb{N}")],
  "수능 문장": ["<보 기>", "단,", "일 때,", "다음 조건을 만족시킨다.", "값을 구하시오.", "최솟값을 구하시오.", "실수 전체의 집합에서", "서로 다른 실근의 개수"],
};

const latexGuide = [
  ["\\frac{a}{b}", "분수", "분자와 분모가 있는 식입니다. 예: $\\frac{x+1}{x-2}$"],
  ["x^2, x^{n+1}", "거듭제곱", "한 글자 지수는 ^2, 긴 지수는 ^{n+1}처럼 중괄호를 씁니다."],
  ["x_1, a_n", "아래첨자", "수열의 항, 좌표, 번호를 표현합니다. 긴 아래첨자는 _{n+1}처럼 씁니다."],
  ["\\sqrt{x}", "제곱근", "근호를 씁니다. n제곱근은 \\sqrt[n]{x}입니다."],
  ["\\lim_{x\\to a}", "극한", "극한 기호입니다. 우극한은 \\lim_{x\\to a+}, 좌극한은 \\lim_{x\\to a-}입니다."],
  ["\\begin{cases}...\\end{cases}", "조각함수", "여러 조건에 따라 식이 나뉘는 함수를 씁니다. 줄바꿈은 \\\\, 식과 조건 사이는 &로 맞춥니다."],
  ["\\int_a^b", "정적분", "아래끝 a, 위끝 b인 정적분입니다. 뒤에 f(x)\\,dx를 붙여 씁니다."],
  ["\\alpha, \\beta, \\gamma", "그리스 문자", "매개변수나 각 이름에 자주 씁니다. 알파, 베타, 감마입니다."],
  ["\\theta", "세타", "삼각함수와 각을 나타낼 때 많이 씁니다. 예: $\\sin\\theta$"],
  ["\\angle ABC", "각", "점 B를 꼭짓점으로 하는 각 ABC를 나타냅니다."],
  ["\\triangle ABC", "삼각형", "삼각형 ABC를 나타냅니다."],
  ["\\overline{AB}", "선분 길이", "선분 AB 또는 그 길이를 나타냅니다."],
  ["\\vec{a}, \\overrightarrow{AB}", "벡터", "벡터 a 또는 점 A에서 B로 향하는 벡터를 나타냅니다."],
  ["\\le, \\ge, \\neq", "부등호/같지 않음", "각각 ≤, ≥, ≠를 나타냅니다. 같지 않음은 \\neq를 쓰는 것이 안정적입니다."],
  ["\\mathbb{R}, \\mathbb{N}", "수 체계", "실수 전체의 집합과 자연수 전체의 집합을 나타냅니다."],
  ["\\text{...}", "수식 안 한글", "수식 블록 안에 한글을 넣을 때 씁니다. 예: \\text{에서 연속}"],
];

function renderLatex(latex: string, display = false) {
  try {
    return katex.renderToString(String(latex ?? ""), { displayMode: display, throwOnError: false, strict: false });
  } catch {
    return String(latex ?? "");
  }
}
function MathSpan({ latex, display = false }: { latex: string; display?: boolean }) { return <span dangerouslySetInnerHTML={{ __html: renderLatex(latex, display) }} />; }
function PreviewText({ text = "" }: { text?: string }) { return <>{String(text).split(/(\$[^$]*\$)/g).map((part, i) => (part.startsWith("$") && part.endsWith("$") ? <MathSpan key={i} latex={part.slice(1, -1)} /> : <React.Fragment key={i}>{part}</React.Fragment>))}</>; }
function isInsideMath(value: string, position: number) { return (value.slice(0, position).match(/\$/g)?.length ?? 0) % 2 === 1; }
function isMathSymbol(symbol: string) { return symbol.startsWith(BS) || /[_^=<>]|[{}]/.test(symbol) || (symbol.includes("(") && !/[가-힣]/.test(symbol)); }
function formatInsert(symbol: string, tab: string, equationMode: boolean, value: string, position: number) { if (tab === "수능 문장" || equationMode) return symbol; return isMathSymbol(symbol) && !isInsideMath(value, position) ? `$${symbol}$` : symbol; }
function insertAt(target: TargetInfo, value: string, fallbackRange?: CaretRange) { const el = target.el; const start = fallbackRange?.start ?? el?.selectionStart ?? target.value.length; const end = fallbackRange?.end ?? el?.selectionEnd ?? start; target.setter(target.value.slice(0, start) + value + target.value.slice(end)); requestAnimationFrame(() => { if (!el) return; el.focus(); const pos = start + value.length; el.selectionStart = pos; el.selectionEnd = pos; }); }
function buildLatexText(no: number, body: string, blocks: ProblemBlock[], choices: string[], show: boolean) { const blockText = blocks.map((b) => (b.type === "equation" ? `$$${b.latex ?? ""}$$` : b.type === "box" ? (b.title ? b.title + NL : "") + (b.text ?? "") : b.text ?? "")).join(NL + NL); return `${no}. ${body}${NL}${NL}${blockText}${show ? NL + NL + choices.map((c, i) => nums[i] + " " + c).join("  ") : ""}`; }
function choiceLayoutClass(choices: string[]) { const clean = (s: string) => String(s ?? "").replace(/\$|\\[a-zA-Z]+|[{}_^]/g, ""); const maxLen = Math.max(...choices.map((c) => clean(c).trim().length), 0); const totalLen = choices.reduce((sum, c) => sum + clean(c).trim().length, 0); if (maxLen >= 18 || totalLen >= 62) return "choice-xlong"; if (maxLen >= 12 || totalLen >= 44) return "choice-long"; if (maxLen >= 7 || totalLen >= 30) return "choice-medium"; return "choice-short"; }
function downloadText(filename: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

function InlineBlockPreview({ block }: { block: ProblemBlock }) {
  const alignClass = block.align === "center" ? "exam-align-center" : "exam-align-left";
  if (block.type === "equation") return <div style={{ marginTop: block.mt, marginBottom: block.mb, fontSize: block.size }} className={alignClass}><MathSpan latex={block.latex ?? ""} display /></div>;
  if (block.type === "box") return <div style={{ marginTop: block.mt, marginBottom: block.mb, width: (block.width ?? 96) + "%", fontSize: block.size }} className={"exam-box " + alignClass}>{block.title ? <div className="exam-box-title">{block.title}</div> : null}{(block.text ?? "").split(NL).map((line, i) => <p key={i} className={line.trim() ? "" : "exam-blank-line"}><PreviewText text={line} /></p>)}</div>;
  return <div style={{ marginTop: block.mt, marginBottom: block.mb, fontSize: block.size }} className={"exam-body " + alignClass}><PreviewText text={block.text ?? ""} /></div>;
}
function EditorOutputPreview({ block }: { block: ProblemBlock }) {
  if (block.type === "equation") return <div className="mt-2 rounded-xl border bg-white px-3 py-3 text-center text-sm"><div className="mb-2 text-left text-[11px] font-bold text-neutral-500">출력 예시</div><MathSpan latex={block.latex ?? ""} display /></div>;
  if (block.type === "box") return <div className="mt-2 rounded-xl border bg-white px-4 py-5 text-sm"><div className="mb-4 text-left text-[11px] font-bold text-neutral-500">출력 예시</div><div className="exam-box mx-auto max-w-full text-[15px]" style={{ width: (block.width ?? 96) + "%" }}>{block.title ? <div className="exam-box-title text-[14px]">{block.title}</div> : null}{(block.text ?? "").split(NL).map((line, i) => <p key={i} className={line.trim() ? "" : "exam-blank-line"}><PreviewText text={line} /></p>)}</div></div>;
  return <div className="mt-2 rounded-xl border bg-white px-3 py-3 text-sm leading-7"><div className="mb-2 text-left text-[11px] font-bold text-neutral-500">출력 예시</div><div className="exam-body text-[15px]"><PreviewText text={block.text ?? ""} /></div></div>;
}
function TrackTextArea({ value, rows, onChange, targetId, refs, activate, className, style }: { value: string; rows: number; onChange: (value: string) => void; targetId: string; refs?: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>; activate: (targetId: string, el: EditableEl | null) => void; className: string; style?: React.CSSProperties }) { const mark = (el: HTMLTextAreaElement | null) => activate(targetId, el); return <textarea ref={(el) => { if (refs) refs.current[targetId.slice(6)] = el; }} value={value} rows={rows} onFocus={(e) => mark(e.currentTarget)} onClick={(e) => mark(e.currentTarget)} onKeyUp={(e) => mark(e.currentTarget)} onSelect={(e) => mark(e.currentTarget)} onTouchEnd={(e) => mark(e.currentTarget)} onChange={(e) => { onChange(e.target.value); mark(e.currentTarget); }} className={className} style={style} />; }
function BlockEditor({ block, index, total, refs, patch, remove, move, activate }: { block: ProblemBlock; index: number; total: number; refs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>; patch: (id: string, p: Partial<ProblemBlock>) => void; remove: (id: string) => void; move: (from: number, to: number) => void; activate: (targetId: string, el: EditableEl | null) => void }) { const value = block.type === "equation" ? block.latex ?? "" : block.text ?? ""; const field: "latex" | "text" = block.type === "equation" ? "latex" : "text"; return <div className="rounded-2xl bg-neutral-50 p-3"><div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-bold text-neutral-500">{block.type === "equation" ? "수식 블록" : block.type === "box" ? "조건/보기 박스" : "문장 블록"}</div><div className="flex gap-1"><button disabled={index === 0} onClick={() => move(index, index - 1)} className="rounded-lg border bg-white p-1 disabled:opacity-30"><ArrowUp size={15} /></button><button disabled={index === total - 1} onClick={() => move(index, index + 1)} className="rounded-lg border bg-white p-1 disabled:opacity-30"><ArrowDown size={15} /></button><button onClick={() => remove(block.id)} className="rounded-lg p-1 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div></div>{block.type === "box" ? <div className="mb-2 grid grid-cols-[1fr_90px] gap-2"><input value={block.title ?? ""} placeholder="제목: <보 기> 등" onChange={(e) => patch(block.id, { title: e.target.value })} className="rounded-xl border px-3 py-2 text-sm" /><input type="number" value={block.width ?? 96} onChange={(e) => patch(block.id, { width: Number(e.target.value) })} className="rounded-xl border px-3 py-2 text-sm" /></div> : null}<TrackTextArea value={value} rows={block.type === "box" ? 5 : 3} targetId={"block:" + block.id} refs={refs} activate={activate} onChange={(next) => patch(block.id, { [field]: next } as Partial<ProblemBlock>)} className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-neutral-900" /><EditorOutputPreview block={block} /><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5"><button onClick={() => patch(block.id, { align: "left" })} className="rounded-lg border bg-white py-1 text-xs"><AlignLeft className="inline" size={13} /> 왼쪽</button><button onClick={() => patch(block.id, { align: "center" })} className="rounded-lg border bg-white py-1 text-xs"><AlignCenter className="inline" size={13} /> 중앙</button><input type="number" title="위 공백" value={block.mt} onChange={(e) => patch(block.id, { mt: Number(e.target.value) })} className="rounded-lg border px-2 py-1 text-xs" /><input type="number" title="아래 공백" value={block.mb} onChange={(e) => patch(block.id, { mb: Number(e.target.value) })} className="rounded-lg border px-2 py-1 text-xs" /><input type="number" title="글자 크기" value={block.size} onChange={(e) => patch(block.id, { size: Number(e.target.value) })} className="rounded-lg border px-2 py-1 text-xs" /></div></div>; }
function Modal({ title, subtitle, onClose, children, max = "max-w-[920px]" }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; max?: string }) { return <div className="editor-modal fixed inset-0 z-50 bg-black/45 p-2 sm:p-5"><div className={`mx-auto flex h-full ${max} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl`}><div className="flex items-center justify-between border-b px-5 py-4"><div><div className="text-lg font-extrabold">{title}</div>{subtitle ? <div className="text-xs text-neutral-500">{subtitle}</div> : null}</div><button onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100"><X size={22} /></button></div>{children}</div></div>; }
function GuideContent() { const nav = [["guide-start", "시작하기"], ["guide-blocks", "문항 블록"], ["guide-symbols", "기호와 수식"], ["guide-latex", "LaTeX 기호표"], ["guide-mobile", "모바일 입력"], ["guide-export", "내보내기"]]; return <div className="guide-shell"><aside className="guide-sidebar"><div className="guide-logo">수능형 수학 문항 편집기</div><div className="guide-kbd">GUIDE</div><div className="guide-nav-title">가이드</div>{nav.map(([id, label]) => <a key={id} className="guide-nav-item" href={`#${id}`}>{label}</a>)}</aside><main className="guide-content"><article className="guide-doc"><div className="guide-breadcrumb">기본 정보 / 가이드북</div><h1 className="guide-title">문항 편집기 사용법</h1><p className="guide-lead">수능·평가원 문항처럼 보이는 수학 문제를 발문, 수식 블록, 조건 박스, 보기 박스, 오지선다로 나누어 작성하는 편집기입니다. 이 앱은 이미지 저장을 제거하고, 화면에서 작성한 문항과 LaTeX 원문을 안정적으로 확인하는 데 집중합니다.</p><section id="guide-start" className="guide-section"><h2>시작하기</h2><p>상단의 편집 버튼을 누르면 문항 번호, 발문, 발문 글씨체와 크기, 기호 탭, 블록 목록을 수정할 수 있습니다. 흰색 영역은 실제 문항 미리보기입니다.</p><p>추천 작업 순서는 발문 작성 → 수식 블록 추가 → 조건 박스 작성 → 결론 문장 작성 → 오지선다 필요 시 켜기입니다.</p></section><section id="guide-blocks" className="guide-section"><h2>문항 블록</h2><h3>발문</h3><p>문항의 첫 문장입니다. 발문은 별도로 글씨체와 크기를 조절할 수 있습니다. 발문 안의 수식은 $f(x)$처럼 달러 기호로 감싸면 렌더링됩니다.</p><h3>문장 블록</h3><p>일반 문장을 넣습니다. 문장 블록 아래 출력 예시에서 인라인 수식이 제대로 보이는지 확인합니다.</p><h3>수식 블록</h3><p>조각함수, 극한식, 적분식처럼 독립적으로 크게 보여야 하는 식을 넣습니다. 수식 블록은 이미 수식 모드이므로 $...$를 붙이지 않습니다.</p><h3>조건/보기 박스</h3><p>조건 박스는 (가), (나), (다)를 넣을 때 쓰고, 보기 버튼은 제목이 &lt;보 기&gt;인 박스를 자동으로 만듭니다. 박스 너비도 조절할 수 있습니다.</p></section><section id="guide-symbols" className="guide-section"><h2>기호와 수식 입력</h2><p>입력하고 싶은 칸을 먼저 클릭하거나 터치한 뒤, 왼쪽 기호 탭에서 원하는 기호를 누릅니다. 문장/조건/선지 입력칸에서는 수학 기호가 자동으로 $...$로 감싸집니다. 이미 $...$ 안에 커서가 있으면 다시 감싸지 않습니다.</p><p>수식 블록에서는 기호가 그대로 들어갑니다. 예를 들어 수식 블록에 <code>\frac{}{} </code>를 넣으면 바로 분수 명령이 들어가며, 직접 중괄호 안을 채우면 됩니다.</p><p><b>그리스·각</b> 탭에는 알파, 베타, 감마, 세타, 파이, 각, 삼각형 기호를 넣었습니다. 각을 표현할 때는 <code>\angle ABC</code>, 각의 크기를 문자로 둘 때는 <code>\theta</code>를 주로 씁니다.</p></section><section id="guide-latex" className="guide-section"><h2>LaTeX 기호표와 용법</h2>{latexGuide.map(([code, name, desc]) => <div key={code} className="guide-callout"><strong><code>{code}</code> — {name}</strong><p>{desc}</p></div>)}</section><section id="guide-mobile" className="guide-section"><h2>모바일 입력</h2><p>모바일에서는 입력칸을 터치한 뒤 커서를 원하는 위치로 옮기고 기호 버튼을 누르세요. 기호 버튼을 눌러도 마지막 입력 위치를 최대한 기억하도록 되어 있습니다.</p><p>브라우저에 따라 키보드가 닫히면 커서 표시가 사라질 수 있습니다. 이때는 입력칸을 한 번 다시 터치한 다음 기호를 누르면 더 안정적입니다.</p></section><section id="guide-export" className="guide-section"><h2>내보내기</h2><p>LaTeX 보기를 누르면 현재 문항 원문을 확인하고 txt로 저장할 수 있습니다. 이미지 저장 기능은 KaTeX 캡처 왜곡 문제 때문에 제거했습니다.</p></section></article></main></div>; }

export default function KoreanExamProblemEditor() {
  const [problemNo, setProblemNo] = useState(21);
  const [body, setBody] = useState(defaultBody);
  const [bodySize, setBodySize] = useState(23);
  const [bodyFont, setBodyFont] = useState("serif");
  const [blocks, setBlocks] = useState<ProblemBlock[]>(starterBlocks);
  const [choices, setChoices] = useState(["", "", "", "", ""]);
  const [showChoices, setShowChoices] = useState(false);
  const [activeTab, setActiveTab] = useState("기본");
  const [activeTarget, setActiveTarget] = useState("body");
  const [modal, setModal] = useState<ModalName>(null);
  const [latexText, setLatexText] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const blockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const choiceRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const caretRef = useRef<Record<string, CaretRange>>({});
  const bodyStyle = { fontSize: bodySize, fontFamily: fontMap[bodyFont] };
  const rememberCaret = (targetId: string, el: EditableEl | null) => { setActiveTarget(targetId); if (!el) return; caretRef.current[targetId] = { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.selectionStart ?? el.value.length }; };
  const patchBlock = (id: string, patch: Partial<ProblemBlock>) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));
  const moveBlock = (from: number, to: number) => setBlocks((prev) => { const next = [...prev]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
  const addBlock = (type: BlockType | "viewBox") => { if (type === "viewBox") { setBlocks((prev) => [...prev, makeViewBox()]); return; } const base: ProblemBlock = { id: uid(), type, align: type === "text" ? "left" : "center", mt: 12, mb: 12, size: type === "equation" ? 28 : 22 }; setBlocks((prev) => [...prev, type === "equation" ? { ...base, latex: "y=f(x)" } : type === "box" ? { ...base, title: "", text: "조건을 입력하세요. $f(x)=0$", width: 96, align: "left" } : { ...base, text: "문장을 입력하세요." }]); };
  const activeInput = useMemo<TargetInfo>(() => { if (activeTarget === "body") return { el: bodyRef.current, setter: setBody, value: body, equationMode: false }; if (activeTarget.startsWith("choice:")) { const idx = Number(activeTarget.slice(7)); return { el: choiceRefs.current[idx], value: choices[idx] ?? "", equationMode: false, setter: (v) => setChoices((prev) => prev.map((c, i) => (i === idx ? (typeof v === "function" ? (v as (x: string) => string)(c) : v) : c))) }; } const id = activeTarget.slice(6); const block = blocks.find((b) => b.id === id); const field: "latex" | "text" = block?.type === "equation" ? "latex" : "text"; return { el: blockRefs.current[id], value: String((block?.[field] as string) ?? ""), equationMode: block?.type === "equation", setter: (v) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: typeof v === "function" ? (v as (x: string) => string)(String((b[field] as string) ?? "")) : v } : b))) }; }, [activeTarget, blocks, body, choices]);
  const insertSmartSymbol = (symbol: string) => { const saved = caretRef.current[activeTarget] ?? { start: activeInput.value.length, end: activeInput.value.length }; const value = formatInsert(symbol, activeTab, activeInput.equationMode, activeInput.value, saved.start); insertAt(activeInput, value, saved); };
  const openLatex = () => { setLatexText(buildLatexText(problemNo, body, blocks, choices, showChoices)); setModal("latex"); };

  return <div className="min-h-screen bg-neutral-100 text-neutral-950"><div className="topbar sticky top-0 z-30 border-b bg-white px-3 py-3 shadow-sm"><div className="topbar-inner mx-auto flex max-w-[1200px] items-center justify-between"><div className="topbar-title"><h1 className="text-lg font-bold">수능형 수학 문항 편집기</h1><p className="text-xs text-neutral-500">문항 화면을 보면서, 편집은 팝업에서 처리합니다.</p></div><div className="ml-auto flex gap-2"><button onClick={() => setModal("help")} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"><HelpCircle className="mr-1 inline" size={15} />사용법</button><button onClick={() => setModal("edit")} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"><Settings2 className="mr-1 inline" size={15} />편집</button><button onClick={openLatex} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"><Copy className="mr-1 inline" size={15} />LaTeX 보기</button></div></div></div><main className="preview-shell overflow-auto bg-neutral-200 p-4 shadow-inner"><div className="exam-page"><div className="exam-row"><div className="exam-no">{problemNo}.</div><div className="exam-content"><div className="exam-body exam-main-body" style={bodyStyle}><PreviewText text={body} /></div>{blocks.map((block) => <InlineBlockPreview key={block.id} block={block} />)}{showChoices ? <div className={"exam-choice-grid " + choiceLayoutClass(choices)}>{choices.map((c, i) => <div key={i} className="exam-choice-item"><span className="exam-choice-num">{nums[i]}</span><span className="min-w-0"><PreviewText text={c} /></span></div>)}</div> : null}</div></div></div></main>{modal === "latex" ? <Modal title="LaTeX 원문" subtitle="직접 복사하거나 txt로 저장할 수 있습니다." onClose={() => setModal(null)} max="max-w-[820px]"><div className="flex flex-1 flex-col gap-3 overflow-hidden p-5"><textarea value={latexText} onChange={(e) => setLatexText(e.target.value)} className="min-h-0 flex-1 resize-none rounded-2xl border bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-neutral-900" /><div className="flex justify-end"><button onClick={() => downloadText("math-problem-" + problemNo + ".txt", latexText)} className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800">txt로 저장</button></div></div></Modal> : null}{modal === "help" ? <Modal title="사용법" subtitle="기호별 LaTeX 설명과 문항 제작 흐름을 정리했습니다." onClose={() => setModal(null)}><GuideContent /></Modal> : null}{modal === "edit" ? <Modal title="문항 편집" subtitle="모바일에서는 이 팝업만 편집 영역으로 사용합니다." onClose={() => setModal(null)} max="max-w-[980px]"><div className="flex-1 overflow-auto p-4"><div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.25fr]"><section className="space-y-4"><div className="rounded-2xl border p-3"><label className="block"><div className="mb-1 text-xs font-semibold text-neutral-600">문항 번호</div><input type="number" value={problemNo} onChange={(e) => setProblemNo(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-neutral-900" /></label></div><section className="rounded-2xl border p-3"><div className="mb-2 text-sm font-bold">기호·수식 빠른 삽입</div><div className="mb-3 flex flex-wrap gap-1">{Object.keys(symbolTabs).map((name) => <button key={name} onClick={() => setActiveTab(name)} className={`rounded-full px-3 py-1 text-xs font-semibold ${activeTab === name ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}>{name}</button>)}</div><div className="grid max-h-52 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">{symbolTabs[activeTab].map((s) => <button key={s} onPointerDown={(e) => e.preventDefault()} onClick={() => insertSmartSymbol(s)} className="rounded-xl border bg-white px-2 py-2 text-left text-xs hover:bg-neutral-50">{s.startsWith(BS) ? <MathSpan latex={s.split("{}").join("{□}")} /> : s}</button>)}</div><p className="mt-2 text-xs text-neutral-500">입력칸을 터치한 뒤 기호를 누르면 마지막 커서 위치에 들어갑니다.</p></section></section><section className="space-y-4"><div className="rounded-2xl border p-3"><div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]"><label className="block"><div className="mb-1 text-xs font-semibold text-neutral-600">발문 글씨체</div><select value={bodyFont} onChange={(e) => setBodyFont(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">{Object.keys(fontMap).map((key) => <option key={key} value={key}>{fontLabels[key]}</option>)}</select></label><label className="block"><div className="mb-1 text-xs font-semibold text-neutral-600">발문 글씨 크기</div><input type="number" value={bodySize} min={12} max={40} onChange={(e) => setBodySize(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 text-sm" /></label></div><label className="block"><div className="mb-1 text-xs font-semibold text-neutral-600">발문</div><TrackTextArea value={body} rows={4} targetId="body" activate={rememberCaret} onChange={setBody} style={{ fontFamily: fontMap[bodyFont], fontSize: 14 }} className="w-full resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-neutral-900" /></label><div className="mt-2 rounded-xl border bg-white px-3 py-3 text-sm leading-7"><div className="mb-2 text-left text-[11px] font-bold text-neutral-500">발문 출력 예시</div><div className="exam-body" style={bodyStyle}><PreviewText text={body} /></div></div></div><div className="rounded-2xl border p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-bold">문항 안에 들어가는 블록</div><div className="flex flex-wrap gap-1"><button onClick={() => addBlock("text")} className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold"><Plus className="inline" size={13} />문장</button><button onClick={() => addBlock("equation")} className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white"><Plus className="inline" size={13} />수식</button><button onClick={() => addBlock("box")} className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold"><Plus className="inline" size={13} />박스</button><button onClick={() => addBlock("viewBox")} className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white"><Plus className="inline" size={13} />보기</button></div></div><div className="space-y-3">{blocks.map((block, idx) => <BlockEditor key={block.id} block={block} index={idx} total={blocks.length} refs={blockRefs} patch={patchBlock} remove={removeBlock} move={moveBlock} activate={rememberCaret} />)}</div></div><section className="space-y-3 rounded-2xl border p-3"><button onClick={() => setShowChoices((v) => !v)} className="flex w-full items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-bold">오지선다 {showChoices ? "사용 중" : "숨김"} {showChoices ? <Eye size={17} /> : <EyeOff size={17} />}</button>{showChoices ? choices.map((c, i) => <label key={i} className="flex items-center gap-2"><span className="w-8 text-lg">{nums[i]}</span><input ref={(el) => { choiceRefs.current[i] = el; }} value={c} onFocus={(e) => rememberCaret("choice:" + i, e.currentTarget)} onClick={(e) => rememberCaret("choice:" + i, e.currentTarget)} onKeyUp={(e) => rememberCaret("choice:" + i, e.currentTarget)} onSelect={(e) => rememberCaret("choice:" + i, e.currentTarget)} onTouchEnd={(e) => rememberCaret("choice:" + i, e.currentTarget)} onChange={(e) => { setChoices((prev) => prev.map((x, idx) => idx === i ? e.target.value : x)); rememberCaret("choice:" + i, e.currentTarget); }} className="flex-1 rounded-xl border px-3 py-2 text-sm" /></label>) : null}</section></section></div></div></Modal> : null}</div>;
}
