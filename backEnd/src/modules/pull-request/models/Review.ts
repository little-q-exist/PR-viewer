import mongoose, { Document, Schema, Types } from 'mongoose';
import type { ReviewStatus, Summary, FileAnalysis, AiUsage } from '../../../shared/types';

export interface IReview extends Document {
  userId: Types.ObjectId;
  prId: Types.ObjectId;
  status: ReviewStatus;
  summary?: Summary;
  fileAnalyses: FileAnalysis[];
  aiUsage?: AiUsage;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prId: { type: Schema.Types.ObjectId, ref: 'PullRequest', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    summary: {
      riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
      score: { type: Number, min: 0, max: 100 },
      overview: String,
      recommendations: [
        {
          priority: { type: String, enum: ['high', 'medium', 'low'] },
          category: { type: String, enum: ['security', 'performance', 'style', 'logic', 'maintainability'] },
          title: String,
          description: String,
        },
      ],
    },
    fileAnalyses: [
      {
        filename: String,
        status: { type: String, enum: ['added', 'modified', 'removed'] },
        riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
        summary: String,
        suggestions: [
          {
            lineStart: Number,
            lineEnd: Number,
            category: { type: String, enum: ['security', 'performance', 'style', 'logic', 'maintainability'] },
            severity: { type: String, enum: ['critical', 'major', 'minor', 'nit'] },
            title: String,
            description: String,
            suggestionCode: String,
          },
        ],
      },
    ],
    aiUsage: {
      model: String,
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
      cost: Number,
    },
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

ReviewSchema.index({ userId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
