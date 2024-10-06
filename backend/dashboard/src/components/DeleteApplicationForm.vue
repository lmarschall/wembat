<template>
    <div class="modal fade" id="deleteApplicationForm" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="exampleModalLabel">Delete Application</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ...
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary">Delete Application</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
  </style>
  
  <script setup lang="ts">
    import { onMounted, ref } from "vue";
    
    import axios from "axios";

    const buttonEnabled = ref(false);
    const status = ref(0);
    
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    
    const props = defineProps({
      // products: { type: Array as () => Product[], required: true },
    });
    
    onMounted(() => {
      // show modal
      const modalElement = document.getElementById("createApplicationForm") as HTMLElement;
    });
    
    async function post(data: any): Promise<boolean> {
      try {
        await axios.post("https://api.brennholz-marschall.de/mail/send", data);
        return true;
      } catch (error) {
        // console.log(error);
        return false;
      }
    }
  </script>