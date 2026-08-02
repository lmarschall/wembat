1. Client: nonce = crypto.getRandomValues(32 Byte)
2. Client: GET /attest?nonce=...
3. Server: { quote, certChain, enclavePubKey }
4. Client: Attestation verifizieren
           - Signaturkette bis Hersteller-Root
           - report_data == H(nonce ‖ enclavePubKey)
           - Messung ∈ policy.allowedMeasurements
           - TCB-Status aktuell
           → schlägt eine Prüfung fehl: ABBRUCH, kein Fallback
5. Client: Biometrie → PRF → KEK → DEK entpacken
6. Client: HPKE.seal(enclavePubKey, DEK + Anfrage)
7. Client: POST /query
8. Enklave: HPKE.open → Datensätze aus DB → mit DEK entschlüsseln
           → Operation ausführen → Ergebnis gegen Client-Ephemeral-Key
           versiegeln → DEK aus Speicher verwerfen
9. Client: Ergebnis entschlüsseln und anzeigen