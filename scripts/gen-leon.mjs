import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Script utilitário para padronizar a imagem do parceiro LEON em proporção 4/5 (vertical),
// mantendo o JSX igual aos outros cards (object-cover) sem recorte feio.

const publicDir = path.resolve(process.cwd(), "public");
const outputPath = path.join(publicDir, "leon.png");
const sourcePath = path.join(publicDir, "leon-source.png");

if (!fs.existsSync(outputPath)) {
  throw new Error(`Arquivo não encontrado: ${outputPath}`);
}

// Se ainda não existe um "source", cria backup do leon.png atual.
if (!fs.existsSync(sourcePath)) {
  fs.copyFileSync(outputPath, sourcePath);
}

const input = sourcePath;

// Tamanho alvo (4/5). Mantemos um tamanho razoável para web e consistente com os outros banners.
const WIDTH = 900;
const HEIGHT = 1125;

// Fundo: preenche 4/5 com cover + blur + leve escurecida (para "sumir" qualquer sobra).
const background = await sharp(input)
  .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
  .blur(18)
  .modulate({ brightness: 0.78 })
  .toBuffer();

// Frente: mantém o criativo inteiro (contain) e centraliza.
const foreground = await sharp(input)
  .resize(WIDTH, HEIGHT, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

// Composição: fundo + overlay sutil + foreground
await sharp(background)
  .composite([
    { input: { create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.18 } } } },
    { input: foreground, gravity: "center" },
  ])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outputPath);

console.log("OK: leon.png gerado em 4/5 e leon-source.png preservado.");

