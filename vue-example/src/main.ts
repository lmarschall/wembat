import { createApp } from "vue";
import { WembatClient } from "@wembat/client";

import "bootstrap";
import "bootstrap/dist/css/bootstrap.css";

import App from "./App.vue";
import router from "./router";

const applicationToken = "eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsIngiOiJjVllYSEUwRHhEeEk1WndqcVBPWDFHSHlCQmE3OXJiOXg5ZExMNmkzelpRIiwieSI6Imo2blM4bjhoUkctZkdDYzFQOXgxcW1DcUxIQURTVnNIdlljX19KNjczQTAiLCJjcnYiOiJQLTI1NiJ9fQ.eyJhcHBVSWQiOiJjbHp5ZDY5b2wwMDAwNGdvZ25iaGJjY2pzIiwiYXBwRG9tYWluIjoibG9jYWxob3N0OjMwMDAiLCJpYXQiOjE3MjQ2MTcxNDgsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCIsImF1ZCI6Imh0dHBzOi8vbG9jYWxob3N0OjMwMDAifQ.MJF0d6272DNovrO9Kz07MSm6YwGVjq6vUJtszWNBz1eU2UfhRShCmwW7Xy8wiF282K_CIxa6w9dl2LYh7U7CZg";

const app = createApp(App);
const wembatClient = new WembatClient(applicationToken);
app.provide('wembatClient', wembatClient)
app.use(router);
app.mount("#app");
