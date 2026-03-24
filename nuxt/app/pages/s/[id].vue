<template>
  <v-app>
    <v-main class="bg-grey-lighten-4">
      <v-container class="py-10">
        
        <div v-if="pending" class="text-center py-10">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="mt-4 text-grey text-caption">Menyiapkan berkas...</p>
        </div>

        <v-card v-else-if="error || !data" max-width="500" class="mx-auto text-center pa-10" rounded="xl" elevation="1">
          <v-icon size="80" color="red-lighten-3">mdi-alert-circle-outline</v-icon>
          <h2 class="text-h6 mt-4 font-weight-bold">Akses Terputus</h2>
          <p class="text-body-2 text-grey-darken-1 mt-2">Link ini sudah tidak aktif atau berkas telah dipindahkan.</p>
          <v-btn color="primary" class="mt-6" to="/" variant="flat" rounded="pill">Beranda</v-btn>
        </v-card>

        <v-card v-else max-width="1000" class="mx-auto" rounded="lg" elevation="1">
          <v-toolbar color="white" flat border>
            <div class="ml-4">
              <div class="text-subtitle-1 font-weight-bold d-flex align-center">
                <v-icon size="20" color="primary" class="mr-2">mdi-share-variant</v-icon>
                Shared Content
              </div>
              <div class="text-caption text-grey d-flex align-center">
                <span class="cursor-pointer hover-underline" @click="currentFolderId = null">Root</span>
                <span v-if="currentPathName" class="d-flex align-center">
                  <v-icon size="14">mdi-chevron-right</v-icon>
                  <span class="text-primary font-weight-bold">{{ currentPathName }}</span>
                </span>
              </div>
            </div>
            <v-spacer />
            <v-btn color="primary" variant="tonal" class="mr-4" prepend-icon="mdi-download-multiple" @click="handleMainDownload">
              Download All
            </v-btn>
          </v-toolbar>

          <v-divider />

          <div class="file-list-container">
            <template v-if="data.type === 'folder'">
              <div v-if="displayItems.length === 0" class="pa-16 text-center text-grey">
                <v-icon size="48" class="mb-2">mdi-folder-open-outline</v-icon>
                <div>Folder ini kosong</div>
              </div>
              
              <div v-for="item in displayItems" :key="item.id" class="file-row" @click="handleItemClick(item)">
                <div class="file-main">
                  <div class="file-icon" :class="item.type === 'folder' ? 'folder-icon' : getIconConfig(item).class">
                    <v-icon size="22">{{ item.type === 'folder' ? 'mdi-folder' : getIconConfig(item).icon }}</v-icon>
                  </div>
                  <div class="file-text">
                    <div class="file-name-full">{{ item.name }}</div>
                    <div class="file-meta">
                      <v-chip v-if="item.type !== 'folder'" density="compact" size="x-small" variant="tonal" class="mr-2 font-weight-bold">
                        {{ formatSize(item.size) }}
                      </v-chip>
                      <span v-else class="mr-2 text-orange-darken-3 font-weight-bold text-caption">Folder</span>
                    </div>
                  </div>
                </div>

                <div class="file-actions">
                  <v-btn icon size="small" variant="text" @click.stop="downloadItem(item)">
                    <v-icon size="20" color="grey-darken-1">mdi-download-outline</v-icon>
                  </v-btn>
                </div>
              </div>
            </template>

            <div v-else class="pa-16 text-center">
              <div class="d-flex justify-center mb-4">
                <div class="file-icon large-icon" :class="getIconConfig(data).class">
                  <v-icon size="48">{{ getIconConfig(data).icon }}</v-icon>
                </div>
              </div>
              <h3 class="text-h6 font-weight-bold">{{ data.name }}</h3>
              <p class="text-body-2 text-grey-darken-1 mb-6">{{ formatSize(data.size) }}</p>
              <v-btn color="primary" size="large" prepend-icon="mdi-download" @click="handleMainDownload" rounded="lg">
                Download File
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, auth: false });

const route = useRoute();
const shareId = route.params.id;

// State untuk navigasi subfolder
const currentFolderId = ref<string | null>(null);
const currentPathName = ref<string | null>(null);

// Fetch data utama
const { data, pending, error } = await useFetch<any>(`http://localhost:8090/api/public/share-info/${shareId}`);

// Computed items untuk menangani tampilan root vs subfolder
const displayItems = computed(() => {
  if (!data.value || data.value.type !== 'folder') return [];
  
  // Jika sedang di root link share
  if (!currentFolderId.value) return data.value.children || [];
  
  // Jika di dalam subfolder (logic ini bisa dikembangkan dengan API sub-folder-content)
  return data.value.children.filter((item: any) => item.folder_id == currentFolderId.value);
});

function handleItemClick(item: any) {
  if (item.type === 'folder') {
    currentFolderId.value = item.id;
    currentPathName.value = item.name;
  }
}

function downloadItem(item: any) {
  // Jika yang diklik adalah folder di dalam list
  if (item.type === 'folder') {
    // Kita butuh share_id folder tersebut. 
    // Jika tidak ada, kita arahkan ke sistem download ZIP folder berdasarkan ID (perlu route baru)
    // Tapi untuk sementara, gunakan logic share_id jika tersedia:
    if (item.share_id) {
      window.open(`http://localhost:8090/sf/${item.share_id}`, '_blank');
    } else {
      alert('Fitur download sub-folder langsung sedang disiapkan.');
    }
  } else {
    // UNTUK FILE: 
    // Karena route /s/:shareId di server.js Anda mencari berdasarkan share_id,
    // maka kita harus mengirimkan share_id-nya, BUKAN ID-nya.
    if (item.share_id) {
      window.open(`http://localhost:8090/s/${item.share_id}`, '_blank');
    } else {
      // Jika file di dalam folder tidak punya share_id sendiri, 
      // Anda butuh endpoint download public via ID (Lihat revisi server.js di bawah)
      window.open(`http://localhost:8090/api/public/download-file/${item.id}`, '_blank');
    }
  }
}

function handleMainDownload() {
  if (!data.value) return;
  // Ini untuk tombol "Download All" di header (menggunakan shareId dari URL Nuxt)
  const endpoint = data.value.type === 'folder' ? 'sf' : 's';
  window.location.href = `http://localhost:8090/${endpoint}/${shareId}`;
}



// Helpers (Identik dengan Dashboard)
function formatSize(bytes: any) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getIconConfig(item: any) {
  const ext = item.name?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return { icon: 'mdi-file-pdf-box', class: 'icon-pdf' };
    case 'xls': case 'xlsx': return { icon: 'mdi-file-excel', class: 'icon-excel' };
    case 'png': case 'jpg': return { icon: 'mdi-image', class: 'icon-image' };
    case 'zip': return { icon: 'mdi-zip-box', class: 'icon-archive' };
    default: return { icon: 'mdi-file-document-outline', class: 'file-icon-bg' };
  }
}
</script>

<style scoped>
.file-list-container { background: white; min-height: 300px; }

.file-row {
  display: flex; align-items: center; padding: 12px 20px;
  border-bottom: 1px solid #f1f3f5; cursor: pointer; transition: .2s;
}
.file-row:hover { background: #f8fafc; }

.file-main { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
.file-text { flex: 1; min-width: 0; }
.file-name-full { 
  font-weight: 600; font-size: 14px; color: #334155; 
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.file-meta { display: flex; align-items: center; margin-top: 2px; }

.file-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.large-icon { width: 80px; height: 80px; border-radius: 20px; }

/* Colors - Identik dengan Dashboard */
.folder-icon { background: #fff7ed; color: #ea580c; }
.icon-pdf { background: #fef2f2; color: #dc2626; }
.icon-excel { background: #f0fdf4; color: #16a34a; }
.icon-image { background: #faf5ff; color: #9333ea; }
.icon-archive { background: #fffbeb; color: #d97706; }
.file-icon-bg { background: #f8fafc; color: #64748b; }

.cursor-pointer { cursor: pointer; }
.hover-underline:hover { text-decoration: underline; }
</style>

