
class MessageService {
    
    constructor() {
    }

    hasEncryptedMessage() {
        
        if(localStorage.getItem('encryptedMessage') != null) {
            return true;
        } else {
            return false;
        }
    }

    getEncryptedMessage() {

        // if no token in local storage, get new one
        if(this.hasEncryptedMessage()) {

            return localStorage.getItem('encryptedMessage')
        } else {

            return "";
        }
    }

    setEncryptedMessage(encryptedNessage: string) {

        localStorage.setItem('encryptedMessage', encryptedNessage);
    }
}
  
export default new MessageService();