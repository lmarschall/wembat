<script setup lang="ts">

import axios from 'axios';

import { onMounted, defineProps, ref } from 'vue';

import DataTable from 'datatables.net-dt';

async function fetchApplications(token: string): Promise<boolean> {
  try {
    let appList = await axios.get("http://localhost:8080/admin/application/list", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    apps.value = appList.data;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function fetchApplicationToken(appId: string): Promise<boolean> {
  try {
    const data = {
      applicationInfo: {
        appUId: appId,
      }
    };
    let token = await axios.post(`http://localhost:8080/admin/application/token`, data, {
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    });
    console.log(token.data);
    applicationToken.value = token.data;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function copyToClipboard() {
  navigator.clipboard.writeText(applicationToken.value);
}

const apps = ref([] as any[]);
const applicationToken = ref('');

apps.value.push({
    name: 'test',
    domain: 'test',
    uid: 'test',
  });

onMounted(async () => {
  console.log('mounted');

  if (props.token !== undefined) {
    await fetchApplications(props.token);
  }

  let table = new DataTable('#myTable', {
    // responsive: true,
    info: false,
    ordering: true,
    paging: false,
    searching: false,
  });
})

const props = defineProps<{
  msg: string,
  token: string | undefined,
  applicationModel: {
    name: string,
    description: string,
    status: string,
    date: string,
  },
}>()
</script>

<template>
  <div class="">

    <!-- Button trigger modal -->
    <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#exampleModal">
      Add application
    </button>

    <!-- Modal -->
    <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="exampleModalLabel">Modal title</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ...
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary">Save changes</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="tokenModal" tabindex="-1" aria-labelledby="tokenModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="tokenModalLabel">Application Token</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="input-group mb-3">
              <input disabled type="text" v-bind:value="applicationToken" class="form-control" placeholder="Recipient's username" aria-label="Recipient's username" aria-describedby="basic-addon2">
              <span @click="copyToClipboard()" class="input-group-text" id="basic-addon2">@</span>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

    <table id="myTable" class="table">
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
        <tr v-for="(app, index) in apps">
          <th scope="row">{{ index }}</th>
          <td>{{ app.name }}</td>
          <td>{{ app.domain }}</td>
          <td>{{ 0 }}</td>
          <td>
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#tokenModal" @click="fetchApplicationToken(app.uid)">
              Show Token
            </button>
          </td>
        </tr>
      </tbody>
    </table>
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
