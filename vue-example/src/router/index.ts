import { createRouter, createWebHistory } from "vue-router";

import Home from "../views/Home.vue";
import Login from "../views/Login.vue";
// import Application from '../views/Application.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      component: Home,
      // component: () => import(`./views/${module}/index.vue`),
    },
    {
      path: "/login",
      name: "Login",
      component: Login,
      // component: () => import(`./views/${module}/index.vue`),
    },
    // {
    //   path: '/app/:uid',
    //   name: 'Application',
    //   component: Application
    // }
  ],
});

export default router;
