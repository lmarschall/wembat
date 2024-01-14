import axios, { AxiosError, AxiosInstance } from "axios";

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/typescript-types";

interface ChallengeInputOptions extends AuthenticationExtensionsClientInputs {
  largeBlob: any;
}

interface ChallengeOutputptions extends AuthenticationExtensionsClientOutputs {
  largeBlob: any;
}

export interface WembatMessage {
  iv: string,
  message: string,
  encrypted: string
}

export interface WembatActionResponse {
  success: boolean;
  result:
    WembatMessage
    | LoginResult
    | RegisterResult
    | LoginReadResult
    | LoginWriteResult
    | ErrorResult
}

interface RegisterResult {
  verifiedStatus: boolean
}

interface ErrorResult {
  error: string;
}

interface LoginResult {
  verified: true;
  jwt: string;
}

interface LoginReadResult {
  credentials: AuthenticationResponseJSON;
  privateKey: CryptoKey;
  challengeOptions: PublicKeyCredentialRequestOptionsJSON;
}

interface LoginWriteResult {
  credentials: AuthenticationResponseJSON;
  publicKey: CryptoKey;
}

// class
class WembatClient {
  apiUrl = "";
  axiosClient: AxiosInstance | undefined;
  publicKey: CryptoKey | undefined;
  privateKey: CryptoKey | undefined;
  encryptionKey: CryptoKey | undefined;

  // constructor
  constructor(url: string) {
    this.apiUrl = url;
    this.axiosClient = axios.create({
      baseURL: `${this.apiUrl}/webauthn`
    });
    this.axiosClient.defaults.headers.common["content-type"] = "Application/Json";
    // if(this.axiosClient == undefined) throw Error("Could not create axios client");
    // TODO add api token
    // this.axiosClient.defaults.headers.common['Authorization'] = AUTH_TOKEN;
  }

  // helper function
  str2ab(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  // helper function
  ab2str(buf: ArrayBuffer): string {
    return String.fromCharCode.apply(null, [...new Uint8Array(buf)]);
  }

  // main function
  async register(userUId: string): Promise<WembatActionResponse> {

    // TODO maybe check for largeblob not supported

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    try {

      if(this.axiosClient == undefined) throw Error("BLOB");

      const requestRegisterResponse = await this.axiosClient.post<PublicKeyCredentialCreationOptionsJSON>(
        `/request-register`,
        {
          userInfo: { userMail: userUId },
        }
      );
  
      if (requestRegisterResponse.status !== 200) {
        // i guess we need to handle errors here
        throw Error(requestRegisterResponse.statusText)
      }
  
      const challengeOptions = requestRegisterResponse.data;
  
      const credentials = await startRegistration(challengeOptions).catch(
        (err: string) => {
          throw Error(err);
        }
      );

      // TODO add check for largeBlob supported
  
      const registerResponse = await this.axiosClient.post<boolean>(
        `/register`,
        {
          challengeResponse: {
            credentials: credentials,
            challenge: challengeOptions.challenge,
            deviceToken: "",
          },
        }
      );
  
      if (registerResponse.status !== 200) {
        // i guess we need to handle errors here
        throw Error(registerResponse.statusText)
      }
  
      const registerResult: RegisterResult = {
        verifiedStatus: registerResponse.data,
      };
      actionResponse.result = registerResult;
      actionResponse.success = true;

    } catch (error: any) {
      const errorMessage: ErrorResult = {
        error: error,
      };
      actionResponse.result = errorMessage;
      console.error(error);

    } finally {
      return actionResponse;
    }
  }

  // main function
  async login(userUId: string): Promise<WembatActionResponse> {

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    try {

      if(this.axiosClient == undefined) throw Error("BLOB");

      const loginRequestResponse = await this.axiosClient.post(
        `/request-login`,
        {
          userInfo: { userMail: userUId },
        }
      );
  
      if (loginRequestResponse.status !== 200) {
        // i guess we need to handle errors here
        throw Error(loginRequestResponse.statusText)
      }
  
      const challengeOptions = loginRequestResponse.data.options;
      const publicServerKey = loginRequestResponse.data.publicUserKey;
  
      let privateKey: CryptoKey | undefined;
      let publicKey: CryptoKey | undefined;
  
      console.log(challengeOptions);
  
      const inputOptions: ChallengeInputOptions | undefined =
        challengeOptions.extensions as ChallengeInputOptions;
  
      // check if we want to read or write
      if (inputOptions?.largeBlob.read) {
        publicKey = await this.loadCryptoPublicKeyFromString(loginRequestResponse.data.publicUserKey)
      } else if (inputOptions.largeBlob.write) {

        // generate key material to be saved
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: "ECDH",
            namedCurve: "P-384",
          },
          true,
          ["deriveKey", "deriveBits"]
        );

        publicKey = keyPair.publicKey;
        privateKey = keyPair.privateKey;
        
        // export to jwk format buffer to save private key in large blob
        const blob = await this.saveCryptoKeyAsString(privateKey);
        inputOptions.largeBlob.write = Uint8Array.from(
          blob.split("").map((c: string) => c.codePointAt(0)) as number[]
        );
        console.log(inputOptions.largeBlob.write);
      } else {
        // not reading or writing is not intended
        throw Error("not reading or writing");
      }
  
      const credentials = await startAuthentication(challengeOptions).catch(
        (err: string) => {
          throw Error(err);
        }
      );
  
      console.log(credentials);
  
      const outputOptions: ChallengeOutputptions | undefined =
        credentials.clientExtensionResults as ChallengeOutputptions;
      
      // check if read or write was successful
      if (outputOptions.largeBlob.written) {
        console.log("WRITE SUCCESSFUL");
      } else if (Object.keys(outputOptions.largeBlob).length) {
        console.log("READ SUCCESSFUL");
        const keyBuffer = String.fromCodePoint(
          ...new Uint8Array(outputOptions.largeBlob.blob)
        );
        console.log(JSON.parse(keyBuffer));

        privateKey = await this.loadCryptoPrivateKeyFromString(keyBuffer);
      }

      // TODO private key public key verification
      // server generates secret from private server key and public user key if present
      // server sends public server key
      // user generates secret from private user key and public server key
      // sends secret to server
      // server checks if secret already present or generates secret and compares for vaildation

      // TODO maybe just save after login challegne successfully completed


      // generate shared secret for key validation
      // const sharedSecret = await window.crypto.subtle.deriveBits(
      //   {
      //     name: "ECDH",
      //     // @ts-ignore
      //     namedCurve: "P-384",
      //     public: publicServerKey,
      //   },
      //   privateKey,
      //   128,
      // );

      if(privateKey !== undefined && publicKey !== undefined) {
        this.setCryptoPrivateKey(privateKey);
        this.setCryptoPublicKey(publicKey);
      } else {
        // TODO throw error
        console.error("private key or public key undefined!");
        // console.log(this.privateKey);
        // console.log(this.publicKey);
      }

      // console.log(this.privateKey);
      // console.log(this.publicKey);
      
      // send public key to server if we just created one
      const pubKeyString = (publicKey !== undefined) ? await this.saveCryptoKeyAsString(publicKey): "";
  
      const response = await this.axiosClient.post(
        `/login`,
        {
          // TODO interfaces for request bodies
          challengeResponse: {
            credentials: credentials,
            challenge: challengeOptions.challenge,
            pubKey: pubKeyString,
            // secret: this.ab2str(sharedSecret)
          },
        }
      );
    
      if (response.status !== 200) {
        throw Error(response.statusText);
      }

      const loginResult: LoginResult = {
        verified: response.data.verified,
        jwt: response.data.jwt
      };
      actionResponse.result = loginResult;
      actionResponse.success = true;
      
    } catch (error: any) {
      const errorMessage: ErrorResult = {
        error: error,
      };
      actionResponse.result = errorMessage;
      console.error(error);
    } finally {
      return actionResponse;
    }
  }

  async encrypt(wembatMessage: WembatMessage): Promise<WembatActionResponse> {

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    try {

      const encryptionKey = await this.deriveEncryptionKey();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encoder = new TextEncoder();
      const encoded = encoder.encode(wembatMessage.message);
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        encryptionKey,
        encoded
      );

      const message: WembatMessage = {
        encrypted: this.ab2str(encrypted),
        iv: this.ab2str(iv),
        message: ""
      };
      actionResponse.result = message;
      actionResponse.success = true;
    } catch (error: any) {
      const errorMessage: ErrorResult = {
        error: error,
      };
      actionResponse.result = errorMessage;
      console.error(error);
    } finally {
      return actionResponse;
    }
  }

  async decrypt(wembatMessage: WembatMessage) {

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    try {

      const encryptionKey = await this.deriveEncryptionKey();
      const iv = wembatMessage.iv;

      const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: this.str2ab(iv),
        },
        encryptionKey,
        this.str2ab(wembatMessage.encrypted)
      );

      let dec = new TextDecoder();
      const message: WembatMessage = {
        message: dec.decode(decrypted),
        encrypted: "",
        iv: iv
      };
      actionResponse.result = message;
      actionResponse.success = true; 
    } catch (error: any) {
      const errorMessage: ErrorResult = {
        error: error,
      };
      actionResponse.result = errorMessage;
      console.error(error);
    } finally {
      return actionResponse;
    }
  }

  async deriveEncryptionKey(): Promise<CryptoKey> {

    if(this.encryptionKey !== undefined) {
      return this.encryptionKey;
    } else  if(this.privateKey !== undefined && this.publicKey !== undefined) {
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
      return this.encryptionKey;
    } else {
      throw Error("Could not derive Encryption Key");
    }
  }

  async saveCryptoKeyAsString(cryptoKey: CryptoKey): Promise<string> {

    const exported = await window.crypto.subtle.exportKey("jwk", cryptoKey);
    return JSON.stringify(exported);
  }

  async loadCryptoPublicKeyFromString(pubKeyString: string): Promise<CryptoKey> {

    if(pubKeyString !== "") {

      return await window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(pubKeyString),
        {
          name: "ECDH",
          namedCurve: "P-384",
        },
        true,
        [],
      );
    } else {
      throw Error("Public Key String empty");
    }
  }

  async loadCryptoPrivateKeyFromString(privateKeyString: string): Promise<CryptoKey> {

    if(privateKeyString !== "") {
      return await window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(privateKeyString),
        {
          name: "ECDH",
          namedCurve: "P-384",
        },
        false,
        ["deriveKey", "deriveBits"]
      );
    } else {
      throw Error("Private Key String empty")
    }
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
}

export { WembatClient };
