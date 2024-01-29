
class TokenService {
    
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
}
  
export default new TokenService();