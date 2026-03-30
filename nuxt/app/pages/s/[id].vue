<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <v-container class="py-10">
        
        <div v-if="pending" class="d-flex flex-column align-center justify-center py-16">
          <v-progress-circular indeterminate color="primary" size="64" width="6" />
          <p class="mt-4 text-body-2 text-medium-emphasis font-weight-medium">
            Menyiapkan berkas Anda...
          </p>
        </div>

        <v-card
          v-else-if="error || !data"
          max-width="450"
          class="mx-auto text-center pa-8 border-thin"
          elevation="0"
          rounded="xl"
        >
          <v-avatar color="error-lighten-5" size="80" class="mb-4">
            <v-icon size="40" color="error">mdi-alert-circle-outline</v-icon>
          </v-avatar>
          <h2 class="text-h6 font-weight-bold">Akses Tidak Tersedia</h2>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Link mungkin sudah kedaluwarsa atau Anda tidak memiliki izin untuk melihat folder ini.
          </p>
          <v-btn color="primary" variant="flat" class="mt-6 px-8" rounded="lg" to="/">
            Kembali ke Beranda
          </v-btn>
        </v-card>

        <v-card v-else max-width="1000" class="mx-auto border-thin" elevation="2" rounded="xl">
          
          <div class="header-section pa-4 pa-sm-6">
            <div class="d-flex align-center flex-wrap gap-4">
              <v-avatar color="primary" rounded="lg" size="48" class="mr-4">
                <v-icon color="white" size="28">mdi-cloud-outline</v-icon>
              </v-avatar>
              
              <div class="flex-grow-1">
                <h1 class="text-h6 font-weight-black mb-0">Shared Content</h1>
                <nav class="breadcrumb-nav d-flex align-center flex-wrap mt-1">
                  <span class="path-item" @click="goRoot">Root</span>
                  
                  <template v-for="(p, i) in pathStack" :key="p.id">
                    <v-icon size="14" class="mx-1 text-disabled">mdi-chevron-right</v-icon>
                    <span
                      class="path-item"
                      :class="{ 'is-active': i === pathStack.length - 1 }"
                      @click="goToPath(i)"
                    >
                      {{ p.name }}
                    </span>
                  </template>
                </nav>
              </div>

              <v-btn
                color="primary"
                elevation="4"
                size="large"
                rounded="lg"
                prepend-icon="mdi-download"
                :loading="isDownloading"
                class="text-none font-weight-bold mt-sm-0 mt-4 btn-download-anim"
                @click="handleMainDownload"
              >
                Download Semua
              </v-btn>
            </div>

            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Cari file atau folder..."
              variant="outlined"
              density="comfortable"
              hide-details
              rounded="lg"
              class="mt-6 search-input"
              color="primary"
              clearable
            ></v-text-field>
          </div>

          <v-divider />

          <div class="file-area">
            <template v-if="data.type === 'folder'">
              
              <div v-if="filteredItems.length === 0" class="d-flex flex-column align-center py-16 opacity-60">
                <v-icon size="64" color="grey-lighten-1">
                  {{ searchQuery ? 'mdi-file-search-outline' : 'mdi-folder-open-outline' }}
                </v-icon>
                <div class="mt-4 text-body-1 font-weight-medium">
                  {{ searchQuery ? 'File tidak ditemukan' : 'Folder ini kosong' }}
                </div>
              </div>

              <v-list class="pa-0">
                <v-list-item
                  v-for="item in filteredItems"
                  :key="item.id"
                  class="file-row border-b px-6 py-3"
                  @click="handleItemClick(item)"
                >
                  <template v-slot:prepend>
                    <div 
                      class="icon-wrapper mr-4"
                      :class="item.type === 'folder' ? 'folder-bg' : getIconConfig(item).class"
                    >
                      <v-icon size="22">
                        {{ item.type === 'folder' ? 'mdi-folder' : getIconConfig(item).icon }}
                      </v-icon>
                    </div>
                  </template>

                  <v-list-item-title class="text-subtitle-2 font-weight-bold mb-1">
                    {{ item.name }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle class="text-caption d-flex align-center">
                    <v-chip
                      v-if="item.type === 'folder'"
                      size="x-small"
                      color="orange-darken-2"
                      variant="tonal"
                      class="font-weight-bold"
                    >
                      FOLDER
                    </v-chip>
                    <span v-else class="text-grey-darken-1 font-weight-medium">
                      {{ formatSize(item.size) }}
                    </span>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-tooltip text="Download" location="top">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-download-outline"
                          size="small"
                          variant="text"
                          color="grey-darken-1"
                          class="hover-primary btn-icon-anim"
                          @click.stop="downloadItem(item)"
                        />
                      </template>
                    </v-tooltip>
                  </template>
                </v-list-item>
              </v-list>
            </template>
          </div>

          <v-footer class="bg-grey-lighten-4 border-t px-6 py-4 d-flex justify-space-between align-center">
           <span class="footer-text">
  © 2026 <b class="brand">EDPSBYDRIVE</b>
  <span class="separator">—</span>
  <span class="cloud">Internal Cloud</span>
</span>
            <v-chip size="x-small" variant="outlined" color="primary" class="font-weight-bold">
             Arch by @Ybs
            </v-chip>
          </v-footer>

        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, auth: false });

const route = useRoute();
const shareId = route.params.id;

const currentFolderId = ref<string | null>(null);
const pathStack = ref<{ id: string | null; name: string }[]>([]);
const items = ref<any[]>([]);
const searchQuery = ref("");
const isDownloading = ref(false);

const { data, pending, error } = await useFetch<any>(
  `http://localhost:8090/api/public/share-info/${shareId}`
);

// Computed property untuk memfilter item berdasarkan search query
const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  return items.value.filter(item => 
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

async function fetchFolder(folderId: string | null = null) {
  try {
    if (!folderId) {
      items.value = data.value?.children || [];
      return;
    }
    const res = await $fetch<any[]>(`http://localhost:8090/api/public/folder-content/${folderId}`);
    items.value = res;
  } catch (err) {
    items.value = [];
  }
}

function handleItemClick(item: any) {
  if (item.type === "folder") {
    currentFolderId.value = item.id;
    pathStack.value.push({ id: item.id, name: item.name });
    searchQuery.value = ""; // Clear search when navigating
    fetchFolder(item.id);
  }
}

function goToPath(index: number) {
  const target = pathStack.value[index];
  if (!target) return;
  pathStack.value = pathStack.value.slice(0, index + 1);
  currentFolderId.value = target.id;
  fetchFolder(target.id);
}

function goRoot() {
  currentFolderId.value = null;
  pathStack.value = [];
  fetchFolder(null);
}

function downloadItem(item: any) {
  const baseUrl = "http://localhost:8090";
  const path = item.type === "folder" ? "download-folder" : "download-file";
  const prefix = item.type === "folder" ? "sf" : "s";
  
  if (item.share_id) {
    window.open(`${baseUrl}/${prefix}/${item.share_id}`, "_blank");
  } else {
    window.open(`${baseUrl}/api/public/${path}/${item.id}`, "_blank");
  }
}

function handleMainDownload() {
  if (!data.value) return;
  isDownloading.value = true;
  
  // Simulasi delay animasi loading sebentar sebelum download
  setTimeout(() => {
    const endpoint = data.value.type === "folder" ? "sf" : "s";
    window.location.href = `http://localhost:8090/${endpoint}/${shareId}`;
    isDownloading.value = false;
  }, 800);
}

onMounted(() => fetchFolder(null));

function formatSize(bytes: any) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getIconConfig(item: any) {
  const ext = item.name?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return { icon: "mdi-file-pdf-box", class: "pdf-bg" };
    case "xls":
    case "xlsx": return { icon: "mdi-file-excel", class: "excel-bg" };
    case "png":
    case "jpg":
    case "jpeg": return { icon: "mdi-image", class: "image-bg" };
    case "zip":
    case "rar": return { icon: "mdi-zip-box", class: "archive-bg" };
    default: return { icon: "mdi-file-document-outline", class: "default-bg" };
  }
}
</script>

<style scoped>
.header-section {
  background: linear-gradient(to bottom, #ffffff, #fcfcfc);
}

.search-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
}

.breadcrumb-nav {
  font-size: 0.85rem;
  color: #757575;
}

.path-item {
  cursor: pointer;
  transition: color 0.2s;
}

.path-item:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.path-item.is-active {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  pointer-events: none;
}

.file-area {
  min-height: 300px;
  max-height: 550px;
  overflow-y: auto;
}

.file-row {
  transition: all 0.2s ease;
  cursor: pointer;
}

.file-row:hover {
  background-color: #f8fafc !important;
  transform: translateX(4px);
}

/* --- ANIMASI BUTTON --- */

/* Animasi Tombol Download Utama */
.btn-download-anim {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease !important;
}

.btn-download-anim:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 20px rgba(var(--v-theme-primary), 0.2) !important;
}

.btn-download-anim:active {
  transform: translateY(0) scale(0.98);
}

/* Animasi Icon Download di List */
.btn-icon-anim {
  transition: all 0.2s ease !important;
}

.btn-icon-anim:hover {
  transform: scale(1.2) rotate(-5deg);
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}

/* Icon Styling */
.icon-wrapper {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.file-row:hover .icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.folder-bg { background: #fff7ed; color: #f97316; }
.pdf-bg { background: #fef2f2; color: #ef4444; }
.excel-bg { background: #f0fdf4; color: #22c55e; }
.image-bg { background: #f5f3ff; color: #8b5cf6; }
.archive-bg { background: #fffbeb; color: #f59e0b; }
.default-bg { background: #f8fafc; color: #64748b; }

.hover-primary:hover {
  color: rgb(var(--v-theme-primary)) !important;
}

.file-area::-webkit-scrollbar {
  width: 6px;
}
.file-area::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.footer-text {
  font-size: 0.75rem;
  color: #6b7280;
}

/* BRAND */
.brand {
  background: linear-gradient(90deg, #6366f1, #22c55e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: 0.3px;
}

/* DASH */
.separator {
  margin: 0 4px;
  color: #cbd5f5;
}

/* CLOUD TEXT */
.cloud {
  color: #0ea5e9;
  font-weight: 600;
}

/* OPTIONAL HOVER EFFECT */
.footer-text:hover .brand {
  filter: brightness(1.2);
}
</style>