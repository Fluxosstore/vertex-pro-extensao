import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Erro no formato aceito pelos DOIS clientes:
// - extensão 5.x: lê { ok, code, error }
// - extensão nova: lê { success, error }
function fail(error: string, code: string, status = 403) {
  return json({ ok: false, success: false, code, error }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Método não permitido.", "METHOD_NOT_ALLOWED", 405);

  try {
    const body = await req.json().catch(() => ({}));

    // Aceita os dois formatos de entrada:
    //   antigo: { key, device_id }   novo: { licenseKey, deviceId }
    const key = String(body.key ?? body.licenseKey ?? "").trim();
    const deviceId = String(body.device_id ?? body.deviceId ?? "").trim();
    const appVersion = String(body.app_version ?? body.version ?? "").trim();

    if (!key) return fail("Informe uma chave de licença.", "NO_KEY", 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) {
      return fail("Servidor de licença não configurado.", "NOT_CONFIGURED", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: license, error } = await supabase
      .from("licenses")
      .select("id, key, plan, status, expires_at, device_id, account_name, email, activated_at")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error("license query error", error);
      return fail("Falha ao consultar a licença.", "QUERY_ERROR", 500);
    }
    if (!license) return fail("Chave de licença inválida.", "INVALID", 403);
    if (license.status !== "active") return fail("Esta licença está desativada.", "INACTIVE", 403);
    if (license.expires_at && new Date(license.expires_at).getTime() <= Date.now()) {
      return fail("Esta licença expirou.", "EXPIRED", 403);
    }

    // Vínculo por dispositivo: primeira ativação grava o device_id.
    let activatedAt = license.activated_at;
    if (deviceId) {
      if (!license.device_id) {
        activatedAt = activatedAt ?? new Date().toISOString();
        await supabase
          .from("licenses")
          .update({ device_id: deviceId, activated_at: activatedAt })
          .eq("id", license.id);
      } else if (license.device_id !== deviceId) {
        return fail("Esta licença já está em uso em outro dispositivo.", "DEVICE_MISMATCH", 403);
      }
    }

    // Auditoria (nunca bloqueia a resposta)
    try {
      await supabase.from("license_validations").insert({
        license_id: license.id,
        key_attempted: key,
        device_id: deviceId || null,
        result_code: "VALID",
        app_version: appVersion || "unknown",
      });
      await supabase
        .from("licenses")
        .update({ last_validated_at: new Date().toISOString() })
        .eq("id", license.id);
    } catch (_e) { /* ignora */ }

    const nowIso = new Date().toISOString();
    const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Nome exibido: prioridade account_name > parte antes do @ do email > null
    // (o cliente decide o fallback final na UI)
    const displayName = license.account_name
      || (license.email ? String(license.email).split("@")[0] : null);

    // O painel administrativo soma usage_stats por licença. Devolve o
    // mesmo total à extensão para sincronizar a UI entre dispositivos.
    const { data: usageRows, error: usageError } = await supabase
      .from("usage_stats")
      .select("prompt_count")
      .eq("license_id", license.id);
    if (usageError) console.error("usage count query error", usageError);
    const commandsCount = (usageRows || []).reduce((sum: number, row: { prompt_count?: number }) =>
      sum + Math.max(0, Number(row.prompt_count) || 0), 0);

    return json({
      ok: true,
      success: true,
      license: {
        license_key: license.key,
        key: license.key,
        plan: license.plan || "PRO",
        plan_type: license.plan || null,
        user_name: displayName,
        account_name: license.account_name || null,
        email: license.email || null,
        expires_at: license.expires_at,
        activated_at: activatedAt,
        is_active: true,
        status: "active",
        commands_count: commandsCount,
      },
      session_token: `${license.id}.${Date.now()}`,
      session_expires_at: sessionExpires,
      server_time: nowIso,
    });
  } catch (e) {
    return fail(
      "Erro interno: " + (e instanceof Error ? e.message : String(e)),
      "INTERNAL",
      500,
    );
  }
});
