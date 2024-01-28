import { createApp } from "vue";
import { WembatClient } from "@wembat/client";

import "bootstrap";
import "bootstrap/dist/css/bootstrap.css";

import App from "./App.vue";
import router from "./router";

const wembatBackendUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"

const app = createApp(App);
const wembatClient = new WembatClient(wembatBackendUrl);
app.provide('wembatClient', wembatClient)
app.use(router);
app.mount("#app");
