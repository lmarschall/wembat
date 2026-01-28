// secure.worker.ts
import axios, { AxiosInstance } from 'axios';
import { encrypt } from './functions/encrypt';
import { deriveEncryptionKeyFromPRF } from './functions/helper';
import { EncryptAction, LoginResponse, WembatMessage, WorkerAction, WorkerActionType, WorkerRequest, WorkerResponse, WorkerResponseType } from './types';

// GLOBALER ZUSTAND IM WORKER
// Dieser Key existiert nur im RAM dieses Workers.
// Sobald der Worker terminiert wird, ist der Key weg.
let signingKey: CryptoKey | null = null;
let jwt: string | undefined;
let publicKey: CryptoKey | undefined;
let privateKey: CryptoKey | undefined;

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

// Hilfsfunktion: Antwort senden
function respond(response: WorkerResponse) {
  ctx.postMessage(response);
}

async function initializeWorker(loginResponse: LoginResponse) {

  const token = loginResponse.token;
  const seedString = loginResponse.seedString;
  const ivString = loginResponse.ivString;

  const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(inputKeyMaterial, loginReponseData.salt);

  if (
			seedString !== "" &&
			ivString !== ""
		) {
			console.log("Loading existing keys");
			
			// sessionKey = deriveSessionKeyFromString()

			const { privKey, pubKey } = await deriveKeysFromEncryptedSeed(encryptionKey, seedString, ivString)

			
		} else {
			console.log("Generating new keys");

			const { encryptedSeed, iv } = await deriveEncryptedQuantumSeed(encryptionKey);

			const headers = {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			};

			const saveCredentialsResponse = await axiosClient.post<string>(
				`/update-credentials`,
				{
					updateCredentialsRequest: {
						seedString: toBase64(encryptedSeed),
						ivString: toBase64(iv),
						sessionId: loginReponseData.sessionId,
					},
				},
				{
					headers: headers,
				}
			);

			if (saveCredentialsResponse.status !== 200)
				throw new Error(saveCredentialsResponse.data);
		}
}

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const action = event.data;

  try {
    switch (action.type) {
      case WorkerActionType.Initialize: {
        if (action.loginResponse === undefined)
          throw new Error("no login response");
  
        await initializeWorker(action.loginResponse);
        break;
      }
      
      case WorkerActionType.Encrypt: { 
        const actionResponse = await encrypt(privateKey, action.content.message, action.content.key);
        const response: WorkerResponse = {id: action.id, actionResponse: actionResponse };
        respond(response);
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    respond({ type: WorkerResponseType.Error, message: err.message });
  }
};