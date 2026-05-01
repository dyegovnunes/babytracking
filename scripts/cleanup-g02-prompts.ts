// scripts/cleanup-g02-prompts.ts
// One-shot:
//  1. Remove blocos `**PROMPT GEMINI - <nome>.webp:**` + blockquote do MD
//  2. Em cada seção, substitui a imagem injetada por mim pela imagem que
//     o cowork havia mapeado no prompt (preserva intenção editorial).
//  3. Heros (hero-*) só remove o bloco — já viram via cover_image_url.
//
// Como rodar:
//   cd blog && tsx ../scripts/cleanup-g02-prompts.ts

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '..')
const MD = path.join(REPO_ROOT, 'content', 'infoprodutos', 'guia-primeiro-ano', 'guia-primeiro-ano.md')
const IMG_DIR = path.join(REPO_ROOT, 'content', 'infoprodutos', 'guia-primeiro-ano', 'imagens')

// Alt-text por imagem (descritivo, não-genérico)
const ALT_BY_IMAGE: Record<string, string> = {
  'sono-recem-nascido-ciclo': 'Ciclo de sono do recém-nascido em diagrama visual',
  'amamentacao-posicoes': 'Mãe brasileira amamentando bebê em posição de cavaleiro',
  'posicoes-amamentacao': 'Quatro posições de amamentação em ilustração clean',
  'armazenamento-leite': 'Frascos de leite materno armazenados com etiquetas de data',
  'bebe-chorando-colo': 'Bebê chorando no colo dos pais',
  'pai-bebe-colica': 'Pai acalmando bebê em posição antirrefluxo durante cólica',
  'rotina-recem-nascido': 'Cenas da rotina diária do recém-nascido',
  'consulta-pediatra-peso': 'Pediatra pesando bebê na balança em consulta',
  'bebe-saudavel-consulta': 'Bebê saudável em consulta pediátrica',
  'banho-recem-nascido': 'Banho seguro do recém-nascido em banheira de apoio',
  'bebe-dormindo-berco': 'Bebê dormindo de costas no berço seguro',
  'casal-noite-bebe': 'Casal acordado à noite com bebê em regressão de sono',
  'bebe-explorando-maos': 'Bebê explorando as próprias mãos como marco da fase oral',
  'bebe-sorrindo-4-meses': 'Bebê de 4 meses sorrindo durante salto de desenvolvimento',
  'bebe-brincando-tapete': 'Bebê brincando no tapete em rotina diurna',
  'bebe-espelho': 'Bebê descobrindo o próprio reflexo no espelho',
  'adulto-conversando-bebe': 'Adulto conversando frente a frente com bebê em desenvolvimento de linguagem',
  'primeira-papinha': 'Bebê comendo a primeira papinha em cadeira de refeição',
  'bebe-blw-palito-legume': 'Bebê comendo legume em palito no método BLW',
  'ovo-mexido-bebe': 'Ovo mexido em prato de bebê: alergênico introduzido cedo',
  'cardapio-bebe-colorido': 'Cardápio colorido com variedade de alimentos para bebê',
  'familia-mesa-bebe': 'Família comendo junto com bebê na mesa',
  'bebe-engatinhando': 'Bebê engatinhando em superfície segura',
  'bebe-primeiros-passos': 'Bebê dando os primeiros passos com apoio',
  'bebe-apontando': 'Bebê apontando enquanto expressa interesse',
  'bebe-pinca-comida': 'Bebê comendo com pinça (polegar e indicador)',
  'bebe-dormindo-12-meses': 'Bebê de 12 meses dormindo em transição de soneca',
  'vacinacao-bebe': 'Bebê recebendo vacina em consulta pediátrica',
  'pediatra-consulta-1-ano': 'Pediatra examinando bebê em consulta de 1 ano',
  'mae-bebe-doente': 'Mãe cuidando de bebê com sintomas de virose',
}

interface PromptBlock {
  start: number       // índice de char no MD onde começa o bloco a remover
  end: number         // índice de char onde termina (exclusivo)
  imageName: string   // nome sem .webp
  isHero: boolean
}

function findPromptBlocks(md: string): PromptBlock[] {
  const blocks: PromptBlock[] = []
  // Padrão completo: opcional **IMAGEM DE QUEBRA**\n + **PROMPT GEMINI - X.webp:** + linhas em branco + > ... blockquote
  const regex = /(?:\*\*IMAGEM DE QUEBRA\*\*\s*\n)?\*\*PROMPT GEMINI\s*-\s*([\w-]+)\.webp:\*\*\s*\n+((?:>\s*[^\n]*\n?)+)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(md)) !== null) {
    const imageName = m[1]
    blocks.push({
      start: m.index,
      end: m.index + m[0].length,
      imageName,
      isHero: imageName.startsWith('hero-'),
    })
  }
  return blocks
}

interface SectionRange {
  start: number  // depois do header "## SEÇÃO: ..."
  end: number    // antes do próximo "## SEÇÃO:" ou EOF
  slug: string
}

function findSections(md: string): SectionRange[] {
  const sections: SectionRange[] = []
  const headerRegex = /^## SEÇÃO:[^\n]*\n[\s\S]*?\*\*slug:\*\*\s*`([^`]+)`/gm
  let m: RegExpExecArray | null
  const positions: Array<{ idx: number; slug: string }> = []
  while ((m = headerRegex.exec(md)) !== null) {
    positions.push({ idx: m.index, slug: m[1].trim() })
  }
  for (let i = 0; i < positions.length; i++) {
    sections.push({
      start: positions[i].idx,
      end: i < positions.length - 1 ? positions[i + 1].idx : md.length,
      slug: positions[i].slug,
    })
  }
  return sections
}

async function imageExists(name: string): Promise<string | null> {
  for (const ext of ['png', 'jpg', 'jpeg']) {
    try {
      await fs.access(path.join(IMG_DIR, `${name}.${ext}`))
      return `${name}.${ext}`
    } catch { /* try next */ }
  }
  return null
}

async function main() {
  let md = await fs.readFile(MD, 'utf-8')
  const blocks = findPromptBlocks(md)
  console.log(`📍 Encontrados ${blocks.length} blocos PROMPT GEMINI`)

  const sections = findSections(md)
  console.log(`📂 Encontradas ${sections.length} seções`)

  // 1) Pra cada bloco non-hero, encontra a seção que contém e a imagem
  //    injetada por mim (![...](imagens/X.png)). Substitui pela imagem do prompt.
  let substitutions = 0
  let removalsHero = 0
  let imageNotFound = 0

  // Ordena blocos do FIM pro INÍCIO pra fazer edits sem invalidar índices
  const blocksReverse = [...blocks].sort((a, b) => b.start - a.start)

  for (const block of blocksReverse) {
    if (block.isHero) {
      // Hero: só remove o bloco. Deixa uma linha em branco.
      md = md.slice(0, block.start) + md.slice(block.end)
      removalsHero++
      continue
    }

    const targetFile = await imageExists(block.imageName)
    if (!targetFile) {
      console.warn(`  ⚠️  Imagem ${block.imageName}.{png,jpg} não existe — só removendo bloco`)
      md = md.slice(0, block.start) + md.slice(block.end)
      imageNotFound++
      continue
    }

    // Acha a seção que contém esse bloco
    const section = sections.find(s => block.start >= s.start && block.start < s.end)
    if (!section) {
      console.warn(`  ⚠️  Bloco em char ${block.start} não está em nenhuma seção`)
      md = md.slice(0, block.start) + md.slice(block.end)
      continue
    }

    // Recorta o bloco
    md = md.slice(0, block.start) + md.slice(block.end)
    // Atualiza posições da seção (end shift)
    const removed = block.end - block.start
    section.end -= removed
    // Procura imagem injetada nessa seção
    const sectionText = md.slice(section.start, section.end)
    const injectedImg = sectionText.match(/!\[[^\]]*\]\(imagens\/([^)]+)\)/)
    const alt = ALT_BY_IMAGE[block.imageName] ?? block.imageName.replace(/-/g, ' ')
    const newImageMd = `![${alt}](imagens/${targetFile})`

    if (injectedImg) {
      // Substitui a imagem inteira (mantém posição)
      const fullMatch = injectedImg[0]
      const idxInSection = sectionText.indexOf(fullMatch)
      const absIdx = section.start + idxInSection
      md = md.slice(0, absIdx) + newImageMd + md.slice(absIdx + fullMatch.length)
      const delta = newImageMd.length - fullMatch.length
      section.end += delta
      console.log(`  ✓ ${section.slug}: substituída pela ${targetFile}`)
      substitutions++
    } else {
      // Não havia imagem injetada — adiciona após o `\`\`\`markdown\n` da seção
      const sectionTextNow = md.slice(section.start, section.end)
      const mdBlockMatch = sectionTextNow.match(/```markdown\s*\n/)
      if (mdBlockMatch) {
        const insertAt = section.start + mdBlockMatch.index! + mdBlockMatch[0].length
        const insertion = `${newImageMd}\n\n`
        md = md.slice(0, insertAt) + insertion + md.slice(insertAt)
        section.end += insertion.length
        console.log(`  + ${section.slug}: adicionada ${targetFile} (não havia imagem antes)`)
        substitutions++
      } else {
        console.warn(`  ⚠️  ${section.slug}: sem bloco \`\`\`markdown — só removi o prompt`)
      }
    }
  }

  // 2) Limpa linhas em branco múltiplas que sobraram da remoção
  md = md.replace(/\n{4,}/g, '\n\n\n')

  await fs.writeFile(MD, md, 'utf-8')
  console.log(`\n✅ Resumo:`)
  console.log(`   - ${blocks.length} blocos PROMPT GEMINI removidos`)
  console.log(`   - ${removalsHero} eram heros (já em cover_image_url)`)
  console.log(`   - ${substitutions} imagens substituídas/adicionadas com versão do cowork`)
  console.log(`   - ${imageNotFound} sem arquivo .png/.jpg correspondente`)
}

main().catch(err => { console.error(err); process.exit(1) })
