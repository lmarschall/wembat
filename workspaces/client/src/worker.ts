// secure.worker.ts
import axios, { AxiosInstance } from 'axios';
import { encrypt } from './functions/encrypt';
import { Bridge } from './bridge';
import { BridgeMessageType, DecryptContent, EncryptContent, LoginContent, RegisterContent } from './types';
import { decrypt } from './functions/decrypt';
import { login } from './functions/login';
import { register } from './functions/register';

// GLOBALER ZUSTAND IM WORKER
// Dieser Key existiert nur im RAM dieses Workers.
// Sobald der Worker terminiert wird, ist der Key weg.
let signingKey: CryptoKey | null = null;
let jwt: string | undefined;
let publicKey: CryptoKey | undefined;
let privateKey: CryptoKey | undefined;

const bridge = new Bridge(self as any);

let apiUrl: string = "";
let axiosClient: AxiosInstance;
axiosClient = axios.create({
  baseURL: `${apiUrl}/api/webauthn`,
  validateStatus: function (status) {
    return status == 200 || status == 400;
  },
  transformResponse: (res) => res,
  responseType: "text",
});

axiosClient.defaults.headers.common["Content-Type"] =
  "application/json";
// axiosClient.defaults.headers.common["Authorization"] =
//   `Bearer ${this.#jwt}`;

const ctx: Worker = self as any;

bridge.on(BridgeMessageType.Encrypt, async (content: EncryptContent) => {
  return encrypt(privateKey, content.message, content.key);
});

bridge.on(BridgeMessageType.Decrypt, async (content: DecryptContent) => {
  return decrypt(privateKey, content.message, content.key);
});

bridge.on(BridgeMessageType.Register, async (content: RegisterContent) => {
  return register(axiosClient, bridge, content.userMail, content.autoRegister);
});

bridge.on(BridgeMessageType.Login, async (content: LoginContent) => {
  return login(axiosClient, bridge, content.userMail, content.autoLogin);
});