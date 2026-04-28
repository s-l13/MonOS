import Link from "next/link";
import { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "info";

type BaseProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

type ButtonAsButtonProps = BaseProps & {
  href?: never;
  type?: "button" | "submit" | "reset";
};

type ButtonAsLinkProps = BaseProps & {
  href: string;
  type?: never;
};

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

function getVariantClasses(variant: ButtonVariant = "primary") {
  switch (variant) {
    case "secondary":
      return "bg-gray-700 text-gray-200 hover:bg-gray-600";
    case "danger":
      return "bg-red-900/40 text-red-400 hover:bg-red-900/60";
    case "info":
      return "bg-blue-900/40 text-blue-400 hover:bg-blue-900/60";
    case "primary":
    default:
      return "bg-blue-600 text-white hover:bg-blue-700";
  }
}

function getBaseClasses(variant: ButtonVariant = "primary", className = "") {
  return `rounded-lg px-4 py-3 text-sm font-medium transition ${getVariantClasses(
    variant
  )} ${className}`.trim();
}

export default function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const className = getBaseClasses(variant, props.className);

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={className}>
        {props.children}
      </Link>
    );
  }

  return (
    <button type={props.type ?? "button"} className={className}>
      {props.children}
    </button>
  );
}
