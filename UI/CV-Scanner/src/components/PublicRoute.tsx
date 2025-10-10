import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { apiFetch } from "../lib/api";

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const email = localStorage.getItem("userEmail");

        console.log("PublicRoute: Checking auth for email:", email);

        if (!email) {
          console.log("PublicRoute: No email, allowing access to public route");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Verify with backend
        const response = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );

        if (response && response.ok) {
          const userData = await response.json();
          if (userData && userData.email) {
            console.log(
              "PublicRoute: User already authenticated, redirecting to dashboard"
            );
            setIsAuthenticated(true);
          } else {
            console.log("PublicRoute: Invalid user data, clearing session");
            setIsAuthenticated(false);
            localStorage.removeItem("userEmail");
          }
        } else {
          console.log("PublicRoute: Not authenticated");
          setIsAuthenticated(false);
          localStorage.removeItem("userEmail");
        }
      } catch (error) {
        console.error("PublicRoute: Error checking auth:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#1E1E1E",
          color: "#fff",
        }}
      >
        <CircularProgress sx={{ color: "#93AFF7" }} />
      </Box>
    );
  }

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    console.log("PublicRoute: User authenticated, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
