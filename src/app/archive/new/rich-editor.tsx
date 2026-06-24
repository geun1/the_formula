"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";

type Props = {
  /** 초기 HTML */
  value?: string;
  /** 변경 시 getHTML() 전달 */
  onChange: (html: string) => void;
};

/** 툴바 버튼. active 면 강조. */
function Tb({
  on,
  active,
  label,
  title,
  disabled,
}: {
  on: () => void;
  active?: boolean;
  label: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // 포커스 유지
      onClick={on}
      className={`re-tb${active ? " on" : ""}`}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
}) {
  const inTable = editor.isActive("table");

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="re-toolbar">
      <Tb on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label={<b>B</b>} title="굵게" />
      <Tb on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label={<i>I</i>} title="기울임" />
      <Tb on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label={<s>S</s>} title="취소선" />
      <span className="re-sep" />
      <Tb on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="H2" title="제목 2" />
      <Tb on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="H3" title="제목 3" />
      <span className="re-sep" />
      <Tb on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="• 목록" title="불릿 목록" />
      <Tb on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="1. 목록" title="번호 목록" />
      <Tb on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="❝" title="인용" />
      <Tb on={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} label="{ }" title="코드블록" />
      <span className="re-sep" />
      <Tb on={onPickImage} label={uploading ? "⏳" : "🖼"} title="이미지 업로드" disabled={uploading} />
      <Tb
        on={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        label="▦ 표"
        title="표 삽입(3×3)"
      />
      {inTable && (
        <>
          <Tb on={() => editor.chain().focus().addRowAfter().run()} label="+행" title="행 추가" />
          <Tb on={() => editor.chain().focus().addColumnAfter().run()} label="+열" title="열 추가" />
          <Tb on={() => editor.chain().focus().deleteRow().run()} label="−행" title="행 삭제" />
          <Tb on={() => editor.chain().focus().deleteColumn().run()} label="−열" title="열 삭제" />
          <Tb on={() => editor.chain().focus().deleteTable().run()} label="✕표" title="표 삭제" />
        </>
      )}
      <span className="re-sep" />
      <Tb on={setLink} active={editor.isActive("link")} label="🔗" title="링크" />
      <span className="re-sep" />
      <Tb on={() => editor.chain().focus().undo().run()} label="↶" title="실행취소" />
      <Tb on={() => editor.chain().focus().redo().run()} label="↷" title="다시실행" />
    </div>
  );
}

/** 자유 형식 리치 에디터(Tiptap). 이미지 업로드(Blob) + 표 지원. SSR 안전. */
export function RichEditor({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "tiptap-content", "aria-label": "자유 형식 본문" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  async function uploadImage(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        editor?.chain().focus().setImage({ src: data.url }).run();
      } else {
        setErr(data.error ?? "업로드에 실패했어요.");
      }
    } catch {
      setErr("업로드에 실패했어요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!editor) {
    return <div className="re-wrap re-loading">에디터를 불러오는 중…</div>;
  }

  return (
    <div className="re-wrap">
      <Toolbar
        editor={editor}
        uploading={uploading}
        onPickImage={() => fileRef.current?.click()}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadImage(f);
        }}
      />
      {err && <div className="re-err">{err}</div>}
      <EditorContent editor={editor} />
    </div>
  );
}
