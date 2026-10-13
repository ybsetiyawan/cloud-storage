<template>
  <v-app class="app-container-vibrant" :class="{ 'slide-out-right': isLoggingOut }">
    <!-- Sidebar / Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" :permanent="$vuetify.display.mdAndUp" elevation="0" width="260"
      class="sidebar-vibrant border-right">
      <!-- Header Brand -->
      <div class="sidebar-header px-5 py-5 d-flex align-center">
        <div class="brand-icon-box mr-3 shadow-sm">
          <v-icon color="white" size="20">mdi-harddisk</v-icon>
        </div>
        <div>
          <span class="text-subtitle-1 font-weight-bold text-blue-darken-4 tracking-wide">EDPSBY</span>
          <span class="text-subtitle-1 font-weight-bold text-blue-lighten-1 tracking-wide">DRIVE</span>
        </div>
      </div>

      <v-divider class="border-opacity-25 mx-4"></v-divider>

      <!-- Navigation Menu -->
      <v-list nav class="px-3 pt-4 menu-list" density="comfortable">
        <v-list-item to="/admin/files" prepend-icon="mdi-folder-multiple-outline" title="File Manager" color="white"
          class="mb-2 py-3 px-4 font-weight-semibold menu-item rounded-xl" />

        <!-- Menu Manajemen User (Hanya muncul jika role admin) -->
        <v-list-item 
          v-if="isAdmin" 
          to="/admin/users" 
          prepend-icon="mdi-account-group-outline" 
          title="Manajemen User" 
          color="white"
          class="mb-2 py-3 px-4 font-weight-semibold menu-item rounded-xl" 
        />

        <!-- Storage Info Card (Colorful & Modern) -->
        <div class="storage-card-vibrant pa-4 mt-6 mx-1 rounded-2xl elevation-0">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-subtitle-2 font-weight-bold text-grey-darken-4 d-flex align-center gap-1.5">
              <v-icon class="mr-2" size="20" color="primary">mdi-cloud-outline</v-icon> Penyimpanan
            </span>
            <span class="text-caption font-weight-bold text-primary bg-white px-2 py-0.5 rounded-pill shadow-xs"
              style="font-size: 13px !important;">
              {{ storagePercentage }} %
            </span>
          </div>
          <v-progress-linear :model-value="storagePercentage" :color="storageColor" rounded="pill" height="8"
            class="bg-blue-grey-lighten-5 mb-2.5"></v-progress-linear>
          <div style="font-size: 11px" class="mt-2 text-body-2 text-grey-darken-4 font-weight-medium">
            {{ formatBytes(userData.used_quota) }} <span class="text-grey">dari {{ formatBytes(userData.quota) }}</span>
          </div>
        </div>
      </v-list>

      <!-- Copyright Ybs -->
      <template v-slot:append>
        <div class="pa-4 text-center border-top bg-grey-lighten-5">
          <div class="text-grey-darken-1 font-weight-medium text-caption"
            style="font-size: 11px ; letter-spacing: 0.3px;">
            Copyright © @Ybs - EDPSBY 2026
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- App Bar / Top Navbar -->
    <v-app-bar flat border="bottom" color="white" height="64" class="px-5 navbar-vibrant">
      <v-app-bar-nav-icon v-if="!$vuetify.display.mdAndUp" @click="drawer = !drawer" class="text-grey-darken-3"
        density="compact" />

      <!-- Sapaan Waktu & Nama User -->
      <div class="d-flex align-center text-body-1 text-grey-darken-3 font-weight-medium fade-in">
        <span>{{ greeting }}, <strong class="text-primary font-weight-bold">{{ userData.username }}</strong> 👋</span>
      </div>

      <v-spacer />

      <!-- User Logout Dropdown -->
      <v-menu location="bottom end" transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="flat"
            class="user-profile-btn text-none px-3 py-2 rounded-pill bg-blue-lighten-5 text-primary" height="44">
            <v-avatar size="25" class="rounded-circle mr-2 bg-primary text-white font-weight-bold shadow-xs">
              <span>{{ userData.username ? userData.username.charAt(0) : 'A' }}</span>
            </v-avatar>
            <span style="font-size: 12px" class="text-body-2 font-weight-bold text-grey-darken-4 mr-1">{{
              userData.username }}</span>
            <v-icon size="18" color="grey-darken-2">mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-card width="180" class="mt-2 rounded-xl elevation-4 pa-1 bg-white border">
          <v-list density="compact" nav class="pa-0 bg-transparent">
            <v-list-item prepend-icon="mdi-logout" title="Keluar" color="error" rounded="lg"
              class="py-2 text-error font-weight-semibold text-body-2" @click="executeLogout" />
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- Main Content Area -->
    <v-main class="bg-main" style="height: 100vh; max-height: 100vh; overflow: hidden;">
      <v-container fluid class="pa-4 pa-md-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const drawer = ref(true);
const router = useRouter();
const isLoggingOut = ref(false);

const userData = ref({
  username: "Admin",
  role: "EDP Staff",
  quota: 0,
  used_quota: 0,
});

const loadUserData = () => {
  const savedUser = localStorage.getItem("user_data");
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      userData.value = parsed;
      isAdmin.value = parsed.role === 'admin';
    } catch (e) {
      console.error("Gagal load data user");
    }
  }
};

const isAdmin = ref(false);

// Sapaan waktu dinamis (Selamat Pagi / Siang / Sore / Malam)
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 19) return "Selamat Sore";
  return "Selamat Malam";
});

const storagePercentage = computed(() => {
  if (!userData.value.quota) return 0;
  return Math.round((userData.value.used_quota / userData.value.quota) * 100);
});

const storageColor = computed(() => {
  if (storagePercentage.value > 90) return "error";
  if (storagePercentage.value > 70) return "warning";
  return "primary";
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
  loadUserData();
  window.addEventListener("storage-updated", loadUserData);
  const savedUser = localStorage.getItem("user_data");
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      userData.value = parsed;
      isAdmin.value = parsed.role === 'admin';
    } catch (e) {
      console.error("Gagal load data user");
    }
  }
});

onUnmounted(() => {
  window.removeEventListener("storage-updated", loadUserData);
});



function executeLogout() {
  localStorage.clear();
  isLoggingOut.value = true;
  setTimeout(() => {
    router.push("/login");
  }, 350);
}
</script>

<style scoped>
.app-container-vibrant {
  background-color: #f8fafc;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-out-right {
  transform: translateX(100vw);
  opacity: 0;
}

.bg-main {
  background-color: #f4f6f9 !important;
}

.sidebar-vibrant {
  background: linear-gradient(180deg, #ffffff 0%, #fdfdff 100%) !important;
  border-right: 1px solid #e2e8f0 !important;
}

.brand-icon-box {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.border-top {
  border-top: 1px solid #e2e8f0 !important;
}

.border {
  border: 1px solid #e2e8f0 !important;
}

.menu-item {
  border-radius: 12px !important;
  transition: all 0.2s ease;
  font-size: 14px !important;
}

.menu-item:hover {
  background: rgba(37, 99, 235, 0.08) !important;
  color: #2563eb !important;
}

.storage-card-vibrant {
  background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
  border: 1px solid rgba(37, 99, 235, 0.15);
}

.navbar-vibrant {
  border-bottom: 1px solid #e2e8f0 !important;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(10px);
}

.user-profile-btn {
  border: 1px solid rgba(37, 99, 235, 0.2);
  transition: all 0.2s ease;
}

.user-profile-btn:hover {
  background: rgba(37, 99, 235, 0.12) !important;
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.v-list-item--active {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  color: white !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  border-radius: 12px !important;
}
</style>