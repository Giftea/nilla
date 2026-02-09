import {
  getRepoFileContent,
  getRepoDirectoryListing,
} from "@/lib/github/api";
import { ingestRepoDocuments, type RepoDocument } from "./ingest";

/**
 * Files to attempt fetching from every repo.
 * These are the most common documentation files in open-source projects.
 */
const TARGET_FILES = ["README.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"];

/**
 * Directory to scan for additional markdown docs.
 * Only top-level .md files are fetched (no recursive crawling).
 */
const DOCS_DIR = "docs";

/**
 * Fetches documentation files from a GitHub repo and ingests them
 * into Supabase for RAG retrieval.
 *
 * Fetches: README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and docs/*.md
 * Skips any files that don't exist (404s are handled gracefully).
 *
 * This function is designed to be called fire-and-forget after a repo
 * is added — errors are logged but not thrown to avoid blocking the
 * parent request.
 *
 * @param repoId       - UUID of the tracked_repos row
 * @param owner        - GitHub owner (e.g. "facebook")
 * @param repoName     - GitHub repo name (e.g. "react")
 * @param repoFullName - Full name (e.g. "facebook/react")
 */
export async function fetchAndIngestRepoDocs(
  repoId: string,
  owner: string,
  repoName: string,
  repoFullName: string
): Promise<{ success: boolean; chunksStored: number; filesFound: number }> {
  try {
    const documents: RepoDocument[] = [];

    // 1. Fetch well-known root files (README, CONTRIBUTING, etc.)
    const rootFileResults = await Promise.allSettled(
      TARGET_FILES.map(async (filePath) => {
        const content = await getRepoFileContent(owner, repoName, filePath);
        if (content) {
          return { filePath, content };
        }
        return null;
      })
    );

    for (const result of rootFileResults) {
      if (result.status === "fulfilled" && result.value) {
        documents.push(result.value);
      }
    }

    // 2. Scan docs/ directory for markdown files
    const docsListing = await getRepoDirectoryListing(owner, repoName, DOCS_DIR);
    const mdFiles = docsListing.filter(
      (f) => f.type === "file" && f.name.endsWith(".md")
    );

    if (mdFiles.length > 0) {
      // Fetch up to 10 doc files to stay within reasonable limits
      const docsToFetch = mdFiles.slice(0, 10);
      const docsResults = await Promise.allSettled(
        docsToFetch.map(async (file) => {
          const content = await getRepoFileContent(owner, repoName, file.path);
          if (content) {
            return { filePath: file.path, content };
          }
          return null;
        })
      );

      for (const result of docsResults) {
        if (result.status === "fulfilled" && result.value) {
          documents.push(result.value);
        }
      }
    }

    // 3. If no docs found at all, nothing to ingest
    if (documents.length === 0) {
      console.log(`[RAG] No documentation found for ${repoFullName}`);
      return { success: true, chunksStored: 0, filesFound: 0 };
    }

    // 4. Run the ingestion pipeline
    const { chunksStored } = await ingestRepoDocuments(
      repoId,
      repoFullName,
      documents
    );

    console.log(
      `[RAG] Ingested ${documents.length} files (${chunksStored} chunks) for ${repoFullName}`
    );

    return { success: true, chunksStored, filesFound: documents.length };
  } catch (error) {
    console.error(`[RAG] Failed to ingest docs for ${repoFullName}:`, error);
    return { success: false, chunksStored: 0, filesFound: 0 };
  }
}
