<template>
    <div class="modal fade" id="editApplicationForm" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="exampleModalLabel">Edit Application</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ...
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary">Edit Application</button>
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


  const inputName = ref<HTMLInputElement | null>(null);
  const inputDomain = ref<HTMLInputElement | null>(null);
  
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  
  const props = defineProps({
    // products: { type: Array as () => Product[], required: true },
  });
  
  onMounted(() => {
    // show modal
    const modalElement = document.getElementById("createApplicationForm") as HTMLElement;
  });
  
  function testInputName(): boolean {
    const regName = RegExp("^([a-zA-ZÄÜÖäüöß \-]{5,})$");
    inputName.value?.classList.remove("is-invalid", "is-valid");
  
    if (inputName !== null && inputName.value !== null && regName.test(inputName.value.value)) {
      inputName.value.classList.add("is-valid");
      return true;
    } else {
      inputName.value?.classList.add("is-invalid");
      return false;
    }
  }
  
  async function create() {
  
    let validCount = 0;
  
    // check if inputs are valid
    if (testInputName()) {
      validCount++;
    }
  
    // only do sth if everything is valid
    if (validCount == 1) {
      status.value = 1;
  
      // const orderItems = [] as OrderItem[];
  
    //   orderList.value.forEach((element) => {
    //     const orderItem = {
    //       name: element.product.unit + " " + element.product.name,
    //       amount: element.amount,
    //     } as OrderItem;
  
    //     if (element.amount > 0) {
    //       orderItems.push(orderItem);
    //     }
    //   });
  
      const postData = {
        // token: cfToken.value,
        mailParams: {
          name: inputName.value?.value,
        //   address: inputAddress.value?.value,
        //   city: inputCity.value?.value,
        //   phone: inputPhone.value?.value,
          // orders: orderItems,
        },
      };
  
      await sleep(2000);
  
      if (await post(postData)) {
        status.value = 2;
      } else {
        status.value = 3;
      }
    }
  }
  
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