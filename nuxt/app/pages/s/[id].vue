<template>
  <v-app class="shared-page-bg">
    <v-main class="d-flex align-center justify-center">
      <!-- Container dibatasi max-width agar tidak overflow di layar besar -->
      <v-container class="py-6 px-4 px-md-6" style="max-width: 1000px; width: 100%;">
        
        <!-- Loading State -->
        <div v-if="pending" class="d-flex flex-column align-center justify-center py-16">
          <v-progress-circular indeterminate color="blue-darken-2" size="64" width="5" />
          <p class="mt-4 text-body-2 text-grey-darken-2 font-weight-medium">
            Menyiapkan berkas Anda...
          </p>
        </div>

        <!-- Error State -->
        <v-card
          v-else-if="error || !data"
          max-width="440"
          class="mx-auto text-center pa-8 border-light rounded-xl elevation-4 bg-white"
        >
          <v-avatar color="red-lighten-5" size="80" class="mb-4">
            <v-icon size="40" color="error">mdi-alert-circle-outline</v-icon>
          </v-avatar>
          <h2 class="text-h6 font-weight-bold text-grey-darken-4">Akses Tidak Tersedia</h2>
          <p class="text-body-2 text-grey-darken-1 mt-2">
            Link mungkin sudah kedaluwarsa atau Anda tidak memiliki izin untuk melihat folder ini.
          </p>
          <v-btn color="blue-darken-2" variant="flat" class="mt-6 px-8 rounded-pill text-none font-weight-medium" to="/">
            Kembali ke Beranda
          </v-btn>
        </v-card>

        <!-- Main Content Card dengan Efek Garis Mengitari Sudut Card -->
        <div v-else class="magic-border-card mx-auto rounded-2xl">
          <v-card class="border-0 elevation-6 rounded-2xl bg-white overflow-hidden position-relative inner-card">
            
            <!-- Header Section -->
            <div class="header-section pa-5 pa-md-7 bg-white border-bottom-light">
              <div class="d-flex align-center justify-space-between flex-wrap gap-4">
                <div class="d-flex align-center min-width-0 flex-grow-1">
                  <div class="brand-icon-wrapper mr-4 d-flex align-center justify-center elevation-3 flex-shrink-0">
                    <v-icon color="white" size="26">mdi-cloud-arrow-down-outline</v-icon>
                  </div>
                  <div class="min-width-0 flex-grow-1">
                    <h1 class="text-h6 text-md-h5 font-weight-bold text-grey-darken-4 mb-0 folder-title text-truncate">
                      {{ data?.name || 'Shared Content' }}
                    </h1>
                    
                    <!-- Breadcrumbs -->
                    <div class="breadcrumb-container mt-2">
                      <div class="crumb-pill root" @click="goRoot">
                        <v-icon size="14" class="mr-1 text-blue-darken-2">mdi-home-variant</v-icon>
                        <span>Root</span>
                      </div>
                      <template v-for="(p, i) in pathStack" :key="p.id || i">
                        <v-icon size="14" class="mx-1 text-grey-lighten-1">mdi-chevron-right</v-icon>
                        <div
                          class="crumb-pill"
                          :class="{ active: i === pathStack.length - 1 }"
                          @click="goToPath(i)"
                        >
                          {{ p.name }}
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Download Button -->
                <v-btn
                  color="blue-darken-2"
                  elevation="2"
                  size="large"
                  rounded="pill"
                  prepend-icon="mdi-download-outline"
                  :loading="isDownloading"
                  :disabled="selectedItems.length > 0"
                  class="text-none font-weight-semibold px-6 btn-download-anim text-white"
                  @click="handleMainDownload"
                >
                  Download Semua
                </v-btn>
              </div>

              <!-- Search Bar -->
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                placeholder="Cari file atau folder di direktori ini..."
                variant="outlined"
                density="comfortable"
                hide-details
                rounded="pill"
                class="mt-5 search-input-modern"
                bg-color="#f8fafc"
                color="blue-darken-2"
                clearable
              ></v-text-field>
            </div>

            <!-- Bulk Action Bar -->
            <v-slide-y-transition>
              <div v-if="selectedItems.length > 0" class="bulk-bar-modern d-flex align-center px-6 py-3 bg-blue-lighten-5 border-bottom-light">
                <v-checkbox
                  v-model="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @click="toggleSelectAll"
                  density="compact"
                  hide-details
                  color="blue-darken-2"
                  class="mr-2 text-grey-darken-4"
                  label="Pilih Semua"
                />
                <div class="text-subtitle-2 font-weight-bold text-blue-darken-3 ml-2">
                  {{ selectedItems.length }} item dipilih
                </div>
                <v-spacer />
                <v-btn 
                  size="small" 
                  color="blue-darken-2" 
                  variant="flat" 
                  class="text-none rounded-pill px-5 font-weight-medium text-white"
                  @click="downloadSelectedItems(selectedItems)"
                >
                  <v-icon start size="16">mdi-download-multiple</v-icon> Download Terpilih ({{ selectedItems.length }})
                </v-btn>
                <v-btn size="small" variant="text" class="text-none text-grey-darken-2 ml-2" @click="clearSelection">Batal</v-btn>
              </div>
            </v-slide-y-transition>

            <!-- File List Area -->
            <div class="file-area custom-scrollbar pa-4 pa-md-6">
              <template v-if="data.type === 'folder'">
                
                <div v-if="filteredItems.length === 0" class="d-flex flex-column align-center justify-center py-12 text-grey-darken-1">
                  <v-icon size="64" class="mb-3 text-grey-lighten-2">
                    {{ searchQuery ? 'mdi-file-search-outline' : 'mdi-folder-open-outline' }}
                  </v-icon>
                  <div class="text-subtitle-1 font-weight-medium text-grey-darken-3">
                    {{ searchQuery ? 'File tidak ditemukan' : 'Folder ini kosong' }}
                  </div>
                  <div class="text-caption text-grey mt-1">Tidak ada item di dalam direktori ini.</div>
                </div>

                <div
                  v-for="(item, idx) in filteredItems"
                  :key="item.id || idx"
                  class="file-row-modern rounded-xl mb-2.5 px-4 py-3 align-center d-flex justify-space-between"
                  :class="{ selected: isSelected(item) }"
                  @click="handleItemClick(item)"
                >
                  <div class="file-main d-flex align-center mr-4 min-width-0 flex-grow-1">
                    <v-checkbox
                      v-model="selectedMap[item.id]"
                      @click.stop
                      density="compact"
                      hide-details
                      color="blue-darken-2"
                      class="mr-3"
                    />

                    <div class="file-icon shadow-sm mr-4" :class="item.type === 'folder' ? 'folder-icon-light' : getIconConfig(item).class">
                      <template v-if="isImageFile(item) && thumbnailMap[item.id]">
                        <v-img :src="thumbnailMap[item.id]" cover width="44" height="44" class="rounded-lg" />
                      </template>
                      <template v-else-if="isImageFile(item)">
                        <v-progress-circular indeterminate size="16" width="2" color="grey" />
                      </template>
                      <template v-else>
                        <v-icon size="24">
                          {{ item.type === 'folder' ? 'mdi-folder' : getIconConfig(item).icon }}
                        </v-icon>
                      </template>
                    </div>

                    <div class="file-text min-width-0 flex-grow-1">
                      <div class="file-name-full text-truncate font-weight-semibold text-grey-darken-3">
                        {{ item.name }}
                      </div>
                      <div class="file-meta d-flex align-center mt-0.5">
                        <v-chip v-if="item.type !== 'folder'" density="compact" size="x-small" variant="tonal" class="mr-2 font-weight-bold px-2 text-blue-darken-3 bg-blue-lighten-5">
                          {{ formatSize(item.size) }}
                        </v-chip>
                        <span v-else class="mr-2 text-amber-darken-3 font-weight-bold text-caption">Folder</span>
                      </div>
                    </div>
                  </div>

                  <div class="file-actions d-flex align-center">
                    <v-tooltip text="Download" location="top">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-download-outline"
                          size="small"
                          variant="text"
                          color="blue-darken-3"
                          class="rounded-circle btn-icon-anim"
                          @click.stop="downloadItem(item)"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </div>

              </template>
            </div>

            <!-- Footer -->
            <v-footer class="bg-grey-lighten-4 border-top px-6 py-3 d-flex justify-space-between align-center flex-wrap gap-2">
              <span class="footer-text">
                <b class="brand">EDPSBYDRIVE</b>
                <span class="separator">—</span>
                <span class="cloud">Internal Cloud Storage</span>
              </span>
              <div class="text-grey-darken-1 font-weight-medium" style="font-size: 11px; letter-spacing: 0.3px;">
                Copyright © @Ybs - EDPSBY 2026
              </div>
            </v-footer>

          </v-card>
        </div>
      </v-container>
    </v-main>

    <!-- Dialog Preview Gambar -->
    <v-dialog v-model="showPreviewDialog" max-width="850" transition="dialog-bottom-transition">
      <v-card class="rounded-2xl overflow-hidden shadow-lg border-light bg-white">
        <v-card-title class="d-flex justify-space-between align-center px-6 py-4 bg-grey-lighten-4 text-grey-darken-4">
          <span class="text-subtitle-1 text-truncate font-weight-medium">{{ previewItem?.name }}</span>
          <div class="d-flex align-center gap-1">
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="rotateImage">
              <v-icon>mdi-rotate-right</v-icon>
            </v-btn>
            <v-divider vertical class="mx-1 border-opacity-25" />
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="zoomOut">
              <v-icon>mdi-magnify-minus-outline</v-icon>
            </v-btn>
            <span class="text-caption px-1 text-grey-darken-2 font-weight-mono" style="min-width: 48px; text-align: center;">{{ Math.round(zoomScale * 100) }}%</span>
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="zoomIn">
              <v-icon>mdi-magnify-plus-outline</v-icon>
            </v-btn>
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="resetZoom" class="ml-1">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
            <v-divider vertical class="mx-2 border-opacity-25" />
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="showPreviewDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text 
          class="text-center pa-0 bg-grey-lighten-5 d-flex align-center justify-center overflow-hidden position-relative" 
          style="height: 520px;"
          @wheel.prevent="handleWheelZoom"
        >
          <div class="zoom-container w-100 h-100 d-flex align-center justify-center overflow-auto pa-4">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :style="{ 
                transform: `scale(${zoomScale}) rotate(${rotationAngle}deg)`, 
                transition: isDragging ? 'none' : 'transform 0.2s ease-out' 
              }"
              class="preview-zoomed-image rounded-xl shadow-sm"
              alt="Preview"
            />
            <v-progress-circular v-else indeterminate color="blue-darken-2" />
          </div>
        </v-card-text>

        <v-divider class="border-opacity-25"></v-divider>
        <v-card-actions class="px-6 py-3 bg-white">
          <div class="text-caption text-grey">Gunakan tombol putar, kontrol zoom, atau scroll mouse pada area gambar.</div>
          <v-spacer />
          <v-btn color="blue-darken-2" variant="tonal" class="text-none px-5 rounded-pill font-weight-medium" @click="downloadItem(previewItem)">
            <v-icon start>mdi-download-outline</v-icon> Download
          </v-btn>
          <v-btn variant="plain" class="text-none px-4 text-grey-darken-2" @click="showPreviewDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, auth: false });

const route = useRoute();
const shareId = route.params.id;

const getBaseUrl = () => {
  if (import.meta.client) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8090`;
  }
  return "http://localhost:8090";
};

const currentFolderId = ref<string | null>(null);
const pathStack = ref<{ id: string | null; name: string }[]>([]);
const items = ref<any[]>([]);
const searchQuery = ref("");
const isDownloading = ref(false);
const thumbnailMap = ref<Record<string, string>>({});
const selectedMap = ref<Record<string, boolean>>({});

const showPreviewDialog = ref(false);
const previewItem = ref<any>(null);
const previewUrl = ref("");
const zoomScale = ref(1);
const rotationAngle = ref(0);
const isDragging = ref(false);

const { data, pending, error } = await useFetch<any>(() => 
  `${getBaseUrl()}/api/public/share-info/${shareId}`
);

watch(data, (newData) => {
  if (newData && newData.type === 'folder') {
    items.value = newData.children || [];
    loadThumbnails();
  }
}, { immediate: true });

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  return items.value.filter(item => 
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const selectedItems = computed(() =>
  items.value.filter((i) => selectedMap.value[i.id]),
);

const isAllSelected = computed({
  get() {
    if (filteredItems.value.length === 0) return false;
    return filteredItems.value.every((i) => selectedMap.value[i.id]);
  },
  set(value: boolean) {
    filteredItems.value.forEach((i) => {
      selectedMap.value[i.id] = value;
    });
  },
});

const isIndeterminate = computed(() => {
  const selectedCount = filteredItems.value.filter((i) => selectedMap.value[i.id]).length;
  return selectedCount > 0 && selectedCount < filteredItems.value.length;
});

const toggleSelectAll = () => {
  const current = isAllSelected.value;
  filteredItems.value.forEach((i) => {
    selectedMap.value[i.id] = !current;
  });
};

const isSelected = (item: any) => !!selectedMap.value[item.id];
const clearSelection = () => {
  selectedMap.value = {};
};

async function fetchFolder(folderId: string | null = null) {
  try {
    const baseUrl = getBaseUrl();
    if (!folderId) {
      items.value = data.value?.children || [];
    } else {
      const res = await $fetch<any[]>(`${baseUrl}/api/public/folder-content/${folderId}`);
      items.value = res;
    }
    clearSelection();
    loadThumbnails();
  } catch (err) {
    items.value = [];
  }
}

function isImageFile(item: any) {
  if (item.type === 'folder') return false;
  const ext = item.name?.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || "");
}

async function loadThumbnails() {
  const imageFiles = items.value.filter(isImageFile);
  const baseUrl = getBaseUrl();
  for (const imgItem of imageFiles) {
    if (!thumbnailMap.value[imgItem.id]) {
      try {
        const endpoint = imgItem.share_id ? `${baseUrl}/s/${imgItem.share_id}` : `${baseUrl}/api/public/download-file/${imgItem.id}`;
        const res = await $fetch<Blob>(endpoint, { responseType: "blob" });
        thumbnailMap.value[imgItem.id] = window.URL.createObjectURL(res);
      } catch (e) {
        console.error("Gagal load thumbnail");
      }
    }
  }
}

async function openPreview(item: any) {
  previewItem.value = item;
  zoomScale.value = 1;
  rotationAngle.value = 0;
  const baseUrl = getBaseUrl();
  try {
    const endpoint = item.share_id ? `${baseUrl}/s/${item.share_id}` : `${baseUrl}/api/public/download-file/${item.id}`;
    const res = await $fetch<Blob>(endpoint, { responseType: "blob" });
    previewUrl.value = window.URL.createObjectURL(res);
    showPreviewDialog.value = true;
  } catch (err) {
    alert("Gagal memuat preview gambar.");
  }
}

function zoomIn() { if (zoomScale.value < 4) zoomScale.value += 0.25; }
function zoomOut() { if (zoomScale.value > 0.5) zoomScale.value -= 0.25; }
function rotateImage() { rotationAngle.value = (rotationAngle.value + 90) % 360; }
function resetZoom() { 
  zoomScale.value = 1; 
  rotationAngle.value = 0;
}
function handleWheelZoom(e: WheelEvent) {
  if (e.deltaY < 0) zoomIn(); else zoomOut();
}

function handleItemClick(item: any) {
  if (item.type === "folder") {
    currentFolderId.value = item.id;
    pathStack.value.push({ id: item.id, name: item.name });
    searchQuery.value = "";
    fetchFolder(item.id);
  } else if (isImageFile(item)) {
    openPreview(item);
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

async function downloadItem(item: any) {
  const baseUrl = getBaseUrl();
  const path = item.type === "folder" ? "download-folder" : "download-file";
  const prefix = item.type === "folder" ? "sf" : "s";
  
  const url = item.share_id 
    ? `${baseUrl}/${prefix}/${item.share_id}` 
    : `${baseUrl}/api/public/${path}/${item.id}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download gagal");
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = item.name || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    window.open(url, "_blank");
  }
}

async function downloadSelectedItems(itemsToDown: any[]) {
  if (!itemsToDown.length) return;
  itemsToDown.forEach((item, index) => {
    setTimeout(() => {
      downloadItem(item);
    }, index * 500);
  });
}

function handleMainDownload() {
  if (!data.value) return;
  isDownloading.value = true;
  
  setTimeout(() => {
    const baseUrl = getBaseUrl();
    if (currentFolderId.value) {
      window.location.href = `${baseUrl}/api/public/download-folder/${currentFolderId.value}`;
    } else {
      const endpoint = data.value.type === "folder" ? "sf" : "s";
      window.location.href = `${baseUrl}/${endpoint}/${shareId}`;
    }
    isDownloading.value = false;
  }, 800);
}

onMounted(() => {
  if (data.value) {
    items.value = data.value.children || [];
    loadThumbnails();
  }
});

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
    case "pdf": return { icon: "mdi-file-pdf-box", class: "icon-pdf" };
    case "xls": case "xlsx": case "csv": return { icon: "mdi-file-excel", class: "icon-excel" };
    case "png": case "jpg": case "jpeg": case "gif": case "svg": case "webp": return { icon: "mdi-image", class: "icon-image" };
    case "zip": case "rar": case "7z": return { icon: "mdi-zip-box", class: "icon-archive" };
    case "doc": case "docx": return { icon: "mdi-file-word", class: "icon-word" };
    case "ppt": case "pptx": return { icon: "mdi-file-powerpoint", class: "icon-ppt" };
    case "txt": case "rtf": return { icon: "mdi-file-document-edit", class: "icon-text" };
    case "apk": return { icon: "mdi-android", class: "icon-android" };
    case "sql": case "db": case "sqlite": return { icon: "mdi-database", class: "icon-db" };
    case "js": case "ts": case "html": case "css": case "json": case "php": return { icon: "mdi-code-json", class: "icon-code" };
    case "mp4": case "mkv": case "avi": case "mov": return { icon: "mdi-video", class: "icon-video" };
    case "mp3": case "wav": case "ogg": return { icon: "mdi-music", class: "icon-audio" };
    default: return { icon: "mdi-file-document-outline", class: "file-icon-bg-light" };
  }
}
</script>
<style scoped>
.shared-page-bg {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 95vh;
}

/* ========================================================= */
/* EFEK GARIS NEON BERGERAK SEPERTI TITIK CAHAYA / RUNNING LED */
/* ========================================================= */
.magic-border-card {
  position: relative;
  border-radius: 18px;
  background: #ffffff;
  padding: 2.5px; /* Ketebalan garis neon */
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* Membuat efek garis berjalan (hanya segmen tertentu yang terang) */
.magic-border-card::before {
  content: '';
  position: absolute;
  inset: -150%;
  background: conic-gradient(
    from 0deg at 50% 50%, 
    transparent 0deg, 
    transparent 270deg, 
    #2563eb 310deg, 
    #06b6d4 335deg, 
    #10b981 350deg,
    #ffffff 360deg
  );
  animation: rotateNeon 3.5s linear infinite;
}

@keyframes rotateNeon {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.inner-card {
  position: relative;
  z-index: 2;
  border-radius: 16px !important;
}

.border-light {
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
}
.border-bottom-light {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.brand-icon-wrapper {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border-radius: 14px;
}
.folder-title {
  font-size: 1.25rem !important;
  letter-spacing: -0.5px;
}

.breadcrumb-container {
  display: flex;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
}
.crumb-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  color: #475569;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}
.crumb-pill:hover {
  background: #f1f5f9;
  color: #1e293b;
}
.crumb-pill.active {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.3);
  font-weight: 600;
}
.crumb-pill.root {
  font-weight: 500;
}

.file-area {
  min-height: 300px;
  max-height: 520px;
  overflow-y: auto;
  background-color: #fafbfc;
}
.file-row-modern {
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.file-row-modern:hover {
  background: #ffffff;
  border-color: rgba(37, 99, 235, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.06);
}
.file-row-modern.selected {
  background: rgba(37, 99, 235, 0.08) !important;
  border-color: rgba(37, 99, 235, 0.5) !important;
}
.file-name-full {
  font-size: 14px;
  color: #1e293b;
}

.file-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}
.folder-icon-light { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #d97706; }
.file-icon-bg-light { background: #f1f5f9; color: #64748b; }
.icon-pdf { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #ef4444; }
.icon-word { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #2563eb; }
.icon-excel { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #16a34a; }
.icon-image { background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); color: #9333ea; }
.icon-archive { background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%); color: #ca8a04; }
.icon-db { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); color: #0284c7; }
.icon-code { background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%); color: #ea580c; }
.icon-video { background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); color: #0891b2; }
.icon-audio { background: linear-gradient(135deg, #fae8ff 0%, #f5d0fe 100%); color: #c084fc; }
.icon-ppt { background: linear-gradient(135deg, #ffedd5 0%, #ffdab9 100%); color: #c2410c; }
.icon-text { background: #f1f5f9; color: #64748b; }
.icon-android { background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%); color: #16a34a; }

.preview-zoomed-image {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  user-select: none;
}

.btn-download-anim {
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}
.btn-download-anim:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3) !important;
}
.btn-icon-anim {
  transition: transform 0.2s ease !important;
}
.btn-icon-anim:hover {
  transform: scale(1.15);
  background-color: rgba(37, 99, 235, 0.1) !important;
}

.footer-text {
  font-size: 0.8rem;
  color: #64748b;
}
.brand {
  background: linear-gradient(90deg, #2563eb, #16a34a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}
.separator {
  margin: 0 6px;
  color: #cbd5e1;
}
.cloud {
  color: #0284c7;
  font-weight: 600;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
}
</style>