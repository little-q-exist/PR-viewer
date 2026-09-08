import { Octokit } from 'octokit';
import { getOrSet } from '../../../shared/cache';
import { PullRequest } from '../models/PullRequest';
import type { PrData, ParsedPrUrl } from '../../../shared/types';

const PR_CACHE_TTL = 900; // 15 minutes

// 宽松类型：容纳 pulls.listReviewComments 返回字段（line）与旧 issue
// comments 返回字段（position）的差异，取数时优先 line、缺失时回退 position。
type ReviewCommentLike = {
  id: number;
  body?: string | null;
  user?: { login?: string | null } | null;
  path?: string;
  line?: number | null;
  position?: number | null;
  created_at: string;
};

export function parsePrUrl(url: string): ParsedPrUrl {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') {
      throw new Error('Invalid GitHub PR URL');
    }

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 4 || parts[2] !== 'pull') {
      throw new Error('Invalid GitHub PR URL');
    }

    const pullNumber = parseInt(parts[3], 10);
    if (isNaN(pullNumber)) {
      throw new Error('Invalid GitHub PR URL');
    }

    return { owner: parts[0], repo: parts[1], pullNumber };
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid GitHub PR URL') {
      throw error;
    }
    throw new Error('Invalid GitHub PR URL');
  }
}

function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function fetchPrFromGitHub(
  owner: string,
  repo: string,
  pullNumber: number,
  accessToken: string,
): Promise<PrData> {
  const octokit = createOctokit(accessToken);

  const [{ data: pr }, { data: files }, { data: commits }, { data: reviewComments }] =
    await Promise.all([
      octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber }),
      octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: 100 }),
      octokit.rest.pulls.listCommits({ owner, repo, pull_number: pullNumber, per_page: 100 }),
      octokit.rest.pulls.listReviewComments({ owner, repo, pull_number: pullNumber, per_page: 100 }),
    ]);

  const diffResponse = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls/{pull_number}',
    {
      owner,
      repo,
      pull_number: pullNumber,
      headers: { accept: 'application/vnd.github.v3.diff' },
    },
  );

  const diff = typeof diffResponse.data === 'string' ? diffResponse.data : '';

  return {
    url: pr.html_url,
    owner,
    repo,
    pullNumber,
    title: pr.title,
    body: pr.body ?? '',
    state: pr.state as 'open' | 'closed' | 'merged',
    author: {
      login: pr.user?.login ?? 'unknown',
      avatarUrl: pr.user?.avatar_url ?? '',
    },
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    files: files.map((f) => ({
      sha: f.sha ?? '',
      filename: f.filename,
      status: f.status as 'added' | 'modified' | 'removed',
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch ?? undefined,
    })),
    diff,
    commits: commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: {
        login: c.author?.login ?? 'unknown',
        avatarUrl: c.author?.avatar_url ?? '',
      },
      date: new Date(c.commit.author?.date ?? Date.now()),
    })),
    comments: (reviewComments as unknown as ReviewCommentLike[]).map((c) => {
      const line =
        typeof c.line === 'number'
          ? c.line
          : typeof c.position === 'number'
            ? c.position
            : undefined;
      return {
        id: c.id,
        body: c.body ?? '',
        author: { login: c.user?.login ?? 'unknown' },
        path: c.path,
        line,
        createdAt: new Date(c.created_at),
      };
    }),
  };
}

export async function getOrFetchPr(
  prUrl: string,
  accessToken: string,
): Promise<PrData> {
  const { owner, repo, pullNumber } = parsePrUrl(prUrl);

  const cacheKey = `pr:${owner}:${repo}:${pullNumber}`;
  const memoryCached = await getOrSet(cacheKey, PR_CACHE_TTL, async () => {
    const existing = await PullRequest.findOne({ owner, repo, pullNumber });
    if (existing) {
      return existing.toObject() as unknown as PrData;
    }

    const prData = await fetchPrFromGitHub(owner, repo, pullNumber, accessToken);

    await PullRequest.findOneAndUpdate(
      { owner, repo, pullNumber },
      { ...prData, fetchedAt: new Date() },
      { upsert: true, new: true },
    );

    return prData;
  });

  return memoryCached;
}
