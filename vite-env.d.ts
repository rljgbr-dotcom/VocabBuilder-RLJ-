// FIX: Replaced the vite/client reference with a manual module declaration.
// This resolves "Cannot find type definition file" errors in environments where
// the vite/client types are not automatically discovered, while still providing
// the necessary type for "?raw" imports used in the application.
declare module '*?raw' {
  const content: string;
  export default content;
}
declare module '*.csv' {
    const src: string;
    export default src;
}
