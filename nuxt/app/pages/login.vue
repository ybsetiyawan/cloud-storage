<template>
  <v-app>
    <v-container fluid class="pa-0 fill-height bg-slate-50">
      <v-row no-gutters class="fill-height">
        
        <v-col cols="12" md="6" lg="7" class="d-none d-md-flex position-relative overflow-hidden bg-slate-900">
          <div class="hero-image"></div>
          <div class="hero-overlay"></div>

          <div class="z-index-2 pa-16 d-flex flex-column h-100 w-100">
            <div class="d-flex align-center animate-fade-in">
              <v-avatar color="blue-darken-4" size="48" class="mr-4 elevation-10 border-light">
                <v-icon color="blue-lighten-3" size="28">mdi-server-security</v-icon>
              </v-avatar>
              <div>
                <h2 class="text-h4 font-weight-black text-white tracking-tighter line-height-1">
                  EDPSBY<span class="text-blue-lighten-3">DRIVE</span>
                </h2>
                <div class="text-caption text-blue-lighten-4 font-weight-bold tracking-widest text-uppercase">
                  Internal Storage System
                </div>
              </div>
            </div>

            <v-spacer></v-spacer>

            <div class="max-w-500 animate-slide-up">
              <h1 class="text-h2 font-weight-black text-white mb-6 leading-tight tracking-tighter">
                Local Storage <br/>
                <span class="text-blue-lighten-3">Management.</span>
              </h1>
              <div class="divider-glow mb-6"></div>
              <p class="text-h6 text-blue-lighten-5 opacity-80 font-weight-light mb-10">
                <strong>PT Indomarco Adi Prima</strong> — Surabaya.
              </p>
              
              <div class="d-flex align-center">
                <v-icon color="blue-lighten-3" class="mr-2">mdi-check-decagram</v-icon>
                <span class="text-subtitle-2 text-white opacity-70">Verified Enterprise Access Control</span>
              </div>
            </div>

            <v-spacer></v-spacer>

            <div class="d-flex align-center text-caption text-blue-lighten-5 opacity-50">
              <v-icon size="14" class="mr-2">mdi-code-braces</v-icon>
              <span>© 2026 EDP Surabaya &bull; Architecture by <strong>@Ybs</strong></span>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="6" lg="5" class="d-flex align-center justify-center pa-8 pa-md-16 bg-white">
          <div class="w-100" style="max-width: 420px;">
            
            <div class="mb-12">
              <v-avatar color="slate-900" size="48" class="d-md-none mb-6">
                <v-icon color="white">mdi-server-security</v-icon>
              </v-avatar>
              
              <h2 class="text-h3 font-weight-black text-slate-900 mb-2 tracking-tighter">Sign In</h2>
              <p class="text-body-1 text-slate-500 font-weight-medium">Silakan masuk ke portal manajemen file.</p>
            </div>

            <v-expand-transition>
              <v-alert v-if="infoMessage" type="info" variant="tonal" class="mb-8 rounded-xl text-caption font-weight-bold" border="start">
                {{ infoMessage }}
              </v-alert>
            </v-expand-transition>

            <v-form @submit.prevent="handleLogin" class="mt-4">
              <div class="input-wrapper mb-6">
                <label class="input-label">USERNAME</label>
                <v-text-field
                  v-model="email"
                  variant="underlined"
                  color="primary"
                  class="custom-underlined"
                  prepend-inner-icon="mdi-account-outline"
                  placeholder="Masukkan username"
                  hide-details
                  autofocus
                ></v-text-field>
              </div>

              <div class="input-wrapper mb-10">
                <div class="d-flex justify-space-between">
                  <label class="input-label">PASSWORD</label>
                  <!-- <a href="#" class="text-caption font-weight-bold text-primary text-decoration-none">Lupa password?</a> -->
                </div>
                <v-text-field
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  variant="underlined"
                  color="primary"
                  class="custom-underlined"
                  prepend-inner-icon="mdi-lock-outline"
                  placeholder="••••••••"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showPassword = !showPassword"
                  hide-details
                ></v-text-field>
              </div>

              <v-expand-transition>
                <v-alert v-if="error" type="error" variant="tonal" class="mb-8 rounded-lg text-caption font-weight-bold">
                  {{ error }}
                </v-alert>
              </v-expand-transition>

              <v-btn
                block
                size="x-large"
                color="slate-900"
                elevation="12"
                class="rounded-xl font-weight-black text-none py-8 btn-login-custom"
                :loading="loading"
                @click="handleLogin"
              >
                Log In to Dashboard
                <v-icon end class="ml-2">mdi-arrow-right</v-icon>
              </v-btn>
            </v-form>

          </div>
        </v-col>

      </v-row>
    </v-container>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "#imports";
import { useAuth } from "~/composables/useAuth";
import { adminLogin } from "~/services/api";

const router = useRouter();
const route = useRoute();
const { isAuthenticated } = useAuth();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const showPassword = ref(false);
const infoMessage = ref("");

onMounted(() => {
    if (route.query.msg === 'session_expired') {
        infoMessage.value = "Sesi Anda telah berakhir. Silakan login kembali.";
        router.replace({ query: {} }); 
    }
    else if (isAuthenticated()) {
        router.push("/admin/files");
    }
});

async function handleLogin() {
    if (!email.value || !password.value) {
        error.value = "Email dan password wajib diisi";
        return;
    }
    try {
        loading.value = true;
        error.value = "";
        const data = await adminLogin(email.value, password.value);
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("user_data", JSON.stringify(data.user));
        router.push("/admin/files");
    } catch (err: any) {
        error.value = err.message || "Otorisasi gagal.";
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
/* Main Colors */
.bg-slate-50 { background-color: #f8fafc !important; }
.bg-slate-900 { background-color: #0f172a !important; }
.text-slate-900 { color: #0f172a; }
.text-slate-500 { color: #64748b; }
.text-slate-400 { color: #94a3b8; }

/* SISI KIRI: Background & Visuals */
.hero-image {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url('https://images.unsplash.com/photo-1558494949-ef010cbdcc51?q=80&w=2000');
  background-size: cover;
  background-position: center;
  filter: grayscale(100%) brightness(0.2);
  transition: transform 20s linear;
}

.hero-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.7) 100%);
}

.divider-glow {
  width: 60px;
  height: 4px;
  background: #64b5f6;
  border-radius: 2px;
  box-shadow: 0 0 15px rgba(100, 181, 246, 0.5);
}

.border-light { border: 1px solid rgba(255,255,255,0.1) !important; }
.z-index-2 { z-index: 2; position: relative; }
.max-w-500 { max-width: 500px; }
.line-height-1 { line-height: 1 !important; }
.tracking-widest { letter-spacing: 0.2em !important; }

/* SISI KANAN: Form Styling */
.input-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: #475569;
  letter-spacing: 0.05em;
}

.custom-underlined :deep(.v-field__input) {
  font-weight: 500;
  padding-left: 0 !important;
}

.custom-underlined :deep(.v-field__label) {
  font-weight: 600;
}

.btn-login-custom {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
  color: white !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-login-custom:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(15, 23, 42, 0.25) !important;
}

/* Utils */
.tracking-tighter { letter-spacing: -0.05em !important; }

/* Animations */
.animate-fade-in {
  animation: fadeIn 1s ease-out;
}
.animate-slide-up {
  animation: slideUp 0.8s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>