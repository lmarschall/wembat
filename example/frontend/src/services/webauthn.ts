import axios from "axios";
// import WebCryptoService from "crypto";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

class WebAuthnService {

    apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"
    largeBlob = ""
    
    constructor() {
    }

    str2ab(str: string) {
        const buf = new ArrayBuffer(str.length);
        const bufView = new Uint8Array(buf);
        for (let i = 0, strLen = str.length; i < strLen; i++) {
          bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    ab2str(buf: any) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    async requestRegister(mail: string) {

        return axios.post(`${this.apiUrl}/webauthn/request-register`, {
            headers: {
                'content-type': 'Application/Json'
            },
            userInfo: { userMail: mail }
        })

    }

    async register(challengeOptions: any, token: string = "") {

        console.log(challengeOptions);

        const credentials = await startRegistration(challengeOptions).catch( (err: any) => {
            throw Error(err);
        });

        console.log(credentials);

        return axios.post(`${this.apiUrl}/webauthn/register`, {
            headers: {
                'content-type': 'Application/Json'
            },
            challengeResponse: { credentials: credentials, challenge: challengeOptions.challenge, deviceToken: token }
        })
    }

    async requestLoginRead(mail: string) {
        
        return axios.post(`${this.apiUrl}/webauthn/login`, {
            headers: {
                'content-type': 'Application/Json'
            },
            userInfo: { userMail: mail }
        })
    }

    async requestLoginWrite(mail: string) {
        
        return axios.post(`${this.apiUrl}/webauthn/login-write`, {
            headers: {
                'content-type': 'Application/Json'
            },
            userInfo: { userMail: mail }
        })
    }

    async login(challengeOptions: any, credentials: any) {
        
        return axios.post(`${this.apiUrl}/webauthn/login-challenge`, {
            headers: {
                'content-type': 'Application/Json'
            },
            challengeResponse: { credentials: credentials, challenge: challengeOptions.challenge }
        })
    }

    async loginRead(challengeOptions: any): Promise<any> {

        let privKey: CryptoKey | undefined;

        console.log(challengeOptions);

        // check if we want to read
        if(challengeOptions.extensions.largeBlob.read) {
            console.log(challengeOptions.extensions.largeBlob.read);
        }

        const credentials = await startAuthentication(challengeOptions);

        console.log(credentials);

        // TODO check if read was successful
        //@ts-ignore
        if (Object.keys(credentials.clientExtensionResults.largeBlob).length) {
            //@ts-ignore
            const keyBuffer = String.fromCodePoint(...new Uint8Array(credentials.clientExtensionResults.largeBlob.blob));
            console.log(JSON.parse(keyBuffer));
            privKey = await window.crypto.subtle.importKey(
                "jwk",
                // JSON.parse(ab2str(keyBuffer)),
                JSON.parse(keyBuffer),
                {
                name: "ECDH",
                namedCurve: "P-384",
                },
                false,
                ["deriveKey", "deriveBits"]
            );

            console.log(privKey);

        }

        return [credentials, privKey, challengeOptions];
    }

    async loginWrite(challengeOptions: any): Promise<any> {

        console.log(challengeOptions);

        let keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-384",
            },
            true,
            ["deriveKey", "deriveBits"],
        );

        console.log(keyPair);

        // check if we want to write
        if(challengeOptions.extensions.largeBlob.write) {
            console.log(challengeOptions.extensions.largeBlob.write);
            const exported = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
            // const exportedKeyBuffer = new Uint8Array(exported);
            // const exportedKeyBuffer = new Uint8Array(this.str2ab(JSON.stringify(exported)))
            // const exportedKeyBuffer = this.str2ab(JSON.stringify(exported))
            // challengeOptions.extensions.largeBlob.write = exportedKeyBuffer;
            const blob = JSON.stringify(exported) as string;
            challengeOptions.extensions.largeBlob.write = Uint8Array.from(blob.split("").map(c => c.codePointAt(0)));
            console.log(challengeOptions.extensions.largeBlob.write);
        }

        console.log(challengeOptions);

        const credentials = await startAuthentication(challengeOptions);

        console.log(credentials);

        // TODO check if write was successful
        // TODO if write was successful we have to send public key to backend

        return [credentials, keyPair.publicKey];
    }
}

export default new WebAuthnService();