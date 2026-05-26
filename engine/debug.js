const path = require('path');
const fs = require('fs');

// Load nodes
const nodes = {};
fs.readdirSync(path.join(__dirname, 'nodes')).filter(f => f.endsWith('.js')).forEach(f => {
  nodes[f.replace('-node.js', '').replace('.js', '')] = require(path.join(__dirname, 'nodes', f));
});

// Load workflow
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'workflows', 'whatsapp-ai.json'), 'utf8'));
console.log('Workflow:', wf.name);
console.log('Nodes:', wf.nodes.length);

// Execute
async function executeWorkflow(workflow, payload) {
  const ctx = { payload, $: {} };
  const nodeMap = {};
  workflow.nodes.forEach(n => nodeMap[n.id] = n);

  let currentId = workflow.trigger;
  let maxSteps = 10;

  while (currentId && maxSteps-- > 0) {
    const node = nodeMap[currentId];
    if (!node) { console.log(`Node ${currentId} not found`); break; }

    const handler = nodes[node.type];
    if (!handler) { console.log(`Unknown type: ${node.type}`); break; }

    try {
      console.log(`\n[RUN] ${node.id} (${node.type})`);
      console.log('  config:', JSON.stringify(node.config).substring(0, 200));

      const result = await handler.run(node.config, ctx);

      console.log('  result keys:', Object.keys(result));
      if (result.text) console.log('  text:', result.text.substring(0, 100));
      if (result.body) console.log('  body:', JSON.stringify(result.body).substring(0, 100));

      ctx.$[node.id] = result;
      currentId = result.next || node.next;
      console.log(`  next: ${currentId || 'END'}`);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      currentId = node.errorNext || null;
    }
  }

  console.log('\n=== FINAL CTX.$ ===');
  Object.keys(ctx.$).forEach(k => {
    const v = ctx.$[k];
    console.log(`  ${k}:`, JSON.stringify(v).substring(0, 200));
  });

  return ctx;
}

executeWorkflow(wf, { body: { message: 'Merhaba, fiyat nedir?', name: 'Ahmet' } }).then(ctx => {
  console.log('\n=== DONE ===');
}).catch(e => console.log('FATAL:', e));
