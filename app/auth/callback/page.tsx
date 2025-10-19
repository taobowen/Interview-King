// app/auth/callback/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, getGoogleRedirectResult } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Finalize the redirect sign-in and then route
    getGoogleRedirectResult()
      .catch(() => {}) // ignore non-fatal cases (e.g., refresh)
      .finally(() => {
        // Once auth state is available, route accordingly
        const unsub = onAuthStateChanged(auth, (user) => {
          unsub();
          router.replace(user ? "/dashboard" : "/login?err=auth");
        });
      });
  }, [router]);

  return <p style={{ padding: 16 }}>Signing you in…</p>;
}
