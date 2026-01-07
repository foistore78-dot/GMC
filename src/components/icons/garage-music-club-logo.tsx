import type { SVGProps } from "react";

export function GarageMusicClubLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
      <path d="M12 12.5a2 2 0 1 0 0-5 2 2 0 0 0 0 5Z" />
      <path d="m11 10 3 5" />
      <path d="m11 15 3-5" />
    </svg>
  );
}
