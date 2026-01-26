'use client';

import { useState } from 'react';
import { UserProfile, SkillLevel } from '../types';

interface OnboardingFormProps {
  onSubmit: (profile: UserProfile) => void;
}

export default function OnboardingForm({ onSubmit }: OnboardingFormProps) {
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [languages, setLanguages] = useState<string>('');
  const [interests, setInterests] = useState<string>('');
  const [timeCommitment, setTimeCommitment] = useState('5-10 hours/week');
  const [githubUsername, setGithubUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const profile: UserProfile = {
      skill_level: skillLevel,
      programming_languages: languages.split(',').map(l => l.trim()).filter(Boolean),
      interests: interests.split(',').map(i => i.trim()).filter(Boolean),
      time_commitment: timeCommitment,
      github_username: githubUsername || undefined,
    };

    onSubmit(profile);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Welcome to CodePathfinder</h1>
      <p className="text-gray-600 mb-8">Your Personal Open Source Mentor</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Skill Level</label>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Programming Languages</label>
          <input
            type="text"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="e.g., Python, JavaScript, TypeScript"
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Interests</label>
          <input
            type="text"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g., web-dev, AI/ML, DevOps, CLI tools"
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Comma-separated</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Time Commitment</label>
          <select
            value={timeCommitment}
            onChange={(e) => setTimeCommitment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1-5 hours/week">1-5 hours/week</option>
            <option value="5-10 hours/week">5-10 hours/week</option>
            <option value="10-20 hours/week">10-20 hours/week</option>
            <option value="20+ hours/week">20+ hours/week</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">GitHub Username (Optional)</label>
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="your-username"
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Find My Perfect Project
        </button>
      </form>
    </div>
  );
}
