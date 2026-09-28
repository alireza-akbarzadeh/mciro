// Learning aid: add ?break=auth to the URL and this remote throws while
// rendering, so you can watch the shell's error boundary contain the failure.
// Stopping the dev server shows the other failure mode: the remote never loads.
export function throwIfBroken(): void {
  if (new URLSearchParams(window.location.search).get('break') === 'auth') {
    throw new Error('[auth] intentional crash (?break=auth)');
  }
}
