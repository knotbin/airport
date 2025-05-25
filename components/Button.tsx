import { JSX } from "preact";

type ButtonBaseProps = {
  color?: "blue" | "amber";
  icon?: string;
  iconAlt?: string;
  label?: string;
  className?: string;
  condensed?: boolean;
};

type ButtonProps = ButtonBaseProps & Omit<JSX.HTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps>;
type AnchorProps = ButtonBaseProps & Omit<JSX.HTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & { href: string };

type Props = ButtonProps | AnchorProps;

export function Button(props: Props) {
  const { color = "blue", icon, iconAlt, label, className = "", condensed = false, ...rest } = props;
  const isAnchor = 'href' in props;

  const baseStyles = "airport-sign flex items-center [transition:none]";
  const paddingStyles = condensed ? 'px-2 py-1.5' : 'px-3 py-2 sm:px-6 sm:py-3';
  const transformStyles = "translate-y-0 hover:translate-y-1 hover:transition-transform hover:duration-200 hover:ease-in-out";
  const colorStyles = {
    blue: "bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:from-blue-500 hover:to-blue-600",
    amber: "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 hover:from-amber-500 hover:to-amber-600",
  };

  const buttonContent = (
    <>
      {icon && (
        <img
          src={icon}
          alt={iconAlt || ""}
          className={`${condensed ? 'w-4 h-4' : 'w-6 h-6'} mr-2`}
          style={{ filter: color === 'blue' ? "brightness(0) invert(1)" : "brightness(0)" }}
        />
      )}
      {label && (
        <span className="font-mono font-bold tracking-wider">
          {label}
        </span>
      )}
    </>
  );

  const buttonStyles = `${baseStyles} ${paddingStyles} ${transformStyles} ${colorStyles[color]} ${className}`;

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
