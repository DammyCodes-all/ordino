export function slugifyFilename(title: string, version: number) {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "ordino";
  return `${slug}-v${version}.pdf`;
}
