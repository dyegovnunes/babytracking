# Yaya — Guia de Ajustes UX (Batch 3)
**Data:** 2026-04-12 | **Prioridade:** P1

---

## Contexto
~20 ajustes de UX organizados por área. Cada item tem o arquivo-alvo, o comportamento atual e o comportamento esperado. Implementar na ordem apresentada.

**Regra geral de UX:** linguagem acessível, mínimo de cliques, adaptado para pais exaustos.

---

## 1. SALTOS DE DESENVOLVIMENTO (3 itens)

### 1.1 — Modal de salto: mostrar datas em vez de semanas

**Arquivo:** `app/src/components/LeapCard.tsx`

**Comportamento atual:**
- Linha 52: `Salto ${leap.id} em ${weeksUntil} semana${weeksUntil! > 1 ? 's' : ''}`
- Linha 58: `(semanas ${leap.weekStart}-${leap.weekEnd})`
- A modal e timeline mostram semanas (ex: "semanas 5-6")

**Comportamento esperado:**
- Mostrar datas no formato DD/MM (ex: "12/04 — 25/04")
- Calcular data de início e fim usando `birthDate` + `weekStart`/`weekEnd` semanas
- Onde hoje diz "em X semanas", mostrar "a partir de DD/MM"
- Na timeline, os labels dos leaps devem mostrar DD/MM de início

**Implementação:**
```typescript
// Helper para calcular data a partir de semanas
function weekToDate(birthDate: string, week: number): Date {
  const birth = new Date(birthDate);
  return new Date(birth.getTime() + week * 7 * 86400000);
}

function formatDDMM(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}
```

Substituir:
- `semanas ${leap.weekStart}-${leap.weekEnd}` → `${formatDDMM(weekToDate(birthDate, leap.weekStart))} — ${formatDDMM(weekToDate(birthDate, leap.weekEnd))}`
- `em ${weeksUntil} semana(s)` → `a partir de ${formatDDMM(weekToDate(birthDate, leap.weekStart))}`

---

### 1.2 — Corrigir acentos em todos os textos dos saltos

**Arquivo:** `app/src/lib/developmentLeaps.ts`

**Comportamento atual:**
Todos os textos estão SEM acento. Exemplos:
- `"Sensacoes"` → deveria ser `"Sensações"`
- `"O bebe comeca a perceber"` → `"O bebê começa a perceber"`
- `"nao e manha"` → `"não é manha"`
- `"Padroes"` → `"Padrões"`
- `"Transicoes suaves"` → `"Transições suaves"`
- `"intencao"` → `"intenção"`

**Comportamento esperado:**
Revisar TODOS os campos de texto (`name`, `subtitle`, `pushText`, `description`, `whatToExpect[]`, `tips[]`, `registroImpact`) de todos os 10 leaps e adicionar acentos corretos em português. Exemplos de palavras que precisam de acento:

| Errado | Correto |
|---|---|
| sensacoes | sensações |
| bebe | bebê |
| comeca | começa |
| atencao | atenção |
| padroes | padrões |
| nao | não |
| manha | manhã |
| mamadeira | mamadeira (ok) |
| intencao | intenção |
| sequencias | sequências |
| dificil | difícil |
| frustracao | frustração |
| proprias | próprias |
| tambem | também |
| alem | além |
| voce | você |
| visao | visão |
| transicoes | transições |

Revisar todos os 10 leaps cuidadosamente.

---

### 1.3 — Simplificar textos técnicos ou em inglês

**Arquivo:** `app/src/lib/developmentLeaps.ts`

**Comportamento atual:**
Alguns textos usam linguagem técnica ou termos em inglês que pais comuns não entendem:
- `"clingy"` → não é português
- `"IA"` (Introdução Alimentar) → sigla não explicada
- Termos como "ansiedade de separação" podem ser mantidos mas com linguagem mais acolhedora

**Comportamento esperado:**
- Substituir `"clingy"` por `"grudento"` ou `"grudadinho"`
- Substituir `"IA"` por `"introdução alimentar"` (por extenso)
- Linguagem deve ser de mãe/pai conversando com outro pai, nunca acadêmica
- Manter o tom acolhedor e empático

---

## 2. PROJEÇÕES (1 item)

### 2.1 — Remover botão X do badge de projeção

**Arquivo:** `app/src/components/activity/PredictionCard.tsx`

**Comportamento atual:**
- O componente tem swipe left para dispensar (funcionando)
- Existe um botão "X" no badge que aparece cortado visualmente

**Comportamento esperado:**
- Remover completamente o botão "X" (dismiss via visual button)
- Manter apenas o swipe left como mecanismo de dismiss
- Procurar no JSX do componente qualquer elemento de dismiss button/X e removê-lo
- O `onDismiss` deve continuar sendo chamado apenas pelo `handleTouchEnd` quando `offsetX < -SWIPE_THRESHOLD`

**Nota:** O arquivo lido mostra o componente sem X visível no trecho carregado, mas pode haver um X no trecho não carregado (após linha 85). Verificar o componente completo e remover qualquer botão de dismiss visual que não seja o swipe.

---

## 3. REGISTROS (1 item)

### 3.1 — Android back button: fechar modal em vez de navegar

**Arquivo:** `app/src/components/ui/EditModal.tsx`

**Comportamento atual:**
- A modal é um `div` com `position: fixed` e `z-50`
- Quando o usuário aperta "Voltar" no Android, o modal fecha MAS também navega para a página anterior (dupla ação)
- Isto acontece porque o botão Voltar do Android dispara `history.back()` e o modal não intercepta

**Comportamento esperado:**
- O botão Voltar do Android deve APENAS fechar o modal (chamar `onClose`)
- NÃO deve navegar para a página anterior
- Após fechar o modal, o usuário deve permanecer na mesma tela

**Implementação sugerida:**
Usar a History API para empurrar um estado quando o modal abre e escutar `popstate`:

```typescript
import { useEffect } from 'react';

// Dentro do EditModal, adicionar:
useEffect(() => {
  // Push a state to history so back button can "pop" it
  window.history.pushState({ modal: 'edit' }, '');

  const handlePopState = (e: PopStateEvent) => {
    // Back button pressed — close modal instead of navigating
    onClose();
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
    // If modal is closed by other means (save/delete/cancel),
    // we need to go back to remove the extra history entry
    // But only if the modal state is still in history
    if (window.history.state?.modal === 'edit') {
      window.history.back();
    }
  };
}, [onClose]);
```

**Atenção:** Usar `useCallback` no `onClose` no componente pai para evitar re-renders infinitos. Testar com cuidado a limpeza do history state.

**Aplicar em TODOS os modais do app que têm o mesmo problema**, não apenas no EditModal. Verificar:
- `EditModal.tsx`
- Qualquer outro modal fullscreen que use `position: fixed`

---

## 4. PERFIL (10 itens)

### 4.1 — HeroIdentity: clicar navega para ProfilePage

**Arquivo:** `app/src/components/activity/HeroIdentity.tsx`

**Comportamento atual (linhas 40-42):**
```tsx
onClick={hasMultiple ? () => setSwitcherOpen(true) : undefined}
```
- Quando há múltiplos bebês: abre BabySwitcher
- Quando há apenas um bebê: não faz nada (não é clicável)

**Comportamento esperado:**
- Sempre clicável
- Tap → navega para `/profile`
- Se há múltiplos bebês: long press → abre BabySwitcher (ou manter o switcher no dropdown do chevron)

**Implementação:**
```typescript
import { useNavigate } from 'react-router-dom';

// No componente:
const navigate = useNavigate();

// onClick do container principal:
onClick={() => navigate('/profile')}

// Se hasMultiple, manter o chevron como botão separado para abrir BabySwitcher
// Ou: tap curto = profile, long press = switcher
```

Manter o feedback visual `active:opacity-80` sempre (não só quando `hasMultiple`).

---

### 4.2 — Remover seção "Seu perfil" da ProfilePage

**Arquivo:** `app/src/pages/ProfilePage.tsx`

**Comportamento atual (linhas 223-273):**
Card "Seu perfil" mostrando email e nome de exibição.

**Comportamento esperado:**
- Remover esse card completamente
- Email e nome do usuário NÃO precisam aparecer na ProfilePage
- A seção "Conta" já existe na SettingsPage (com email + botão sair)

---

### 4.3 — Remover card de idade do bebê

**Arquivo:** `app/src/pages/ProfilePage.tsx`

**Comportamento atual (linhas 278-283):**
```tsx
{ageText && (
  <div className="bg-surface-container rounded-lg p-4 flex items-center gap-3">
    <span className="material-symbols-outlined text-primary text-xl">cake</span>
    <p className="font-body text-sm text-on-surface">{ageText}</p>
  </div>
)}
```

**Comportamento esperado:**
- Remover esse card. A idade já aparece no HeroIdentity do tracker e no BabyCard.

---

### 4.4 — Mover seção Cuidadores para abaixo de Crescimento

**Arquivo:** `app/src/pages/ProfilePage.tsx`

**Comportamento atual — ordem das seções:**
1. Seu perfil (será removido — item 4.2)
2. BabyCard
3. Idade (será removido — item 4.3)
4. Cuidadores
5. Crescimento
6. PrepareConsultation
7. SharedReports
8. DataManagement

**Comportamento esperado — nova ordem:**
1. BabyCard
2. Crescimento (GrowthSection)
3. Cuidadores
4. SharedReports (renomeado — item 4.5)
5. PrepareConsultation
6. DataManagement

---

### 4.5 — Renomear SharedReports para "Super relatório"

**Arquivo:** `app/src/components/profile/SharedReports.tsx`

**Comportamento atual:**
O componente provavelmente usa o título "Compartilhar com profissionais" ou similar.

**Comportamento esperado:**
- Título: **"Super relatório do [nome]"** (se `baby.gender === 'boy'`) ou **"Super relatório da [nome]"** (se `baby.gender === 'girl'`)
- Se o gênero não estiver definido, usar "Super relatório de [nome]"
- O componente precisa receber `babyName` e `babyGender` como props (ou usar o contexto AppState)

**Exemplo:**
- Menino "Miguel" → "Super relatório do Miguel"
- Menina "Sofia" → "Super relatório da Sofia"

---

### 4.6 — Botão de Configurações na ProfilePage

**Arquivo:** `app/src/pages/ProfilePage.tsx`

**Comportamento atual:**
Não há botão/ícone de configurações na ProfilePage.

**Comportamento esperado:**
- Adicionar ícone de engrenagem (⚙️ ou `settings` do Material Symbols) no header da ProfilePage
- Ao clicar, navegar para `/settings`
- Posição: canto superior direito do header

```tsx
<section className="px-5 pt-6 pb-4 flex items-center justify-between">
  <div>
    <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">Perfil</h1>
    <p className="font-label text-sm text-on-surface-variant">Dados do bebê</p>
  </div>
  <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center active:bg-surface-container">
    <span className="material-symbols-outlined text-on-surface-variant text-xl">settings</span>
  </button>
</section>
```

---

### 4.7 — Mover "Sair da conta" para ProfilePage

**Arquivo:** `app/src/pages/ProfilePage.tsx` + `app/src/pages/SettingsPage.tsx`

**Comportamento atual:**
- O botão "Sair da conta" está na SettingsPage (linhas 412-420)
- Na ProfilePage não existe

**Comportamento esperado:**
- Adicionar "Sair da conta" no final da ProfilePage (abaixo de DataManagement)
- Manter também na SettingsPage (ambos os locais)
- Usar mesmo estilo: botão vermelho com `bg-error/10 text-error`

---

### 4.8 — GrowthSection: corrigir máscara de peso (direita → esquerda)

**Arquivo:** `app/src/components/profile/GrowthSection.tsx`

**Comportamento atual (função `applyMask`, linhas 18-40):**
- A máscara funciona da esquerda para a direita
- Peso usa `maxIntDigits: 2` → `xx,x`
- Problema: se o usuário digita "36" para registrar 3,6 kg, fica "36," e precisa digitar "0" para virar "03,6"
- Comportamento frustrante para pais

**Comportamento esperado:**
- Peso: 1 casa decimal é suficiente
- Quando o usuário digita "36", deve virar "3,6" (interpreta como 3.6 kg)
- Quando digita "360", deve virar "36,0"
- A vírgula é inserida automaticamente antes do último dígito
- Funciona como máscara monetária (preenche da direita para a esquerda)

**Implementação sugerida:**
```typescript
function weightMask(raw: string): string {
  // Remove tudo exceto números
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  
  // Máximo 3 dígitos (ex: 99,9)
  const limited = digits.slice(0, 3);
  
  if (limited.length === 1) {
    return `0,${limited}`; // "3" → "0,3"
  }
  
  const intPart = limited.slice(0, -1);
  const decPart = limited.slice(-1);
  
  // Remove leading zero desnecessário
  const cleanInt = intPart.replace(/^0+/, '') || '0';
  return `${cleanInt},${decPart}`;
}

function heightMask(raw: string): string {
  // Remove tudo exceto números
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  
  // Máximo 4 dígitos (ex: 100,5 cm)
  const limited = digits.slice(0, 4);
  
  if (limited.length === 1) {
    return `0,${limited}`;
  }
  
  const intPart = limited.slice(0, -1);
  const decPart = limited.slice(-1);
  
  const cleanInt = intPart.replace(/^0+/, '') || '0';
  return `${cleanInt},${decPart}`;
}
```

Aplicar a mesma lógica nos inputs de edição e retroativo.

---

### 4.9 — GrowthSection: permitir edição de medições

**Arquivo:** `app/src/components/profile/GrowthSection.tsx`

**Comportamento atual:**
As funções `handleEdit` e `handleEditSave` já existem (linhas 118-148). Verificar se estão funcionando corretamente:
- O botão de edição é clicar no valor (ex: "3,6 kg") na lista do histórico
- O modo edição mostra input de data + valor + botões Salvar/Cancelar

**Comportamento esperado:**
- Confirmar que a edição funciona end-to-end
- Se não funcionar, debug e corrigir
- O input de edição deve usar a nova máscara (item 4.8)

---

### 4.10 — GrowthSection: permitir adicionar dado retroativo sem dados existentes

**Arquivo:** `app/src/components/profile/GrowthSection.tsx`

**Comportamento atual (linhas 294-298):**
```tsx
{measurements.length === 0 ? (
  <p className="font-body text-xs text-on-surface-variant text-center py-2">
    Registre o peso e altura do bebê para acompanhar o crescimento
  </p>
) : (
```
- O botão "Adicionar medição anterior" só aparece dentro do histórico (`showHistory`)
- Se não há NENHUMA medição, o botão não aparece — só a mensagem informativa

**Comportamento esperado:**
- Quando não há medições, mostrar TAMBÉM o botão "Adicionar medição anterior"
- Isso permite que pais registrem dados do nascimento ou de consultas anteriores sem ter que registrar o peso atual primeiro

```tsx
{measurements.length === 0 ? (
  <div className="space-y-2">
    <p className="font-body text-xs text-on-surface-variant text-center py-2">
      Registre o peso e altura do bebê para acompanhar o crescimento
    </p>
    {/* Botão retroativo aqui também */}
    <button onClick={() => { hapticLight(); setShowAddRetro(true); }}
      className="w-full py-2 rounded-lg border border-dashed border-primary/30 text-primary font-label text-xs font-semibold flex items-center justify-center gap-1">
      <span className="material-symbols-outlined text-sm">add</span>
      Adicionar medição anterior
    </button>
  </div>
) : (
```

E o formulário retroativo (`showAddRetro`) também precisa ser renderizado fora do bloco `showHistory`.

---

## 5. CONFIGURAÇÕES (5 itens)

### 5.1 — "Pausar alertas durante sono": default ativado

**Arquivo:** `app/src/pages/SettingsPage.tsx` + lógica de inicialização

**Comportamento atual (linha 282-289):**
- Toggle "Pausar alertas durante sono" — valor vem do estado `pauseDuringSleep`
- O default depende de como é inicializado no contexto

**Comportamento esperado:**
- O default para novos usuários deve ser `true` (ativado)
- Verificar no AppContext/reducer onde `pauseDuringSleep` é inicializado e garantir que o default seja `true`
- Se o campo `pause_during_sleep` não existir no banco para o usuário, tratar como `true`

---

### 5.2 — Banho: dar mais espaço visual

**Arquivo:** `app/src/pages/SettingsPage.tsx`

**Comportamento atual (linhas 291-333):**
- Seção de banho está agrupada dentro de "Intervalos e horários"
- O header "Banho" é pequeno e a seção fica colada com sono

**Comportamento esperado:**
- Adicionar mais espaçamento antes da seção de Banho
- Considerar tornar Banho uma seção separada (com seu próprio card `<section>`) em vez de estar dentro de "Intervalos e horários"
- Manter visualmente distinto para o usuário entender que banho funciona diferente (é agendamento, não intervalo)

---

### 5.3 — Notificações: destacar visualmente

**Arquivo:** `app/src/pages/SettingsPage.tsx`

**Comportamento atual (linhas 336-406):**
- Seção "Notificações" é a segunda seção da página
- Visualmente tem o mesmo peso que as outras seções

**Comportamento esperado:**
- Adicionar destaque visual na seção de notificações quando estiverem DESATIVADAS
- Se `prefs.enabled === false`: mostrar banner de atenção sutil (ex: amber/warning background)
- Texto sugestivo: "Suas notificações estão desativadas. Ative para não perder lembretes importantes."
- Isso ajuda pais que desativaram sem querer

---

### 5.4 — Tooltip: corrigir z-index

**Arquivo:** `app/src/pages/SettingsPage.tsx` (ou componente de tooltip global)

**Comportamento atual:**
- Os tooltips/info modals (ex: "Como funciona o sono") podem ficar atrás de outros elementos
- O z-index do tooltip pode estar conflitando com outros elementos fixos

**Comportamento esperado:**
- Verificar os info modals (linhas 516-592) — eles usam `z-50`
- Garantir que nenhum outro elemento tenha z-index >= 50 que interfira
- Se necessário, aumentar para `z-[60]` ou `z-[100]`
- Testar: abrir info modal com header sticky visível, confirmar que não há sobreposição

---

### 5.5 — Renomear "Horário silencioso" → "Horário de sono noturno"

**Arquivo:** `app/src/pages/SettingsPage.tsx`

**Comportamento atual (linhas 381-405):**
```tsx
<p className="font-body text-sm text-on-surface">Horário silencioso</p>
<p className="font-label text-[11px] text-on-surface-variant">Ideal para o sono noturno</p>
```
E nos modais (linhas 516-592):
```
"Horário silencioso" / "Início do silêncio" / "Fim do silêncio"
```

**Comportamento esperado:**
- Renomear de "Horário silencioso" → **"Horário de sono noturno"**
- Subtítulo: "Notificações pausadas neste período"
- Modais: "Início do sono noturno" / "Fim do sono noturno"
- Mover esta seção para DENTRO da seção de Sono (após "Janela de sono" e "Pausar alertas durante sono")
- Faz mais sentido semanticamente — é uma configuração de sono, não de notificação geral
- No modal informativo de notificações (linha 582-586), atualizar o texto que menciona "Horário silencioso" para "Horário de sono noturno"

---

## Ordem de Implementação Sugerida

1. **Textos e renomes** (1.2, 1.3, 4.5, 5.5) — mais simples, impacto visual imediato
2. **Remoções/reordenação** (4.2, 4.3, 4.4) — limpeza da ProfilePage
3. **Funcionalidade** (1.1, 2.1, 3.1, 4.1, 4.6, 4.7) — novos comportamentos
4. **Máscara/input** (4.8, 4.9, 4.10) — GrowthSection
5. **Config refinamentos** (5.1, 5.2, 5.3, 5.4) — SettingsPage

---

## Checklist Final

- [ ] Todos os textos em português correto (acentos)
- [ ] Nenhum termo em inglês sem tradução
- [ ] Todos os modais interceptam Android back button
- [ ] ProfilePage reorganizada na nova ordem
- [ ] Máscara de peso funciona da direita para esquerda
- [ ] HeroIdentity navega para perfil ao clicar
- [ ] "Horário silencioso" renomeado em todos os lugares
- [ ] Testar em dispositivo Android (back button, modais)
- [ ] Testar em iOS (comportamento deve ser idêntico)
