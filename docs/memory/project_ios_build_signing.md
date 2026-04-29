# iOS Build Signing — Status e Contexto

## Status: ❌ BLOQUEADO (pausado em 2026-04-16)

## Problema
Build iOS no Codemagic falha com: `No signing certificate "iOS Distribution" found`
O certificado .p12 não está sendo instalado corretamente no keychain do Codemagic.

## O que foi feito
- Chave privada RSA gerada: `Stores/AppStore/codemagic_cert_key.pem`
- CSR gerado: `Stores/AppStore/CertificateSigningRequest.certSigningRequest`
- Certificado Apple Distribution criado: `Stores/AppStore/distribution.cer` (valido ate 2027-04-16)
- P12 criado: `Stores/AppStore/distribution.p12` (senha: "codemagic")
- Provisioning profile criado: `Stores/AppStore/Yaya_Codemagic_Distribution.mobileprovision` (com SIWA)
- Base64 dos arquivos: `Stores/AppStore/cm_certificate_b64.txt` e `cm_profile_b64.txt`

## Variáveis no Codemagic (grupo yaya_ios)
- `CM_CERTIFICATE` = base64 do .p12
- `CM_CERTIFICATE_PASSWORD` = "codemagic"
- `CM_PROVISIONING_PROFILE` = base64 do .mobileprovision
- `CERTIFICATE_PRIVATE_KEY` = PEM da chave privada
- `VITE_REVENUECAT_IOS_KEY` = chave RevenueCat

## Integração App Store Connect
- API Key: `TL5FLWZYJ9` (ativa, Admin, Issuer: 47e816e8-2638-43aa-af7c-46771c328698)

## Problema raiz não resolvido
O Xcode procura "iOS Distribution" mas o certificado é "Apple Distribution".
Hipótese: o keychain import no Codemagic está falhando silenciosamente.
Nunca conseguimos ver o log do step "Install certificate and profile" — só o erro do Build.

## Próximo passo quando retomar
1. Verificar o log completo do step "Install certificate and profile manually"
   - Especialmente `security find-identity -v -p codesigning` — mostra se o cert foi instalado
2. Considerar usar um Mac (mesmo virtual/cloud) para configurar signing uma vez
3. Alternativa: usar Codemagic's automatic signing (fetch-signing-files --create)
   com a private key correta — mas precisa debugar por que falhou antes

## Arquivos relevantes
- `codemagic.yaml` — pipeline completo com signing manual
- `app/src/contexts/AuthContext.tsx` — Sign in with Apple nativo (obrigatório, guideline 4.8)
- `app/ios/` — gitignored, regenerado a cada build por `cap add ios`
