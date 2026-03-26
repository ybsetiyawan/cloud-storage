<template>
  <v-container fluid class="pa-4">
    <div class="d-flex align-center mb-4">
      <div>
        <h2 class="text-h6 font-weight-bold mb-2">File Manager</h2>
        <div class="breadcrumb-pro">
          <div class="crumb root" @click="goRoot">
            <v-icon size="16">mdi-home-outline</v-icon>
            <span>Root</span>
          </div>
          <template v-for="(b, i) in displayBreadcrumbs" :key="i">
            <v-icon size="14" class="mx-1 text-medium-emphasis"
              >mdi-chevron-right</v-icon
            >
            <div v-if="b === '...'" class="crumb dots">...</div>
            <div
              v-else
              class="crumb"
              :class="{ active: i === displayBreadcrumbs.length - 1 }"
              @click="handleBreadcrumbClick(i)"
            >
              {{ b.name }}
            </div>
          </template>
        </div>
      </div>
      <v-spacer />
      <v-btn size="small" variant="tonal" class="mr-2" @click="createFolder"
        >Add Folder</v-btn
      >
      <v-btn size="small" variant="tonal" class="mr-2" @click="uploadFiles('folder')">
  <v-icon start>mdi-folder-upload</v-icon> Upload Folder
</v-btn>

<v-btn size="small" color="primary" @click="uploadFiles('file')">
  <v-icon start>mdi-file-upload</v-icon> Upload File
</v-btn>
    </div>

    <v-slide-y-transition>
      <div v-if="selectedItems.length" class="bulk-bar">
        <div>{{ selectedItems.length }} dipilih</div>
        <v-spacer />
        <v-btn size="small" color="red" @click="deleteItems(selectedItems)"
          >Hapus</v-btn
        >
        <v-btn size="small" variant="text" @click="clearSelection">Batal</v-btn>
      </div>
    </v-slide-y-transition>

    <v-card class="file-card" elevation="1">
      <div class="pa-3">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          placeholder="Cari file atau folder..."
          density="comfortable"
          variant="outlined"
          hide-details
        />
      </div>
      <v-divider />

      <div class="file-list custom-scrollbar">
        <div v-if="loading" class="text-center py-10">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <div
          v-else-if="filteredItems.length === 0"
          class="text-center py-10 text-medium-emphasis"
        >
          Tidak ada file atau folder
        </div>

        <div v-else>
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="file-row"
            :class="{ selected: isSelected(item) }"
            @click="handleClick(item)"
          >
            <div class="file-main">
              <v-checkbox
                v-model="selectedMap[item.id]"
                @click.stop
                density="compact"
                hide-details
                color="primary"
              />

              <div class="file-icon" :class="getIconConfig(item).class">
                <v-icon size="22">{{ getIconConfig(item).icon }}</v-icon>
              </div>
              <div class="file-text">
                <div class="d-flex align-center">
                  <div class="file-name-full text-truncate">
                    {{ item.name || item.original_name }}
                  </div>
                  <v-tooltip
                    v-if="item.is_public"
                    text="Link Shared Aktif"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <v-icon
                        v-bind="props"
                        size="16"
                        color="blue-darken-1"
                        class="ml-2"
                        >mdi-share-check</v-icon
                      >
                    </template>
                  </v-tooltip>
                </div>
                <div class="file-meta">
                  <v-chip
                    v-if="item.type !== 'folder'"
                    density="compact"
                    size="x-small"
                    variant="tonal"
                    class="mr-2 font-weight-bold"
                  >
                    {{ formatSize(item.size) }}
                  </v-chip>
                  <span
                    v-else
                    class="mr-2 text-orange-darken-3 font-weight-bold text-caption"
                    >Folder</span
                  >
                  <span class="text-grey-darken-1"
                    >| {{ formatDate(item.created_at) }}</span
                  >
                </div>
              </div>
            </div>

            <div class="file-actions">
              <v-btn
                icon
                size="small"
                variant="text"
                @click.stop="handleDownload(item)"
              >
                <v-icon size="18">mdi-download-outline</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                @click.stop="renameItem(item)"
              >
                <v-icon size="18">mdi-pencil</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                @click.stop="shareItems([item])"
              >
                <v-icon
                  size="18"
                  :color="item.is_public ? 'blue-darken-2' : ''"
                >
                  {{
                    item.is_public
                      ? "mdi-link-variant"
                      : "mdi-share-variant-outline"
                  }}
                </v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                @click.stop="deleteItems([item])"
              >
                <v-icon size="18">mdi-delete-outline</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <v-snackbar
      v-model="snackbar"
      color="success"
      timeout="2000"
      rounded="pill"
    >
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Tutup</v-btn>
      </template>
    </v-snackbar>

   <v-dialog v-model="showUploadDialog" max-width="500" persistent scrollable>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between py-3">
      <span class="text-subtitle-1 font-weight-bold">Uploading Files</span>
      <v-chip size="small" color="primary">{{ uploadProgress.length }} Files</v-chip>
    </v-card-title>
    
    <v-divider />

    <div class="pa-4 bg-grey-lighten-4">
      <div class="d-flex justify-space-between text-caption mb-1 font-weight-bold">
        <span>Total Progress</span>
        <span>{{ Math.round(overallProgress) }}%</span>
      </div>
      <v-progress-linear
        :model-value="overallProgress"
        height="10"
        color="success"
        striped
        rounded
      />
    </div>

    <v-divider />

    <v-card-text style="height: 300px;" class="pa-0">
      <v-list lines="one" class="pa-0">
        <v-list-item v-for="(f, idx) in uploadProgress" :key="idx" class="py-0 border-bottom">
          <template v-slot:prepend>
            <v-icon size="16" :color="f.progress === 100 ? 'success' : 'grey'">
              {{ f.progress === 100 ? 'mdi-check-circle' : 'mdi-file-upload-outline' }}
            </v-icon>
          </template>

          <v-list-item-title class="text-caption text-truncate" style="max-width: 250px;">
            {{ f.name }}
          </v-list-item-title>

          <template v-slot:append>
            <div style="width: 100px" class="ml-4 d-flex align-center">
              <v-progress-linear
                :model-value="f.progress"
                height="4"
                :color="f.progress === 100 ? 'success' : 'primary'"
                rounded
              />
              <span class="text-caption ml-2" style="min-width: 30px">{{ f.progress }}%</span>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <v-divider />
    <v-card-actions class="pa-3">
      <v-spacer />
      <span class="text-caption text-medium-emphasis">Mohon jangan tutup halaman ini...</span>
    </v-card-actions>
  </v-card>
</v-dialog>

    <v-dialog v-model="showCreateDialog" max-width="400">
      <v-card>
        <v-card-title>Buat Folder Baru</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFolderName"
            label="Nama Folder"
            autofocus
            variant="underlined"
            @keyup.enter="submitCreateFolder"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false">Batal</v-btn>
          <v-btn color="primary" @click="submitCreateFolder">Buat</v-btn>
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
const showUploadDialog = ref(false);
const uploadProgress = ref<{ name: string; progress: number }[]>([]);
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

function getIconConfig(item: any) {
  if (item.type === "folder")
    return { icon: "mdi-folder", class: "folder-icon" };
  const fileName = item.name || item.original_name || "";
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "apk":
      return { icon: "mdi-android", class: "icon-android" };
    case "enc":
      return { icon: "mdi-cog", class: "icon-enc" };
    case "pdf":
      return { icon: "mdi-file-pdf-box", class: "icon-pdf" };
    case "doc":
    case "docx":
      return { icon: "mdi-file-word", class: "icon-word" };
    case "xls":
    case "xlsx":
    case "csv":
      return { icon: "mdi-file-excel", class: "icon-excel" };
    case "ppt":
    case "pptx":
      return { icon: "mdi-file-powerpoint", class: "icon-ppt" };
    case "txt":
    case "rtf":
      return { icon: "mdi-file-document-edit", class: "icon-text" };
    case "mdf":
    case "ldf":
      return { icon: "mdi-database", class: "icon-database" };
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
    case "webp":
      return { icon: "mdi-image", class: "icon-image" };
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return { icon: "mdi-zip-box", class: "icon-archive" };
    case "sql":
    case "db":
    case "sqlite":
      return { icon: "mdi-database", class: "icon-db" };
    case "js":
    case "ts":
    case "html":
    case "css":
    case "json":
    case "php":
      return { icon: "mdi-code-json", class: "icon-code" };
    case "exe":
    case "msi":
      return { icon: "mdi-application-cog", class: "icon-app" };
    case "bat":
    case "sh":
    case "cmd":
      return { icon: "mdi-console-line", class: "icon-script" };
    case "mp4":
    case "mkv":
    case "avi":
    case "mov":
      return { icon: "mdi-video", class: "icon-video" };
    case "mp3":
    case "wav":
    case "ogg":
      return { icon: "mdi-music", class: "icon-audio" };
    default:
      return { icon: "mdi-file-document-outline", class: "file-icon-bg" };
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

async function shareItems(items: any[]) {
  const item = items[0];
  if (!item) return;
  try {
    const endpoint =
      item.type === "folder"
        ? `/folders/${item.id}/share`
        : `/files/${item.id}/share`;
    const res = (await $api(endpoint, { method: "POST" })) as any;
    if (res.link) {
      await navigator.clipboard.writeText(res.link);
      snackbarText.value = "Link berhasil disalin!";
      snackbar.value = true;
      fetchFolderContent(currentFolderId.value);
    }
  } catch (err) {
    alert("Gagal membagikan item.");
  }
}

async function deleteItems(items: any[]) {
  if (!confirm(`Hapus ${items.length} item?`)) return;
  try {
    await Promise.all(
      items.map((item) =>
        item.type === "folder"
          ? $api(`/folders/${item.id}`, { method: "DELETE" })
          : $api(`/files/${item.id}`, { method: "DELETE" }),
      ),
    );
    fetchFolderContent(currentFolderId.value);
  } catch (err) {
    alert("Gagal menghapus item.");
  }
}

async function renameItem(item: any) {
  const oldName = item.name || item.original_name;
  const newName = prompt("Nama baru:", oldName);
  if (!newName || newName === oldName) return;
  try {
    const endpoint =
      item.type === "folder"
        ? `/folders/${item.id}/rename`
        : `/files/${item.id}/rename`;
    await $api(endpoint, { method: "PUT", body: { name: newName } });
    fetchFolderContent(currentFolderId.value);
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
function uploadFiles(mode = 'file') { // Tambahkan parameter mode
  const input = document.createElement("input");
  input.type = "file";
  
  if (mode === 'folder') {
    // @ts-ignore
    input.webkitdirectory = true;
  } else {
    input.multiple = true; // Untuk upload banyak file sekaligus tanpa folder
  }

  input.onchange = async () => {
    if (!input.files || input.files.length === 0) return;
    const filesArr = Array.from(input.files);
    
    uploadProgress.value = filesArr.map((f) => ({ 
      name: f.webkitRelativePath || f.name, 
      progress: 0 
    }));
    
    showUploadDialog.value = true;
    const token = localStorage.getItem("admin_token");

    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i];
      if (!file) continue;

      const formData = new FormData();
      if (currentFolderId.value) {
        formData.append("folder_id", String(currentFolderId.value));
      }

      // LOGIKA PENTING:
      // Jika upload file biasa, webkitRelativePath akan kosong. 
      // Kita gunakan file.name agar backend tahu ini di root folder saat ini.
      const relativePath = file.webkitRelativePath || file.name;
      formData.append("fullPath", relativePath); 
      formData.append("files", file);

      const currentItem = uploadProgress.value[i];

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "http://localhost:8090/api/files/upload");
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


async function handleDownload(item: any) {
  // Jika folder pakai /download, jika file HANYA pakai ID (sesuai backend)
  const endpoint = item.type === "folder" 
    ? `/folders/${item.id}/download` 
    : `/files/${item.id}`; // Hapus /download di sini

  try {
    const response = await $api<Blob>(endpoint, {
      method: "GET",
      responseType: "blob",
    }) as Blob;

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

onMounted(() => fetchFolderContent());
</script>

<style scoped>
.file-card {
  height: 72vh;
  display: flex;
  flex-direction: column;
}
.file-list {
  flex: 1;
  overflow-y: auto;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 10px;
}
.bulk-bar {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  margin-bottom: 10px;
  font-size: 13px;
}
.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: 0.15s;
}
.file-row:hover {
  background: #f9fafb;
}
.file-row.selected {
  background: #e3f2fd !important;
  border-left: 4px solid #1976d2;
}
.file-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.file-text {
  flex: 1;
  min-width: 0;
}
.file-name-full {
  font-weight: 600;
  font-size: 14px;
  color: #2c3e50;
}
.file-meta {
  font-size: 11px;
  color: #777;
  margin-top: 2px;
}
.file-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}
.folder-icon {
  background: #fff7ed;
  color: #ea580c;
}
.file-icon-bg {
  background: #f1f3f5;
  color: #475569;
}
.icon-pdf {
  background: #fef2f2;
  color: #dc2626;
}
.icon-word {
  background: #eff6ff;
  color: #2563eb;
}
.icon-excel {
  background: #f0fdf4;
  color: #16a34a;
}
.icon-image {
  background: #faf5ff;
  color: #9333ea;
}
.icon-archive {
  background: #fefce8;
  color: #ca8a04;
}
.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: 0.2s;
}
.file-row:hover .file-actions {
  opacity: 1;
}
.breadcrumb-pro {
  display: flex;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
  padding-bottom: 4px;
}
.crumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.crumb:hover {
  background: #f1f3f5;
}
.crumb.active {
  background: #ede9fe;
  color: #5b21b6;
  font-weight: 600;
}
.icon-db {
  background: #e0f2fe;
  color: #0369a1;
}
.icon-code {
  background: #fef3c7;
  color: #b45309;
}
.icon-app {
  background: #fee2e2;
  color: #b91c1c;
}
.icon-script {
  background: #f1f5f9;
  color: #0f172a;
}
.icon-video {
  background: #ecfeff;
  color: #0891b2;
}
.icon-audio {
  background: #fdf4ff;
  color: #a21caf;
}
.icon-ppt {
  background: #fff7ed;
  color: #c2410c;
}
.icon-text {
  background: #f8fafc;
  color: #64748b;
}
.icon-android {
  background: #f8fafc;
  color: #089b20;
}
.icon-enc {
  background: #f8fafc;
  color: #717772;
}
.icon-database {
  background: #f8fafc;
  color: #b443ab;
}
</style>
