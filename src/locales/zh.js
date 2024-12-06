export default {
  language: {
    en: '英文',
    zh: '中文'
  },
  theme: {
    dark: '暗黑模式',
    light: '明亮模式'
  },
  title: 'PDF 合并工具',
  upload: {
    dropzone: '点击选择或拖拽文件到这里',
    supportText: '支持多个PDF文件，单个文件大小不超过50MB',
  },
  fileList: {
    title: '文件列表（拖拽调整顺序）',
    sortByName: '按名称排序',
    sortBySize: '按大小排序',
    delete: '删除'
  },
  merge: {
    button: '合并PDF',
    processing: '合并中...'
  },
  notifications: {
    uploadSuccess: '{filename} 上传成功',
    uploadError: {
      notPdf: '{filename} 不是PDF文件',
      tooLarge: '{filename} 超过50MB大小限制'
    },
    mergeSuccess: 'PDF合并成功！',
    mergeError: 'PDF合并失败，请重试'
  }
}
