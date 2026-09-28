// Side-effect CSS imports are handled by Rspack (type: 'css/auto').
declare module '*.css';

/** Injected at build time (rspack.config.mjs, DefinePlugin). */
declare const __APP_VERSION__: string;
