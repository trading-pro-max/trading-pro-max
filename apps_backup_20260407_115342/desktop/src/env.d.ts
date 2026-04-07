declare global {
  interface Window {
    desktopMeta?: {
      getVersion: () => Promise<string>;
    };
  }
}

export {};
