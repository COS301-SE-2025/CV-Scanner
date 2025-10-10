import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Props {
  children: React.ReactNode;
}

/**
 * Protect routes by calling /auth/me. Redirects to /login if not authenticated.
 * Keeps UI responsive by showing a simple loading placeholder while checking.
 *
 * Improvements:
 * - Re-checks auth when location changes (typing URL / navigation).
 * - Listens for localStorage "auth" changes (logout in other tabs) and reacts.
 * - If /auth/me returns non-ok, immediately redirect and clear local auth state.
 * - ✅ Now includes userEmail from localStorage in auth check
 */
export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function checkAuth() {
    setLoading(true);
    try {
      // ✅ Get email from localStorage
      const email = localStorage.getItem("userEmail");

      // ✅ If no email in storage, immediately redirect
      if (!email) {
        console.log("ProtectedRoute: No userEmail in localStorage");
        setOk(false);
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
        setLoading(false);
        return;
      }

      // ✅ Call /auth/me with email parameter
      const res = await apiFetch(
        `/auth/me?email=${encodeURIComponent(email)}`
      ).catch(() => null);

      if (res && res.ok) {
        const userData = await res.json().catch(() => null);
        if (userData && userData.email) {
          console.log("ProtectedRoute: Authenticated as", userData.email);
          setOk(true);
        } else {
          console.log("ProtectedRoute: Invalid user data");
          setOk(false);
          localStorage.removeItem("userEmail");
          navigate("/login", {
            replace: true,
            state: { from: location.pathname },
          });
        }
      } else {
        console.log("ProtectedRoute: Auth check failed, status:", res?.status);
        setOk(false);
        localStorage.removeItem("userEmail");
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
    } catch (err) {
      console.error("ProtectedRoute: Error during auth check:", err);
      setOk(false);
      localStorage.removeItem("userEmail");
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    // run initial check and whenever path/key changes
    (async () => {
      if (!mounted) return;
      await checkAuth();
    })();

    // storage listener: detect login/logout from other tabs (key 'user', 'userEmail' or generic 'auth-change')
    const onStorage = (e: StorageEvent) => {
      if (!mounted) return;
      // ✅ Also listen for userEmail changes
      if (
        e.key === "user" ||
        e.key === "userEmail" ||
        e.key === "auth-change"
      ) {
        console.log("ProtectedRoute: Storage change detected for key:", e.key);
        checkAuth();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
    // include location.pathname so typing a URL / navigation triggers re-check
  }, [location.pathname]);

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          color: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#1E1E1E",
        }}
      >
        Checking authentication...
      </div>
    );
  }

  return ok ? <>{children}</> : null;
}
