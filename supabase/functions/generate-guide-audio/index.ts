// ════════════════════════════════════════════════════════════════════════════
// generate-guide-audio
// ════════════════════════════════════════════════════════════════════════════
// Gera áudio TTS (text-to-speech) para uma seção do guia via OpenAI TTS,
// faz upload no bucket guide-audio e registra em guide_audio_segments.
//
// Idempotente: se já existe registro com o mesmo (section_id, text_hash,
// voice_id), retorna a URL existente sem regerar.
//
// Body esperado:
//   { section_id: string, text_hash: string, voice_id?: string }
//
// Resposta:
//   { audio_url: string, cached: boolean, duration_sec?: number } | { error }
//
// Variáveis de ambiente:
//   OPENAI_API_KEY            — secret do OpenAI
//   SUPABASE_URL              — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
// ════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const DEFAULT_VOICE = 'nova'   // alternativas: alloy, echo, fable, onyx, shimmer
const TTS_MODEL = 'tts-1'      // tts-1-hd é mais nítido mas 2x mais caro
const STORAGE_BUCKET = 'guide-audio'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

/**
 * Limpa markdown pra texto puro pronto pra TTS.
 * Remove imagens, headings markdown, ênfase, blockquotes, callouts e links.
 */
function markdownToSpeechText(md: string): string {
  return md
    // Imagens
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Links → só texto
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Callouts ::: tipo / ::: → mantém o conteúdo, remove marcadores
    .replace(/^:::[a-z]+\s*\n?/gim, '')
    .replace(/^:::\s*$/gm, '')
    // Headings
    .replace(/^#+\s+/gm, '')
    // Ênfase
    .replace(/[*_`~]+/g, '')
    // Blockquotes
    .replace(/^>\s?/gm, '')
    // Bullets
    .replace(/^[-*+]\s+/gm, '')
    // Listas numeradas
    .replace(/^\d+\.\s+/gm, '')
    // Quebras múltiplas
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { section_id, text_hash, voice_id } = await req.json()

    if (!section_id || !text_hash) {
      return new Response(
        JSON.stringify({ error: 'section_id e text_hash são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const voice = (voice_id ?? DEFAULT_VOICE).toString()

    // 1) Idempotência: se já existe áudio com esse hash, retorna URL existente
    const { data: existing } = await supabase
      .from('guide_audio_segments')
      .select('audio_url, duration_sec')
      .eq('section_id', section_id)
      .eq('text_hash', text_hash)
      .eq('voice_id', voice)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({
          audio_url: existing.audio_url,
          duration_sec: existing.duration_sec,
          cached: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2) Busca a seção + slug do guide pra montar o path no storage
    const { data: section, error: secErr } = await supabase
      .from('guide_sections')
      .select('id, slug, content_md, guides!inner(slug)')
      .eq('id', section_id)
      .single()

    if (secErr || !section) {
      return new Response(
        JSON.stringify({ error: `Seção não encontrada: ${section_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const guideSlug = (section.guides as { slug: string }).slug
    const speechText = markdownToSpeechText(section.content_md ?? '')

    if (!speechText || speechText.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Conteúdo muito curto para gerar áudio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3) Chama OpenAI TTS
    const ttsResp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice,
        input: speechText,
        response_format: 'mp3',
        speed: 1.0,
      }),
    })

    if (!ttsResp.ok) {
      const errBody = await ttsResp.text()
      return new Response(
        JSON.stringify({ error: `OpenAI TTS falhou: ${ttsResp.status} ${errBody}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const audioBuffer = new Uint8Array(await ttsResp.arrayBuffer())

    // 4) Upload no Storage. Path: <guide-slug>/<section-slug>-<hash-curto>.mp3
    const shortHash = text_hash.slice(0, 12)
    const storagePath = `${guideSlug}/${section.slug}-${shortHash}.mp3`

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
        cacheControl: '31536000',
      })

    if (upErr) {
      return new Response(
        JSON.stringify({ error: `Upload falhou: ${upErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`

    // 5) Registra em guide_audio_segments
    // Estimativa grosseira de duração: ~140 wpm em PT-BR ≈ ~2.3 chars/segundo
    const durationSec = Math.ceil(speechText.length / 14)

    await supabase.from('guide_audio_segments').insert({
      section_id,
      text_hash,
      voice_id: voice,
      audio_url: audioUrl,
      duration_sec: durationSec,
    })

    return new Response(
      JSON.stringify({ audio_url: audioUrl, cached: false, duration_sec: durationSec }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
