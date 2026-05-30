import mongoose, { Document, Schema } from 'mongoose';
import type { FileInfo, CommitInfo, CommentInfo } from '../../../shared/types';

export interface IPullRequest extends Document {
  url: string;
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: { login: string; avatarUrl: string };
  baseBranch: string;
  headBranch: string;
  files: FileInfo[];
  diff: string;
  commits: CommitInfo[];
  comments: CommentInfo[];
  fetchedAt: Date;
  createdAt: Date;
}

const PullRequestSchema = new Schema<IPullRequest>(
  {
    url: { type: String, required: true, unique: true, index: true },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    pullNumber: { type: Number, required: true },
    title: { type: String, required: true },
    state: { type: String, enum: ['open', 'closed', 'merged'], required: true },
    author: {
      login: { type: String, required: true },
      avatarUrl: { type: String, required: true },
    },
    baseBranch: { type: String, required: true },
    headBranch: { type: String, required: true },
    files: [
      {
        sha: String,
        filename: String,
        status: { type: String, enum: ['added', 'modified', 'removed'] },
        additions: Number,
        deletions: Number,
        changes: Number,
        patch: String,
      },
    ],
    diff: { type: String, required: true },
    commits: [
      {
        sha: String,
        message: String,
        author: {
          login: String,
          avatarUrl: String,
        },
        date: Date,
      },
    ],
    comments: [
      {
        id: Number,
        body: String,
        author: { login: String },
        path: String,
        line: Number,
        createdAt: Date,
      },
    ],
    fetchedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

PullRequestSchema.index({ owner: 1, repo: 1, pullNumber: 1 }, { unique: true });

export const PullRequest = mongoose.model<IPullRequest>('PullRequest', PullRequestSchema);
