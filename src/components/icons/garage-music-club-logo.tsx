import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

export function GarageMusicClubLogo({ className, size }: Props) {
  const pixelSize = size || 60;
  return (
    <span
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center overflow-hidden",
        !className && !size && "w-[60px] h-[60px]",
        className
      )}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    >
      <Image
        src="/logo.png"
        alt="Garage Music Club Logo"
        width={pixelSize}
        height={pixelSize}
        className="w-full h-full object-contain"
        priority
        unoptimized
      />
    </span>
  );
}