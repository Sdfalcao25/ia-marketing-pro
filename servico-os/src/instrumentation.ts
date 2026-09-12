declare global {
  // eslint-disable-next-line no-var
  var __servicoOsWorkerStarted: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.ENABLE_INLINE_WORKER !== 'true') return;
  if (globalThis.__servicoOsWorkerStarted) return;
  globalThis.__servicoOsWorkerStarted = true;

  const { processOutbox, processNfseJobs } = await import('@/lib/jobs');

  const run = async () => {
    try {
      await processOutbox(25);
      await processNfseJobs(10);
    } catch (error) {
      console.error('[servicoos-worker]', error);
    }
  };

  const timer = setInterval(run, 5 * 60 * 1000);
  timer.unref?.();
  setTimeout(run, 15_000).unref?.();
}
