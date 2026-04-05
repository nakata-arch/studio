
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    console.log("home:init", { isUserLoading, hasUser: !!user });
    if (!isUserLoading) {
      if (user) {
        router.replace("/settings");
      } else {
        router.replace("/");
      }
    }
  }, [router, user, isUserLoading]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">ページを読み込んでいます...</p>
    </div>
  );
}
