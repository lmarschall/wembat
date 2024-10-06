<template>
    <div class="modal fade" id="tokenApplicationForm" tabindex="-1" aria-labelledby="tokenModalLabel" aria-hidden="true">
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
  </template>
  
  <style scoped>
  </style>
  
  <script setup lang="ts">
    import { onMounted, ref } from "vue";
    import { useTokenStore } from "@/stores/token";
    import { useApplicationStore } from "@/stores/application";
    
    import axios from "axios";

    const applicationToken = ref('');
    const tokenStore = useTokenStore();
    const applicationStore = useApplicationStore();
    
    onMounted(async () => {

      const modalElement = document.getElementById("tokenApplicationForm") as HTMLElement;

      // modalElement.addEventListener("hidden.bs.modal", (event) => {
      //   router.go(0);
      // });

      modalElement.addEventListener("shown.bs.modal", async (event) => {
        if (tokenStore.token !== undefined && applicationStore.selectedApplication.value !== undefined) {
          await fetchApplicationToken(applicationStore.selectedApplication.value.uid);
        }
      });
          
    });

    async function fetchApplicationToken(appId: string): Promise<boolean> {
      try {
        const data = {
          applicationInfo: {
            appUId: appId,
          }
        };
        let token = await axios.post(`http://localhost:8080/admin/application/token`, data, {
          headers: {
            Authorization: `Bearer ${tokenStore.token}`,
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
  </script>