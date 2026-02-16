import adapter from "@sveltejs/adapter-static";

// Configuración de base path para dominio custom
const dev = process.argv.includes("dev");
const base = "";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  kit: {
    adapter: adapter({
      fallback: "404.html",
    }),
    paths: {
      base: base,
    },
  },
};

export default config;