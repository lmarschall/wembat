import axios, { AxiosError } from "axios";

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

export interface WembatActionResponse {
  success: boolean;
  result:
    LoginResult
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
  publicKey: CryptoKey | undefined;
  privateKey: CryptoKey | undefined;
  encryptionKey: CryptoKey | undefined;

  // constructor
  constructor(url: string) {
    this.apiUrl = url;
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

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    const requestRegisterResponse = await axios.post<PublicKeyCredentialCreationOptionsJSON>(
      `${this.apiUrl}/webauthn/request-register`,
      {
        headers: {
          "content-type": "Application/Json",
        },
        userInfo: { userMail: userUId },
      }
    );

    if (requestRegisterResponse.status !== 200) {
      // i guess we need to handle errors here
      const errorMessage: ErrorResult = {
        error: requestRegisterResponse.statusText,
      };
      actionResponse.result = errorMessage;
      console.error(requestRegisterResponse.statusText);
      return actionResponse;
    }

    const challengeOptions = requestRegisterResponse.data;

    const credentials = await startRegistration(challengeOptions).catch(
      (err: string) => {
        throw Error(err);
      }
    );

    const registerResponse = await axios.post<boolean>(
      `${this.apiUrl}/webauthn/register`, 
      {
        headers: {
          "content-type": "Application/Json",
        },
        challengeResponse: {
          credentials: credentials,
          challenge: challengeOptions.challenge,
          deviceToken: "",
        },
      }
    );

    if (registerResponse.status !== 200) {
      // i guess we need to handle errors here
      const errorMessage: ErrorResult = {
        error: registerResponse.statusText,
      };
      actionResponse.result = errorMessage;
      console.error(registerResponse.statusText);
      return actionResponse;
    }

    const verifiedStatus: RegisterResult = {
      verifiedStatus: registerResponse.data,
    };
    actionResponse.result = verifiedStatus;
    actionResponse.success = true;

    return actionResponse;
  }

  // main function
  async loginRead(userUId: string): Promise<WembatActionResponse> {

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    const loginResponse = await axios.post(
      `${this.apiUrl}/webauthn/login`,
      {
        headers: {
          "content-type": "Application/Json",
        },
        userInfo: { userMail: userUId },
      }
    );

    if (loginResponse.status !== 200) {
      // i guess we need to handle errors here
      const errorMessage: ErrorResult = {
        error: loginResponse.statusText,
      };
      actionResponse.result = errorMessage;
      console.error(loginResponse.statusText);
      return actionResponse;
    }

    const challengeOptions = loginResponse.data;

    let privKey: CryptoKey | undefined;

    console.log(challengeOptions);

    const inputOptions: ChallengeInputOptions | undefined =
      challengeOptions.extensions as ChallengeInputOptions;

    // check if we want to read
    if (inputOptions?.largeBlob.read) {
      console.log(inputOptions?.largeBlob.read);
    }

    const credentials = await startAuthentication(challengeOptions);

    console.log(credentials);

    const outputOptions: ChallengeOutputptions | undefined =
      credentials.clientExtensionResults as ChallengeOutputptions;

    if (Object.keys(outputOptions.largeBlob).length) {
      const keyBuffer = String.fromCodePoint(
        ...new Uint8Array(outputOptions.largeBlob.blob)
      );
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

      // TODO save private key locally
      await this.setCryptoPrivateKey(privKey);
    } else {
      const errorMessage: ErrorResult = {
        error: "response.statusText",
      };
      actionResponse.success = false;
      actionResponse.result = errorMessage;
      return actionResponse;
    }

    const loginReadResult: LoginReadResult = {
      credentials: credentials,
      privateKey: privKey,
      challengeOptions: challengeOptions
    };
    actionResponse.result = loginReadResult;
    actionResponse.success = true;

    return actionResponse;
  }

  // main function
  async loginWrite(userUId: string): Promise<WembatActionResponse> {

    const actionResponse = {
      success: false,
      result: {},
    } as WembatActionResponse;

    const loginWriteResponse = await axios.post(
      `${this.apiUrl}/webauthn/login-write`,
      {
        headers: {
          "content-type": "Application/Json",
        },
        userInfo: { userMail: userUId },
      }
    );

    if (loginWriteResponse.status !== 200) {
      // i guess we need to handle errors here
      const errorMessage: ErrorResult = {
        error: loginWriteResponse.statusText,
      };
      actionResponse.result = errorMessage;
      console.error(loginWriteResponse.statusText);
      return actionResponse;
    }

    const challengeOptions = loginWriteResponse.data;

    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-384",
      },
      true,
      ["deriveKey", "deriveBits"]
    );

    console.log(keyPair);

    const inputOptions: ChallengeInputOptions | undefined =
      challengeOptions.extensions as ChallengeInputOptions;

    // TODO check if extensions are provided

    // check if we want to write
    if (inputOptions.largeBlob.write) {
      console.log(inputOptions.largeBlob.write);
      const exported = await window.crypto.subtle.exportKey(
        "jwk",
        keyPair.privateKey
      );
      // const exportedKeyBuffer = new Uint8Array(exported);
      // const exportedKeyBuffer = new Uint8Array(this.str2ab(JSON.stringify(exported)))
      // const exportedKeyBuffer = this.str2ab(JSON.stringify(exported))
      // challengeOptions.extensions.largeBlob.write = exportedKeyBuffer;
      const blob = JSON.stringify(exported) as string;
      inputOptions.largeBlob.write = Uint8Array.from(
        blob.split("").map((c: string) => c.codePointAt(0)) as number[]
      );
      console.log(inputOptions.largeBlob.write);
    }

    console.log(challengeOptions);

    const credentials = await startAuthentication(challengeOptions);

    console.log(credentials);

    const outputOptions: ChallengeOutputptions | undefined =
      credentials.clientExtensionResults as ChallengeOutputptions;

    if (outputOptions.largeBlob.written) {
      console.log("WRITE SUCCESSFUL");
      await this.saveCryptoPublicKey(keyPair.publicKey);

      // TODO send public key to backend
    }

    const result: LoginWriteResult = {
      credentials: credentials,
      publicKey: keyPair.publicKey,
    }

    actionResponse.result = result;
    actionResponse.success = true;

    // TODO check if write was successful
    // TODO if write was successful we have to send public key to backend

    // return [credentials, keyPair.publicKey];
    return actionResponse;
  }

  // main function
  async login(
    challengeOptions: PublicKeyCredentialRequestOptionsJSON,
    credentials: RegistrationResponseJSON
  ): Promise<WembatActionResponse> {

    const actionResponse = {
      success: true,
      result: {},
    } as WembatActionResponse;

    const response = await axios.post(
      `${this.apiUrl}/webauthn/login-challenge`,
      {
        headers: {
          "content-type": "Application/Json",
        },
        challengeResponse: {
          credentials: credentials,
          challenge: challengeOptions.challenge,
        },
      }
    );

    if (response.status === 200) {
      const challengeOptions: LoginResult = {
        verified: response.data.verified,
        jwt: response.data.jwt
      };
      actionResponse.result = challengeOptions;
    } else {
      // i guess we need to handle errors here
      const errorMessage: ErrorResult = {
        error: response.statusText,
      };
      actionResponse.success = false;
      actionResponse.result = errorMessage;
      console.error(response.statusText);
    }

    return actionResponse;
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
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        this.encryptionKey,
        encoded
      );
      
      localStorage.setItem('iv', this.ab2str(iv));
      return this.ab2str(encrypted);

    } else {
      return "";
    } 
  }

  async decrypt(ciphertext: string) {
    const iv = localStorage.getItem('iv');

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
}

export { WembatClient };
