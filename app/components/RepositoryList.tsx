'use client';

import { RepositoryMatch } from '../types';

interface RepositoryListProps {
  repositories: RepositoryMatch[];
  onSelectRepo: (repo: RepositoryMatch) => void;
}

export default function RepositoryList({ repositories, onSelectRepo }: RepositoryListProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Recommended Repositories</h2>

      <div className="space-y-4">
        {repositories.map((repo, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer"
            onClick={() => onSelectRepo(repo)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold text-blue-600">{repo.repo_name}</h3>
                <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
              </div>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {Math.round(repo.match_score * 100)}% Match
              </span>
            </div>

            <div className="flex gap-4 mb-3 text-sm text-gray-600">
              <span>⭐ {repo.stars.toLocaleString()}</span>
              <span>💻 {repo.language}</span>
              <span>📊 {repo.difficulty_level}</span>
              <span>🎯 {repo.good_first_issues_count} good first issues</span>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Community Friendliness:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${repo.community_friendliness_score * 100}%` }}
                  />
                </div>
                <span>{Math.round(repo.community_friendliness_score * 100)}%</span>
              </div>
            </div>

            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              <strong>Why this repo:</strong> {repo.match_reasoning}
            </p>

            <div className="mt-4 flex gap-2">
              <a
                href={repo.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                View on GitHub →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
