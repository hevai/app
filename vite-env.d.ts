/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_INVITE_URL?: string;
  readonly VITE_THIRDWEB_CLIENT_ID?: string;
  readonly VITE_WEB_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
