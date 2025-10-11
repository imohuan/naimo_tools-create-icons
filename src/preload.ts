/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from 'electron';

// ==================== 类型定义 ====================

/**
 * 图片数据接口
 */
interface ImageData {
  type: 'img';
  data: string; // base64 图片数据
  originalFile?: {
    name: string;
    path: string;
    size: number;
  };
}

/**
 * 图标制作工具 API 接口
 */
interface IconMakerAPI {
  // 预留 API
}

// ==================== 暴露插件 API ====================

const iconMakerAPI: IconMakerAPI = {
  // 预留 API 实现
};

contextBridge.exposeInMainWorld('iconMakerAPI', iconMakerAPI);

// ==================== 功能处理器导出 ====================

/**
 * 导出功能处理器
 * 类型定义来自 naimo.d.ts
 */
const handlers = {
  'create-icon': {
    onEnter: async (params: ImageData) => {
      try {
        console.log('图标制作功能被触发');
        console.log('收到图片数据:', params);

        // 图片数据将在渲染进程中处理
        // preload 只负责接收和转发

        // 如果需要通知渲染进程，可以通过 window 事件
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('icon-maker-image-received', {
            detail: params
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error('图标制作错误:', error);
      }
    }
  }
};

// 使用 CommonJS 导出（Electron 环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = handlers;
}

// ==================== 类型扩展 ====================

declare global {
  interface Window {
    iconMakerAPI: IconMakerAPI;
  }
}
