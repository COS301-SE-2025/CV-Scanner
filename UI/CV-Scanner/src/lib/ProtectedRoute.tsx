import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Props {
  children: React.ReactNode;
}

/**
 * Protect routes by calling /auth/me. Redirects to /login if not authenticated.
 * Keeps UI responsive by showing a simple loading placeholder while checking.
 */
export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch("/auth/me").catch(() => null);
        if (!mounted) return;
        if (res && res.ok) {
          setOk(true);
        } else {
          // any non-OK (401/400) -> redirect to login
          navigate("/login", { replace: true });
        }
      } catch {
        navigate("/login", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        Checking authentication...
      </div>
    );
  }

  return ok ? children : null;
}
