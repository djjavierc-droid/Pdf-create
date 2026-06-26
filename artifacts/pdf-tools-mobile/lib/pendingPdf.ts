// Module-level store that passes a PDF URI between the Linking handler
// (root _layout / +not-found) and the reader screen.

let pendingUri: string | null = null;

export function setPendingPdf(uri: string): void {
  pendingUri = uri;
}

/** Read without consuming — lets multiple screens check without racing. */
export function peekPendingPdf(): string | null {
  return pendingUri;
}

/** Read and consume — the reader calls this on focus. */
export function takePendingPdf(): string | null {
  const uri = pendingUri;
  pendingUri = null;
  return uri;
}
