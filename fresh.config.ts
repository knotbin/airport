import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";
import didJson from "./plugins/did.ts";

export default defineConfig({
  plugins: [tailwind(), didJson],
});
