'use client';

import { useState } from 'react';
import { AppState, UserProfile, RepositoryMatch, Issue } from './types';
import { api } from './lib/api';
import OnboardingForm from './components/OnboardingForm';
import RepositoryList from './components/RepositoryList';
import IssueList from './components/IssueList';
import MentoringPlanView from './components/MentoringPlanView';

export default function Home() {
  const [state, setState] = useState<AppState>({
    currentStep: 'onboarding',
    userProfile: null,
    repositories: [],
    selectedRepo: null,
    contributionGuide: null,
    issues: [],
    selectedIssue: null,
    mentoringPlan: null,
    loading: false,
    error: null,
  });

  const handleProfileSubmit = async (profile: UserProfile) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Create profile
      const createdProfile = await api.createUserProfile(profile);

      // Scout for repositories
      const scoutResult = await api.scoutRepositories(createdProfile);

      setState(prev => ({
        ...prev,
        userProfile: createdProfile,
        repositories: scoutResult.repositories,
        currentStep: 'select-repo',
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to scout repositories',
      }));
    }
  };

  const handleRepoSelect = async (repo: RepositoryMatch) => {
    setState(prev => ({ ...prev, loading: true, error: null, selectedRepo: repo }));

    try {
      if (!state.userProfile) return;

      // Get preparation guide
      const guide = await api.getPreparationGuide(
        state.userProfile,
        repo.repo_name,
        repo.repo_url
      );

      // Get matching issues
      const issuesResult = await api.matchIssues(
        state.userProfile,
        repo.repo_name,
        repo.repo_url
      );

      setState(prev => ({
        ...prev,
        contributionGuide: guide,
        issues: issuesResult.issues,
        currentStep: 'select-issue',
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load repository data',
      }));
    }
  };

  const handleIssueSelect = async (issue: Issue) => {
    setState(prev => ({ ...prev, loading: true, error: null, selectedIssue: issue }));

    try {
      if (!state.userProfile || !state.selectedRepo) return;

      const plan = await api.getMentoringPlan(
        state.userProfile,
        state.selectedRepo.repo_name,
        state.selectedRepo.repo_url,
        issue.issue_number
      );

      setState(prev => ({
        ...prev,
        mentoringPlan: plan,
        currentStep: 'mentoring',
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create mentoring plan',
      }));
    }
  };

  const resetWorkflow = () => {
    setState({
      currentStep: 'onboarding',
      userProfile: null,
      repositories: [],
      selectedRepo: null,
      contributionGuide: null,
      issues: [],
      selectedIssue: null,
      mentoringPlan: null,
      loading: false,
      error: null,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">CodePathfinder</h1>
            <p className="text-sm text-gray-600">Your Personal Open Source Mentor</p>
          </div>
          {state.currentStep !== 'onboarding' && (
            <button
              onClick={resetWorkflow}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      {/* Progress Indicator */}
      {state.currentStep !== 'onboarding' && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className={`${state.currentStep === 'select-repo' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                1. Select Repository
              </div>
              <div className="flex-1 h-1 bg-gray-200 mx-4">
                <div className={`h-1 bg-blue-600 transition-all ${state.currentStep !== 'select-repo' ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`${state.currentStep === 'select-issue' ? 'text-blue-600 font-semibold' : state.currentStep === 'mentoring' ? 'text-gray-600' : 'text-gray-400'}`}>
                2. Choose Issue
              </div>
              <div className="flex-1 h-1 bg-gray-200 mx-4">
                <div className={`h-1 bg-blue-600 transition-all ${state.currentStep === 'mentoring' ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`${state.currentStep === 'mentoring' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                3. Get Mentoring
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="py-8">
        {state.loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Processing...</p>
          </div>
        )}

        {state.error && (
          <div className="max-w-4xl mx-auto mb-6 px-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              Error: {state.error}
            </div>
          </div>
        )}

        {!state.loading && (
          <>
            {state.currentStep === 'onboarding' && (
              <OnboardingForm onSubmit={handleProfileSubmit} />
            )}

            {state.currentStep === 'select-repo' && (
              <RepositoryList
                repositories={state.repositories}
                onSelectRepo={handleRepoSelect}
              />
            )}

            {state.currentStep === 'select-issue' && (
              <>
                {state.contributionGuide && (
                  <div className="max-w-4xl mx-auto px-6 mb-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="font-semibold text-lg mb-2">Getting Started with {state.selectedRepo?.repo_name}</h3>
                      <p className="text-sm text-gray-700 mb-3">{state.contributionGuide.setup_instructions}</p>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View full onboarding guide</summary>
                        <div className="mt-4 space-y-3">
                          <div>
                            <strong>Project Structure:</strong>
                            <p className="text-gray-700 mt-1">{state.contributionGuide.project_structure}</p>
                          </div>
                          <div>
                            <strong>Coding Conventions:</strong>
                            <p className="text-gray-700 mt-1">{state.contributionGuide.coding_conventions}</p>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                )}
                <IssueList issues={state.issues} onSelectIssue={handleIssueSelect} />
              </>
            )}

            {state.currentStep === 'mentoring' && state.mentoringPlan && (
              <MentoringPlanView plan={state.mentoringPlan} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>Powered by AI Agents with LangGraph, Gemini Sonnet 4.5, and Opik</p>
        </div>
      </footer>
    </div>
  );
}
