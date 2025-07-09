import { JSX } from "preact";

/**
 * Props for the Link component
 */
type Props = Omit<JSX.HTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** URL for the link */
  href: string;
  /** Whether this is an external link that should show an outbound icon */
  isExternal?: boolean;
  /** Link text content */
  children: JSX.Element | string;
};

/**
 * A link component that handles external links with appropriate styling and accessibility.
 * Automatically adds external link icon and proper attributes for external links.
 */
export function Link(props: Props) {
  const {
    isExternal = false,
    class: className = "",
    children,
    href,
    ...rest
  } = props;

  // SVG for external link icon
  const externalLinkIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4 inline-block ml-1"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
      />
      <path
        fillRule="evenodd"
        d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
      />
    </svg>
  );

  return (
    <a
      href={href}
      {...rest}
      className={`inline-flex items-center hover:underline ${className}`}
      {...(isExternal && {
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": `${
          typeof children === "string" ? children : ""
        } (opens in new tab)`,
      })}
    >
      {children}
      {isExternal && externalLinkIcon}
    </a>
  );
}
