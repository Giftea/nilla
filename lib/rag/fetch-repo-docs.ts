import {
  getRepoFileContent,
  getRepoDirectoryListing,
} from "@/lib/github/api";
import { ingestRepoDocuments, type RepoDocument } from "./ingest";

const TARGET_FILES = ["README.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"];

const DOCS_DIR = "docs";

/**
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

    //  Fetch well-known root files (README, CONTRIBUTING, etc.)
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

    //  Scan docs/ directory for markdown files
    const docsListing = await getRepoDirectoryListing(owner, repoName, DOCS_DIR);
    const mdFiles = docsListing.filter(
      (f) => f.type === "file" && f.name.endsWith(".md")
    );

    if (mdFiles.length > 0) {
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

    //  If no docs found at all, nothing to ingest
    if (documents.length === 0) {
      console.log(`[RAG] No documentation found for ${repoFullName}`);
      return { success: true, chunksStored: 0, filesFound: 0 };
    }

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
