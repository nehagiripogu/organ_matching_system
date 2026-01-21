const http = require('http');
const fs = require('fs');

let donors = [];
let recipients = [];

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // CORS headers so GitHub Pages can call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve HTML page (only used when running locally)
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile('index.html', (err, data) => {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(err ? 'Create index.html first!' : data);
    });
    return;
  }

  // Get all donors
  if (req.url === '/api/donors' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(donors));
    return;
  }

  // Add donor
  if (req.url === '/api/donors' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const donor = JSON.parse(body);
        donor.id = donors.length + 1;
        donors.push(donor);
        res.writeHead(201, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(donor));
      } catch(e) {
        res.writeHead(400);
        res.end('Invalid data');
      }
    });
    return;
  }

  // Get all recipients
  if (req.url === '/api/recipients' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(recipients));
    return;
  }

  // Add recipient
  if (req.url === '/api/recipients' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const recipient = JSON.parse(body);
        recipient.id = recipients.length + 1;
        recipients.push(recipient);
        res.writeHead(201, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(recipient));
      } catch(e) {
        res.writeHead(400);
        res.end('Invalid data');
      }
    });
    return;
  }

  // Smart matching
  // Smart matching - with detailed scoring
if (req.url === '/api/match' && req.method === 'POST') {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { donor_id } = JSON.parse(body);
      const donor = donors.find(d => d.id == donor_id);

      if (!donor) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Donor not found' }));
        return;
      }

      const matches = recipients
        .map(r => {
          let score = 0;
          let reason = [];

          // 1. Blood group compatibility (up to 50)
          const bloodScore = getBloodCompatibility(donor.blood_group, r.blood_group);
          score += bloodScore;
          if (bloodScore > 0) reason.push('Blood compatible');

          // 2. Organ match (30)
          if (donor.organ_type.toLowerCase() === r.organ_type.toLowerCase()) {
            score += 30;
            reason.push('Organ match');
          }

          // 3. Urgency (up to 20)
          score += r.urgency * 4;
          reason.push(`Urgency ${r.urgency}`);

          // 4. Same city (15)
          if (donor.city.toLowerCase() === r.city.toLowerCase()) {
            score += 15;
            reason.push('Same city');
          }

          // 5. Same hospital (10)
          if (donor.hospital.toLowerCase() === r.hospital.toLowerCase()) {
            score += 10;
            reason.push('Same hospital');
          }

          return { ...r, score: Math.round(score), reason: reason.join(' | ') };
        })
        .filter(m => m.score >= 40) // hide totally bad matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(matches));
    } catch (e) {
      res.writeHead(400);
      res.end('Match error');
    }
  });
  return;
}

// Blood compatibility helper
function getBloodCompatibility(donorBlood, recipientBlood) {
  const map = {
    'O-':  { compatible: ['O-'],                                           score: 50 },
    'O+':  { compatible: ['O-', 'O+'],                                     score: 45 },
    'A-':  { compatible: ['O-', 'A-'],                                     score: 45 },
    'A+':  { compatible: ['O-', 'O+', 'A-', 'A+'],                         score: 40 },
    'B-':  { compatible: ['O-', 'B-'],                                     score: 45 },
    'B+':  { compatible: ['O-', 'O+', 'B-', 'B+'],                         score: 40 },
    'AB-': { compatible: ['O-', 'A-', 'B-', 'AB-'],                        score: 35 },
    'AB+': { compatible: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], score: 30 }
  };

  const d = map[donorBlood.toUpperCase().trim()];
  if (!d) return 0;

  const r = recipientBlood.toUpperCase().trim();
  return d.compatible.includes(r) ? d.score : 0;
}
  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT} - Organ System Ready!`);
});