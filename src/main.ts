/// <reference path="../typings/naimo.d.ts" />

import './style.css';
import 'cropperjs/dist/cropper.css';
import Cropper from 'cropperjs';

// ==================== 类型定义 ====================

interface ImageData {
  type: 'img';
  data: string;
  originalFile?: {
    name: string;
    path: string;
    size: number;
  };
}

// ==================== 全局变量 ====================

let cropper: Cropper | null = null;
let borderRadius = 0;
const availableSizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];
let selectedSizes = [16, 32, 64, 128, 256];
let resizeObserver: ResizeObserver | null = null;
let isDraggingImage = false;
let currentViewMode: 0 | 1 = 0; // 0: 自由模式, 1: 限制模式
let savedCropperState: { canvasData: any; cropBoxData: any; } | null = null; // 保存的裁剪器状态

// ==================== 热重载 ====================
if (import.meta.hot) {
  import.meta.hot.on('preload-changed', async (data) => {
    console.log('📝 检测到 preload 变化:', data);
    console.log('🔨 正在触发 preload 构建...');
    try {
      const response = await fetch('/__preload_build');
      const result = await response.json();
      if (result.success) {
        console.log('✅ Preload 构建完成');
        await window.naimo.hot()
        console.log('🔄 Preload 热重载完成');
        location.reload()
      } else {
        console.error('❌ Preload 构建失败');
      }
    } catch (error) {
      console.error('❌ 触发 preload 构建失败:', error);
    }
  })
}

// ==================== 工具函数 ====================

/**
 * Debounce 函数
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 初始化裁剪器
 */
function initCropper(imageUrl: string) {
  const cropperImage = document.getElementById('cropperImage') as HTMLImageElement;
  if (!cropperImage) return;

  // 销毁旧的裁剪器
  if (cropper) {
    cropper.destroy();
  }

  // 设置图片源
  cropperImage.src = imageUrl;

  // 创建新的裁剪器
  cropper = new Cropper(cropperImage, {
    aspectRatio: 1,
    viewMode: currentViewMode,  // 使用当前的 viewMode
    dragMode: 'move',
    autoCropArea: 0,  // 不自动设置裁剪区域，在 ready 中手动设置
    responsive: false,  // 关闭响应式，手动控制
    center: true,
    highlight: false,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
    ready() {
      // 如果有保存的状态（切换模式时），恢复它
      if (savedCropperState && cropper) {
        cropper.setCanvasData(savedCropperState.canvasData);
        cropper.setCropBoxData(savedCropperState.cropBoxData);
        savedCropperState = null; // 清除保存的状态
      } else {
        // 应用裁剪框布局（居中，容器较小边的 76%）
        applyCropBoxLayout();
      }
      resizePreviewCanvas();
      // 更新裁剪模式按钮图标
      updateViewModeIcon();
    },
    cropstart: () => {
      isDraggingImage = true;
    },
    cropend: () => {
      isDraggingImage = false;
      updatePreview();
    },
    zoom: debounceUpdatePreview
  });
}

/**
 * 切换裁剪模式
 */
function toggleViewMode() {
  if (!cropper) return;

  // 保存当前的裁剪框和画布状态
  savedCropperState = {
    canvasData: cropper.getCanvasData(),
    cropBoxData: cropper.getCropBoxData()
  };

  // 切换模式
  currentViewMode = currentViewMode === 0 ? 1 : 0;

  // 重新初始化 cropper
  const cropperImage = document.getElementById('cropperImage') as HTMLImageElement;
  const imageUrl = cropperImage?.src;
  if (imageUrl) {
    initCropper(imageUrl);
  }

  // 更新按钮图标
  updateViewModeIcon();
}

/**
 * 更新裁剪模式按钮图标
 */
function updateViewModeIcon() {
  const freeMode = document.getElementById('freeMode');
  const restrictMode = document.getElementById('restrictMode');

  if (freeMode && restrictMode) {
    if (currentViewMode === 0) {
      freeMode.classList.remove('hidden');
      restrictMode.classList.add('hidden');
    } else {
      freeMode.classList.add('hidden');
      restrictMode.classList.remove('hidden');
    }
  }
}

/**
 * 计算并应用裁剪框的初始位置和大小
 * 在 Cropper ready 时调用，此时可以正确设置裁剪框
 */
function applyCropBoxLayout() {
  if (!cropper) return;

  const cropperImage = document.getElementById('cropperImage') as HTMLImageElement;
  const container = cropperImage?.parentElement;
  if (!container) return;

  // 获取容器尺寸
  const containerHeight = container.clientHeight;
  const containerWidth = container.clientWidth;

  console.log('applyCropBoxLayout: 容器尺寸', containerWidth, containerHeight);

  // 裁剪框大小为容器较小边的 76%
  const containerMinSize = Math.min(containerWidth, containerHeight);
  const cropBoxSize = containerMinSize * 0.76;

  // 计算裁剪框居中位置
  const cropBoxLeft = (containerWidth - cropBoxSize) / 2;
  const cropBoxTop = (containerHeight - cropBoxSize) / 2;

  console.log('applyCropBoxLayout: 裁剪框', {
    left: cropBoxLeft,
    top: cropBoxTop,
    size: cropBoxSize
  });

  // 获取图片尺寸
  const imageData = cropper.getImageData();
  const imgWidth = imageData.naturalWidth;
  const imgHeight = imageData.naturalHeight;
  const imgAspectRatio = imgWidth / imgHeight;

  // 计算画布大小（让图片完整显示）
  let canvasWidth, canvasHeight;
  if (imgAspectRatio > 1) {
    canvasHeight = cropBoxSize;
    canvasWidth = cropBoxSize * imgAspectRatio;
  } else {
    canvasWidth = cropBoxSize;
    canvasHeight = cropBoxSize / imgAspectRatio;
  }

  // 计算画布居中位置
  const canvasLeft = (containerWidth - canvasWidth) / 2;
  const canvasTop = (containerHeight - canvasHeight) / 2;

  // 启用裁剪框（因为初始化时设置了 autoCropArea: 0）
  cropper.crop();

  // 设置画布
  cropper.setCanvasData({
    left: canvasLeft,
    top: canvasTop,
    width: canvasWidth,
    height: canvasHeight
  });

  // 设置裁剪框（正方形，居中）
  cropper.setCropBoxData({
    left: cropBoxLeft,
    top: cropBoxTop,
    width: cropBoxSize,
    height: cropBoxSize
  });

  console.log('applyCropBoxLayout: 最终裁剪框数据', cropper.getCropBoxData());
}

/**
 * Resize 时重新初始化 Cropper
 */
function setCropperCanvasSize() {
  if (!cropper) return;

  const cropperImage = document.getElementById('cropperImage') as HTMLImageElement;
  if (!cropperImage || !cropperImage.src) return;

  console.log('setCropperCanvasSize: 开始重新初始化 Cropper');

  // 保存当前图片 URL
  const currentImageUrl = cropperImage.src;

  // 完全重新初始化 Cropper
  initCropper(currentImageUrl);
}

/**
 * 设置 ResizeObserver 监听容器尺寸变化
 */
function setupResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  const cropperImage = document.getElementById('cropperImage');
  const cropperContainer = cropperImage?.parentElement;
  const previewCanvas = document.getElementById('previewCanvas');
  const previewContainer = previewCanvas?.parentElement;

  let lastCropperSize = { width: cropperContainer?.clientWidth || 0, height: cropperContainer?.clientHeight || 0 };
  let lastPreviewSize = { width: previewContainer?.clientWidth || 0, height: previewContainer?.clientHeight || 0 };

  resizeObserver = new ResizeObserver(debounce((entries) => {
    for (const entry of entries) {
      if (entry.target === cropperContainer) {
        // 同时检查容器宽度和高度的变化
        const currentWidth = cropperContainer?.clientWidth || 0;
        const currentHeight = cropperContainer?.clientHeight || 0;
        if (cropper && (Math.abs(currentWidth - lastCropperSize.width) > 2 || Math.abs(currentHeight - lastCropperSize.height) > 2)) {
          lastCropperSize = { width: currentWidth, height: currentHeight };
          console.log('ResizeObserver: 容器尺寸变化', currentWidth, currentHeight);
          // 使用 requestAnimationFrame 确保在下一帧执行，让 DOM 完全更新
          requestAnimationFrame(() => {
            setCropperCanvasSize();
            updatePreview();
          });
        }
      } else if (entry.target === previewContainer) {
        // 只有当容器尺寸真正变化时才调整
        const currentWidth = previewContainer?.clientWidth || 0;
        const currentHeight = previewContainer?.clientHeight || 0;
        if (Math.abs(currentWidth - lastPreviewSize.width) > 2 || Math.abs(currentHeight - lastPreviewSize.height) > 2) {
          lastPreviewSize = { width: currentWidth, height: currentHeight };
          resizePreviewCanvas();
        }
      }
    }
  }, 100));

  if (cropperContainer) {
    resizeObserver.observe(cropperContainer);
  }
  if (previewContainer) {
    resizeObserver.observe(previewContainer);
  }
}

/**
 * 带 debounce 的更新预览（用于缩放）
 */
const debounceUpdatePreview = debounce(() => {
  if (!isDraggingImage) {
    updatePreview();
  }
}, 1000);


/**
 * 生成指定尺寸的图标
 */
function generateIcon(sourceCanvas: HTMLCanvasElement, targetSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;

  // 应用圆角
  if (borderRadius > 0) {
    const r = (borderRadius / 100) * (targetSize / 2);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(targetSize - r, 0);
    ctx.quadraticCurveTo(targetSize, 0, targetSize, r);
    ctx.lineTo(targetSize, targetSize - r);
    ctx.quadraticCurveTo(targetSize, targetSize, targetSize - r, targetSize);
    ctx.lineTo(r, targetSize);
    ctx.quadraticCurveTo(0, targetSize, 0, targetSize - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);

  return canvas;
}

/**
 * 调整预览canvas尺寸为1:1
 */
function resizePreviewCanvas() {
  const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
  if (!previewCanvas) return;

  const container = previewCanvas.parentElement;
  if (!container) return;

  // 获取容器尺寸
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // 取较小值作为canvas的边长，保持1:1
  const size = Math.min(containerWidth, containerHeight);

  // 只有当尺寸真正变化时才修改（避免循环触发）
  if (Math.abs(previewCanvas.width - size) > 2) {
    // 设置canvas尺寸
    previewCanvas.width = size;
    previewCanvas.height = size;

    // 更新预览内容
    updatePreview();
  }
}

/**
 * 更新预览
 */
function updatePreview() {
  if (!cropper) return;

  const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
  if (!previewCanvas) return;

  const previewSize = previewCanvas.width;
  if (previewSize === 0) return;

  // 获取裁剪后的画布
  const croppedCanvas = cropper.getCroppedCanvas({
    width: previewSize,
    height: previewSize
  });

  if (!croppedCanvas) return;

  const ctx = previewCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, previewSize, previewSize);

  ctx.save();
  if (borderRadius > 0) {
    const r = (borderRadius / 100) * (previewSize / 2);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(previewSize - r, 0);
    ctx.quadraticCurveTo(previewSize, 0, previewSize, r);
    ctx.lineTo(previewSize, previewSize - r);
    ctx.quadraticCurveTo(previewSize, previewSize, previewSize - r, previewSize);
    ctx.lineTo(r, previewSize);
    ctx.quadraticCurveTo(0, previewSize, 0, previewSize - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();
  }
  ctx.drawImage(croppedCanvas, 0, 0, previewSize, previewSize);
  ctx.restore();

  // 生成所有尺寸的图标
  generateAllIcons();
}

/**
 * 生成所有选中尺寸的图标
 */
function generateAllIcons() {
  if (!cropper) return;

  // 获取高分辨率的裁剪画布
  const sourceCanvas = cropper.getCroppedCanvas({
    width: 1024,
    height: 1024
  });

  if (!sourceCanvas) return;

  selectedSizes.forEach(size => {
    const canvas = document.getElementById(`icon-${size}`) as HTMLCanvasElement;
    if (!canvas) return;

    const iconCanvas = generateIcon(sourceCanvas, size);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(iconCanvas, 0, 0);
  });
}

/**
 * 处理图片上传
 */
async function handleImageUpload(imageData: string) {
  try {
    // 显示工作页面
    showWorkPage();

    // 等待 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 100));

    // 初始化裁剪器
    initCropper(imageData);

    // 3秒后隐藏提示
    hideHintAfterDelay();

    await naimo.log.info('图片加载成功');
  } catch (error) {
    console.error('图片加载失败:', error);
    await naimo.log.error('图片加载失败', error);
    await naimo.system.notify('图片加载失败', '错误');
  }
}

/**
 * 显示工作页面
 */
function showWorkPage() {
  const uploadPage = document.getElementById('uploadPage');
  const workPage = document.getElementById('workPage');
  if (uploadPage) uploadPage.style.display = 'none';
  if (workPage) workPage.style.display = 'grid';
}

/**
 * 隐藏裁剪提示（3秒后自动隐藏）
 */
function hideHintAfterDelay() {
  const hint = document.getElementById('cropperHint');
  if (hint) {
    // 初始显示状态
    hint.style.opacity = '1';
    hint.style.transition = 'opacity 0.5s ease-out';

    // 3秒后开始淡出
    setTimeout(() => {
      hint.style.opacity = '0';
      // 淡出动画完成后隐藏元素
      setTimeout(() => {
        hint.style.display = 'none';
      }, 500);
    }, 3000);
  }
}

/**
 * 复制图片到剪贴板
 */
async function copyImageToClipboard() {
  if (!cropper) {
    await naimo.system.notify('请先上传图片', '提示');
    return;
  }

  try {
    // 获取当前预览的图片（带圆角效果）
    const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    if (!previewCanvas) {
      await naimo.system.notify('无法获取预览图片', '错误');
      return;
    }

    // 将canvas转换为base64
    const imageData = previewCanvas.toDataURL('image/png');

    // 复制到剪贴板
    const success = await naimo.clipboard.writeImage(imageData);

    if (success) {
      await naimo.system.notify('图片已复制到剪贴板', '成功');
      await naimo.log.info('图片已复制到剪贴板');
    } else {
      await naimo.system.notify('复制失败', '错误');
    }
  } catch (error) {
    console.error('复制图片失败:', error);
    await naimo.log.error('复制图片失败', error);
    await naimo.system.notify('复制失败', '错误');
  }
}

/**
 * 下载单个图标
 */
function downloadIcon(size: number) {
  const canvas = document.getElementById(`icon-${size}`) as HTMLCanvasElement;
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = `icon-${size}x${size}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 下载所有图标
 */
function downloadAllIcons() {
  selectedSizes.forEach((size, index) => {
    setTimeout(() => {
      downloadIcon(size);
    }, 100 * index);
  });
  naimo.system.notify('图标下载完成！', '成功');
}

/**
 * 切换尺寸选择
 */
function toggleSize(size: number) {
  const index = selectedSizes.indexOf(size);
  if (index > -1) {
    selectedSizes.splice(index, 1);
  } else {
    selectedSizes.push(size);
  }
  selectedSizes.sort((a, b) => a - b);
  updateSizeSelection();
  updatePreview();
}

/**
 * 全选/取消全选
 */
function toggleAllSizes() {
  if (selectedSizes.length === availableSizes.length) {
    selectedSizes = [];
  } else {
    selectedSizes = [...availableSizes];
  }
  updateSizeSelection();
  updatePreview();
}

/**
 * 更新尺寸选择 UI
 */
function updateSizeSelection() {
  availableSizes.forEach(size => {
    const checkbox = document.getElementById(`size-${size}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = selectedSizes.includes(size);
    }
  });

  // 更新全选按钮文本
  const toggleBtn = document.getElementById('toggleAllBtn');
  if (toggleBtn) {
    toggleBtn.textContent = selectedSizes.length === availableSizes.length ? '取消全选' : '全选';
  }

  // 重新生成图标
  if (cropper) {
    generateAllIcons();
  }
}

/**
 * 触发文件选择
 */
function triggerFileInput() {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  if (fileInput) {
    fileInput.click();
  }
}

/**
 * 处理文件选择
 */
async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      handleImageUpload(dataUrl);
    };
    reader.readAsDataURL(file);
  }
}

/**
 * 处理粘贴事件
 */
async function handlePaste(event: ClipboardEvent) {
  event.preventDefault();

  const items = event.clipboardData?.items;
  if (!items) return;

  // 查找图片项
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          await naimo.log.info('从剪贴板粘贴图片');
          await handleImageUpload(dataUrl);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }
}

/**
 * 更新滚动提示显示状态
 */
function updateScrollIndicator() {
  const scrollContainer = document.getElementById('sizeScrollContainer');
  const scrollIndicator = document.getElementById('scrollIndicator');

  if (!scrollContainer || !scrollIndicator) return;

  // 检查是否滚动到底部（允许1px误差）
  const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 1;

  // 检查是否有滚动内容
  const hasScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;

  // 只有当有滚动内容且未滚动到底部时才显示提示
  if (hasScroll && !isAtBottom) {
    scrollIndicator.style.display = 'flex';
  } else {
    scrollIndicator.style.display = 'none';
  }
}

/**
 * 应用初始化
 */
async function initApp(): Promise<void> {
  console.log('图标制作工具初始化...');

  // 监听来自 preload 的图片数据
  window.addEventListener('icon-maker-image-received', (event: Event) => {
    const customEvent = event as CustomEvent<ImageData>;
    const imageData = customEvent.detail;
    if (imageData && imageData.data) {
      handleImageUpload(imageData.data);
    }
  });

  // 文件输入
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // 上传按钮（点击和粘贴）
  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', triggerFileInput);
    uploadBtn.addEventListener('paste', handlePaste);
    // 自动聚焦以便接收粘贴事件
    uploadBtn.focus();
  }

  // 重新上传按钮
  const reuploadBtn = document.getElementById('reuploadBtn');
  if (reuploadBtn) {
    reuploadBtn.addEventListener('click', triggerFileInput);
  }

  // 切换裁剪模式按钮
  const toggleViewModeBtn = document.getElementById('toggleViewModeBtn');
  if (toggleViewModeBtn) {
    toggleViewModeBtn.addEventListener('click', toggleViewMode);
  }

  // 裁剪区域粘贴事件
  const cropperArea = document.getElementById('cropperArea');
  if (cropperArea) {
    cropperArea.addEventListener('paste', handlePaste);
  }

  // 圆角滑块
  const radiusSlider = document.getElementById('radiusSlider') as HTMLInputElement;
  const radiusValue = document.getElementById('radiusValue');
  if (radiusSlider && radiusValue) {
    radiusSlider.addEventListener('input', () => {
      borderRadius = parseInt(radiusSlider.value);
      radiusValue.textContent = `${borderRadius}%`;
      updatePreview();
    });
  }

  // 尺寸选择
  availableSizes.forEach(size => {
    const checkbox = document.getElementById(`size-${size}`);
    if (checkbox) {
      checkbox.addEventListener('change', () => toggleSize(size));
    }
  });

  // 全选按钮
  const toggleAllBtn = document.getElementById('toggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', toggleAllSizes);
  }

  // 复制图片按钮
  const copyImageBtn = document.getElementById('copyImageBtn');
  if (copyImageBtn) {
    copyImageBtn.addEventListener('click', copyImageToClipboard);
  }

  // 下载全部按钮
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', downloadAllIcons);
  }

  // 单个下载按钮
  availableSizes.forEach(size => {
    const downloadBtn = document.getElementById(`download-${size}`);
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => downloadIcon(size));
    }
  });

  // 初始化尺寸选择 UI
  updateSizeSelection();

  // 设置 ResizeObserver (只创建一次)
  setupResizeObserver();

  // 滚动容器滚动事件监听
  const sizeScrollContainer = document.getElementById('sizeScrollContainer');
  if (sizeScrollContainer) {
    sizeScrollContainer.addEventListener('scroll', updateScrollIndicator);
  }

  // 监听窗口大小变化
  window.addEventListener('resize', debounce(() => {
    if (cropper) {
      setCropperCanvasSize();
      updatePreview();
    }
    resizePreviewCanvas();
    updateScrollIndicator(); // 窗口大小变化时更新滚动提示
  }, 100));

  // 全局粘贴事件监听
  window.addEventListener('paste', handlePaste);

  // 初始化滚动提示状态
  setTimeout(() => {
    updateScrollIndicator();
  }, 100);

  // 注册退出钩子
  if (window.naimo && window.naimo.onExit) {
    window.naimo.onExit(() => {
      // 清理资源
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    });
  }

  // 记录初始化完成
  await naimo.log.info('图标制作工具初始化完成');
}

// ==================== 入口 ====================
naimo.onEnter(async (params) => {
  try {
    // 只记录文件信息，避免记录过大数据
    const fileInfo = params.files ? {
      count: params.files.length,
      name: params.files[0]?.name,
      path: params.files[0]?.path
    } : null;
    await naimo.log.info('收到图片参数:', fileInfo);

    // 只处理文件路径
    if (params.files && params.files.length > 0) {
      const imagePath = params.files[0].path;
      await naimo.log.info('文件路径:', imagePath);
      if (imagePath) {
        // @ts-ignore
        const base64data = await naimo.system.getLocalImage(imagePath);
        const dataLength = base64data?.length || 0;
        await naimo.log.info(`图片数据长度: ${dataLength} 字符`);

        // 确保base64数据格式正确
        let imageData = base64data;
        if (imageData && !imageData.startsWith('data:')) {
          // 如果没有data URI前缀，添加默认的
          imageData = `data:image/png;base64,${imageData}`;
        }

        await naimo.log.info('开始处理图片');
        await handleImageUpload(imageData);
      }
    }
  } catch (error) {
    console.error('处理图片失败:', error);
    await naimo.log.error('处理图片失败');
    await naimo.system.notify('处理图片失败', '错误');
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
