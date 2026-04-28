import { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">{title}</h1>
        {description ? (
          <p className="mt-2 text-gray-400">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex gap-3">{actions}</div> : null}
    </header>
  );
}
