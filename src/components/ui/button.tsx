import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

// 토스 버튼: filled(primary) / weak(soft) / ghost
const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-soft hover:bg-accent-hover",
  ghost:
    "border border-border-2 bg-surface text-t2 hover:bg-card-hover hover:text-t1",
  soft: "bg-accent-soft text-accent hover:bg-accent-softer",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-[15px]",
};

function classes(variant: Variant, size: Size, className?: string) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className ?? ""}`.trim();
}

type ButtonAsButton = {
  href?: undefined;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className"> & { className?: string };

type ButtonAsLink = {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className">;

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** primary/ghost 버튼. href 가 있으면 next/link, 없으면 <button>. */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const cls = classes(variant, size, className);

  if (props.href !== undefined) {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  const { href: _h, variant: _v, size: _s, className: _c, children: _ch, ...rest } =
    props as ButtonAsButton;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
