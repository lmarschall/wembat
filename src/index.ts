import axios from "axios";

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

// class
class WembatClient {
  apiUrl = "";

  // constructor
  constructor(url: string) {
    this.apiUrl = url;
  }

  // helper function
  str2ab(str: string) {
    // const buf = new ArrayBuffer(str.length);
    // const bufView = new Uint8Array(buf);
    // for (let i = 0, strLen = str.length; i < strLen; i++) {
    //   bufView[i] = str.charCodeAt(i);
    // }
    // return buf;
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  // helper function
  ab2str(buf: ArrayBuffer) {
    // return String.fromCharCode.apply(null, new Uint8Array(buf));
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buf);
  }

  // main function
  async requestRegister(mail: string) {
    return axios.post(`${this.apiUrl}/webauthn/request-register`, {
      headers: {
        "content-type": "Application/Json",
      },
      userInfo: { userMail: mail },
    });
  }

  // main function
  async register(
    challengeOptions: PublicKeyCredentialCreationOptionsJSON,
    token = ""
  ) {
    console.log(challengeOptions);

    const credentials = await startRegistration(challengeOptions).catch(
      (err: string) => {
        throw Error(err);
      }
    );

    console.log(credentials);

    return axios.post(`${this.apiUrl}/webauthn/register`, {
      headers: {
        "content-type": "Application/Json",
      },
      challengeResponse: {
        credentials: credentials,
        challenge: challengeOptions.challenge,
        deviceToken: token,
      },
    });
  }

  // main function
  async requestLoginRead(mail: string) {
    return axios.post(`${this.apiUrl}/webauthn/login`, {
      headers: {
        "content-type": "Application/Json",
      },
      userInfo: { userMail: mail },
    });
  }

  // main function
  async requestLoginWrite(mail: string) {
    return axios.post(`${this.apiUrl}/webauthn/login-write`, {
      headers: {
        "content-type": "Application/Json",
      },
      userInfo: { userMail: mail },
    });
  }

  // main function
  async login(
    challengeOptions: PublicKeyCredentialRequestOptionsJSON,
    credentials: RegistrationResponseJSON
  ) {
    return axios.post(`${this.apiUrl}/webauthn/login-challenge`, {
      headers: {
        "content-type": "Application/Json",
      },
      challengeResponse: {
        credentials: credentials,
        challenge: challengeOptions.challenge,
      },
    });
  }

  // main function
  async loginRead(
    challengeOptions: PublicKeyCredentialRequestOptionsJSON
  ): Promise<
    Array<
      | AuthenticationResponseJSON
      | CryptoKey
      | undefined
      | PublicKeyCredentialRequestOptionsJSON
    >
  > {
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

    // TODO check if read was successful
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
    }

    return [credentials, privKey, challengeOptions];
  }

  // main function
  async loginWrite(
    challengeOptions: PublicKeyCredentialRequestOptionsJSON
  ): Promise<Array<AuthenticationResponseJSON | CryptoKey>> {
    console.log(challengeOptions);

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

    // TODO check if write was successful
    // TODO if write was successful we have to send public key to backend

    return [credentials, keyPair.publicKey];
  }
}

export { WembatClient };
