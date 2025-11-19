// FIX: Replaced the vite/client reference with a manual module declaration.
// This resolves "Cannot find type definition file" errors in environments where
// the vite/client types are not automatically discovered, while still providing
// the necessary type for "?raw" imports used in the application.
declare module '*?raw' {
  const content: string;
  export default content;
}

// FIX: Add definition for import.meta.glob since we are not using vite/client types
interface ImportMeta {
  glob(pattern: string, options?: { query?: string; import?: string; eager?: boolean }): Record<string, () => Promise<any>>;
}