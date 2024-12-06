<script setup>
import { ref, computed, onMounted } from "vue";
import { PDFDocument } from "pdf-lib";
import draggable from "vuedraggable";
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const availableLocales = ['zh', 'en'];
const isDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);

const toggleLocale = () => {
  const currentIndex = availableLocales.indexOf(locale.value);
  const nextIndex = (currentIndex + 1) % availableLocales.length;
  locale.value = availableLocales[nextIndex];
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
};

// 初始化主题
onMounted(() => {
  document.documentElement.classList.toggle('dark', isDark.value);
});

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const pdfFiles = ref([]);
const uploading = ref(false);
const merging = ref(false);
const notification = ref({ show: false, message: "", type: "success" });
const sortBy = ref("name"); // 'name' or 'size'
const sortOrder = ref("asc"); // 'asc' or 'desc'

const formatFileSize = bytes => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const toggleSort = field => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortOrder.value = "asc";
  }
};

const sortedFiles = computed(() => {
  return [...pdfFiles.value].sort((a, b) => {
    const modifier = sortOrder.value === "asc" ? 1 : -1;
    if (sortBy.value === "name") {
      return modifier * a.name.localeCompare(b.name);
    } else if (sortBy.value === "size") {
      return modifier * (a.file.size - b.file.size);
    }
    return 0;
  });
});

const showNotification = (message, type = "success") => {
  notification.value = { show: true, message, type };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const handleFileUpload = async event => {
  const newFiles = event.target.files || event.dataTransfer.files;
  if (!newFiles.length) return;

  for (const file of newFiles) {
    if (file.type !== "application/pdf") {
      showNotification(t("notifications.uploadError.notPdf", { filename: file.name }), "error");
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      showNotification(t("notifications.uploadError.tooLarge", { filename: file.name }), "error");
      continue;
    }

    pdfFiles.value.push({
      id: Date.now() + Math.random(),
      name: file.name,
      file: file,
      size: file.size,
    });
    // showNotification(t('notifications.uploadSuccess', { filename: file.name }));
  }

  if (event.target.value) {
    event.target.value = "";
  }
};

const mergePDFs = async () => {
  if (!pdfFiles.value.length) return;

  try {
    merging.value = true;
    const mergedPdf = await PDFDocument.create();

    for (const pdfFile of pdfFiles.value) {
      const arrayBuffer = await pdfFile.file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfFile = await mergedPdf.save();
    const blob = new Blob([mergedPdfFile], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "merged.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(t("notifications.mergeSuccess"));
  } catch (error) {
    console.error("合并PDF时出错:", error);
    showNotification(t("notifications.mergeError"), "error");
  } finally {
    merging.value = false;
  }
};

const removeFile = index => {
  pdfFiles.value.splice(index, 1);
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('title') }}</h1>
          <div class="flex gap-2">
            <button
              @click="toggleLocale"
              class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-200 flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {{ t(`language.${availableLocales[(availableLocales.indexOf(locale) + 1) % availableLocales.length]}`) }}
            </button>
            <button
              @click="toggleTheme"
              class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-200 flex items-center gap-1"
            >
              <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {{ t(`theme.${isDark ? 'light' : 'dark'}`) }}
            </button>
          </div>
        </div>
        
        <div class="space-y-6">
          <!-- 通知组件 -->
          <div
            v-if="notification.show"
            class="fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-all duration-300"
            :class="{
              'bg-green-500 text-white': notification.type === 'success',
              'bg-red-500 text-white': notification.type === 'error'
            }"
          >
            {{ notification.message }}
          </div>

          <!-- 上传区域 -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div
              class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-200 cursor-pointer"
              @dragover.prevent
              @drop.prevent="handleFileUpload"
              @click="$refs.fileInput.click()"
            >
              <input
                type="file"
                ref="fileInput"
                @change="handleFileUpload"
                multiple
                accept="application/pdf"
                class="hidden"
              />
              <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">{{ t('upload.dropzone') }}</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('upload.supportText') }}</p>
            </div>
          </div>

          <!-- 文件列表 -->
          <div v-if="pdfFiles.length > 0" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300">{{ t('fileList.title') }}</h2>
              <div class="flex gap-2">
                <button 
                  @click="toggleSort('name')"
                  class="px-3 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  :class="{ 'bg-gray-200 dark:bg-gray-600': sortBy === 'name' }"
                >
                  {{ t('fileList.sortByName') }}
                  <span v-if="sortBy === 'name'" class="ml-1">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
                <button 
                  @click="toggleSort('size')"
                  class="px-3 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  :class="{ 'bg-gray-200 dark:bg-gray-600': sortBy === 'size' }"
                >
                  {{ t('fileList.sortBySize') }}
                  <span v-if="sortBy === 'size'" class="ml-1">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
              </div>
            </div>
            <draggable
              :list="sortedFiles"
              item-key="id"
              class="flex flex-col divide-y divide-gray-200 dark:divide-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 max-h-[400px] overflow-y-auto"
              ghost-class="opacity-50"
              @change="(e) => { pdfFiles.value = sortedFiles }"
            >
              <template #item="{ element, index }">
                <div class="group flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{{ index + 1 }}.</span>
                    <span class="text-sm text-gray-900 dark:text-white truncate flex-1">{{ element.name }}</span>
                    <span class="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">{{ formatFileSize(element.file.size) }}</span>
                  </div>
                  <button
                    @click="removeFile(index)"
                    class="ml-2 p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
                    :title="t('fileList.delete')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400 dark:text-red-500 hover:text-red-500 dark:hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </template>
            </draggable>
          </div>

          <!-- 合并按钮 -->
          <div v-if="pdfFiles.length > 1" class="flex justify-center">
            <button
              @click="mergePDFs"
              class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
              :disabled="merging"
            >
              {{ merging ? t('merge.processing') : t('merge.button') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
