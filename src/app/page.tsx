
"use client";

import { useEffect, useState } from "react";
import { getRedirectResult, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { auth } from "@/firebase";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, LogIn, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const { user, isUserLoading, isPreviewMode, loginAsMockUser } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user && !isUserLoading) {
      router.replace("/settings");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const handleRedirect = async () => {
      // Firebase Studio プレビュー環境では getRedirectResult を呼び出さない
      // APIキーエラーやドメイン制限によるエラーを防ぐため
      if (isPreviewMode) {
        console.log("login:preview-mode-active (skipping redirect check)");
        return;
      }

      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("login:redirect-success", result.user.uid);
        }
      } catch (error: any) {
        console.error("login:redirect-error", error);
        // SDKエラーが頻発するため、プレビュー環境以外でも特定の通知は抑制
        if (error.code !== "auth/operation-not-allowed" && error.code !== "auth/api-key-not-valid") {
           setErrorMessage("ログインに失敗しました。もう一度お試しください。");
        }
      }
    };
    handleRedirect();
  }, [isPreviewMode]);

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("login:redirect-start-error", error);
      setErrorMessage("Googleログインの開始に失敗しました。");
      setLoading(false);
    }
  };

  const handlePreviewBypass = () => {
    setLoading(true);
    // SDK メソッドを一切呼ばず、内部ステートのみ更新する
    loginAsMockUser();
    console.log("login:bypass-success (mock session started)");
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin opacity-20 h-8 w-8 text-slate-400" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-[0.03] z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-xl w-full space-y-12 text-center relative z-10">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto border border-blue-100/50">
            <Sparkles className="text-blue-500 h-8 w-8" />
          </div>
          <h1 className="text-5xl font-bold text-slate-800 tracking-tight font-headline">
            DAYS
          </h1>
          <p className="text-lg leading-relaxed text-slate-500 font-medium">
            予定を振り返り、<br />
            時間の使い方を優しく整える場所。
          </p>
        </div>

        <div className="space-y-4">
          {isPreviewMode ? (
            <button
              type="button"
              onClick={handlePreviewBypass}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-5 text-lg font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
              プレビューモードで開始
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 py-5 text-lg font-bold text-white transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              Googleでログイン
            </button>
          )}

          {isPreviewMode && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-[11px] leading-relaxed text-amber-700/80 font-medium">
              <span className="font-bold">Studio プレビュー制限:</span> 現在の環境では Google ログインがブロックされるため、ダミーユーザーとして開始します。カレンダー同期を試すには、デプロイ済みのドメインをご利用ください。
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-600">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="pt-8 opacity-20">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-400">Time Management Coach</p>
        </div>
      </div>
    </main>
  );
}
