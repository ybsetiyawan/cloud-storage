<template>
  <v-app class="app-container-dark">
    <!-- Sidebar / Navigation Drawer Modern Dark -->
    <v-navigation-drawer
      v-model="drawer"
      :permanent="$vuetify.display.mdAndUp"
      elevation="0"
      width="270"
      class="sidebar-dark border-right-dark"
    >
      <!-- Logo Brand Header dengan Animasi Denyut Jelas -->
      <div class="sidebar-header pa-6 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <div class="brand-icon-wrapper-dark mr-3 d-flex align-center justify-center elevation-4 pulse-animation">
            <v-icon color="white" size="20">mdi-shield-key-outline</v-icon>
          </div>
          <div class="brand-text-wrapper d-flex align-center">
            <span class="text-subtitle-1 font-weight-black text-white" style="letter-spacing: 1px">EDPSBY</span>
            <span class="text-subtitle-1 font-weight-black text-red-accent-3 ml-1" style="letter-spacing: 1px">DRIVE</span>
          </div>
        </div>
      </div>

      <v-divider class="mx-5 mb-3 border-opacity-25"></v-divider>

      <!-- Navigation Menu dengan Animasi Hover Geser -->
      <v-list nav class="px-4 menu-list-dark" density="comfortable">
        <v-list-item
          to="/admin/files"
          prepend-icon="mdi-folder-multiple"
          title="File Manager"
          rounded="xl"
          color="blue-accent-3"
          class="mb-2 py-3 px-4 font-weight-bold menu-item-animated"
        />

        <!-- Storage Card Widget dengan Efek Kilau Cahaya (Shimmer Animation) -->
        <div class="storage-widget-dark pa-4 mt-6 mx-1 rounded-2xl border-dark position-relative overflow-hidden shimmer-box">
          <div class="shimmer-effect"></div>
          <div class="d-flex justify-space-between align-center mb-2 position-relative" style="z-index: 2;">
            <div class="d-flex align-center">
              <v-icon size="14" color="blue-lighten-2" class="mr-1">mdi-database</v-icon>
              <span class="text-caption font-weight-bold text-grey-lighten-2">Kapasitas Disk</span>
            </div>
            <span class="text-caption font-weight-bold text-blue-lighten-3">{{ storagePercentage }}%</span>
          </div>
          <v-progress-linear
            :model-value="storagePercentage"
            :color="storageColor"
            rounded
            height="8"
            class="bg-grey-darken-4 mb-2 position-relative"
            style="z-index: 2;"
          ></v-progress-linear>
          <div class="text-caption text-grey-lighten-1 font-weight-medium position-relative" style="font-size: 11px !important; z-index: 2;">
            {{ formatBytes(userData.used_quota) }} / {{ formatBytes(userData.quota) }}
          </div>
        </div>
      </v-list>

      <!-- Footer Badge & Copyright -->
      <template v-slot:append>
        <div class="pa-5 text-center">
          <div class="text-grey-darken-2 font-weight-medium" style="font-size: 10px; letter-spacing: 0.3px;">
            Copyright © @Ybs - EDPSBY 2026
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- App Bar / Top Navbar Modern Dark dengan Efek Garis Cahaya Animasi Berjalan -->
    <v-app-bar flat border="bottom" color="#111827" height="75" class="px-6 navbar-dark position-relative overflow-hidden">
      <div class="top-bar-glow-line"></div>
      <v-app-bar-nav-icon
        v-if="!$vuetify.display.mdAndUp"
        @click="drawer = !drawer"
        class="text-grey-lighten-3"
      />
      
      <div class="d-flex align-center ml-1 fade-in">
        <div>
          <div class="d-flex align-center">
            <span class="text-subtitle-1 font-weight-medium text-grey-lighten-4">
              {{ greeting }},
            </span>
            <span class="text-subtitle-1 font-weight-black text-blue-lighten-3 ml-1">
              {{ userData.username }}
            </span>
          </div>
        </div>
      </div>

      <v-spacer />

      <!-- User Profile Menu Dropdown -->
      <v-menu location="bottom end" transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="flat" class="profile-btn-dark border-dark rounded-xl pa-1">
            <v-avatar size="36" class="rounded-lg">
              <v-img
                :src="`https://ui-avatars.com/api/?name=${userData.username}&background=1e3a8a&color=fff&bold=true`"
              />
            </v-avatar>
          </v-btn>
        </template>

        <v-card width="220" class="mt-2 rounded-2xl elevation-12 pa-1 bg-grey-darken-4" border>
          <v-list density="compact" nav class="pa-1 bg-transparent text-white">
            <v-list-item
              prepend-icon="mdi-account-circle-outline"
              title="Profil User"
              rounded="lg"
              class="py-2 mb-1"
            />
            <v-list-item
              prepend-icon="mdi-cog-outline"
              title="Pengaturan"
              rounded="lg"
              class="py-2 mb-1"
            />
            <v-divider class="my-1 mx-2 border-opacity-25"></v-divider>
            <v-list-item
              prepend-icon="mdi-power"
              title="Logout Sistem"
              color="error"
              rounded="lg"
              class="py-2 text-red-accent-3 font-weight-bold"
              @click="handleLogout"
            />
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- Main Content Area -->
    <v-main class="bg-dark-main">
      <v-container fluid class="pa-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

const drawer = ref(true);
const router = useRouter();

// Data user
const userData = ref({
  username: "Admin",
  role: "EDP Staff",
  quota: 0,
  used_quota: 0,
});

// Greeting dinamis
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 19) return "Selamat Sore";
  return "Selamat Malam";
});

// Storage Logic
const storagePercentage = computed(() => {
  if (!userData.value.quota) return 0;
  return Math.round((userData.value.used_quota / userData.value.quota) * 100);
});

const storageColor = computed(() => {
  if (storagePercentage.value > 90) return "red-accent-3";
  if (storagePercentage.value > 70) return "orange-accent-3";
  return "blue-accent-3";
});

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
  );
}

onMounted(() => {
  const savedUser = localStorage.getItem("user_data");
  if (savedUser) {
    try {
      userData.value = JSON.parse(savedUser);
    } catch (e) {
      console.error("Gagal load data user");
    }
  }
});

function handleLogout() {
  if (confirm("Logout dari aplikasi?")) {
    localStorage.clear();
    router.push("/login");
  }
}
</script>

<style scoped>
.app-container-dark {
  background-color: #0b0f19;
}

.bg-dark-main {
  background-color: #0b0f19 !important;
}

.sidebar-dark {
  background: #111827 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.border-right-dark {
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.border-dark {
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.brand-icon-wrapper-dark {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border-radius: 12px;
}

/* Animasi Denyut Jelas pada Logo Sidebar */
.pulse-animation {
  animation: pulseGlow 2s infinite ease-in-out;
}
@keyframes pulseGlow {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
  }
}

/* Animasi Hover Geser pada Menu Sidebar */
.menu-item-animated {
  transition: all 0.25s ease-in-out !important;
}
.menu-item-animated:hover {
  transform: translateX(6px);
  background: rgba(255, 255, 255, 0.04) !important;
}

/* Animasi Kilau Cahaya (Shimmer) pada Widget Storage */
.shimmer-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.shimmer-effect {
  position: absolute;
  top: 0;
  left: -150%;
  height: 100%;
  width: 150%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(59, 130, 246, 0.08),
    transparent
  );
  animation: shimmerAnim 4s infinite linear;
}
@keyframes shimmerAnim {
  0% {
    left: -150%;
  }
  100% {
    left: 150%;
  }
}

/* Navbar Dark dengan Garis Cahaya Berjalan */
.navbar-dark {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}
.top-bar-glow-line {
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #93c5fd, transparent);
  animation: shimmerLine 3s infinite linear;
}
@keyframes shimmerLine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Animasi Masuk Halaman */
.fade-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Active Menu Styling Dark Mode */
.v-list-item--active {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(29, 78, 216, 0.15) 100%) !important;
  color: #60a5fa !important;
  font-weight: 700 !important;
  border-left: 3px solid #3b82f6;
}

.profile-btn-dark {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  transition: all 0.2s ease;
}
.profile-btn-dark:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>