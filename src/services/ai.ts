import type { AIRequest, AIAssistResponse } from '../types/taxonomy';

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL ?? null;

const MOCK_RESPONSES: Record<AIRequest['action'], AIAssistResponse> = {
  suggest_children: {
    suggestions: [
      { label: 'Primary sources', type: 'concept', rationale: 'Foundational sub-concept for most topic areas' },
      { label: 'Common misconceptions', type: 'concept', rationale: 'Helps instructors anticipate learner errors' },
      { label: 'Assessment criteria', type: 'skill', rationale: 'Operationalizes the parent concept for evaluation' },
    ],
  },
  suggest_grouping: {
    suggestions: [
      { label: 'Foundational Methods', type: 'topic', rationale: 'These siblings share a methodological character that distinguishes them from applied skills' },
    ],
  },
  suggest_siblings: {
    suggestions: [
      { label: 'Error analysis', type: 'skill', rationale: 'Completes the analytical skill set alongside existing siblings' },
      { label: 'Peer review', type: 'skill', rationale: 'Common sibling skill in evidence-based learning domains' },
    ],
  },
};

export async function getAISuggestions(req: AIRequest): Promise<AIAssistResponse> {
  if (!AI_BASE_URL) {
    // Stub path: simulate latency
    await new Promise(r => setTimeout(r, 800));
    return MOCK_RESPONSES[req.action];
  }
  const res = await fetch(`${AI_BASE_URL}/api/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return res.json() as Promise<AIAssistResponse>;
}
