/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set at build time (e.g. GitHub Actions) to pin the converter host; optional if same-origin runtime is enough. */
  readonly VITE_CONVERTER_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
