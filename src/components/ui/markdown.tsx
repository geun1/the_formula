import type { ReactNode } from "react";

export type MarkdownProps = {
  /** 마크다운(또는 plain) 본문. null/빈 문자열이면 아무것도 렌더하지 않아요. */
  content: string | null | undefined;
  className?: string;
};

// 인라인 토큰: **볼드** / *이탤릭*(또는 _이탤릭_) / `코드` 를 React 노드로.
// 의존성 없이 최소한으로 처리해요(레퍼런스 d-block 톤).
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // [텍스트](url) | **bold** | __bold__ | `code` | *em* | _em_ 순서로 매칭.
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

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "hr" }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

// 줄 단위 파서: #→소제목, -/*→불릿, 1.→번호, 빈 줄→문단 경계.
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
      blocks.push(
        list.ordered
          ? { type: "ol", items: list.items }
          : { type: "ul", items: list.items },
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      flushQuote();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushPara();
      flushList();
      flushQuote();
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
      flushPara();
      flushList();
      flushQuote();
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
    // 일반 텍스트 줄 — 진행 중 리스트/인용을 끊고 문단에 누적.
    flushList();
    flushQuote();
    para.push(line);
  }
  flushPara();
  flushList();
  flushQuote();
  return blocks;
}

/**
 * 의존성 없는 최소 마크다운 렌더러(서버 컴포넌트).
 * 아티클/공식 본문이 raw 마크다운("## 제목", "**볼드**", "1. …")으로 노출되던 걸
 * 레퍼런스 .d-block 톤(제목=h3, 문단=p, 리스트, strong/em/code)으로 렌더해요.
 */
export function Markdown({ content, className }: MarkdownProps) {
  const src = (content ?? "").trim();
  if (!src) return null;
  const blocks = parseBlocks(src);

  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        if (b.type === "h") {
          return b.level >= 3 ? (
            <h4 key={key}>{renderInline(b.text, key)}</h4>
          ) : (
            <h3 key={key}>{renderInline(b.text, key)}</h3>
          );
        }
        if (b.type === "p") {
          return <p key={key}>{renderInline(b.text, key)}</p>;
        }
        if (b.type === "hr") {
          return (
            <hr
              key={key}
              style={{
                border: 0,
                borderTop: "1px solid var(--border)",
                margin: "20px 0",
              }}
            />
          );
        }
        if (b.type === "quote") {
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
        }
        if (b.type === "ol") {
          return (
            <ol key={key} style={{ paddingLeft: 20, margin: "8px 0" }}>
              {b.items.map((it, j) => (
                <li
                  key={`${key}-${j}`}
                  style={{
                    fontSize: "15.5px",
                    color: "var(--t2)",
                    lineHeight: 1.7,
                    marginBottom: 4,
                  }}
                >
                  {renderInline(it, `${key}-${j}`)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={key} style={{ paddingLeft: 20, margin: "8px 0" }}>
            {b.items.map((it, j) => (
              <li
                key={`${key}-${j}`}
                style={{
                  fontSize: "15.5px",
                  color: "var(--t2)",
                  lineHeight: 1.7,
                  marginBottom: 4,
                }}
              >
                {renderInline(it, `${key}-${j}`)}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
