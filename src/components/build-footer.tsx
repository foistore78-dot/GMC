"use client";

/**
 * BuildFooter - mostra la data dell'ultimo build dell'app.
 * La data viene iniettata staticamente da next.config.js via NEXT_PUBLIC_BUILD_DATE.
 */
export function BuildFooter() {
  const buildDateRaw = process.env.NEXT_PUBLIC_BUILD_DATE;
  
  let buildLabel = "—";
  if (buildDateRaw) {
    try {
      const d = new Date(buildDateRaw);
      buildLabel = d.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      buildLabel = buildDateRaw;
    }
  }

  return (
    <footer className="w-full py-3 px-4 border-t border-border/40 bg-background/60 text-center">
      <p className="text-[11px] text-muted-foreground/60 tracking-wide">
        🔧 Ultimo aggiornamento app:{" "}
        <span className="font-mono font-medium text-muted-foreground/80">
          {buildLabel}
        </span>
      </p>
    </footer>
  );
}
