# ICO Generator

A VS Code extension for generating ICO files from images. Right-click any PNG, JPG, JPEG, or SVG file and generate a `.ico` file in the same folder.

## Features

- **Convert images to ICO** – Supports PNG, JPG, JPEG, and SVG input formats
- **Context menu** – Right-click an image in the Explorer and select "Generate .ico"
- **Command Palette** – Run "Generate .ico" to select an image via file picker
- **Configurable output size** – Set the ICO dimensions (16–256 pixels, default: 64)
- **Background color** – Use transparency or a solid hex color for transparent areas

## Usage

1. **From Explorer**: Right-click a PNG, JPG, JPEG, or SVG file → **Generate .ico**
2. **From Command Palette**: `Cmd+Shift+P` / `Ctrl+Shift+P` → type "Generate .ico" → select an image

The `.ico` file is created in the same folder as the source image.

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `ico-generator.outputSize` | Output size in pixels (width and height) | `64` |
| `ico-generator.backgroundColor` | `transparent` or hex color (e.g. `#ffffff`) | `transparent` |

## Development

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Open the folder in VS Code and press `F5` to launch the Extension Development Host.

3. In the new window, right-click an image or run "Generate .ico" from the Command Palette.

## Building

```bash
pnpm run compile
```

## Packaging & Publishing

`vsce` (the VS Code extension CLI) works best with npm. To package:

```bash
pnpm add -g @vscode/vsce
pnpm run package
# or: vsce package
```

To publish to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/):

1. Create a [publisher](https://marketplace.visualstudio.com/manage) and [Personal Access Token](https://learn.microsoft.com/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) (Marketplace → Manage scope)
2. Run `vsce login mattiaz9` and enter your token
3. Run `vsce publish`

## License

MIT © [mattiaz9](https://github.com/mattiaz9)
