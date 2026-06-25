// Simple module-level store to pass a PDF URI from the Linking handler
// (in root _layout) to the reader screen without URL-encoding issues.

let pendingUri: string | null = null;

export function setPendingPdf(uri: string): void {
  pendingUri = uri;
}

export function takePendingPdf(): string | null {
  const uri = pendingUri;
  pendingUri = null;
  return uri;
}
