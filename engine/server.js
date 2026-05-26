const http = require('http');
const fs = require('fs');
const path = require('path');

const ENGINE_DIR = __dirname;
const WORKFLOWS_DIR = path.join(ENGINE_DIR, 'workflows');
const PORT = process.env.PORT || 3002;

const nodes = {};
fs.readdirSync(path.join(ENGINE_DIR, 'nodes')).filter(f => f.endsWith('.js')).forEach(f => {
  const name = f.replace('-node.js', '').replace('.js', '');
  nodes[name] = require(path.join(ENGINE_DIR, 'nodes', f));
});

function loadWorkflows() {
  const list = [];
  if (!fs.existsSync(WORKFLOWS_DIR)) return list;
  fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json')).forEach(f => {
    try {
      const wf = JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8'));
      list.push({ id: f.replace('.json', ''), ...wf });
    } catch (e) {
      console.error(`[ENGINE] Workflow parse error: ${f}`, e.message);
    }
  });
  return list;
}

async function executeWorkflow(workflow, payload) {
  console.log(`[ENGINE] Executing: ${workflow.name}`);
  const ctx = { payload, $: {} };
  const nodeMap = {};
  workflow.nodes.forEach(n => nodeMap[n.id] = n);

  let currentId = workflow.trigger;
  let maxSteps = 50;

  while (currentId && maxSteps-- > 0) {
    const node = nodeMap[currentId];
    if (!node) { console.error(`[ENGINE] Node ${currentId} not found`); break; }

    const handler = nodes[node.type];
    if (!handler) { console.error(`[ENGINE] Unknown node type: ${node.type}`); break; }

    try {
      const result = await handler.run(node.config, ctx);
      ctx.$[node.id] = result;
      currentId = result.next || node.next;
    } catch (err) {
      console.error(`[ENGINE] Node ${node.id} (${node.type}) error:`, err.message);
      currentId = node.errorNext || null;
    }
  }
  return ctx;
}

process.on('unhandledRejection', (err) => {
  console.error('[ENGINE] Unhandled rejection:', err.message);
});

const server = http.createServer(async (req, res) => {
  res.setTimeout(60000);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET / -> status
  if (req.method === 'GET' && url.pathname === '/') {
    const workflows = loadWorkflows();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      engine: 'Kivon Workflow Engine',
      version: '1.0.0',
      workflows: workflows.map(w => ({ id: w.id, name: w.name, nodes: w.nodes.length })),
      endpoints: {
        trigger: 'POST /trigger/:workflowId',
        status: 'GET /status/:workflowId'
      }
    }));
    return;
  }

  // POST /trigger/:workflowId
  const triggerMatch = url.pathname.match(/^\/trigger\/([\w-]+)$/);
  if (req.method === 'POST' && triggerMatch) {
    const workflowId = triggerMatch[1];
    const workflows = loadWorkflows();
    const wf = workflows.find(w => w.id === workflowId);
    if (!wf) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Workflow not found' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const ctx = await executeWorkflow(wf, payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, workflow: wf.name, result: ctx.$ }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /workflows -> list
  if (req.method === 'GET' && url.pathname === '/workflows') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadWorkflows().map(w => ({ id: w.id, name: w.name, nodes: w.nodes.length }))));
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => {
  const wfCount = loadWorkflows().length;
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   KIVON Workflow Engine — Port ' + PORT + '        ║');
  console.log(`║   ${wfCount} workflow(s) loaded                  ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('POST /trigger/:workflowId  -> trigger workflow');
  console.log('GET  /workflows           -> list workflows');
});
