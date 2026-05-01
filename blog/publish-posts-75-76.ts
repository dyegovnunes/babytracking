// Publica os posts 75 e 76:
// 1. Converte imagens → WebP em blog/public/posts/{slug}/
// 2. Insere rows em blog_posts no Supabase com status=published
//
// Rodar: cd blog && npx tsx publish-posts-75-76.ts

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_ROOT = path.resolve(__dirname, '..')

// Carrega .env do blog
const envPath = path.join(__dirname, '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltam vars no blog/.env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const posts = [
  {
    post_number: 75,
    slug: 'colica-bebe-o-que-fazer',
    title: 'Cólica do Bebê: Causas, Sinais e o Que Realmente Alivia',
    meta_description: 'Cólica do bebê: causas, sinais e o que de fato alivia. Sem tiques, sem invenções. Tudo baseado na SBP e na evidência científica atual.',
    category: 'saude',
    audience: 'parent',
    target_week_start: 0,
    target_week_end: 16,
    pillar: 'saude-bebe',
    role: 'cluster',
    schema_type: 'Article',
    keywords: [
      'cólica bebê o que fazer',
      'cólica bebê sintomas como reconhecer',
      'cólica bebê recém-nascido alívio',
      'cólica bebê quanto tempo dura',
      'cólica bebê causas',
      'como acalmar bebê com cólica',
      'cólica bebê chá simethicona funciona',
      'cólica bebê o que fazer quando nada funciona',
      'bebê chora muito à noite cólica o que é normal',
      'cólica bebê tem remédio ou passa sozinha',
    ],
    related_slugs: ['choro-do-bebe', 'sono-recem-nascido-quanto-dorme', 'rotina-bebe-3-4-meses'],
    affiliate_products: [
      {
        tipo: 'conforto',
        nome: 'NUK Canguru 3 em 1 Ergonômico Comfort Cinza',
        asin: 'B09YJ1NY2W',
        url: 'https://www.amazon.com.br/dp/B09YJ1NY2W?tag=yaya090-20',
      },
      {
        tipo: 'conforto',
        nome: 'Bolsa Térmica Faixa de Sementes e Ervas para Bebê Cólica',
        asin: 'B0DMWMJMQ3',
        url: 'https://www.amazon.com.br/dp/B0DMWMJMQ3?tag=yaya090-20',
      },
    ],
    sources: [
      {
        name: 'SBP. Cólica do Lactente. Pediatria para Famílias. Sociedade Brasileira de Pediatria. 2023.',
        url: 'https://www.sbp.com.br/pediatria-para-familias/primeira-infancia/colica-do-lactente/',
      },
      {
        name: 'Radesky JS et al. Overstimulation and infant colic. Journal of Pediatrics, 2013.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23809043/',
      },
      {
        name: 'Savino F et al. Lactobacillus reuteri versus simethicone in the treatment of infantile colic. Pediatrics, 2007.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/18055646/',
      },
    ],
    image_url: 'https://blog.yayababy.app/posts/colica-bebe-o-que-fazer/hero.webp',
    image_alt: 'Cólica do Bebê Como Aliviar',
    mid_image_url: 'https://blog.yayababy.app/posts/colica-bebe-o-que-fazer/mid.webp',
    heroSrc: path.join(REPO_ROOT, 'content', 'posts', '75-colica-bebe', 'hero.jpg'),
    midSrc:  path.join(REPO_ROOT, 'content', 'posts', '75-colica-bebe', 'img75-2.jpg'),
    content_md: `São 22h. O bebê chora há mais de uma hora e nada funciona. Você já alimentou, trocou, embalou, andou pela casa. O choro continua. É uma das experiências mais exaustivas e angustiantes da maternidade e paternidade, e é muito mais comum do que parece.

A cólica afeta entre 10% e 40% dos bebês, segundo a literatura científica. Ela não é sinal de que você está errando, é uma fase com começo, meio e fim.

## O Que É Cólica (De Verdade)

A definição clínica de cólica infantil é precisa: choro inconsolável ou irritabilidade por pelo menos 3 horas por dia, em pelo menos 3 dias por semana, durante mais de 3 semanas, em um bebê saudável e bem alimentado. Esse critério é chamado de "Regra dos 3" e existe para diferenciar a cólica de outras causas de choro prolongado que precisam de avaliação médica.

O mais importante: cólica é um diagnóstico de exclusão. Isso significa que só se diagnostica cólica depois de descartar outras causas de desconforto, como refluxo gastroesofágico, alergia à proteína do leite de vaca (APLV), infecções urinárias ou hérnias.

Segundo a SBP, as causas exatas da cólica ainda não são completamente conhecidas. O que se sabe é que ela está associada à imaturidade do sistema digestivo do bebê, ao desenvolvimento do microbioma intestinal e possivelmente à imaturidade do sistema nervoso, que ainda está aprendendo a processar estímulos.

## Como Reconhecer

Os sinais típicos incluem choro agudo e intenso, barriga aparentemente dura ou distendida, pernas encolhidas ou chutando, rosto vermelho e punhos cerrados. O choro tende a piorar no final da tarde e à noite, o chamado "horário de cólica", provavelmente porque o bebê acumulou estímulos e cansaço ao longo do dia.

A cólica geralmente aparece entre 2 e 6 semanas de vida e melhora significativamente por volta dos 3 meses, com resolução quase completa aos 4 a 5 meses. Essa evolução temporal é uma das características que ajuda o pediatra a diferenciar cólica de outras condições.

## O Que Realmente Ajuda

A honestidade primeiro: não existe tratamento que cure a cólica. O que existe são estratégias que ajudam a reduzir a intensidade do choro e o desconforto do bebê, e que fazem muita diferença na prática.

### Posição anticolica no colo

Segurar o bebê de bruços, com a barriga apoiada sobre o antebraço, é uma das posições com mais relatos de alívio. A pressão suave no abdômen, combinada com o calor do corpo do cuidador, parece ajudar na liberação de gases. Outra opção é segurar o bebê em posição vertical, com a cabeça apoiada no ombro, enquanto você faz movimentos suaves de balanço.

### Movimento rítmico

O balanço suave e rítmico (colo, carrinho, sling) ativa o sistema vestibular do bebê e tem efeito calmante. O movimento imita o ambiente intrauterino, que era constantemente em movimento. Muitos bebês com cólica respondem bem ao sling ou mochila canguru, onde o calor do corpo e o movimento constante se combinam.

### Massagem abdominal

Movimentos circulares suaves no sentido horário (seguindo o trajeto intestinal) podem ajudar a mover gases presos. Alguns estudos sugerem benefício, embora a evidência ainda seja limitada. Não faça logo após a alimentação.

### Redução de estímulos

Bebês com cólica muitas vezes estão sobrestimulados. Um ambiente mais quieto, com luz suave e menos pessoas ao redor, pode ajudar o sistema nervoso a se acalmar. O ruído branco (ventilador, app de som branco) funciona bem para alguns bebês.

### Amamentação

Se o bebê é amamentado, a pega correta e o esvaziamento adequado da mama reduzem a ingestão de ar, que contribui para os gases. Não há evidência consistente de que a dieta da mãe cause cólica, mas algumas mães relatam melhora ao reduzir consumo de laticínios ou leguminosas, uma experiência que pode ser tentada por alguns dias com orientação do pediatra.

## O Que NÃO Funciona (e Deve Ser Evitado)

Chás (erva-doce, camomila, cidreira) não têm evidência de eficácia em bebês e podem interferir na amamentação ao reduzir a demanda de leite. A AAP e a SBP contraindicam chás antes dos 6 meses.

A simeticona (Luftal, Mylicon) é amplamente usada, mas os estudos disponíveis não mostram eficácia superior ao placebo. Não é prejudicial, mas não há evidência robusta de que resolva a cólica.

Mudanças de fórmula sem orientação médica geralmente não resolvem cólica funcional e podem gerar instabilidade desnecessária na alimentação do bebê.

## Quando É Necessário Ir ao Pediatra

Cólica não causa febre, vômitos frequentes, sangue nas fezes ou perda de peso. Se qualquer um desses sinais estiver presente junto com o choro excessivo, é sinal de que existe outra causa e o pediatra precisa avaliar com urgência.

Também vale consultar quando o choro excede o padrão da "Regra dos 3" de forma intensa, quando os cuidadores estão no limite emocional (o que é completamente compreensível) ou quando há dúvida sobre APLV ou refluxo.

## Cuide Também de Você

Semanas de choro intenso esgotam qualquer cuidador. Se você está no limite, pedir ajuda não é fraqueza, é estratégia. Reveze com o parceiro ou outro cuidador de confiança, mesmo que por 20 minutos. Colocar o bebê no berço com segurança e sair por alguns minutos é melhor do que cuidar no limite da exaustão.

O yaIA, o especialista virtual do Yaya, está disponível 24 horas para responder dúvidas sobre cólica e outros desafios do dia a dia com seu bebê. E o Yaya registra os episódios de choro para que você e o pediatra possam ver o padrão ao longo do tempo.

## Resumindo

- Cólica é choro inconsolável por mais de 3h/dia, 3 dias/semana, por mais de 3 semanas, em bebê saudável
- Causa exata é desconhecida; está relacionada à imaturidade digestiva e do sistema nervoso
- Melhora naturalmente entre 3 e 5 meses
- Estratégias que ajudam: posição de bruços no colo, movimento rítmico, sling, massagem abdominal, redução de estímulos
- Chás e simeticona não têm evidência robusta de eficácia
- Febre, vômitos, sangue nas fezes ou perda de peso junto com choro excessivo: busque o pediatra

> Este conteúdo é informativo. Consulte sempre o pediatra do seu bebê para orientações personalizadas.`,
  },
  {
    post_number: 76,
    slug: 'denticao-bebe-quando-comeca',
    title: 'Dentição do Bebê: Quando Começa, Sintomas Reais e Mitos Comuns',
    meta_description: 'Dentição do bebê: quando começa, sintomas verdadeiros e mitos como febre e diarreia. Guia baseado em evidências da SBP e AAP para pais sem achismos.',
    category: 'desenvolvimento',
    audience: 'parent',
    target_week_start: 20,
    target_week_end: 52,
    pillar: 'desenvolvimento-bebe',
    role: 'cluster',
    schema_type: 'Article',
    keywords: [
      'dentição bebê quando começa',
      'dentição bebê sintomas reais',
      'primeiro dente bebê quando nasce',
      'febre dentição bebê mito verdade',
      'diarreia dentição bebê',
      'como aliviar dor dentição bebê',
      'ordem dos dentes bebê',
      'dentição bebê causa febre diarreia mito ou verdade',
      'quando nasce o primeiro dente do bebê meses',
      'dentição bebê 6 meses sintomas e cuidados',
    ],
    related_slugs: ['mordedor-bebe-quando-usar', 'marcos-desenvolvimento-bebe'],
    affiliate_products: [
      {
        tipo: 'desenvolvimento',
        nome: 'Mordedor Bebê Mãozinha Vilatoy Silicone Macio para +2 Meses',
        asin: 'B0GQP1XL2X',
        url: 'https://www.amazon.com.br/dp/B0GQP1XL2X?tag=yaya090-20',
      },
      {
        tipo: 'desenvolvimento',
        nome: 'Mordedor Bebê Silicone Anatômico BPA-Free',
        asin: 'B0F44BB81X',
        url: 'https://www.amazon.com.br/dp/B0F44BB81X?tag=yaya090-20',
      },
      {
        tipo: 'higiene',
        nome: 'Dedeira Escova de Dentes para Bebê Silicone Macia',
        asin: 'B0B1NXNSHB',
        url: 'https://www.amazon.com.br/dp/B0B1NXNSHB?tag=yaya090-20',
      },
    ],
    sources: [
      {
        name: 'AAP. Teething Pain Relief: How to Soothe Your Baby\'s Discomfort. HealthyChildren.org. 2024.',
        url: 'https://www.healthychildren.org/English/ages-stages/baby/teething-tooth-care/Pages/Teething-Pain.aspx',
      },
      {
        name: 'SBP. Saúde oral materno-infantil. Pediatria para Famílias. Sociedade Brasileira de Pediatria.',
        url: 'https://www.sbp.com.br/pediatria-para-familias/primeira-infancia/saude-oral-materno-infantil/',
      },
      {
        name: 'SBP. Nascimento dos dentes do bebê causa febre? Imprensa SBP.',
        url: 'https://www.sbp.com.br/imprensa/detalhe/nid/nascimento-dos-dentes-do-bebe-causa-febre/',
      },
      {
        name: 'Macknin ML et al. Symptoms Associated With Infant Teething: A Prospective Study. Pediatrics, 2000.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/10742348/',
      },
    ],
    image_url: 'https://blog.yayababy.app/posts/denticao-bebe-quando-comeca/hero.webp',
    image_alt: 'Dentição do Bebê Quando Começa',
    mid_image_url: 'https://blog.yayababy.app/posts/denticao-bebe-quando-comeca/mid.webp',
    heroSrc: path.join(REPO_ROOT, 'content', 'posts', '76-denticao-bebe-mitos', 'hero.jpg'),
    midSrc:  path.join(REPO_ROOT, 'content', 'posts', '76-denticao-bebe-mitos', 'img76-2.jpg'),
    content_md: `"O bebê está com febre por causa dos dentes." Essa frase é dita por milhares de famílias todos os dias no Brasil. O problema é que a ciência não confirma essa associação, e entender o que a dentição realmente causa, e o que é coincidência, pode evitar que sintomas que precisam de atenção médica sejam ignorados.

## Quando Começa a Dentição

Os primeiros dentes geralmente aparecem entre os 4 e os 7 meses de vida, com pico por volta dos 6 meses. Mas existe variação individual considerável: alguns bebês nascem com dentes (condição chamada de dentes natais) e outros chegam ao primeiro aniversário sem nenhum dente à vista. Ambos os extremos, sem outros sinais, são considerados normais.

A ordem mais comum de erupção é:

1. Incisivos centrais inferiores (centro da mandíbula, ~6 meses)
2. Incisivos centrais superiores (~8-10 meses)
3. Incisivos laterais (~10-12 meses)
4. Primeiros molares (~12-16 meses)
5. Caninos (~16-20 meses)
6. Segundos molares (~20-30 meses)

Os 20 dentes de leite geralmente completam a erupção até os 3 anos. Variações de até alguns meses em qualquer direção são normais.

## Sintomas Reais da Dentição

Um estudo prospectivo publicado na revista Pediatrics (Macknin et al., 2000) acompanhou bebês durante o período de erupção dental e identificou os sintomas com associação real:

- **Salivação aumentada (babação):** começa algumas semanas antes da erupção, é o sinal mais consistente
- **Irritabilidade e choro:** especialmente nos dias imediatamente antes e após a erupção
- **Necessidade aumentada de morder:** as gengivas ficam sensíveis e a pressão alivia
- **Gengiva vermelha e inchada** no local de erupção
- **Perturbação leve do sono** nos dias próximos à erupção
- **Leve recusa alimentar** (gengiva dolorida torna a sucção desconfortável)

Esses sintomas tendem a aparecer com mais intensidade nos 4 dias antes da erupção e nos 3 dias após (a chamada "janela de 8 dias").

## O Que NÃO É Causado pela Dentição

Aqui está o ponto em que a evidência científica diverge do senso comum:

**Febre alta:** a dentição pode causar uma elevação mínima na temperatura corporal (dentro da faixa normal, abaixo de 37,5°C), associada ao processo inflamatório local na gengiva. Febre verdadeira, acima de 38°C, não é causada pela dentição. A SBP é explícita: febre alta em bebês não deve ser atribuída ao nascimento dos dentes. Se o bebê tem febre alta, é necessário investigar outra causa.

**Diarreia:** não existe mecanismo biológico que explique diarreia como consequência da dentição. A coincidência acontece porque, por volta dos 6 meses, bebês começam a explorar o ambiente com a boca e aumentam o contato com germes, elevando a frequência de infecções gastrointestinais. A diarreia é causada por infecção, não pelos dentes.

**Convulsões, vômitos intensos, recusa alimentar prolongada:** esses sinais nunca devem ser atribuídos à dentição sem avaliação médica.

Essa distinção é crítica: bebês que têm febre ou diarreia durante o período de dentição precisam de avaliação do pediatra, não de espera passiva.

## Como Aliviar o Desconforto

As estratégias com melhor evidência são simples e seguras:

**Mordedores de silicone ou borracha:** a pressão nas gengivas alivia o desconforto. Escolha mordedores sem BPA, de material certificado, adequado para a idade. Mordedores refrigerados (não congelados) podem ajudar, pois o frio tem efeito analgésico local. Nunca use mordedores com gel líquido interno que possam vazar.

**Massagem nas gengivas:** com o dedo limpo ou uma dedeira de silicone, uma pressão suave e circular nas gengivas alivia temporariamente.

**Frio suave:** uma colher gelada ou um pano úmido frio (não gelado) na gengiva.

**Produtos a evitar:** a AAP e a SBP desaconselham géis de lidocaína para dentição em bebês. A benzocaína (presente em alguns géis populares) pode causar metemoglobinemia, condição grave em crianças pequenas. Analgésicos orais (paracetamol, ibuprofeno) podem ser usados em casos de desconforto intenso, mas sempre com orientação do pediatra e na dose correta para o peso.

## Higiene Oral: Começa Antes do Primeiro Dente

A limpeza da boca do bebê deve começar antes dos dentes aparecerem. Uma gaze ou fralda de tecido úmida passada suavemente nas gengivas após cada alimentação remove resíduos de leite e prepara o bebê para aceitar a escovação mais tarde.

Quando o primeiro dente erupcionar, introduza uma escovinha de dentes específica para bebês, com cerdas macias, e pasta de dente fluoretada em quantidade mínima (tamanho de um grão de arroz) para bebês até 3 anos. A consulta odontológica pode acontecer a partir do primeiro dente ou até o primeiro aniversário, segundo as diretrizes da SBP.

## Registre os Marcos no Yaya

A erupção do primeiro dente é um marco registrável na caderneta do Yaya. E quando o bebê está mais irritado, dormindo pior ou babando mais, você pode anotar na observação do dia e acompanhar o padrão ao longo do tempo. O yaIA também pode te ajudar a diferenciar sintomas de dentição de outros sinais que merecem atenção médica.

## Resumindo

- Primeiros dentes geralmente aparecem entre 4 e 7 meses, com variação normal
- Sintomas reais: babação, irritabilidade, necessidade de morder, gengiva vermelha
- Febre alta e diarreia NÃO são causadas pela dentição, precisam ser investigadas
- Mordedores de silicone e massagem nas gengivas são os melhores aliados
- Evite géis com benzocaína em bebês
- Higiene oral começa antes do primeiro dente

> Este conteúdo é informativo. Consulte sempre o pediatra e o dentista do seu bebê para orientações personalizadas.`,
  },
]

async function main() {
  for (const post of posts) {
    const { heroSrc, midSrc, ...row } = post
    console.log(`\n── Post #${post.post_number}: ${post.slug} ──`)

    // 1. Converte e salva imagens
    const destDir = path.join(__dirname, 'public', 'posts', post.slug)
    fs.mkdirSync(destDir, { recursive: true })

    await sharp(heroSrc).webp({ quality: 85 }).toFile(path.join(destDir, 'hero.webp'))
    console.log('  ✓ hero.webp')

    await sharp(midSrc).webp({ quality: 85 }).toFile(path.join(destDir, 'mid.webp'))
    console.log('  ✓ mid.webp')

    // 2. Insere no banco
    const { error } = await supabase.from('blog_posts').insert({
      ...row,
      status: 'published',
      published_at: new Date().toISOString(),
      premium_teaser: null,
    })

    if (error) {
      console.error(`  ✗ DB error: ${error.message}`)
    } else {
      console.log('  ✓ Inserido no banco')
    }
  }

  console.log('\nDone. Agora: git add blog/public/posts/ && git commit && git push')
}

main().catch((e) => { console.error(e); process.exit(1) })
