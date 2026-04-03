"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  message = "CARICAMENTO DATI", 
  submessage = "Sincronizzazione con il database GMC...",
  className,
  fullScreen = true
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(13);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    const timer2 = setTimeout(() => setProgress(81), 1500);
    const timer3 = setTimeout(() => setProgress(94), 3000);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-6 transition-all duration-500 animate-in fade-in",
      fullScreen ? "fixed inset-0 z-[100] bg-background/95 backdrop-blur-md" : "w-full h-full min-h-[400px]",
      className
    )}>
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo/Icon Area */}
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full animate-pulse" />
          <div className="relative bg-background border border-primary/20 p-5 rounded-2xl shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </div>

        {/* Text Area */}
        <div className="text-center space-y-2">
          <h2 className="font-headline text-2xl md:text-3xl text-primary tracking-[0.2em] uppercase animate-pulse">
            {message}
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm font-medium tracking-wide">
            {submessage}
          </p>
        </div>

        {/* Progress Bar Area */}
        <div className="w-full space-y-3">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/10 border border-primary/5">
                <Progress value={progress} className="h-full w-full bg-transparent" />
                {/* Custom glow for the progress indicator */}
                <div 
                    className="absolute top-0 bottom-0 left-0 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                />
          </div>
          <div className="flex justify-between items-center px-1">
             <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50">Stato</span>
             <span className="text-[10px] text-primary font-bold tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 animate-blob" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 animate-blob animation-delay-2000" />
    </div>
  );
}
