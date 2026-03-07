import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number; // default 60
};

export function GarageMusicClubLogo({ className, size = 60 }: Props) {
  return (
    <span
      className={cn(className)}
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        overflow: "hidden",
        verticalAlign: "middle",
      }}
    >
      <Image
        src="https://i.imgur.com/Pp0tSQj.png"
        alt="Garage Music Club Logo"
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
        priority
      />
    </span>
  );
}