export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.client) {
    const { isAuthenticated, isAdmin } = useAuth();

    if (!isAuthenticated() || !isAdmin()) {
      // Lempar ke /admin/files sambil membawa parameter error
      return navigateTo("/admin/files?error=unauthorized");
    }
  }
});