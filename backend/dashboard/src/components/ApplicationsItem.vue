<script setup lang="ts">

import axios from 'axios';
import DataTable from 'datatables.net-dt';
import CreateApplicationForm from './CreateApplicationForm.vue';

import { onMounted, defineProps, ref } from 'vue';

import { Modal } from "bootstrap";
import TokenApplicationForm from './TokenApplicationForm.vue';
import EditApplicationForm from './EditApplicationForm.vue';
import DeleteApplicationForm from './DeleteApplicationForm.vue';
import { useApplicationStore } from '@/stores/application';
import { useTokenStore } from '@/stores/token';

async function fetchApplications(): Promise<boolean> {
  try {
    let appList = await axios.get("http://localhost:8080/admin/application/list", {
      headers: {
        Authorization: `Bearer ${tokenStore.token}`,
      },
    });
    apps.value = appList.data;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function showApplicationForm(elementId: string, app: any): Promise<void> {
  const applicationFormElement = document.getElementById(elementId) as HTMLElement;
  console.log(app);
  applicationStore.selectedApplication.value = app;

  if (applicationFormElement) {
    const applicationForm = new Modal(
      applicationFormElement,
      {
        keyboard: false,
      }
    );
    if (applicationForm) applicationForm.show();
  }
}

const apps = ref([] as any[]);
const tokenStore = useTokenStore();
const applicationStore = useApplicationStore();

apps.value.push({
    name: 'test',
    domain: 'test',
    uid: 'test',
  });

onMounted(async () => {

  if (tokenStore.token !== undefined) {
    console.log(tokenStore.token);
    await fetchApplications();
  }

  let table = new DataTable('#myTable', {
    // responsive: true,
    info: false,
    ordering: true,
    paging: false,
    searching: false,
  });
})
</script>

<template>
  <div class="">

    <div class="row">
      <h1>Applications</h1>
      <h3>Manage your applications</h3>
    </div>

    <div class="row">
      <button type="button" class="btn btn-primary" @click="showApplicationForm('createApplicationForm', null)">
        Add application
      </button>
    </div>

    <CreateApplicationForm />
    <TokenApplicationForm />
    <EditApplicationForm />
    <DeleteApplicationForm />

    <div class="row">
      <table id="myTable" class="table table-hover">
      <thead class="table-dark">
        <tr>
          <th scope="col">#</th>
          <th scope="col">Name</th>
          <th scope="col">Domain</th>
          <th scope="col">Sessions</th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        <tr class="align-middle" v-for="(app, index) in apps">
          <th scope="row">{{ index }}</th>
          <td>{{ app.name }}</td>
          <td>{{ app.domain }}</td>
          <td>{{ 0 }}</td>
          <td>
            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">Dropdown</button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" @click="showApplicationForm('editApplicationForm', app)" href="#"><i class="bi bi-pencil"></i>&ensp;Edit</a></li>
              <li><a class="dropdown-item" @click="showApplicationForm('tokenApplicationForm', app)" href="#"><i class="bi bi-ticket-perforated"></i>&ensp;Token</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" @click="showApplicationForm('deleteApplicationForm', app)" href="#"><i class="bi bi-trash"></i>&ensp;Delete</a></li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>

    </div>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
