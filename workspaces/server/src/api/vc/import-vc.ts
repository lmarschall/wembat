import express, { Request, Response } from 'express';

// --- Interfaces für OpenID4VCI ---

interface CredentialOffer {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants: {
    'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
      'pre-authorized_code': string;
      user_pin_required?: boolean;
    };
  };
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  c_nonce?: string;
  error?: string;
  error_description?: string;
}

interface CredentialResponse {
  credential?: string; // Das JWT
  format?: string;
  c_nonce?: string;
  error?: string;
}

const app = express();
app.use(express.json());

// --- Die Import-Funktion ---

app.post('/api/import-vc', async (req: Request, res: Response) => {
  try {
    const { offerUrl }: { offerUrl: string } = req.body;

    if (!offerUrl) {
      return res.status(400).json({ error: "Keine Offer-URL übermittelt" });
    }

    // 1. Offer-URL auflösen
    // Wir normalisieren die URL, um sie parsen zu können
    const normalizedUrl = new URL(offerUrl.replace('openid-credential-offer://', 'https://'));
    const offerUri = normalizedUrl.searchParams.get('credential_offer_uri');
    
    let offerData: CredentialOffer;

    if (offerUri) {
      // Wenn das Offer hinter einer URI liegt (Standard bei walt.id Portal)
      const response = await fetch(offerUri);
      offerData = await response.json() as CredentialOffer;
    } else {
      // Wenn das Offer direkt als JSON-String in der URL steckt
      const offerParam = normalizedUrl.searchParams.get('credential_offer');
      if (!offerParam) throw new Error("Ungültiges Credential Offer Format");
      offerData = JSON.parse(offerParam) as CredentialOffer;
    }

    const issuerBaseUrl = offerData.credential_issuer;
    const preAuthGrant = offerData.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code'];
    const preAuthCode = preAuthGrant['pre-authorized_code'];

    // 2. Access Token abrufen (Pre-Authorized Code Flow)
    const tokenParams = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
      'pre-authorized_code': preAuthCode
    });

    // Falls ein User-PIN erforderlich wäre, müsste dieser hier mit req.body kommen
    // if (preAuthGrant.user_pin_required) tokenParams.append('user_pin', req.body.userPin);

    const tokenResponse = await fetch(`${issuerBaseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    const tokenData = await tokenResponse.json() as TokenResponse;

    if (!tokenData.access_token) {
      return res.status(400).json({ 
        error: "Token konnte nicht abgerufen werden", 
        details: tokenData.error_description || tokenData.error 
      });
    }

    // 3. Das Credential anfordern
    const configId = offerData.credential_configuration_ids[0];

    const credentialResponse = await fetch(`${issuerBaseUrl}/credential`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credential_configuration_id: configId,
        format: "jwt_vc_json"
      })
    });

    const vcData = await credentialResponse.json() as CredentialResponse;

    if (vcData.credential) {
      // Erfolg: Sende das JWT an dein Wembat-Frontend
      return res.json({
        jwt: vcData.credential,
        type: configId,
        issuer: issuerBaseUrl
      });
    } else {
      throw new Error(`Credential Error: ${vcData.error || 'Unbekannter Fehler'}`);
    }

  } catch (error: any) {
    console.error("Wembat Import Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});