/**
 * Cloudflare Worker — 법제처 Open API CORS 프록시
 *
 * 배포 방법:
 *   1. https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. 이 코드를 붙여넣고 Deploy
 *   3. 배포된 URL(예: law-proxy.your-name.workers.dev)을 aiact.html에 설정
 *
 * 사용 예:
 *   GET https://law-proxy.your-name.workers.dev/?endpoint=lawSearch.do&target=law&query=인공지능&display=20&page=1
 */

const LAW_API_BASE = 'https://www.law.go.kr/DRF';
const DEFAULT_OC = 'chetera';
const ALLOWED_ENDPOINTS = new Set(['lawSearch.do', 'lawService.do']);

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint') || 'lawSearch.do';

    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return jsonResponse({ error: '허용되지 않는 endpoint' }, 400);
    }

    // 파라미터 구성
    const params = new URLSearchParams(url.searchParams);
    params.delete('endpoint');
    if (!params.has('OC')) params.set('OC', DEFAULT_OC);
    params.set('type', 'JSON');

    const apiUrl = `${LAW_API_BASE}/${endpoint}?${params.toString()}`;

    try {
      const resp = await fetch(apiUrl, {
        headers: { 'User-Agent': 'MiroFish-Dashboard/1.0' },
      });

      const body = await resp.text();

      if (!body || !body.trim()) {
        return jsonResponse({ empty: true, totalCnt: '0', items: [] });
      }

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders(),
        },
      });
    } catch (e) {
      return jsonResponse({ error: e.message }, 502);
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
