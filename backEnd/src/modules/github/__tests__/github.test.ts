jest.mock('octokit', () => ({
  Octokit: jest.fn(),
}));

jest.mock('../../../shared/cache', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('../models/PullRequest', () => ({
  PullRequest: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import { Octokit } from 'octokit';
import cache from '../../../shared/cache';
import { PullRequest } from '../models/PullRequest';
import {
  getOrFetchPr,
  parsePrUrl,
  PrAccessDeniedError,
} from '../services/githubService';
import type { PrData } from '../../../shared/types';

const prUrl = 'https://github.com/facebook/react/pull/25540';
const cachedPr = {
  url: prUrl,
  owner: 'facebook',
  repo: 'react',
  pullNumber: 25540,
  title: 'Fix',
  state: 'open',
  author: { login: 'octocat', avatarUrl: '' },
  baseBranch: 'main',
  headBranch: 'fix',
  files: [],
  diff: 'diff --git a/a b/a',
  commits: [],
  comments: [],
} as PrData;

function mockOctokit(pullsGet: jest.Mock, request = jest.fn()) {
  (Octokit as unknown as jest.Mock).mockImplementation(() => ({
    rest: {
      pulls: {
        get: pullsGet,
        listFiles: jest.fn().mockResolvedValue({ data: [] }),
        listCommits: jest.fn().mockResolvedValue({ data: [] }),
        listReviewComments: jest.fn().mockResolvedValue({ data: [] }),
      },
    },
    request,
  }));
}

describe('githubService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parsePrUrl', () => {
    it('should parse a valid GitHub PR URL', () => {
      const result = parsePrUrl(prUrl);
      expect(result).toEqual({ owner: 'facebook', repo: 'react', pullNumber: 25540 });
    });

    it('should handle URL without trailing slash', () => {
      const result = parsePrUrl('https://github.com/vercel/next.js/pull/512');
      expect(result).toEqual({ owner: 'vercel', repo: 'next.js', pullNumber: 512 });
    });

    it('should throw for invalid URL format', () => {
      expect(() => parsePrUrl('https://example.com/not/a/pr')).toThrow('Invalid GitHub PR URL');
    });

    it('should throw for non-URL strings', () => {
      expect(() => parsePrUrl('not-a-url')).toThrow('Invalid GitHub PR URL');
    });
  });

  describe('getOrFetchPr', () => {
    it('should return a memory-cached PR after verifying current user access', async () => {
      const pullsGet = jest.fn().mockResolvedValue({ data: { id: 1 } });
      mockOctokit(pullsGet);
      (cache.get as jest.Mock).mockReturnValue(cachedPr);

      const result = await getOrFetchPr(prUrl, 'token-b');

      expect(pullsGet).toHaveBeenCalledWith({
        owner: 'facebook',
        repo: 'react',
        pull_number: 25540,
      });
      expect(result).toBe(cachedPr);
      expect(PullRequest.findOne).not.toHaveBeenCalled();
    });

    it.each([403, 404])(
      'should reject a cached PR when GitHub returns %s',
      async (status) => {
        const pullsGet = jest.fn().mockRejectedValue({ status });
        mockOctokit(pullsGet);
        (cache.get as jest.Mock).mockReturnValue(cachedPr);

        await expect(getOrFetchPr(prUrl, 'token-b')).rejects.toBeInstanceOf(
          PrAccessDeniedError,
        );
      },
    );

    it('should verify access before returning a MongoDB-cached PR', async () => {
      const pullsGet = jest.fn().mockResolvedValue({ data: { id: 1 } });
      mockOctokit(pullsGet);
      (cache.get as jest.Mock).mockReturnValue(undefined);
      (PullRequest.findOne as jest.Mock).mockResolvedValue({
        toObject: () => cachedPr,
      });

      const result = await getOrFetchPr(prUrl, 'token-b');

      expect(pullsGet).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith(
        'pr:facebook:react:25540',
        cachedPr,
        900,
      );
      expect(result).toBe(cachedPr);
    });

    it.each([403, 404])(
      'should reject an inaccessible PR on a cache miss when GitHub returns %s',
      async (status) => {
        const pullsGet = jest.fn().mockRejectedValue({ status });
        mockOctokit(pullsGet);
        (cache.get as jest.Mock).mockReturnValue(undefined);
        (PullRequest.findOne as jest.Mock).mockResolvedValue(null);

        await expect(getOrFetchPr(prUrl, 'token-b')).rejects.toBeInstanceOf(
          PrAccessDeniedError,
        );
      },
    );

    it('should use the verified full fetch on a cache miss', async () => {
      const pullsGet = jest.fn().mockResolvedValue({
        data: {
          html_url: prUrl,
          title: 'Fix',
          body: '',
          state: 'open',
          user: { login: 'octocat', avatar_url: '' },
          base: { ref: 'main' },
          head: { ref: 'fix' },
        },
      });
      const request = jest.fn().mockResolvedValue({ data: cachedPr.diff });
      mockOctokit(pullsGet, request);
      (cache.get as jest.Mock).mockReturnValue(undefined);
      (PullRequest.findOne as jest.Mock).mockResolvedValue(null);
      (PullRequest.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await getOrFetchPr(prUrl, 'token-a');

      expect(pullsGet).toHaveBeenCalledTimes(1);
      expect(result.diff).toBe(cachedPr.diff);
      expect(PullRequest.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
