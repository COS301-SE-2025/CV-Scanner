import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface RoleBasedAccessProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

export default function RoleBasedAccess({ 
  children, 
  allowedRoles, 
  fallbackPath = "/dashboard" 
}: RoleBasedAccessProps) {
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);
  const [forbidden, setForbidden] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const navigate = useNavigate();

  // Auth check (runs once)
  useEffect(() => {
    (async () => {
      const email = localStorage.getItem("userEmail");
      try {
        const url = email
          ? `/auth/me?email=${encodeURIComponent(email)}`
          : `/auth/me`;
        const res = await apiFetch(url);
        if (!res || !res.ok) {
          setUser(null);
          setForbidden(true);
          setAuthChecked(true);
          return;
        }
        const data = await res.json().catch(() => null);
        setUser(data);
        
        // Check if user role is allowed
        const userRole = data?.role?.toLowerCase();
        const isAllowed = allowedRoles.some(allowedRole => 
          userRole === allowedRole.toLowerCase()
        );
        
        setForbidden(!isAllowed);
      } catch {
        setUser(null);
        setForbidden(true);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [allowedRoles]);

  // If still checking auth, show loader
  if (!authChecked) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Typography>Checking permissions…</Typography>
      </Box>
    );
  }

  // Forbidden UI - User doesn't have required role
  if (forbidden) {
    return (
      <Box sx={{ p: 6 }}>
        <Box
          role="alert"
          sx={{
            maxWidth: 800,
            mx: "auto",
            bgcolor: "#fff6f6",
            border: "1px solid #f5c2c2",
            color: "#7a1f1f",
            borderRadius: 2,
            p: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
            Access Denied
          </Typography>
          <Typography sx={{ mb: 2 }}>
            You do not have permission to access this page. This page requires one of the following roles:{" "}
            <strong>{allowedRoles.join(", ")}</strong>.
            {user?.role && (
              <> Your current role is: <strong>{user.role}</strong>.</>
            )}
          </Typography>
          <Typography sx={{ mb: 3, fontSize: "0.9rem", color: "#8b4513" }}>
            If you believe this is an error, please contact your administrator.
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => navigate(fallbackPath)}
              sx={{ bgcolor: "#1976d2" }}
            >
              Back to Dashboard
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                const email = localStorage.getItem("userEmail");
                try {
                  const res = await apiFetch(
                    `/auth/me?email=${encodeURIComponent(email || "")}`
                  );
                  if (res.ok) {
                    const data = await res.json().catch(() => null);
                    setUser(data ?? null);
                    const userRole = data?.role?.toLowerCase();
                    const isAllowed = allowedRoles.some(allowedRole => 
                      userRole === allowedRole.toLowerCase()
                    );
                    setForbidden(!isAllowed);
                  }
                } catch {
                  // keep forbidden true
                }
              }}
            >
              Retry
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // User has required role, render children
  return <>{children}</>;
}