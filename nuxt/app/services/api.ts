// export const API_BASE_URL = "http://localhost:8090/api"; // sesuaikan port backendmu

export function getApiBase() {
  const config = useRuntimeConfig()
  return config.public.apiBase || "/api"
}


export async function adminLogin(username: string, password: string) {
  const config = useRuntimeConfig()

  const res = await fetch(`${config.public.apiBase}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    try {
      const errData = await res.json();
      // Menangkap error baik dari key 'error', 'message', maupun fallback ke teks default
      const errorMessage = errData.error || errData.message || "Otorisasi gagal.";
      throw new Error(errorMessage);
    } catch (e: any) {
      // Fallback jika respons body bukan format JSON yang valid
      throw new Error(e.message || "Otorisasi gagal.");
    }
  }

  return res.json();
}
