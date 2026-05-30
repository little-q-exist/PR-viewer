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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prId: { type: Schema.Types.ObjectId, ref: 'PullRequest', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    summary: {
      riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
      score: { type: Number, min: 0, max: 100, required: true },
      overview: { type: String, required: true },
      recommendations: [
        {
          priority: { type: String, enum: ['high', 'medium', 'low'] },
          category: { type: String, enum: ['security', 'performance', 'style', 'logic', 'maintainability'] },
          title: { type: String, required: true },
          description: { type: String, required: true },
        },
      ],
    },
    fileAnalyses: [
      {
        filename: { type: String, required: true },
        status: { type: String, enum: ['added', 'modified', 'removed'], required: true },
        riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
        summary: { type: String, required: true },
        suggestions: [
          {
            lineStart: Number,
            lineEnd: Number,
            category: { type: String, enum: ['security', 'performance', 'style', 'logic', 'maintainability'] },
            severity: { type: String, enum: ['critical', 'major', 'minor', 'nit'] },
            title: { type: String, required: true },
            description: { type: String, required: true },
            suggestionCode: String,
          },
        ],
      },
    ],
    aiUsage: {
      model: { type: String, required: true },
      promptTokens: { type: Number, required: true },
      completionTokens: { type: Number, required: true },
      totalTokens: { type: Number, required: true },
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
