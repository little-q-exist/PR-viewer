import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { Dirent } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Octokit } from 'octokit';
import { getInstallationToken } from '../../auth/services/authService';

const execFileAsync = promisify(execFile);
const DEFAULT_WORKDIR = path.join(os.tmpdir(), 'prviewer-repos');
const DEFAULT_STALE_AGE_MS = 24 * 60 * 60 * 1000;
const GIT_TIMEOUT_MS = 120_000;

export type RepoMaterializationErrorCode =
  | 'INVALID_INPUT'
  | 'GITHUB_API_FAILED'
  | 'GIT_FAILED'
  | 'VERIFY_FAILED';

export class RepoMaterializationError extends Error {
  constructor(
    public readonly code: RepoMaterializationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RepoMaterializationError';
  }
}

export interface MaterializeRepositoryInput {
  owner: string;
  repo: string;
  pullNumber: number;
  installationId: number;
  runId?: string;
  workdirRoot?: string;
  signal?: AbortSignal;
}

export interface MaterializedRepository {
  repoDir: string;
  baseSha: string;
  headSha: string;
  cleanup: () => Promise<void>;
}

export interface GitRunOptions {
  cwd?: string;
  signal?: AbortSignal;
}

export type GitRunner = (
  args: string[],
  options: GitRunOptions,
) => Promise<{ stdout: string; stderr: string }>;

interface PullRequestRefClient {
  rest: {
    pulls: {
      get: (input: {
        owner: string;
        repo: string;
        pull_number: number;
      }) => Promise<{
        data: {
          base: { sha: string };
          head: { sha: string };
        };
      }>;
    };
  };
}

export interface RepoMaterializerDependencies {
  getInstallationToken?: (installationId: number) => Promise<string>;
  createGitHubClient?: (token: string) => PullRequestRefClient;
  runGit?: GitRunner;
}

function isSafePathSegment(value: string): boolean {
  return (
    value.length > 0 &&
    value !== '.' &&
    value !== '..' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  );
}

function resolveInside(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...segments);
  const relative = path.relative(resolvedRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new RepoMaterializationError(
      'INVALID_INPUT',
      'Repository work directory escapes the configured root',
    );
  }
  return target;
}

function createDefaultGitHubClient(token: string): PullRequestRefClient {
  return new Octokit({ auth: token });
}

async function runGitCommand(
  args: string[],
  options: GitRunOptions,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync('git', args, {
      cwd: options.cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      signal: options.signal,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } catch {
    throw new RepoMaterializationError('GIT_FAILED', 'Git command failed');
  }
}

function createAuthorizationHeader(token: string): string {
  const credentials = Buffer.from(`x-access-token:${token}`).toString('base64');
  return `http.extraHeader=Authorization: Basic ${credentials}`;
}

async function removeDirectory(repoDir: string, root: string): Promise<void> {
  const safeTarget = resolveInside(root, path.relative(path.resolve(root), path.resolve(repoDir)));
  await fs.rm(safeTarget, { recursive: true, force: true });
}

export async function materializeRepository(
  input: MaterializeRepositoryInput,
  dependencies: RepoMaterializerDependencies = {},
): Promise<MaterializedRepository> {
  if (
    !isSafePathSegment(input.owner) ||
    !isSafePathSegment(input.repo) ||
    !Number.isSafeInteger(input.pullNumber) ||
    input.pullNumber <= 0 ||
    !Number.isSafeInteger(input.installationId) ||
    input.installationId <= 0
  ) {
    throw new RepoMaterializationError('INVALID_INPUT', 'Invalid repository materialization input');
  }

  const runId = input.runId ?? randomUUID();
  if (!isSafePathSegment(runId)) {
    throw new RepoMaterializationError('INVALID_INPUT', 'Invalid repository run ID');
  }

  const root = path.resolve(input.workdirRoot ?? process.env.PRVIEWER_WORKDIR ?? DEFAULT_WORKDIR);
  const repoDir = resolveInside(root, input.owner, input.repo, `pr-${input.pullNumber}`, runId);
  const runGit = dependencies.runGit ?? runGitCommand;
  let cleanedUp = false;

  const cleanup = async (): Promise<void> => {
    if (cleanedUp) return;
    cleanedUp = true;
    await removeDirectory(repoDir, root);
  };

  try {
    const tokenProvider = dependencies.getInstallationToken ?? getInstallationToken;
    let token: string;
    try {
      token = await tokenProvider(input.installationId);
    } catch {
      throw new RepoMaterializationError(
        'GITHUB_API_FAILED',
        'Failed to obtain GitHub App installation token',
      );
    }
    const github = (dependencies.createGitHubClient ?? createDefaultGitHubClient)(token);

    let refs: { baseSha: string; headSha: string };
    try {
      const { data } = await github.rest.pulls.get({
        owner: input.owner,
        repo: input.repo,
        pull_number: input.pullNumber,
      });
      refs = { baseSha: data.base.sha, headSha: data.head.sha };
    } catch {
      throw new RepoMaterializationError(
        'GITHUB_API_FAILED',
        'Failed to resolve pull request base and head revisions',
      );
    }

    await fs.mkdir(repoDir, { recursive: true });
    const gitOptions: GitRunOptions = { cwd: repoDir, signal: input.signal };
    const remoteUrl = `https://github.com/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}.git`;
    const authConfig = createAuthorizationHeader(token);

    await runGit(['init', '--quiet'], gitOptions);
    await runGit(['remote', 'add', 'origin', remoteUrl], gitOptions);
    await runGit(
      [
        '-c',
        authConfig,
        'fetch',
        '--no-tags',
        '--depth=1',
        'origin',
        `refs/pull/${input.pullNumber}/head:refs/remotes/origin/pr/${input.pullNumber}`,
      ],
      gitOptions,
    );
    await runGit(
      ['-c', authConfig, 'fetch', '--no-tags', '--depth=1', 'origin', refs.baseSha],
      gitOptions,
    );
    await runGit(['checkout', '--quiet', '--detach', refs.headSha], gitOptions);

    const headResult = await runGit(['rev-parse', 'HEAD'], gitOptions);
    if (headResult.stdout.trim() !== refs.headSha) {
      throw new RepoMaterializationError(
        'VERIFY_FAILED',
        'Materialized repository HEAD does not match the requested pull request head',
      );
    }
    await runGit(['cat-file', '-e', `${refs.baseSha}^{commit}`], gitOptions);

    return {
      repoDir,
      baseSha: refs.baseSha,
      headSha: refs.headSha,
      cleanup,
    };
  } catch (error) {
    try {
      await cleanup();
    } catch {
      // Preserve the original materialization failure.
    }
    if (error instanceof RepoMaterializationError) {
      throw error;
    }
    throw new RepoMaterializationError('GIT_FAILED', 'Failed to materialize repository');
  }
}

export async function cleanupStaleWorkspaces(
  workdirRoot = process.env.PRVIEWER_WORKDIR ?? DEFAULT_WORKDIR,
  olderThanMs = Number(process.env.PRVIEWER_WORKDIR_STALE_MS) || DEFAULT_STALE_AGE_MS,
): Promise<number> {
  const root = path.resolve(workdirRoot);
  let removed = 0;
  let owners: Dirent<string>[];

  try {
    owners = await fs.readdir(root, { withFileTypes: true, encoding: 'utf8' });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  const cutoff = Date.now() - Math.max(olderThanMs, 0);
  for (const owner of owners) {
    if (!owner.isDirectory() || !isSafePathSegment(owner.name)) continue;
    const ownerDir = resolveInside(root, owner.name);
    const repos = await fs.readdir(ownerDir, { withFileTypes: true });
    for (const repo of repos) {
      if (!repo.isDirectory() || !isSafePathSegment(repo.name)) continue;
      const repoRoot = resolveInside(ownerDir, repo.name);
      const pullRequests = await fs.readdir(repoRoot, { withFileTypes: true });
      for (const pullRequest of pullRequests) {
        if (!pullRequest.isDirectory() || !/^pr-\d+$/.test(pullRequest.name)) continue;
        const pullRequestDir = resolveInside(repoRoot, pullRequest.name);
        const runs = await fs.readdir(pullRequestDir, { withFileTypes: true });
        for (const run of runs) {
          if (!run.isDirectory() || !isSafePathSegment(run.name)) continue;
          const runDir = resolveInside(pullRequestDir, run.name);
          const stat = await fs.stat(runDir);
          if (stat.mtimeMs < cutoff) {
            await fs.rm(runDir, { recursive: true, force: true });
            removed += 1;
          }
        }
      }
    }
  }

  return removed;
}
