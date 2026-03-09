import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg"];

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

async function convertToPng(
  inputPath: string,
  size: number,
  backgroundColor: string
): Promise<Buffer> {
  let pipeline = sharp(inputPath).resize(size, size);

  if (backgroundColor !== "transparent") {
    pipeline = pipeline.flatten({ background: backgroundColor });
  }

  return pipeline.png().toBuffer();
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
