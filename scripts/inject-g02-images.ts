// scripts/inject-g02-images.ts
// One-shot: insere ![alt](imagens/...) em cada seção do G02 conforme um
// mapping explícito por slug. Após rodar, descartar.
//
// Como rodar:
//   cd blog && tsx ../scripts/inject-g02-images.ts

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '..')
const MD = path.join(REPO_ROOT, 'content', 'infoprodutos', 'guia-primeiro-ano', 'guia-primeiro-ano.md')

// Mapeamento slug → { file, alt }
const MAP: Record<string, { file: string; alt: string }> = {
  // Módulo 1
  'sono-recem-nascido': { file: 'sono-recem-nascido-ciclo.png', alt: 'Ciclo de sono do recém-nascido em diagrama visual' },
  'amamentacao-sob-demanda': { file: 'secao-amamentacao.png', alt: 'Mãe amamentando bebê em pega correta' },
  'pega-correta-posicoes': { file: 'posicoes-amamentacao.png', alt: 'Diferentes posições para amamentar o bebê' },
  'leite-materno-ordenha-formula': { file: 'armazenamento-leite.png', alt: 'Leite materno armazenado em frascos com etiquetas de data' },
  'choro-tipos': { file: 'secao-choro.png', alt: 'Bebê chorando no colo da mãe' },
  'colicas': { file: 'pai-bebe-colica.png', alt: 'Pai acalmando bebê em posição antirrefluxo durante cólica' },
  'rotina-recem-nascido': { file: 'rotina-recem-nascido.png', alt: 'Cenas da rotina do recém-nascido em casa' },
  'ganho-peso': { file: 'consulta-pediatra-peso.png', alt: 'Pediatra pesando bebê na balança em consulta de rotina' },
  'saude-primeiro-trimestre': { file: 'bebe-saudavel-consulta.png', alt: 'Bebê saudável em consulta pediátrica' },
  'tummy-time-banho-fraldas': { file: 'banho-recem-nascido.png', alt: 'Banho seguro do recém-nascido em banheira de apoio' },

  // Módulo 2
  'regressao-sono-4-meses': { file: 'casal-noite-bebe.png', alt: 'Casal acordado à noite com bebê em regressão de sono' },
  'treinamento-sono-metodos': { file: 'bebe-dormindo-berco.png', alt: 'Bebê dormindo de costas no berço seguro' },
  'saltos-desenvolvimento': { file: 'bebe-sorrindo-4-meses.png', alt: 'Bebê de 4 meses sorrindo durante salto de desenvolvimento' },
  'marcos-3-6-meses': { file: 'bebe-explorando-maos.png', alt: 'Bebê explorando as próprias mãos como marco da fase oral' },
  'rotina-3-4-meses': { file: 'bebe-brincando-tapete.png', alt: 'Bebê brincando no tapete em rotina diurna' },
  'sono-3-6-meses': { file: 'sono-recem-nascido-ciclo.png', alt: 'Padrões de sono do bebê de 3 a 6 meses' },
  'fase-oral-rolar-brincadeiras': { file: 'bebe-espelho.png', alt: 'Bebê descobrindo o próprio reflexo no espelho' },
  'linguagem-balbucio-silabas': { file: 'adulto-conversando-bebe.png', alt: 'Adulto conversando frente a frente com bebê em desenvolvimento de linguagem' },

  // Módulo 3
  'introducao-alimentar': { file: 'primeira-papinha.png', alt: 'Bebê comendo a primeira papinha em cadeira de refeição' },
  'blw-vs-papinha': { file: 'bebe-blw-palito-legume.png', alt: 'Bebê comendo legume em palito no método BLW' },
  'alimentos-alergenicos': { file: 'ovo-mexido-bebe.png', alt: 'Ovo mexido em prato de bebê — alergênico introduzido cedo' },
  'cardapio-6-9-meses': { file: 'cardapio-bebe-colorido.png', alt: 'Cardápio colorido com variedade de alimentos para bebê' },
  'bebe-recusa-comida': { file: 'familia-mesa-bebe.png', alt: 'Família comendo junto com bebê na mesa' },
  'desenvolvimento-motor-6-9-meses': { file: 'bebe-engatinhando.png', alt: 'Bebê engatinhando em superfície segura' },
  'regressao-sono-8-9-meses': { file: 'bebe-apontando.png', alt: 'Bebê apontando para algo durante fase de ansiedade de separação' },

  // Módulo 4
  'primeiros-passos': { file: 'bebe-primeiros-passos.png', alt: 'Bebê dando os primeiros passos com apoio' },
  'primeiras-palavras': { file: 'bebe-apontando.png', alt: 'Bebê apontando enquanto fala primeiras palavras' },
  'alimentacao-9-12-meses': { file: 'bebe-pinca-comida.png', alt: 'Bebê comendo com pinça (polegar e indicador)' },
  'sono-9-12-meses': { file: 'bebe-dormindo-12-meses.png', alt: 'Bebê de 12 meses dormindo em transição para uma soneca' },
  'vacinas-primeiro-ano': { file: 'vacinacao-bebe.png', alt: 'Bebê recebendo vacina em consulta pediátrica' },
  'consulta-1-ano': { file: 'pediatra-consulta-1-ano.png', alt: 'Pediatra examinando bebê em consulta de 1 ano' },
  'doencas-comuns-primeiro-ano': { file: 'mae-bebe-doente.png', alt: 'Mãe cuidando de bebê com sintomas de virose' },
  'celebrar-primeiro-ano': { file: 'bebe-saudavel-consulta.png', alt: 'Bebê de 1 ano saudável em momento de celebração' },
}

async function main() {
  let md = await fs.readFile(MD, 'utf-8')
  let inserted = 0
  let skipped = 0

  for (const [slug, { file, alt }] of Object.entries(MAP)) {
    // Padrão: encontra `**slug:** \`<slug>\`` e insere imagem após o
    // primeiro `\`\`\`markdown\n` que vem na sequência (no máximo ~80 linhas
    // depois). Insere se ainda não houver imagem nessa seção.
    const slugRegex = new RegExp(
      `(\\*\\*slug:\\*\\*\\s*\`${slug.replace(/[-/]/g, '\\$&')}\`[\\s\\S]*?\`\`\`markdown\\s*\\n)`,
    )
    const m = md.match(slugRegex)
    if (!m) {
      console.warn(`  ⚠️  Slug "${slug}" não encontrado no MD`)
      skipped++
      continue
    }
    const headerEnd = m.index! + m[0].length
    // Verifica se já tem imagem na próxima ~10 linhas
    const tail = md.slice(headerEnd, headerEnd + 800)
    if (/!\[[^\]]*\]\(imagens\/[^)]+\)/.test(tail)) {
      console.log(`  · ${slug}: já tem imagem, pulei`)
      skipped++
      continue
    }
    // Injeta a imagem + linha em branco logo após `\`\`\`markdown\n`
    const insertion = `![${alt}](imagens/${file})\n\n`
    md = md.slice(0, headerEnd) + insertion + md.slice(headerEnd)
    console.log(`  ✓ ${slug}: ${file}`)
    inserted++
  }

  await fs.writeFile(MD, md, 'utf-8')
  console.log(`\n✅ Inseridas ${inserted} imagens, ${skipped} puladas.`)
}

main().catch(err => { console.error(err); process.exit(1) })
