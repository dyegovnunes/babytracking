import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GA4_PROPERTY_ID = Deno.env.get('GA4_PROPERTY_ID') ?? '534097942'
const GA4_SERVICE_ACCOUNT_JSON = Deno.env.get('GA4_SERVICE_ACCOUNT')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface ServiceAccount {
  client_email: string
  private_key: string
}

// Base64url encode (sem padding)
function b64url(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Gera JWT assinado com RS256 para autenticação no Google
async function createJWT(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))

  const message = `${header}.${payload}`

  // Importa a chave privada PKCS8
  const pem = sa.private_key.replace(/\\n/g, '\n')
  const pemContent = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(message),
  )

  return `${message}.${b64url(new Uint8Array(sig))}`
}

// Obtém access token OAuth2 via JWT
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await createJWT(sa)
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await resp.json()
  if (!data.access_token) throw new Error(`GA4 auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

// Chama a GA4 Data API
async function ga4Report(token: string, body: object): Promise<any> {
  const resp = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return resp.json()
}

// Extrai rows de um GA4 response de forma segura
function extractRows(report: any): { dims: string[]; metrics: string[] }[] {
  if (!report?.rows) return []
  return report.rows.map((row: any) => ({
    dims: (row.dimensionValues ?? []).map((d: any) => d.value ?? ''),
    metrics: (row.metricValues ?? []).map((m: any) => m.value ?? '0'),
  }))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Se a service account não está configurada, retorna flag para o frontend mostrar setup
  if (!GA4_SERVICE_ACCOUNT_JSON) {
    return new Response(
      JSON.stringify({ configured: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const sa: ServiceAccount = JSON.parse(GA4_SERVICE_ACCOUNT_JSON)
    const token = await getAccessToken(sa)

    const dateRange = { startDate: '30daysAgo', endDate: 'today' }

    // Roda os 4 relatórios em paralelo
    const [pagesReport, sourcesReport, eventsReport, dailyReport] = await Promise.all([
      // Top páginas por visualizações
      ga4Report(token, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 25,
      }),
      // Fontes de tráfego
      ga4Report(token, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'newUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      // Contagem de eventos rastreados
      ga4Report(token, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: ['affiliate_click', 'app_cta_click', 'page_view'] },
          },
        },
      }),
      // Visualizações diárias (sparkline)
      ga4Report(token, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    ])

    const topPages = extractRows(pagesReport).map(r => ({
      path: r.dims[0],
      title: r.dims[1],
      views: parseInt(r.metrics[0]),
      users: parseInt(r.metrics[1]),
    }))

    const sources = extractRows(sourcesReport).map(r => ({
      channel: r.dims[0],
      sessions: parseInt(r.metrics[0]),
      newUsers: parseInt(r.metrics[1]),
    }))

    const eventsMap: Record<string, number> = {}
    for (const r of extractRows(eventsReport)) eventsMap[r.dims[0]] = parseInt(r.metrics[0])

    const dailyViews = extractRows(dailyReport).map(r => ({
      date: r.dims[0], // formato YYYYMMDD
      views: parseInt(r.metrics[0]),
      users: parseInt(r.metrics[1]),
    }))

    const totalViews = dailyViews.reduce((s, d) => s + d.views, 0)
    const totalUsers = dailyViews.reduce((s, d) => s + d.users, 0)

    return new Response(
      JSON.stringify({
        configured: true,
        summary: {
          totalViews,
          totalUsers,
          affiliateClicks: eventsMap['affiliate_click'] ?? 0,
          ctaClicks: eventsMap['app_cta_click'] ?? 0,
        },
        topPages,
        sources,
        dailyViews,
        events: Object.entries(eventsMap).map(([name, count]) => ({ name, count })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('blog-analytics error:', err)
    return new Response(
      JSON.stringify({ configured: true, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
