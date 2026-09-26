import type { MetadataRoute } from "next";
import { getAllDocs } from "../lib/docs";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getAllDocs();
  return ["", "/docs", ...docs.map((d) => `/docs/${d.slugPath}`)].map((path) => ({
    url: `https://react-clickmap.vercel.app${path}`,
  }));
}
