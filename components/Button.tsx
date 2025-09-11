import { JSX } from "preact";

type ButtonBaseProps = {
  color?: "blue" | "amber";
  icon?: string;
  iconAlt?: string;
  label?: string;
  className?: string;
  condensed?: boolean;
};

type ButtonProps =
  & ButtonBaseProps
  & Omit<JSX.HTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps>;
type AnchorProps =
  & ButtonBaseProps
  & Omit<JSX.HTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps>
  & { href: string };

/**
 * The button props or anchor props for a button or link.
 * @type {Props}
 */
type Props = ButtonProps | AnchorProps;

/**
 * Styled button component.
 * @param props - The button props
 * @returns The button component
 * @component
 */
export function Button(props: Props) {
  const {
    color = "blue",
    icon,
    iconAlt,
    label,
    className = "",
    condensed = false,
    ...rest
  } = props;
  const isAnchor = "href" in props;

  const baseStyles = "airport-sign flex items-center [transition:none]";
  const paddingStyles = condensed ? "px-2 py-1.5" : "px-3 py-2 sm:px-6 sm:py-3";
  const colorStyles = {
    blue: "bg-blue-500 text-white hover:bg-blue-500",
    amber: "bg-amber-400 text-slate-900 hover:bg-amber-500",
  };

  const buttonContent = (
    <>
      {icon && (
        <img
          src={icon}
          alt={iconAlt || ""}
          className={`${condensed ? "w-4 h-4" : "w-6 h-6"} mr-2`}
          style={{
            filter: color === "blue"
              ? "brightness(0) invert(1)"
              : "brightness(0)",
          }}
        />
      )}
      {label && (
        <span className="font-mono font-bold tracking-wider">
          {label}
        </span>
      )}
    </>
  );

  const buttonStyles = `${baseStyles} ${paddingStyles} ${
    colorStyles[color]
  } ${className}`;

  if (isAnchor) {
    return (
      <a
        href={props.href}
        className={buttonStyles}
        {...rest as JSX.HTMLAttributes<HTMLAnchorElement>}
      >
        {buttonContent}
      </a>
    );
  }

  const buttonProps = rest as JSX.HTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonProps}
      className={buttonStyles}
    >
      {buttonContent}
    </button>
  );
}
