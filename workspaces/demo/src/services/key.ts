
class KeyService {

    private publicKey: CryptoKey | undefined;

    resetKey() {

        this.publicKey = undefined;
    }

    hasKey() {
        
        if(this.publicKey === undefined) {
            return false;
        } else {
            return true;
        }
    }

    getKey() {

        return this.publicKey;
    }

    setKey(key: CryptoKey) {

        this.publicKey = key;
    }
}
  
export default new KeyService();