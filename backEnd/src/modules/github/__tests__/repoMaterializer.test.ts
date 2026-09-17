import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

jest.mock('octokit', () => ({ Octokit: jest.fn() }));
jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn(),
  createOAuthUserAuth: jest.fn(),
}));

import {
  cleanupStaleWorkspaces,
  materializeRepository,
  RepoMaterializationError,
  type GitRunner,
} from '../services/repoMaterializer';

const baseSha = 'base-sha';
const headSha = 'head-sha';

async function createTempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'prviewer-materializer-test-'));
}

function createGitHubClient() {
  return {
    rest: {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            base: { sha: baseSha },
            head: { sha: headSha },
          },
        }),
      },
    },
  };
}

describe('repoMaterializer', () => {
  let root: string;

  beforeEach(async () => {
    root = await createTempRoot();
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('materializes pull request refs with an in-memory authorization header', async () => {
    const calls: string[][] = [];
    const runGit: GitRunner = jest.fn(async (args) => {
      calls.push(args);
      if (args[0] === 'rev-parse') {
        return { stdout: `${headSha}\n`, stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });
    const github = createGitHubClient();

    const result = await materializeRepository(
      {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 42,
        installationId: 7,
        runId: 'run-1',
        workdirRoot: root,
      },
      {
        getInstallationToken: jest.fn().mockResolvedValue('secret-token'),
        createGitHubClient: jest.fn().mockReturnValue(github),
        runGit,
      },
    );

    expect(result.repoDir).toBe(path.join(root, 'owner', 'repo', 'pr-42', 'run-1'));
    expect(github.rest.pulls.get).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 42,
    });

    const remoteCall = calls.find((args) => args[0] === 'remote');
    expect(remoteCall?.[3]).toBe('https://github.com/owner/repo.git');
    expect(remoteCall?.join(' ')).not.toContain('secret-token');

    const fetchCalls = calls.filter((args) => args.includes('fetch'));
    expect(fetchCalls[0]).toContain('refs/pull/42/head:refs/remotes/origin/pr/42');
    expect(fetchCalls[1]).toContain(baseSha);
    for (const fetchCall of fetchCalls) {
      expect(fetchCall[1]).toContain('http.extraHeader=Authorization: Basic');
    }

    await result.cleanup();
    await result.cleanup();
    await expect(fs.access(result.repoDir)).rejects.toThrow();
  });

  it('removes a partial workspace when git fails', async () => {
    const runGit: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'checkout') {
        throw new Error('secret-token must not leak');
      }
      return { stdout: '', stderr: '' };
    });

    await expect(materializeRepository(
      {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 1,
        installationId: 1,
        runId: 'run-fail',
        workdirRoot: root,
      },
      {
        getInstallationToken: jest.fn().mockResolvedValue('secret-token'),
        createGitHubClient: jest.fn().mockReturnValue(createGitHubClient()),
        runGit,
      },
    )).rejects.not.toThrow('secret-token');

    await expect(fs.access(path.join(root, 'owner', 'repo', 'pr-1', 'run-fail')))
      .rejects.toThrow();
  });

  it('rejects a checkout whose HEAD does not match the requested head SHA', async () => {
    const runGit: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'rev-parse') {
        return { stdout: 'unexpected-head\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    await expect(materializeRepository(
      {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 1,
        installationId: 1,
        runId: 'run-mismatch',
        workdirRoot: root,
      },
      {
        getInstallationToken: jest.fn().mockResolvedValue('token'),
        createGitHubClient: jest.fn().mockReturnValue(createGitHubClient()),
        runGit,
      },
    )).rejects.toMatchObject({ code: 'VERIFY_FAILED' });

    await expect(fs.access(path.join(root, 'owner', 'repo', 'pr-1', 'run-mismatch')))
      .rejects.toThrow();
  });

  it('rejects unsafe repository path segments before running git', async () => {
    const getInstallationToken = jest.fn().mockResolvedValue('token');
    await expect(materializeRepository(
      {
        owner: '..',
        repo: 'repo',
        pullNumber: 1,
        installationId: 1,
        workdirRoot: root,
      },
      { getInstallationToken },
    )).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(getInstallationToken).not.toHaveBeenCalled();
  });

  it('cleans stale per-run workspaces by modification time', async () => {
    const staleRun = path.join(root, 'owner', 'repo', 'pr-1', 'stale-run');
    const freshRun = path.join(root, 'owner', 'repo', 'pr-1', 'fresh-run');
    await fs.mkdir(staleRun, { recursive: true });
    await fs.mkdir(freshRun, { recursive: true });
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await fs.utimes(staleRun, oldDate, oldDate);

    const removed = await cleanupStaleWorkspaces(root, 24 * 60 * 60 * 1000);

    expect(removed).toBe(1);
    await expect(fs.access(staleRun)).rejects.toThrow();
    await expect(fs.access(freshRun)).resolves.toBeUndefined();
  });

  it('maps invalid installation IDs to a stable materialization error', async () => {
    await expect(materializeRepository({
      owner: 'owner',
      repo: 'repo',
      pullNumber: 1,
      installationId: 0,
      workdirRoot: root,
    })).rejects.toBeInstanceOf(RepoMaterializationError);
  });
});
