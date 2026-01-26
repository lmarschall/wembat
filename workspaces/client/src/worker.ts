// secure.worker.ts
import { deriveEncryptionKeyFromPRF } from './functions/helper';
import { LoginResponse, WorkerAction, WorkerResponse } from './types';

// GLOBALER ZUSTAND IM WORKER
// Dieser Key existiert nur im RAM dieses Workers.
// Sobald der Worker terminiert wird, ist der Key weg.
let signingKey: CryptoKey | null = null;
let jwt: string | undefined;
let publicKey: CryptoKey | undefined;
let privateKey: CryptoKey | undefined;

const ctx: Worker = self as any;

// Hilfsfunktion: Antwort senden
function respond(response: WorkerResponse) {
  ctx.postMessage(response);
}

async function initializeWorker(loginResponse: LoginResponse) {

  const token = loginResponse.token;
  const seedString = loginResponse.seedString;
  const ivString = loginResponse.ivString;

  if (credentials.clientExtensionResults === undefined)
    throw Error("Credentials not instance of PublicKeyCredential");

  const credentialExtensions = credentials.clientExtensionResults as any;

  const inputKeyMaterial = new Uint8Array(
    credentialExtensions?.prf.results.first
  );

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
				throw Error(saveCredentialsResponse.data);
		}
}

ctx.onmessage = async (event: MessageEvent<WorkerAction>) => {
  const action = event.data;

  try {
    switch (action.type) {
      case 'INITIALIZE':

        if (action.loginResponse === undefined)
          throw Error("no login response");

        await initializeWorker(action.loginResponse);

        // 3. (Optional) Public Key ableiten/zurückgeben zur Verifikation
        // In WebCrypto ist es schwer, den Public Key aus dem Private Key zu extrahieren, 
        // wenn er nicht exportierbar ist. Oft speichert man den Public Key separat
        // oder nutzt JWK Import. Hier vereinfacht: Wir melden nur Erfolg.
        respond({ type: 'INIT_SUCCESS', publicKey: new Uint8Array(0) }); 
        
        // WICHTIG: Original Seed aus Speicher des Events entfernen (best effort)
        // JS hat keinen direkten "memset", aber wir lassen die Variable scope verlassen.
        break;

      case 'SIGN_DATA':
        if (!signingKey) throw new Error('Key not initialized');
        
        const signature = await crypto.subtle.sign(
          { name: 'Ed25519' },
          signingKey,
          action.data
        );
        
        respond({ type: 'SIGNATURE_RESULT', signature: new Uint8Array(signature) });
        break;

      case 'CLEAR_MEMORY':
        signingKey = null;
        // Erzwinge Garbage Collection (indirekt)
        respond({ type: 'ERROR', message: 'Memory cleared' });
        break;
    }
  } catch (err: any) {
    respond({ type: 'ERROR', message: err.message });
  }
};