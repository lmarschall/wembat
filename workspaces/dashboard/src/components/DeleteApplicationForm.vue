<template>
    <div class="modal fade" id="deleteApplicationForm" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="exampleModalLabel">Delete Application</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col">
                <div class="form-floating mb-3">
                  <input
                    type="text"
                    class="form-control"
                    id="floatingInputName"
                    ref="inputName"
                    placeholder="Enter Application Name"
                    v-on:change="testInputName"
                  />
                  <label for="floatingInputName" class="form-label">Name</label>
                  <div class="invalid-feedback">
                      Please enter the application name!
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" ref="closeButton" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" @click="deleteApp()" :disabled="buttonDisabled">Delete Application</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
  </style>
  
  <script setup lang="ts">
    import { onMounted, ref } from "vue";
    import { useApplicationStore } from "@/stores/application";
    import { WembatRequestService } from "@/services/wembat";

    const buttonDisabled = ref(false);
    const status = ref(0);
    const applicationStore = useApplicationStore();
    const wembatRequestService = new WembatRequestService();

    const inputName = ref<HTMLInputElement | null>(null);
    const closeButton = ref<HTMLButtonElement | null>(null);
    
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    
    onMounted(() => {
      const modalElement = document.getElementById("deleteApplicationForm") as HTMLElement;
      modalElement.addEventListener("shown.bs.modal", async (event) => {
        if (inputName !== null && inputName.value !== null) {
          inputName.value.value = "";
        }
      });
    });

    function testInputName(): boolean {
      const app = applicationStore.selectedApplication;
      inputName.value?.classList.remove("is-invalid", "is-valid");

      if (inputName !== null && inputName.value !== null && app !== undefined && inputName.value.value === app.name) {
        inputName.value.classList.add("is-valid");
        return true;
      } else {
        inputName.value?.classList.add("is-invalid");
        return false;
      }
    }

    async function deleteApp() {
      buttonDisabled.value = true;
      const app = applicationStore.selectedApplication;

      // check if inputs are valid
      if (!testInputName()) {
        buttonDisabled.value = false;
        return;
      }

      const postData = {
        applicationInfo: {
          appUId: app.uid,
          appName: app.name,
          appDomain: app.domain,
        },
      };

      await sleep(1000);

      if (await wembatRequestService.applicationDelete(postData)) {
        console.log("Application deleted");
      } else {
        console.log("Application not deleted");
      }
      
      buttonDisabled.value = false;
      closeButton.value?.click();
    }

  </script>