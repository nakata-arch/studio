
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // ホームパスへのアクセスは設定ページへリダイレクト
    router.replace("/settings");
  }, [router]);

  return null;
}
