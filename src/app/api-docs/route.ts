// =============================================================================
// /api-docs — Swagger UI (OpenAPI 문서 뷰어)
// 스펙: /api/openapi.json. swagger-ui-dist 를 CDN 으로 로드(의존성 추가 없음).
// =============================================================================
export const dynamic = "force-static";

const SWAGGER_VERSION = "5.17.14";

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>The Formula — API 문서</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
    #brand { font: 600 15px/1.4 -apple-system, BlinkMacSystemFont, sans-serif; color: #2563eb; padding: 14px 20px; border-bottom: 1px solid #ececef; background:#fff; }
  </style>
</head>
<body>
  <div id="brand">The Formula — 아티클 수집 API 문서</div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`;

export function GET() {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
