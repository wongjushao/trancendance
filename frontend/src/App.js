import { useEffect, useState } from 'react';
import './App.css';

const tests = [
  { name: 'Auth health', method: 'GET', url: '/api/auth/health', group: 'core' },
  { name: 'Chat health', method: 'GET', url: '/api/chat/health', group: 'core' },
  { name: 'Org health', method: 'GET', url: '/api/org/health', group: 'core' },
  { name: 'Chat list messages', method: 'GET', url: '/api/chat/messages', group: 'dependency' },
  { name: 'Org list orgs', method: 'GET', url: '/api/org/orgs', group: 'dependency' },
];

function formatBody(body) {
  if (typeof body === 'string') {
    return body;
  }
  return JSON.stringify(body, null, 2);
}

async function runSingleTest(test) {
  try {
    const response = await fetch(test.url, { method: test.method });
    let body;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
    const dependencyNotConfigured =
      test.group === 'dependency' &&
      response.status === 503 &&
      bodyText.toLowerCase().includes('not configured');

    return {
      ...test,
      ok: response.ok,
      status: response.status,
      body,
      outcome: dependencyNotConfigured ? 'skip' : response.ok ? 'pass' : 'fail',
    };
  } catch (error) {
    return {
      ...test,
      ok: false,
      status: 0,
      body: String(error),
      outcome: 'fail',
    };
  }
}

export default function App() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const runTests = async () => {
    setRunning(true);
    const collectedResults = [];

    for (const test of tests) {
      const result = await runSingleTest(test);
      collectedResults.push(result);
      setResults([...collectedResults]);
    }

    setRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const coreResults = results.filter((item) => item.group === 'core');
  const dependencyResults = results.filter((item) => item.group === 'dependency');
  const corePassed = coreResults.filter((item) => item.outcome === 'pass').length;
  const dependencyPassed = dependencyResults.filter((item) => item.outcome === 'pass').length;
  const dependencySkipped = dependencyResults.filter((item) => item.outcome === 'skip').length;

  return (
    <main className="container">
      <h1>Backend Service Test Dashboard</h1>
      <p>Tests isolated services through REST endpoints behind nginx proxy.</p>

      <button type="button" onClick={runTests} disabled={running}>
        {running ? 'Running tests...' : 'Run Tests'}
      </button>

      <section className="summary">
        <h3>
          Core service health: {corePassed}/{coreResults.length || 0} passed
        </h3>
        <h3>
          External dependency checks: {dependencyPassed} passed, {dependencySkipped} skipped,{' '}
          {dependencyResults.length - dependencyPassed - dependencySkipped} failed
        </h3>
      </section>

      <section>
        {results.map((result) => {
          const statusClass =
            result.outcome === 'pass'
              ? 'ok'
              : result.outcome === 'skip'
              ? 'skip'
              : 'fail';
          const statusLabel =
            result.outcome === 'pass'
              ? 'PASS'
              : result.outcome === 'skip'
              ? 'SKIP'
              : 'FAIL';

          return (
            <article key={result.name} className="row">
              <div>
                <strong>{result.name}</strong> <small>({result.group})</small>
              </div>
              <div>
                Endpoint: {result.method} {result.url}
              </div>
              <div className={statusClass}>
                {statusLabel} (HTTP {result.status})
              </div>
              <pre>{formatBody(result.body)}</pre>
            </article>
          );
        })}
      </section>
    </main>
  );
}
