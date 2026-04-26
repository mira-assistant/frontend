export interface UpdaterSplashPayload {
  title?: string;
  message: string;
  progress?: number | null;
  showActions?: boolean;
  primaryLabel?: string;
  hidePrimary?: boolean;
  hint?: string;
}
