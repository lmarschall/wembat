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

export interface WembatActionResponse {
  success: boolean;
  result:
    | WembatMessage
    | LoginResult
    | RegisterResult
    | LoginResult
    | ErrorResult;
}

export interface WembatMessage {
  iv: string;
  message: string;
  encrypted: string;
}

export interface RegisterResult {
  verifiedStatus: boolean;
}

export interface LoginResult {
  verified: true;
  jwt: string;
}

export interface ErrorResult {
  error: string;
}

interface ChallengeInputOptions extends AuthenticationExtensionsClientInputs {
  largeBlob: any;
}

interface ChallengeOutputptions extends AuthenticationExtensionsClientOutputs {
  largeBlob: any;
}

// class
class WembatClient {
  apiUrl = "";
  axiosClient: AxiosInstance | undefined;
  publicKey: CryptoKey | undefined;
  privateKey: CryptoKey | undefined;

  // constructor
  constructor(url: string) {
    this.apiUrl = url;
    this.axiosClient = axios.create({
      baseURL: `${this.apiUrl}/webauthn`,
      validateStatus: function (status) {
        return status == 200 || status == 400;
      },
    });
    this.axiosClient.defaults.headers.common["content-type"] =
      "Application/Json";
    // if(this.axiosClient == undefined) throw Error("Could not create axios client");
    // TODO add api token
    // this.axiosClient.defaults.headers.common['Authorization'] = AUTH_TOKEN;
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

  // helper function
  str2ab(str: string): ArrayBuffer {
    str = atob(str);
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  // helper function
  ab2str(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(buf)]));
  }

  validateStatus(status: number) {
    return status == 200 || status == 400; // default
  }

  // main function
  async register(userUId: string): Promise<WembatActionResponse> {
    // TODO maybe check for largeblob not supported

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    try {
      if (this.axiosClient == undefined) throw Error("Axiso Client undefined!");

      const requestRegisterResponse = await this.axiosClient.post<any>(
        `/request-register`,
        {
          userInfo: { userMail: userUId },
        }
      );

      if (requestRegisterResponse.status !== 200) {
        // i guess we need to handle errors here
        throw Error(requestRegisterResponse.data);
      }

      const requestRegisterResponseData = requestRegisterResponse.data;
      const challengeOptions: PublicKeyCredentialCreationOptionsJSON =
        requestRegisterResponseData.options;

      const credentials = await startRegistration(challengeOptions).catch(
        (err: string) => {
          throw Error(err);
        }
      );

      // TODO add check for largeBlob supported

      const registerResponse = await this.axiosClient.post<any>(`/register`, {
        challengeResponse: {
          credentials: credentials,
          challenge: challengeOptions.challenge,
          deviceToken: "",
        },
      });

      if (registerResponse.status !== 200) {
        // i guess we need to handle errors here
        throw Error(registerResponse.data);
      }

      const registerResponseData = registerResponse.data;

      const registerResult: RegisterResult = {
        verifiedStatus: registerResponseData.verified,
      };
      actionResponse.result = registerResult as RegisterResult;
      actionResponse.success = true;
    } catch (error: any) {
      const errorMessage: ErrorResult = {
        error: error,
      };
      actionResponse.result = errorMessage as ErrorResult;
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
      if (this.axiosClient == undefined) throw Error("Axiso Client undefined!");

      const loginRequestResponse = await this.axiosClient.post<any>(
        `/request-login`,
        {
          userInfo: { userMail: userUId },
        }
      );

      if (loginRequestResponse.status !== 200) {
        // i guess we need to handle errors here
        throw Error(loginRequestResponse.data);
      }

      const loginRequestResponseData = loginRequestResponse.data;

      const challengeOptions = loginRequestResponseData.options;
      const pubicUserKey = loginRequestResponseData.publicUserKey;

      let privateKey: CryptoKey | undefined;
      let publicKey: CryptoKey | undefined;

      console.log(challengeOptions);

      const inputOptions: ChallengeInputOptions | undefined =
        challengeOptions.extensions as ChallengeInputOptions;

      // check if we want to read or write
      if (inputOptions?.largeBlob.read) {
        publicKey = await this.loadCryptoPublicKeyFromString(pubicUserKey);
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

      if (privateKey !== undefined && publicKey !== undefined) {
        this.setCryptoPrivateKey(privateKey);
        this.setCryptoPublicKey(publicKey);
      } else {
        // TODO throw error
        console.error("private key or public key undefined!");
        throw Error("private key or public key undefined!");
        // console.log(this.privateKey);
        // console.log(this.publicKey);
      }

      // console.log(this.privateKey);
      // console.log(this.publicKey);

      // send public key to server if we just created one
      const pubKeyString =
        publicKey !== undefined
          ? await this.saveCryptoKeyAsString(publicKey)
          : "";

      const loginReponse = await this.axiosClient.post<any>(`/login`, {
        // TODO interfaces for request bodies
        challengeResponse: {
          credentials: credentials,
          challenge: challengeOptions.challenge,
          pubKey: pubKeyString,
          // secret: this.ab2str(sharedSecret)
        },
      });

      if (loginReponse.status !== 200) {
        throw Error(loginReponse.data);
      }

      const loginReponseData = loginReponse.data;

      console.log(loginReponseData);

      const loginResult: LoginResult = {
        verified: loginReponseData.verified,
        jwt: loginReponseData.jwt,
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

  async encrypt(
    wembatMessage: WembatMessage,
    publicKey: CryptoKey
  ): Promise<WembatActionResponse> {
    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    try {
      const encryptionKey = await this.deriveEncryptionKey(publicKey);
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
        message: "",
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

  async decrypt(
    wembatMessage: WembatMessage,
    publicKey: CryptoKey
  ): Promise<WembatActionResponse> {
    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    try {
      const encryptionKey = await this.deriveEncryptionKey(publicKey);
      const iv = wembatMessage.iv;

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: this.str2ab(iv),
        },
        encryptionKey,
        this.str2ab(wembatMessage.encrypted)
      );

      const dec = new TextDecoder();
      const message: WembatMessage = {
        message: dec.decode(decrypted),
        encrypted: "",
        iv: iv,
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

  async deriveEncryptionKey(publicKey: CryptoKey): Promise<CryptoKey> {
    if (this.privateKey !== undefined && publicKey !== undefined) {
      const encryptionKey = await window.crypto.subtle.deriveKey(
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
        ["encrypt", "decrypt"]
      );
      return encryptionKey;
    } else {
      throw Error("Could not derive Encryption Key");
    }
  }

  async saveCryptoKeyAsString(cryptoKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("jwk", cryptoKey);
    return JSON.stringify(exported);
  }

  async loadCryptoPublicKeyFromString(
    pubKeyString: string
  ): Promise<CryptoKey> {
    if (pubKeyString !== "") {
      return await window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(pubKeyString),
        {
          name: "ECDH",
          namedCurve: "P-384",
        },
        true,
        []
      );
    } else {
      throw Error("Public Key String empty");
    }
  }

  async loadCryptoPrivateKeyFromString(
    privateKeyString: string
  ): Promise<CryptoKey> {
    if (privateKeyString !== "") {
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
      throw Error("Private Key String empty");
    }
  }
}

export { WembatClient };
