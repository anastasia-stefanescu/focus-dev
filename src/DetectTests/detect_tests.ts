// https://code.visualstudio.com/api/extension-guides/testing

// import { TextDocument } from "vscode";

// function parseTestsInDocument(e: TextDocument) {
//     if (e.uri.scheme === 'file' && e.uri.path.endsWith('.md')) {
//         parseTestsInFileContents(getOrCreateFile(e.uri), e.getText());
//     }
// }

// async function parseTestsInFileContents(file: vscode.TestItem, contents?: string) {
//     // If a document is open, VS Code already knows its contents. If this is being
//     // called from the resolveHandler when a document isn't open, we'll need to
//     // read them from disk ourselves.
//     if (contents === undefined) {
//         const rawContent = await vscode.workspace.fs.readFile(file.uri);
//         contents = new TextDecoder().decode(rawContent);
//     }

//     // some custom logic to fill in test.children from the contents...
// }
