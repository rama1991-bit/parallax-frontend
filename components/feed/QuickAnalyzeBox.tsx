async function submit(e: React.FormEvent) {
  e.preventDefault();
  if (!url.trim()) return;

  setLoading(true);
  setError("");
  setQueued(null);

  try {
    const result = await apiPost("/api/v1/analyze", { url: url.trim() });

    setQueued(result);

    // 🔥 این خط مهمه
    onQueued?.(result);

    setUrl("");
  } catch (err: any) {
    setError(err.message || "Could not queue analysis.");
  } finally {
    setLoading(false);
  }
}