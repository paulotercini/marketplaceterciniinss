// Áudio gravado no CRM sai do Chrome em WebM; o WhatsApp só toca voz em OGG/Opus.
process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "chave-de-teste";

const t = require("node:test");
const a = require("node:assert");
const { execFileSync } = require("node:child_process");
const { paraOgg } = require("../ponte");

t.test("WebM gravado no navegador vira OGG/Opus para mensagem de voz", async () => {
  const webm = execFileSync(require("ffmpeg-static"), ["-loglevel", "error", "-f", "lavfi",
    "-i", "sine=frequency=440:duration=1", "-c:a", "libopus", "-f", "webm", "pipe:1"]);
  const ogg = await paraOgg(webm);
  a.equal(ogg.subarray(0, 4).toString(), "OggS");
  a.ok(ogg.length > 500, "tem áudio dentro");
});

t.test("lixo no lugar de áudio falha com erro, não trava", async () => {
  await a.rejects(paraOgg(Buffer.from("isto não é áudio")), /ffmpeg/);
});

t.test("assinatura como no SMBot: nome em negrito e linha em branco; sem nome, texto puro", () => {
  const { assinar } = require("../ponte");
  a.strictEqual(assinar("Bom dia!", "Dr. Paulo Tercini"), "*Dr. Paulo Tercini:*\n\nBom dia!");
  a.strictEqual(assinar("Bom dia!", null), "Bom dia!");
  a.strictEqual(assinar("", "Ingrid"), "");
});
