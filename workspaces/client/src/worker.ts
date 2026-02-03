// secure.worker.ts
import axios, { AxiosInstance } from 'axios';
import { encrypt } from './functions/encrypt';
import { Bridge } from './bridge';
import { BridgeMessageType, DecryptContent, EncryptContent, InitContent, LoginContent, RegisterContent } from './types';
import { decrypt } from './functions/decrypt';
import { login } from './functions/login';
import { register } from './functions/register';
import { Store } from './store';

const bridge = new Bridge(self as any);
const store = new Store();

let axiosClient: AxiosInstance | undefined;

// axiosClient.defaults.headers.common["Authorization"] =
//   `Bearer ${this.#jwt}`;
bridge.on(BridgeMessageType.Init, async (content: InitContent) => {
  console.log("init worker");
  
  axiosClient = axios.create({
    baseURL: `${content.tokenPayload.iss}/api/webauthn`,
    validateStatus: function (status) {
      return status == 200 || status == 400;
    },
    transformResponse: (res) => res,
    responseType: "text",
  });

  axiosClient.defaults.headers.common["Content-Type"] =
    "application/json";
  axiosClient.defaults.headers.common["Wembat-App-Token"] =
			`Bearer ${content.token}`;
  //return encrypt(privateKey, content.message, content.key);
});

bridge.on(BridgeMessageType.Encrypt, async (content: EncryptContent) => {
  //return encrypt(privateKey, content.message, content.key);
});

bridge.on(BridgeMessageType.Decrypt, async (content: DecryptContent) => {
  //return decrypt(privateKey, content.message, content.key);
});

bridge.on(BridgeMessageType.Register, async (content: RegisterContent) => {
  if (axiosClient == undefined) return null;
  return register(axiosClient, bridge, content.userMail, content.autoRegister);
});

bridge.on(BridgeMessageType.Login, async (content: LoginContent) => {
  console.log("start worker login");
    if (axiosClient == undefined) return null;
  return login(axiosClient, bridge, store, content.userMail, content.autoLogin);
});