<script setup lang="ts">

import { onMounted, defineProps } from 'vue';

import DataTable from 'datatables.net-dt';

onMounted(() => {
  console.log('mounted');

  let table = new DataTable('#myTable', {
    responsive: true
  });
})

defineProps<{
  msg: string,
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
    {{ msg }}
    {{ applicationModel.name }}
    {{ applicationModel.description }}
    {{ applicationModel.status }}
    {{ applicationModel.date }}

    <table id="myTable" class="table">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">First</th>
          <th scope="col">Last</th>
          <th scope="col">Handle</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">1</th>
          <td>Mark</td>
          <td>Otto</td>
          <td>@mdo</td>
        </tr>
        <tr>
          <th scope="row">2</th>
          <td>Jacob</td>
          <td>Thornton</td>
          <td>@fat</td>
        </tr>
        <tr>
          <th scope="row">3</th>
          <td>Larry</td>
          <td>the Bird</td>
          <td>@twitter</td>
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
