'use client';

import { MentoringPlan } from '../types';

interface MentoringPlanViewProps {
  plan: MentoringPlan;
}

export default function MentoringPlanView({ plan }: MentoringPlanViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">Your Mentoring Plan</h2>
      <p className="text-gray-600 mb-6">
        Issue #{plan.issue_number} in {plan.repo_name}
      </p>

      <div className="space-y-6">
        {/* Suggested Approach */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <h3 className="font-semibold text-lg mb-2">Suggested Approach</h3>
          <p className="text-gray-700">{plan.suggested_approach}</p>
        </div>

        {/* Step by Step Plan */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Step-by-Step Plan</h3>
          <ol className="space-y-3">
            {plan.step_by_step_plan.map((step, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  {idx + 1}
                </span>
                <span className="flex-1 pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Key Files */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Key Files to Examine</h3>
          <ul className="space-y-2">
            {plan.key_files_to_examine.map((file, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-blue-600">📄</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">{file}</code>
              </li>
            ))}
          </ul>
        </div>

        {/* Git Commands */}
        <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Git Commands</h3>
          <div className="space-y-2 font-mono text-sm">
            {plan.git_commands.map((cmd, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-green-400">$</span>
                <code>{cmd}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Testing Strategy */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <h3 className="font-semibold text-lg mb-2">Testing Strategy</h3>
          <p className="text-gray-700">{plan.testing_strategy}</p>
        </div>

        {/* Potential Challenges */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <h3 className="font-semibold text-lg mb-2">Potential Challenges</h3>
          <ul className="space-y-2">
            {plan.potential_challenges.map((challenge, idx) => (
              <li key={idx} className="flex gap-2">
                <span>⚠️</span>
                <span className="text-gray-700">{challenge}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-100 border border-blue-300 p-4 rounded text-center">
          <p className="text-blue-900 font-medium">
            Ready to contribute? Good luck! 🚀
          </p>
          <p className="text-blue-700 text-sm mt-2">
            Remember: The open source community is here to help. Don't hesitate to ask questions!
          </p>
        </div>
      </div>
    </div>
  );
}
