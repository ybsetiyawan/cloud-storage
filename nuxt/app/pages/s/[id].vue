<template>
  <v-app class="shared-page-bg">
    <v-main class="d-flex align-center justify-center">
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

        <!-- Main Content Card -->
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

                <!-- Action Buttons: Upload & Download -->
                <div class="d-flex align-center gap-2 flex-wrap">
                  <!-- Tombol Upload Publik -->
                  <v-btn
                    v-if="data?.allow_upload"
                    color="success"
                    elevation="2"
                    size="large"
                    rounded="pill"
                    prepend-icon="mdi-cloud-upload-outline"
                    class="text-none font-weight-semibold px-5 text-white btn-download-anim"
                    @click="triggerPublicUpload"
                  >
                    Upload File
                  </v-btn>

                  <!-- Tombol Download Semua (Hanya muncul jika allow_download true) -->
                  <v-btn
                    v-if="data?.allow_download !== false"
                    color="blue-darken-2"
                    elevation="2"
                    size="large"
                    rounded="pill"
                    prepend-icon="mdi-download-outline"
                    :loading="isDownloading"
                    :disabled="selectedItems.length > 0"
                    class="ml-2 text-none font-weight-semibold px-6 btn-download-anim text-white"
                    @click="handleMainDownload"
                  >
                    Download Semua
                  </v-btn>
                </div>
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
              <div v-if="selectedItems.length > 0 && data?.allow_download !== false" class="bulk-bar-modern d-flex align-center px-6 py-3 bg-blue-lighten-5 border-bottom-light">
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
                      v-if="data?.allow_download !== false"
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

                  <!-- Tombol Download per item (Hanya muncul jika allow_download true) -->
                  <div v-if="data?.allow_download !== false" class="file-actions d-flex align-center">
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
          <div class="text-caption text-grey">Pratinjau berkas gambar.</div>
          <v-spacer />
          <v-btn v-if="data?.allow_download !== false" color="blue-darken-2" variant="tonal" class="text-none px-5 rounded-pill font-weight-medium" @click="downloadItem(previewItem)">
            <v-icon start>mdi-download-outline</v-icon> Download
          </v-btn>
          <v-btn variant="plain" class="text-none px-4 text-grey-darken-2" @click="showPreviewDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Konfirmasi Overwrite File -->
    <v-dialog v-model="showOverwriteDialog" max-width="400" persistent>
      <v-card class="rounded-xl pa-3 bg-white border-light text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold text-warning px-3 pt-3 text-subtitle-1 d-flex align-center gap-2">
          <v-icon color="warning">mdi-alert-outline</v-icon> File Sudah Ada
        </v-card-title>
        <v-card-text class="px-3 pt-2 text-body-2 text-grey-darken-2">
          Berkas dengan nama <b>"{{ conflictingFileName }}"</b> sudah ada di direktori ini. Apakah Anda ingin menimpanya?
        </v-card-text>
        <v-card-actions class="px-3 pb-2">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="handleOverwriteChoice(false)">Lewati</v-btn>
          <v-btn size="small" color="blue-darken-2" variant="flat" class="text-none rounded-pill px-5 font-weight-medium text-white" @click="handleOverwriteChoice(true)">Timpa</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Progress Bar Upload Publik -->
    <v-dialog v-model="showUploadDialog" max-width="500" persistent scrollable>
      <v-card class="rounded-2xl bg-white border-light text-grey-darken-4 elevation-4">
        <v-card-title class="d-flex align-center justify-space-between py-4 px-6">
          <span class="text-subtitle-1 font-weight-bold">Mengunggah Berkas</span>
          <v-chip size="small" color="success" class="font-weight-bold text-white">{{ uploadProgress.length }} File</v-chip>
        </v-card-title>
        <v-divider class="border-opacity-25"></v-divider>
        <div class="pa-4 bg-grey-lighten-5">
          <div class="d-flex justify-space-between text-caption mb-1 font-weight-bold text-grey-darken-3">
            <span>Total Progress</span>
            <span>{{ Math.round(overallProgress) }}%</span>
          </div>
          <v-progress-linear :model-value="overallProgress" height="8" color="success" striped rounded />
        </div>
        <v-divider class="border-opacity-25"></v-divider>
        <v-card-text style="height: 250px;" class="pa-0">
          <v-list lines="one" class="pa-0 bg-transparent">
            <v-list-item v-for="(f, idx) in uploadProgress" :key="idx" class="py-1 px-4 border-bottom-light">
              <template v-slot:prepend>
                <v-icon size="18" :color="f.progress === 100 ? 'success' : 'grey'">
                  {{ f.progress === 100 ? 'mdi-check-circle' : 'mdi-file-upload-outline' }}
                </v-icon>
              </template>
              <v-list-item-title class="text-caption text-truncate font-weight-medium text-grey-darken-3" style="max-width: 230px;">
                {{ f.name }}
              </v-list-item-title>
              <template v-slot:append>
                <div style="width: 110px" class="ml-4 d-flex align-center">
                  <v-progress-linear :model-value="f.progress" height="6" :color="f.progress === 100 ? 'success' : 'blue-darken-2'" rounded />
                  <span class="text-caption ml-2 font-weight-bold text-grey-darken-3" style="min-width: 32px">{{ f.progress }}%</span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider class="border-opacity-25"></v-divider>
        <v-card-actions class="px-6 py-3">
          <v-spacer />
          <span class="text-caption text-grey">Mohon jangan menutup halaman ini...</span>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast / Snackbar Notifikasi (Posisi: Top Right) -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" rounded="pill" location="top right" class="mt-16 mr-4">
      <div class="d-flex align-center font-weight-medium">
        <v-icon start size="20" class="mr-2">
          {{ snackbarColor === 'success' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}
        </v-icon>
        {{ snackbarText }}
      </div>
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Tutup</v-btn>
      </template>
    </v-snackbar>
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

const showOverwriteDialog = ref(false);
const conflictingFileName = ref("");
let overwriteResolve: ((value: boolean) => void) | null = null;

function promptOverwrite(fileName: string): Promise<boolean> {
  conflictingFileName.value = fileName;
  showOverwriteDialog.value = true;
  return new Promise((resolve) => {
    overwriteResolve = resolve;
  });
}

function handleOverwriteChoice(choice: boolean) {
  showOverwriteDialog.value = false;
  if (overwriteResolve) {
    overwriteResolve(choice);
    overwriteResolve = null;
  }
}

interface UploadItem {
  name: string;
  progress: number;
}

const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");
const showUploadDialog = ref(false);
const uploadProgress = ref<Array<{ name: string; progress: number }>>([]);

const overallProgress = computed(() => {
  if (uploadProgress.value.length === 0) return 0;
  const total = uploadProgress.value.reduce((acc, curr) => acc + curr.progress, 0);
  return total / uploadProgress.value.length;
});

const { data, pending, error, refresh } = await useFetch<any>(() => 
  `${getBaseUrl()}/api/public/share-info/${shareId}`
);

watch(data, (newData) => {
  if (newData && newData.type === 'folder') {
    if (!currentFolderId.value) {
      items.value = newData.children || [];
    }
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
      await refresh();
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
        // 🔥 Gunakan endpoint preview-file agar tidak terhalang pengaturan allow_download
        const endpoint = `${baseUrl}/api/public/preview-file/${imgItem.id}`;
        const res = await $fetch<Blob>(endpoint, { responseType: "blob" });
        thumbnailMap.value[imgItem.id] = window.URL.createObjectURL(res);
      } catch (e) {
        // Silent fail untuk thumbnail
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
    // 🔥 Gunakan endpoint preview-file agar tidak terhalang pengaturan allow_download
    const endpoint = `${baseUrl}/api/public/preview-file/${item.id}`;
    const res = await $fetch<Blob>(endpoint, { responseType: "blob" });
    previewUrl.value = window.URL.createObjectURL(res);
    showPreviewDialog.value = true;
  } catch (err) {
    showToast("Gagal memuat pratinjau gambar.", "error");
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

function showToast(text: string, color = "success") {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
}

function triggerPublicUpload() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;

  input.onchange = async () => {
    if (!input.files || input.files.length === 0) return;
    const filesArr = Array.from(input.files);

    if (data.value?.allowed_extensions) {
      const allowedList = data.value.allowed_extensions
        .split(",")
        .map((ext: string) => ext.trim().toLowerCase());

      for (const file of filesArr) {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
        if (!allowedList.includes(fileExt)) {
          showToast(`Format file .${fileExt} ditolak. Ekstensi yang diizinkan: ${data.value.allowed_extensions}`, "error");
          return;
        }
      }
    }

    uploadProgress.value = filesArr.map((f) => ({ name: f.name, progress: 0 }));
    showUploadDialog.value = true;

    const baseUrl = getBaseUrl();
    const uploadUrl = `${baseUrl}/api/public/shared/${shareId}/upload`;

    let hasError = false;
    let errorMessage = "Terjadi kesalahan saat mengunggah.";
    let uploadedCount = 0;

    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i];
      if (!file) continue;

      const fileName = file.name;
      const isDuplicate = items.value.some(
        (iItem) => iItem.type !== 'folder' && iItem.name.toLowerCase() === fileName.toLowerCase()
      );

      if (isDuplicate) {
        showUploadDialog.value = false;
        const shouldOverwrite = await promptOverwrite(fileName);
        showUploadDialog.value = true;

        if (!shouldOverwrite) {
          const targetItem = uploadProgress.value[i];
          if (targetItem) {
            targetItem.progress = 100;
          }
          continue;
        }
      }

      const formData = new FormData();
      if (currentFolderId.value) formData.append("folder_id", currentFolderId.value);
      formData.append("files", file);
      const currentItem = uploadProgress.value[i];

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", uploadUrl);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && currentItem) {
              currentItem.progress = Math.round((e.loaded / e.total) * 100);
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              try {
                const resJson = JSON.parse(xhr.responseText);
                reject(new Error(resJson.error || "Gagal mengunggah"));
              } catch (e) {
                reject(new Error("Gagal mengunggah berkas"));
              }
            }
          };
          xhr.onerror = () => reject(new Error("Koneksi jaringan gagal"));
          xhr.send(formData);
        });
        uploadedCount++;
      } catch (err: any) {
        hasError = true;
        errorMessage = err.message;
        break;
      }
    }

    showUploadDialog.value = false;

    if (hasError) {
      showToast(errorMessage, "error");
    } else {
      showToast(`Berhasil mengunggah ${uploadedCount} file!`);
    }
    await fetchFolder(currentFolderId.value);
  };

  input.click();
}

async function downloadItem(item: any) {
  if (data.value?.allow_download === false) {
    showToast("Pengunduhan dinonaktifkan untuk folder ini.", "error");
    return;
  }

  const baseUrl = getBaseUrl();
  let url = item.type === "folder" 
    ? (item.share_id ? `${baseUrl}/sf/${item.share_id}` : `${baseUrl}/api/public/download-folder/${item.id}`)
    : `${baseUrl}/api/public/download-file/${item.id}`;

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
    showToast("Gagal mengunduh berkas.", "error");
  }
}

async function downloadSelectedItems(itemsToDown: any[]) {
  if (!itemsToDown.length || data.value?.allow_download === false) return;
  itemsToDown.forEach((item, index) => {
    setTimeout(() => {
      downloadItem(item);
    }, index * 500);
  });
}

function handleMainDownload() {
  if (!data.value || data.value?.allow_download === false) return;
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
    case "exe": return { icon: "mdi-desktop-classic", class: "icon-word" };
    default: return { icon: "mdi-file-document-outline", class: "file-icon-bg-light" };
  }
}
</script>

<style scoped>
.shared-page-bg {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 95vh;
}

.magic-border-card {
  position: relative;
  border-radius: 18px;
  background: #ffffff;
  padding: 2.5px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

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