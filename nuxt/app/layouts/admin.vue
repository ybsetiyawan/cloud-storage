<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      :permanent="$vuetify.display.mdAndUp"
      elevation="0"
      border="right"
      width="260"
      class="bg-grey-lighten-5"
    >
      <div class="pa-6 d-flex align-center">
        <v-avatar
          color="blue-darken-4"
          size="32"
          class="mr-3 rounded-lg elevation-3"
        >
          <v-icon color="white" size="18">mdi-server-security</v-icon>
        </v-avatar>
        <div
          class="text-subtitle-2 font-weight-black text-blue-darken-4"
          style="letter-spacing: 1px"
        >
          EDPSBY-DRIVE
        </div>
      </div>

      <v-divider class="mx-4 mb-4" opacity="0.1"></v-divider>

      <v-list nav class="px-4" density="comfortable">
        <v-list-item
          to="/admin/files"
          prepend-icon="mdi-folder-zip-outline"
          title="File Manager"
          rounded="lg"
          active-color="primary"
          class="mb-2 shadow-sm"
        />

        <!-- <v-list-item
          to="/admin/files"
          prepend-icon="mdi-folder-account"
          title="Kelola User"
          rounded="lg"
          active-color="error"
          class="mb-2 shadow-sm"
        /> -->

        <div class="pa-4 mt-4 bg-white rounded-xl border mx-1 shadow-sm">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-caption font-weight-black text-grey-darken-2"
              >Penyimpanan</span
            >
            <span class="text-caption font-weight-bold text-blue-darken-3"
              >{{ storagePercentage }}%</span
            >
          </div>
          <v-progress-linear
            :model-value="storagePercentage"
            :color="storageColor"
            rounded
            height="8"
          ></v-progress-linear>
          <div
            class="text-left text-caption mt-2 text-grey-darken-1"
            style="font-size: 10px !important"
          >
            <v-icon size="10" class="mr-1">mdi-database-outline</v-icon>
            {{ formatBytes(userData.used_quota) }} /
            {{ formatBytes(userData.quota) }}
          </div>
        </div>
      </v-list>

      <template v-slot:append>
        <div class="pa-4 pt-0">
          <div
            class="dev-badge d-flex align-center justify-center py-2 px-3 rounded-pill border"
          >
            <v-icon size="12" class="mr-2 text-blue-darken-2">mdi-xml</v-icon>
            <span class="dev-text">@Ybs - EDPSBY</span>
          </div>
        </div>
      </template>
    </v-navigation-drawer>
    <v-app-bar flat border="bottom" color="white" height="70" class="px-4">
      <v-app-bar-nav-icon
        v-if="!$vuetify.display.mdAndUp"
        @click="drawer = !drawer"
      />
      <div class="d-flex align-center ml-2 fade-in">
        <div>
          <div class="d-flex align-center">
            <span
              class="text-subtitle-1 font-weight-black text-slate-900 tracking-tighter"
            >
              {{ greeting }}, {{ userData.username }}
            </span>
            <v-chip
              size="x-small"
              color="grey-darken-2"
              variant="flat"
              class="ml-3 font-weight-black px-2 rounded-md"
            >
              {{ userData.role || "EDP STAFF" }}
            </v-chip>
          </div>
        </div>
      </div>

      <v-spacer />

      <v-menu location="bottom end" transition="slide-y-transition">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon variant="flat" class="border">
            <v-avatar size="32">
              <v-img
                :src="`https://ui-avatars.com/api/?name=${userData.username}&background=0D47A1&color=fff`"
              />
            </v-avatar>
          </v-btn>
        </template>

        <v-card width="220" class="mt-2 rounded-xl elevation-10" border>
          <v-list density="compact" nav class="pa-2">
            <v-list-item
              prepend-icon="mdi-account-circle-outline"
              title="Profil User"
              rounded="lg"
            />
            <v-list-item
              prepend-icon="mdi-cog-outline"
              title="Pengaturan"
              rounded="lg"
            />
            <v-divider class="my-2 mx-2"></v-divider>
            <v-list-item
              prepend-icon="mdi-power"
              title="Logout Sistem"
              color="red-darken-1"
              rounded="lg"
              class="text-red-darken-1 font-weight-black"
              @click="handleLogout"
            />
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <v-main class="bg-slate-soft">
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
  if (storagePercentage.value > 90) return "red-darken-1";
  if (storagePercentage.value > 70) return "orange-darken-1";
  return "blue-darken-2";
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
.bg-slate-soft {
  background-color: #f8fafc;
}

.text-slate-900 {
  color: #0f172a;
}

/* Navbar Welcome Styling */
.border-blue {
  border: 2px solid #e0f2fe !important;
}

.tracking-tighter {
  letter-spacing: -1px !important;
}

/* Developer Signature */
.dev-badge {
  background: #ffffff;
  border: 1px solid #e2e8f0 !important;
}

.dev-text {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Animations */
.fade-in {
  animation: fadeIn 0.6s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Active Menu */
.v-list-item--active {
  background-color: #eff6ff !important;
  color: #1e40af !important;
  font-weight: 800;
  border-right: 4px solid #1e40af;
}
</style>
