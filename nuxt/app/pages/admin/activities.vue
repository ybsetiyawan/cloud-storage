<template>
  <v-container fluid class="pa-3 px-md-6 modern-clean-container">
    
    <!-- Header Command Center -->
    <v-card class="elevation-0 top-header-card rounded-xl mb-3 pa-4 bg-white">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <h4 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0">Riwayat Aktivitas Sistem</h4>
          <span class="text-body-2 text-grey-darken-1">Pantau rekam jejak, alamat IP, dan aktivitas seluruh pengguna secara real-time.</span>
        </div>
        <div class="d-flex align-center gap-2">
          <!-- Tombol Sorting Tanggal -->
          <v-btn size="small" variant="outlined" color="primary" class="text-none rounded-pill px-4 font-weight-semibold" @click="toggleSort">
            <v-icon start size="16">mdi-sort</v-icon> Urutan: {{ sortOrder === 'desc' ? 'Terbaru' : 'Terlama' }}
          </v-btn>
          <v-btn size="small" color="grey-lighten-4" variant="flat" class="text-none px-4 rounded-pill font-weight-semibold text-grey-darken-3" @click="fetchActivities" :loading="loading">
            <v-icon start size="16">mdi-refresh</v-icon> Muat Ulang
          </v-btn>
        </div>
      </div>

      <!-- Filter Section: Search & Date Range -->
      <div class="mt-4 d-flex align-center flex-wrap gap-3">
        <div class="flex-grow-1" style="min-width: 250px;">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Cari berdasarkan username, aksi, nama berkas, atau IP..."
            density="comfortable"
            variant="outlined"
            bg-color="#f8fafc"
            color="primary"
            hide-details
            class="rounded-xl search-clean"
            clearable
            @update:model-value="onSearchInput"
          />
        </div>

        <!-- Filter Tanggal Mulai -->
        <div style="width: 170px;">
          <v-text-field
            v-model="startDate"
            type="date"
            label="Dari Tanggal"
            density="comfortable"
            variant="outlined"
            bg-color="#f8fafc"
            color="primary"
            hide-details
            class="rounded-xl"
            @change="fetchActivities"
          />
        </div>

        <!-- Filter Tanggal Akhir -->
        <div style="width: 170px;">
          <v-text-field
            v-model="endDate"
            type="date"
            label="Sampai Tanggal"
            density="comfortable"
            variant="outlined"
            bg-color="#f8fafc"
            color="primary"
            hide-details
            class="rounded-xl"
            @change="fetchActivities"
          />
        </div>

        <!-- Tombol Reset Filter Tanggal -->
        <v-btn v-if="startDate || endDate" size="small" variant="text" color="error" class="text-none font-weight-medium" @click="resetDateFilter">
          Reset Tanggal
        </v-btn>
      </div>
    </v-card>

    <!-- Main Table Card -->
    <v-card class="list-container-card elevation-0 rounded-xl bg-white clean-card-border d-flex flex-column">
      <div class="scroll-wrapper custom-scrollbar pa-2 flex-grow-1">
        
        <v-data-table-server
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="activities"
          :items-length="totalItems"
          :loading="loading"
          item-value="id"
          density="comfortable"
          class="elevation-0 bg-transparent modern-server-table"
          @update:options="loadServerItems"
          no-data-text="Belum ada aktivitas tercatat pada rentang waktu ini"
        >
          <!-- Kolom Pengguna dengan Avatar Titik Indikator -->
          <template v-slot:[`item.username`]="{ item }">
            <div class="d-flex align-center gap-2">
              <div class="mr-1 user-avatar-dot" :class="getUserDotColor(item.username)"></div>
              <span class="font-weight-bold text-grey-darken-4">
                {{ item.username || 'Sistem' }}
              </span>
            </div>
          </template>

          <!-- Kolom Aksi dengan Chip -->
          <template v-slot:[`item.action`]="{ item }">
            <v-chip size="x-small" :color="getActionColor(item.action)" variant="tonal" class="font-weight-bold px-2.5">
              {{ item.action }}
            </v-chip>
          </template>

          <!-- Kolom Nama Berkas -->
          <template v-slot:[`item.file_name`]="{ item }">
            <span class="font-weight-semibold text-primary text-truncate d-inline-block" style="max-width: 350px;" :title="item.file_name">
              {{ item.file_name || '-' }}
            </span>
          </template>

          <!-- Kolom Alamat IP Jaringan -->
          <template v-slot:[`item.ip_address`]="{ item }">
            <span class="ip-network-badge px-2 py-0.5 rounded font-weight-bold text-deep-purple-darken-2 d-inline-flex align-center">
              <v-icon size="12" class="me-1 text-deep-purple">mdi-ip-network</v-icon>
              {{ item.ip_address || '127.0.0.1' }}
            </span>
          </template>

          <!-- Kolom Waktu -->
          <template v-slot:[`item.created_at`]="{ item }">
            <span class="text-grey-darken-2 font-weight-medium">
              {{ formatDateTime(item.created_at) }}
            </span>
          </template>
        </v-data-table-server>

      </div>
    </v-card>

    <!-- Snackbar -->
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

import { ref } from "vue";
import { useNuxtApp } from "#imports";

const { $api } = useNuxtApp();

const searchQuery = ref("");
const startDate = ref("");
const endDate = ref("");
const loading = ref(false);
const activities = ref<any[]>([]);
const totalItems = ref(0);
const itemsPerPage = ref(10); // 🔥 Diset 20 data per halaman secara default
const currentPage = ref(1);
const sortOrder = ref("desc");

const headers = [
  { title: 'Pengguna', key: 'username', width: '180px', sortable: false },
  { title: 'Aktivitas', key: 'action', width: '160px', sortable: false },
  { title: 'Nama Berkas', key: 'file_name', sortable: false },
  { title: 'Alamat IP', key: 'ip_address', width: '160px', sortable: false },
  { title: 'Waktu', key: 'created_at', width: '180px', align: 'end' as const, sortable: false },
];

const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

let searchTimeout: any = null;

function onSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchActivities();
  }, 400);
}

function toggleSort() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
  fetchActivities();
}

function resetDateFilter() {
  startDate.value = "";
  endDate.value = "";
  fetchActivities();
}

async function fetchActivities() {
  loading.value = true;
  try {
    const res: any = await $api("/activities", {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        search: searchQuery.value,
        sort: sortOrder.value,
        startDate: startDate.value,
        endDate: endDate.value,
      }
    });

    activities.value = res.data || [];
    totalItems.value = res.totalItems || 0;
  } catch (err: any) {
    snackbarColor.value = "error";
    snackbarText.value = err?.data?.error || "Gagal memuat riwayat aktivitas.";
    snackbar.value = true;
  } finally {
    loading.value = false;
  }
}

function loadServerItems(options: any) {
  currentPage.value = options.page;
  itemsPerPage.value = options.itemsPerPage;
  fetchActivities();
}

function getActionColor(action: string) {
  if (action?.includes('UPLOAD')) return 'green';
  if (action?.includes('DELETE')) return 'error';
  if (action?.includes('OVERWRITE')) return 'warning';
  if (action?.includes('DOWNLOAD_FOLDER')) return 'red';
  if (action?.includes('DOWNLOAD_FILE')) return 'purple';
  return 'primary';
}

function getUserDotColor(username: string) {
  if (!username) return 'bg-grey';
  const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-deep-purple', 'bg-info'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDateTime(d: any) {
  if (!d) return "-";
  const dateObj = new Date(d);
  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<style scoped>
.modern-clean-container {
  background-color: #f8fafc;
  height: calc(100vh - 46px);
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

/* Styling Tabel Server Vuetify dengan Sticky Header */
.modern-server-table :deep(th) {
  position: sticky !important;
  top: 0 !important;
  z-index: 10;
  background-color: #f8fafc !important;
  border-bottom: 2px solid rgba(226, 232, 240, 0.9) !important;
  font-weight: 700 !important;
  color: #334155 !important;
}

.modern-server-table :deep(td) {
  border-bottom: 1px solid rgba(226, 232, 240, 0.7) !important;
  height: 48px !important;
}

.modern-server-table :deep(tr:hover) {
  background-color: #f8fafc !important;
}

.user-avatar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ip-network-badge {
  background: #f5f3ff !important;
  border: 1px solid rgba(221, 214, 254, 0.8);
  font-size: 11px !important;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 8px; }
</style>