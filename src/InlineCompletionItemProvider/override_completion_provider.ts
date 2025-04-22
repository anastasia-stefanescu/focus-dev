import { InlineCompletionContext, CancellationToken, DocumentSelector, InlineCompletionItemProvider } from 'vscode';
import { InlineCompletionList, InlineCompletionItem, languages } from 'vscode';
import { window, TextDocument, Position, Disposable } from 'vscode';


// Hook into the Inline Completion API ----------------------------------------------
// https://github.com/microsoft/vscode-extension-samples/tree/main/inline-completions

function overrideInlineCompletionProvider() {
    //   Store the Original API Function
    const originalRegister = languages.registerInlineCompletionItemProvider;
    window.showInformationMessage("Original Register: ", originalRegister.toString());

    //   Override the API
    (languages as any).registerInlineCompletionItemProvider = function (selector: DocumentSelector,
        provider: InlineCompletionItemProvider): Disposable { //  replace with a custom function
        window.showInformationMessage("Intercepting inline completions!");

        const newProvider: InlineCompletionItemProvider = { // Wrap inside a custom provider so we can modify its behavior
            // Calls the original provider function to get AI-generated suggestions
            provideInlineCompletionItems: async function (document: TextDocument, position: Position, context: InlineCompletionContext, token: CancellationToken)
                : Promise<InlineCompletionList | InlineCompletionItem[]> {
                window.showInformationMessage("AI Suggestion Triggered!");
                const result = await provider.provideInlineCompletionItems(document, position, context, token); // here okay provider??

                // If the AI provides suggestions, we capture them before they appear in the editor
                if (result) {
                    const items = Array.isArray(result) ? result : result.items;
                    if (items.length > 0) {
                        window.showInformationMessage("AI Suggestion Received:", items.map(item => item.insertText.toString()).join(" + "));
                    }
                    return result;
                }
                else
                    return [];
            }
        };

        //return originalRegister.apply(this, [args[0], newProvider, args[2]]);
        return originalRegister.call(languages, selector, newProvider); // here we use the new provider
    };
}
