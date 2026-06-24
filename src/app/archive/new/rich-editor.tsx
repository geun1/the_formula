"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

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
}: {
  on: () => void;
  active?: boolean;
  label: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // 포커스 유지
      onClick={on}
      className={`re-tb${active ? " on" : ""}`}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
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
      <Tb on={setLink} active={editor.isActive("link")} label="🔗" title="링크" />
      <span className="re-sep" />
      <Tb on={() => editor.chain().focus().undo().run()} label="↶" title="실행취소" />
      <Tb on={() => editor.chain().focus().redo().run()} label="↷" title="다시실행" />
    </div>
  );
}

/** 자유 형식 리치 에디터(Tiptap). SSR 안전(immediatelyRender:false). */
export function RichEditor({ value, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "tiptap-content",
        "aria-label": "자유 형식 본문",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return <div className="re-wrap re-loading">에디터를 불러오는 중…</div>;
  }

  return (
    <div className="re-wrap">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
