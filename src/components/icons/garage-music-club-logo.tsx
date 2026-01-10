import Image from "next/image";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function GarageMusicClubLogo(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <Image
      src="https://i.imgur.com/zO92zB0.png"
      alt="Garage Music Club Logo"
      width={100}
      height={100}
      className={cn(props.className)}
      // The original SVG props are not all applicable to Image, so we spread only what's safe
      // or handle them as needed. For this component, className is the main prop used.
    />
  );
}
