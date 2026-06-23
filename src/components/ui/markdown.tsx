import type { ReactNode } from "react";

export type MarkdownProps = {
  /** 마크다운(또는 plain) 본문. null/빈 문자열이면 아무것도 렌더하지 않아요. */
  content: string | null | undefined;
  className?: string;
};

// 인라인 토큰: [텍스트](url) / **볼드** / *이탤릭* / `코드` 를 React 노드로.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[2] !== undefined && m[3] !== undefined)
      out.push(
        <a key={key} href={m[3]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)", fontWeight: 600 }}>
          {m[2]}
        </a>,
      );
    else if (m[4] !== undefined) out.push(<strong key={key}>{m[4]}</strong>);
    else if (m[5] !== undefined) out.push(<strong key={key}>{m[5]}</strong>);
    else if (m[6] !== undefined) out.push(<code key={key}>{m[6]}</code>);
    else if (m[7] !== undefined) out.push(<em key={key}>{m[7]}</em>);
    else if (m[8] !== undefined) out.push(<em key={key}>{m[8]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type ChartDatum = { label: string; value: number };
type ChartSpec = { title?: string; unit?: string; data: ChartDatum[] };

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "hr" }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string; text: string }
  | { type: "chart"; spec: ChartSpec }
  | { type: "table"; head: string[]; rows: string[][] };

const splitRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

const isTableSep = (line: string): boolean =>
  /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);

// 줄 단위 파서: 펜스코드(```/```chart) · 표 · #제목 · >인용 · ---수평선 · 리스트 · 문단.
function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ type: "quote", text: quote.join(" ").trim() });
      quote = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list.ordered ? { type: "ol", items: list.items } : { type: "ul", items: list.items });
      list = null;
    }
  };
  const flushAll = () => {
    flushPara();
    flushQuote();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // 펜스 코드블록 ```lang ... ```
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      flushAll();
      const lang = (fence[1] || "").toLowerCase();
      const buf: string[] = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (/^```\s*$/.test(lines[i].trim())) {
          closed = true;
          break;
        }
        buf.push(lines[i]);
        i++;
      }
      // 닫는 펜스가 없으면(출력 잘림) 깨진 꼬리는 버린다.
      if (!closed) continue;
      const text = buf.join("\n").trim();
      if (lang === "chart") {
        try {
          const spec = JSON.parse(text) as ChartSpec;
          if (Array.isArray(spec?.data) && spec.data.length) {
            blocks.push({ type: "chart", spec });
          }
        } catch {
          /* 차트 JSON 깨짐 → 아무것도 렌더하지 않음(깨진 블록 방지) */
        }
        continue;
      }
      if (text) blocks.push({ type: "code", lang, text });
      continue;
    }

    // 표: 헤더행 + 구분행
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushAll();
      const head = splitRow(line);
      const rows: string[][] = [];
      i += 2; // 헤더 + 구분행 건너뜀
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--; // for 루프 증가분 보정
      blocks.push({ type: "table", head, rows });
      continue;
    }

    if (!line) {
      flushAll();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushAll();
      blocks.push({ type: "hr" });
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1].trim());
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushAll();
      blocks.push({ type: "h", level: h[1].length, text: h[2].trim() });
      continue;
    }
    const ol = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[2].trim());
      continue;
    }
    const ul = /^[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      flushQuote();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1].trim());
      continue;
    }
    flushList();
    flushQuote();
    para.push(line);
  }
  flushAll();
  return blocks;
}

function BarChart({ spec, k }: { spec: ChartSpec; k: string }) {
  const max = Math.max(...spec.data.map((d) => (Number.isFinite(d.value) ? d.value : 0)), 0) || 1;
  return (
    <figure className="md-chart">
      {spec.title && <figcaption className="md-chart-title">{spec.title}</figcaption>}
      <div className="md-chart-body">
        {spec.data.map((d, j) => (
          <div className="md-bar-row" key={`${k}-${j}`}>
            <span className="md-bar-label">{d.label}</span>
            <span className="md-bar-track">
              <span
                className="md-bar-fill"
                style={{ width: `${Math.max(2, (Number(d.value) / max) * 100)}%` }}
              />
            </span>
            <span className="md-bar-val">
              {d.value}
              {spec.unit ?? ""}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/**
 * 의존성 없는 마크다운 렌더러(서버 컴포넌트).
 * 제목·문단·리스트·인용·수평선·**링크/볼드/코드** + **표·차트(```chart)·코드블록**.
 */
export function Markdown({ content, className }: MarkdownProps) {
  const src = (content ?? "").trim();
  if (!src) return null;
  const blocks = parseBlocks(src);

  return (
    <div className={["md", className].filter(Boolean).join(" ")}>
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        if (b.type === "h")
          return b.level >= 3 ? (
            <h4 key={key}>{renderInline(b.text, key)}</h4>
          ) : (
            <h3 key={key}>{renderInline(b.text, key)}</h3>
          );
        if (b.type === "p") return <p key={key}>{renderInline(b.text, key)}</p>;
        if (b.type === "hr")
          return <hr key={key} style={{ border: 0, borderTop: "1px solid var(--border)", margin: "20px 0" }} />;
        if (b.type === "quote")
          return (
            <blockquote
              key={key}
              style={{
                margin: "14px 0",
                padding: "10px 16px",
                borderLeft: "3px solid var(--blue)",
                background: "var(--blue-weak)",
                borderRadius: "0 8px 8px 0",
                color: "var(--t1)",
                fontSize: "15.5px",
                lineHeight: 1.7,
              }}
            >
              {renderInline(b.text, key)}
            </blockquote>
          );
        if (b.type === "ol")
          return (
            <ol key={key} style={{ paddingLeft: 20, margin: "8px 0" }}>
              {b.items.map((it, j) => (
                <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
              ))}
            </ol>
          );
        if (b.type === "ul")
          return (
            <ul key={key} style={{ paddingLeft: 20, margin: "8px 0" }}>
              {b.items.map((it, j) => (
                <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        if (b.type === "chart") return <BarChart key={key} spec={b.spec} k={key} />;
        if (b.type === "code")
          return (
            <pre key={key} className="md-code">
              <code>{b.text}</code>
            </pre>
          );
        // table
        return (
          <div key={key} className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>
                  {b.head.map((c, j) => (
                    <th key={`${key}-h-${j}`}>{renderInline(c, `${key}-h-${j}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={`${key}-r-${j}`}>
                    {r.map((c, l) => (
                      <td key={`${key}-r-${j}-${l}`}>{renderInline(c, `${key}-r-${j}-${l}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
