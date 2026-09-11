export {};

/// <reference types="vite/client" />

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  interface ComponentCustomOptions extends Hooks {}
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly [key: string]: any;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}