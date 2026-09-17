"use client";

import { useEffect, useRef } from "react";

/**
 * Progressive-enhancement scroll reveal. The element renders with the
 * `reveal` class (hidden) but a <noscript> fallback in layout keeps content
 * visible without JS. With JS, IntersectionObserver adds `is-visible`.
 */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "article";
  id?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag id={id} ref={ref as never} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
