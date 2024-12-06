<script setup>
import { ref, computed } from "vue";
import { PDFDocument } from "pdf-lib";
import draggable from "vuedraggable";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const pdfFiles = ref([]);
const uploading = ref(false);
const merging = ref(false);
const notification = ref({ show: false, message: "", type: "success" });
const sortBy = ref('name'); // 'name' or 'size'
const sortOrder = ref('asc'); // 'asc' or 'desc'

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const toggleSort = (field) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = field;
    sortOrder.value = 'asc';
  }
};

const sortedFiles = computed(() => {
  return [...pdfFiles.value].sort((a, b) => {
    const modifier = sortOrder.value === 'asc' ? 1 : -1;
    if (sortBy.value === 'name') {
      return modifier * a.name.localeCompare(b.name);
    } else if (sortBy.value === 'size') {
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
      showNotification(`${file.name} 不是PDF文件`, "error");
      continue;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      showNotification(`${file.name} 超过50MB大小限制`, "error");
      continue;
    }

    pdfFiles.value.push({
      id: Date.now() + Math.random(),
      name: file.name,
      file: file,
      size: file.size
    });
    showNotification(`${file.name} 上传成功`);
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
    showNotification("PDF合并成功！");
  } catch (error) {
    console.error("合并PDF时出错:", error);
    showNotification("PDF合并失败，请重试", "error");
  } finally {
    merging.value = false;
  }
};

const removeFile = index => {
  pdfFiles.value.splice(index, 1);
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">PDF 合并工具</h1>
        
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
          <div class="bg-gray-50 rounded-lg p-4">
            <div
              class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors duration-200 cursor-pointer"
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
              <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="mt-4 text-sm font-medium text-gray-900">点击选择或拖拽文件到这里</p>
              <p class="mt-1 text-xs text-gray-500">支持多个PDF文件，单个文件大小不超过50MB</p>
            </div>
          </div>

          <!-- 文件列表 -->
          <div v-if="pdfFiles.length > 0" class="bg-gray-50 rounded-lg p-4">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold text-gray-700">文件列表（拖拽调整顺序）</h2>
              <div class="flex gap-2">
                <button 
                  @click="toggleSort('name')"
                  class="px-3 py-1 text-sm rounded hover:bg-gray-200 transition-colors"
                  :class="{ 'bg-gray-200': sortBy === 'name' }"
                >
                  按名称排序
                  <span v-if="sortBy === 'name'" class="ml-1">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
                <button 
                  @click="toggleSort('size')"
                  class="px-3 py-1 text-sm rounded hover:bg-gray-200 transition-colors"
                  :class="{ 'bg-gray-200': sortBy === 'size' }"
                >
                  按大小排序
                  <span v-if="sortBy === 'size'" class="ml-1">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </button>
              </div>
            </div>
            <draggable
              :list="sortedFiles"
              item-key="id"
              class="flex flex-col divide-y border rounded-lg overflow-hidden bg-white max-h-[400px] overflow-y-auto"
              ghost-class="opacity-50"
              @change="(e) => { pdfFiles.value = sortedFiles }"
            >
              <template #item="{ element, index }">
                <div class="group flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-grab active:cursor-grabbing">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="text-sm text-gray-500 flex-shrink-0">{{ index + 1 }}.</span>
                    <span class="text-sm text-gray-900 truncate flex-1">{{ element.name }}</span>
                    <span class="text-sm bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium whitespace-nowrap">{{ formatFileSize(element.file.size) }}</span>
                  </div>
                  <button
                    @click="removeFile(index)"
                    class="ml-2 p-1.5 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
                    title="删除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="merging"
            >
              {{ merging ? "合并中..." : "合并PDF" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
