import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { executeRagQuery } from '../services/rag';
import { SupabaseVectorAdapter } from '../services/supabase-vector-adapter';

interface RagEvalCase {
  id?: string;
  query: string;
  expectedKeywords: string[];
  minimumKeywordCoverage: number;
  minimumSources: number;
}

interface RagEvalDataset {
  description?: string;
  overallMinimumPassRate?: number;
  cases: RagEvalCase[];
}

interface CaseResult {
  id: string;
  query: string;
  matchedKeywords: string[];
  keywordCoverage: number;
  sourcesCount: number;
  minimumKeywordCoverage: number;
  minimumSources: number;
  passed: boolean;
}

const LIVE_LANE_LABEL = 'live-non-blocking';

const DEFAULT_DATASET_PATH = 'eval/fixtures/rag-eval.sample.json';

function parseDatasetArg(): string | undefined {
  const args = process.argv.slice(2);
  const datasetFlag = args.find((arg) => arg.startsWith('--dataset='));

  if (datasetFlag) {
    return datasetFlag.slice('--dataset='.length).trim();
  }

  return args[0]?.trim();
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(normalizedAnswer: string, keyword: string): boolean {
  const normalized = normalizeText(keyword);
  const pattern = new RegExp(`\\b${escapeRegex(normalized)}\\b`);
  return pattern.test(normalizedAnswer);
}

function getCaseId(testCase: RagEvalCase, index: number): string {
  return testCase.id?.trim() || `case-${index + 1}`;
}

function asPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function validateDataset(dataset: RagEvalDataset): void {
  if (!Array.isArray(dataset.cases) || dataset.cases.length === 0) {
    throw new Error('Dataset must include a non-empty "cases" array.');
  }

  dataset.cases.forEach((testCase, index) => {
    if (!testCase.query || typeof testCase.query !== 'string') {
      throw new Error(`Case ${index + 1} is missing a valid "query".`);
    }
    if (!Array.isArray(testCase.expectedKeywords) || testCase.expectedKeywords.length === 0) {
      throw new Error(`Case ${index + 1} must include at least one "expectedKeywords" value.`);
    }
    testCase.expectedKeywords.forEach((keyword, kwIndex) => {
      if (typeof keyword !== 'string' || keyword.trim() === '') {
        throw new Error(
          `Case ${index + 1} expectedKeywords[${kwIndex}] must be a non-empty string.`
        );
      }
    });
    if (
      !Number.isFinite(testCase.minimumKeywordCoverage) ||
      testCase.minimumKeywordCoverage < 0 ||
      testCase.minimumKeywordCoverage > 1
    ) {
      throw new Error(
        `Case ${index + 1} "minimumKeywordCoverage" must be a number between 0 and 1.`
      );
    }
    if (!Number.isInteger(testCase.minimumSources) || testCase.minimumSources < 0) {
      throw new Error(`Case ${index + 1} "minimumSources" must be a non-negative integer.`);
    }
  });
}

async function loadDataset(datasetPath: string): Promise<RagEvalDataset> {
  const absolutePath = resolve(datasetPath);
  const raw = await readFile(absolutePath, { encoding: 'utf8' });
  const dataset = JSON.parse(raw) as RagEvalDataset;
  validateDataset(dataset);
  return dataset;
}

async function run(): Promise<void> {
  const datasetPath = parseDatasetArg() || process.env.RAG_EVAL_DATASET || DEFAULT_DATASET_PATH;
  const dataset = await loadDataset(datasetPath);
  const overallMinimumPassRate = process.env.RAG_EVAL_MIN_PASS_RATE
    ? Number(process.env.RAG_EVAL_MIN_PASS_RATE)
    : dataset.overallMinimumPassRate ?? 1;

  if (!Number.isFinite(overallMinimumPassRate) || overallMinimumPassRate < 0 || overallMinimumPassRate > 1) {
    throw new Error('overall minimum pass rate must be a number between 0 and 1.');
  }

  const vectorStore = new SupabaseVectorAdapter();
  const results: CaseResult[] = [];

  for (let index = 0; index < dataset.cases.length; index += 1) {
    const testCase = dataset.cases[index];
    const response = await executeRagQuery(vectorStore, testCase.query);
    const answerText = normalizeText(response.answer || '');

    const matchedKeywords = testCase.expectedKeywords.filter((keyword) =>
      matchesKeyword(answerText, keyword)
    );

    const keywordCoverage = matchedKeywords.length / testCase.expectedKeywords.length;
    const sourcesCount = response.sources.length;
    const passed = keywordCoverage >= testCase.minimumKeywordCoverage && sourcesCount >= testCase.minimumSources;

    results.push({
      id: getCaseId(testCase, index),
      query: testCase.query,
      matchedKeywords,
      keywordCoverage,
      sourcesCount,
      minimumKeywordCoverage: testCase.minimumKeywordCoverage,
      minimumSources: testCase.minimumSources,
      passed,
    });
  }

  const totalCases = results.length;
  const passedCases = results.filter((result) => result.passed).length;
  const passRate = passedCases / totalCases;
  const retrievalHitRate = results.filter((result) => result.sourcesCount > 0).length / totalCases;
  const avgKeywordCoverage = results.reduce((sum, result) => sum + result.keywordCoverage, 0) / totalCases;

  console.log('=== RAG Evaluation (metrics-based) ===');
  console.log(`Lane: ${LIVE_LANE_LABEL}`);
  console.log(`Dataset: ${resolve(datasetPath)}`);
  if (dataset.description) {
    console.log(`Description: ${dataset.description}`);
  }
  console.log('');

  results.forEach((result, index) => {
    console.log(`Case ${index + 1} - ${result.id} => ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  Query: ${result.query}`);
    console.log(
      `  Keyword coverage: ${asPercentage(result.keywordCoverage)} (threshold ${asPercentage(result.minimumKeywordCoverage)})`
    );
    console.log(`  Matched keywords: ${result.matchedKeywords.length > 0 ? result.matchedKeywords.join(', ') : 'none'}`);
    console.log(`  Sources: ${result.sourcesCount} (threshold ${result.minimumSources})`);
  });

  console.log('');
  console.log('--- Summary ---');
  console.log(`Total cases: ${totalCases}`);
  console.log(`Passed: ${passedCases}`);
  console.log(`Pass rate: ${asPercentage(passRate)} (minimum ${asPercentage(overallMinimumPassRate)})`);
  console.log(`Retrieval hit rate: ${asPercentage(retrievalHitRate)}`);
  console.log(`Average keyword coverage: ${asPercentage(avgKeywordCoverage)}`);
  console.log(`Reliability signal mode: ${LIVE_LANE_LABEL} (operational, non-blocking)`);

  if (passRate < overallMinimumPassRate) {
    console.error('Result: FAILED overall threshold.');
    process.exitCode = 1;
    return;
  }

  console.log('Result: PASSED overall threshold.');
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`RAG evaluation failed: ${message}`);
  process.exitCode = 1;
});
