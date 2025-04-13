<template>
    <div class="modal fade" id="createApplicationForm" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="exampleModalLabel">Create Application</h1>
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
                                    placeholder="Name"
                                    v-on:change="testInputName"
                                />
                                <label for="floatingInputName" class="form-label">Name</label>
                                <div class="invalid-feedback">
                                    Please enter a valid name!
                                </div>
                            </div>
                            <div class="form-floating mb-3">
                                <input
                                    type="text"
                                    class="form-control"
                                    id="floatingInputDomain"
                                    ref="inputDomain"
                                    placeholder="Adresse"
                                    v-on:change="testInputDomain"
                                />
                                <label for="floatingInputAddress">Domain</label>
                                <div class="invalid-feedback">
                                    Please enter a valid domain!
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" ref="closeButton" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" @click="createApp()" :disabled="buttonDisabled">Create Application</button>
                </div>
            </div>
        </div>
    </div>
</template>
  
<style scoped>
</style>
  
<script setup lang="ts">
    import { WembatRequestService } from "@/services/wembat";
    import { Modal } from "bootstrap";
    import { onMounted, ref } from "vue";

    const status = ref(0);
    const buttonDisabled = ref(false);
    const wembatRequestService = new WembatRequestService();

    const inputName = ref<HTMLInputElement | null>(null);
    const inputDomain = ref<HTMLInputElement | null>(null);
    const closeButton = ref<HTMLButtonElement | null>(null);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    onMounted(() => {
    });

    function testInputName(): boolean {
        const regName = RegExp("^([a-zA-Z]{5,})$");
        inputName.value?.classList.remove("is-invalid", "is-valid");

        if (inputName !== null && inputName.value !== null && regName.test(inputName.value.value)) {
            inputName.value.classList.add("is-valid");
            return true;
        } else {
            inputName.value?.classList.add("is-invalid");
            return false;
        }
    }

    function testInputDomain(): boolean {
        const regName = RegExp("^([a-zA-Z0-9\.\:]{5,})$");
        inputDomain.value?.classList.remove("is-invalid", "is-valid");

        if (inputDomain !== null && inputDomain.value !== null && regName.test(inputDomain.value.value)) {
            inputDomain.value.classList.add("is-valid");
            return true;
        } else {
            inputDomain.value?.classList.add("is-invalid");
            return false;
        }
    }

    async function createApp() {

        buttonDisabled.value = true;
        let validCount = 0;

        // check if inputs are valid
        if (testInputName()) {
            validCount++;
        }

        if (testInputDomain()) {
            validCount++;
        }

        // only do sth if everything is valid
        if (validCount == 2) {
            status.value = 1;

            const postData = {
                applicationInfo: {
                    appUId: "",
                    appName: inputName.value?.value,
                    appDomain: inputDomain.value?.value,
                },
            };

            await sleep(1000);

            if (await wembatRequestService.applicationCreate(postData)) {
                status.value = 2;
            } else {
                status.value = 3;
            }
        }
        buttonDisabled.value = false;
        closeButton.value?.click();
    }
</script>