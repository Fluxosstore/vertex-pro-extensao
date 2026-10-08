import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const OPENROUTER_CLAUDE_MODEL = Deno.env.get("OPENROUTER_CLAUDE_MODEL") || "anthropic/claude-sonnet-4.6";
const OPENROUTER_DEEPSEEK_MODEL = Deno.env.get("OPENROUTER_DEEPSEEK_MODEL") || "deepseek/deepseek-v4-flash";
const OPENROUTER_MODEL_CHAIN = [OPENROUTER_DEEPSEEK_MODEL, "openai/gpt-4o-mini", "anthropic/claude-3.5-haiku", "qwen/qwen3-coder:free"]
  .filter((m, i, arr) => arr.indexOf(m) === i);
const OPENROUTER_GPT4O_MODEL = Deno.env.get("OPENROUTER_GPT4O_MODEL") || "openai/gpt-4o";
const OPENROUTER_GEMINI_MODEL_SLUG = Deno.env.get("OPENROUTER_GEMINI_MODEL_SLUG") || "google/gemini-2.5-flash";

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

function analyzeSql(sql: string): { blocked: boolean; destructive: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let blocked = false;
  let destructive = false;

  const clean = String(sql || "")
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const up = clean.toUpperCase();

  if (!clean) return { blocked: true, destructive: false, reasons: ["SQL vazio"] };

  const proibidos: Array<[RegExp, string]> = [
    [/\bDROP\s+DATABASE\b/, "DROP DATABASE"],
    [/\bDROP\s+SCHEMA\b/, "DROP SCHEMA"],
    [/\bALTER\s+SYSTEM\b/, "ALTER SYSTEM"],
    [/\bCREATE\s+EXTENSION\b/, "CREATE EXTENSION"],
    [/\bGRANT\b.*\bTO\s+PUBLIC\b/, "GRANT para PUBLIC"],
    [/\bCOPY\b.*\bFROM\s+PROGRAM\b/, "COPY FROM PROGRAM (executa shell)"],
    [/\bPG_READ_FILE\b/, "leitura de arquivo do servidor"],
    [/\bPG_LS_DIR\b/, "listagem de diretório do servidor"],
    [/\bDBLINK\b/, "conexão externa via dblink"],
    [/\b(DROP|TRUNCATE)\s+TABLE\s+(IF\s+EXISTS\s+)?(AUTH|STORAGE|VAULT|PG_CATALOG|INFORMATION_SCHEMA|REALTIME|SUPABASE_FUNCTIONS)\s*\./, "apagar tabela de schema interno do Supabase"],
    [/\bALTER\s+TABLE\s+(IF\s+EXISTS\s+)?(AUTH|STORAGE|VAULT|PG_CATALOG|INFORMATION_SCHEMA|REALTIME|SUPABASE_FUNCTIONS)\s*\./, "alterar tabela de schema interno do Supabase"],
    [/\bDELETE\s+FROM\s+(AUTH|STORAGE|VAULT|REALTIME|SUPABASE_FUNCTIONS)\s*\./, "apagar dados de schema interno do Supabase"],
    [/\bUPDATE\s+(AUTH|STORAGE|VAULT|REALTIME|SUPABASE_FUNCTIONS)\s*\./, "alterar dados de schema interno do Supabase"],
    [/\bINSERT\s+INTO\s+(AUTH|STORAGE|VAULT|REALTIME|SUPABASE_FUNCTIONS)\s*\./, "inserir em schema interno do Supabase"],
  ];
  for (const [re, nome] of proibidos) {
    if (re.test(up)) { blocked = true; reasons.push(`Bloqueado: ${nome}`); }
  }

  const perigosos: Array<[RegExp, string]> = [
    [/\bDROP\s+TABLE\b/, "DROP TABLE — apaga a tabela e todos os dados"],
    [/\bDROP\s+COLUMN\b/, "DROP COLUMN — apaga a coluna e os dados dela"],
    [/\bTRUNCATE\b/, "TRUNCATE — esvazia a tabela"],
    [/\bDROP\s+(VIEW|FUNCTION|TRIGGER|POLICY|INDEX)\b/, "remoção de objeto do banco"],
  ];
  for (const [re, nome] of perigosos) {
    if (re.test(up)) { destructive = true; reasons.push(nome); }
  }

  if (/\bDELETE\s+FROM\b/.test(up) && !/\bWHERE\b/.test(up)) {
    destructive = true; reasons.push("DELETE sem WHERE — apaga todas as linhas");
  }
  if (/\bUPDATE\b/.test(up) && !/\bWHERE\b/.test(up)) {
    destructive = true; reasons.push("UPDATE sem WHERE — altera todas as linhas");
  }
  if (/\bALTER\s+COLUMN\b.*\bTYPE\b/.test(up)) {
    destructive = true; reasons.push("mudança de tipo de coluna — pode perder dados");
  }

  return { blocked, destructive, reasons };
}

async function resolveLicense(supabase: any, licenseKey: string, deviceId: string) {
  const { data } = await supabase
    .from("licenses")
    .select("id, status, expires_at, device_id")
    .eq("key", licenseKey)
    .maybeSingle();
  if (!data) return null;
  if (data.status !== "active") return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (data.device_id && deviceId && data.device_id !== deviceId) return null;
  return data.id as string;
}

async function consumeDailyPrompt(supabase: any, licenseId: string) {
  const { data, error } = await supabase.rpc("consume_daily_prompt", { p_license_id: licenseId });
  if (error || !Array.isArray(data) || !data[0]) throw new Error("Falha ao conferir o limite diário de comandos.");
  const quota = data[0] as { allowed: boolean; used: number; resets_at: string };
  if (!quota.allowed) return json({ ok: false, code: "DAILY_LIMIT", error: "limite de prompt diário batidos",
    daily_used: quota.used, resets_at: quota.resets_at }, 429);
  return null;
}

function stripJsonFences(text: string): string {
  const t = (text || "").trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return m ? m[1] : t;
}

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const DEEPSEEK_MODEL = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-flash";

function ensureModelKey(_model: string): string | null {
  return DEEPSEEK_API_KEY ? null : "DEEPSEEK_API_KEY não configurada nos Secrets do Supabase";
}

async function callAI(_model: string, system: string, user: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${user}\n\nResponda APENAS com JSON puro.` },
      ],
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `DeepSeek HTTP ${res.status}`);
  const answer = data?.choices?.[0]?.message?.content || "";
  if (!answer) throw new Error("A DeepSeek retornou uma resposta vazia.");
  return stripJsonFences(answer);
}

async function mgmt(token: string, path: string, init: RequestInit = {}) {
  return await fetch(`https://api.supabase.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// ── Lovable Cloud DB (OPCIONAL, opt-in) ────────────────────────────
// Caminho alternativo pra quem usa o banco NATIVO da Lovable (não um
// Supabase próprio conectado via OAuth). O token aqui é a sessão do
// PRÓPRIO cliente no lovable.dev, capturada pela extensão no navegador
// dele — nunca fica salva no nosso banco, só passa por aqui na hora da
// chamada. Endpoint não-documentado publicamente pela Lovable — deduzido
// por engenharia reversa do tráfego do navegador, então pode quebrar sem
// aviso se eles mudarem o formato.
async function mgmtLovableCloud(projectId: string, token: string, path: string, init: RequestInit = {}) {
  return await fetch(`https://api.lovable.dev/cloud/db-proxy/v1/projects/${projectId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ ok: false, error: "Servidor mal configurado" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "").trim();
    const licenseKey = String(body.licenseKey ?? "").trim();
    const deviceId = String(body.deviceId ?? "").trim();
    const model = "deepseek-flash";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const licenseId = await resolveLicense(supabase, licenseKey, deviceId);
    if (!licenseId) return json({ ok: false, error: "Licença inválida ou expirada" }, 403);

    // Lovable Cloud DB: token da sessão do cliente no lovable.dev, mandado
    // pela extensão só quando ele liga o recurso manualmente nas
    // configurações. Nunca persistido — só usado pra essa chamada.
    const lovableCloudMode = body.lovableCloudMode === true;
    const lovableCloudToken = String(body.lovableCloudToken ?? "").trim();
    const lovableProjectId = String(body.lovableProjectId ?? "").trim();
    const usarLovableCloud = lovableCloudMode && !!lovableCloudToken && !!lovableProjectId;

    if (action === "connect") {
      const token = String(body.accessToken ?? "").trim();
      if (!token) return json({ ok: false, error: "Informe o token de acesso do Supabase." }, 400);

      const r = await mgmt(token, "/v1/projects");
      if (!r.ok) {
        return json({ ok: false, error: "Token inválido ou sem permissão. Gere um novo em supabase.com/dashboard/account/tokens" }, 403);
      }
      const projects = await r.json();
      const lista = (Array.isArray(projects) ? projects : []).map((p: any) => ({
        ref: p.id, name: p.name, region: p.region,
      }));

      await supabase.from("supabase_connections").upsert({
        license_id: licenseId,
        device_id: deviceId,
        access_token: token,
        project_ref: null,
        project_name: null,
        connected_at: new Date().toISOString(),
      }, { onConflict: "license_id,device_id" });

      return json({ ok: true, projects: lista });
    }

    if (action === "select_project") {
      const ref = String(body.projectRef ?? "").trim();
      if (!/^[a-z0-9]{20}$/.test(ref)) return json({ ok: false, error: "Identificador do projeto inválido." }, 400);
      const { data: connection } = await supabase.from("supabase_connections")
        .select("access_token").eq("license_id", licenseId).eq("device_id", deviceId).maybeSingle();
      if (!connection?.access_token) return json({ ok: false, code: "NOT_CONNECTED", error: "Autorize o Supabase na extensão." }, 403);
      const available = await mgmt(connection.access_token, "/v1/projects");
      if (!available.ok) return json({ ok: false, error: "Não consegui verificar os projetos autorizados. Reconecte o Supabase." }, 403);
      const projects = await available.json();
      const project = Array.isArray(projects) ? projects.find((p: any) => p.id === ref) : null;
      if (!project) return json({ ok: false, error: "Este projeto não está entre os projetos Supabase autorizados." }, 403);
      const name = String(project.name || ref);
      const { error } = await supabase.from("supabase_connections")
        .update({ project_ref: ref, project_name: name, last_used_at: new Date().toISOString() })
        .eq("license_id", licenseId).eq("device_id", deviceId);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, selected: { ref, name } });
    }

    if (action === "disconnect") {
      await supabase.from("supabase_connections")
        .delete().eq("license_id", licenseId).eq("device_id", deviceId);
      return json({ ok: true });
    }

    if (action === "status") {
      if (usarLovableCloud) {
        return json({ ok: true, project_ref: lovableProjectId, project_name: "Lovable Cloud", projects: [], lovable_cloud: true });
      }
      const { data: conn } = await supabase.from("supabase_connections")
        .select("project_ref, project_name, access_token")
        .eq("license_id", licenseId).eq("device_id", deviceId).maybeSingle();
      if (!conn) return json({ ok: false, code: "NOT_CONNECTED", error: "Supabase não conectado" }, 404);

      let projects: any[] = [];
      const r = await mgmt(conn.access_token, "/v1/projects");
      if (r.ok) {
        const ps = await r.json();
        projects = (Array.isArray(ps) ? ps : []).map((p: any) => ({ ref: p.id, name: p.name }));
      }
      return json({ ok: true, project_ref: conn.project_ref, project_name: conn.project_name, projects });
    }

    // A partir daqui, toda ação precisa de uma "conexão" — real (Supabase
    // via OAuth) ou a sessão capturada do Lovable Cloud.
    let conn: { access_token: string; project_ref: string; project_name: string | null };
    if (usarLovableCloud) {
      conn = { access_token: lovableCloudToken, project_ref: lovableProjectId, project_name: "Lovable Cloud" };
    } else {
      const { data: connReal } = await supabase.from("supabase_connections")
        .select("access_token, project_ref, project_name")
        .eq("license_id", licenseId).eq("device_id", deviceId).maybeSingle();
      if (!connReal?.access_token) return json({ ok: false, code: "NOT_CONNECTED", error: "Supabase não conectado" }, 404);
      if (!connReal.project_ref) return json({ ok: false, code: "NO_PROJECT", error: "Escolha um projeto do Supabase" }, 400);
      const requestedRef = String(body.projectRef || connReal.project_ref);
      if (body.projectRef) {
        const available = await mgmt(connReal.access_token, "/v1/projects");
        if (!available.ok) return json({ ok: false, error: "Não consegui verificar o acesso ao projeto Supabase." }, 403);
        const projects = await available.json();
        const project = Array.isArray(projects) ? projects.find((p: any) => p.id === requestedRef) : null;
        if (!project) return json({ ok: false, error: "Projeto Supabase não autorizado." }, 403);
        conn = { ...connReal, project_ref: requestedRef, project_name: String(project.name || requestedRef) };
      } else conn = connReal;
    }

    // Consulta unificada: mesma chamada de fora, só troca a rota (API de
    // gerenciamento do Supabase, ou o proxy da Lovable) por baixo.
    async function queryDb(sql: string) {
      if (usarLovableCloud) {
        return await mgmtLovableCloud(lovableProjectId, lovableCloudToken, "/database/query", {
          method: "POST", body: JSON.stringify({ query: sql }),
        });
      }
      return await mgmt(conn.access_token, `/v1/projects/${conn.project_ref}/database/query`, {
        method: "POST", body: JSON.stringify({ query: sql }),
      });
    }

    if (action === "schema") {
      const q = `select table_name, column_name, data_type, is_nullable
                 from information_schema.columns
                 where table_schema = 'public'
                 order by table_name, ordinal_position`;
      const r = await queryDb(q);
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return json({ ok: false, error: "Falha ao ler o schema: " + t.slice(0, 200) }, 502);
      }
      return json({ ok: true, schema: await r.json() });
    }

    if (action === "generate") {
      const keyErr = ensureModelKey(model);
      if (keyErr) return json({ ok: false, error: keyErr }, 500);
      const prompt = String(body.prompt ?? "").trim();
      if (!prompt) return json({ ok: false, error: "Descreva a mudança que você quer no banco." }, 400);
      const limit = await consumeDailyPrompt(supabase, licenseId);
      if (limit) return limit;

      let schemaTxt = "(não foi possível ler o schema atual)";
      try {
        const q = `select table_name, column_name, data_type from information_schema.columns where table_schema='public' order by table_name, ordinal_position`;
        const r = await queryDb(q);
        if (r.ok) {
          const rows = await r.json();
          const porTabela: Record<string, string[]> = {};
          for (const row of (Array.isArray(rows) ? rows : [])) {
            (porTabela[row.table_name] ||= []).push(`${row.column_name} ${row.data_type}`);
          }
          schemaTxt = Object.entries(porTabela)
            .map(([t, cols]) => `${t}(${cols.join(", ")})`).join("\n") || "(banco vazio)";
        }
      } catch (_e) { /* segue sem o schema */ }

      const system = `Você é um DBA especialista em PostgreSQL/Supabase. Gere o SQL para atender ao pedido do usuário.

REGRAS OBRIGATÓRIAS:
- Gere apenas o SQL necessário, nada além do pedido.
- Trabalhe SOMENTE no schema "public". NUNCA toque em auth, storage, vault, realtime ou pg_catalog.
- Prefira operações aditivas (CREATE TABLE, ADD COLUMN). Só use DROP/DELETE se o usuário pedir claramente.
- Sempre use "if not exists" ao criar e "if exists" ao remover.
- Em toda tabela nova: id uuid primary key default gen_random_uuid() e created_at timestamptz default now().
- Ative RLS nas tabelas novas (alter table ... enable row level security) e explique na nota que o usuário precisa criar as policies.
- Se o pedido for impossível ou perigoso, devolva sql vazio e explique em "note".

Schema atual do banco:
${schemaTxt}

Responda em JSON: {"sql": "...", "explicacao": "o que esse SQL faz, em português simples", "note": "avisos, se houver"}`;

      let parsed: any = null;
      try {
        parsed = JSON.parse(await callAI(model, system, `Pedido: "${prompt}"`));
      } catch (e) {
        console.error("[erro gerar SQL]", e);
        return json({ ok: false, error: "Falha ao gerar o SQL: " + (e instanceof Error ? e.message : String(e)) }, 502);
      }

      const sql = String(parsed?.sql || "").trim();
      if (!sql) {
        return json({ ok: false, error: parsed?.note || "A IA não gerou SQL para este pedido." }, 422);
      }

      const analise = analyzeSql(sql);
      return json({
        ok: true,
        sql,
        explicacao: parsed?.explicacao || "",
        note: parsed?.note || "",
        blocked: analise.blocked,
        destructive: analise.destructive,
        reasons: analise.reasons,
      });
    }

    if (action === "apply") {
      const sql = String(body.sql ?? "").trim();
      const confirmado = body.confirmDestructive === true;
      const prompt = String(body.prompt ?? "").trim();
      if (!sql) return json({ ok: false, error: "SQL ausente" }, 400);

      const analise = analyzeSql(sql);

      if (analise.blocked) {
        await supabase.from("supabase_sql_log").insert({
          license_id: licenseId, device_id: deviceId, project_ref: conn.project_ref,
          prompt, sql_executed: sql, was_destructive: true, success: false,
          error_message: "BLOQUEADO: " + analise.reasons.join("; "),
        });
        return json({ ok: false, blocked: true, reasons: analise.reasons,
          error: "Esse comando não é permitido: " + analise.reasons.join("; ") }, 403);
      }

      if (analise.destructive && !confirmado) {
        return json({ ok: false, needsConfirm: true, destructive: true, reasons: analise.reasons,
          error: "Esse comando pode causar perda de dados. Confirme para continuar." }, 409);
      }

      const r = await queryDb(sql);
      const txt = await r.text().catch(() => "");

      await supabase.from("supabase_sql_log").insert({
        license_id: licenseId, device_id: deviceId, project_ref: conn.project_ref,
        prompt, sql_executed: sql, was_destructive: analise.destructive,
        success: r.ok, error_message: r.ok ? null : txt.slice(0, 500),
      });

      if (!r.ok) {
        return json({ ok: false, error: "O banco recusou o comando: " + txt.slice(0, 300) }, 502);
      }

      let result: unknown = null;
      try { result = JSON.parse(txt); } catch { result = txt; }

      if (!usarLovableCloud) {
        await supabase.from("supabase_connections")
          .update({ last_used_at: new Date().toISOString() })
          .eq("license_id", licenseId).eq("device_id", deviceId);
      }

      return json({ ok: true, result, was_destructive: analise.destructive });
    }

    return json({ ok: false, error: "Ação desconhecida: " + action }, 400);
  } catch (e) {
    return json({ ok: false, error: "Erro interno: " + (e instanceof Error ? e.message : String(e)) }, 500);
  }
});
