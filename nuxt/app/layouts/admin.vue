<template>
  <v-app class="app-container-tech" :class="{ 'slide-out-right': isLoggingOut }">
    <!-- Sidebar / Navigation Drawer Tech Style -->
    <v-navigation-drawer
      v-model="drawer"
      :permanent="$vuetify.display.mdAndUp"
      elevation="0"
      width="250"
      class="sidebar-tech"
    >
      <!-- Header Brand Tech Panel -->
      <div class="sidebar-header px-4 py-4 d-flex align-center border-bottom-tech">
        <div class="brand-badge-tech mr-3 d-flex align-center justify-center">
          <v-icon color="white" size="16">mdi-server-network</v-icon>
        </div>
        <div>
          <div class="text-caption font-weight-bold text-grey-darken-3 text-uppercase" style="letter-spacing: 1px;">EDPSBY-SYS</div>
          <div class="text-subtitle-2 font-weight-black text-blue-darken-3" style="letter-spacing: 0.5px;">SECURE DRIVE</div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <v-list nav class="px-2 pt-3 menu-list-tech" density="compact">
        <v-list-item
          to="/admin/files"
          prepend-icon="mdi-folder-outline"
          title="File Repository"
          color="primary"
          class="mb-1 py-2 px-3 font-weight-medium menu-item-tech"
        />

        <!-- Storage Panel Widget -->
        <div class="storage-panel-tech pa-3 mt-6 mx-1">
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="text-caption font-weight-bold text-grey-darken-2" style="font-size: 10px !important;">QUOTA USAGE</span>
            <span class="text-caption font-weight-bold text-primary" style="font-size: 11px;">{{ storagePercentage }}%</span>
          </div>
          <v-progress-linear
            :model-value="storagePercentage"
            :color="storageColor"
            rounded="0"
            height="4"
            class="bg-grey-lighten-3 mb-1.5"
          ></v-progress-linear>
          <div class="text-caption text-grey font-weight-medium" style="font-size: 10px !important;">
            {{ formatBytes(userData.used_quota) }} / {{ formatBytes(userData.quota) }}
          </div>
        </div>
      </v-list>

      <!-- Footer Info -->
      <template v-slot:append>
        <div class="pa-3 text-center border-top-tech">
          <div class="text-grey font-weight-medium" style="font-size: 9.5px; letter-spacing: 0.2px;">
            EDP Department • @Ybs 2026
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- App Bar / Top Navbar Minimalis & Fungsional -->
    <v-app-bar flat border="bottom" color="white" height="54" class="px-4 navbar-tech">
      <v-app-bar-nav-icon
        v-if="!$vuetify.display.mdAndUp"
        @click="drawer = !drawer"
        class="text-grey-darken-3"
        density="compact"
      />
      
      <!-- Server Status / User Info Bar -->
      <div class="d-flex align-center gap-2 fade-in">
        <div class="status-indicator"></div>
        <span class="text-caption font-weight-bold text-grey-darken-3 text-uppercase" style="letter-spacing: 0.5px;">
          Node: <span class="text-primary">{{ userData.username }}</span>
        </span>
        <span class="text-grey-lighten-1">|</span>
        <span class="text-caption text-grey-darken-1 hidden-sm-and-down">{{ greeting }}</span>
      </div>

      <v-spacer />

      <!-- User Action Profile Dropdown -->
      <v-menu location="bottom end" transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="flat" class="profile-btn-tech px-2 py-1 text-none" height="34">
            <v-avatar size="24" class="rounded-0 mr-2">
              <v-img
                :src="`https://ui-avatars.com/api/?name=${userData.username}&background=1e293b&color=fff&bold=true`"
              />
            </v-avatar>
            <span class="text-caption font-weight-bold text-grey-darken-3 mr-1">{{ userData.username }}</span>
            <v-icon size="14" color="grey">mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-card width="160" class="mt-1 rounded-0 elevation-3 pa-1 bg-white border-tech">
          <v-list density="compact" nav class="pa-1 bg-transparent text-grey-darken-4">
            <v-list-item
              prepend-icon="mdi-power"
              title="Terminate Session"
              color="error"
              rounded="0"
              class="py-1 text-error font-weight-medium text-caption"
              @click="executeLogout"
            />
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- Main Content Area -->
    <v-main class="bg-tech-main" style="height: 100vh; max-height: 100vh; overflow: hidden;">
      <v-container fluid class="pa-3 pa-md-4">
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
const isLoggingOut = ref(false);

const userData = ref({
  username: "Admin",
  role: "EDP Staff",
  quota: 0,
  used_quota: 0,
});

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
  const savedUser = localStorage.getItem("user_data");
  if (savedUser) {
    try {
      userData.value = JSON.parse(savedUser);
    } catch (e) {
      console.error("Gagal load data user");
    }
  }
});

function executeLogout() {
  localStorage.clear();
  isLoggingOut.value = true;
  setTimeout(() => {
    router.push("/login");
  }, 400);
}
</script>

<style scoped>
.app-container-tech {
  background-color: #f8fafc;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-in-out;
}

.slide-out-right {
  transform: translateX(100vw);
  opacity: 0;
}

.bg-tech-main {
  background-color: #f8fafc !important;
}

.sidebar-tech {
  background: #ffffff !important;
  border-right: 1px solid #e2e8f0 !important;
}

.border-bottom-tech {
  border-bottom: 1px solid #e2e8f0 !important;
}

.border-top-tech {
  border-top: 1px solid #e2e8f0 !important;
}

.border-tech {
  border: 1px solid #e2e8f0 !important;
}

.brand-badge-tech {
  width: 28px;
  height: 28px;
  background: #1e293b;
  border-radius: 4px;
}

.menu-item-tech {
  border-radius: 4px !important;
  transition: all 0.15s ease-in-out !important;
}
.menu-item-tech:hover {
  background: #f1f5f9 !important;
}

.storage-panel-tech {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.navbar-tech {
  border-bottom: 1px solid #e2e8f0 !important;
}

.status-indicator {
  width: 7px;
  height: 7px;
  background-color: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.v-list-item--active {
  background: #eff6ff !important;
  color: #2563eb !important;
  font-weight: 600 !important;
  border-left: 2px solid #2563eb;
  border-radius: 0 4px 4px 0 !important;
}

.profile-btn-tech {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  transition: all 0.15s ease;
}
.profile-btn-tech:hover {
  background: #f1f5f9;
}
</style>