interface IzanLogoProps {
  className?: string;
}

export function IzanLogo({ className }: IzanLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <circle cx="16" cy="8.5" r="2.5" className="fill-primary-foreground" />
      <rect
        x="13.5"
        y="13"
        width="5"
        height="13"
        rx="2.5"
        className="fill-primary-foreground"
      />
    </svg>
  );
}
