"use strict";
const electron = require("electron");
const iconMakerAPI = {
  // 预留 API 实现
};
electron.contextBridge.exposeInMainWorld("iconMakerAPI", iconMakerAPI);
const handlers = {
  "create-icon": {
    onEnter: async (params) => {
      try {
        console.log("图标制作功能被触发");
        console.log("收到图片数据:", params);
        if (typeof window !== "undefined") {
          const event = new CustomEvent("icon-maker-image-received", {
            detail: params
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error("图标制作错误:", error);
      }
    }
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}
