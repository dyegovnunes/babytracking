# App Store Connect — Setup Completo para IAP (2026-04-22)

## Pré-requisito: Paid Apps Agreement
Para IAP funcionar na App Store, o Paid Apps Agreement precisa estar **Active**.
Sem ele, o ASC não serve os produtos pro RevenueCat/StoreKit mesmo que tudo
esteja configurado corretamente no RC Dashboard.

**Caminho:** App Store Connect → Contratos → Paid Apps → Aceitar → preencher dados

## Passos concluídos

### 1. DSA Compliance
- Declarar status como developer brasileiro (fora da UE/EEA)
- Campo "DSA entity type": developer individual
- Direto no painel de contratos, seção de compliance

### 2. Banking — Sicredi
- **Banco:** Sicredi — COMPE code **748**
- Tipo de conta: corrente
- IBAN não é usado no Brasil — campo fica em branco ou "N/A"
- Apple pede o número de agência (4 dígitos) + conta corrente (sem dígito verificador separado)
- Conta deve estar no CPF/CNPJ do titular do Developer Program

### 3. Formulário fiscal — Brasil
- Aceitar "Formulário fiscal do Brasil" (opção para residentes brasileiros)
- Não é o W-8BEN — é o formulário local
- Status: Active em poucas horas

### 4. W-8BEN (U.S. Certificate)
- Pessoa física brasileira vendendo no App Store precisa do W-8BEN
- Formulário digital no ASC (seção "Acordos fiscais dos EUA")
- **Part I**: nome completo, endereço brasileiro, país de residência = Brazil
- **Part II**: Treaty Benefits — Article 7 (Business profits), percentual 0%
  - Marcar "The beneficial owner is not an individual" NÃO (é pessoa física)
  - Income type: Royalties (para apps/IAP)
- **Part III**: U.S. Certificate of Foreign Status
  - Marcar "I am not a U.S. person"
  - Country of citizenship: Brazil

### 5. Resultado
Após 24-48h de processamento bancário, todos os itens ficaram **Active**:
- Paid Apps Agreement ✓ Active
- Formulário fiscal do Brasil ✓ Active
- W-8BEN ✓ Active
- U.S. Certificate of Foreign Status ✓ Active

Com tudo Active, o RevenueCat passou a retornar os produtos corretamente
(diagnostic: monthly=✓ annual=✓ lifetime=✓).

## Sandbox Testers
- Caminho: App Store Connect → Users and Access → Sandbox → Testers
- Criar com email que NÃO existe como Apple ID real
- Usar no iPhone: Settings → App Store → Sandbox Account (na parte de baixo)
- TestFlight installs funcionam com conta sandbox para testar compras

## Produtos configurados (RevenueCat Dashboard)
- `com.yayababy.app.monthly` — mensal R$34,90
- `com.yayababy.app.annual` — anual R$249,90
- `com.yayababy.app.lifetime` — vitalício R$449,90
- Offering ID usado pelo RC: `default` (current offering)
- Chave iOS pública: `appl_EsyNTUbNiabdxStyPcJgQIXUIKo`
