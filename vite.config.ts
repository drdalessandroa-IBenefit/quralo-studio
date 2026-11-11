import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

// CareConnect build config — self-hosted, no third-party build wrapper.
// Nitro builds a standalone server in .output/ (default preset: node-server).
// Override for other hosts with NITRO_PRESET (e.g. vercel, cloudflare, netlify).
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    nitro({ preset: process.env["NITRO_PRESET"] ?? "node-server" }),
    viteReact(),
  ],
  resolve: {
    // Avoid duplicate React/Router instances when deps are linked or hoisted.
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
});
