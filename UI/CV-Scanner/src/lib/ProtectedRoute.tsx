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
 */
export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function checkAuth() {
    setLoading(true);
    try {
      const res = await apiFetch("/auth/me").catch(() => null);
      if (res && res.ok) {
        setOk(true);
      } else {
        setOk(false);
        // redirect to login, preserve attempted path optionally
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
    } catch {
      setOk(false);
      navigate("/login", { replace: true, state: { from: location.pathname } });
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

    // storage listener: detect login/logout from other tabs (key 'user' or generic 'auth-change')
    const onStorage = (e: StorageEvent) => {
      if (!mounted) return;
      // if user info removed or a dedicated auth-change flag updated, re-check
      if (e.key === "user" || e.key === "auth-change") {
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
      <div style={{ padding: 20, color: "#fff" }}>
        Checking authentication...
      </div>
    );
  }

  return ok ? <>{children}</> : null;
}
