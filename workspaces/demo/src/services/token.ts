
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

    getTokenUserMail() {
        try {
            if(this.hasToken()) {
                const token = localStorage.getItem('accessToken');
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
            
                const parsedToken =  JSON.parse(jsonPayload);
                return parsedToken["userMail"];
            } else {
                return "";
            }
        } catch (error) {
            console.log(error);
            return "";
        }        
    }

    setToken(token: string) {

        localStorage.setItem('accessToken', token);
    }
}
  
export default new TokenService();