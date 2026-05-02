// secure.worker.ts
import axios, { AxiosInstance } from 'axios';
import { encrypt } from './functions/encrypt';
import { Bridge, BridgeMessageType, LinkContent, OnboardContent, DecryptContent, EncryptContent, InitContent, LoginContent, RegisterContent  } from './bridge';
import { decrypt } from './functions/decrypt';
import { login } from './functions/login';
import { register } from './functions/register';
import { Store } from './store';
import { onboard } from './functions/onboard';
import { link } from './functions/link';

const bridge = new Bridge(self as any);
const store = new Store();

let axiosClient: AxiosInstance | undefined;

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
});

bridge.on(BridgeMessageType.Encrypt, async (content: EncryptContent) => {
  return encrypt(store, content.message, content.key);
});

bridge.on(BridgeMessageType.Decrypt, async (content: DecryptContent) => {
  return decrypt(store, content.message, content.key);
});

bridge.on(BridgeMessageType.Register, async (content: RegisterContent) => {
  if (axiosClient == undefined) return null;
  return register(axiosClient, bridge, store, content.userMail, content.autoRegister);
});

bridge.on(BridgeMessageType.Login, async (content: LoginContent) => {
  if (axiosClient == undefined) return null;
  return login(axiosClient, bridge, store, content.userMail, content.autoLogin);
});

bridge.on(BridgeMessageType.Link, async (content: LinkContent) => {
  if (axiosClient == undefined) return null;
  return link(axiosClient, store, bridge);
});

bridge.on(BridgeMessageType.Onboard, async (content: OnboardContent) => {
  if (axiosClient == undefined) return null;
  return onboard(axiosClient, bridge, store);
});