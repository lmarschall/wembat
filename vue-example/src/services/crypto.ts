
class WebCryptoService {

    publicKey: CryptoKey | undefined;
    privateKey: CryptoKey | undefined;
    encryptionKey: CryptoKey | undefined;
    encrypted: ArrayBuffer | undefined;
    iv: Uint8Array | undefined;
    
    constructor() {
        this.iv = window.crypto.getRandomValues(new Uint8Array(12));
    }

    ab2str(buf: any) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    str2ab(str: string) {
        const buf = new ArrayBuffer(str.length);
        const bufView = new Uint8Array(buf);
        for (let i = 0, strLen = str.length; i < strLen; i++) {
          bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    resetCryptoKeys() {

        localStorage.removeItem('cryptoPublicKey');
        localStorage.removeItem('cryptoPrivateKey');
    }

    getCryptoPublicKey() {
        return this.publicKey;
    }

    getCryptoPrivateKey() {
        return this.privateKey;
    }

    setCryptoPublicKey(key: CryptoKey) {
        this.publicKey = key;
    }

    setCryptoPrivateKey(key: CryptoKey) {
        this.privateKey = key;
    }

    async deriveEncryptionKey() {
        if(this.privateKey != undefined && this.publicKey != undefined) {
            this.encryptionKey = await window.crypto.subtle.deriveKey(
                {
                  name: "ECDH",
                  public: this.publicKey,
                },
                this.privateKey,
                {
                  name: "AES-GCM",
                  length: 256,
                },
                false,
                ["encrypt", "decrypt"],
            );
        }
    }

    async saveCryptoPublicKey(key: CryptoKey) {

        const exported = await window.crypto.subtle.exportKey("jwk", key);
        const keyBufferString = JSON.stringify(exported);
        localStorage.setItem('cryptoPublicKey', keyBufferString);
        this.setCryptoPublicKey(key);
    }

    async loadCryptoPublicKey() {
        const pubKeyString = localStorage.getItem('cryptoPublicKey');
        if(pubKeyString != null) {
    
            const pubKey = await window.crypto.subtle.importKey(
              "jwk",
              JSON.parse(pubKeyString),
              {
                name: "ECDH",
                namedCurve: "P-384",
              },
              false,
              [],
            //   ["deriveKey", "deriveBits"],
            );
            this.setCryptoPublicKey(pubKey);
        }
    }

    async encrypt(message: string) {

        if (this.encryptionKey != undefined) {

            let enc = new TextEncoder();
            const encoded =  enc.encode(message);

            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: this.iv,
                },
                this.encryptionKey,
                encoded
            );
            
            localStorage.setItem('iv', this.ab2str(this.iv));
            return this.ab2str(encrypted);

        } else {
            return "";
        } 
    }

    async decrypt(ciphertext: string) {
        const iv = localStorage.getItem('iv')

        if (this.encryptionKey != undefined && iv != null) {
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: this.str2ab(iv),
                },
                this.encryptionKey,
                this.str2ab(ciphertext)
            );

            let dec = new TextDecoder();
            return dec.decode(decrypted);
        } else {
            return "";
        }
    }
}
  
export default new WebCryptoService();