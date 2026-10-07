// Mantém a ponte e a transcrição ligadas no Windows, com o pm2:
//   npm install -g pm2 pm2-windows-startup
//   pm2 start ecosystem.config.js     (na pasta da ponte)
//   pm2 save                          (lembra o que está rodando)
//   pm2-startup install               (volta sozinho quando o Windows liga)
// Acompanhar: pm2 list · pm2 logs ponte-zap · pm2 logs transcricao-audios
// O pm2 reinicia o programa que cair. A chave do Supabase vem do .env ou
// das variáveis de ambiente do Windows, como quando roda no terminal.
module.exports = {
  apps: [
    // a ponte SAI de propósito quando a conexão cai (ou o CRM pede para
    // reconectar), para voltar com uma conexão só: o pm2 nunca pode desistir dela
    { name: "ponte-zap", script: "ponte.js", cwd: __dirname, time: true,
      restart_delay: 10000, max_restarts: 100000, min_uptime: 5000 },
    // uv no PATH do Windows; o Python certo e o Whisper ele mesmo resolve
    { name: "transcricao-audios", script: "uv", args: "run transcrever.py", interpreter: "none",
      cwd: __dirname, time: true, restart_delay: 30000 },
  ],
};
