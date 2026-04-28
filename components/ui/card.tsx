import { ReactNode } from "react";

export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-lg ${className}`.trim()}>
      {children}
    </section>
  );
}
