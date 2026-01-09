import type { SVGProps } from "react";

export function GarageMusicClubLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      {...props}
    >
      <g fill="white">
        <text
          x="50"
          y="26"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize="14"
          textAnchor="middle"
          fill="currentColor"
        >
          GARAGE
        </text>
        <text
          x="50"
          y="82"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize="10"
          textAnchor="middle"
          fill="currentColor"
        >
          MUSIC CLUB
        </text>
      </g>
      <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="24" fill="black" />
      <g>
        <circle cx="50" cy="50" r="20" fill="currentColor" />
        <circle cx="50" cy="50" r="17" fill="black" />
        <circle cx="50" cy="50" r="10" fill="currentColor" />
        <circle cx="50" cy="50" r="7" fill="black" />
        <path d="M50 45.5 A 4.5 4.5 0 0 1 50 54.5 A 4.5 4.5 0 0 1 50 45.5" fill="currentColor"/>
        <path d="M50 45.5 A 5 5 0 0 0 50 54.5" fill="black"/>
      </g>
      <path
        id="curve"
        d="M20,68 A35,35 0 1,1 80,68"
        fill="transparent"
      />
       <path
        id="curve-top"
        d="M20,32 A35,35 0 0,1 80,32"
        fill="transparent"
      />

       <g fontSize="4" fontFamily="Arial, sans-serif" fill="currentColor">
          <text><textPath href="#curve" startOffset="50%" textAnchor="middle">GARAGE.MUSIC.CLUB2024@GMAIL.COM</textPath></text>
          <text><textPath href="#curve-top" startOffset="50%" textAnchor="middle">C.F: 91050330314</textPath></text>
           <text><textPath href="#curve" startOffset="82%" textAnchor="middle">34072 GRADISCA D'ISONZO</textPath></text>
           <text><textPath href="#curve" startOffset="18%" textAnchor="middle">VIA UDINE 43</textPath></text>
       </g>

       <g stroke="red" strokeWidth="0.8">
            <path d="M30 40.23 A 20 20 0 0 1 30 59.77" fill="none"/>
            <path d="M28 41.6 A 22 22 0 0 1 28 58.4" fill="none"/>
            <path d="M26 42.8 A 24 24 0 0 1 26 57.2" fill="none"/>
            <path d="M24 44 A 26 26 0 0 1 24 56" fill="none"/>
            <path d="M22 45.3 A 28 28 0 0 1 22 54.7" fill="none"/>

            <path d="M70 40.23 A 20 20 0 0 0 70 59.77" fill="none"/>
            <path d="M72 41.6 A 22 22 0 0 0 72 58.4" fill="none"/>
            <path d="M74 42.8 A 24 24 0 0 0 74 57.2" fill="none"/>
            <path d="M76 44 A 26 26 0 0 0 76 56" fill="none"/>
            <path d="M78 45.3 A 28 28 0 0 0 78 54.7" fill="none"/>
        </g>
    </svg>
  );
}
