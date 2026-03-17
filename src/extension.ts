import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import pngToIco from "png-to-ico";
import { Jimp } from "jimp";
import { Resvg, initWasm } from "@resvg/resvg-wasm";

const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg"];

let wasmInitialized = false;

function isSupportedImage(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

async function getImageUri(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
  if (uri && isSupportedImage(uri.fsPath)) {
    return uri;
  }
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.uri && isSupportedImage(activeEditor.document.uri.fsPath)) {
    return activeEditor.document.uri;
  }
  const selected = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: "Select image to convert",
    filters: {
      Images: ["png", "jpg", "jpeg", "svg"],
    },
  });
  return selected?.[0];
}

function hexToRgba(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}

async function ensureWasmInitialized(): Promise<void> {
  if (wasmInitialized) return;
  const wasmPath = path.resolve(
    path.dirname(require.resolve("@resvg/resvg-wasm")),
    "index_bg.wasm"
  );
  await initWasm(fs.readFileSync(wasmPath));
  wasmInitialized = true;
}

function preprocessSvg(svgString: string): string {
  const trimmed = svgString.trim();
  if (!trimmed) {
    throw new Error("SVG file is empty");
  }
  // Ensure the root <svg> element has xmlns - resvg requires it for some SVGs
  const svgRootMatch = trimmed.match(/<svg(\s[^>]*)?>/i);
  if (svgRootMatch && !/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svgRootMatch[0])) {
    return trimmed.replace(/<svg(\s[^>]*)?>/i, (match) => {
      const attrs = match.slice(4, -1); // Everything between <svg and >
      const xmlns = 'xmlns="http://www.w3.org/2000/svg"';
      return attrs.trim() ? `<svg ${xmlns} ${attrs.trim()}>` : `<svg ${xmlns}>`;
    });
  }
  return trimmed;
}

async function convertToPng(
  inputPath: string,
  size: number,
  backgroundColor: string
): Promise<Buffer> {
  let inputBuffer: Buffer;

  if (path.extname(inputPath).toLowerCase() === ".svg") {
    await ensureWasmInitialized();
    const rawSvg = fs.readFileSync(inputPath, "utf-8");
    let svgString: string;
    try {
      svgString = preprocessSvg(rawSvg);
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
    try {
      const resvg = new Resvg(svgString, {
        fitTo: { mode: "width", value: size },
      });
      inputBuffer = Buffer.from(resvg.render().asPng());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("root node") || msg.includes("parsing failed")) {
        throw new Error(
          `Invalid SVG: ${msg}. Ensure the file has a valid <svg> root element with xmlns="http://www.w3.org/2000/svg", is UTF-8 encoded, and is not empty.`
        );
      }
      throw e;
    }
  } else {
    inputBuffer = fs.readFileSync(inputPath);
  }

  const image = await Jimp.read(inputBuffer);
  image.resize({ w: size, h: size });

  if (backgroundColor !== "transparent") {
    const bg = new Jimp({ width: size, height: size, color: hexToRgba(backgroundColor) });
    bg.composite(image, 0, 0);
    return Buffer.from(await bg.getBuffer("image/png"));
  }

  return Buffer.from(await image.getBuffer("image/png"));
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "ico-generator.generateIco",
    async (uri?: vscode.Uri) => {
      const imageUri = await getImageUri(uri);
      if (!imageUri) {
        vscode.window.showWarningMessage("No image file selected.");
        return;
      }

      const inputPath = imageUri.fsPath;
      const dir = path.dirname(inputPath);
      const basename = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(dir, `${basename}.ico`);

      try {
        const config = vscode.workspace.getConfiguration("ico-generator");
        const outputSize = config.get<number>("outputSize", 64);
        const backgroundColor = config.get<string>("backgroundColor", "transparent");

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Generating .ico file",
            cancellable: false,
          },
          async () => {
            const pngBuffer = await convertToPng(
              inputPath,
              outputSize,
              backgroundColor
            );
            const icoBuffer = await pngToIco(pngBuffer);
            fs.writeFileSync(outputPath, icoBuffer);
          }
        );

        vscode.window.showInformationMessage(
          `Created ${path.basename(outputPath)}`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to generate .ico: ${message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
