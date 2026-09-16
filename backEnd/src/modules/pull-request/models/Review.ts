import mongoose, { Document, Schema, Types } from 'mongoose';
import type {
  AiUsage,
  Finding,
  ReviewEngine,
  ReviewGroup,
  ReviewLlm,
  ReviewStatus,
  RunSummary,
  ToolCallsSummary,
} from '../../../shared/types';

export interface IReview extends Document {
  userId: Types.ObjectId;
  prId: Types.ObjectId;
  engine: ReviewEngine;
  engineVersion: string;
  status: ReviewStatus;
  engineStatus?: string;
  llm?: ReviewLlm;
  message?: string;
  runSummary: RunSummary;
  toolCalls?: ToolCallsSummary;
  findings: Finding[];
  groups: ReviewGroup[];
  sessionId?: string;
  warnings: string[];
  aiUsage?: AiUsage;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emptyRunSummary = (): RunSummary => ({
  filesReviewed: 0,
  comments: 0,
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  elapsed: '',
});

const RunSummarySchema = new Schema<RunSummary>(
  {
    filesReviewed: { type: Number, min: 0, default: 0 },
    comments: { type: Number, min: 0, default: 0 },
    totalTokens: { type: Number, min: 0, default: 0 },
    inputTokens: { type: Number, min: 0, default: 0 },
    outputTokens: { type: Number, min: 0, default: 0 },
    cacheReadTokens: { type: Number, min: 0, default: 0 },
    elapsed: { type: String, default: '' },
  },
  { _id: false },
);

const FindingSchema = new Schema<Finding>(
  {
    path: { type: String, required: true, minlength: 1 },
    content: { type: String, required: true, minlength: 1 },
    existingCode: String,
    suggestionCode: String,
    startLine: { type: Number, required: true, min: 1 },
    endLine: {
      type: Number,
      required: true,
      min: 1,
    },
    category: {
      type: String,
      enum: ['security', 'performance', 'style', 'logic', 'maintainability'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor', 'nit'],
      required: true,
    },
    rawCategory: String,
    rawSeverity: String,
  },
  { _id: false },
);

const ReviewLlmSchema = new Schema<ReviewLlm>(
  {
    provider: { type: String, required: true },
    model: { type: String, required: true },
  },
  { _id: false },
);

const ToolCallsSchema = new Schema<ToolCallsSummary>(
  {
    total: { type: Number, min: 0, required: true },
    byTool: { type: Schema.Types.Mixed, default: {} },
    failure: { type: Number, min: 0, required: true },
    failureByTool: { type: Schema.Types.Mixed, default: {} },
    failureDetails: { type: [String], default: [] },
  },
  { _id: false },
);

const ReviewGroupSchema = new Schema<ReviewGroup>(
  {
    label: { type: String, required: true },
    files: { type: [String], default: [] },
  },
  { _id: false },
);

const AiUsageSchema = new Schema<AiUsage>(
  {
    model: { type: String, required: true },
    promptTokens: { type: Number, min: 0, required: true },
    completionTokens: { type: Number, min: 0, required: true },
    totalTokens: { type: Number, min: 0, required: true },
    cost: Number,
  },
  { _id: false },
);

const ReviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prId: { type: Schema.Types.ObjectId, ref: 'PullRequest', required: true, index: true },
    engine: { type: String, enum: ['ocr', 'legacy'], required: true },
    engineVersion: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    engineStatus: String,
    llm: { type: ReviewLlmSchema, required: false },
    message: String,
    runSummary: { type: RunSummarySchema, default: emptyRunSummary },
    toolCalls: { type: ToolCallsSchema, required: false },
    findings: { type: [FindingSchema], default: [] },
    groups: { type: [ReviewGroupSchema], default: [] },
    sessionId: { type: String, index: { sparse: true } },
    warnings: { type: [String], default: [] },
    aiUsage: { type: AiUsageSchema, required: false },
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ prId: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
