<script setup lang="ts">

import DataTable, { type Api } from 'datatables.net-dt';
import CreateApplicationForm from './CreateApplicationForm.vue';
import TokenApplicationForm from './TokenApplicationForm.vue';
import EditApplicationForm from './EditApplicationForm.vue';
import DeleteApplicationForm from './DeleteApplicationForm.vue';

import { Modal } from "bootstrap";
import { onMounted, onUpdated, ref } from 'vue';
import { WembatRequestService, type Application } from '@/services/wembat';
import { useApplicationStore } from '@/stores/application';

const apps = ref([] as Application[]);
const applicationStore = useApplicationStore();
const wembatRequestService = new WembatRequestService();
const showTable = ref(false);

apps.value.push({
  name: 'test',
  domain: 'test',
  uid: 'test',
  publicKey: '',
  privateKey: '',
});

apps.value.push({
  name: 'test',
  domain: 'test',
  uid: 'test',
  publicKey: '',
  privateKey: '',
});

apps.value.push({
  name: 'test',
  domain: 'test',
  uid: 'test',
  publicKey: '',
  privateKey: '',
});

onMounted(async () => {

  const editApplicationForm = document.getElementById("editApplicationForm") as HTMLElement;
  const createApplicationForm = document.getElementById("createApplicationForm") as HTMLElement;
  const deleteApplicationForm = document.getElementById("deleteApplicationForm") as HTMLElement;

  editApplicationForm.addEventListener("hidden.bs.modal", async (event) => {
    await fetchApplications();
  });

  createApplicationForm.addEventListener("hidden.bs.modal", async (event) => {
    await fetchApplications();
  });

  deleteApplicationForm.addEventListener("hidden.bs.modal", async (event) => {
    await fetchApplications();
  });

  await fetchApplications();
})

onUpdated(async () => {
  new DataTable('#myTable', {
    // responsive: true,
    info: false,
    ordering: true,
    paging: false,
    searching: false,
  });
})

async function fetchApplications(): Promise<void> {
  showTable.value = false;
  apps.value = await wembatRequestService.applicationList();
  showTable.value = true;
}

async function showApplicationForm(elementId: string, app?: Application): Promise<void> {
  const applicationFormElement = document.getElementById(elementId) as HTMLElement;
  console.log(app);
  if (app !== undefined) applicationStore.selectedApplication = app;

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
</script>

<template>
  <div class="">

    <div class="row">
      <h1>Applications</h1>
      <h3>Manage your applications</h3>
    </div>

    <div class="row">
      <button type="button" class="btn btn-primary" @click="showApplicationForm('createApplicationForm')">
        Add application
      </button>
    </div>

    <CreateApplicationForm />
    <TokenApplicationForm />
    <EditApplicationForm />
    <DeleteApplicationForm />

    <div class="row">
      <table v-if="showTable" id="myTable" class="table table-hover">
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
