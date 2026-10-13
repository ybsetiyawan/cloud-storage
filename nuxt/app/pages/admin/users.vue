<template>
  <v-container fluid class="pa-3 px-md-6 modern-clean-container">
    
    <!-- Header Command Center -->
    <v-card class="elevation-0 top-header-card rounded-xl mb-3 pa-4 bg-white">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <h4 class="text-body-2 text-grey-darken-1 mb-0">Kelola kuota penyimpanan, role, dan kredensial akun pengguna sistem.</h4>
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn size="small" color="primary" variant="flat" class="mr-2 text-none px-4 rounded-pill font-weight-semibold text-white" @click="openAddDialog">
            <v-icon start size="16">mdi-account-plus-outline</v-icon> Tambah User
          </v-btn>
          <v-btn size="small" color="grey-lighten-4" variant="flat" class="text-none px-4 rounded-pill font-weight-semibold text-grey-darken-3" @click="fetchUsers">
            <v-icon start size="16">mdi-refresh</v-icon> Muat Ulang
          </v-btn>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mt-4">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          placeholder="Cari username..."
          density="comfortable"
          variant="outlined"
          bg-color="#f8fafc"
          color="primary"
          hide-details
          class="rounded-xl search-clean"
          clearable
        />
      </div>
    </v-card>

    <!-- Main Table Card -->
    <v-card class="list-container-card elevation-0 rounded-xl bg-white clean-card-border">
      <div class="scroll-wrapper custom-scrollbar pa-2">
        
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-16">
          <v-progress-circular indeterminate color="primary" size="40" width="3" />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredUsers.length === 0" class="text-center py-16 text-grey-lighten-1">
          <v-icon size="56" class="mb-2 text-grey-lighten-2">mdi-account-off-outline</v-icon>
          <div class="text-body-1 font-weight-medium text-grey-darken-3">Tidak ada pengguna ditemukan</div>
        </div>

        <!-- User Rows -->
        <template v-else>
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="file-row-item rounded-xl mb-2 px-4 py-3 align-center d-flex justify-space-between"
          >
            <!-- Kiri: Info User -->
            <div class="d-flex align-center min-width-0 flex-grow-1 mr-4">
              <div class="file-icon-box shadow-sm flex-shrink-0 mr-4 icon-user-clean">
                <v-icon size="24">mdi-account-circle-outline</v-icon>
              </div>

              <div class="min-width-0 flex-grow-1">
                <div class="d-flex align-center flex-wrap gap-2">
                  <span class="mr-2 text-subtitle-2 text-truncate font-weight-semibold text-grey-darken-4 item-title">
                    {{ user.username }}
                  </span>
                  
                  <v-chip size="small" :color="user.role === 'admin' ? 'primary' : 'success'" variant="tonal" class="font-weight-bold px-2.5 item-badge">
                    {{ user.role }}
                  </v-chip>
                </div>

                <div class="d-flex align-center text-body-2 text-grey-darken-1 mt-1 item-meta gap-2 flex-wrap">
                  <!-- Terpakai & Total Kuota -->
                  <span class="font-weight-bold" :class="isQuotaFullOrNear(user.used_quota, user.quota) ? 'text-error' : 'text-primary'">
                    Terpakai: {{ formatSize(user.used_quota) }} / Kuota: {{ formatSize(user.quota) }}
                  </span>
                  
                  <span class="text-grey-lighten-2">•</span>

                  <!-- 🔥 Sisa Kuota (Otomatis Merah jika habis / minus) -->
                  <span class="font-weight-bold" :class="getRemainingQuota(user.used_quota, user.quota) <= 0 ? 'text-error' : 'text-success'">
                    Sisa: {{ formatSize(getRemainingQuota(user.used_quota, user.quota)) }}
                  </span>

                  <span class="text-grey-lighten-2">•</span>
                  <span class="text-grey-darken-2 font-weight-medium">Bergabung: {{ formatDateTime(user.created_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Kanan: Action Buttons -->
            <div class="row-actions d-flex align-center gap-1 flex-shrink-0">
              <v-btn icon size="small" variant="text" color="primary" class="rounded-circle" @click.stop="openEditDialog(user)">
                <v-icon size="18">mdi-pencil-outline</v-icon>
                <v-tooltip activator="parent" location="top">Edit User</v-tooltip>
              </v-btn>
              <v-btn icon size="small" variant="text" color="error" class="rounded-circle" @click.stop="openDeleteDialog(user)">
                <v-icon size="18">mdi-delete-outline</v-icon>
                <v-tooltip activator="parent" location="top">Hapus User</v-tooltip>
              </v-btn>
            </div>
          </div>
        </template>

      </div>
    </v-card>

    <!-- Dialog Tambah User Baru -->
    <v-dialog v-model="showAddDialog" max-width="450">
      <v-card class="rounded-xl pa-5 bg-white clean-card-border text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold px-0 pt-0 text-subtitle-1 mb-3">
          Tambah Pengguna Baru
        </v-card-title>
        <v-card-text class="px-0 py-1">
          <v-text-field
            v-model="addForm.username"
            label="Username"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="primary"
            class="rounded-xl mb-3 text-body-1"
            placeholder="Minimal 3 karakter"
            hide-details
          />
          <v-text-field
            v-model="addForm.password"
            label="Password"
            type="password"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="primary"
            class="rounded-xl mb-3 text-body-1"
            placeholder="Minimal 5 karakter"
            hide-details
          />
          <v-select
            v-model="addForm.role"
            :items="['admin', 'user']"
            label="Role Akses"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="primary"
            class="rounded-xl mb-4 text-body-1"
            hide-details
          />

          <!-- Template Pilihan Kuota Cepat -->
          <div class="mb-3">
            <div class="text-caption font-weight-bold text-grey-darken-2 mb-2">Template Kuota Awal:</div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="tmpl in quotaTemplates"
                :key="tmpl.value"
                size="small"
                variant="outlined"
                color="primary"
                class="mr-2 mb-2 cursor-pointer font-weight-medium px-3"
                @click="addForm.quota = tmpl.value"
              >
                {{ tmpl.text }}
              </v-chip>
            </div>
          </div>

          <v-text-field
            v-model.number="addForm.quota"
            label="Batas Kuota (Bytes)"
            type="number"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="primary"
            class="rounded-xl text-body-1"
            hint="Pilih template di atas atau ketik manual dalam Bytes"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions class="px-0 pb-0 mt-4">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="showAddDialog = false">Batal</v-btn>
          <v-btn size="small" color="primary" variant="flat" class="text-none rounded-pill px-5 font-weight-medium text-white" @click="submitAddUser">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Edit User -->
    <v-dialog v-model="showEditDialog" max-width="450">
      <v-card class="rounded-xl pa-5 bg-white clean-card-border text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold px-0 pt-0 text-subtitle-1 mb-3">
          Edit Pengguna: {{ selectedUser?.username }}
        </v-card-title>
        <v-card-text class="px-0 py-1">
          <v-select
            v-model="editForm.role"
            :items="['admin', 'user']"
            label="Role Akses"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="primary"
            class="rounded-xl mb-4 text-body-1"
            hide-details
          />

          <!-- Template Pilihan Kuota Cepat -->
          <div class="mb-3">
            <div class="text-caption font-weight-bold text-grey-darken-2 mb-2">Template Kuota Cepat:</div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="tmpl in quotaTemplates"
                :key="tmpl.value"
                size="small"
                variant="outlined"
                color="primary"
                class="mr-2 mb-2 cursor-pointer font-weight-medium px-3"
                @click="editForm.quota = tmpl.value"
              >
                {{ tmpl.text }}
              </v-chip>
            </div>
          </div>

          <v-text-field
            v-model.number="editForm.quota"
            label="Batas Kuota (Bytes)"
            type="number"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="primary"
            class="rounded-xl mb-3 text-body-1"
            hint="Pilih template di atas atau ketik manual dalam Bytes"
            persistent-hint
          />

          <v-text-field
            v-model="editForm.password"
            label="Password Baru (Opsional)"
            type="password"
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="primary"
            class="rounded-xl text-body-1"
            placeholder="Kosongkan jika tidak ingin mengubah password"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="px-0 pb-0 mt-4">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="showEditDialog = false">Batal</v-btn>
          <v-btn size="small" color="primary" variant="flat" class="text-none rounded-pill px-5 font-weight-medium text-white" @click="submitEdit">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Konfirmasi Hapus -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card class="rounded-xl pa-5 bg-white clean-card-border text-grey-darken-4 elevation-4">
        <div class="d-flex align-start gap-4 mb-3">
          <v-avatar color="error" variant="tonal" size="48" class="flex-shrink-0 mt-1">
            <v-icon size="26">mdi-alert-circle-outline</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <h3 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-1">Hapus Pengguna?</h3>
            <p class="text-body-2 text-grey-darken-1 mb-0 line-height-1-4">
              Tindakan ini permanen dan tidak dapat dibatalkan. Akun <strong class="text-grey-darken-4">{{ userToDelete?.username }}</strong> akan dihapus dari sistem.
            </p>
          </div>
        </div>
        <v-card-actions class="px-0 pb-0 mt-4 pt-2 border-top-light">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2 px-4" @click="showDeleteDialog = false">Batal</v-btn>
          <v-btn size="small" color="error" variant="flat" class="text-none rounded-pill px-5 font-weight-medium text-white" @click="executeDelete">Ya, Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar / Toast Notification -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" rounded="pill" location="top right" class="mt-16 mr-4">
      <div class="d-flex align-center gap-2">
        <v-icon size="20">
          {{ snackbarColor === 'error' ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline' }}
        </v-icon>
        <span class="font-weight-medium">{{ snackbarText }}</span>
      </div>
      <template v-slot:actions>
        <v-btn variant="text" class="text-white" @click="snackbar = false">Tutup</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ 
  layout: "admin",
  middleware: ["admin"]
});

import { ref, computed, onMounted } from "vue";
import { useNuxtApp } from "#imports";

const { $api } = useNuxtApp();

const searchQuery = ref("");
const loading = ref(true);
const users = ref<any[]>([]);

const showAddDialog = ref(false);
const addForm = ref({
  username: "",
  password: "",
  role: "user",
  quota: 1073741824,
});

const showEditDialog = ref(false);
const selectedUser = ref<any>(null);
const editForm = ref({
  role: "user",
  quota: 0,
  password: "",
});

const showDeleteDialog = ref(false);
const userToDelete = ref<any>(null);

const quotaTemplates = [
  { text: "500 MB", value: 500 * 1024 * 1024 },
  { text: "1 GB", value: 1024 * 1024 * 1024 },
  { text: "2 GB", value: 2 * 1024 * 1024 * 1024 },
  { text: "5 GB", value: 5 * 1024 * 1024 * 1024 },
  { text: "10 GB", value: 10 * 1024 * 1024 * 1024 },
];

const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

const filteredUsers = computed(() => {
  return users.value.filter((u) =>
    (u.username || "").toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// 🔥 Helper untuk menghitung sisa kuota
function getRemainingQuota(used: any, quota: any) {
  const usedNum = Number(used) || 0;
  const quotaNum = Number(quota) || 0;
  return quotaNum - usedNum; // Bisa bernilai minus jika melampaui batas (over quota)
}

// 🔥 Helper untuk mendeteksi apakah kuota sudah hampir habis (>= 90%) atau melebihi batas
function isQuotaFullOrNear(used: any, quota: any) {
  const usedNum = Number(used) || 0;
  const quotaNum = Number(quota) || 0;
  if (quotaNum <= 0) return false;
  return (usedNum / quotaNum) >= 0.9; 
}

async function fetchUsers() {
  loading.value = true;
  try {
    const res = (await $api("/auth/users")) as any[];
    users.value = res || [];
  } catch (err: any) {
    snackbarColor.value = "error";
    snackbarText.value = err?.data?.error || "Gagal memuat daftar pengguna.";
    snackbar.value = true;
  } finally {
    loading.value = false;
  }
}

function openAddDialog() {
  addForm.value = {
    username: "",
    password: "",
    role: "user",
    quota: 500 * 1024 * 1024,
  };
  showAddDialog.value = true;
}
async function submitAddUser() {
  if (!addForm.value.username || !addForm.value.password) {
    snackbarColor.value = "error";
    snackbarText.value = "Username dan password wajib diisi!";
    snackbar.value = true;
    return;
  }

  try {
    await $api("/auth/register", {
      method: "POST",
      body: {
        username: addForm.value.username,
        password: addForm.value.password,
        role: addForm.value.role,       // 🔥 Tambahkan ini
        quota: Number(addForm.value.quota), // 🔥 Tambahkan ini
      },
    });

    showAddDialog.value = false;
    fetchUsers();

    snackbarColor.value = "success";
    snackbarText.value = "Pengguna baru berhasil ditambahkan!";
    snackbar.value = true;
  } catch (err: any) {
    snackbarColor.value = "error";
    snackbarText.value = err?.data?.error || "Gagal menambahkan pengguna.";
    snackbar.value = true;
  }
}

function openEditDialog(user: any) {
  selectedUser.value = user;
  editForm.value = {
    role: user.role,
    quota: user.quota || 0,
    password: "",
  };
  showEditDialog.value = true;
}

async function submitEdit() {
  if (!selectedUser.value) return;
  try {
    const body: any = {
      role: editForm.value.role,
      quota: Number(editForm.value.quota),
    };
    if (editForm.value.password) {
      body.password = editForm.value.password;
    }

    await $api(`/auth/users/${selectedUser.value.id}`, {
      method: "PUT",
      body,
    });

    showEditDialog.value = false;
    fetchUsers();

    snackbarColor.value = "success";
    snackbarText.value = "Pengguna berhasil diperbarui!";
    snackbar.value = true;
  } catch (err: any) {
    snackbarColor.value = "error";
    snackbarText.value = err?.data?.error || "Gagal memperbarui pengguna.";
    snackbar.value = true;
  }
}

function openDeleteDialog(user: any) {
  userToDelete.value = user;
  showDeleteDialog.value = true;
}

async function executeDelete() {
  if (!userToDelete.value) return;
  try {
    await $api(`/auth/users/${userToDelete.value.id}`, { method: "DELETE" });
    showDeleteDialog.value = false;
    fetchUsers();
    snackbarColor.value = "success";
    snackbarText.value = "Pengguna berhasil dihapus.";
    snackbar.value = true;
  } catch (err: any) {
    snackbarColor.value = "error";
    snackbarText.value = err?.data?.error || "Gagal menghapus pengguna.";
    snackbar.value = true;
  }
}

function formatSize(bytes: any) {
  const num = Number(bytes);
  if (isNaN(num)) return "0 Bytes";
  const absNum = Math.abs(num);
  if (absNum === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(absNum) / Math.log(k));
  const formatted = parseFloat((absNum / Math.pow(k, i)).toFixed(2));
  return (num < 0 ? "-" : "") + formatted + " " + sizes[i];
}

function formatDateTime(d: any) {
  if (!d) return "-";
  const dateObj = new Date(d);
  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.modern-clean-container {
  background-color: #f8fafc;
  min-height: calc(100vh - 46px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

.clean-card-border {
  border: 1px solid rgba(226, 232, 240, 0.85) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02) !important;
}

.top-header-card {
  border: 1px solid rgba(226, 232, 240, 0.85) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02) !important;
}

.list-container-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.scroll-wrapper {
  flex: 1;
  overflow-y: auto;
}

.file-row-item {
  border: 1px solid rgba(226, 232, 240, 0.7);
  background: #ffffff;
  transition: all 0.15s ease-in-out;
}
.file-row-item:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-0.5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.file-icon-box {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}
.icon-user-clean { background: #e0f2fe; color: #0284c7; }

.item-title {
  font-size: 14.5px !important;
  letter-spacing: -0.1px;
  color: #1e293b;
}
.item-meta {
  font-size: 12px !important;
}
.item-badge {
  height: 20px !important;
  font-size: 10.5px !important;
}

.row-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}
.file-row-item:hover .row-actions {
  opacity: 1;
}

.line-height-1-4 {
  line-height: 1.4 !important;
}

.border-top-light {
  border-top: 1px solid rgba(226, 232, 240, 0.8) !important;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 8px; }
</style>