"use client";

import { useEffect, useState } from "react";
import { getRedirectResult, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { auth } from "@/firebase/config";

type RuntimeInfo = {
  href: string;
  hostname: string;
  isStudioShell: boolean;
  isAllowedHost: boolean;
  canUseGoogleLogin: boolean;
};

function getRuntimeInfo(): RuntimeInfo {
  if (typeof window === "undefined") return initialRuntime;
  
  const href = window.location.href;
  const hostname = window.location.hostname;

  const isStudioShell =
    hostname === "studio.firebase.google.com" ||
    hostname.includes("cloudworkstations.dev");

  const isAllowedHost =
    hostname === "localhost" ||
    hostname.endsWith(".web.app") ||
    hostname.endsWith(".firebaseapp.com") ||
    hostname.endsWith(".hosted.app");

  return {
    href,
    hostname,
    isStudioShell,
    isAllowedHost,
    canUseGoogleLogin: !isStudioShell && isAllowedHost,
  };
}

const initialRuntime: RuntimeInfo = {
  href: "",
  hostname: "",
  isStudioShell: false,
  isAllowedHost: false,
  canUseGoogleLogin: false,
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [runtime, setRuntime] = useState<RuntimeInfo>(initialRuntime);

  useEffect(() => {
    setMounted(true);
    setRuntime(getRuntimeInfo());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const run = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result?.user) {
          console.log("login:redirect-success", {
            uid: result.user.uid,
            email: result.user.email,
          });
          setInfoMessage("Googleログインが完了しました。");
        }
      } catch (error) {
        console.error("login:redirect-error", error);
        // リダイレクトエラーを無視せず、必要ならユーザーに通知
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [mounted]);

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setInfoMessage("");

    const current = getRuntimeInfo();
    setRuntime(current);

    if (!current.canUseGoogleLogin) {
      setErrorMessage(
        "この画面は Firebase Studio のプレビュー環境（cloudworkstations.dev）です。セキュリティ制限のため Google ログインは利用できません。hosted.app / web.app などの本番ドメインで直接開いてください。"
      );
      return;
    }

    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.readonly");

      // signInWithRedirect を使用
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("login:redirect-start-error", error);
      setErrorMessage("Googleログインの開始に失敗しました。");
      setLoading(false);
    }
  };

  const { hostname, isStudioShell, isAllowedHost, canUseGoogleLogin } = runtime;

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-4 text-center text-4xl font-bold text-slate-800">
          時間を使えていますか
        </h1>

        <p className="mb-10 text-center leading-8 text-slate-500">
          DAYSは、予定を振り返り、
          <br />
          時間の使い方を優しく整えるための場所です。
        </p>

        {mounted && isStudioShell && (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
            <div className="mb-2 font-semibold">プレビュー環境での制限</div>
            <div>
              Firebase Studio 内のプレビューでは Google ログインは動作しません。
              公開済みドメイン（hosted.app / web.app）または localhost で直接開いてご確認ください。
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={!mounted || loading || (mounted && isStudioShell)}
          className="w-full rounded-2xl bg-blue-500 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "処理中..." : "Googleでログイン"}
        </button>

        {mounted && !canUseGoogleLogin && isStudioShell && (
          <div className="mt-6 rounded-2xl bg-red-500 p-5 text-sm leading-7 text-white">
            <div className="mb-2 font-semibold">現在この環境ではログイン不可です</div>
            <div>
              Googleログインは、localhost / hosted.app / web.app / firebaseapp.com
              で直接アクセスした場合のみ利用できます。
            </div>
          </div>
        )}

        {infoMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
            {infoMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {mounted && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            <div><span className="font-semibold">current host:</span> {hostname}</div>
            <div><span className="font-semibold">allowed host:</span> {String(isAllowedHost)}</div>
            <div><span className="font-semibold">studio preview:</span> {String(isStudioShell)}</div>
            <div><span className="font-semibold">google login enabled:</span> {String(canUseGoogleLogin)}</div>
          </div>
        )}
      </div>
    </main>
  );
}
