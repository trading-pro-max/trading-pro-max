import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktopMeta", {
  getVersion: () => ipcRenderer.invoke("desktop:getVersion")
});
