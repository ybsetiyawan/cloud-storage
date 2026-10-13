export function useAuth() {
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_token");
  };

  const isAuthenticated = () => {
    return !!getToken();
  };

  // Tambahkan helper untuk mengambil data user
  const getUser = () => {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("user_data");
    return userStr ? JSON.parse(userStr) : null;
  };

  // Tambahkan helper untuk cek apakah role-nya admin
  const isAdmin = () => {
    const user = getUser();
    return user?.role === "admin";
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("user_data");
      window.location.href = "/login";
    }
  };

  return {
    getToken,
    isAuthenticated,
    getUser,
    isAdmin,
    logout,
  };
}