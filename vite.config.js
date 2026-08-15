import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    // 允许用 PORT 指定端口，方便同时开多个实例做前后对比；不设时仍是 vite 默认 5173
    port: Number(process.env.PORT) || undefined,
    hmr: false,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
