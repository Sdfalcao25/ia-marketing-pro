export async function readRequestData(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return await request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export function redirectBack(request: Request, fallback: string) {
  const referer = request.headers.get('referer');
  try {
    if (referer) {
      const from = new URL(referer);
      const current = new URL(request.url);
      if (from.origin === current.origin) return from;
    }
  } catch {}
  return new URL(fallback, request.url);
}
