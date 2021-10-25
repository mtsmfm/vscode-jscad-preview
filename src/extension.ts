import * as vscode from "vscode";
import { Preview } from "./preview";

const ViewType = "jscadPreview.previewEditor";
class Viewer implements vscode.CustomReadonlyEditorProvider {
  private readonly _previews = new Set<Preview>();

  constructor(private readonly extensionRoot: vscode.Uri) {}

  public async openCustomDocument(uri: vscode.Uri) {
    return { uri, dispose: () => {} };
  }

  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewEditor: vscode.WebviewPanel
  ): Promise<void> {
    const preview = new Preview(
      this.extensionRoot,
      document.uri,
      webviewEditor
    );
    this._previews.add(preview);

    webviewEditor.onDidDispose(() => {
      this._previews.delete(preview);
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const viewer = new Viewer(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(ViewType, viewer, {
      supportsMultipleEditorsPerDocument: true,
    })
  );
}
