jest.mock('octokit', () => ({
  Octokit: jest.fn(),
}));

jest.mock('../models/PullRequest', () => ({
  PullRequest: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import { parsePrUrl } from '../services/githubService';

describe('githubService', () => {
  describe('parsePrUrl', () => {
    it('should parse a valid GitHub PR URL', () => {
      const result = parsePrUrl('https://github.com/facebook/react/pull/25540');
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
});
