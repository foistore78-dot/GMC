
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModuloOfflinePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/elenco");
  }, [router]);

  return null;
}
