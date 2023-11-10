
import axios from "axios";

class TokenService {

    apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"
    
    constructor() {
    }

    resetToken() {

        localStorage.removeItem('accessToken');
    }

    hasToken() {
        
        if(localStorage.getItem('accessToken')) {
            return true;
        } else {
            return false;
        }
    }

    getToken() {

        // if no token in local storage, get new one
        if(this.hasToken()) {

            return localStorage.getItem('accessToken')
        } else {

            return "";
        }
    }

    setToken(token: string) {

        localStorage.setItem('accessToken', token);
    }

    fetchTestToken(mail: string) {

        const payload = {
            userMail: mail
        }

        return axios.post(`${this.apiUrl}/webauthn/test-token`, payload)
    }
}
  
export default new TokenService();