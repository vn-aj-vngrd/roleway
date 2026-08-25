type LogoMarkProps = {
  className?: string;
  size?: number;
  tile?: boolean;
};

/**
 * The Roleway monogram combines an R with a forward route.
 * The terminal waypoint uses the product accent to signal the next action.
 */
export function LogoMark({ className = "", size = 20, tile = false }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={`logo-mark ${tile ? "logo-mark--tile" : ""} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {tile ? <>
        <rect className="logo-mark__tile" x=".75" y=".75" width="22.5" height="22.5" rx="5.25" />
        <path className="logo-mark__route" d="M19.3 48V17.3h14c6.9 0 11.1 3.4 11.1 9s-4.2 9-11.1 9h-14m14.4 0L46.3 48" transform="scale(.375)" stroke="currentColor" strokeWidth="4.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="logo-mark__waypoint" cx="17.3625" cy="18" r="1.5" />
      </> : <>
        <path className="logo-mark__route" d="M6.75 19V5.5H12.5C15.55 5.5 17.25 7.02 17.25 9.5C17.25 11.98 15.55 13.5 12.5 13.5H6.75M12.65 13.5L18 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="logo-mark__waypoint" cx="18" cy="19" r="1.65" />
      </>}
    </svg>
  );
}
