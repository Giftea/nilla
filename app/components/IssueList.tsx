'use client';

import { Issue } from '../types';

interface IssueListProps {
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
}

export default function IssueList({ issues, onSelectIssue }: IssueListProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Recommended Issues</h2>

      <div className="space-y-4">
        {issues.map((issue, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer"
            onClick={() => onSelectIssue(issue)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">#{issue.issue_number}: {issue.title}</h3>
                <div className="flex gap-2 flex-wrap mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(issue.difficulty_rating)}`}>
                    {issue.difficulty_rating}
                  </span>
                  {issue.labels.slice(0, 3).map((label, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-3 line-clamp-3">{issue.description}</p>

            <div className="bg-blue-50 p-3 rounded mb-3">
              <p className="text-sm font-medium text-blue-900 mb-1">Complexity:</p>
              <p className="text-sm text-blue-800">{issue.estimated_complexity}</p>
            </div>

            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm font-medium text-green-900 mb-1">Suggested Approach:</p>
              <p className="text-sm text-green-800">{issue.approach_suggestions}</p>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">💬 {issue.comments_count} comments</span>
              <a
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                View Issue →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
