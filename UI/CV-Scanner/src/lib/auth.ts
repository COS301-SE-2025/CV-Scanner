export async function logout() {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
  } catch {}
  localStorage.removeItem("user");
  localStorage.removeItem("userEmail");
  try {
    localStorage.setItem("auth-change", Date.now().toString());
  } catch {}
  // client-side redirect
  window.location.href = "/login";
}
