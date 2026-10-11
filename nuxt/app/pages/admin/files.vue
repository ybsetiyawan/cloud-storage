<template>
  <v-container fluid class="pa-3 px-md-6 modern-clean-container">
    
    <!-- Header Command Center -->
    <v-card class="elevation-0 top-header-card rounded-2xl mb-3 pa-3 bg-white">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        
        <!-- Breadcrumb & Brand -->
        <div class="d-flex align-center gap-2 overflow-x-auto min-width-0">
          <div class="breadcrumb-box d-flex align-center gap-1.5 px-3 py-1 rounded-xl">
            <span class="crumb-item root" @click="goRoot">
              <v-icon size="14" class="mr-1 text-primary">mdi-home-outline</v-icon> root
            </span>
            <template v-for="(b, i) in displayBreadcrumbs" :key="i">
              <span class="text-grey-lighten-2 mx-0.5">/</span>
              <span v-if="b === '...'" class="text-grey">...</span>
              <span
                v-else
                class="crumb-item"
                :class="{ active: i === displayBreadcrumbs.length - 1 }"
                @click="handleBreadcrumbClick(i)"
              >
                {{ b.name }}
              </span>
            </template>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex align-center gap-2 flex-wrap">
          <v-btn size="small" variant="tonal" color="amber-darken-3" class="text-none px-4 rounded-pill font-weight-semibold" @click="createFolder">
            <v-icon start size="15">mdi-folder-plus-outline</v-icon> Folder
          </v-btn>
          <v-btn size="small" variant="tonal" color="deep-orange-darken-2" class="text-none px-4 rounded-pill font-weight-semibold" @click="uploadFiles('folder')">
            <v-icon start size="15">mdi-folder-upload-outline</v-icon> Up Folder
          </v-btn>
          <v-btn size="small" color="primary" variant="flat" class="text-none px-4.5 rounded-pill font-weight-semibold text-white elevation-0" @click="uploadFiles('file')">
            <v-icon start size="15">mdi-cloud-upload-outline</v-icon> Upload File
          </v-btn>
        </div>

      </div>

      <!-- Search Bar -->
      <div class="mt-3">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          placeholder="Cari direktori atau berkas..."
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

    <!-- Bulk Action Bar -->
    <v-slide-y-transition>
      <div v-if="selectedItems.length > 0" class="bulk-action-bar d-flex align-center px-4 py-2 mb-3 rounded-2xl flex-wrap gap-2 elevation-1">
        <v-checkbox
          v-model="isAllSelected"
          :indeterminate="isIndeterminate"
          @click="toggleSelectAll"
          density="compact"
          hide-details
          color="primary"
          class="mr-2 text-grey-darken-4 font-weight-bold"
          label="Pilih Semua"
        />
        <span class="text-caption font-weight-bold text-primary bg-blue-lighten-5 px-3 py-1 rounded-pill">
          {{ selectedItems.length }} item dipilih
        </span>
        <v-spacer />
        <div class="d-flex align-center gap-2">
          <v-btn size="small" color="primary" variant="flat" class="text-none rounded-pill px-4 font-weight-medium text-white" @click="downloadSelectedItems(selectedItems)">
            <v-icon start size="14">mdi-download</v-icon> Download
          </v-btn>
          <v-btn size="small" color="error" variant="flat" class="text-none rounded-pill px-4 font-weight-medium text-white" @click="confirmDelete(selectedItems)">
            <v-icon start size="14">mdi-delete</v-icon> Hapus
          </v-btn>
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="clearSelection">Batal</v-btn>
        </div>
      </div>
    </v-slide-y-transition>

    <!-- Main File List Card -->
    <v-card class="list-container-card elevation-0 rounded-2xl bg-white clean-card-border">
      <div class="scroll-wrapper custom-scrollbar pa-2">
        
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-16">
          <v-progress-circular indeterminate color="primary" size="40" width="3" />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredItems.length === 0" class="text-center py-16 text-grey-lighten-1">
          <v-icon size="56" class="mb-2 text-grey-lighten-2">mdi-folder-open-outline</v-icon>
          <div class="text-body-2 font-weight-medium text-grey-darken-3">Direktori ini kosong</div>
        </div>

        <!-- Item Rows -->
        <template v-else>
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="file-row-item rounded-xl mb-2 px-4 py-3 align-center d-flex justify-space-between"
            :class="{ selected: isSelected(item) }"
            @click="handleClick(item)"
            @dblclick="handleDoubleClick(item)"
          >
            <!-- Kiri: Checkbox, Icon, Nama & Metadata (Tanpa label Folder) -->
            <div class="d-flex align-center min-width-0 flex-grow-1 mr-4">
              <v-checkbox
                v-model="selectedMap[item.id]"
                @click.stop
                density="compact"
                hide-details
                color="primary"
                class="flex-shrink-0 mr-3"
              />

              <!-- Ikon Ekstensi & Aplikasi -->
              <div class="file-icon-box shadow-sm flex-shrink-0 mr-4" :class="getIconConfig(item).class">
                <template v-if="isImageFile(item) && thumbnailMap[item.id]">
                  <v-img :src="thumbnailMap[item.id]" cover width="42" height="42" class="rounded-xl" />
                </template>
                <template v-else-if="isImageFile(item)">
                  <v-progress-circular indeterminate size="16" width="2" color="grey" />
                </template>
                <template v-else>
                  <v-icon size="22">{{ getIconConfig(item).icon }}</v-icon>
                </template>
              </div>

              <div class="min-width-0 flex-grow-1">
                <div class="d-flex align-center flex-wrap gap-2">
                  <span class="mr-1 text-body-2 text-truncate font-weight-semibold text-grey-darken-4 item-title">
                    {{ item.name || item.original_name }}
                  </span>
                  
                  <!-- Badges Status -->
                  <v-chip v-if="item.is_public && item.type === 'folder'" size="x-small" color="blue" variant="tonal" class="mr-1 font-weight-bold px-2 item-badge">Shared</v-chip>
                  
                  <!-- Badge Upload Aktif + Ekstensi yang diizinkan -->
                  <v-chip v-if="item.allow_upload && item.type === 'folder'" size="x-small" color="success" variant="tonal" class="mr-1 font-weight-bold px-2.5 item-badge">
                    Upload: {{ item.allowed_extensions ? item.allowed_extensions : 'Semua File' }}
                  </v-chip>

                  <v-chip v-if="item.allow_download === false && item.type === 'folder'" size="x-small" color="error" variant="tonal" class="font-weight-bold px-2 item-badge">No DL</v-chip>
                </div>

                <div class="d-flex align-center text-caption text-grey-darken-1 mt-1 item-meta gap-2">
                  <span v-if="item.type !== 'folder'" class="font-weight-bold text-primary">
                    {{ formatSize(item.size) }}
                  </span>
                  <span v-if="item.type !== 'folder'" class="text-grey-lighten-2">•</span>
                  <span class="text-grey-darken-2 font-weight-medium">{{ formatDateTime(item.created_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Kanan: Action Buttons (Hover Effect) -->
            <div class="row-actions d-flex align-center gap-1 flex-shrink-0">
              <v-btn v-if="item.type === 'folder'" icon size="x-small" variant="text" color="blue-grey" class="rounded-circle" @click.stop="openShareSettings(item)">
                <v-icon size="16">mdi-cog-outline</v-icon>
                <v-tooltip activator="parent" location="top">Pengaturan Publik</v-tooltip>
              </v-btn>
              <v-btn v-if="isImageFile(item)" icon size="x-small" variant="text" color="purple" class="rounded-circle" @click.stop="openPreview(item)">
                <v-icon size="16">mdi-eye-outline</v-icon>
                <v-tooltip activator="parent" location="top">Preview</v-tooltip>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="primary" class="rounded-circle" @click.stop="handleDownload(item)">
                <v-icon size="16">mdi-download-outline</v-icon>
                <v-tooltip activator="parent" location="top">Download</v-tooltip>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="green" class="rounded-circle" @click.stop="openRenameDialog(item)">
                <v-icon size="16">mdi-pencil-outline</v-icon>
                <v-tooltip activator="parent" location="top">Ubah Nama</v-tooltip>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="grey-darken-3" class="rounded-circle" @click.stop="shareItems([item])">
                <v-icon size="16" :color="item.is_public ? 'primary' : ''">
                  {{ item.is_public ? "mdi-link-variant" : "mdi-share-variant-outline" }}
                </v-icon>
                <v-tooltip activator="parent" location="top">Bagikan Link</v-tooltip>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="error" class="rounded-circle" @click.stop="confirmDelete([item])">
                <v-icon size="16">mdi-delete-outline</v-icon>
                <v-tooltip activator="parent" location="top">Hapus</v-tooltip>
              </v-btn>
            </div>
          </div>
        </template>

      </div>
    </v-card>

    <!-- Dialog Preview Gambar -->
    <v-dialog v-model="showPreviewDialog" max-width="800" transition="dialog-bottom-transition">
      <v-card class="rounded-2xl overflow-hidden shadow-lg clean-card-border bg-white">
        <v-card-title class="d-flex justify-space-between align-center px-5 py-3 bg-grey-lighten-4 text-grey-darken-4">
          <span class="text-subtitle-2 text-truncate font-weight-medium">{{ previewItem?.name || previewItem?.original_name }}</span>
          <div class="d-flex align-center gap-1">
            <v-btn icon variant="text" size="x-small" color="grey-darken-3" @click="rotateImage"><v-icon size="16">mdi-rotate-right</v-icon></v-btn>
            <v-btn icon variant="text" size="x-small" color="grey-darken-3" @click="zoomOut"><v-icon size="16">mdi-magnify-minus-outline</v-icon></v-btn>
            <span class="text-caption px-1 font-weight-mono text-grey-darken-2" style="font-size: 11px;">{{ Math.round(zoomScale * 100) }}%</span>
            <v-btn icon variant="text" size="x-small" color="grey-darken-3" @click="zoomIn"><v-icon size="16">mdi-magnify-plus-outline</v-icon></v-btn>
            <v-btn icon variant="text" size="x-small" color="grey-darken-3" @click="resetZoom"><v-icon size="16">mdi-refresh</v-icon></v-btn>
            <v-btn icon variant="text" size="x-small" color="grey-darken-3" @click="showPreviewDialog = false" class="ml-2"><v-icon size="16">mdi-close</v-icon></v-btn>
          </div>
        </v-card-title>
        <v-card-text class="text-center pa-0 bg-grey-lighten-5 d-flex align-center justify-center overflow-hidden position-relative" style="height: 480px;" @wheel.prevent="handleWheelZoom">
          <div class="w-100 h-100 d-flex align-center justify-center overflow-auto pa-4">
            <img v-if="previewUrl" :src="previewUrl" :style="{ transform: `scale(${zoomScale}) rotate(${rotationAngle}deg)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }" class="rounded-xl shadow-sm" style="max-height: 100%; max-width: 100%; object-fit: contain;" alt="Preview" />
            <v-progress-circular v-else indeterminate color="primary" size="32" />
          </div>
        </v-card-text>
        <v-card-actions class="px-5 py-2.5 bg-white">
          <span class="text-caption text-grey" style="font-size: 11px;">Gunakan scroll mouse atau tombol kontrol untuk zoom.</span>
          <v-spacer />
          <v-btn size="small" color="primary" variant="tonal" class="text-none px-4 rounded-pill font-weight-medium" @click="handleDownload(previewItem)">
            <v-icon start size="14">mdi-download</v-icon> Download
          </v-btn>
          <v-btn size="small" variant="plain" class="text-none text-grey-darken-2" @click="showPreviewDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Pengaturan Publik -->
    <v-dialog v-model="showShareSettingsDialog" max-width="420">
      <v-card class="rounded-2xl pa-4 bg-white clean-card-border text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold px-3 pt-2 text-subtitle-1 d-flex align-center justify-between">
          <span>Akses Publik</span>
          <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">{{ activeFolderForShare?.name }}</v-chip>
        </v-card-title>
        <v-card-text class="px-3 py-2">
          <div class="text-caption text-grey-darken-2 mb-3">Atur hak akses pengunjung publik untuk folder ini.</div>
          <v-switch v-model="settingAllowUpload" color="success" label="Izinkan Public Upload" density="compact" hide-details class="mb-2 text-body-2" />
          <v-switch v-model="settingAllowDownload" color="primary" label="Izinkan Publik Download" density="compact" hide-details class="mb-2 text-body-2" />
          <v-text-field v-model="settingAllowedExtensions" label="Batasan Ekstensi Upload (Opsional)" placeholder="pdf,jpg,png,docx" density="compact" variant="outlined" bg-color="white" color="primary" class="rounded-xl mt-2 text-body-2" hide-details />
        </v-card-text>
        <v-card-actions class="px-3 pb-2">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="showShareSettingsDialog = false">Batal</v-btn>
          <v-btn size="small" color="primary" variant="flat" class="text-none rounded-pill px-5 font-weight-medium text-white" @click="saveShareSettings">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Rename -->
    <v-dialog v-model="showRenameDialog" max-width="380">
      <v-card class="rounded-2xl pa-3 bg-white clean-card-border text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold px-3 pt-3 text-subtitle-2">Ubah Nama</v-card-title>
        <v-card-text class="px-3 pt-1">
          <v-text-field v-model="renameValue" label="Nama Baru" autofocus density="compact" variant="outlined" bg-color="white" color="primary" class="rounded-xl" hide-details @keyup.enter="submitRename" />
        </v-card-text>
        <v-card-actions class="px-3 pb-2">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="showRenameDialog = false">Batal</v-btn>
          <v-btn size="small" color="primary" variant="flat" class="text-none rounded-pill px-5 font-weight-medium text-white" @click="submitRename">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Konfirmasi Hapus -->
    <v-dialog v-model="showDeleteDialog" max-width="380">
      <v-card class="rounded-2xl pa-3 bg-white clean-card-border text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold text-error px-2 text-subtitle-2">Konfirmasi Hapus</v-card-title>
        <v-card-text class="px-2 text-caption text-grey-darken-2">Yakin ingin menghapus <b>{{ itemsToDelete.length }}</b> item terpilih?</v-card-text>
        <v-card-actions class="px-2 pb-1">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="showDeleteDialog = false">Batal</v-btn>
          <v-btn size="small" color="error" variant="flat" class="text-none rounded-pill px-5 font-weight-medium" @click="executeDelete">Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Upload Progress -->
    <v-dialog v-model="showUploadDialog" max-width="450" persistent scrollable>
      <v-card class="rounded-2xl bg-white clean-card-border text-grey-darken-4 elevation-4">
        <v-card-title class="d-flex align-center justify-space-between py-2 px-4 text-subtitle-2 font-weight-bold">
          <span>Mengunggah Berkas</span>
          <v-chip size="x-small" color="primary" class="font-weight-bold text-white">{{ uploadProgress.length }} File</v-chip>
        </v-card-title>
        <v-divider class="border-opacity-25" />
        <div class="pa-3 bg-grey-lighten-5">
          <div class="d-flex justify-space-between text-caption mb-1 font-weight-bold text-grey-darken-3" style="font-size: 11px;">
            <span>Total Progress</span>
            <span>{{ Math.round(overallProgress) }}%</span>
          </div>
          <v-progress-linear :model-value="overallProgress" height="6" color="success" striped rounded />
        </div>
        <v-divider class="border-opacity-25" />
        <v-card-text style="height: 220px;" class="pa-0">
          <v-list lines="one" class="pa-0 bg-transparent">
            <v-list-item v-for="(f, idx) in uploadProgress" :key="idx" class="py-1 px-3 border-bottom-light">
              <template v-slot:prepend><v-icon size="16" :color="f.progress === 100 ? 'success' : 'grey'">{{ f.progress === 100 ? 'mdi-check-circle' : 'mdi-file-upload-outline' }}</v-icon></template>
              <v-list-item-title class="text-caption text-truncate font-weight-medium text-grey-darken-3" style="font-size: 11.5px; max-width: 200px;">{{ f.name }}</v-list-item-title>
              <template v-slot:append>
                <div style="width: 100px" class="ml-3 d-flex align-center">
                  <v-progress-linear :model-value="f.progress" height="5" :color="f.progress === 100 ? 'success' : 'primary'" rounded />
                  <span class="text-caption ml-1.5 font-weight-bold text-grey-darken-3" style="font-size: 10.5px; min-width: 28px">{{ f.progress }}%</span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider class="border-opacity-25" />
        <v-card-actions class="px-4 py-2">
          <span class="text-caption text-grey" style="font-size: 10.5px;">Mohon jangan menutup halaman ini...</span>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Create Folder -->
    <v-dialog v-model="showCreateDialog" max-width="380">
      <v-card class="rounded-2xl pa-3 bg-white clean-card-border text-grey-darken-4 elevation-4">
        <v-card-title class="font-weight-bold px-3 pt-3 text-subtitle-2">Buat Folder Baru</v-card-title>
        <v-card-text class="px-3 pt-1">
          <v-text-field v-model="newFolderName" label="Nama Folder" autofocus density="compact" variant="outlined" bg-color="white" color="primary" class="rounded-xl" hide-details @keyup.enter="submitCreateFolder" />
        </v-card-text>
        <v-card-actions class="px-3 pb-2">
          <v-spacer />
          <v-btn size="small" variant="text" class="text-none text-grey-darken-2" @click="showCreateDialog = false">Batal</v-btn>
          <v-btn size="small" color="primary" variant="flat" class="text-none rounded-pill px-5 font-weight-medium text-white" @click="submitCreateFolder">Buat</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" color="success" timeout="2200" rounded="pill">
      {{ snackbarText }}
      <template v-slot:actions><v-btn variant="text" @click="snackbar = false">Tutup</v-btn></template>
    </v-snackbar>
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

const showRenameDialog = ref(false);
const itemToRename = ref<any>(null);
const renameValue = ref("");

const showDeleteDialog = ref(false);
const itemsToDelete = ref<any[]>([]);

const showPreviewDialog = ref(false);
const previewItem = ref<any>(null);
const previewUrl = ref("");
const zoomScale = ref(1);
const rotationAngle = ref(0);
const isDragging = ref(false);

const showShareSettingsDialog = ref(false);
const activeFolderForShare = ref<any>(null);
const settingAllowUpload = ref(false);
const settingAllowedExtensions = ref("");
const settingAllowDownload = ref(true);

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
  const max = 3;
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
      } catch (err) {}
    }
  }
}

async function openPreview(item: any) {
  previewItem.value = item;
  zoomScale.value = 1;
  rotationAngle.value = 0;
  try {
    const endpoint = `/files/${item.id}`;
    const response = await $api<Blob>(endpoint, {
      method: "GET",
      responseType: "blob",
    }) as Blob;
    previewUrl.value = window.URL.createObjectURL(response);
    showPreviewDialog.value = true;
  } catch (err) {
    alert("Gagal memuat preview.");
  }
}

function zoomIn() { if (zoomScale.value < 4) zoomScale.value += 0.25; }
function zoomOut() { if (zoomScale.value > 0.5) zoomScale.value -= 0.25; }
function rotateImage() { rotationAngle.value = (rotationAngle.value + 90) % 360; }
function resetZoom() { zoomScale.value = 1; rotationAngle.value = 0; }
function handleWheelZoom(e: WheelEvent) { if (e.deltaY < 0) zoomIn(); else zoomOut(); }

// Klasifikasi Ikon Berdasarkan Ekstensi & Aplikasi (.exe, .msi, dll)
function getIconConfig(item: any) {
  if (item.type === "folder") return { icon: "mdi-folder", class: "icon-folder-clean" };
  const ext = (item.name || item.original_name || "").split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return { icon: "mdi-file-pdf-box", class: "icon-pdf-clean" };
    case "xls": case "xlsx": case "csv": return { icon: "mdi-file-excel", class: "icon-excel-clean" };
    case "doc": case "docx": return { icon: "mdi-file-word", class: "icon-word-clean" };
    case "ppt": case "pptx": return { icon: "mdi-file-powerpoint", class: "icon-ppt-clean" };
    case "jpg": case "jpeg": case "png": case "gif": case "svg": case "webp": return { icon: "mdi-file-image", class: "icon-image-clean" };
    case "zip": case "rar": case "7z": case "tar": case "gz": return { icon: "mdi-zip-box", class: "icon-zip-clean" };
    case "exe": case "msi": case "apk": case "bat": case "sh": case "app":
      return { icon: "mdi-application-outline", class: "icon-app-clean" };
    case "js": case "ts": case "vue": case "json": case "py": case "php": case "html": case "css": case "sql":
      return { icon: "mdi-code-braces", class: "icon-code-clean" };
    case "mp4": case "mkv": case "avi": case "mov": return { icon: "mdi-file-video", class: "icon-video-clean" };
    case "mp3": case "wav": case "ogg": return { icon: "mdi-file-music", class: "icon-audio-clean" };
    case "txt": case "log": case "md": return { icon: "mdi-file-document-outline", class: "icon-txt-clean" };
    default: return { icon: "mdi-file-outline", class: "icon-default-clean" };
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

function handleClick(item: any) {
  if (item.type === "folder") enterFolder(item);
  else selectedMap.value[item.id] = !selectedMap.value[item.id];
}

function handleDoubleClick(item: any) {
  if (isImageFile(item)) openPreview(item);
}

function openShareSettings(folder: any) {
  activeFolderForShare.value = folder;
  settingAllowUpload.value = !!folder.allow_upload;
  settingAllowedExtensions.value = folder.allowed_extensions || "";
  settingAllowDownload.value = folder.allow_download !== false;
  showShareSettingsDialog.value = true;
}

async function saveShareSettings() {
  if (!activeFolderForShare.value) return;
  try {
    await $api(`/folders/${activeFolderForShare.value.id}/share-settings`, {
      method: "PUT",
      body: {
        allow_upload: settingAllowUpload.value,
        allowed_extensions: settingAllowedExtensions.value,
        allow_download: settingAllowDownload.value,
      },
    });
    showShareSettingsDialog.value = false;
    snackbarText.value = "Pengaturan berhasil disimpan!";
    snackbar.value = true;
    fetchFolderContent(currentFolderId.value);
  } catch (err) {
    alert("Gagal menyimpan pengaturan.");
  }
}

async function shareItems(items: any[]) {
  const item = items[0];
  if (!item) return;
  try {
    const endpoint = item.type === "folder" ? `/folders/${item.id}/share` : `/files/${item.id}/share`;
    const res = (await $api(endpoint, { method: "POST" })) as any;
    if (res.link) {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(res.link);
      snackbarText.value = "Link berhasil disalin!";
      snackbar.value = true;
      fetchFolderContent(currentFolderId.value);
    }
  } catch (err) {
    alert("Gagal membagikan.");
  }
}

function confirmDelete(items: any[]) {
  if (!items.length) return;
  itemsToDelete.value = items;
  showDeleteDialog.value = true;
}

async function executeDelete() {
  try {
    await Promise.all(
      itemsToDelete.value.map((item) =>
        item.type === "folder" ? $api(`/folders/${item.id}`, { method: "DELETE" }) : $api(`/files/${item.id}`, { method: "DELETE" }),
      ),
    );
    showDeleteDialog.value = false;
    clearSelection();
    fetchFolderContent(currentFolderId.value);
    snackbarText.value = "Item berhasil dihapus.";
    snackbar.value = true;
  } catch (err) {
    alert("Gagal menghapus.");
  }
}

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
    alert("Gagal mendownload.");
  }
}

async function downloadSelectedItems(items: any[]) {
  for (const item of items) await handleDownload(item);
  snackbarText.value = `${items.length} item didownload.`;
  snackbar.value = true;
}

function openRenameDialog(item: any) {
  itemToRename.value = item;
  renameValue.value = item.name || item.original_name;
  showRenameDialog.value = true;
}

async function submitRename() {
  if (!renameValue.value || !itemToRename.value) return;
  try {
    const endpoint = itemToRename.value.type === "folder" ? `/folders/${itemToRename.value.id}/rename` : `/files/${itemToRename.value.id}/rename`;
    await $api(endpoint, { method: "PUT", body: { name: renameValue.value } });
    showRenameDialog.value = false;
    fetchFolderContent(currentFolderId.value);
    snackbarText.value = "Nama diubah.";
    snackbar.value = true;
  } catch (err) { alert("Gagal mengubah nama."); }
}

function createFolder() { showCreateDialog.value = true; }
async function submitCreateFolder() {
  if (!newFolderName.value) return;
  try {
    await $api("/folders", { method: "POST", body: { name: newFolderName.value, parent_id: currentFolderId.value } });
    showCreateDialog.value = false;
    newFolderName.value = "";
    fetchFolderContent(currentFolderId.value);
  } catch (err) { alert("Gagal membuat folder."); }
}

// Format Tanggal dan Waktu Presisi
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
    const uploadUrl = `${window.location.protocol}//${window.location.hostname}:8090/api/files/upload`;

    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i];
      if (!file) continue;
      const formData = new FormData();
      if (currentFolderId.value) formData.append("folder_id", String(currentFolderId.value));
      formData.append("fullPath", file.webkitRelativePath || file.name);
      formData.append("files", file);
      const currentItem = uploadProgress.value[i];

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && currentItem) currentItem.progress = Math.round((e.loaded / e.total) * 100);
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
          xhr.onerror = () => reject();
          xhr.send(formData);
        });
      } catch (err) {}
    }

    setTimeout(() => {
      showUploadDialog.value = false;
      fetchFolderContent(currentFolderId.value);
    }, 600);
  };
  input.click();
}

onMounted(() => fetchFolderContent());
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

.brand-badge {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.2);
}

.breadcrumb-box {
  background: #f1f5f9;
  font-size: 12.5px;
}
.crumb-item {
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}
.crumb-item:hover { color: #2563eb; background: #e2e8f0; }
.crumb-item.active { font-weight: 600; color: #2563eb; background: rgba(37, 99, 235, 0.08); }
.crumb-item.root { font-weight: 500; color: #334155; }

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

.bulk-action-bar {
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.file-row-item {
  border: 1px solid rgba(226, 232, 240, 0.7);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.file-row-item:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-0.5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}
.file-row-item.selected {
  background: rgba(37, 99, 235, 0.05) !important;
  border-color: rgba(37, 99, 235, 0.35) !important;
}

/* Desain Ikon Minimalis Profesional */
.file-icon-box {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}
.icon-folder-clean { background: #fef3c7; color: #d97706; }
.icon-pdf-clean { background: #fee2e2; color: #ef4444; }
.icon-excel-clean { background: #dcfce7; color: #16a34a; }
.icon-word-clean { background: #dbeafe; color: #2563eb; }
.icon-ppt-clean { background: #ffedd5; color: #ea580c; }
.icon-image-clean { background: #f3e8ff; color: #9333ea; }
.icon-zip-clean { background: #fef9c3; color: #ca8a04; }
.icon-app-clean { background: #e0f2fe; color: #0284c7; }
.icon-code-clean { background: #f1f5f9; color: #0d9488; }
.icon-video-clean { background: #fce7f3; color: #db2777; }
.icon-audio-clean { background: #ccfbbf; color: #059669; }
.icon-txt-clean { background: #f1f5f9; color: #475569; }
.icon-default-clean { background: #f1f5f9; color: #64748b; }

.item-title {
  font-size: 13.5px !important;
  letter-spacing: -0.1px;
  color: #1e293b;
}
.item-meta {
  font-size: 11px !important;
}

.item-badge {
  height: 18px !important;
  font-size: 9.5px !important;
}

.row-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}
.file-row-item:hover .row-actions {
  opacity: 1;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 8px; }
</style>