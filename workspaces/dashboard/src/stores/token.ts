import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useTokenStore = defineStore('token', () => {
  const token = ref('')
  const apiUrl = ref('')

  function setApiUrl() {
    try {
      // Split the token into its three parts
      const parts = token.value.split('.');
  
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }
  
      // Decode the payload (second part of the token)
      const payloadBase64 = parts[1];
      const payloadJson = atob(payloadBase64); // Decode from Base64 to JSON string
      const payload = JSON.parse(payloadJson); // Parse JSON string to an object
      
      console.log('Decoded token:', payload);
  
      apiUrl.value = payload.iss || "";
    } catch (error) {
      console.error('Error decoding token:', error);
      apiUrl.value = '';
    }
  }

  return { token, apiUrl, setApiUrl }
})
