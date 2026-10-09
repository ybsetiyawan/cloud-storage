<template>
  <v-container fluid class="pa-6 file-manager-container-light">
    <!-- Header Modern Section -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <h2 class="text-h5 font-weight-bold text-grey-darken-4 tracking-tight">File Manager</h2>
        </div>
        
        <!-- Breadcrumb Pills -->
        <div class="breadcrumb-container mt-2">
          <div class="crumb-pill-light root" @click="goRoot">
            <v-icon size="16" class="mr-1 text-blue-darken-2">mdi-home-variant</v-icon>
            <span>Root</span>
          </div>
          <template v-for="(b, i) in displayBreadcrumbs" :key="i">
            <v-icon size="14" class="mx-1 text-grey-lighten-1">mdi-chevron-right</v-icon>
            <div v-if="b === '...'" class="crumb-pill-light dots">...</div>
            <div
              v-else
              class="crumb-pill-light"
              :class="{ active: i === displayBreadcrumbs.length - 1 }"
              @click="handleBreadcrumbClick(i)"
            >
              {{ b.name }}
            </div>
          </template>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex align-center gap-2 flex-wrap">
        <v-btn size="small" variant="outlined" class="text-none px-4 rounded-pill border-light bg-white text-grey-darken-3 action-btn" @click="createFolder">
          <v-icon start color="amber-darken-2">mdi-folder-plus</v-icon> Add Folder
        </v-btn>
        <v-btn size="small" variant="outlined" class="text-none px-4 rounded-pill border-light bg-white text-grey-darken-3 action-btn" @click="uploadFiles('folder')">
          <v-icon start color="orange-darken-2">mdi-folder-upload</v-icon> Upload Folder
        </v-btn>
        <v-btn size="small" color="blue-darken-2" class="text-none px-5 rounded-pill elevation-0 font-weight-medium text-white action-btn" @click="uploadFiles('file')">
          <v-icon start>mdi-cloud-upload</v-icon> Upload File
        </v-btn>
      </div>
    </div>

    <!-- Toolbar: Search Bar -->
    <div class="d-flex align-center justify-between mb-4 gap-3 flex-wrap">
      <v-text-field
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        placeholder="Cari file atau folder..."
        density="comfortable"
        variant="outlined"
        bg-color="white"
        color="blue-darken-2"
        hide-details
        class="rounded-xl search-input-light flex-grow-1 elevation-0"
        style="max-width: 420px;"
      />
    </div>

    <!-- Bulk Action & Select All Bar -->
    <v-slide-y-transition>
      <div v-if="selectedItems.length > 0" class="bulk-bar-light d-flex align-center px-5 py-3 mb-4 elevation-1 rounded-xl flex-wrap gap-2">
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
        <div class="d-flex align-center gap-2">
          <v-btn 
            size="small" 
            color="blue-darken-2" 
            variant="flat" 
            class="text-none rounded-pill px-4 font-weight-medium"
            @click="downloadSelectedItems(selectedItems)"
          >
            <v-icon start size="16">mdi-download-multiple</v-icon> Download ({{ selectedItems.length }})
          </v-btn>
          <v-btn 
            size="small" 
            color="error" 
            variant="flat" 
            class="text-none rounded-pill px-4 font-weight-medium"
            @click="confirmDelete(selectedItems)"
          >
            <v-icon start size="16">mdi-delete-sweep</v-icon> Hapus ({{ selectedItems.length }})
          </v-btn>
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="clearSelection">Batal</v-btn>
        </div>
      </div>
    </v-slide-y-transition>

    <!-- Main Container Card -->
    <v-card class="file-card-light elevation-1 rounded-2xl border-light bg-white">
      <div class="file-list custom-scrollbar pa-3">
        <div v-if="loading" class="text-center py-16">
          <v-progress-circular indeterminate color="blue-darken-2" size="44" width="3" />
        </div>

        <div
          v-else-if="filteredItems.length === 0"
          class="text-center py-16 text-grey-lighten-1"
        >
          <v-icon size="64" class="mb-3 text-grey-lighten-2">mdi-folder-open-outline</v-icon>
          <div class="text-subtitle-1 font-weight-medium text-grey-darken-3">Tidak ada file atau folder</div>
          <div class="text-caption text-grey mt-1">Mulai dengan mengunggah file baru atau buat folder.</div>
        </div>

        <!-- Daftar File & Folder Model Clean List Full-Color Icons -->
        <template v-else>
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="file-row-light rounded-xl mb-2 px-4 py-3 align-center"
            :class="{ selected: isSelected(item) }"
            @click="handleClick(item)"
            @dblclick="handleDoubleClick(item)"
          >
            <div class="file-main">
              <v-checkbox
                v-model="selectedMap[item.id]"
                @click.stop
                density="compact"
                hide-details
                color="blue-darken-2"
              />

              <!-- Preview Thumbnail atau Icon Full Color -->
              <div class="file-icon shadow-sm" :class="getIconConfig(item).class">
                <template v-if="isImageFile(item) && thumbnailMap[item.id]">
                  <v-img :src="thumbnailMap[item.id]" cover width="46" height="46" class="rounded-lg" />
                </template>
                <template v-else-if="isImageFile(item)">
                  <v-progress-circular indeterminate size="16" width="2" color="grey" />
                </template>
                <template v-else>
                  <v-icon size="26">{{ getIconConfig(item).icon }}</v-icon>
                </template>
              </div>

              <div class="file-text">
                <div class="d-flex align-center">
                  <div class="file-name-full text-truncate font-weight-semibold text-grey-darken-3">
                    {{ item.name || item.original_name }}
                  </div>
                  <v-tooltip v-if="item.is_public" text="Link Shared Aktif" location="top">
                    <template v-slot:activator="{ props }">
                      <v-icon v-bind="props" size="16" color="blue-darken-2" class="ml-2">mdi-share-check</v-icon>
                    </template>
                  </v-tooltip>
                </div>
                <div class="file-meta">
                  <v-chip v-if="item.type !== 'folder'" density="compact" size="x-small" variant="tonal" class="mr-2 font-weight-bold px-2 text-blue-darken-3 bg-blue-lighten-5">
                    {{ formatSize(item.size) }}
                  </v-chip>
                  <span v-else class="mr-2 text-amber-darken-3 font-weight-bold text-caption">Folder</span>
                  <span class="text-grey-darken-1">• {{ formatDate(item.created_at) }}</span>
                </div>
              </div>
            </div>

            <div class="file-actions">
              <v-btn v-if="isImageFile(item)" icon size="small" variant="text" color="purple" class="rounded-circle" @click.stop="openPreview(item)">
                <v-icon size="18">mdi-eye-outline</v-icon>
                <v-tooltip activator="parent" location="top">Preview Gambar</v-tooltip>
              </v-btn>
              <v-btn icon size="small" variant="text" color="blue-darken-3" class="rounded-circle" @click.stop="handleDownload(item)">
                <v-icon size="18">mdi-download-outline</v-icon>
                <v-tooltip activator="parent" location="top">Download</v-tooltip>
              </v-btn>
              <v-btn icon size="small" variant="text" color="green" class="rounded-circle" @click.stop="openRenameDialog(item)">
                <v-icon size="18">mdi-pencil-outline</v-icon>
                <v-tooltip activator="parent" location="top">Ubah Nama</v-tooltip>
              </v-btn>
              <v-btn icon size="small" variant="text" color="grey-darken-3" class="rounded-circle" @click.stop="shareItems([item])">
                <v-icon size="18" :color="item.is_public ? 'blue-darken-2' : ''">
                  {{ item.is_public ? "mdi-link-variant" : "mdi-share-variant-outline" }}
                </v-icon>
                <v-tooltip activator="parent" location="top">Bagikan Link</v-tooltip>
              </v-btn>
              <v-btn icon size="small" variant="text" color="error" class="rounded-circle" @click.stop="confirmDelete([item])">
                <v-icon size="18">mdi-delete-outline</v-icon>
                <v-tooltip activator="parent" location="top">Hapus</v-tooltip>
              </v-btn>
            </div>
          </div>
        </template>
      </div>
    </v-card>

    <!-- Dialog Preview Gambar dengan Zoom In/Out -->
    <v-dialog v-model="showPreviewDialog" max-width="850" transition="dialog-bottom-transition">
      <v-card class="rounded-2xl overflow-hidden shadow-lg border-light bg-white">
        <v-card-title class="d-flex justify-space-between align-center px-6 py-4 bg-grey-lighten-4 text-grey-darken-4">
          <span class="text-subtitle-1 text-truncate font-weight-medium">{{ previewItem?.name || previewItem?.original_name }}</span>
          <div class="d-flex align-center gap-1">
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="zoomOut">
              <v-icon>mdi-magnify-minus-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">Zoom Out</v-tooltip>
            </v-btn>
            <span class="text-caption px-1 text-grey-darken-2 font-weight-mono" style="min-width: 48px; text-align: center;">{{ Math.round(zoomScale * 100) }}%</span>
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="zoomIn">
              <v-icon>mdi-magnify-plus-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">Zoom In</v-tooltip>
            </v-btn>
            <v-btn icon variant="text" size="small" color="grey-darken-3" @click="resetZoom" class="ml-1">
              <v-icon>mdi-refresh</v-icon>
              <v-tooltip activator="parent" location="bottom">Reset Zoom</v-tooltip>
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
              :style="{ transform: `scale(${zoomScale})`, transition: isDragging ? 'none' : 'transform 0.15s ease-out' }"
              class="preview-zoomed-image rounded-xl shadow-sm"
              alt="Preview"
            />
            <v-progress-circular v-else indeterminate color="blue-darken-2" />
          </div>
        </v-card-text>

        <v-divider class="border-opacity-25"></v-divider>
        <v-card-actions class="px-6 py-3 bg-white">
          <div class="text-caption text-grey">Gunakan tombol kontrol zoom atau scroll mouse pada area gambar untuk memperbesar/memperkecil.</div>
          <v-spacer />
          <v-btn color="blue-darken-2" variant="tonal" class="text-none px-5 rounded-pill font-weight-medium" @click="handleDownload(previewItem)">
            <v-icon start>mdi-download-outline</v-icon> Download
          </v-btn>
          <v-btn variant="plain" class="text-none px-4 text-grey-darken-2" @click="showPreviewDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Rename (Ganti Nama) Kustom -->
    <v-dialog v-model="showRenameDialog" max-width="400">
      <v-card class="rounded-2xl pa-2 bg-white border-light text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold px-4 pt-4">Ubah Nama File/Folder</v-card-title>
        <v-card-text class="px-4">
          <v-text-field
            v-model="renameValue"
            label="Nama Baru"
            autofocus
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="blue-darken-2"
            class="rounded-lg mt-1"
            @keyup.enter="submitRename"
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" class="text-none text-grey-darken-2" @click="showRenameDialog = false">Batal</v-btn>
          <v-btn color="blue-darken-2" variant="flat" class="text-none rounded-pill px-6 font-weight-medium text-white" @click="submitRename">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Konfirmasi Delete Kustom -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card class="rounded-2xl pa-4 bg-white border-light text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold text-error px-2">Konfirmasi Hapus</v-card-title>
        <v-card-text class="px-2 text-body-2 text-grey-darken-2">
          Apakah Anda yakin ingin menghapus <b>{{ itemsToDelete.length }}</b> item yang dipilih? Tindakan ini tidak dapat dibatalkan.
        </v-card-text>
        <v-card-actions class="px-2 pb-2">
          <v-spacer />
          <v-btn variant="text" class="text-none text-grey-darken-2" @click="showDeleteDialog = false">Batal</v-btn>
          <v-btn color="error" variant="flat" class="text-none rounded-pill px-6 font-weight-medium" @click="executeDelete">Ya, Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" color="success" timeout="2500" rounded="pill">
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Tutup</v-btn>
      </template>
    </v-snackbar>

    <!-- Dialog Upload -->
    <v-dialog v-model="showUploadDialog" max-width="500" persistent scrollable>
      <v-card class="rounded-2xl bg-white border-light text-grey-darken-4 elevation-4">
        <v-card-title class="d-flex align-center justify-space-between py-4 px-6">
          <span class="text-subtitle-1 font-weight-bold">Uploading Files</span>
          <v-chip size="small" color="blue-darken-2" class="font-weight-bold text-white">{{ uploadProgress.length }} Files</v-chip>
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
        <v-card-text style="height: 280px;" class="pa-0">
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
          <span class="text-caption text-grey">Mohon jangan tutup halaman ini...</span>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Create Folder -->
    <v-dialog v-model="showCreateDialog" max-width="400">
      <v-card class="rounded-2xl pa-2 bg-white border-light text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold px-4 pt-4">Buat Folder Baru</v-card-title>
        <v-card-text class="px-4">
          <v-text-field
            v-model="newFolderName"
            label="Nama Folder"
            autofocus
            variant="outlined"
            density="comfortable"
            bg-color="white"
            color="blue-darken-2"
            class="rounded-lg mt-1"
            @keyup.enter="submitCreateFolder"
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" class="text-none text-grey-darken-2" @click="showCreateDialog = false">Batal</v-btn>
          <v-btn color="blue-darken-2" variant="flat" class="text-none rounded-pill px-6 font-weight-medium text-white" @click="submitCreateFolder">Buat</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin" });
import { ref, computed, onMounted } from "vue";
import { useNuxtApp } from "#imports";

const { $api } = useNuxtApp();

const searchQuery = ref("");
const loading = ref(true);
const folders = ref<any[]>([]);
const files = ref<any[]>([]);
const currentFolderId = ref<number | null>(null);
const breadcrumbs = ref<any[]>([]);
const showCreateDialog = ref(false);
const newFolderName = ref("");
const selectedMap = ref<Record<string, boolean>>({});
const thumbnailMap = ref<Record<string, string>>({});
const showUploadDialog = ref(false);
const uploadProgress = ref<{ name: string; progress: number }[]>([]);

// State untuk Dialog Kustom Rename & Delete
const showRenameDialog = ref(false);
const itemToRename = ref<any>(null);
const renameValue = ref("");

const showDeleteDialog = ref(false);
const itemsToDelete = ref<any[]>([]);

const showPreviewDialog = ref(false);
const previewItem = ref<any>(null);
const previewUrl = ref("");
const zoomScale = ref(1);
const isDragging = ref(false);

const overallProgress = computed(() => {
  if (uploadProgress.value.length === 0) return 0;
  const total = uploadProgress.value.reduce((acc, curr) => acc + curr.progress, 0);
  return total / uploadProgress.value.length;
});
const snackbar = ref(false);
const snackbarText = ref("");

const selectedItems = computed(() =>
  [...folders.value, ...files.value].filter((i) => selectedMap.value[i.id]),
);

const filteredItems = computed(() =>
  [...folders.value, ...files.value].filter((i) =>
    (i.name || i.original_name || "")
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase()),
  ),
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

const displayBreadcrumbs = computed(() => {
  const max = 4;
  if (breadcrumbs.value.length <= max) return breadcrumbs.value;
  return [breadcrumbs.value[0], "...", ...breadcrumbs.value.slice(-2)];
});

const isSelected = (item: any) => !!selectedMap.value[item.id];
const clearSelection = () => {
  selectedMap.value = {};
};

function handleBreadcrumbClick(index: number) {
  const item: any = displayBreadcrumbs.value[index];
  if (item === "...") return;
  const realIndex = breadcrumbs.value.findIndex((b) => b.id === item.id);
  if (realIndex !== -1) goTo(realIndex);
}

function formatSize(bytes: any) {
  if (!bytes || bytes === 0 || bytes === "-") return "-";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function isImageFile(item: any) {
  if (item.type === 'folder') return false;
  const fileName = item.name || item.original_name || "";
  const extension = fileName.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension || "");
}

async function loadThumbnails() {
  const imageFiles = files.value.filter(isImageFile);
  for (const imgItem of imageFiles) {
    if (!thumbnailMap.value[imgItem.id]) {
      try {
        const response = await $api<Blob>(`/files/${imgItem.id}`, {
          method: "GET",
          responseType: "blob",
        }) as Blob;
        thumbnailMap.value[imgItem.id] = window.URL.createObjectURL(response);
      } catch (err) {
        console.error(`Gagal memuat thumbnail file ID: ${imgItem.id}`);
      }
    }
  }
}

async function openPreview(item: any) {
  previewItem.value = item;
  zoomScale.value = 1;
  try {
    const endpoint = `/files/${item.id}`;
    const response = await $api<Blob>(endpoint, {
      method: "GET",
      responseType: "blob",
    }) as Blob;
    previewUrl.value = window.URL.createObjectURL(response);
    showPreviewDialog.value = true;
  } catch (err) {
    alert("Gagal memuat preview gambar.");
  }
}

function zoomIn() {
  if (zoomScale.value < 4) {
    zoomScale.value = parseFloat((zoomScale.value + 0.25).toFixed(2));
  }
}

function zoomOut() {
  if (zoomScale.value > 0.5) {
    zoomScale.value = parseFloat((zoomScale.value - 0.25).toFixed(2));
  }
}

function resetZoom() {
  zoomScale.value = 1;
}

function handleWheelZoom(e: WheelEvent) {
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
}

function getIconConfig(item: any) {
  if (item.type === "folder")
    return { icon: "mdi-folder", class: "folder-icon-light" };
  const fileName = item.name || item.original_name || "";
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "apk": return { icon: "mdi-android", class: "icon-android" };
    case "pdf": return { icon: "mdi-file-pdf-box", class: "icon-pdf" };
    case "doc": case "docx": return { icon: "mdi-file-word", class: "icon-word" };
    case "xls": case "xlsx": case "csv": return { icon: "mdi-file-excel", class: "icon-excel" };
    case "ppt": case "pptx": return { icon: "mdi-file-powerpoint", class: "icon-ppt" };
    case "txt": case "rtf": return { icon: "mdi-file-document-edit", class: "icon-text" };
    case "jpg": case "jpeg": case "png": case "gif": case "svg": case "webp": return { icon: "mdi-image", class: "icon-image" };
    case "zip": case "rar": case "7z": case "tar": case "gz": return { icon: "mdi-zip-box", class: "icon-archive" };
    case "sql": case "db": case "sqlite": return { icon: "mdi-database", class: "icon-db" };
    case "js": case "ts": case "html": case "css": case "json": case "php": return { icon: "mdi-code-json", class: "icon-code" };
    case "mp4": case "mkv": case "avi": case "mov": return { icon: "mdi-video", class: "icon-video" };
    case "mp3": case "wav": case "ogg": return { icon: "mdi-music", class: "icon-audio" };
    default: return { icon: "mdi-file-document", class: "file-icon-bg-light" };
  }
}

async function fetchFolderContent(folderId: any = null) {
  loading.value = true;
  try {
    const f = (await $api(`/folders?parent_id=${folderId || ""}`)) as any[];
    const fi = (await $api(`/files?folder_id=${folderId || ""}`)) as any[];
    folders.value = f.map((x: any) => ({ ...x, type: "folder" }));
    files.value = fi.map((x: any) => ({ ...x, type: "file" }));
    clearSelection();
    loadThumbnails();
  } finally {
    loading.value = false;
  }
}

function enterFolder(folder: any) {
  breadcrumbs.value.push(folder);
  currentFolderId.value = folder.id;
  fetchFolderContent(folder.id);
}

function goRoot() {
  breadcrumbs.value = [];
  currentFolderId.value = null;
  fetchFolderContent(null);
}

function goTo(index: number) {
  const target = breadcrumbs.value[index];
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  currentFolderId.value = target.id;
  fetchFolderContent(target.id);
}

function toggleSelection(item: any) {
  selectedMap.value[item.id] = !selectedMap.value[item.id];
}

function handleClick(item: any) {
  if (item.type === "folder") enterFolder(item);
  else toggleSelection(item);
}

function handleDoubleClick(item: any) {
  if (isImageFile(item)) {
    openPreview(item);
  }
}

async function shareItems(items: any[]) {
  const item = items[0];
  if (!item) return;
  try {
    const endpoint = item.type === "folder" ? `/folders/${item.id}/share` : `/files/${item.id}/share`;
    const res = (await $api(endpoint, { method: "POST" })) as any;
    if (res.link) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(res.link);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = res.link;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(textArea);
      }
      snackbarText.value = "Link berhasil disalin!";
      snackbar.value = true;
      fetchFolderContent(currentFolderId.value);
    }
  } catch (err) {
    alert("Gagal membagikan item.");
  }
}

// Fungsi konfirmasi delete
function confirmDelete(items: any[]) {
  if (!items.length) return;
  itemsToDelete.value = items;
  showDeleteDialog.value = true;
}

async function executeDelete() {
  try {
    await Promise.all(
      itemsToDelete.value.map((item) =>
        item.type === "folder"
          ? $api(`/folders/${item.id}`, { method: "DELETE" })
          : $api(`/files/${item.id}`, { method: "DELETE" }),
      ),
    );
    showDeleteDialog.value = false;
    clearSelection();
    fetchFolderContent(currentFolderId.value);
    snackbarText.value = `${itemsToDelete.value.length} item berhasil dihapus.`;
    snackbar.value = true;
  } catch (err) {
    alert("Gagal menghapus item.");
  }
}

// Fungsi download tunggal
async function handleDownload(item: any) {
  if (!item) return;
  const endpoint = item.type === "folder" ? `/folders/${item.id}/download` : `/files/${item.id}`;
  try {
    const response = await $api<Blob>(endpoint, { method: "GET", responseType: "blob" }) as Blob;
    const downloadUrl = window.URL.createObjectURL(response);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = item.original_name || item.name || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    alert("Download gagal");
  }
}

// Fungsi download massal item yang tercentang
async function downloadSelectedItems(items: any[]) {
  if (!items.length) return;
  for (const item of items) {
    await handleDownload(item);
  }
  snackbarText.value = `${items.length} item berhasil didownload.`;
  snackbar.value = true;
}

// Fungsi prompt rename
function openRenameDialog(item: any) {
  itemToRename.value = item;
  renameValue.value = item.name || item.original_name;
  showRenameDialog.value = true;
}

async function submitRename() {
  if (!renameValue.value || !itemToRename.value) return;
  const oldName = itemToRename.value.name || itemToRename.value.original_name;
  if (renameValue.value === oldName) {
    showRenameDialog.value = false;
    return;
  }
  try {
    const endpoint =
      itemToRename.value.type === "folder"
        ? `/folders/${itemToRename.value.id}/rename`
        : `/files/${itemToRename.value.id}/rename`;
    await $api(endpoint, { method: "PUT", body: { name: renameValue.value } });
    showRenameDialog.value = false;
    fetchFolderContent(currentFolderId.value);
    snackbarText.value = "Nama berhasil diubah.";
    snackbar.value = true;
  } catch (err) {
    alert("Gagal mengubah nama");
  }
}

function createFolder() {
  showCreateDialog.value = true;
}

async function submitCreateFolder() {
  if (!newFolderName.value) return;
  try {
    await $api("/folders", {
      method: "POST",
      body: { name: newFolderName.value, parent_id: currentFolderId.value },
    });
    showCreateDialog.value = false;
    newFolderName.value = "";
    fetchFolderContent(currentFolderId.value);
  } catch (err) {
    alert("Gagal membuat folder");
  }
}

function formatDate(d: any) {
  return d ? new Date(d).toLocaleDateString() : "-";
}

// function uploadFiles(mode = 'file') {
//   const input = document.createElement("input");
//   input.type = "file";
//   if (mode === 'folder') {
//     // @ts-ignore
//     input.webkitdirectory = true;
//   } else {
//     input.multiple = true;
//   }

//   input.onchange = async () => {
//     if (!input.files || input.files.length === 0) return;
//     const filesArr = Array.from(input.files);
//     uploadProgress.value = filesArr.map((f) => ({ name: f.webkitRelativePath || f.name, progress: 0 }));
//     showUploadDialog.value = true;
//     const token = localStorage.getItem("admin_token");

//     for (let i = 0; i < filesArr.length; i++) {
//       const file = filesArr[i];
//       if (!file) continue;
//       const formData = new FormData();
//       if (currentFolderId.value) {
//         formData.append("folder_id", String(currentFolderId.value));
//       }
//       const relativePath = file.webkitRelativePath || file.name;
//       formData.append("fullPath", relativePath); 
//       formData.append("files", file);
//       const currentItem = uploadProgress.value[i];

//       try {
//         await new Promise<void>((resolve, reject) => {
//           const xhr = new XMLHttpRequest();
//           xhr.open("POST", "http://localhost:8090/api/files/upload");
//           xhr.setRequestHeader("Authorization", `Bearer ${token}`);
//           xhr.upload.onprogress = (e) => {
//             if (e.lengthComputable && currentItem) {
//               currentItem.progress = Math.round((e.loaded / e.total) * 100);
//             }
//           };
//           xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
//           xhr.onerror = () => reject("Network error");
//           xhr.send(formData);
//         });
//       } catch (err) {
//         console.error(`Gagal upload: ${relativePath}`, err);
//       }
//     }

//     setTimeout(() => {
//       showUploadDialog.value = false;
//       fetchFolderContent(currentFolderId.value);
//     }, 800);
//   };

//   input.click();
// }

function uploadFiles(mode = 'file') {
  const input = document.createElement("input");
  input.type = "file";
  if (mode === 'folder') {
    // @ts-ignore
    input.webkitdirectory = true;
  } else {
    input.multiple = true;
  }

  input.onchange = async () => {
    if (!input.files || input.files.length === 0) return;
    const filesArr = Array.from(input.files);
    uploadProgress.value = filesArr.map((f) => ({ name: f.webkitRelativePath || f.name, progress: 0 }));
    showUploadDialog.value = true;
    const token = localStorage.getItem("admin_token");

    // --- SOLUSI OTOMATIS HOST ---
    // Mendeteksi domain/IP secara dinamis dari browser klien
    const protocol = window.location.protocol; // http: atau https:
    const hostname = window.location.hostname; // localhost atau 10.126.101.46
    const backendPort = "8090"; // Sesuaikan port backend Anda
    const uploadUrl = `${protocol}//${hostname}:${backendPort}/api/files/upload`;
    // ----------------------------

    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i];
      if (!file) continue;
      const formData = new FormData();
      if (currentFolderId.value) {
        formData.append("folder_id", String(currentFolderId.value));
      }
      const relativePath = file.webkitRelativePath || file.name;
      formData.append("fullPath", relativePath); 
      formData.append("files", file);
      const currentItem = uploadProgress.value[i];

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", uploadUrl); // Menggunakan URL dinamis
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && currentItem) {
              currentItem.progress = Math.round((e.loaded / e.total) * 100);
            }
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
          xhr.onerror = () => reject("Network error");
          xhr.send(formData);
        });
      } catch (err) {
        console.error(`Gagal upload: ${relativePath}`, err);
      }
    }

    setTimeout(() => {
      showUploadDialog.value = false;
      fetchFolderContent(currentFolderId.value);
    }, 800);
  };

  input.click();
}

onMounted(() => fetchFolderContent());
</script>

<style scoped>
.file-manager-container-light {
  background-color: #f8fafc;
  min-height: 100vh;
}
.file-card-light {
  height: 72vh;
  display: flex;
  flex-direction: column;
  background-color: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03) !important;
}
.border-light {
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}
.file-list {
  flex: 1;
  overflow-y: auto;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
}
.bulk-bar-light {
  display: flex;
  align-items: center;
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.2);
}
.file-row-light {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.file-row-light:hover {
  background: #f1f5f9;
  border-color: rgba(37, 99, 235, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}
.file-row-light.selected {
  background: rgba(37, 99, 235, 0.08) !important;
  border-color: rgba(37, 99, 235, 0.4) !important;
}
.file-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}
.file-text {
  flex: 1;
  min-width: 0;
}
.file-name-full {
  font-size: 14px;
  color: #1e293b;
}
.file-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 3px;
}

/* Icon Full Color dengan nuansa cerah */
.file-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
}
.folder-icon-light { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #d97706; }
.file-icon-bg-light { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); color: #64748b; }
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

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.file-row-light:hover .file-actions {
  opacity: 1;
}

.breadcrumb-container {
  display: flex;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
  padding-bottom: 2px;
}
.crumb-pill-light {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  color: #475569;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.15s ease;
}
.crumb-pill-light:hover {
  background: #f1f5f9;
  border-color: rgba(37, 99, 235, 0.3);
  color: #1e293b;
}
.crumb-pill-light.active {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.3);
  font-weight: 600;
}
.crumb-pill-light.root {
  font-weight: 500;
}

.preview-zoomed-image {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  user-select: none;
  cursor: grab;
}
.preview-zoomed-image:active { cursor: grabbing; }

.action-btn { transition: transform 0.1s ease; }
.action-btn:active { transform: scale(0.97); }

.border-bottom-light {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
</style>