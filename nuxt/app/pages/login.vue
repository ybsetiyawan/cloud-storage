<template>
  <v-app>
    <div class="login-wrapper fill-height d-flex align-center justify-center">
      <!-- Background Dekoratif dengan Gradasi Biru Korporat Elegan -->
      <div class="bg-gradient-anim"></div>
      <div class="bg-shape-1 animate-pulse-slow"></div>
      <div class="bg-shape-2 animate-pulse-delayed"></div>

      <!-- Wrapper dengan Animasi Slide ke Kiri saat Login -->
      <v-container 
        style="max-width: 1050px; position: relative; z-index: 2;" 
        class="px-4 transition-container"
        :class="{ 'slide-out-left': isLoggingIn }"
      >
        <v-card class="login-card elevation-24 rounded-3xl overflow-hidden border-light bg-white animate-card-entrance">
          <v-row no-gutters>
            
            <!-- SISI KIRI: Branding & Informasi Korporat -->
            <v-col cols="12" md="6" class="left-hero-panel pa-10 pa-md-14 d-flex flex-column justify-space-between text-white position-relative overflow-hidden">
              <div class="hero-bg-overlay"></div>

              <div class="z-index-2 animate-element-1">
                <div class="company-tag mb-3 d-inline-flex align-center px-3 py-1 rounded-lg">
                  <v-icon size="14" color="blue-lighten-3" class="mr-2">mdi-office-building-marker-outline</v-icon>
                  <span class="text-caption font-weight-bold text-white tracking-wide">PT Indomarco Adi Prima &bull; Surabaya</span>
                </div>
                <div class="d-flex align-center">
                  <!-- Logo Otentik Korporat (Server / Network Storage) -->
                  <div class="brand-icon-box mr-3 d-flex align-center justify-center elevation-6 pulse-icon">
                    <v-icon color="white" size="24">mdi-server-network</v-icon>
                  </div>
                  <span class="text-caption font-weight-bold tracking-widest text-blue-lighten-3 uppercase">EDPSBY DRIVE</span>
                </div>
              </div>

              <div class="z-index-2 my-8 animate-element-2">
                <h1 class="text-h3 font-weight-black tracking-tight mb-4 leading-tight">
                  Local Storage <br />
                  <span class="text-gradient-shimmer">Management.</span>
                </h1>
                <p class="text-body-1 text-grey-lighten-2 font-weight-light mb-6">
                  Portal Penyimpanan internal terpusat untuk pengelolaan, unggah, dan berbagi berkas operasional dengan aman.
                </p>
                <div class="d-flex align-center gap-2 text-caption text-blue-lighten-3 font-weight-medium">
                  <v-icon size="18" class="mr-1 icon-bounce">mdi-shield-check-outline</v-icon>
                  <span>Sistem Enkripsi & Akses Terbatas</span>
                </div>
              </div>

              <div class="z-index-2 text-caption text-grey-lighten-1 animate-element-3" style="font-size: 11px !important;">
                © 2026 EDP Surabaya &bull;
              </div>
            </v-col>

            <!-- SISI KANAN: Form Login Interaktif Ber-animasi -->
            <v-col cols="12" md="6" class="pa-8 pa-md-14 d-flex align-center bg-white animate-element-right">
              <div class="w-100">
                
                <div class="mb-8 form-title-anim">
                  <h2 class="text-h4 font-weight-bold text-grey-darken-4 mb-2">Selamat Datang</h2>
                  <p class="text-body-2 text-grey-darken-1">Masukkan kredensial akun Anda untuk melanjutkan.</p>
                </div>

                <v-expand-transition>
                  <v-alert v-if="infoMessage" type="info" variant="tonal" class="mb-6 rounded-xl text-caption font-weight-medium animate-pop-in" border="start">
                    {{ infoMessage }}
                  </v-alert>
                </v-expand-transition>

                <v-form @submit.prevent="handleLogin">
                  <div class="mb-5 input-group-anim-1">
                    <label class="input-label mb-2 d-block">USERNAME</label>
                    <v-text-field
                      v-model="email"
                      variant="outlined"
                      density="comfortable"
                      color="blue-darken-2"
                      bg-color="#f8fafc"
                      class="custom-field"
                      placeholder="Masukkan username Anda"
                      prepend-inner-icon="mdi-account-outline"
                      hide-details
                      rounded="xl"
                      autofocus
                    ></v-text-field>
                  </div>

                  <div class="mb-8 input-group-anim-2">
                    <label class="input-label mb-2 d-block">PASSWORD</label>
                    <v-text-field
                      v-model="password"
                      :type="showPassword ? 'text' : 'password'"
                      variant="outlined"
                      density="comfortable"
                      color="blue-darken-2"
                      bg-color="#f8fafc"
                      class="custom-field"
                      placeholder="••••••••"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="showPassword = !showPassword"
                      hide-details
                      rounded="xl"
                    ></v-text-field>
                  </div>

                  <v-expand-transition>
                    <v-alert v-if="error" type="error" variant="tonal" class="mb-6 rounded-xl text-caption font-weight-medium animate-shake">
                      {{ error }}
                    </v-alert>
                  </v-expand-transition>

                  <div class="btn-group-anim">
                    <v-btn
                      block
                      size="large"
                      color="blue-darken-2"
                      elevation="6"
                      class="rounded-xl text-none font-weight-semibold py-6 btn-login-animated text-white position-relative overflow-hidden"
                      :loading="loading"
                      @click="handleLogin"
                    >
                      <span class="btn-text">Masuk ke Sistem</span>
                      <v-icon end class="ml-2 btn-arrow-anim">mdi-arrow-right</v-icon>
                      <div class="shimmer-beam"></div>
                    </v-btn>
                  </div>
                </v-form>

              </div>
            </v-col>

          </v-row>
        </v-card>
      </v-container>
    </div>
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
const isLoggingIn = ref(false);

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
        error.value = "Username dan password wajib diisi";
        return;
    }
    try {
        loading.value = true;
        error.value = "";
        const data = await adminLogin(email.value, password.value);
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("user_data", JSON.stringify(data.user));
        
        isLoggingIn.value = true;
        setTimeout(() => {
            router.push("/admin/files");
        }, 500);
    } catch (err: any) {
        error.value = err.message;
        loading.value = false;
    }
}
</script>

<style scoped>
.login-wrapper {
  background: #f1f5f9;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
}

.transition-container {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out;
}
.slide-out-left {
  transform: translateX(-100vw);
  opacity: 0;
}

.bg-gradient-anim {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(125deg, #eff6ff, #e2e8f0, #f8fafc, #dbeafe);
  background-size: 400% 400%;
  animation: gradientFlow 15s ease infinite;
  z-index: 0;
}

@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.bg-shape-1 {
  position: absolute;
  top: -10%; left: -10%;
  width: 500px; height: 500px;
  background: rgba(37, 99, 235, 0.15);
  border-radius: 50%;
  filter: blur(90px);
}
.bg-shape-2 {
  position: absolute;
  bottom: -10%; right: -10%;
  width: 500px; height: 500px;
  background: rgba(14, 165, 233, 0.15);
  border-radius: 50%;
  filter: blur(90px);
}

.login-card {
  box-shadow: 0 30px 60px -15px rgba(15, 23, 42, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

/* SISI KIRI: Panel Hero dengan Nuansa Blue/Navy Korporat Konsisten */
.left-hero-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%);
  position: relative;
}
.hero-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.5;
}

.company-tag {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(6px);
  width: fit-content;
}

.brand-icon-box {
  width: 48px; height: 48px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.text-gradient-shimmer {
  background: linear-gradient(90deg, #93c5fd, #ffffff, #60a5fa);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmerText 5s linear infinite;
}

@keyframes shimmerText {
  to { background-position: 200% center; }
}

.input-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
}

.custom-field :deep(.v-field__outline) {
  border-color: rgba(0, 0, 0, 0.08) !important;
  transition: all 0.3s ease;
}
.custom-field:hover :deep(.v-field__outline),
.custom-field:focus-within :deep(.v-field__outline) {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.btn-login-animated {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
.btn-login-animated:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 30px rgba(37, 99, 235, 0.4) !important;
}
.btn-login-animated:hover .btn-arrow-anim {
  transform: translateX(6px);
  transition: transform 0.25s ease-in-out;
}

.shimmer-beam {
  position: absolute;
  top: 0; left: -150%;
  width: 150%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmerButton 3s infinite linear;
}
@keyframes shimmerButton {
  0% { left: -150%; }
  100% { left: 150%; }
}

.z-index-2 {
  position: relative;
  z-index: 2;
}

@keyframes cardEntrance {
  0% { opacity: 0; transform: scale(0.92) translateY(30px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes slideFromLeft {
  0% { opacity: 0; transform: translateX(-30px); }
  100% { opacity: 1; transform: translateX(0); }
}

@keyframes slideFromRight {
  0% { opacity: 0; transform: translateX(30px); }
  100% { opacity: 1; transform: translateX(0); }
}

@keyframes slideFromBottom {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes popIn {
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes pulseSlow {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.12); opacity: 1; }
}

@keyframes bounceIcon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}

.animate-card-entrance { animation: cardEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-element-1 { animation: slideFromLeft 0.7s ease-out 0.2s both; }
.animate-element-2 { animation: slideFromLeft 0.8s ease-out 0.35s both; }
.animate-element-3 { animation: slideFromLeft 0.9s ease-out 0.5s both; }

.animate-element-right { animation: slideFromRight 0.8s ease-out 0.2s both; }
.form-title-anim { animation: slideFromBottom 0.6s ease-out 0.3s both; }
.input-group-anim-1 { animation: slideFromBottom 0.6s ease-out 0.45s both; }
.input-group-anim-2 { animation: slideFromBottom 0.6s ease-out 0.6s both; }
.btn-group-anim { animation: slideFromBottom 0.6s ease-out 0.75s both; }

.animate-pulse-slow { animation: pulseSlow 7s infinite ease-in-out; }
.animate-pulse-delayed { animation: pulseSlow 9s infinite ease-in-out 2s; }
.icon-bounce { animation: bounceIcon 2.5s infinite ease-in-out; }
.animate-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-shake { animation: shake 0.4s ease-in-out; }
</style>