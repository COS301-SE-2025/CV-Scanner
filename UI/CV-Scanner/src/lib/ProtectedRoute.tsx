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
        // any non-OK -> redirect to login
        if (res && res.ok) {
          setOk(true);
        } else {
          console.debug("ProtectedRoute: /auth/me not ok", res?.status);
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.debug("ProtectedRoute error", err);
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
