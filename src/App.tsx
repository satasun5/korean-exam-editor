import React, { useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  HelpCircle,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import html2canvas from "html2canvas";
import katex from "katex";
import "katex/dist/katex.min.css";

type BlockType = "text" | "equation" | "box";
type AlignType = "left" | "center";
type ModalName = "edit" | "help" | "latex" | null;

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

const BS = String.fromCharCode(92);
const NL = "\n";
const nums = ["①", "②", "③", "④", "⑤"];
const tex = (...parts: string[]) => parts.join("");
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultBody = "최고차항의 계수가 양수인 삼차함수 $f(x)$와 실수 $t$에 대하여 함수";

const starterBlocks: ProblemBlock[] = [
  {
    id: uid(),
    type: "equation",
    latex: tex(
      BS,
      "displaystyle g(x)=",
      BS,
      "begin{cases}",
      "-f(x)&(x<t)",
      BS,
      BS,
      "f(x)&(x",
      BS,
      "ge t)",
      BS,
      "end{cases}"
    ),
    align: "center",
    mt: 22,
    mb: 26,
    size: 32,
  },
  {
    id: uid(),
    type: "text",
    text: "는 실수 전체의 집합에서 연속이고 다음 조건을 만족시킨다.",
    align: "left",
    mt: 4,
    mb: 18,
    size: 25,
  },
  {
    id: uid(),
    type: "box",
    title: "",
    text: [
      "(가) 모든 실수 $a$에 대하여 $" +
        tex(BS, "lim_{x", BS, "to a+}", BS, "frac{g(x)}{x(x-2)}") +
        "$의 값이 존재한다.",
      "(나) $" +
        tex(BS, "lim_{x", BS, "to m+}", BS, "frac{g(x)}{x(x-2)}") +
        "$의 값이 음수가 되도록 하는 자연수 $m$의 집합은 $" +
        tex(BS, "left", BS, "{", "g(-1), -", BS, "frac{7}{2}g(1)", BS, "right", BS, "}") +
        "$이다.",
    ].join(NL + NL),
    align: "left",
    mt: 12,
    mb: 22,
    size: 24,
    width: 96,
  },
  {
    id: uid(),
    type: "text",
    text: "$g(-5)$의 값을 구하시오. (단, $" +
      tex("g(-1) ", BS, "ne -", BS, "frac{7}{2}g(1)") +
      "$) [4점]",
    align: "left",
    mt: 4,
    mb: 20,
    size: 25,
  },
];

const symbolTabs: Record<string, string[]> = {
  기본: [
    tex(BS, "frac{}{}"),
    "^{}",
    "_{}",
    tex(BS, "sqrt{}"),
    tex(BS, "sqrt[n]{}"),
    tex(BS, "left(", BS, "right)"),
    tex(BS, "left|", BS, "right|"),
    tex(BS, "begin{cases} & ", BS, BS, " & ", BS, "end{cases}"),
    tex(BS, "cdot"),
    tex(BS, "times"),
    tex(BS, "div"),
  ],
  "함수·극한": [
    "f(x)",
    "g(x)",
    "h(t)",
    "f'(x)",
    "f''(x)",
    tex(BS, "lim_{x", BS, "to a}"),
    tex(BS, "lim_{x", BS, "to", BS, "infty}"),
    tex(BS, "text{에서 연속}"),
    tex(BS, "text{에서 불연속}"),
  ],
  "미분·적분": [
    tex(BS, "int_a^b"),
    tex(BS, "int"),
    tex(BS, ",dx"),
    tex(BS, "frac{d}{dx}"),
    "F'(x)=f(x)",
    tex(BS, "sum"),
    tex(BS, "max"),
    tex(BS, "min"),
    tex(BS, "text{극대}"),
    tex(BS, "text{극소}"),
  ],
  수열: [
    "a_n",
    "S_n",
    tex(BS, "sum_{k=1}^{n}"),
    "a_{n+1}",
    "a_1",
    tex("n", BS, "in", BS, "mathbb{N}"),
    tex(BS, "text{등차수열}"),
    tex(BS, "text{등비수열}"),
  ],
  삼각: [
    tex(BS, "sin x"),
    tex(BS, "cos x"),
    tex(BS, "tan x"),
    tex(BS, "pi"),
    tex(BS, "frac{", BS, "pi}{2}"),
    tex(BS, "angle ABC"),
  ],
  "기하·벡터": [
    tex(BS, "overline{AB}"),
    tex(BS, "vec{AB}"),
    tex(BS, "overrightarrow{AB}"),
    tex(BS, "perp"),
    tex(BS, "parallel"),
    "x^2+y^2=r^2",
    tex(BS, "frac{x^2}{a^2}+", BS, "frac{y^2}{b^2}=1"),
  ],
  "관계·집합": [
    tex(BS, "le"),
    tex(BS, "ge"),
    "<",
    ">",
    tex(BS, "ne"),
    "=",
    tex(BS, "in"),
    tex(BS, "notin"),
    tex(BS, "mathbb{R}"),
    tex(BS, "mathbb{N}"),
  ],
  "수능 문장": [
    "<보 기>",
    "단,",
    "일 때,",
    "다음 조건을 만족시킨다.",
    "값을 구하시오.",
    "최솟값을 구하시오.",
    "실수 전체의 집합에서",
    "서로 다른 실근의 개수",
  ],
};

function renderLatex(latex: string, display = false) {
  try {
    return katex.renderToString(String(latex ?? ""), {
      displayMode: display,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return String(latex ?? "");
  }
}

function MathSpan({ latex, display = false }: { latex: string; display?: boolean }) {
  return <span dangerouslySetInnerHTML={{ __html: renderLatex(latex, display) }} />;
}

function PreviewText({ text = "" }: { text?: string }) {
  return (
    <>
      {String(text)
        .split(/(\$[^$]*\$)/g)
        .map((part, i) =>
          part.startsWith("$") && part.endsWith("$") ? (
            <MathSpan key={i} latex={part.slice(1, -1)} />
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
    </>
  );
}

const makeViewBox = (): ProblemBlock => ({
  id: uid(),
  type: "box",
  title: "<보 기>",
  text: ["ㄱ. 첫 번째 명제를 입력하세요.", "ㄴ. 두 번째 명제를 입력하세요.", "ㄷ. 세 번째 명제를 입력하세요."].join(
    NL + NL
  ),
  align: "left",
  mt: 18,
  mb: 22,
  size: 24,
  width: 96,
});

function isInsideMath(el: HTMLTextAreaElement | HTMLInputElement | null) {
  const before = (el?.value ?? "").slice(0, el?.selectionStart ?? 0);
  return (before.match(/\$/g)?.length ?? 0) % 2 === 1;
}

function isMathSymbol(symbol: string) {
  return symbol.startsWith(BS) || /[_^=<>]|[{}]/.test(symbol) || (symbol.includes("(") && !/[가-힣]/.test(symbol));
}

function formatInsert(
  symbol: string,
  tab: string,
  activeTarget: string,
  blocks: ProblemBlock[],
  el: HTMLTextAreaElement | HTMLInputElement | null
) {
  if (tab === "수능 문장") return symbol;
  if (activeTarget.startsWith("block:")) {
    const block = blocks.find((b) => b.id === activeTarget.slice(6));
    if (block?.type === "equation") return symbol;
  }
  return isMathSymbol(symbol) && !isInsideMath(el) ? `$${symbol}$` : symbol;
}

function insertAt(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  setter: React.Dispatch<React.SetStateAction<string>>
) {
  if (!el) {
    setter((prev) => prev + value);
    return;
  }
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  setter(el.value.slice(0, start) + value + el.value.slice(end));
  requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = start + value.length;
  });
}

function buildLatexText(no: number, body: string, blocks: ProblemBlock[], choices: string[], show: boolean) {
  const blockText = blocks
    .map((b) =>
      b.type === "equation"
        ? `$$${b.latex ?? ""}$$`
        : b.type === "box"
          ? (b.title ? b.title + NL : "") + (b.text ?? "")
          : b.text ?? ""
    )
    .join(NL + NL);
  return `${no}. ${body}${NL}${NL}${blockText}${
    show ? NL + NL + choices.map((c, i) => nums[i] + " " + c).join("  ") : ""
  }`;
}

function choiceLayoutClass(choices: string[]) {
  const clean = (s: string) => String(s ?? "").replace(/\$|\\[a-zA-Z]+|[{}_^]/g, "");
  const maxLen = Math.max(...choices.map((c) => clean(c).trim().length), 0);
  const totalLen = choices.reduce((sum, c) => sum + clean(c).trim().length, 0);
  if (maxLen >= 18 || totalLen >= 62) return "choice-xlong";
  if (maxLen >= 12 || totalLen >= 44) return "choice-long";
  if (maxLen >= 7 || totalLen >= 30) return "choice-medium";
  return "choice-short";
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function TextArea({
  label,
  value,
  setValue,
  inputRef,
  onFocus,
  rows = 4,
}: {
  label: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onFocus?: () => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-neutral-600">{label}</div>
      <textarea
        ref={inputRef}
        value={value}
        rows={rows}
        onFocus={onFocus}
        onChange={(e) => setValue(e.target.value)}
        className="w-full resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-neutral-900"
      />
    </label>
  );
}

function InlineBlockPreview({ block }: { block: ProblemBlock }) {
  const alignClass = block.align === "center" ? "exam-align-center" : "exam-align-left";
  if (block.type === "equation") {
    return (
      <div style={{ marginTop: block.mt, marginBottom: block.mb, fontSize: block.size }} className={alignClass}>
        <MathSpan latex={block.latex ?? ""} display />
      </div>
    );
  }
  if (block.type === "box") {
    return (
      <div
        style={{ marginTop: block.mt, marginBottom: block.mb, width: (block.width ?? 96) + "%", fontSize: block.size }}
        className={"exam-box " + alignClass}
      >
        {block.title ? <div className="exam-box-title">{block.title}</div> : null}
        {(block.text ?? "").split(NL).map((line, i) => (
          <p key={i} className={line.trim() ? "" : "exam-blank-line"}>
            <PreviewText text={line} />
          </p>
        ))}
      </div>
    );
  }
  return (
    <div style={{ marginTop: block.mt, marginBottom: block.mb, fontSize: block.size }} className={"exam-body " + alignClass}>
      <PreviewText text={block.text ?? ""} />
    </div>
  );
}

function BlockEditor({
  block,
  index,
  total,
  refs,
  patch,
  remove,
  move,
  setActiveTarget,
}: {
  block: ProblemBlock;
  index: number;
  total: number;
  refs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  patch: (id: string, p: Partial<ProblemBlock>) => void;
  remove: (id: string) => void;
  move: (from: number, to: number) => void;
  setActiveTarget: React.Dispatch<React.SetStateAction<string>>;
}) {
  const value = block.type === "equation" ? block.latex ?? "" : block.text ?? "";
  const field = block.type === "equation" ? "latex" : "text";
  return (
    <div className="rounded-2xl bg-neutral-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-neutral-500">
          {block.type === "equation" ? "수식 블록" : block.type === "box" ? "조건/보기 박스" : "문장 블록"}
        </div>
        <div className="flex gap-1">
          <button disabled={index === 0} onClick={() => move(index, index - 1)} className="rounded-lg border bg-white p-1 disabled:opacity-30">
            <ArrowUp size={15} />
          </button>
          <button disabled={index === total - 1} onClick={() => move(index, index + 1)} className="rounded-lg border bg-white p-1 disabled:opacity-30">
            <ArrowDown size={15} />
          </button>
          <button onClick={() => remove(block.id)} className="rounded-lg p-1 text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {block.type === "box" ? (
        <div className="mb-2 grid grid-cols-[1fr_90px] gap-2">
          <input
            value={block.title ?? ""}
            placeholder="제목: <보 기> 등"
            onChange={(e) => patch(block.id, { title: e.target.value })}
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={block.width ?? 96}
            onChange={(e) => patch(block.id, { width: Number(e.target.value) })}
            className="rounded-xl border px-3 py-2 text-sm"
          />
        </div>
      ) : null}
      <textarea
        ref={(el) => {
          refs.current[block.id] = el;
        }}
        value={value}
        rows={block.type === "box" ? 5 : 3}
        onFocus={() => setActiveTarget("block:" + block.id)}
        onChange={(e) => patch(block.id, { [field]: e.target.value })}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button onClick={() => patch(block.id, { align: "left" })} className="rounded-lg border bg-white py-1 text-xs">
          <AlignLeft className="inline" size={13} /> 왼쪽
        </button>
        <button onClick={() => patch(block.id, { align: "center" })} className="rounded-lg border bg-white py-1 text-xs">
          <AlignCenter className="inline" size={13} /> 중앙
        </button>
        <input type="number" title="위 공백" value={block.mt} onChange={(e) => patch(block.id, { mt: Number(e.target.value) })} className="rounded-lg border px-2 py-1 text-xs" />
        <input type="number" title="아래 공백" value={block.mb} onChange={(e) => patch(block.id, { mb: Number(e.target.value) })} className="rounded-lg border px-2 py-1 text-xs" />
        <input type="number" title="글자 크기" value={block.size} onChange={(e) => patch(block.id, { size: Number(e.target.value) })} className="rounded-lg border px-2 py-1 text-xs" />
      </div>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  max = "max-w-[920px]",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  max?: string;
}) {
  return (
    <div className="editor-modal fixed inset-0 z-50 bg-black/45 p-2 sm:p-5">
      <div className={`mx-auto flex h-full ${max} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-lg font-extrabold">{title}</div>
            {subtitle ? <div className="text-xs text-neutral-500">{subtitle}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function GuideContent() {
  const nav = [
    ["guide-start", "시작하기"],
    ["guide-blocks", "문항 블록"],
    ["guide-symbols", "수식 입력"],
    ["guide-export", "내보내기"],
    ["guide-mobile", "모바일 사용"],
  ];
  return (
    <div className="guide-shell">
      <aside className="guide-sidebar">
        <div className="guide-logo">수능형 수학 문항 편집기</div>
        <div className="guide-kbd">GUIDE</div>
        <div className="guide-nav-title">가이드</div>
        {nav.map(([id, label]) => (
          <a key={id} className="guide-nav-item" href={`#${id}`}>
            {label}
          </a>
        ))}
      </aside>
      <main className="guide-content">
        <article className="guide-doc">
          <div className="guide-breadcrumb">기본 정보 / 가이드북</div>
          <h1 className="guide-title">문항 편집기 사용법</h1>
          <p className="guide-lead">
            수능·평가원 문항처럼 보이는 수학 문제를 블록 단위로 조립하는 도구입니다. 발문, 수식, 조건 박스, 보기 박스,
            오지선다를 따로 관리합니다.
          </p>
          <section id="guide-start" className="guide-section">
            <h2>시작하기</h2>
            <p>흰 영역이 실제 문항 미리보기입니다. 편집 버튼을 누르면 블록 목록이 열리고, 각 블록의 글자 크기와 위아래 여백을 조정할 수 있습니다.</p>
            <div className="guide-callout">
              <strong>예시</strong>발문에 “최고차항의 계수가 양수인 삼차함수 $f(x)$와 실수 $t$에 대하여 함수”를 입력하고, 수식 블록에 조각함수 정의를 넣은 뒤 조건 박스에 (가), (나)를 작성합니다.
            </div>
          </section>
          <section id="guide-blocks" className="guide-section">
            <h2>문항 블록</h2>
            <h3>문장 블록</h3><p>일반 문장을 넣을 때 사용합니다.</p>
            <h3>수식 블록</h3><p>조각함수, 극한식, 적분식처럼 한 줄을 크게 차지하는 수식에 적합합니다.</p>
            <h3>조건 박스와 보기 박스</h3><p>조건 박스는 (가), (나) 조건에 사용합니다. 보기 버튼을 누르면 제목이 자동으로 &lt;보 기&gt;인 박스가 생깁니다.</p>
          </section>
          <section id="guide-symbols" className="guide-section">
            <h2>수식 입력</h2>
            <p>기호 탭에서 원하는 기호를 누르면 커서 위치에 삽입됩니다. 일반 문장에서는 수학 기호가 자동으로 $...$로 감싸지고, 이미 $...$ 안에 있거나 수식 블록에서는 그대로 들어갑니다.</p>
            <code className="guide-code">
              {"문장 입력 예시" + NL + "함수  →  함수 $f(x)$" + NL + NL + "수식 블록 입력 예시" + NL + tex(BS, "displaystyle g(x)=", BS, "begin{cases}...")}
            </code>
          </section>
          <section id="guide-export" className="guide-section"><h2>내보내기</h2><p>이미지 저장은 문항 영역만 PNG로 저장합니다. LaTeX 보기는 원문을 별도 창에 표시하고 txt로 저장할 수 있습니다.</p></section>
          <section id="guide-mobile" className="guide-section"><h2>모바일 사용</h2><p>모바일에서는 편집창이 팝업으로 열립니다. 문항 화면에는 사용법, 편집, LaTeX 보기, 이미지 저장 버튼만 유지됩니다.</p></section>
        </article>
      </main>
    </div>
  );
}

export default function KoreanExamProblemEditor() {
  const [problemNo, setProblemNo] = useState(21);
  const [body, setBody] = useState(defaultBody);
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
  const pageRef = useRef<HTMLDivElement>(null);

  const patchBlock = (id: string, patch: Partial<ProblemBlock>) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));
  const moveBlock = (from: number, to: number) => setBlocks((prev) => { const next = [...prev]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
  const addBlock = (type: BlockType | "viewBox") => {
    if (type === "viewBox") { setBlocks((prev) => [...prev, makeViewBox()]); return; }
    const base: ProblemBlock = { id: uid(), type, align: type === "text" ? "left" : "center", mt: 12, mb: 12, size: type === "equation" ? 30 : 24 };
    const newBlock = type === "equation" ? { ...base, latex: "y=f(x)" } : type === "box" ? { ...base, title: "", text: "조건을 입력하세요. $f(x)=0$", width: 96, align: "left" as AlignType } : { ...base, text: "문장을 입력하세요." };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const activeInput = React.useMemo(() => {
    if (activeTarget === "body") return { el: bodyRef.current, setter: setBody };
    if (activeTarget.startsWith("choice:")) {
      const idx = Number(activeTarget.slice(7));
      return { el: choiceRefs.current[idx], setter: (v: React.SetStateAction<string>) => setChoices((prev) => prev.map((c, i) => (i === idx ? (typeof v === "function" ? (v as (x: string) => string)(c) : v) : c))) };
    }
    const id = activeTarget.slice(6);
    const block = blocks.find((b) => b.id === id);
    const field = block?.type === "equation" ? "latex" : "text";
    return { el: blockRefs.current[id], setter: (v: React.SetStateAction<string>) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: typeof v === "function" ? (v as (x: string) => string)((b[field] as string) ?? "") : v } : b))) };
  }, [activeTarget, blocks]);

  const insertSmartSymbol = (symbol: string) => insertAt(activeInput.el, formatInsert(symbol, activeTab, activeTarget, blocks, activeInput.el), activeInput.setter);
  const openLatex = () => { setLatexText(buildLatexText(problemNo, body, blocks, choices, showChoices)); setModal("latex"); };
  const saveImage = async () => {
    if (!pageRef.current) return;
    const canvas = await html2canvas(pageRef.current, {
      backgroundColor: "#ffffff",
      scale: Math.max(2, window.devicePixelRatio || 1),
      logging: false,
      onclone: (doc) => {
        const style = doc.createElement("style");
        style.textContent = "*{color:#111!important;background-color:transparent!important;border-color:#111!important;box-shadow:none!important}.exam-page{background:#fff!important}.exam-box-title{background:#fff!important}";
        doc.head.appendChild(style);
      },
    });
    const a = document.createElement("a");
    a.download = "math-problem-" + problemNo + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="topbar sticky top-0 z-30 border-b bg-white px-3 py-3 shadow-sm">
        <div className="topbar-inner mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="topbar-title"><h1 className="text-lg font-bold">수능형 수학 문항 편집기</h1><p className="text-xs text-neutral-500">문항 화면을 보면서, 편집은 팝업에서 처리합니다.</p></div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setModal("help")} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"><HelpCircle className="mr-1 inline" size={15} />사용법</button>
            <button onClick={() => setModal("edit")} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"><Settings2 className="mr-1 inline" size={15} />편집</button>
            <button onClick={openLatex} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"><Copy className="mr-1 inline" size={15} />LaTeX 보기</button>
            <button onClick={saveImage} className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"><Download className="mr-1 inline" size={15} />이미지 저장</button>
          </div>
        </div>
      </div>

      <main className="preview-shell overflow-auto bg-neutral-200 p-4 shadow-inner">
        <div ref={pageRef} className="exam-page">
          <div className="exam-row"><div className="exam-no">{problemNo}.</div><div className="exam-content"><div className="exam-body exam-main-body"><PreviewText text={body} /></div>{blocks.map((block) => <InlineBlockPreview key={block.id} block={block} />)}{showChoices ? <div className={"exam-choice-grid " + choiceLayoutClass(choices)}>{choices.map((c, i) => <div key={i} className="exam-choice-item"><span className="exam-choice-num">{nums[i]}</span><span className="min-w-0"><PreviewText text={c} /></span></div>)}</div> : null}</div></div>
        </div>
      </main>

      {modal === "latex" ? <Modal title="LaTeX 원문" subtitle="직접 복사하거나 txt로 저장할 수 있습니다." onClose={() => setModal(null)} max="max-w-[820px]"><div className="flex flex-1 flex-col gap-3 overflow-hidden p-5"><textarea value={latexText} onChange={(e) => setLatexText(e.target.value)} className="min-h-0 flex-1 resize-none rounded-2xl border bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-neutral-900" /><div className="flex justify-end"><button onClick={() => downloadText("math-problem-" + problemNo + ".txt", latexText)} className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800">txt로 저장</button></div></div></Modal> : null}
      {modal === "help" ? <Modal title="사용법" subtitle="가이드북 형식으로 문항 제작 과정을 정리했습니다." onClose={() => setModal(null)}><GuideContent /></Modal> : null}
      {modal === "edit" ? <Modal title="문항 편집" subtitle="모바일에서는 이 팝업만 편집 영역으로 사용합니다." onClose={() => setModal(null)} max="max-w-[980px]"><div className="flex-1 overflow-auto p-4"><div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.25fr]"><section className="space-y-4"><div className="rounded-2xl border p-3"><label className="block"><div className="mb-1 text-xs font-semibold text-neutral-600">문항 번호</div><input type="number" value={problemNo} onChange={(e) => setProblemNo(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-neutral-900" /></label></div><section className="rounded-2xl border p-3"><div className="mb-2 text-sm font-bold">기호·수식 빠른 삽입</div><div className="mb-3 flex flex-wrap gap-1">{Object.keys(symbolTabs).map((name) => <button key={name} onClick={() => setActiveTab(name)} className={`rounded-full px-3 py-1 text-xs font-semibold ${activeTab === name ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}>{name}</button>)}</div><div className="grid max-h-52 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">{symbolTabs[activeTab].map((s) => <button key={s} onClick={() => insertSmartSymbol(s)} className="rounded-xl border bg-white px-2 py-2 text-left text-xs hover:bg-neutral-50">{s.startsWith(BS) ? <MathSpan latex={s.split("{}").join("{□}")} /> : s}</button>)}</div><p className="mt-2 text-xs text-neutral-500">입력칸을 터치한 뒤 기호를 누르면 커서 위치에 들어갑니다.</p></section></section><section className="space-y-4"><div className="rounded-2xl border p-3"><TextArea label="발문" value={body} setValue={setBody} inputRef={bodyRef} rows={4} onFocus={() => setActiveTarget("body")} /></div><div className="rounded-2xl border p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-bold">문항 안에 들어가는 블록</div><div className="flex flex-wrap gap-1"><button onClick={() => addBlock("text")} className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold"><Plus className="inline" size={13} />문장</button><button onClick={() => addBlock("equation")} className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white"><Plus className="inline" size={13} />수식</button><button onClick={() => addBlock("box")} className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold"><Plus className="inline" size={13} />박스</button><button onClick={() => addBlock("viewBox")} className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white"><Plus className="inline" size={13} />보기</button></div></div><div className="space-y-3">{blocks.map((block, idx) => <BlockEditor key={block.id} block={block} index={idx} total={blocks.length} refs={blockRefs} patch={patchBlock} remove={removeBlock} move={moveBlock} setActiveTarget={setActiveTarget} />)}</div></div><section className="space-y-3 rounded-2xl border p-3"><button onClick={() => setShowChoices((v) => !v)} className="flex w-full items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-bold">오지선다 {showChoices ? "사용 중" : "숨김"} {showChoices ? <Eye size={17} /> : <EyeOff size={17} />}</button>{showChoices ? choices.map((c, i) => <label key={i} className="flex items-center gap-2"><span className="w-8 text-lg">{nums[i]}</span><input ref={(el) => { choiceRefs.current[i] = el; }} value={c} onFocus={() => setActiveTarget("choice:" + i)} onChange={(e) => setChoices((prev) => prev.map((x, idx) => idx === i ? e.target.value : x))} className="flex-1 rounded-xl border px-3 py-2 text-sm" /></label>) : null}</section></section></div></div></Modal> : null}
    </div>
  );
}
