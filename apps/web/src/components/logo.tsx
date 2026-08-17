type LogoMarkProps = {
  className?: string;
  size?: number;
};

/**
 * The Roleway monogram combines an R with a forward route.
 * The terminal waypoint uses the product accent to signal the next action.
 */
export function LogoMark({ className = "", size = 20 }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={`logo-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect className="logo-mark__tile" x="1" y="1" width="22" height="22" rx="5.25" />
      <path
        className="logo-mark__route"
        d="M7.25 18V6.5H12.5C15.1 6.5 16.65 7.78 16.65 9.9C16.65 12.02 15.1 13.3 12.5 13.3H7.25M12.65 13.3L17.35 18"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="logo-mark__waypoint" cx="17.35" cy="18" r="1.45" />
    </svg>
  );
}
