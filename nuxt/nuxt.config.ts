// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    [
      "vuetify-nuxt-module",
      {
        vuetifyOptions: {
          theme: {
            defaultTheme: "light",
          },
        },
      },
    ],
  ],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: "/api",
      fileBase: "",
    },
  },
  css: ["vuetify/styles", "@mdi/font/css/materialdesignicons.css"],
});
