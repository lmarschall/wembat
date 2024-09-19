import { createApp } from "vue";
import { WembatClient } from "@wembat/client";

import "bootstrap";
import "bootstrap/dist/css/bootstrap.css";

import App from "./App.vue";
import router from "./router";

const applicationToken = import.meta.env.VITE_APP_TOKEN || "";

const app = createApp(App);
const wembatClient = new WembatClient(applicationToken.trim());
app.provide('wembatClient', wembatClient)
app.use(router);
app.mount("#app");
