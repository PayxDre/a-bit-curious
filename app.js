// Date the hand-maintained figures in this course were last checked against sources.
// scripts/gen-seo-pages.py reads this for sitemap lastmod and for-bots metadata.
const DATA_VERIFIED = '2026-11-12';

// ═══════════════════════════════════════
//   APP STATE & CONSTANTS
// ═══════════════════════════════════════
const sectionOrder = ['welcome','money','inflation','faithcredit','year1971','deflation','fiatgraveyard','pizza','digimoney','satoshi','whitepaper','altcoins','powvpos','myths','tulips','quantum','caseagainst','goldvsbtc','adoption','wallets','exchanges','firstbitcoin','sending','security','scamdrill','network','node','mining','blockchain','blocks','difficulty','attackvectors','transactions','outputs','locks','keys','privatekeys','publickeys','signatures','signetlab','consensus','lightning','toolate','perspective','finalexam','lore','bibliography'];

const sectionNames = {
  welcome:'Welcome', fiatgraveyard:'The Fiat Graveyard', digimoney:'Digital Money Before Bitcoin', satoshi:'Who Is Satoshi?', inflation:'Monetary Inflation', faithcredit:'Full Faith & Credit', year1971:'1971: The Year Money Broke', altcoins:'Bitcoin vs Other Cryptos', powvpos:'Proof of Work vs Proof of Stake', deflation:'Deflation vs Fiat', adoption:'Bitcoin Adoption', wallets:'Wallets', exchanges:'Exchanges', sending:'Sending', security:'Security',
  money:'Nature of Money', pizza:'The Pizza Dilemma', myths:'6 Myths Debunked', quantum:'The Quantum Question', network:'Bitcoin Network', node:'Node', mining:'Mining',
  blockchain:'Blockchain', blocks:'Blocks', difficulty:'Difficulty', attackvectors:'Attack Vectors',
  transactions:'Transactions', outputs:'Outputs', locks:'Locks',
  keys:'Keys & Addresses', privatekeys:'Private Keys', publickeys:'Public Keys',
  signatures:'Digital Signatures', signetlab:'The Lab: Use Real Bitcoin', firstbitcoin:'Your First $10, Safely', scamdrill:'The Scam Drill', consensus:'Consensus & Upgrades', lightning:'Lightning Network', toolate:'Am I Too Late?', finalexam:'The Final Exam', perspective:'A \u20BFit New Perspective', lore:'Bitcoin Lore',
  whitepaper:'The Whitepaper',
  tulips:'Bitcoin vs Tulip Mania',
  caseagainst:'The Case Against Bitcoin',
  goldvsbtc:'Bitcoin vs Gold'
};

let currentSection = 'welcome';
let didYouKnowIndex = 0;
let isTransitioning = false; // block transition lock
let btcPrice = 0;
let btcChange = 0;
let goldPrice = 0;
let _scrollY = 0;

// ═══════════════════════════════════════
//   PERSISTENT PROGRESS (localStorage)
// ═══════════════════════════════════════
const PROGRESS_KEY = 'abc_progress_v1';
let abcVisited = new Set();
let abcCelebrated = false;
let abcLastSection = null;
try {
  const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
  if(saved){
    abcVisited = new Set(saved.visited || []);
    abcCelebrated = !!saved.celebrated;
    abcLastSection = saved.last || null;
  }
} catch(e){ /* private browsing or storage disabled - progress just won't persist */ }
let abcRoutingInitial = true;
function saveProgress(){
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({visited: Array.from(abcVisited), celebrated: abcCelebrated, last: abcLastSection}));
  } catch(e){}
}
function updateProgressUI(){
  const total = sectionOrder.length;
  const count = Math.min(abcVisited.size, total);
  const pct = (count/total)*100;
  const label = document.getElementById('progressLabel');
  const bar = document.getElementById('progressBar');
  if(label) label.textContent = count + '/' + total + ' explored';
  if(bar){
    bar.style.width = pct + '%';
    bar.parentElement.setAttribute('aria-valuenow', Math.round(pct));
  }
  sectionOrder.forEach(function(sec){
    const nav = document.getElementById('nav-' + sec);
    if(nav) nav.classList.toggle('visited', abcVisited.has(sec));
  });
}
function checkCompletion(){
  if(abcCelebrated || abcVisited.size < sectionOrder.length) return;
  abcCelebrated = true;
  saveProgress();
  showCompletionCard();
}
function showCompletionCard(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.style.zIndex = '10001';
  overlay.innerHTML = '<div class="modal-box" style="max-width:480px;text-align:center;">'
    + '<div style="font-size:56px;margin-bottom:8px;">🎓</div>'
    + '<div class="demo-title" style="font-size:26px;">Course Complete!</div>'
    + '<div style="font-size:14px;color:var(--text2);line-height:1.7;margin:12px 0 20px;">You explored all ' + sectionOrder.length + ' lessons of A ₿it Curious. You now understand money and Bitcoin better than most people on the planet.</div>'
    + '<div style="display:grid;gap:8px;">'
    + '<button id="abcShareBtn" class="demo-btn demo-btn-orange">Share Your Achievement</button>'
    + '<button id="abcCloseCardBtn" class="demo-btn demo-btn-ghost">Keep Exploring</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) for(let k=0;k<25;k++) setTimeout(function(){spawnCoin();},k*70);
  const shareText = 'I just completed A Bit Curious - the free interactive Bitcoin course. ' + sectionOrder.length + ' lessons, real cryptography demos, zero fluff.';
  const shareUrl = 'https://www.a-bit-curious.com';
  overlay.querySelector('#abcShareBtn').addEventListener('click', async function(){
    if(navigator.share){
      try { await navigator.share({title:'A Bit Curious', text:shareText, url:shareUrl}); } catch(e){}
    } else {
      try {
        await navigator.clipboard.writeText(shareText + ' ' + shareUrl);
        this.textContent = 'Copied to clipboard!';
      } catch(e){ this.textContent = shareText; }
    }
  });
  overlay.querySelector('#abcCloseCardBtn').addEventListener('click', function(){ overlay.remove(); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
}

// Timers (stored so they can be cleaned up)
const _timers = { ticker: null, stats: null, mining: null };

// ═══════════════════════════════════════
//   CANVAS BACKGROUND (with perf opts)
// ═══════════════════════════════════════
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let nodes = [], W, H, canvasAnimId = null;
let scrollY = 0, scrollVel = 0, lastScrollY = 0;

function resizeCanvas(){
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resizeCanvas();

function initNodes(){
  nodes = [];
  const count = Math.min(Math.floor(W * H / 18000), 120); // cap at 120 nodes
  for(let i = 0; i < count; i++){
    nodes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
      btc: Math.random() < 0.18,
      depth: Math.random() * 0.7 + 0.3 // 0.3-1.0, smaller = farther = less parallax
    });
  }
}
initNodes();

// Debounced resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resizeCanvas(); initNodes(); }, 200);
});

// Scroll tracking for motion cue parallax
lastScrollY = window.pageYOffset || 0;
window.addEventListener('scroll', () => {
  const sy = window.pageYOffset || 0;
  scrollVel = sy - lastScrollY;
  lastScrollY = sy;
}, {passive:true});

function drawCanvas(){
  if(document.hidden) { canvasAnimId = requestAnimationFrame(drawCanvas); return; }
  ctx.clearRect(0, 0, W, H);
  const maxDist = 140;
  const maxDistSq = maxDist * maxDist; // avoid sqrt in hot loop

  // Scroll parallax - dampen toward zero
  scrollVel *= 0.92;
  const clampedVel = Math.max(-30, Math.min(30, scrollVel));

  // Draw connections using parallax-adjusted positions
  for(let i = 0; i < nodes.length; i++){
    const ni = nodes[i];
    const piY = clampedVel * ni.depth * 0.6;
    const piX = clampedVel * ni.depth * 0.08 * Math.sin(ni.pulse * 0.5);
    for(let j = i+1; j < nodes.length; j++){
      const nj = nodes[j];
      const dx = ni.x - nj.x;
      const dy = ni.y - nj.y;
      const dSq = dx*dx + dy*dy;
      if(dSq < maxDistSq){
        const d = Math.sqrt(dSq);
        const alpha = (1 - d/maxDist) * 0.12;
        const pjY = clampedVel * nj.depth * 0.6;
        const pjX = clampedVel * nj.depth * 0.08 * Math.sin(nj.pulse * 0.5);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(245,158,11,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(ni.x + piX, ni.y + piY);
        ctx.lineTo(nj.x + pjX, nj.y + pjY);
        ctx.stroke();
      }
    }
  }

  // Draw nodes with scroll-reactive parallax
  for(const n of nodes){
    n.pulse += 0.025;
    const glow = Math.sin(n.pulse) * 0.25 + 0.55;

    // Motion cue: displace based on scroll velocity and depth
    const parallaxY = clampedVel * n.depth * 0.6;
    const parallaxX = clampedVel * n.depth * 0.08 * Math.sin(n.pulse * 0.5);
    const drawX = n.x + parallaxX;
    const drawY = n.y + parallaxY;

    if(n.btc){
      ctx.font = `${n.r * 9}px sans-serif`;
      ctx.fillStyle = `rgba(245,158,11,${glow * 0.55})`;
      ctx.fillText('\u20BF', drawX - n.r*3, drawY + n.r*2);
    } else {
      ctx.beginPath();
      ctx.arc(drawX, drawY, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${glow * 0.4})`;
      ctx.fill();
    }
    n.x += n.vx;
    n.y += n.vy;
    if(n.x < -20) n.x = W + 20;
    if(n.x > W + 20) n.x = -20;
    if(n.y < -20) n.y = H + 20;
    if(n.y > H + 20) n.y = -20;
  }
  canvasAnimId = requestAnimationFrame(drawCanvas);
}

// Only animate when visible
document.addEventListener('visibilitychange', () => {
  if(!document.hidden && !canvasAnimId) canvasAnimId = requestAnimationFrame(drawCanvas);
});

// Check prefers-reduced-motion
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  canvasAnimId = requestAnimationFrame(drawCanvas);
}

// ═══════════════════════════════════════
//   BTC PRICE TICKER (live from CoinGecko)
// ═══════════════════════════════════════
function updateMelt(){
  const v = parseFloat(document.getElementById('meltInput').value) || 0;
  const r = 0.08;
  // Purchasing power after n years of inflation r is v / (1+r)^n.
  // The loss approaches but can never exceed the face value.
  const lost5 = v - v / Math.pow(1+r, 5);
  const lost10 = v - v / Math.pow(1+r, 10);
  const lost20 = v - v / Math.pow(1+r, 20);
  const fmt = n => '$' + Math.round(n).toLocaleString();
  const el5 = document.getElementById('melt5');
  const el10 = document.getElementById('melt10');
  const el20 = document.getElementById('melt20');
  if(el5) el5.textContent = fmt(lost5);
  if(el10) el10.textContent = fmt(lost10);
  if(el20) el20.textContent = fmt(lost20);
}
updateMelt();

// 1971 section: median house priced in dollars vs gold
function setHouseMode(mode){
  const usd = mode === 'usd';
  const btnU = document.getElementById('houseModeUsd');
  const btnG = document.getElementById('houseModeGold');
  const on = 'font-family:\'Space Mono\',monospace;font-size:12px;padding:8px 18px;border-radius:8px;cursor:pointer;border:2px solid var(--orange);background:rgba(245,158,11,0.15);color:var(--orange);font-weight:700;';
  const off = 'font-family:\'Space Mono\',monospace;font-size:12px;padding:8px 18px;border-radius:8px;cursor:pointer;border:2px solid rgba(245,158,11,0.25);background:transparent;color:var(--muted);font-weight:700;';
  if(btnU) btnU.style.cssText = usd ? on : off;
  if(btnG) btnG.style.cssText = usd ? off : on;
  const then = document.getElementById('house1971');
  const now = document.getElementById('houseNow');
  const delta = document.getElementById('houseDelta');
  const cap = document.getElementById('houseCaption');
  if(!then || !now || !delta || !cap) return;
  if(usd){
    then.textContent = '$25,200';
    now.textContent = '$420,000';
    delta.textContent = '+1,567%';
    delta.style.color = '#f87171';
    cap.textContent = 'Measured in dollars, the house got 17x more expensive.';
  } else {
    then.textContent = '720 oz';
    now.textContent = '~127 oz';
    delta.textContent = '-82%';
    delta.style.color = '#4ade80';
    cap.textContent = 'Measured in gold (the money the dollar abandoned in 1971), the same house is 82% cheaper. The house didn\'t change. The dollar did.';
  }
}

function formatPrice(p){
  return '$' + p.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
function renderTicker(){
  document.getElementById('btcPrice').textContent = btcPrice > 0 ? formatPrice(btcPrice) : '...';
  const changeEl = document.getElementById('btcChange');
  changeEl.textContent = (btcChange >= 0 ? '+' : '') + btcChange.toFixed(2) + '%';
  changeEl.style.color = btcChange >= 0 ? '#4ade80' : '#f87171';
  // BTC priced in gold ounces
  const goldEl = document.getElementById('btcGold');
  if(btcPrice > 0 && goldPrice > 0){
    const ratio = (btcPrice / goldPrice).toFixed(1);
    goldEl.textContent = ratio + ' oz';
    const sectionEl = document.getElementById('goldSectionRatio');
    if(sectionEl) sectionEl.textContent = ratio + ' oz';
  }
}
async function fetchBtcPrice(){
  // Primary: mempool.space (already a hard dependency for chain stats).
  // CoinGecko adds the 24h change when reachable; CoinCap is the last resort.
  let got = false;
  try {
    const res = await fetch('https://mempool.space/api/v1/prices');
    const data = await res.json();
    if(data.USD){ btcPrice = data.USD; got = true; renderTicker(); }
  } catch(e){ console.warn('Mempool price failed:', e); }
  try {
    const res2 = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const data2 = await res2.json();
    if(data2.bitcoin && data2.bitcoin.usd){
      if(!got) btcPrice = data2.bitcoin.usd;
      btcChange = data2.bitcoin.usd_24h_change || 0;
      got = true; renderTicker();
    }
  } catch(e2){ console.warn('CoinGecko price failed:', e2); }
  if(got) return;
  try {
    const res3 = await fetch('https://api.coincap.io/v2/assets/bitcoin');
    const data3 = await res3.json();
    if(data3.data && data3.data.priceUsd){
      btcPrice = parseFloat(data3.data.priceUsd);
      btcChange = parseFloat(data3.data.changePercent24Hr) || 0;
      renderTicker();
    }
  } catch(e3){ console.warn('All BTC price sources failed:', e3); }
}
async function fetchGoldPrice(){
  // Use a static gold price estimate; CoinGecko gold data is unreliable on free tier
  // Gold price is only used for BTC/Gold chart ratio - a reasonable approximation suffices
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd');
    const data = await res.json();
    goldPrice = data['tether-gold'].usd;
    renderTicker();
  } catch(e) {
    goldPrice = goldPrice || 3100; // fallback estimate
    console.warn('Gold price fetch failed, using estimate:', e);
  }
}
renderTicker(); // Show "..." immediately instead of "$0"
fetchBtcPrice();
fetchGoldPrice();
_timers.ticker = setInterval(() => { fetchBtcPrice(); fetchGoldPrice(); }, 30000);

// ═══════════════════════════════════════
//   LIVE BITCOIN STATS (mempool.space API)
// ═══════════════════════════════════════
async function fetchLiveStats(){
  try {
    // Block height + halving countdown (halvings happen every 210,000 blocks)
    const tipRes = await fetch('https://mempool.space/api/blocks/tip/height');
    const tipHeight = Number(await tipRes.json());
    document.getElementById('blockHeight').textContent = tipHeight.toLocaleString();
    const nextHalvingBlock = Math.ceil(tipHeight / 210000) * 210000;
    const blocksLeft = nextHalvingBlock - tipHeight;
    const daysLeft = Math.round(blocksLeft * 10 / 1440); // ~10 min per block
    const hc = document.getElementById('halvingCountdown');
    if(hc) hc.textContent = daysLeft > 365
      ? '~' + (daysLeft/365).toFixed(1) + ' years'
      : '~' + daysLeft.toLocaleString() + ' days';

    // Mempool size
    const mempoolRes = await fetch('https://mempool.space/api/mempool');
    const mempoolData = await mempoolRes.json();
    document.getElementById('mempoolTx').textContent = Number(mempoolData.count).toLocaleString();

    // Recommended fees
    const feeRes = await fetch('https://mempool.space/api/v1/fees/recommended');
    const feeData = await feeRes.json();
    const fr = document.getElementById('feeRate');
    if(fr && feeData.fastestFee) fr.textContent = feeData.fastestFee + ' sat/vB';

    // Hash rate (from mining stats)
    const hashRes = await fetch('https://mempool.space/api/v1/mining/hashrate/3d');
    const hashData = await hashRes.json();
    if(hashData.currentHashrate){
      const ehps = hashData.currentHashrate / 1e18;
      document.getElementById('hashRate').textContent = ehps.toFixed(1) + ' EH/s';
    }
  } catch(e) {
    console.warn('Live stats fetch failed:', e);
  }
}
fetchLiveStats();
_timers.stats = setInterval(fetchLiveStats, 60000);

// ═══════════════════════════════════════
//   TEACHING NOTES & DID YOU KNOW
// ═══════════════════════════════════════
const teachingNotes = {
  welcome: `\uD83C\uDF1F Welcome to A \u20BFit Curious! This landing page is designed to hook complete beginners by asking the questions they've never been taught to ask.\n\n\uD83D\uDCA1 The three question cards work as emotional entry points: what is money, what went wrong, and what comes next. Let students sit with each before moving on.\n\n\uD83C\uDFAF Goal: create genuine curiosity, not fear. By the time they click the button, they should be thinking "I never realized I didn't understand money."`,
  money: `\ud83c\udf93 This is the foundational section of the entire course. Do not rush it.\n\n\ud83d\udca1 The Cantillon Effect is the key insight most students have never encountered.\n\n\ud83d\udd25 Robert Breedlove: "Bitcoin is the separation of money and state."`,
  fiatgraveyard: `\uD83C\uDF93 This section is a gut-punch. Walk students through each collapsed currency slowly \u2014 let the pattern sink in. China tried it first in 1024. Same result every time for a thousand years.\n\n\uD83D\uDCA1 The USD timeline visual is the key moment. Students see where the dollar sits on the same trajectory as every dead currency. The "if, not when" framing is powerful.\n\n\uD83D\uDD25 The apocalypse simulator in the interactive lesson makes the abstract terrifyingly concrete. What would the government actually DO? The answer: exactly what every other government has done.`,
  digimoney: `\uD83C\uDF93 This section connects the "money is broken" realization to Bitcoin's specific origin story. Students need to see that Bitcoin didn't appear from nowhere \u2014 it was the culmination of 30 years of failed attempts.\n\n\uD83D\uDCA1 The timeline in the interactive lesson is the star here. Each failed project teaches a specific lesson. The moment students see the pattern (centralized = killable), Bitcoin's design choices click.\n\n\uD83D\uDD25 Hal Finney receiving the first Bitcoin transaction from Satoshi is a great human moment. He had already built RPOW \u2014 he recognized immediately what Bitcoin was.`,
  satoshi: `\uD83C\uDF93 The key insight is not "who is Satoshi" but "why doesn't it matter." Walk students through the profile first (cryptography + economics + privacy + game theory), then land on the punchline: even if Satoshi came back, they couldn't change anything.\n\n\uD83D\uDCA1 The Usual Suspects grid sparks curiosity but keep the tone neutral. Craig Wright's court ruling is the only definitive fact. Everyone else's denial should be respected.\n\n\uD83D\uDD25 The "disappearance was the final gift" framing is the emotional peak. Compare to Vitalik/Zuckerberg/etc \u2014 every other system has a leader who can be pressured.`,
  altcoins: `\uD83C\uDF93 This section protects beginners from losing money. The altcoin comparison should be factual and structural, not tribal or emotional.\n\n\uD83D\uDCA1 The key framework: decentralization is binary, not a spectrum. Either no one can change the rules or someone can. Bitcoin passes this test. Nothing else does.\n\n\uD83C\uDFAF The interactive comparison table is powerful \u2014 let students click through each crypto and see the founder stake, supply changes, and outage history. The data speaks for itself.`,
  inflation: `\uD83C\uDF93 This section bridges the gap between "money is broken" (Nature of Money) and "here's the alternative" (Bitcoin). Students need to understand that the inflation numbers they see on the news are actively manipulated.\n\n\uD83D\uDCA1 The ShadowStats comparison is powerful \u2014 show the divergence between official CPI and the 1980 methodology. The gap is not subtle.\n\n\uD83C\uDFAF Key insight: if real inflation is 8\u201312%, holding cash loses half its value in 6\u20139 years, not 24\u201336 years.`,
  deflation: `\uD83C\uDF93 Jeff Booth's thesis is the intellectual capstone of Chapter I. Technology = deflation. Fiat = inflation. The two are at war. Bitcoin lets deflation win.\n\n\uD83D\uDCA1 The key equation to drive home: 5% tech deflation + 7% money printing = "2% reported CPI." That single formula makes students see through the illusion.\n\n\uD83C\uDFAF After this section, students should feel genuine urgency to learn how Bitcoin works in practice.`,
  pizza: `\uD83C\uDF93 The pizza analogy is the single best response to "there aren't enough Bitcoin." It reframes the entire debate: the issue isn't quantity, it's dilution.\n\n\uD83D\uDCA1 The key line: "You can cut a pizza smaller, but you can't make more pizza." Let that land. Then show the numbers: 2.1 quadrillion sats. 262,000 per person.\n\n\uD83C\uDFAF Drive home that deflation under a gold standard powered the industrial revolution. "We need inflation" is propaganda, not economics.`,
  adoption: `\uD83C\uDF93 This section is the perfect response to "but nobody uses Bitcoin." Walk through each example slowly \u2014 the breadth of adoption shocks most beginners.\n\n\uD83D\uDCA1 Key insight: adoption is happening simultaneously at every level \u2014 individual (Cash App, Strike), merchant (Square), corporate treasury (Strategy), institutional (BlackRock IBIT), and sovereign (El Salvador). No technology in history has been adopted across all these layers this fast.\n\n\uD83C\uDFAF The "never sell" strategy via borrowing against BTC is a powerful reframe. It shifts the conversation from "when do I take profits?" to "why would I ever sell the hardest asset?"`,
  firstbitcoin: `\uD83C\uDF93 The knowledge-to-action bridge. Assign the $10 exercise as literal homework - it converts more understanding than any lecture.\n\n\uD83D\uDCA1 The on-chain fee eating a dollar of their $10 is a feature: nobody forgets their first fee.\n\n\uD83C\uDFAF Rule to repeat: practice every move with amounts that do not matter before touching amounts that do.`,
  scamdrill: `\uD83C\uDF93 Scams, not hacks, are how beginners actually lose coins. This drill outranks any technical lesson in practical value.\n\n\uD83D\uDCA1 The legitimate messages mixed in matter - students must learn that not everything is a scam, or they cannot function.\n\n\uD83C\uDFAF The five red flags should be recited from memory. Quiz them cold a week later.`,
  finalexam: `\uD83C\uDF93 Retrieval practice beats re-reading tenfold. Encourage students to attempt the exam BEFORE they feel ready.\n\n\uD83D\uDCA1 A failed attempt lists exactly which lessons to revisit - failure here is a study plan, not a verdict.\n\n\uD83C\uDFAF The OpenTimestamps step is a final hidden lesson: the certificate is proven by the same blockchain it certifies knowledge of.`,
  signetlab: `\uD83C\uDF93 The capstone of the technical chapters. Budget a full session: faucets and confirmations involve real waiting.\n\n\uD83D\uDCA1 The waiting IS a lesson - students feel block time viscerally instead of reading about it.\n\n\uD83C\uDFAF Drill the safety rule relentlessly: never type a real seed into any website. The lab builds the muscle memory with stakes of zero.`,
  caseagainst: `\uD83C\uDF93 The most important section for credibility. Do NOT rush to rebut - let the arguments stand at full strength first.\n\n\uD83D\uDCA1 Ask students which argument they find strongest BEFORE revealing the data. Volatility and irreversibility usually win.\n\n\uD83C\uDFAF The takeaway rule: never invest what you cannot watch drop 70%. Repeat it until it is boring.`,
  myths: `\uD83C\uDF93 Students arrive with these myths pre-loaded from media. Don't dismiss them \u2014 acknowledge them, then systematically dismantle them with facts.\n\n\uD83D\uDCA1 The pattern observation at the end is powerful: every myth follows the same lazy template. Once students see the pattern, they become immune to new myths.\n\n\uD83C\uDFAF The myth-buster interactive lesson lets students try to "attack" Bitcoin and see why each attack fails. Very engaging.`,
  wallets: `\ud83c\udf93 A great analogy: a wallet is like a keychain, not a piggy bank. It holds the KEYS to your money, not the money itself.\n\n\ud83d\udca1 Tip: Start with the wallet generator below to make it concrete.`,
  exchanges: `\ud83c\udf93 Most beginners start on exchanges. Key teaching moment: exchange Bitcoin is like a "receipt" \u2014 it's a promise, not the real thing.\n\n\ud83d\udca1 The airport currency analogy works brilliantly here.`,
  sending: `\ud83c\udf93 The sending demo below makes this real. Emphasize: Bitcoin transactions are permanent. There's no CTRL+Z.\n\n\ud83d\udca1 Compare to sending an email \u2014 you wouldn't email $10,000 without checking the address first!`,
  security: `\ud83c\udf93 Reassure students: a few simple habits cover 95% of risks.\n\n\ud83d\udca1 The "tell a trusted person where your backup is" advice is critically important.`,
  network: `\ud83c\udf93 Compare to Napster/BitTorrent \u2014 same idea, but for money.\n\n\ud83d\udca1 Emphasize: there's no "Bitcoin HQ" to hack or shut down.`,
  node: `\ud83c\udf93 Running a node is the most empowering thing a Bitcoiner can do.\n\n\ud83d\udca1 A Raspberry Pi (~$75) can run a full node \u2014 more accessible than most people think.`,
  mining: `\ud83c\udf93 Mining is often misunderstood as "creating Bitcoin." Better: miners are security guards who earn a reward.\n\n\ud83d\udca1 Emphasize: the COST is the feature, not the bug.`,
  blockchain: `\ud83c\udf93 The "chain of locks" analogy is powerful.\n\n\ud83d\udca1 Have students look up transactions on mempool.space \u2014 seeing real data makes it click.`,
  blocks: `\ud83c\udf93 Satoshi's message in the genesis block is a great hook.\n\n\ud83d\udca1 6 confirmations \u2248 "final" \u2014 this is what merchants wait for.`,
  difficulty: `\ud83c\udf93 The self-regulating nature is mind-blowing. No committee sets this.\n\n\ud83d\udca1 China's 2021 mining ban: hash rate dropped 50%, difficulty adjusted, everything was fine.`,
  transactions: `\ud83c\udf93 The "tip to the miner" analogy works well.\n\n\ud83d\udca1 Use mempool.space to show real-time mempool data.`,
  outputs: `\ud83c\udf93 UTXOs confuse many beginners. The physical cash analogy is gold.\n\n\ud83d\udca1 Run a search on any address to show that "balance" is just a list of UTXOs.`,
  locks: `\ud83c\udf93 The lock metaphor is perfect. Every UTXO has a combination lock.\n\n\ud83d\udca1 Multisig is a great advanced topic for real use cases.`,
  keys: `\ud83c\udf93 The one-way derivation is critical. It's like hashing a password.\n\n\ud83d\udca1 The HD wallet seed phrase concept is the "aha" moment.`,
  privatekeys: `\ud83c\udf93 The "atoms in the universe" analogy is jaw-dropping.\n\n\ud83d\udca1 Emphasize entropy: bad randomness is the most common way keys have been compromised.`,
  publickeys: `\ud83c\udf93 The paint mixing analogy: easy to mix, impossible to un-mix.\n\n\ud83d\udca1 Address reuse is a privacy issue. Modern HD wallets handle this automatically.`,
  signatures: `\ud83c\udf93 The "seal that changes for every document" captures ECDSA perfectly.\n\n\ud83d\udca1 Taproot/Schnorr is a natural lead-in to Lightning Network.`,
  consensus: `\ud83c\udf93 The Blocksize War is the perfect case study for how Bitcoin governance works.\n\n\ud83d\udca1 Emphasize that the BIP process being slow is a feature, not a bug. Compare to how the Fed can change monetary policy in an afternoon.\n\n\ud83c\udf93 SegWit and Taproot show that meaningful upgrades DO happen - just carefully. The current OP_CAT debate shows the process in real time.`,
  perspective: `\ud83c\udf1f This is the emotional and intellectual payoff of the entire course. Let it breathe.\n\n\ud83d\udca1 Jeff Booth's thesis is the bridge: technology creates deflation, fiat fights it with inflation, Bitcoin lets deflation win. This reframe is the "aha" moment for many students.\n\n\ud83c\udf93 The future-price simulator makes the abstract concrete. Watch students' eyes widen when they see grocery prices falling in sat terms year after year. That's the moment it clicks.\n\n\ud83c\udf89 Celebrate! They just completed the entire course. Make them feel proud.`,
  lore: `\ud83c\udf93 This is the "dessert" section - pure fun after the heavy material. Let students explore and enjoy.\n\n\ud83d\udca1 The Bitcoin Faucet and Casascius coins blow minds. The 21M cap not being exactly 21M is a great "well actually" moment that shows deep understanding.\n\n\ud83c\udf93 HODL origin story always gets laughs. The lost coins / landfill story makes the scarcity tangible.`
};

const didYouKnow = [
  "Bitcoin's creator, Satoshi Nakamoto, vanished in 2011. Their identity remains one of the internet's greatest mysteries.",
  "The first real-world Bitcoin purchase was 2 pizzas for 10,000 BTC on May 22, 2010. At today's prices, that's ~$1 billion per pizza.",
  "There will only ever be 21 million Bitcoin. About 4 million are estimated to be permanently lost forever.",
  "Bitcoin has survived being declared 'dead' by mainstream media over 400 times.",
  "The smallest unit of Bitcoin is called a Satoshi (0.00000001 BTC), named after its creator.",
  "El Salvador became the first country to adopt Bitcoin as legal tender in 2021.",
  "Bitcoin's code was released on January 3, 2009 \u2014 the same day the first block was mined.",
  "A hardware wallet can fit in your pocket and costs less than $100.",
  "The Lightning Network can process over 1 million Bitcoin transactions per second in theory.",
  "Bitcoin uses more SHA-256 hash computations per second than any other computer system ever built."
];

// ═══════════════════════════════════════
//   NAVIGATION (event delegation, not inline)
// ═══════════════════════════════════════
// Generate a fake block hash for the transition visual
function fakeHash(){
  const chars = '0123456789abcdef';
  let h = '0x';
  for(let i=0;i<8;i++) h += chars[Math.floor(Math.random()*16)];
  return h + '...';
}

// Create chain overlay DOM
function createChainOverlay(fromId, toId, direction){
  const overlay = document.createElement('div');
  overlay.className = 'chain-overlay';
  overlay.setAttribute('aria-hidden','true');

  const container = document.createElement('div');
  container.className = 'chain-link-container';

  const fromIdx = sectionOrder.indexOf(fromId);
  const toIdx = sectionOrder.indexOf(toId);

  // Departing block
  const fromBlock = document.createElement('div');
  fromBlock.className = 'chain-block departing';
  fromBlock.innerHTML = `
    <div class="block-hash">${fakeHash()}</div>
    <div class="block-label">${sectionNames[fromId] || fromId}</div>
    <div class="block-num">Block #${fromIdx}</div>
  `;

  // Chain links
  const chain = document.createElement('div');
  chain.className = 'chain-segment';
  for(let i=0;i<5;i++){
    const ring = document.createElement('div');
    ring.className = 'chain-ring';
    ring.style.animationDelay = (i * 0.05) + 's';
    chain.appendChild(ring);
  }

  // Arriving block
  const toBlock = document.createElement('div');
  toBlock.className = 'chain-block arriving';
  toBlock.innerHTML = `
    <div class="block-hash">${fakeHash()}</div>
    <div class="block-label">${sectionNames[toId] || toId}</div>
    <div class="block-num">Block #${toIdx}</div>
    <div class="nonce-ticker"></div>
  `;

  if(direction === 'forward'){
    container.appendChild(fromBlock);
    container.appendChild(chain);
    container.appendChild(toBlock);
  } else {
    container.appendChild(toBlock);
    container.appendChild(chain);
    container.appendChild(fromBlock);
  }

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  return { overlay, container, toBlock };
}

// Nonce ticker animation in the arriving block
function animateNonce(block, duration){
  const ticker = block.querySelector('.nonce-ticker');
  if(!ticker) return;
  const start = Date.now();
  const iv = setInterval(()=>{
    const elapsed = Date.now() - start;
    if(elapsed >= duration){ clearInterval(iv); ticker.textContent = 'VALID \u2713'; ticker.style.color = '#4ade80'; return; }
    ticker.textContent = 'nonce: ' + Math.floor(Math.random() * 999999).toString().padStart(6,'0');
  }, 50);
}

// Spawn sparks at the chain connection point
function spawnChainSparks(overlay){
  const rect = overlay.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  for(let i=0;i<8;i++){
    const spark = document.createElement('div');
    spark.className = 'chain-spark';
    const angle = (Math.PI * 2 * i) / 8;
    const dist = 20 + Math.random() * 30;
    spark.style.left = cx + 'px';
    spark.style.top = cy + 'px';
    spark.style.transition = 'all 0.5s ease-out';
    overlay.appendChild(spark);
    requestAnimationFrame(()=>{
      spark.style.left = (cx + Math.cos(angle) * dist) + 'px';
      spark.style.top = (cy + Math.sin(angle) * dist) + 'px';
      spark.style.opacity = '0';
    });
  }
}

function showSection(id){
  if(isTransitioning) return;

  const prevSection = currentSection;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isInitial = (prevSection === id);

  // Determine direction
  const prevIdx = sectionOrder.indexOf(prevSection);
  const nextIdx = sectionOrder.indexOf(id);
  const direction = nextIdx >= prevIdx ? 'forward' : 'backward';

  // Update nav highlights immediately
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const nav = document.getElementById('nav-' + id);
  if(nav) nav.classList.add('active');

  // Update teaching note
  const tn = document.getElementById('teachingNote');
  if(tn) tn.innerHTML = (teachingNotes[id] || '').replace(/\n/g, '<br>');

  // Update did you know
  didYouKnowIndex = (didYouKnowIndex + 1) % didYouKnow.length;
  const dyk = document.getElementById('didYouKnow');
  if(dyk) dyk.textContent = didYouKnow[didYouKnowIndex];

  // Update persistent progress
  abcVisited.add(id);
  abcLastSection = id;
  updateProgressUI();
  saveProgress();
  setTimeout(checkCompletion, 1500);

  // Deep link: keep URL hash in sync (replace on initial/back-forward, push otherwise)
  if(location.hash !== '#' + id){
    if(abcRoutingInitial){ history.replaceState(null, '', '#' + id); }
    else { history.pushState(null, '', '#' + id); }
  }
  abcRoutingInitial = false;

  // Update mobile bottom nav
  const total = sectionOrder.length;
  const lbl = document.getElementById('mobile-section-label');
  if(lbl) lbl.textContent = sectionNames[id] || id;
  const prevBtn = document.getElementById('mob-prev-btn');
  const nextBtn = document.getElementById('mob-next-btn');
  if(prevBtn) prevBtn.disabled = (nextIdx === 0);
  if(nextBtn) nextBtn.disabled = (nextIdx === total - 1);

  // Close drawer on mobile
  closeDrawer();

  // If same section, reduced motion, or initial load - just swap instantly
  if(isInitial || reducedMotion){
    document.querySelectorAll('.section-content').forEach(el => el.classList.remove('active'));
    const sec = document.getElementById('sec-' + id);
    if(sec) sec.classList.add('active');
    currentSection = id;
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }

  // === BLOCKCHAIN TRANSITION ===
  isTransitioning = true;

  const oldSec = document.getElementById('sec-' + prevSection);
  const newSec = document.getElementById('sec-' + id);

  // Phase 1: Exit animation on current page
  const exitClass = direction === 'forward' ? 'block-exit-forward' : 'block-exit-backward';
  const enterClass = direction === 'forward' ? 'block-enter-forward' : 'block-enter-backward';

  if(oldSec) oldSec.classList.add(exitClass);

  // Phase 2: Show chain overlay after brief delay
  setTimeout(()=>{
    const { overlay, container, toBlock } = createChainOverlay(prevSection, id, direction);

    // Animate nonce ticker
    animateNonce(toBlock, 600);

    // Slide chain in
    requestAnimationFrame(()=>{
      if(direction === 'forward'){
        container.classList.add('slide-in');
      } else {
        container.className = 'chain-link-container reverse-start';
        requestAnimationFrame(()=> container.classList.replace('reverse-start','reverse-in'));
      }
    });

    // Spark at midpoint
    setTimeout(()=> spawnChainSparks(overlay), 350);

    // Phase 3: Slide chain through and swap content
    setTimeout(()=>{
      if(direction === 'forward'){
        container.classList.replace('slide-in','slide-out');
      } else {
        container.classList.replace('reverse-in','reverse-out');
      }

      // Swap sections
      document.querySelectorAll('.section-content').forEach(el => {
        el.classList.remove('active', 'block-exit-forward', 'block-exit-backward', 'block-enter-forward', 'block-enter-backward');
      });
      if(newSec){
        newSec.classList.add('active', enterClass);
      }
      currentSection = id;
      window.scrollTo({top: 0});

      // Cleanup
      setTimeout(()=>{
        overlay.remove();
        if(newSec) newSec.classList.remove(enterClass);
        isTransitioning = false;
      }, 500);

    }, 700);

  }, 200);

  // Celebration effect for final section
  if(id === 'perspective'){
    setTimeout(()=>{
      for(let i = 0; i < 20; i++) setTimeout(() => spawnCoin(), i * 80);
      const star = document.getElementById('perspectiveCelebration');
      if(star){ star.style.transition = 'transform .6s'; star.style.transform = 'scale(1.3)'; setTimeout(()=>{ star.style.transform = 'scale(1)'; }, 600); }
    }, 1200);
  }
}

// Event delegation for nav items
document.getElementById('left-sidebar').addEventListener('click', function(e){
  const btn = e.target.closest('.nav-item');
  if(btn && btn.dataset.section) {
    showSection(btn.dataset.section);
  }
});

// Event delegation for modal buttons and section bridge buttons
document.getElementById('main-content').addEventListener('click', function(e){
  const modalBtn = e.target.closest('[data-modal]');
  if(modalBtn) { openModal(modalBtn.dataset.modal); return; }

  // Section bridge buttons (e.g. "Continue to Wallets →")
  const sectionBtn = e.target.closest('[data-section]');
  if(sectionBtn && sectionBtn.dataset.section) { showSection(sectionBtn.dataset.section); return; }

  // Wallet generator
  if(e.target.id === 'generateWalletBtn') generateWallet();

  // Generate demo address
  if(e.target.id === 'generateAddrBtn'){
    var hex = '0123456789abcdef';
    var qr = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    var addr = 'bc1q';
    for(var gi = 0; gi < 38; gi++) addr += qr[Math.floor(Math.random() * qr.length)];
    var el = document.getElementById('sendAddr');
    if(el){ el.value = addr; el.style.borderColor = 'var(--orange)'; setTimeout(function(){ el.style.borderColor = 'var(--glass-border)'; }, 1000); }
  }

  // Demo send
  if(e.target.id === 'demoSendBtn') demoSend();

  // Welcome "Begin Your Journey" button
  if(e.target.id === 'welcomeBeginBtn') showSection('money');
  if(e.target.id === 'welcomeSkepticBtn') showSection('caseagainst');
});

// ═══════════════════════════════════════
//   SITE SEARCH
// ═══════════════════════════════════════
const searchIndex = [
  {s:'money',c:'I. The Problem with Money',k:'what is money history barter shells salt gold coins properties sound money scarcity durability divisibility portability'},
  {s:'inflation',c:'I. The Problem with Money',k:'inflation cpi money printing m2 supply purchasing power prices rising fed federal reserve groceries expensive cost of living'},
  {s:'faithcredit',c:'I. The Problem with Money',k:'national debt deficit treasury bonds dollar backed government 40 trillion interest spending both parties republican democrat bipartisan presidents red blue who added more debt by president reagan obama trump biden'},
  {s:'year1971',c:'I. The Problem with Money',k:'1971 nixon gold standard gold window wtf happened wages stagnant productivity gap obesity suicide wealth gap inequality two incomes housing unaffordable college tuition healthcare costs society real wages cantillon effect boomers millennials cant afford house'},
  {s:'deflation',c:'I. The Problem with Money',k:'deflation falling prices technology savings cheaper saver'},
  {s:'fiatgraveyard',c:'I. The Problem with Money',k:'fiat currency collapse hyperinflation weimar zimbabwe venezuela argentina failed currencies history paper money'},
  {s:'pizza',c:'II. The Origin Story',k:'pizza day laszlo 10000 btc first purchase real transaction may 22'},
  {s:'digimoney',c:'II. The Origin Story',k:'digicash hashcash bmoney bit gold rpow ecash before bitcoin predecessors attempts cypherpunk'},
  {s:'satoshi',c:'II. The Origin Story',k:'satoshi nakamoto creator founder who made invented bitcoin identity anonymous disappeared vanished mystery'},
  {s:'whitepaper',c:'II. The Origin Story',k:'whitepaper white paper 2008 nine pages peer to peer electronic cash read original'},
  {s:'altcoins',c:'III. Bitcoin vs The World',k:'altcoins ethereum eth xrp ripple solana cardano dogecoin tether crypto other coins difference compare zcash counterfeit infinite supply bug orchard shielded privacy coin'},
  {s:'powvpos',c:'III. Bitcoin vs The World',k:'proof of work stake pow pos mining staking consensus mechanism energy validators'},
  {s:'myths',c:'III. Bitcoin vs The World',k:'myths criminal crime energy waste boil oceans volatile ban government illegal intrinsic value yield debunked lies fud'},
  {s:'tulips',c:'III. Bitcoin vs The World',k:'tulip mania bubble 1637 dutch speculation crash ponzi scheme'},
  {s:'quantum',c:'III. Bitcoin vs The World',k:'quantum computer break crack cryptography qubits threat future ibm google'},
  {s:'caseagainst',c:'III. Bitcoin vs The World',k:'case against bitcoin criticism skeptic steelman risks downsides volatility drawdown lost coins energy consumption concentration whales government ban 6102 no intrinsic value belief honest cons drawbacks why not buy'},
  {s:'goldvsbtc',c:'III. Bitcoin vs The World',k:'gold digital gold comparison precious metal 6102 confiscation ratio ounce store of value'},
  {s:'adoption',c:'III. Bitcoin vs The World',k:'adoption el salvador etf blackrock institutions countries companies legal tender wall street'},
  {s:'wallets',c:'IV. Getting Started',k:'wallet hardware software ledger trezor cold storage hot custody store keep safe keys'},
  {s:'exchanges',c:'IV. Getting Started',k:'buy bitcoin exchange coinbase kraken cash app kyc how to purchase get dca dollar cost averaging invest'},
  {s:'firstbitcoin',c:'IV. Getting Started',k:'first bitcoin ten dollars start small beginner buy first time which wallet choose decision practice withdrawal training'},
  {s:'sending',c:'IV. Getting Started',k:'send transfer fees mempool transaction confirm receive payment address'},
  {s:'security',c:'IV. Getting Started',k:'security multisig seed phrase backup protect safe scams phishing hacked stolen lost'},
  {s:'scamdrill',c:'IV. Getting Started',k:'scam drill phishing fraud fake support seed phrase request giveaway doubler romance pig butchering clipboard malware red flags protect stolen'},
  {s:'network',c:'V. How Bitcoin Works',k:'network nodes peer to peer p2p decentralized uptime servers internet'},
  {s:'node',c:'V. How Bitcoin Works',k:'run node raspberry pi validate full node verify trustless'},
  {s:'mining',c:'V. How Bitcoin Works',k:'mining miners hash rate block reward halving asic energy electricity 21 million mined'},
  {s:'blockchain',c:'V. How Bitcoin Works',k:'blockchain ledger blocks chain immutable history record technology'},
  {s:'blocks',c:'V. How Bitcoin Works',k:'block header merkle root coinbase transaction size weight'},
  {s:'difficulty',c:'V. How Bitcoin Works',k:'difficulty adjustment 2016 blocks ten minutes self regulating target'},
  {s:'attackvectors',c:'V. How Bitcoin Works',k:'attack 51 percent hack hacked double spend sybil eclipse security breaking destroy kill'},
  {s:'transactions',c:'VI. Transactions & Cryptography',k:'transaction inputs outputs signed irreversible anatomy'},
  {s:'outputs',c:'VI. Transactions & Cryptography',k:'utxo unspent output balance change coins'},
  {s:'locks',c:'VI. Transactions & Cryptography',k:'locking script p2pkh p2sh taproot spending conditions smart'},
  {s:'keys',c:'VI. Transactions & Cryptography',k:'keys addresses derive hd wallet address formats bc1'},
  {s:'privatekeys',c:'VI. Transactions & Cryptography',k:'private key secret 256 bit seed phrase 12 words 24 words backup'},
  {s:'publickeys',c:'VI. Transactions & Cryptography',k:'public key elliptic curve secp256k1 derive'},
  {s:'signatures',c:'VI. Transactions & Cryptography',k:'signature ecdsa schnorr sign verify ownership prove'},
  {s:'signetlab',c:'VI. Transactions & Cryptography',k:'lab signet real bitcoin practice testnet test network faucet hands on try broadcast real transaction send receive wallet generate key practice safely'},
  {s:'consensus',c:'VI. Transactions & Cryptography',k:'consensus upgrades bip soft fork segwit taproot blocksize war governance rules change vote'},
  {s:'lightning',c:'VI. Transactions & Cryptography',k:'lightning network layer 2 instant payments fast cheap channels coffee remittance'},
  {s:'toolate',c:'VII. The Future',k:'too late buy now price prediction market cap early s curve adoption invest worth millionaire'},
  {s:'perspective',c:'VII. The Future',k:'future savings perspective deflation standard jeff booth world'},
  {s:'finalexam',c:'VII. The Future',k:'final exam test quiz certificate diploma prove knowledge pass score graduate completion'},
  {s:'lore',c:'VII. The Future',k:'lore hodl fun facts trivia stories milestones lost coins landfill hal finney faucet casascius'},
  {s:'bibliography',c:'VII. The Future',k:'sources books learn more bibliography references go deeper bitcoin standard saylor reading'}
];
const questionBank = [
  {q:'What is Bitcoin, really?', s:'money'},
  {q:'What are the real risks of Bitcoin?', s:'caseagainst'},
  {q:'Why might Bitcoin fail?', s:'caseagainst'},
  {q:'Is it too late to buy Bitcoin?', s:'toolate'},
  {q:'Who created Bitcoin?', s:'satoshi'},
  {q:'How do I buy Bitcoin safely?', s:'exchanges'},
  {q:'Why does my money buy less every year?', s:'inflation'},
  {q:"Why can't one income support a family anymore?", s:'year1971'},
  {q:'What happened in 1971?', s:'year1971'},
  {q:"Doesn't Bitcoin waste energy?", s:'myths'},
  {q:'How does mining actually work?', s:'mining'},
  {q:'Can I try Bitcoin without risking money?', s:'signetlab'},
  {q:'Is Bitcoin just digital gold?', s:'goldvsbtc'},
  {q:'Where should I store my Bitcoin?', s:'wallets'},
  {q:'How do I avoid Bitcoin scams?', s:'scamdrill'},
  {q:'How do I actually get started?', s:'firstbitcoin'},
  {q:'Is Bitcoin a bubble like tulip mania?', s:'tulips'},
  {q:'Can the government ban Bitcoin?', s:'myths'},
  {q:'Can quantum computers break Bitcoin?', s:'quantum'},
  {q:'What makes Bitcoin different from other crypto?', s:'altcoins'},
  {q:'How can Bitcoin payments be instant?', s:'lightning'},
  {q:'What is the blockchain?', s:'blockchain'},
  {q:'What happens when all 21 million are mined?', s:'mining'},
  {q:'How do I send Bitcoin to someone?', s:'sending'},
  {q:'What is a private key?', s:'privatekeys'}
];
let searchSel = -1;

function searchCourse(qRaw){
  const tokens = qRaw.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if(!tokens.length) return [];
  const results = [];
  searchIndex.forEach(e => {
    const title = (sectionNames[e.s] || e.s).toLowerCase();
    let score = 0;
    tokens.forEach(t => {
      if(title.startsWith(t)) score += 30;
      else if(title.includes(t)) score += 20;
      if(e.k.includes(t)) score += 10;
    });
    if(score > 0) results.push({title: sectionNames[e.s], meta: e.c, s: e.s, score});
  });
  questionBank.forEach(e => {
    const ql = e.q.toLowerCase();
    let score = 0;
    tokens.forEach(t => { if(ql.includes(t)) score += 15; });
    if(score > 0) results.push({title: e.q, meta: 'Question → ' + (sectionNames[e.s] || e.s), s: e.s, score: score + 2});
  });
  results.sort((a,b) => b.score - a.score);
  return results.slice(0, 8);
}

function renderSearchResults(q){
  const box = document.getElementById('searchResults');
  searchSel = -1;
  let items, label;
  if(!q.trim()){
    items = questionBank.slice(0, 8).map(e => ({title: e.q, meta: 'Popular topic → ' + (sectionNames[e.s] || e.s), s: e.s}));
    label = 'Popular topics';
  } else {
    items = searchCourse(q);
    label = 'Results';
  }
  if(!items.length){
    box.innerHTML = '<div class="search-empty">No matches. Try "mining", "wallets", or "inflation".<br/>Or start at the beginning: <button class="search-result" style="display:inline-block;width:auto;padding:4px 10px;margin-top:6px;color:var(--orange);" onclick="searchGo(\'money\')">The Nature of Money &rarr;</button></div>';
    return;
  }
  box.innerHTML = '<div class="search-label">' + label + '</div>' + items.map(r =>
    '<button class="search-result" data-s="' + r.s + '" onclick="searchGo(\'' + r.s + '\')"><div class="sr-title">' + r.title + '</div><div class="sr-meta">' + r.meta + '</div></button>'
  ).join('');
}

function openSearch(){
  document.getElementById('searchOverlay').classList.add('open');
  const inp = document.getElementById('searchInput');
  inp.value = '';
  renderSearchResults('');
  setTimeout(() => inp.focus(), 50);
}
function closeSearch(){
  document.getElementById('searchOverlay').classList.remove('open');
}
function searchGo(slug){
  closeSearch();
  showSection(slug);
}

(function(){
  const inp = document.getElementById('searchInput');
  const overlay = document.getElementById('searchOverlay');
  inp.addEventListener('input', () => renderSearchResults(inp.value));
  inp.addEventListener('keydown', (e) => {
    const items = document.querySelectorAll('#searchResults .search-result[data-s]');
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      if(!items.length) return;
      searchSel = e.key === 'ArrowDown' ? (searchSel + 1) % items.length : (searchSel - 1 + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('sel', i === searchSel));
      items[searchSel].scrollIntoView({block: 'nearest'});
    } else if(e.key === 'Enter'){
      e.preventDefault();
      const target = items[searchSel >= 0 ? searchSel : 0];
      if(target) searchGo(target.dataset.s);
    } else if(e.key === 'Escape'){
      closeSearch();
    }
    e.stopPropagation();
  });
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', (e) => {
    const typing = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')){
      e.preventDefault();
      openSearch();
    }
  });
})();

// ═══════════════════════════════════════
//   HERO SYMBOL MORPH (evolution of money)
// ═══════════════════════════════════════
(function(){
  // Custom line-art icons drawn to match the site's neon aesthetic (no emojis)
  function icon(paths){
    return '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }
  var symbols = [
    // Cowrie shell: egg-shaped outline with the toothed aperture slit
    {html: icon('<path d="M60 16 C88 16 100 42 100 64 C100 90 82 104 60 104 C38 104 20 90 20 64 C20 42 32 16 60 16 Z"/><path d="M60 32 C56 42 64 50 60 60 C56 70 64 78 60 90"/><path d="M51 40 L66 38 M53 54 L67 52 M51 68 L66 66 M53 81 L67 79"/>'),
     label:'Cowrie Shells ~1200 BC'},
    // Salt: faceted crystal
    {html: icon('<path d="M60 16 L94 50 L78 104 L42 104 L26 50 Z"/><path d="M60 16 L50 50 L42 104 M60 16 L72 50 L78 104 M26 50 L50 50 M94 50 L72 50"/>'),
     label:'Salt - Roman Era'},
    // Gold: stacked ingots
    {html: icon('<path d="M12 100 L24 74 L52 74 L62 100 Z"/><path d="M58 100 L70 74 L98 74 L108 100 Z"/><path d="M35 68 L47 42 L75 42 L85 68 Z"/>'),
     label:'Gold ~600 BC'},
    // Ancient coin: beaded border with incuse square punch mark
    {html: icon('<circle cx="60" cy="60" r="46"/><circle cx="60" cy="60" r="34" stroke-dasharray="1 9"/><rect x="46" y="46" width="28" height="28" transform="rotate(45 60 60)"/>'),
     label:'Coins ~600 BC'},
    // Paper money: banknote with center seal and corner marks
    {html: icon('<rect x="10" y="34" width="100" height="52" rx="7"/><circle cx="60" cy="60" r="15"/><path d="M21 45 h7 M92 45 h7 M21 75 h7 M92 75 h7"/>'),
     label:'Paper Money ~1000 AD'},
    {html:'\u20BF', label:'Bitcoin 2009', btc:true}
  ];
  var heroEl = document.getElementById('heroSymbol');
  var labelEl = document.getElementById('heroSymbolLabel');
  if(!heroEl || !labelEl) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var idx = symbols.length - 1; // start on Bitcoin
  var LINGER_BTC = 4000;   // stay on ₿ longer
  var LINGER_OTHER = 2000; // other symbols
  var MORPH_DUR = 450;     // matches CSS transition

  function cycle(){
    // fade out current
    heroEl.classList.add('morph-out');
    heroEl.classList.remove('morph-in');
    labelEl.style.opacity = '0';

    setTimeout(function(){
      // advance to next symbol
      idx = (idx + 1) % symbols.length;
      var s = symbols[idx];
      heroEl.innerHTML = s.html;
      labelEl.textContent = s.label;

      // if Bitcoin, restore orange text color; others get slightly different hue
      if(s.btc){
        heroEl.style.color = '';
        heroEl.style.textShadow = '';
      } else {
        heroEl.style.color = 'var(--muted)';
        heroEl.style.textShadow = '0 0 40px rgba(136,136,184,0.3)';
      }

      // fade in
      heroEl.classList.remove('morph-out');
      heroEl.classList.add('morph-in');
      labelEl.style.opacity = '1';

      // schedule next
      var wait = s.btc ? LINGER_BTC : LINGER_OTHER;
      setTimeout(cycle, wait);
    }, MORPH_DUR);
  }

  // first cycle starts after initial entry animation + pause on Bitcoin
  setTimeout(cycle, 5000);
})();

// Mobile bottom nav
document.getElementById('mob-prev-btn').addEventListener('click', () => mobileNav(-1));
document.getElementById('mob-next-btn').addEventListener('click', () => mobileNav(1));

// Swipe left/right on the content area to change lessons (phones)
(function(){
  let swipeX = 0, swipeY = 0, swipeValid = false;
  const content = document.getElementById('main-content');
  if(!content) return;
  content.addEventListener('touchstart', function(e){
    swipeValid = false;
    if(e.touches.length !== 1) return;
    // Ignore swipes that start on interactive elements or scrollable widgets
    if(e.target.closest('input, button, select, textarea, a, canvas, table, [role="slider"], .demo-coin, .chain-block')) return;
    if(document.getElementById('modalOverlay').classList.contains('open')) return;
    swipeX = e.touches[0].clientX;
    swipeY = e.touches[0].clientY;
    swipeValid = true;
  }, {passive: true});
  content.addEventListener('touchend', function(e){
    if(!swipeValid || isTransitioning) return;
    swipeValid = false;
    const dx = e.changedTouches[0].clientX - swipeX;
    const dy = e.changedTouches[0].clientY - swipeY;
    // Require a decisively horizontal swipe of at least 70px
    if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    mobileNav(dx < 0 ? 1 : -1);
  }, {passive: true});
})();

function mobileNav(dir){
  const idx = sectionOrder.indexOf(currentSection);
  const next = Math.min(Math.max(idx + dir, 0), sectionOrder.length - 1);
  showSection(sectionOrder[next]);
}

// Keyboard navigation
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    closeModalDirect();
    closeDrawer();
    closeSearch();
    return;
  }
  if(document.getElementById('modalOverlay').classList.contains('open')) return;
  if(document.getElementById('searchOverlay').classList.contains('open')) return;
  // Only navigate if no input/textarea is focused
  if(document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  const idx = sectionOrder.indexOf(currentSection);
  if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
    e.preventDefault();
    showSection(sectionOrder[Math.min(idx+1, sectionOrder.length-1)]);
  }
  if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
    e.preventDefault();
    showSection(sectionOrder[Math.max(idx-1, 0)]);
  }
});

// ═══════════════════════════════════════
//   DRAWER (MOBILE SIDEBAR)
// ═══════════════════════════════════════
const hamburgerBtn = document.getElementById('hamburger-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
hamburgerBtn.addEventListener('click', toggleDrawer);
sidebarCloseBtn.addEventListener('click', closeDrawer);

function toggleDrawer(){
  const sb = document.getElementById('left-sidebar');
  if(sb.classList.contains('open')){ closeDrawer(); }
  else { openDrawer(); }
}

function openDrawer(){
  const sb  = document.getElementById('left-sidebar');
  const ov  = document.getElementById('drawer-overlay');
  const cb  = document.getElementById('sidebar-close-btn');
  sb.classList.add('open');
  ov.classList.add('open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  if(cb){ cb.style.display='flex'; cb.style.alignItems='center'; cb.style.justifyContent='center'; }
  _scrollY = window.scrollY;
  document.body.style.top    = `-${_scrollY}px`;
  document.body.style.position = 'fixed';
  document.body.style.width    = '100%';
  document.body.style.overflowY = 'scroll';
  setTimeout(() => {
    document.addEventListener('touchstart', _outsideTap, { passive: true });
    document.addEventListener('mousedown',  _outsideTap);
  }, 50);
}

function closeDrawer(){
  const sb = document.getElementById('left-sidebar');
  const ov = document.getElementById('drawer-overlay');
  const cb = document.getElementById('sidebar-close-btn');
  sb.classList.remove('open');
  ov.classList.remove('open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  if(cb) cb.style.display = 'none';
  document.body.style.position  = '';
  document.body.style.top       = '';
  document.body.style.width     = '';
  document.body.style.overflowY = '';
  window.scrollTo(0, _scrollY);
  document.removeEventListener('touchstart', _outsideTap);
  document.removeEventListener('mousedown',  _outsideTap);
}

function _outsideTap(e){
  const sb = document.getElementById('left-sidebar');
  if(sb && !sb.contains(e.target)){
    closeDrawer();
  }
}

// ═══════════════════════════════════════
//   SECURITY CHECKLIST (proper checkboxes)
// ═══════════════════════════════════════
const checks = [
  "Written down my seed phrase on paper (not digitally)",
  "Stored seed phrase in a fireproof location",
  "Enabled 2FA on all exchange accounts",
  "Using a hardware wallet for large amounts",
  "Never clicked links in crypto emails",
  "Using unique addresses for each transaction",
  "Told a trusted person where my backup is",
  "Verified wallet app is from official source",
  "Hardware wallet firmware is up to date",
  "Added my own dice rolls when generating a hardware wallet seed"
];
const checklist = document.getElementById('securityChecklist');
if(checklist){
  checks.forEach((c, i) => {
    const label = document.createElement('label');
    label.className = 'security-check';
    label.innerHTML = `<input type="checkbox" id="sec-check-${i}" aria-label="${c}"><span>${c}</span>`;
    checklist.appendChild(label);
  });
}

// ═══════════════════════════════════════
//   BIP39 WORD LIST (subset for demo)
// ═══════════════════════════════════════
const bip39Words = ["abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse","access","accident","account","accuse","achieve","acid","acoustic","acquire","across","action","actor","actress","actual","adapt","add","addict","address","adjust","admit","adult","advance","advice","aerobic","afford","afraid","again","agent","agree","ahead","aim","air","airport","aisle","alarm","album","alcohol","alert","alien","all","alley","allow","almost","alone","alpha","already","also","alter","always","amateur","amazing","among","amount","amused","analyst","anchor","ancient","anger","angle","angry","animal","ankle","announce","annual","another","answer","antenna","antique","anxiety","any","apart","apology","appear","apple","approve","april","arch","arctic","area","arena","argue","arm","armed","armor","army","around","arrange","arrest","arrive","arrow","art","artefact","artist","artwork","ask","aspect","assault","asset","assist","assume","asthma","athlete","atom","attack","attend","attitude","attract","auction","audit","august","aunt","author","auto","autumn","average","avocado","avoid","awake","aware","away","awesome","awful","awkward","axis","baby","balance","bamboo","banana","banner","barely","bargain","barrel","base","basic","basket","battle","beach","bean","beauty","because","become","beef","before","begin","behave","behind","believe","below","belt","bench","benefit","best","betray","better","between","beyond","bicycle","bid","bike","bind","biology","bird","birth","bitter","black","blade","blame","blanket","blast","bleak","bless","blind","blood","blossom","blouse","blue","blur","blush","board","boat","body","boil","bomb","bone","book","boost","border","boring","borrow","boss","bottom","bounce","box","boy","bracket","brain","brand","brave","breeze","brick","bridge","brief","bright","bring","brisk","broccoli","broken","bronze","broom","brother","brown","brush","bubble","buddy","budget","buffalo","build","bulb","bulk","bullet","bundle","bunker","burden","burger","burst","bus","business","busy","butter","buyer","buzz","cabbage","cabin","cable","cactus","cage","cake","call","calm","camera","camp","can","canal","cancel","candy","cannon","canvas","canyon","capable","capital","captain","carbon","card","cargo","carpet","carry","cart","case","cash","casino","castle","casual","cat","catalog","catch","category","cause","cave","cereal","certain","chair","chalk","champion","change","chaos","chapter","charge","chase","chat","cheap","check","cheese","chef","cherry","chest","chicken","chief","child","chimney","choice","choose","chronic","chuckle","chunk","cigar","cinnamon","circle","citizen","city","civil","claim","clap","clarify","claw","clay","clean","clerk","clever","click","client","cliff","climb","clinic","clip","clock","clog","close","cloth","cloud","clown","club","clump","cluster","clutch","coach","coast","coconut","code","coffee","coil","coin","collect","color","column","combine","come","comfort","comic","common","company","concert","conduct","confirm","congress","connect","consider","control","convince","cook","cool","copper","copy","coral","core","corn","correct","cost","cotton","couch","country","couple","course","cousin","cover","coyote","crack","cradle","craft","cram","crane","crash","crazy","cream","credit","creek","crew","cricket","crime","crisp","critic","cross","crouch","crowd","crucial","cruel","cruise","crumble","crunch","crush","cry","crystal","cube","culture","cup","cupboard","curious","current","curtain","curve","cushion","custom","cute","cycle","dad","damage","damp","dance","danger","daring","dash","daughter","dawn","day","deal","debate","debris","decade","december","decide","decline","decorate","decrease","deer","defense","define","defy","degree","delay","deliver","demand","demise","denial","dentist","deny","depart","depend","deposit","depth","deputy","derive","describe","desert","design","desk","despair","destroy","detail","detect","develop","device","devote","diagram","dial","diamond","diary","dice","diesel","diet","differ","digital","dignity","dilemma","dinner","dinosaur","direct","dirt","disagree","discover","disease","dish","dismiss","display","distance","divert","divide","divorce","dizzy","doctor","document","dog","doll","dolphin","domain","donate","donkey","donor","door","dose","double","dove","draft","dragon","drama","drastic","draw","dream","dress","drift","drill","drink","drip","drive","drop","drum","dry","duck","dumb","dune","during","dust","dutch","duty","dwarf","dynamic","eager","eagle","early","earn","earth","easily","east","easy","echo","ecology","economy","edge","edit","educate","effort","egg","eight","either","elbow","elder","electric","elegant","element","elephant","elevator","elite","else","embark","embody","embrace","emerge","emotion","employ","empower","empty","enable","enforce","engage","engine","enhance","enjoy","enlist","enough","enrich","enroll","ensure","enter","entire","entry","envelope","episode","equal","equip","era","erase","erode","error","erupt","escape","essay","essence","estate","eternal","ethics","evidence","evil","evolve","exact","example","excess","exchange","excite","exclude","exercise","exhaust","exhibit","exile","exist","exit","exotic","expand","expire","explain","expose","express","extend","extra","eye","fable","fabric","face","faculty","fade","faint","faith","fall","fame","family","famous","fan","fancy","fantasy","farm","fashion","fat","fatal","father","fatigue","fault","favorite","feature","federal","fee","feel","female","fence","festival","fetch","fever","few","fiber","fiction","field","figure","file","film","filter","final","find","finger","finish","fire","firm","fiscal","fish","fitness","fix","flag","flame","flash","flat","flavor","flee","flight","flip","float","flock","floor","flower","fluid","flush","fly","foam","focus","fog","foil","fold","follow","food","foot","force","forest","forget","fork","fortune","forum","forward","fossil","foster","found","fox","fragile","frame","frequent","fresh","friend","fringe","frog","front","frost","frozen","fruit","fuel","fun","funny","furnace","fury","future","gadget","gain","galaxy","gallery","game","gap","garage","garbage","garden","garlic","garment","gas","gasp","gate","gather","gauge","gaze","general","genius","genre","gentle","genuine","gesture","ghost","giant","gift","giggle","ginger","giraffe","girl","give","glad","glance","glare","glass","glide","glimpse","globe","gloom","glory","glove","glow","glue","goat","goddess","gold","good","goose","gorilla","gospel","gossip","govern","gown","grab","grace","grain","grant","grape","grass","gravity","great","green","grid","grief","grit","grocery","group","grow","grunt","guard","guess","guide","guilt","guitar","gun","gym","habit","half","hammer","hamster","hand","happy","harbor","hard","harsh","harvest","hat","have","hawk","hazard","head","health","heart","heavy","hedgehog","height","hello","helmet","help","hen","hero","hip","hire","history","hobby","hockey","hold","hole","holiday","hollow","home","honey","hood","hope","horn","horror","horse","hospital","host","hotel","hour","hover","hub","huge","human","humble","humor","hundred","hungry","hunt","hurdle","hurry","husband","hybrid","ice","icon","idea","identify","idle","ignore","ill","illegal","illness","image","imitate","immense","immune","impact","impose","improve","impulse","inch","include","income","increase","index","indicate","indoor","industry","infant","inflict","inform","initial","inject","inmate","inner","innocent","input","inquiry","insane","insect","inside","inspire","install","intact","interest","into","invest","invite","involve","iron","island","isolate","issue","item","ivory","jacket","jaguar","jar","jazz","jealous","jeans","jelly","jewel","job","join","joke","journey","joy","judge","juice","jump","jungle","junior","junk","just","kangaroo","keen","keep","ketchup","key","kick","kid","kidney","kind","kingdom","kiss","kit","kitchen","kite","kitten","kiwi","knee","knife","knock","know","lab","label","labor","ladder","lady","lake","lamp","language","laptop","large","later","latin","laugh","laundry","lava","law","lawn","lawsuit","layer","lazy","leader","leaf","learn","leave","lecture","left","leg","legal","legend","leisure","lemon","lend","length","lens","leopard","lesson","letter","level","liberty","library","license","life","lift","light","like","limb","limit","link","lion","liquid","list","little","live","lizard","load","loan","lobster","local","lock","logic","lonely","long","loop","lottery","loud","lounge","love","loyal","lucky","luggage","lumber","lunar","lunch","luxury","lyrics","machine","mad","magic","magnet","maid","mail","main","major","make","mammal","man","manage","mandate","mango","mansion","manual","maple","marble","march","margin","marine","market","marriage","mask","mass","master","match","material","math","matrix","matter","maximum","maze","meadow","mean","measure","meat","mechanic","medal","media","melody","melt","member","memory","mention","menu","mercy","merge","merit","merry","mesh","message","metal","method","middle","midnight","milk","million","mimic","mind","minimum","minor","minute","miracle","mirror","misery","miss","mistake","mix","mixed","mixture","mobile","model","modify","mom","moment","monitor","monkey","monster","month","moon","moral","more","morning","mosquito","mother","motion","motor","mountain","mouse","move","movie","much","muffin","mule","multiply","muscle","museum","mushroom","music","must","mutual","myself","mystery","myth","naive","name","napkin","narrow","nasty","nation","nature","near","neck","need","negative","neglect","neither","nephew","nerve","nest","net","network","neutral","never","news","next","nice","night","noble","noise","nominee","noodle","normal","north","nose","notable","nothing","novel","now","nuclear","number","nurse","nut","oak","obey","object","oblige","obscure","observe","obtain","obvious","occur","ocean","october","odor","off","offer","office","often","oil","okay","old","olive","olympic","omit","once","one","onion","online","only","open","opera","opinion","oppose","option","orange","orbit","orchard","order","ordinary","organ","orient","original","orphan","ostrich","other","outdoor","outer","output","outside","oval","oven","over","own","owner","oxygen","oyster","ozone","pact","paddle","page","pair","palace","palm","panda","panel","panic","panther","paper","parade","parent","park","parrot","party","pass","patch","path","patient","patrol","pattern","pause","pave","payment","peace","peanut","pear","peasant","pelican","pen","penalty","pencil","people","pepper","perfect","permit","person","pet","phone","photo","phrase","physical","piano","picnic","picture","piece","pig","pigeon","pill","pilot","pink","pioneer","pipe","pistol","pitch","pizza","place","planet","plastic","plate","play","please","pledge","pluck","plug","plunge","poem","poet","point","polar","pole","police","pond","pony","pool","popular","pork","position","possible","post","potato","pottery","poverty","powder","power","practice","praise","predict","prefer","prepare","present","pretty","prevent","price","pride","primary","print","priority","prison","private","prize","problem","process","produce","profit","program","project","promote","proof","property","prosper","protect","proud","provide","public","pudding","pull","pulp","pulse","pumpkin","punch","pupil","puppy","purchase","purity","purpose","purse","push","put","puzzle","pyramid","quality","quantum","quarter","question","quick","quit","quiz","quote","rabbit","raccoon","race","rack","radar","radio","rage","rail","rain","raise","rally","ramp","ranch","random","range","rapid","rare","rate","rather","raven","raw","razor","ready","real","reason","rebel","rebuild","recall","receive","recipe","record","recycle","reduce","reflect","reform","region","regret","regular","reject","relax","release","relief","rely","remain","remember","remind","remove","render","renew","rent","reopen","repair","repeat","replace","report","require","rescue","resemble","resist","resource","response","result","retire","retreat","return","reunion","reveal","review","reward","rhythm","rib","ribbon","rice","rich","ride","ridge","rifle","right","rigid","ring","riot","ripple","risk","ritual","rival","river","road","roast","robot","robust","rocket","romance","roof","rookie","room","rose","rotate","rough","round","route","royal","rubber","rude","rug","rule","run","runway","rural","sad","saddle","sadness","safe","sail","salad","salmon","salon","salt","salute","same","sand","satisfy","satoshi","sauce","sausage","save","say","scale","scan","scare","scatter","scene","scheme","school","science","scissors","scorpion","scout","scrap","screen","script","scrub","sea","search","season","seat","second","secret","section","security","seed","seek","segment","select","sell","seminar","senior","sense","sentence","series","service","session","settle","setup","seven","shadow","shaft","shallow","share","shed","shell","sheriff","shield","shift","shine","ship","shiver","shock","shoe","shoot","shop","short","shoulder","shove","shrimp","shrug","shuffle","shy","sibling","sick","side","siege","sight","sign","silent","silk","silly","silver","similar","simple","since","sing","siren","sister","situate","six","size","skate","sketch","ski","skill","skin","skirt","skull","slab","slam","sleep","slender","slice","slide","slight","slim","slogan","slot","slow","slush","small","smart","smile","smoke","smooth","snack","snake","snap","sniff","snow","soap","soccer","social","sock","soda","soft","solar","soldier","solid","solution","solve","someone","song","soon","sorry","sort","soul","sound","soup","source","south","space","spare","spatial","spawn","speak","special","speed","spell","spend","sphere","spice","spider","spike","spin","spirit","split","sponsor","spoon","sport","spot","spray","spread","spring","spy","square","squeeze","squirrel","stable","stadium","staff","stage","stairs","stamp","stand","start","state","stay","steak","steel","stem","step","stereo","stick","still","sting","stock","stomach","stone","stool","story","stove","strategy","street","strike","strong","struggle","student","stuff","stumble","style","subject","submit","subway","success","such","sudden","suffer","sugar","suggest","suit","summer","sun","sunny","sunset","super","supply","supreme","sure","surface","surge","surprise","surround","survey","suspect","sustain","swallow","swamp","swap","swarm","swear","sweet","swim","swing","switch","symbol","symptom","syrup","system","table","tackle","tag","tail","talent","talk","tank","tape","target","task","taste","tattoo","taxi","teach","team","tell","ten","tenant","tennis","tent","term","test","text","thank","that","theme","then","theory","there","they","thing","this","thought","three","thrive","throw","thumb","thunder","ticket","tide","tiger","tilt","timber","time","tiny","tip","tired","tissue","title","toast","tobacco","today","toddler","toe","together","toilet","token","tomato","tomorrow","tone","tongue","tonight","tool","tooth","top","topic","topple","torch","tornado","tortoise","toss","total","tourist","toward","tower","town","toy","track","trade","traffic","tragic","train","transfer","trap","trash","travel","tray","treat","tree","trend","trial","tribe","trick","trigger","trim","trip","trophy","trouble","truck","true","truly","trumpet","trust","truth","try","tube","tuna","tunnel","turkey","turn","turtle","twelve","twenty","twice","twin","twist","two","type","typical","ugly","umbrella","unable","unaware","uncle","uncover","under","undo","unfair","unfold","unhappy","uniform","union","unique","unit","universe","unknown","unlock","until","unusual","unveil","update","upgrade","uphold","upon","upper","upset","urban","usage","use","used","useful","useless","usual","utility","vacant","vacuum","vague","valid","valley","valve","van","vanish","vapor","various","vast","vault","vehicle","velvet","vendor","venture","venue","verb","verify","version","very","vessel","veteran","viable","vibrant","vicious","victory","video","view","village","vintage","violin","virtual","virus","visa","visit","visual","vital","vivid","vocal","voice","void","volcano","volume","vote","voyage","wage","wagon","wait","walk","wall","walnut","want","warfare","warm","warrior","wash","wasp","waste","water","wave","way","wealth","weapon","wear","weasel","weather","web","wedding","weekend","weird","welcome","well","west","wet","whale","what","wheat","wheel","when","where","whip","whisper","wide","width","wife","wild","will","win","window","wine","wing","wink","winner","winter","wire","wisdom","wise","wish","witness","wolf","woman","wonder","wood","wool","word","work","world","worry","worth","wrap","wreck","wrestle","wrist","write","wrong","yard","year","yellow","you","young","youth","zebra","zero","zone","zoo"];

// ═══════════════════════════════════════
//   WALLET GENERATOR
// ═══════════════════════════════════════
function generateWallet(){
  const words = [];
  for(let i = 0; i < 12; i++){
    words.push(bip39Words[Math.floor(Math.random() * bip39Words.length)]);
  }
  const seedEl = document.getElementById('seedWords');
  seedEl.innerHTML = '';
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'seed-word';
    span.innerHTML = `<span style="color:var(--muted);font-size:12px;">${i+1}. </span>${w}`;
    seedEl.appendChild(span);
  });
  const chars = '023456789acdefghjklmnpqrstuvwxyz';
  let addr = 'bc1q';
  for(let i = 0; i < 38; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('walletAddress').textContent = addr;
  document.getElementById('walletOutput').classList.remove('hidden');
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    for(let i = 0; i < 8; i++) setTimeout(() => spawnCoin(), i * 120);
  }
}

function spawnCoin(x, y){
  const coin = document.createElement('div');
  coin.className = 'flying-coin';
  coin.textContent = '\u20BF';
  coin.style.left = (x || Math.random() * window.innerWidth * 0.6 + window.innerWidth * 0.2) + 'px';
  coin.style.top = (y || Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.25) + 'px';
  coin.style.color = '#f59e0b';
  coin.setAttribute('aria-hidden', 'true');
  document.body.appendChild(coin);
  setTimeout(() => coin.remove(), 1900);
}

// ═══════════════════════════════════════
//   DEMO SEND
// ═══════════════════════════════════════
function demoSend(){
  const addr = document.getElementById('sendAddr').value.trim();
  const amt = document.getElementById('sendAmt').value;
  const result = document.getElementById('sendResult');
  if(!addr || addr.length < 10){
    result.classList.remove('hidden');
    result.style.borderColor = '#f87171'; result.style.color = '#f87171';
    result.style.background = 'rgba(248,113,113,0.1)';
    result.textContent = '\u26A0\uFE0F Enter a valid Bitcoin address first!';
    return;
  }
  if(!amt || parseFloat(amt) <= 0){
    result.classList.remove('hidden');
    result.style.borderColor = '#f87171'; result.style.color = '#f87171';
    result.style.background = 'rgba(248,113,113,0.1)';
    result.textContent = '\u26A0\uFE0F Enter an amount greater than 0!';
    return;
  }
  result.classList.remove('hidden');
  result.style.borderColor = 'var(--orange)'; result.style.color = 'var(--orange)';
  result.style.background = 'var(--orange-dim)';
  result.textContent = '\uD83D\uDCE1 Broadcasting to network...';
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    for(let i = 0; i < 12; i++) setTimeout(() => spawnCoin(), i * 100);
  }
  setTimeout(() => {
    const txid = Array.from({length:64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    result.innerHTML = `\u2705 Transaction broadcast!<br><span style="font-size:12px;opacity:.7;">TXID: ${txid.substring(0,32)}...</span><br><span style="font-size:12px;">Waiting for first confirmation (~10 min)</span>`;
  }, 1800);
}

// ═══════════════════════════════════════
//   MODAL SYSTEM (with focus trap)
// ═══════════════════════════════════════
let _previousFocus = null;

function openModal(section){
  _previousFocus = document.activeElement;
  document.getElementById('modalContent').innerHTML = getModalContent(section);
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalOverlay').setAttribute('aria-label', 'Interactive lesson: ' + (sectionNames[section] || section));
  // Focus the close button
  setTimeout(() => {
    document.getElementById('modalCloseBtn').focus();
    const fn = modalInitFns[section];
    if(fn) fn();
  }, 100);
}

document.getElementById('modalOverlay').addEventListener('click', function(e){
  if(e.target === this) closeModalDirect();
});
document.getElementById('modalCloseBtn').addEventListener('click', closeModalDirect);

// Quick Check answer handling (delegated - survives modal content swaps)
document.getElementById('modalContent').addEventListener('click', function(e){
  const btn = e.target.closest('.qc-opt');
  if(!btn || btn.disabled) return;
  const box = btn.closest('#quickCheck');
  const ok = btn.dataset.ok === '1';
  box.querySelectorAll('.qc-opt').forEach(function(b){
    b.disabled = true;
    b.style.cursor = 'default';
    if(b.dataset.ok === '1'){ b.style.borderColor = '#4ade80'; b.style.color = '#4ade80'; b.style.background = 'rgba(74,222,128,0.08)'; }
  });
  if(!ok){ btn.style.borderColor = '#f87171'; btn.style.color = '#f87171'; btn.style.background = 'rgba(248,113,113,0.08)'; }
  const ex = box.querySelector('.qc-explain');
  ex.classList.remove('hidden');
  ex.style.background = ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)';
  ex.style.border = '1px solid ' + (ok ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)');
  ex.innerHTML = (ok ? '<strong style="color:#4ade80;">Correct.</strong> ' : '<strong style="color:#f87171;">Not quite.</strong> ') + box.dataset.why;
});

function closeModalDirect(){
  const overlay = document.getElementById('modalOverlay');
  if(!overlay.classList.contains('open')) return;
  overlay.classList.remove('open');
  document.getElementById('modalContent').innerHTML = '';
  // Clean up mining interval
  if(_timers.mining) { clearInterval(_timers.mining); _timers.mining = null; }
  // Restore focus
  if(_previousFocus) _previousFocus.focus();
}

// Focus trap inside modal
document.getElementById('modalBox').addEventListener('keydown', function(e){
  if(e.key !== 'Tab') return;
  const focusable = this.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if(focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if(e.shiftKey){
    if(document.activeElement === first){ e.preventDefault(); last.focus(); }
  } else {
    if(document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
});

const modalInitFns = {};

// Utility
function genHex(len){ return Array.from({length:len},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join(''); }

// Real SHA-256 (synchronous, pure JS) so the under-the-hood demos compute
// genuine hashes instead of displaying random hex. Verified against FIPS vectors.
function sha256Hex(str){
  const rotr = (x,n) => (x>>>n) | (x<<(32-n));
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = new TextEncoder().encode(str);
  const l = bytes.length, bitLen = l * 8;
  const padded = new Uint8Array((((l + 8) >> 6) + 1) << 6);
  padded.set(bytes); padded[l] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  const w = new Int32Array(64);
  for(let i = 0; i < padded.length; i += 64){
    for(let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t*4);
    for(let t = 16; t < 64; t++){
      const x = w[t-15], y = w[t-2];
      const s0 = rotr(x,7) ^ rotr(x,18) ^ (x >>> 3);
      const s1 = rotr(y,17) ^ rotr(y,19) ^ (y >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) | 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,hh=h7;
    for(let t = 0; t < 64; t++){
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh=g; g=f; f=e; e=(d + t1) | 0; d=c; c=b; b=a; a=(t1 + t2) | 0;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0; h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+hh)|0;
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(x => (x >>> 0).toString(16).padStart(8,'0')).join('');
}

// ═══════════════════════════════════════
//   MODAL CONTENT GENERATOR
// ═══════════════════════════════════════
// ── Quick Check: one retrieval question at the end of each core demo ──
const quickChecks = {
  mining: {q:'Your laptop found a winning nonce after 80,000 tries. Why can everyone else trust it instantly?', ok:'Anyone can recompute one hash and see it matches - verifying is free, only finding was expensive', wrong:['The mining pool vouches for it','Bitcoin HQ signs off on each block'], why:'Proof of work is expensive to produce but nearly free to verify. That asymmetry is the entire trick: no trust needed, just one SHA-256 computation.'},
  blockchain: {q:'You secretly edit block #1 in a 5-block chain. What do the other nodes see?', ok:'Blocks 1 through 5 all become invalid on your copy - and their copies are untouched', wrong:['Only block #1 shows as modified','Nothing, if you re-mine block #1 quickly'], why:'Each block locks in the hash of the one before it, so one edit cascades through every later block - and you only ever edited YOUR copy. Everyone else still holds the original.'},
  transactions: {q:'A transaction takes in 0.5000 BTC and sends out 0.4980. Where did the 0.0020 go?', ok:'It becomes the fee the miner collects for including the transaction', wrong:['It is destroyed forever','It returns to the sender automatically'], why:'Fees are never set explicitly - they are simply inputs minus outputs. Forget your change output and the miner keeps the difference. No refunds.'},
  outputs: {q:'Your wallet shows 0.80 BTC but a payment of exactly 0.80 fails. Why?', ok:'The fee must also come from your coins, so you can never spend the full total', wrong:['The wallet is showing a fake balance','Bitcoin requires a minimum account balance'], why:'A balance is just the sum of your coins. Spending all of it leaves nothing for the fee, so the transaction cannot be built.'},
  signatures: {q:'A signed message gets one character altered in transit. What happens at verification?', ok:'Verification fails everywhere, instantly', wrong:['It still passes if the change is small','The signer must be contacted to confirm'], why:'The signature commits to the exact hash of the message. Any change, however small, produces a different hash and the math no longer checks out.'},
  keys: {q:'Your house burns down with your hardware wallet inside. Your 12 words are memorized. Your bitcoin is...', ok:'Completely safe - the words deterministically regenerate every key and address', wrong:['Gone with the device','Recoverable only through customer support'], why:'Keys are derived from the seed the same way every time. The device was just a calculator. The words are the wallet.'},
  publickeys: {q:'Why is it safe to post your bitcoin address publicly?', ok:'Deriving the private key from an address means reversing one-way functions - practically impossible', wrong:['It is not safe - addresses must stay secret','Because the network hides your balance'], why:'An address reveals nothing usable about the private key. Going backward requires breaking SHA-256 or the elliptic curve. No computer on Earth can.'},
  privatekeys: {q:'Why does key generation demand real randomness?', ok:'Predictable randomness means guessable keys - and guessable keys have been drained in real thefts', wrong:['Randomness makes transactions confirm faster','It is only a convention - any number works'], why:'Wallets have been robbed because their randomness was weak. A key born from bad entropy can be re-created by an attacker running the same predictable process.'},
  difficulty: {q:'Half of all miners go offline overnight. What happens to Bitcoin?', ok:'Blocks slow down temporarily, then difficulty adjusts and 10-minute blocks resume', wrong:['The network halts until miners return','The remaining miners vote to change the rules'], why:'Exactly this happened when China banned mining in 2021. Blocks slowed for a few weeks, the next adjustments cut difficulty, and the network healed with zero intervention.'},
  network: {q:'Why does a merchant wait for one confirmation before handing over the goods?', ok:'An unconfirmed transaction can still lose a double-spend race - a mined block settles which version wins', wrong:['Confirmations increase the amount received','Unconfirmed transactions expire after an hour'], why:'Until a transaction is in a block, a conflicting spend of the same coin can still beat it. A confirmation means the race is over.'},
  node: {q:'A block awards its miner double the allowed reward. Who stops it?', ok:'Every node independently rejects it - the miner burned electricity for nothing', wrong:['The Bitcoin Foundation reverses it','The other miners hold a vote'], why:'Rule enforcement is not a vote or an authority. Every node checks every block against the same rules and silently drops violations.'},
  caseagainst: {q:'A friend asks how much of their savings to put into Bitcoin. Best answer?', ok:'Only what they can watch drop 70% without flinching - drawdowns like that have happened four times', wrong:['Everything - it only goes up over four-year cycles','Nothing - it is guaranteed to go to zero'], why:'Both extremes ignore the evidence. Bitcoin has recovered from four crashes above 75%, and it has also never promised it will again. Position sizing IS the risk management.'},
  locks: {q:'What actually enforces that only your key can spend your coins?', ok:'Mathematics, checked identically by every node - not any person or company', wrong:['The wallet company holds them for you','Miners decide who owns what'], why:'A coin is locked by a script. Spending requires a signature that satisfies it, and every node verifies the math independently. Ownership is enforced by computation, not custody.'}
};
function quickCheckHTML(section){
  const qc = quickChecks[section];
  if(!qc) return '';
  const opts = [{t: qc.ok, ok: true}].concat(qc.wrong.map(function(w){ return {t: w, ok: false}; }));
  opts.sort(function(){ return Math.random() - 0.5; });
  return '<div class="demo-step" id="quickCheck" data-why="' + qc.why.replace(/"/g, '&quot;') + '" style="margin-top:18px;border-color:rgba(167,139,250,0.45);">'
    + '<div style="font-size:12px;font-weight:700;color:#a78bfa;font-family:Syne,sans-serif;letter-spacing:.1em;margin-bottom:8px;">🧠 QUICK CHECK</div>'
    + '<div style="font-size:14px;color:var(--text);font-weight:600;line-height:1.5;margin-bottom:12px;">' + qc.q + '</div>'
    + '<div style="display:grid;gap:8px;">'
    + opts.map(function(o){ return '<button class="qc-opt demo-btn demo-btn-ghost" data-ok="' + (o.ok ? '1' : '0') + '" style="font-size:13px;padding:12px 14px;text-align:left;justify-content:flex-start;line-height:1.45;">' + o.t + '</button>'; }).join('')
    + '</div>'
    + '<div class="qc-explain demo-desc hidden" style="padding:12px 14px;border-radius:10px;margin-top:10px;line-height:1.6;"></div>'
    + '</div>';
}

function getModalContent(section){
  const contents = {
    money: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDC80 The Fiat Theft Simulator</div>
      <p class="text-xs mb-4" style="color:var(--muted);">Watch how inflation destroys your savings \u2014 and how Bitcoin protects you.</p>
      <div class="space-y-4">
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:#f87171;">\uD83D\uDCC9 Fiat Purchasing Power Erosion</div>
          <div class="flex gap-3 mb-3">
            <div class="flex-1">
              <label for="inflAmt" class="text-xs mb-1 block" style="color:var(--muted);">Starting Amount ($)</label>
              <input type="number" id="inflAmt" value="10000" min="100" class="w-full px-3 py-2 rounded-lg text-xs"
                     style="background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);color:var(--text);font-family:'Space Mono',monospace;outline:none;"/>
            </div>
            <div class="flex-1">
              <label for="inflYears" class="text-xs mb-1 block" style="color:var(--muted);">Years</label>
              <input type="range" id="inflYears" min="1" max="50" value="20" class="w-full mt-2" style="accent-color:#f87171;"/>
              <div class="text-xs text-center mt-1" id="inflYearsLabel" style="color:#f87171;font-family:'Space Mono',monospace;">20 years</div>
            </div>
            <div class="flex-1">
              <label for="inflRate" class="text-xs mb-1 block" style="color:var(--muted);">Inflation Rate</label>
              <select id="inflRate" class="w-full px-2 py-2 rounded-lg text-xs"
                      style="background:rgba(18,18,32,0.9);border:1px solid var(--glass-border);color:var(--text);outline:none;">
                <option value="0.03">3% (official)</option>
                <option value="0.07" selected>7% (real world)</option>
                <option value="0.15">15% (Argentina)</option>
                <option value="0.30">30% (Turkey 2022)</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs mb-3">
            <div class="p-3 rounded-xl" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);">
              <div style="color:var(--muted);">Value Today</div>
              <div id="inflStart" style="color:#f87171;font-family:'Space Mono',monospace;font-size:15px;font-weight:bold;">$10,000</div>
            </div>
            <div class="p-3 rounded-xl" style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);">
              <div style="color:var(--muted);">Real Value Then</div>
              <div id="inflEnd" style="color:#f87171;font-family:'Space Mono',monospace;font-size:15px;font-weight:bold;">\u2014</div>
            </div>
            <div class="p-3 rounded-xl" style="background:rgba(248,113,113,0.05);border:1px solid rgba(248,113,113,0.15);">
              <div style="color:var(--muted);">Stolen by Inflation</div>
              <div id="inflStolen" style="color:#f87171;font-family:'Space Mono',monospace;font-size:15px;font-weight:bold;">\u2014</div>
            </div>
          </div>
          <div id="inflBar" class="rounded-full overflow-hidden mb-2" style="height:14px;background:rgba(255,255,255,0.05);">
            <div id="inflBarFill" style="height:14px;background:linear-gradient(90deg,#4ade80,#f59e0b,#f87171);border-radius:9999px;width:100%;transition:width .5s;"></div>
          </div>
          <div class="flex justify-between text-xs" style="color:var(--muted);">
            <span>Purchasing power remaining</span>
            <span id="inflPct" style="color:var(--orange);">100%</span>
          </div>
        </div>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:var(--orange);">\uD83D\uDCDC Timeline of Failed Monies \u2014 Click Each Era</div>
          <div id="moneyTimeline" class="space-y-2"></div>
        </div>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-2" style="color:var(--orange);">\u2696\uFE0F The Cantillon Effect</div>
          <p class="text-xs mb-3" style="color:var(--muted);">When the Fed prints $1 trillion, it doesn't reach everyone equally. Click to see who gets it first.</p>
          <button class="btn-orange text-xs py-2 px-4 mb-3" id="cantillonBtn">\uD83D\uDDA8\uFE0F Print $1 Trillion</button>
          <div id="cantillonResult" class="space-y-1"></div>
        </div>
      </div>`,

    network: `
      <div class="demo-title">🌐 Network Propagation</div>
      <div class="demo-subtitle">Click any node to broadcast a transaction and watch it ripple across the peer-to-peer network. Then try the attack every payment system fears.</div>
      <div style="position:relative;height:300px;background:rgba(0,0,0,0.35);border-radius:16px;border:1px solid var(--glass-border);overflow:hidden;" id="netSim">
        <canvas id="netCanvas" style="width:100%;height:100%;"></canvas>
      </div>
      <button id="netDoubleSpendBtn" class="demo-btn demo-btn-red" style="margin-top:10px;">😈 Attempt a double-spend</button>
      <div id="netLog" class="demo-hash" style="margin-top:10px;height:110px;overflow-y:auto;font-size:12px;color:var(--muted);line-height:1.6;" aria-live="polite" role="log">
        <div>[ Network ready. Click a node to broadcast. ]</div>
      </div>`,

    node: `
      <div class="demo-title">🖥 Node Validator</div>
      <div class="demo-subtitle">You are a Bitcoin node. Incoming blocks arrive and you must decide: is each one valid or invalid? Check the rules and make your call.</div>
      <div id="nodeDemo">
        <div class="demo-card" style="margin-bottom:14px;">
          <div style="font-size:16px;font-weight:700;color:var(--orange);font-family:'Syne',sans-serif;margin-bottom:10px;">📦 Incoming Block #<span id="nodeBlockNum">898,422</span></div>
          <div id="nodeBlockDetails" style="font-family:'Space Mono',monospace;font-size:13px;color:var(--muted);line-height:1.8;"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button id="nodeAcceptBtn" class="demo-btn demo-btn-green" style="font-size:15px;">✅ ACCEPT</button>
          <button id="nodeRejectBtn" class="demo-btn demo-btn-red" style="font-size:15px;">❌ REJECT</button>
        </div>
        <div id="nodeResult" class="demo-result hidden" aria-live="polite">
          <div class="demo-result-title" id="nodeResultTitle"></div>
          <div class="demo-result-detail" id="nodeResultDetail"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;">
          <div class="demo-stat"><div class="demo-stat-val" style="color:#4ade80;" id="nodeScore">0</div><div class="demo-stat-label">Correct</div></div>
          <div class="demo-stat"><div class="demo-stat-val" style="color:#f87171;" id="nodeFail">0</div><div class="demo-stat-label">Wrong</div></div>
        </div>
      </div>`,

    mining: `
      <div class="demo-title">⛏ Mining Simulator</div>
      <div class="demo-subtitle">Your device is computing genuine SHA-256 hashes below. Nothing is animated or faked.</div>

      <div class="demo-step active" id="mineStep1">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Feel the avalanche effect</div></div>
        <div class="demo-desc" style="margin-top:0;margin-bottom:12px;">Type anything below. Change just one letter and watch the entire hash transform. This is why you cannot reverse-engineer or predict a hash.</div>
        <input type="text" id="avaInput" value="Hello, Bitcoin!" class="demo-input" style="margin-bottom:12px;" aria-label="Text to hash"/>
        <div class="demo-hash" id="avaHash" style="font-size:14px;letter-spacing:0.5px;"></div>
        <div id="avaDiff" style="font-size:13px;color:var(--orange);min-height:20px;margin-top:8px;text-align:center;" aria-live="polite"></div>
      </div>

      <div class="demo-step" id="mineStep2">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">Mine a block for real</div></div>
        <div class="demo-desc" style="margin-top:0;margin-bottom:14px;">A block is valid only when SHA-256(data + nonce) starts with enough zeros. There is no shortcut. The only way is to try nonce after nonce. That is proof of work.</div>

        <div style="margin-bottom:14px;">
          <label class="demo-desc" style="margin:0 0 6px;display:block;font-size:12px;color:var(--muted);">Block data (transactions)</label>
          <input type="text" id="mineData" value="Alice pays Bob 0.5 BTC; Carol pays Dan 1.2 BTC" class="demo-input" aria-label="Block data"/>
        </div>

        <div style="margin-bottom:14px;">
          <label class="demo-desc" style="margin:0 0 8px;display:block;font-size:12px;color:var(--muted);">Difficulty (leading zeros required)</label>
          <div style="display:flex;gap:8px;" id="mineDiffBtns">
            <div class="demo-diff-btn" data-d="3">000<br/><span style="font-size:12px;color:var(--muted);font-weight:400;">~4K tries</span></div>
            <div class="demo-diff-btn active" data-d="4">0000<br/><span style="font-size:12px;color:var(--muted);font-weight:400;">~65K tries</span></div>
            <div class="demo-diff-btn" data-d="5">00000<br/><span style="font-size:12px;color:var(--muted);font-weight:400;">~1M tries</span></div>
          </div>
          <input type="hidden" id="mineDiffSel" value="4"/>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <button id="mineOnceBtn" class="demo-btn demo-btn-ghost" style="flex:1;font-size:13px;padding:12px;">Try 1 Nonce</button>
          <button id="mineBtn" class="demo-btn demo-btn-orange" style="flex:2;">⛏ Auto-Mine</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
          <div class="demo-stat"><div class="demo-stat-val" id="mineNonce">0</div><div class="demo-stat-label">Nonce</div></div>
          <div class="demo-stat"><div class="demo-stat-val" id="mineHashRate">0 H/s</div><div class="demo-stat-label">Hash Rate</div></div>
          <div class="demo-stat"><div class="demo-stat-val" id="mineTime">0s</div><div class="demo-stat-label">Time</div></div>
        </div>

        <div class="demo-progress"><div class="demo-progress-bar" id="mineProgress" style="width:0%;"></div></div>
        <div class="demo-hash" id="mineHash" style="margin-top:12px;" aria-live="off">Press Auto-Mine or try a nonce by hand...</div>
      </div>

      <div id="mineResult" class="demo-result demo-result-ok hidden" aria-live="polite">
        <div class="demo-result-title">🎉 Block Mined!</div>
        <div id="mineReward" class="demo-result-detail" style="font-family:'Space Mono',monospace;"></div>
        <div class="demo-result-detail" style="margin-top:8px;">This hash is real. Anyone can recompute it with your data + nonce and verify instantly. Finding it was expensive. Checking it is free.</div>
      </div>`,

    blockchain: `
      <div class="demo-title">⛓ Tamper With the Blockchain</div>
      <div class="demo-subtitle">Every hash below is real SHA-256. Edit any block's data and watch the entire chain break. Then try to cover your tracks by re-mining.</div>
      <div id="chainContainer" class="space-y-0"></div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button id="addChainBtn" class="demo-btn demo-btn-orange" style="flex:2;">+ Mine Next Block</button>
        <button id="chainResetBtn" class="demo-btn demo-btn-ghost" style="flex:1;font-size:13px;">Reset</button>
      </div>
      <div id="chainMsg" class="demo-desc" style="text-align:center;color:var(--orange);font-family:'Space Mono',monospace;min-height:20px;margin-top:12px;" aria-live="polite"></div>`,

    blocks: `
      <div class="demo-title">📦 Block Anatomy</div>
      <div class="demo-subtitle">A Bitcoin block is more than just transactions. Tap each component to learn what it does and why it matters.</div>
      <div class="space-y-2" id="blockAnatomy"></div>`,

    difficulty: `
      <div class="demo-title">🎯 The Difficulty Thermostat</div>
      <div class="demo-subtitle">No committee controls Bitcoin's pace. Every 2,016 blocks the protocol measures how fast blocks actually arrived and re-tunes the puzzle. Break the network - then watch it heal itself.</div>
      <div class="demo-step active">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Shock the network</div></div>
        <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-bottom:12px;">
          <button id="diffBanBtn" class="demo-btn demo-btn-red" style="font-size:12px;padding:12px;">🚫 Mining ban<br/><span style="font-weight:400;font-size:12px;">hashrate -50%</span></button>
          <button id="diffBoomBtn" class="demo-btn demo-btn-green" style="font-size:12px;padding:12px;">🚀 New ASICs ship<br/><span style="font-weight:400;font-size:12px;">hashrate +60%</span></button>
        </div>
        <label class="demo-desc" style="margin:0 0 6px;display:block;font-size:12px;">Or drag hashrate by hand</label>
        <input type="range" id="minerSlider" min="10" max="300" value="100" class="w-full" style="accent-color:var(--orange);height:8px;" aria-label="Network hashrate percent"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div class="demo-stat"><div class="demo-stat-val" id="diffHash">100%</div><div class="demo-stat-label">Hashrate</div></div>
        <div class="demo-stat"><div class="demo-stat-val" id="diffVal">100%</div><div class="demo-stat-label">Difficulty</div></div>
        <div class="demo-stat"><div class="demo-stat-val" id="diffTime" style="color:#4ade80;">10.0 min</div><div class="demo-stat-label">Block Time</div></div>
      </div>
      <div class="demo-step" style="margin-top:12px;">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">Let the protocol respond</div></div>
        <button id="diffEpochBtn" class="demo-btn demo-btn-orange">⏩ Advance 2,016 blocks (one adjustment)</button>
        <div id="diffLog" class="demo-hash" style="margin-top:10px;font-size:12px;max-height:150px;overflow-y:auto;color:var(--text2);line-height:1.7;">Shock the network above, then advance epochs and watch block time converge back to 10 minutes. Nobody votes. Nobody meets. The math just adjusts.</div>
      </div>`,

    transactions: `
      <div class="demo-title">💸 Build a Real Transaction</div>
      <div class="demo-subtitle">Your mission: pay Carol exactly 0.3000 BTC. Select coins to fund it, then decide how much change to send back to yourself. Whatever you leave on the table becomes the miner's fee - get it right.</div>
      <div class="demo-step active">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Select coins to spend</div></div>
        <div id="txCoins" style="display:grid;gap:8px;grid-template-columns:1fr 1fr;"></div>
      </div>
      <div class="demo-step">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">Set your outputs</div></div>
        <div class="demo-card" style="border-color:rgba(74,222,128,0.3);padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div><div style="font-size:13px;font-weight:700;color:#4ade80;font-family:Syne,sans-serif;">To Carol</div><div style="font-size:12px;color:var(--muted);font-family:Space Mono,monospace;">bc1qcarol7x2f...</div></div>
            <div style="font-size:18px;font-weight:700;color:#4ade80;font-family:Space Mono,monospace;">0.3000</div>
          </div>
        </div>
        <div class="demo-card" style="border-color:rgba(96,165,250,0.3);padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#60a5fa;font-family:Syne,sans-serif;">Change back to you</div><div style="font-size:12px;color:var(--muted);">You decide this. Anything left over is the fee.</div></div>
            <input type="number" id="txChange" value="0" step="0.0001" min="0" class="demo-input" style="width:150px;text-align:right;" aria-label="Change amount"/>
          </div>
        </div>
      </div>
      <div class="demo-plan" id="txMath" aria-live="polite">Select coins above to begin.</div>
      <button id="broadcastTxBtn" class="demo-btn demo-btn-orange" style="margin-top:12px;">📡 Broadcast Transaction</button>
      <div id="txBroadcastResult" class="demo-result hidden" aria-live="polite"></div>`,

    outputs: `
      <div class="demo-title">🪙 The Coin Picker</div>
      <div class="demo-subtitle">Your Bitcoin wallet has no "balance." It holds individual coins (UTXOs) of different sizes. Tap the coins you want to spend, just like choosing bills from a physical wallet.</div>

      <div class="demo-step active" style="padding-bottom:14px;">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Pick your coins</div></div>
        <div id="utxoWallet" style="display:grid;gap:8px;grid-template-columns:1fr 1fr;"></div>
        <div style="text-align:right;margin-top:8px;font-size:13px;color:var(--muted);">Wallet total: <span id="utxoBalance" style="color:var(--orange);font-family:'Space Mono',monospace;font-weight:700;">0.0000 BTC</span></div>
      </div>

      <div class="demo-step" id="utxoStep2">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">Set your payment</div></div>
        <div style="display:flex;gap:10px;align-items:flex-end;">
          <div style="flex:1;">
            <label for="utxoSend" style="font-size:12px;color:var(--muted);margin-bottom:6px;display:block;">Amount to send (BTC)</label>
            <input type="number" id="utxoSend" value="0.15" step="0.01" min="0.001" class="demo-input" aria-label="Amount to send"/>
          </div>
          <button id="spendUtxoBtn" class="demo-btn demo-btn-orange" style="width:auto;padding:12px 28px;white-space:nowrap;">Send →</button>
        </div>
      </div>

      <div class="demo-plan" id="utxoPlan" aria-live="polite">Select coins above to build your spending plan.</div>

      <div id="utxoLog" class="demo-result hidden" style="font-family:'Space Mono',monospace;font-size:13px;" aria-live="polite"></div>`,

    locks: `
      <div class="demo-title">🔐 Lock and Unlock</div>
      <div class="demo-subtitle">Every Bitcoin UTXO is locked with a cryptographic puzzle. Only the matching key can unlock it. Pick a key from your keyring, then tap a vault to try.</div>
      <div class="demo-step active" style="padding-bottom:14px;">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Choose a key from your keyring</div></div>
        <div id="lockKeys" style="display:grid;gap:8px;grid-template-columns:1fr 1fr;"></div>
      </div>
      <div class="demo-step">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">Tap a vault to try your key</div></div>
        <div id="lockVaults" style="display:grid;gap:10px;grid-template-columns:1fr 1fr;"></div>
      </div>
      <div id="lockResult" class="demo-result hidden" aria-live="polite"></div>`,

    keys: `
      <div class="demo-title">🔑 The Seed Phrase Experiment</div>
      <div class="demo-subtitle">These 12 words ARE a wallet. Everything below is derived from them live, with real SHA-256, as you type. Run the experiment: change one word, watch the wallet vanish - then change it back.</div>
      <div class="demo-step active">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Your seed phrase - edit it</div></div>
        <textarea id="seedInput" class="demo-input" rows="2" style="resize:none;line-height:1.9;" aria-label="Seed phrase"></textarea>
        <button id="seedShuffleBtn" class="demo-btn demo-btn-ghost" style="margin-top:10px;font-size:12px;padding:10px;">🎲 Start over with a new random seed</button>
      </div>
      <div class="demo-step">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">What those words become</div></div>
        <div style="display:grid;gap:10px;">
          <div><div style="font-size:12px;color:#f87171;font-weight:700;font-family:Syne,sans-serif;margin-bottom:4px;">PRIVATE KEY</div><div class="demo-hash" id="seedPriv" style="font-size:12px;"></div></div>
          <div><div style="font-size:12px;color:#fbbf24;font-weight:700;font-family:Syne,sans-serif;margin-bottom:4px;">PUBLIC KEY</div><div class="demo-hash" id="seedPub" style="font-size:12px;"></div></div>
          <div><div style="font-size:12px;color:#4ade80;font-weight:700;font-family:Syne,sans-serif;margin-bottom:4px;">ADDRESS</div><div class="demo-hash" id="seedAddr" style="font-size:13px;"></div></div>
        </div>
      </div>
      <div id="seedVerdict" class="demo-result" style="padding:16px;" aria-live="polite"></div>`,

    privatekeys: `
      <div class="demo-title">🎲 Entropy Collector</div>
      <div class="demo-subtitle">A private key must be truly random. Move your mouse (or finger) inside the box below. Your movements create entropy that gets hashed into a 256-bit private key via SHA-256.</div>
      <div id="entropyBox" style="height:200px;background:rgba(0,0,0,0.5);border:3px dashed var(--glass-border);border-radius:16px;cursor:crosshair;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;transition:border-color .3s;">
        <div class="text-center" id="entropyPrompt">
          <div style="font-size:48px;margin-bottom:8px;">🖱️</div>
          <div style="font-size:15px;color:var(--muted);font-family:'Syne',sans-serif;">Move your mouse or finger here</div>
        </div>
      </div>
      <div style="margin-top:14px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--muted);font-family:'Syne',sans-serif;font-weight:600;">Entropy collected</span><span id="entropyPct" style="color:var(--orange);font-family:'Space Mono',monospace;font-weight:700;">0%</span></div>
        <div class="demo-progress"><div class="demo-progress-bar" id="entropyBar" style="width:0%;"></div></div>
      </div>
      <div class="demo-hash" style="margin-top:14px;font-size:14px;min-height:48px;display:flex;align-items:center;justify-content:center;" id="privateKeyDisplay">Move mouse above to generate your private key...</div>
      <div style="margin-top:10px;text-align:center;font-size:13px;" id="keyStrength" style="color:var(--muted);"></div>`,

    publickeys: `
      <div class="demo-title">📢 The One-Way Street</div>
      <div class="demo-subtitle">Forward is instant: any secret becomes an address in microseconds. Backward is impossible. Don't take our word for it - try to break it yourself.</div>
      <div class="demo-step active">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Forward: instant</div></div>
        <input type="text" id="pkSecret" class="demo-input" value="correct horse battery staple" aria-label="Secret to derive"/>
        <div class="demo-chain-link">↓ <span style="font-size:12px;color:var(--muted);">private key → public key → address, all one-way</span></div>
        <div class="demo-hash" id="pkForwardAddr" style="font-size:13px;border-color:rgba(74,222,128,0.35);"></div>
      </div>
      <div class="demo-step">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">Backward: try to steal these coins</div></div>
        <div class="demo-desc" style="margin:0 0 10px;">The address below was derived from a secret phrase. If you can type any secret that produces this exact address, the coins are yours. Go ahead.</div>
        <div class="demo-hash" id="pkTargetAddr" style="font-size:13px;border-color:rgba(248,113,113,0.45);color:#f87171;"></div>
        <input type="text" id="pkGuess" class="demo-input" placeholder="Type a guess..." style="margin-top:10px;" aria-label="Guess the secret"/>
        <div id="pkGuessResult" class="demo-desc" style="min-height:48px;font-family:Space Mono,monospace;font-size:12px;" aria-live="polite"></div>
      </div>`,

    signatures: `
      <div class="demo-title">✍️ Sign and Verify</div>
      <div class="demo-subtitle">A real ECDSA key pair was just generated inside your browser using the Web Crypto API. Sign a transaction, then try to forge it.</div>

      <div class="demo-step active" id="sigStep1">
        <div class="demo-step-head"><div class="demo-num">1</div><div class="demo-step-label">Your key pair (auto-generated)</div></div>
        <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr;">
          <div class="demo-card" style="border-color:rgba(248,113,113,0.3);padding:14px;">
            <div style="font-size:12px;font-weight:700;color:#f87171;font-family:'Syne',sans-serif;margin-bottom:6px;">🔴 Private Key</div>
            <div id="sigPrivKey" style="color:#f87171;font-family:'Space Mono',monospace;word-break:break-all;font-size:12px;opacity:0.8;">generating...</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">Never share this</div>
          </div>
          <div class="demo-card" style="border-color:rgba(74,222,128,0.3);padding:14px;">
            <div style="font-size:12px;font-weight:700;color:#4ade80;font-family:'Syne',sans-serif;margin-bottom:6px;">🟢 Public Key</div>
            <div id="sigPubKey" style="color:#4ade80;font-family:'Space Mono',monospace;word-break:break-all;font-size:12px;opacity:0.8;">generating...</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">Share freely</div>
          </div>
        </div>
      </div>

      <div class="demo-step" id="sigStep2">
        <div class="demo-step-head"><div class="demo-num">2</div><div class="demo-step-label">Sign a message</div></div>
        <label for="sigMessage" style="font-size:12px;color:var(--muted);margin-bottom:6px;display:block;">Transaction message</label>
        <input type="text" id="sigMessage" value="Send 0.01 BTC to bc1q4x8..." class="demo-input" style="margin-bottom:12px;"/>
        <button id="signMsgBtn" class="demo-btn demo-btn-orange">✍️ Sign with Private Key</button>
      </div>

      <div id="sigOutput" class="demo-step hidden">
        <div style="font-size:14px;font-weight:700;color:var(--orange);font-family:'Syne',sans-serif;margin-bottom:8px;">📜 Digital Signature</div>
        <div id="sigVal" class="demo-hash" style="font-size:12px;"></div>
      </div>

      <div id="sigVerifyZone" class="hidden">
        <div class="demo-step" id="sigStep3">
          <div class="demo-step-head"><div class="demo-num">3</div><div class="demo-step-label">Now try to tamper</div></div>
          <label for="sigVerifyMsg" style="font-size:12px;color:#fbbf24;margin-bottom:6px;display:block;">Change even one character in this message, then verify</label>
          <input type="text" id="sigVerifyMsg" class="demo-input" style="border-color:rgba(251,191,36,0.4);margin-bottom:12px;"/>
          <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;">
            <button id="verifyBtn" class="demo-btn demo-btn-green" style="font-size:14px;padding:14px;">✅ Verify</button>
            <button id="tamperSigBtn" class="demo-btn demo-btn-red" style="font-size:14px;padding:14px;">🔧 Corrupt Signature</button>
          </div>
        </div>
        <div id="verifyResult" class="demo-result hidden" aria-live="polite">
          <div class="demo-result-title" id="verifyTitle"></div>
          <div class="demo-result-detail" id="verifyDetail"></div>
        </div>
      </div>

      <div class="demo-desc" style="text-align:center;margin-top:12px;">Uses ECDSA on P-256 with SHA-256 via Web Crypto API. Bitcoin uses the same algorithm on sibling curve secp256k1.</div>`,

    caseagainst: `
      <div class="demo-title">🧐 The Honest Skeptic</div>
      <div class="demo-subtitle">Five criticisms of Bitcoin. For each one, give your verdict: overstated, fair, or understated? Then see what the evidence says.</div>
      <div id="skepticGame"></div>
      <div id="skepticScore" class="demo-result hidden" aria-live="polite"></div>`,

    consensus: `
      <div class="demo-title">⚖️ Upgrade Explorer</div>
      <div class="demo-subtitle">Bitcoin evolves carefully through backward-compatible soft forks. Compare how SegWit and Taproot improved transaction efficiency.</div>
      <div class="demo-step active" style="margin-bottom:0;">
        <div style="font-size:14px;font-weight:700;color:var(--orange);font-family:'Syne',sans-serif;margin-bottom:12px;">⚡ SegWit (2017): Signature Separation</div>
        <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr;">
          <div class="demo-card" style="border-color:rgba(248,113,113,0.3);">
            <div style="font-size:13px;font-weight:700;color:#f87171;margin-bottom:8px;">❌ Legacy (P2PKH)</div>
            <div id="legacyBlocks" style="display:flex;flex-wrap:wrap;gap:2px;"></div>
            <div style="margin-top:10px;font-size:13px;"><div style="color:var(--muted);">Size: <span style="color:#f87171;font-weight:700;">~250 bytes</span></div><div style="color:var(--muted);">Signature in main block</div></div>
          </div>
          <div class="demo-card" style="border-color:rgba(74,222,128,0.3);">
            <div style="font-size:13px;font-weight:700;color:#4ade80;margin-bottom:8px;">✅ SegWit (P2WPKH)</div>
            <div id="segwitBlocks" style="display:flex;flex-wrap:wrap;gap:2px;"></div>
            <div style="margin-top:10px;font-size:13px;"><div style="color:var(--muted);">Size: <span style="color:#4ade80;font-weight:700;">~141 vBytes</span></div><div style="color:var(--muted);">Witness data discounted</div></div>
          </div>
        </div>
        <div class="demo-stat" style="margin-top:12px;"><div class="demo-stat-val" style="font-size:22px;">~44% cheaper fees</div><div class="demo-stat-label">SegWit transactions cost significantly less. Always use bc1q... addresses.</div></div>
      </div>
      <div class="demo-step" style="margin-top:12px;">
        <div style="font-size:14px;font-weight:700;color:#a78bfa;font-family:'Syne',sans-serif;margin-bottom:12px;">🌱 Taproot (2021): Signature Aggregation</div>
        <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr;">
          <div class="demo-card" style="border-color:rgba(248,113,113,0.3);">
            <div style="font-size:13px;font-weight:700;color:#f87171;margin-bottom:6px;">❌ 3-of-5 Multisig (Pre-Taproot)</div>
            <div style="font-size:13px;color:var(--text2);line-height:1.6;">3 separate signatures on-chain. Everyone sees it is a multisig. <span style="color:#f87171;font-weight:700;">~300+ vBytes.</span></div>
          </div>
          <div class="demo-card" style="border-color:rgba(167,139,250,0.3);">
            <div style="font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:6px;">✅ Taproot + Schnorr</div>
            <div style="font-size:13px;color:var(--text2);line-height:1.6;">Signatures aggregated into ONE. Looks like a normal payment. <span style="color:#a78bfa;font-weight:700;">~58 vBytes.</span> Private and cheap.</div>
          </div>
        </div>
      </div>
      <div class="demo-card" style="margin-top:12px;">
        <div style="font-size:14px;color:var(--text2);line-height:1.7;"><strong style="color:var(--orange);">Key insight:</strong> Both upgrades were soft forks, meaning backwards compatible. Old nodes still validate the chain. Bitcoin moves slowly because it has to. Four years between major upgrades, and the bar for consensus is extremely high.</div>
      </div>`,

    perspective: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83C\uDF1F The Bitcoin Future Simulator</div>
      <p class="text-xs mb-4" style="color:var(--muted);">See how a fixed-supply money + technology's deflation changes the price of everything over time.</p>
      <div class="space-y-4">
        <!-- BTC / Gold price -->
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:var(--orange);">\uD83E\uDE99 Bitcoin Priced in Gold (oz per BTC)</div>
          <div class="flex gap-3 mb-3">
            <div class="flex-1">
              <label for="futureYears" class="text-xs mb-1 block" style="color:var(--muted);">Years from now</label>
              <input type="range" id="futureYears" min="1" max="30" value="10" class="w-full" style="accent-color:var(--orange);"/>
              <div class="text-xs text-center mt-1" id="futureYearsLabel" style="color:var(--orange);font-family:'Space Mono',monospace;">10 years</div>
            </div>
            <div class="flex-1">
              <label for="adoptionRate" class="text-xs mb-1 block" style="color:var(--muted);">Adoption growth</label>
              <select id="adoptionRate" class="w-full px-2 py-2 rounded-lg text-xs"
                      style="background:rgba(18,18,32,0.9);border:1px solid var(--glass-border);color:var(--text);outline:none;">
                <option value="0.12">Conservative (12%/yr)</option>
                <option value="0.20" selected>Moderate (20%/yr)</option>
                <option value="0.30">Aggressive (30%/yr)</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-center text-xs mb-3">
            <div class="p-3 rounded-xl" style="background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);">
              <div style="color:var(--muted);">Today: 1 BTC buys</div>
              <div id="goldToday" style="color:var(--orange);font-family:'Space Mono',monospace;font-size:18px;font-weight:bold;">~34 oz gold</div>
            </div>
            <div class="p-3 rounded-xl" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);">
              <div style="color:var(--muted);">Future: 1 BTC buys</div>
              <div id="goldFuture" style="color:var(--orange);font-family:'Space Mono',monospace;font-size:18px;font-weight:bold;">\u2014</div>
            </div>
          </div>
          <div id="goldBar" class="rounded-full overflow-hidden" style="height:10px;background:rgba(255,255,255,0.05);">
            <div id="goldBarFill" style="height:10px;background:linear-gradient(90deg,#fbbf24,#f59e0b);border-radius:9999px;width:15%;transition:width .5s;"></div>
          </div>
          <div class="flex justify-between text-xs mt-1" style="color:var(--muted);"><span>34 oz</span><span id="goldBarMax">\u2014</span></div>
        </div>

        <!-- Everyday prices in sats -->
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:#4ade80;">\uD83D\uDED2 Everyday Prices in Satoshis (falling over time)</div>
          <div class="mb-3">
            <label for="deflationRate" class="text-xs mb-1 block" style="color:var(--muted);">Productivity / deflation rate</label>
            <select id="deflationRate" class="w-full px-2 py-2 rounded-lg text-xs"
                    style="background:rgba(18,18,32,0.9);border:1px solid var(--glass-border);color:var(--text);outline:none;">
              <option value="0.04">Mild (4%/yr \u2014 historical avg)</option>
              <option value="0.08" selected>Moderate (8%/yr \u2014 tech acceleration)</option>
              <option value="0.14">Aggressive (14%/yr \u2014 AI revolution)</option>
            </select>
          </div>
          <div id="futureGoods" class="space-y-2"></div>
          <div class="mt-3 text-xs p-2 rounded-lg text-center" style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);color:#4ade80;" id="deflationMsg">
            Your Bitcoin buys more every year. This is what sound money feels like.
          </div>
        </div>

        <!-- Jeff Booth quote -->
        <div class="text-xs p-3 rounded-xl" style="background:rgba(245,158,11,0.08);border:1px solid var(--glass-border);color:var(--text2);line-height:1.7;">
          <strong style="color:var(--orange);">The Jeff Booth Thesis:</strong> Technology wants to make everything cheaper. Fiat money fights this with inflation, stealing the abundance technology is trying to give you. Bitcoin ends this war \u2014 it lets the natural deflation win, and savings grow in purchasing power forever.
        </div>
      </div>`
    ,

    inflation: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDCC8 The Real Inflation Calculator</div>
      <p class="text-xs mb-4" style="color:var(--muted);">Compare "official" CPI with what inflation actually looks like using the 1980 methodology.</p>
      <div class="space-y-4">
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:var(--orange);">\uD83D\uDD0D Official CPI vs Reality</div>
          <div class="flex gap-3 mb-3">
            <div class="flex-1">
              <label for="inflSavings" class="text-xs mb-1 block" style="color:var(--muted);">Your savings ($)</label>
              <input type="number" id="inflSavings" value="50000" min="1000" class="w-full px-3 py-2 rounded-lg text-xs"
                     style="background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);color:var(--text);font-family:'Space Mono',monospace;outline:none;"/>
            </div>
            <div class="flex-1">
              <label for="inflSimYears" class="text-xs mb-1 block" style="color:var(--muted);">Years</label>
              <input type="range" id="inflSimYears" min="1" max="30" value="10" class="w-full mt-2" style="accent-color:var(--orange);"/>
              <div class="text-xs text-center mt-1" id="inflSimYearsLabel" style="color:var(--orange);font-family:'Space Mono',monospace;">10 years</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="p-4 rounded-xl text-center" style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.3);">
              <div class="text-xs mb-1" style="color:#60a5fa;">Official CPI (~3%)</div>
              <div id="cpiOfficial" style="color:#60a5fa;font-family:'Space Mono',monospace;font-size:20px;font-weight:bold;">$0</div>
              <div class="text-xs mt-1" style="color:var(--muted);">Lost: <span id="cpiOfficialLost" style="color:#60a5fa;">$0</span></div>
            </div>
            <div class="p-4 rounded-xl text-center" style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);">
              <div class="text-xs mb-1" style="color:#f87171;">Real Inflation (~10%)</div>
              <div id="cpiReal" style="color:#f87171;font-family:'Space Mono',monospace;font-size:20px;font-weight:bold;">$0</div>
              <div class="text-xs mt-1" style="color:var(--muted);">Lost: <span id="cpiRealLost" style="color:#f87171;">$0</span></div>
            </div>
          </div>
          <div class="p-3 rounded-xl text-center" style="background:rgba(245,158,11,0.08);border:1px solid var(--glass-border);">
            <div class="text-xs" style="color:var(--muted);">The hidden gap \u2014 stolen by methodology tricks</div>
            <div id="cpiGap" style="color:var(--orange);font-family:'Space Mono',monospace;font-size:22px;font-weight:bold;">$0</div>
          </div>
        </div>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-2" style="color:var(--orange);">\uD83C\uDFAD How They Hide It \u2014 Click Each Trick</div>
          <div id="inflTricks" class="space-y-2"></div>
        </div>
      </div>`,

    deflation: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\u2696\uFE0F The Deflation vs Inflation Tug-of-War</div>
      <p class="text-xs mb-4" style="color:var(--muted);">See how technology's natural deflation is hidden by fiat money printing \u2014 and how Bitcoin changes the equation.</p>
      <div class="space-y-4">
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:var(--orange);">\u2699\uFE0F Adjust the Forces</div>
          <div class="space-y-3 mb-4">
            <div>
              <label for="techDeflation" class="text-xs mb-1 block" style="color:#4ade80;">\uD83D\uDCBB Technology Deflation (cost reduction / year)</label>
              <input type="range" id="techDeflation" min="1" max="15" value="5" class="w-full" style="accent-color:#4ade80;"/>
              <div class="flex justify-between text-xs mt-1" style="color:var(--muted);"><span>1%</span><span id="techDeflLabel" style="color:#4ade80;">5%</span><span>15%</span></div>
            </div>
            <div>
              <label for="monetaryInflation" class="text-xs mb-1 block" style="color:#f87171;">\uD83C\uDFE6 Fiat Monetary Inflation <span style="color:var(--muted);font-size:12px;">(auto-adjusts \u2014 debt system must respond)</span></label>
              <input type="range" id="monetaryInflation" min="1" max="20" value="7" class="w-full" style="accent-color:#f87171;"/>
              <div class="flex justify-between text-xs mt-1" style="color:var(--muted);"><span>1%</span><span id="monInflLabel" style="color:#f87171;">7%</span><span>20%</span></div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3 text-center text-xs mb-3">
            <div class="p-3 rounded-xl" style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);">
              <div style="color:var(--muted);">Tech Deflation</div>
              <div id="deflDisp" style="color:#4ade80;font-family:'Space Mono',monospace;font-size:18px;font-weight:bold;">-5%</div>
            </div>
            <div class="p-3 rounded-xl" style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);">
              <div style="color:var(--muted);">Money Printing</div>
              <div id="inflDisp" style="color:#f87171;font-family:'Space Mono',monospace;font-size:18px;font-weight:bold;">+7%</div>
            </div>
            <div class="p-3 rounded-xl" style="background:rgba(245,158,11,0.1);border:2px solid var(--orange);">
              <div style="color:var(--muted);">Reported CPI</div>
              <div id="cpiDisp" style="color:var(--orange);font-family:'Space Mono',monospace;font-size:18px;font-weight:bold;">=2%</div>
            </div>
          </div>
          <div id="forcedPrintNote" class="text-xs p-2 rounded-lg mb-2" style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);color:var(--muted);line-height:1.5;display:none;"></div>
          <div id="deflExplanation" class="text-xs p-3 rounded-xl" style="background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);color:var(--muted);line-height:1.6;"></div>
        </div>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-2" style="color:var(--orange);">\uD83C\uDFAF Who Wins? Who Loses?</div>
          <div id="deflWinners" class="space-y-2"></div>
        </div>
        <div class="glass p-4 rounded-xl text-center">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--orange);margin-bottom:6px;">Under a Bitcoin Standard</div>
          <div class="text-xs" style="color:var(--text2);line-height:1.7;max-width:500px;margin:0 auto;">With fixed supply (0% monetary inflation), the full <span id="btcDeflBenefit" style="color:#4ade80;font-weight:bold;">5%</span> technology deflation passes through to you. Goods get cheaper. Savings grow. Productivity gains belong to the people who created them.</div>
        </div>
      </div>`
,

    digimoney: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDCBB The Path to Bitcoin</div>
      <p class="text-xs mb-4" style="color:var(--muted);">Click each project to see what it pioneered \u2014 and why it failed.</p>
      <div id="digiTimeline" class="space-y-2"></div>
      <div class="mt-4 glass p-4 rounded-xl text-center">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--orange);margin-bottom:6px;">\u20BF Bitcoin (2009)</div>
        <div class="text-xs" style="color:var(--text2);line-height:1.7;max-width:500px;margin:0 auto;">Combined ALL the lessons: Proof of Work (HashCash), chained blocks (Bit Gold), peer-to-peer network, difficulty adjustment, and \u2014 crucially \u2014 <strong style="color:var(--orange);">no central point of failure</strong>. The first system that can't be shut down because there's no one to shut down.</div>
      </div>`,

    satoshi: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDD75\uFE0F Who Could Satoshi Be?</div>
      <p class="text-xs mb-4" style="color:var(--muted);">Match the skills Satoshi demonstrated with why each one matters.</p>
      <div class="space-y-3">
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:var(--orange);">\uD83E\uDDE9 The Satoshi Skill Stack</div>
          <div class="space-y-2" id="satoshiSkills"></div>
        </div>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-2" style="color:#4ade80;">\uD83D\uDCA1 The Key Insight</div>
          <div class="text-xs" style="color:var(--text3);line-height:1.7;">
            <p>It doesn't matter who Satoshi is because Bitcoin has <strong style="color:#4ade80;">no admin key</strong>. There is no backdoor, no override, no special privilege. Satoshi could walk into a press conference tomorrow and announce themselves - and they <em>still</em> couldn't change the 21M supply cap, reverse a transaction, or freeze an account.</p>
            <p style="margin-top:8px;">This is what makes Bitcoin unique among every digital system ever created: <strong style="color:#4ade80;">the creator made themselves irrelevant.</strong> Compare that to Meta (Zuckerberg controls the algorithm), Ethereum (Vitalik shapes the roadmap), or any central bank (the chairman sets the rates). Bitcoin is the only major system where the founder's identity is both unknown and <em>unimportant</em>.</p>
          </div>
        </div>
        <div class="glass p-4 rounded-xl text-center">
          <div style="font-size:28px;margin-bottom:8px;">\uD83C\uDF81</div>
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--orange);margin-bottom:4px;">The Final Gift</div>
          <div class="text-xs" style="color:var(--text2);line-height:1.6;max-width:450px;margin:0 auto;">Satoshi mined ~1.1 million BTC, never sold a single one, and disappeared. No patent. No company. No retained control. They gave the world a monetary system and asked for nothing in return. That's not a tech CEO. That's closer to Prometheus.</div>
        </div>
      </div>`,

    whitepaper: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDCDC Whitepaper Section Matcher</div>
      <p class="text-xs mb-4" style="color:var(--muted);">Test how well you understand each section of Bitcoin's whitepaper.</p>
      <div class="glass p-4 rounded-xl">
        <div class="text-sm font-bold mb-3" style="color:var(--orange);">\uD83C\uDF93 Match the Section</div>
        <p class="text-xs mb-3" style="color:var(--text3);">For each question, pick the correct answer. See how well you know the 9 pages that changed money forever.</p>
        <div id="wpQuiz" style="min-height:200px;"></div>
      </div>`,

    altcoins: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDD2E Bitcoin vs The Rest</div>
      <p class="text-xs mb-4" style="color:var(--muted);">Click each cryptocurrency to compare it against Bitcoin on what actually matters.</p>
      <div class="glass p-4 rounded-xl mb-4">
        <div class="text-sm font-bold mb-2" style="color:var(--orange);">Select a crypto to compare:</div>
        <div id="altcoinBtns" class="flex flex-wrap gap-2 mb-3"></div>
        <div id="altcoinCompare" class="hidden space-y-2">
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-xl text-center" style="background:rgba(245,158,11,0.08);border:2px solid var(--orange);">
              <div style="font-size:24px;">\u20BF</div>
              <div style="color:var(--orange);font-family:'Syne',sans-serif;font-weight:800;">Bitcoin</div>
            </div>
            <div class="p-3 rounded-xl text-center" id="altcoinHeader" style="background:rgba(248,113,113,0.08);border:2px solid rgba(248,113,113,0.3);">
              <div style="font-size:24px;" id="altcoinIcon">?</div>
              <div style="color:#f87171;font-family:'Syne',sans-serif;font-weight:800;" id="altcoinName">?</div>
            </div>
          </div>
          <div id="altcoinRows" class="space-y-2"></div>
        </div>
      </div>
      <div class="glass p-4 rounded-xl text-center">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--orange);margin-bottom:6px;">The Scorecard</div>
        <div class="text-xs" style="color:var(--text2);line-height:1.7;max-width:500px;margin:0 auto;">Every other cryptocurrency has a founder, a foundation, a company, or a small group that controls it. Bitcoin has none. That's not a bug \u2014 it's the entire point.</div>
      </div>`
,

    pizza: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83C\uDF55 The Divisibility Calculator</div>
      <p class="text-xs mb-4" style="color:var(--muted);">See how Bitcoin can serve any price level \u2014 from a cup of coffee to a country's GDP.</p>
      <div class="space-y-4">
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:var(--orange);">\u20BF If Bitcoin were worth...</div>
          <div class="mb-3">
            <label for="pizzaBtcPrice" class="text-xs mb-1 block" style="color:var(--muted);">Price per Bitcoin (USD)</label>
            <input type="range" id="pizzaBtcPrice" min="100000" max="50000000" value="1000000" step="100000" class="w-full" style="accent-color:var(--orange);"/>
            <div class="text-xs text-center mt-1" id="pizzaPriceLabel" style="color:var(--orange);font-family:'Space Mono',monospace;">$1,000,000</div>
          </div>
          <div id="pizzaGoods" class="space-y-2"></div>
        </div>
        <div class="glass p-4 rounded-xl text-center">
          <div class="text-sm font-bold mb-2" style="color:var(--orange);">\uD83C\uDF0D Per-Person Supply</div>
          <div style="font-family:'Space Mono',monospace;font-size:28px;font-weight:700;color:var(--orange);">262,500 sats</div>
          <div class="text-xs mt-1" style="color:var(--muted);">If 21M BTC divided equally among 8 billion people</div>
          <div class="text-xs mt-2" style="color:var(--text3);">At <span id="pizzaPerPersonUSD" style="color:var(--orange);">$2,625</span> per person's share \u2014 and each sat is worth <span id="pizzaPerSat" style="color:var(--orange);">$0.01</span></div>
        </div>
      </div>`,

    myths: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDCA5 The Myth Buster</div>
      <p class="text-xs mb-4" style="color:var(--muted);">For each myth, try the strongest attack \u2014 then see why it fails.</p>
      <div id="mythCards" class="space-y-3"></div>`,

    tulips: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83C\uDF37 Tulip or Bitcoin?</div>
      <p class="text-xs mb-4" style="color:var(--muted);">For each statement, decide: is this describing Tulip Mania or Bitcoin?</p>
      <div class="glass p-4 rounded-xl">
        <div class="text-sm font-bold mb-3" style="color:var(--orange);">\uD83C\uDFAF Sort the Facts</div>
        <div id="tulipQuiz" style="min-height:200px;"></div>
      </div>`,

    fiatgraveyard: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83D\uDC80 The Dollar Collapse Simulator</div>
      <p class="text-xs mb-4" style="color:var(--muted);">What would the US government actually do as the dollar fails? Click each stage to see the playbook \u2014 the same one every collapsing government has used.</p>
      <div class="space-y-3">
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:#f87171;">\u26A0\uFE0F The Collapse Playbook \u2014 Click Each Stage</div>
          <div id="collapseStages" class="space-y-2"></div>
        </div>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-3" style="color:var(--orange);">\uD83D\uDCC9 What Happens to Your Assets?</div>
          <div id="collapseAssets" class="space-y-2"></div>
        </div>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-2" style="color:var(--orange);">\u2696\uFE0F Compare: How Did Past Collapses Play Out?</div>
          <div id="collapseCompare" class="space-y-2"></div>
        </div>
        <div class="glass p-4 rounded-xl text-center">
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--orange);margin-bottom:6px;">The One Asset That Survives Every Collapse</div>
          <div class="text-xs" style="color:var(--text2);line-height:1.7;max-width:500px;margin:0 auto;">In every historical collapse, the people who held <strong style="color:var(--orange);">hard assets outside the system</strong> survived. Gold worked for millennia. Bitcoin works better \u2014 it can't be confiscated (if held properly), can't be frozen, crosses borders invisibly, and has a supply no government can inflate. It was literally designed for this scenario.</div>
        </div>
      </div>`,

    lore: `
      <div class="text-lg font-bold mb-1 glow-text" style="font-family:'Syne',sans-serif;">\uD83C\uDFB2 Bitcoin Timeline Quiz</div>
      <p class="text-xs mb-4" style="color:var(--muted);">How well do you know Bitcoin history? Match the event to the year.</p>
      <div class="space-y-4">
        <div id="loreQuiz" class="space-y-3"></div>
        <div id="loreResult" class="hidden text-center p-4 rounded-xl" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);" aria-live="polite"></div>
        <button id="loreCheck" class="w-full text-sm font-bold py-3 px-4 rounded-xl" style="background:rgba(245,158,11,0.15);border:2px solid var(--orange);color:var(--orange);cursor:pointer;font-family:'Syne',sans-serif;">\u2705 Check My Answers</button>
        <div class="glass p-4 rounded-xl">
          <div class="text-sm font-bold mb-2" style="color:#a78bfa;">\uD83E\uDD13 Bonus Facts</div>
          <div class="space-y-2 text-xs" style="color:var(--text3);line-height:1.6;">
            <div>\u2022 The actual BTC cap is <strong style="color:#a78bfa;">20,999,999.9769</strong> - not exactly 21 million</div>
            <div>\u2022 Gavin Andresen's Bitcoin Faucet gave away <strong style="color:#a78bfa;">5 BTC per visitor</strong> in 2010</div>
            <div>\u2022 Casascius physical coins are now worth <strong style="color:#a78bfa;">$100,000+</strong> at auction</div>
            <div>\u2022 In 2010, a bug created <strong style="color:#a78bfa;">184 billion BTC</strong> for a few hours before Satoshi patched it</div>
            <div>\u2022 An estimated <strong style="color:#a78bfa;">3-4 million BTC</strong> are permanently lost forever</div>
            <div>\u2022 Blockstream broadcasts the blockchain <strong style="color:#a78bfa;">from satellites in space</strong></div>
          </div>
        </div>
      </div>`
  };
  return contents[section] ? contents[section] + quickCheckHTML(section) : '<p>Coming soon!</p>';
}

// ═══════════════════════════════════════
//   MODAL INTERACTIVE DEMOS
// ═══════════════════════════════════════

// ── Money Modal ──
modalInitFns.money = function(){
  runInflCalc();
  // Event listeners for inflation calculator
  const inflAmt = document.getElementById('inflAmt');
  const inflYears = document.getElementById('inflYears');
  const inflRate = document.getElementById('inflRate');
  if(inflAmt) inflAmt.addEventListener('input', runInflCalc);
  if(inflYears) inflYears.addEventListener('input', runInflCalc);
  if(inflRate) inflRate.addEventListener('change', runInflCalc);
  // Cantillon button
  const cb = document.getElementById('cantillonBtn');
  if(cb) cb.addEventListener('click', runCantillon);
  // Build timeline
  const timeline = [
    {era:'~3000 BCE', name:'Cowrie Shells', icon:'\uD83D\uDC1A', why:'Portable & pretty', fail:'Too easy to find near any ocean.', color:'#94a3b8'},
    {era:'~1200 BCE', name:'Salt', icon:'\uD83E\uDDC2', why:'Scarce, preserves food', fail:'Mining improved. Supply expanded.', color:'#cbd5e1'},
    {era:'~600 BCE', name:'Gold & Silver Coins', icon:'\uD83E\uDE99', why:'Rare, durable, divisible', fail:'Governments debased coins secretly.', color:'#fbbf24'},
    {era:'~1700 CE', name:'Gold-Backed Paper', icon:'\uD83D\uDCDC', why:'Portable receipt for gold', fail:'Banks printed more receipts than gold. Nixon ended convertibility in 1971.', color:'#f59e0b'},
    {era:'1971\u2013Now', name:'Fiat Currency', icon:'\uD83D\uDCB5', why:'Government decree', fail:'Lost 97%+ purchasing power since 1913. Over 85% since 1971. Backed by nothing.', color:'#f87171'},
    {era:'2009\u2013\u221E', name:'Bitcoin \u20BF', icon:'\u20BF', why:'Mathematically scarce, decentralized', fail:'Not failed. 21M cap. Running 24/7 for 17 years.', color:'#f59e0b', success:true}
  ];
  const el = document.getElementById('moneyTimeline');
  if(!el) return;
  el.innerHTML = '';
  timeline.forEach(t => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-xl cursor-pointer';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.style.cssText = `border:1px solid ${t.color}44;background:${t.color}0a;transition:all .2s;`;
    div.innerHTML = `<div class="flex items-center gap-2 mb-1"><span style="font-size:18px;">${t.icon}</span><span style="color:${t.color};font-size:12px;font-weight:700;font-family:'Space Mono',monospace;">${t.era}</span><span style="color:var(--text);font-size:12px;font-weight:600;">${t.name}</span>${t.success ? '<span style="font-size:12px;padding:2px 6px;background:rgba(245,158,11,0.2);border:1px solid #f59e0b;border-radius:4px;color:#f59e0b;">SOUND MONEY</span>' : ''}</div><div style="display:none;font-size:12px;color:var(--muted);line-height:1.5;" class="tl-detail"><span style="color:#4ade80;">\u2713 Why it worked: </span>${t.why}<br><span style="color:${t.success?'#f59e0b':'#f87171'};">${t.success?'\u20BF Status: ':'\u2717 Why it failed: '}</span>${t.fail}</div>`;
    const toggle = function(){
      const d = this.querySelector('.tl-detail');
      const vis = d.style.display === 'none';
      d.style.display = vis ? 'block' : 'none';
      this.style.borderColor = vis ? t.color : t.color+'44';
    };
    div.addEventListener('click', toggle);
    div.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle.call(this); }});
    el.appendChild(div);
  });
};

function runInflCalc(){
  const amt = parseFloat(document.getElementById('inflAmt')?.value) || 10000;
  const years = parseInt(document.getElementById('inflYears')?.value) || 20;
  const rate = parseFloat(document.getElementById('inflRate')?.value) || 0.07;
  const lbl = document.getElementById('inflYearsLabel');
  if(lbl) lbl.textContent = years + ' years';
  const realVal = amt * Math.pow(1 - rate, years);
  const stolen = amt - realVal;
  const pct = (realVal / amt * 100).toFixed(1);
  const $ = id => document.getElementById(id);
  if($('inflStart')) $('inflStart').textContent = '$' + Math.round(amt).toLocaleString();
  if($('inflEnd'))   $('inflEnd').textContent = '$' + Math.round(realVal).toLocaleString();
  if($('inflStolen'))$('inflStolen').textContent = '$' + Math.round(stolen).toLocaleString();
  if($('inflPct'))   $('inflPct').textContent = pct + '%';
  if($('inflBarFill'))$('inflBarFill').style.width = pct + '%';
}

function runCantillon(){
  const groups = [
    {who:'\uD83C\uDFE6 Megabanks', share:45, delay:'Immediately', outcome:'Buy assets before prices rise.', color:'#f87171'},
    {who:'\uD83C\uDFDB Government & Contractors', share:30, delay:'Within weeks', outcome:'Fund programs at today\'s prices.', color:'#f97316'},
    {who:'\uD83C\uDFE2 Large Corporations', share:15, delay:'3\u20136 months', outcome:'Access cheap credit. Buy back stock.', color:'#fbbf24'},
    {who:'\uD83D\uDC68\u200D\uD83D\uDCBC Small Business', share:7, delay:'6\u201318 months', outcome:'Credit available but rates rising.', color:'#a78bfa'},
    {who:'\uD83D\uDC77 Workers & The Poor', share:3, delay:'2\u20134 years', outcome:'Wages rise last. Prices already up 20\u201340%.', color:'#60a5fa'}
  ];
  const el = document.getElementById('cantillonResult');
  if(!el) return;
  el.innerHTML = '';
  groups.forEach((g, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'flex items-start gap-2 p-2 rounded-lg';
      div.style.cssText = `background:${g.color}12;border:1px solid ${g.color}44;opacity:0;transform:translateX(-10px);transition:all .4s;`;
      div.innerHTML = `<div style="flex:1;"><div style="color:${g.color};font-size:12px;font-weight:700;">${g.who}</div><div style="color:var(--muted);font-size:12px;">~${g.share}% | Delay: ${g.delay}</div><div style="color:var(--text);font-size:12px;margin-top:2px;">${g.outcome}</div></div><div style="font-family:'Space Mono',monospace;font-size:13px;font-weight:bold;color:${g.color};min-width:50px;text-align:right;">+${g.share}%</div>`;
      el.appendChild(div);
      requestAnimationFrame(() => { div.style.opacity='1'; div.style.transform='translateX(0)'; });
    }, i * 400);
  });
}

// ── Network Modal ──
modalInitFns.network = function(){
  const cvs = document.getElementById('netCanvas');
  if(!cvs) return;
  const c = cvs.getContext('2d');
  const container = document.getElementById('netSim');
  cvs.width = container.offsetWidth;
  cvs.height = container.offsetHeight;
  const W = cvs.width, H = cvs.height;
  const log = document.getElementById('netLog');
  const netNodes = [];
  const nodeCount = 12;
  for(let i = 0; i < nodeCount; i++){
    const angle = (i / nodeCount) * Math.PI * 2;
    const r = Math.min(W, H) * 0.35;
    netNodes.push({x: W/2 + r*Math.cos(angle) + (Math.random()-0.5)*30, y: H/2 + r*Math.sin(angle) + (Math.random()-0.5)*30, active: false, id: i, color: '#7878a0'});
  }
  let packets = [];
  let dsFirstSeen = null; // per-node first-seen color during a double-spend race
  function addLog(msg, color){
    const d = document.createElement('div');
    d.innerHTML = msg;
    if(color) d.style.color = color;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }
  function drawNet(){
    if(!document.getElementById('modalOverlay').classList.contains('open')) return;
    c.clearRect(0, 0, W, H);
    for(let i = 0; i < netNodes.length; i++){
      for(let j = i+1; j < netNodes.length; j++){
        const dx = netNodes[i].x - netNodes[j].x, dy = netNodes[i].y - netNodes[j].y;
        if(Math.sqrt(dx*dx + dy*dy) < W/2.5){
          c.beginPath(); c.strokeStyle = 'rgba(245,158,11,0.12)'; c.lineWidth = 0.8;
          c.moveTo(netNodes[i].x, netNodes[i].y); c.lineTo(netNodes[j].x, netNodes[j].y); c.stroke();
        }
      }
    }
    packets = packets.filter(p => p.progress < 1);
    for(let p of packets){
      p.progress += 0.025;
      const x = p.sx + (p.ex - p.sx) * p.progress;
      const y = p.sy + (p.ey - p.sy) * p.progress;
      c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fillStyle = p.color || '#f59e0b'; c.fill();
      if(p.progress >= 1){
        const n = netNodes[p.targetIdx];
        if(dsFirstSeen && p.ds){
          // Double-spend race: node accepts whichever conflicting tx arrives first
          if(!dsFirstSeen[p.targetIdx]){
            dsFirstSeen[p.targetIdx] = p.color;
            n.active = true; n.color = p.color;
          } else if(dsFirstSeen[p.targetIdx] !== p.color){
            addLog('Node ' + p.targetIdx + ' already saw the ' + (p.color === '#f59e0b' ? 'RED' : 'ORANGE') + ' tx - rejects this one ✗', '#7878a0');
          }
        } else if(!dsFirstSeen){
          n.active = true; n.color = p.color || '#f59e0b';
          setTimeout(() => { n.color = '#7878a0'; n.active = false; }, 1000);
        }
      }
    }
    netNodes.forEach(n => {
      c.beginPath(); c.arc(n.x, n.y, 14, 0, Math.PI * 2);
      c.fillStyle = n.active ? (n.color === '#f87171' ? 'rgba(248,113,113,0.3)' : 'rgba(245,158,11,0.3)') : 'rgba(18,18,32,0.8)'; c.fill();
      c.strokeStyle = n.color; c.lineWidth = 2; c.stroke();
      c.fillStyle = n.color; c.font = '10px Space Mono, monospace'; c.textAlign = 'center';
      c.fillText('₿', n.x, n.y + 4);
    });
    requestAnimationFrame(drawNet);
  }
  drawNet();
  cvs.addEventListener('click', function(e){
    if(dsFirstSeen) return; // ignore clicks during the race
    const rect = cvs.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (cvs.width / rect.width);
    const my = (e.clientY - rect.top) * (cvs.height / rect.height);
    let clicked = -1;
    for(let i = 0; i < netNodes.length; i++){
      if(Math.sqrt((netNodes[i].x-mx)**2 + (netNodes[i].y-my)**2) < 20){ clicked = i; break; }
    }
    if(clicked >= 0){
      addLog('Node ' + clicked + ' broadcasts TX: "Send 0.1 BTC to bc1q..."');
      netNodes[clicked].active = true; netNodes[clicked].color = '#f59e0b';
      netNodes.filter((_, i) => i !== clicked).forEach((target, j) => {
        setTimeout(() => {
          packets.push({sx: netNodes[clicked].x, sy: netNodes[clicked].y, ex: target.x, ey: target.y, targetIdx: netNodes.indexOf(target), progress: 0, color: '#f59e0b'});
          addLog('Node ' + netNodes.indexOf(target) + ' verified ✓');
        }, j * 150);
      });
      setTimeout(() => { netNodes[clicked].color = '#7878a0'; netNodes[clicked].active = false; }, 500);
    }
  });
  document.getElementById('netDoubleSpendBtn')?.addEventListener('click', function(){
    if(dsFirstSeen) return;
    const btn = this;
    btn.disabled = true; btn.style.opacity = '0.5';
    dsFirstSeen = {};
    // Two nodes on opposite sides of the network broadcast conflicting spends of the SAME coin
    const A = 0, B = Math.floor(nodeCount / 2);
    dsFirstSeen[A] = '#f59e0b'; dsFirstSeen[B] = '#f87171';
    netNodes[A].active = true; netNodes[A].color = '#f59e0b';
    netNodes[B].active = true; netNodes[B].color = '#f87171';
    log.innerHTML = '';
    addLog('😈 Attacker signs TWO transactions spending the SAME coin:', '#f87171');
    addLog('<span style="color:#f59e0b;">ORANGE tx</span>: pays the coffee shop (broadcast from node ' + A + ')');
    addLog('<span style="color:#f87171;">RED tx</span>: pays the attacker back (broadcast from node ' + B + ')');
    netNodes.forEach(function(target, i){
      if(i === A || i === B) return;
      const dA = Math.hypot(target.x - netNodes[A].x, target.y - netNodes[A].y);
      const dB = Math.hypot(target.x - netNodes[B].x, target.y - netNodes[B].y);
      setTimeout(function(){ packets.push({sx: netNodes[A].x, sy: netNodes[A].y, ex: target.x, ey: target.y, targetIdx: i, progress: 0, color: '#f59e0b', ds: true}); }, dA * 2.2);
      setTimeout(function(){ packets.push({sx: netNodes[B].x, sy: netNodes[B].y, ex: target.x, ey: target.y, targetIdx: i, progress: 0, color: '#f87171', ds: true}); }, dB * 2.2);
    });
    setTimeout(function(){
      const orange = netNodes.filter(function(n){ return n.color === '#f59e0b'; }).length;
      const red = netNodes.filter(function(n){ return n.color === '#f87171'; }).length;
      addLog('─────────────────────────', '#7878a0');
      addLog('The network is SPLIT: ' + orange + ' nodes hold the orange tx, ' + red + ' hold the red one. Both cannot be valid - they spend the same coin.', '#fbbf24');
      addLog('Whichever tx a miner includes in the next block wins. The other is erased everywhere. This race is exactly why merchants wait for a CONFIRMATION instead of trusting an unconfirmed payment.', '#4ade80');
      setTimeout(function(){
        netNodes.forEach(function(n){ n.color = '#7878a0'; n.active = false; });
        dsFirstSeen = null;
        btn.disabled = false; btn.style.opacity = '1';
      }, 4000);
    }, 3500);
  });
};

// ── Node Validation ──
let nodeScore = 0, nodeFail = 0, nodeIdx = 0;
const nodeBlocks = [
  {num:898422, valid:true, txCount:2847, size:'3.8 MB', hash:'00000000000000000003a1f...', coinbase:'3.125 BTC', explanation:'All rules followed. Valid proof of work and correct block reward.'},
  {num:898423, valid:false, txCount:2012, size:'3.2 MB', hash:'00000000000000002fa3b1d...', coinbase:'6.25 BTC', explanation:'Coinbase reward too high (6.25 BTC). After the 2024 halving, the maximum is 3.125 BTC.'},
  {num:898424, valid:true, txCount:3100, size:'4.0 MB', hash:'000000000000000000191af...', coinbase:'3.125 BTC', explanation:'All rules followed. Valid hash, correct reward, no double-spends.'},
  {num:898425, valid:false, txCount:999, size:'2.1 MB', hash:'0a3f12900004bd129fa3b...', coinbase:'3.125 BTC', explanation:'Hash does not meet difficulty target (no leading zeros). This miner did not do enough work.'},
  {num:898426, valid:true, txCount:2600, size:'3.5 MB', hash:'0000000000000000000f2a1...', coinbase:'3.125 BTC', explanation:'Valid proof of work, correct reward, no violations.'},
  {num:898427, valid:false, txCount:4200, size:'5.2 MB', hash:'00000000000000000001bc2...', coinbase:'3.125 BTC', explanation:'Block exceeds maximum weight of 4 MB. Bitcoin has a block size limit to keep nodes decentralized.'},
  {num:898428, valid:false, txCount:1850, size:'2.8 MB', hash:'00000000000000000009e3f...', coinbase:'3.125 BTC', explanation:'Contains a double-spend: the same UTXO is used as input in two different transactions within this block.'}
];
function showNodeBlock(){
  const b = nodeBlocks[nodeIdx % nodeBlocks.length];
  const bn = document.getElementById('nodeBlockNum');
  const bd = document.getElementById('nodeBlockDetails');
  if(bn) bn.textContent = b.num.toLocaleString();
  if(bd){
    let clues = '<div style="display:grid;gap:6px;">';
    clues += '<div><span style="color:var(--muted);">Transactions:</span> <span style="color:var(--orange);font-weight:700;">'+b.txCount.toLocaleString()+'</span></div>';
    clues += '<div><span style="color:var(--muted);">Block size:</span> <span style="color:'+(parseFloat(b.size)>4?'#f87171':'var(--orange)')+';font-weight:700;">'+b.size+'</span></div>';
    clues += '<div><span style="color:var(--muted);">Hash:</span> <span style="color:var(--orange);font-weight:700;">'+b.hash+'</span></div>';
    if(b.coinbase) clues += '<div><span style="color:var(--muted);">Coinbase reward:</span> <span style="color:'+(parseFloat(b.coinbase)>3.125?'#f87171':'var(--orange)')+';font-weight:700;">'+b.coinbase+'</span></div>';
    clues += '</div>';
    bd.innerHTML = clues;
  }
}
function nodeValidate(accept){
  const b = nodeBlocks[nodeIdx % nodeBlocks.length];
  const isCorrect = (accept === b.valid);
  const result = document.getElementById('nodeResult');
  result.classList.remove('hidden');
  if(isCorrect){
    nodeScore++;
    result.className = 'demo-result demo-result-ok';
    document.getElementById('nodeResultTitle').textContent = '✅ Correct!';
    document.getElementById('nodeResultDetail').textContent = b.explanation;
  } else {
    nodeFail++;
    result.className = 'demo-result demo-result-fail';
    document.getElementById('nodeResultTitle').textContent = '❌ Wrong!';
    document.getElementById('nodeResultDetail').textContent = b.explanation;
  }
  document.getElementById('nodeScore').textContent = nodeScore;
  document.getElementById('nodeFail').textContent = nodeFail;
  nodeIdx++;
  setTimeout(function(){ result.classList.add('hidden'); showNodeBlock(); }, 3500);
}
modalInitFns.node = function(){
  nodeScore = 0; nodeFail = 0; nodeIdx = 0;
  document.getElementById('nodeScore').textContent = '0';
  document.getElementById('nodeFail').textContent = '0';
  showNodeBlock();
  document.getElementById('nodeAcceptBtn')?.addEventListener('click', function(){ nodeValidate(true); });
  document.getElementById('nodeRejectBtn')?.addEventListener('click', function(){ nodeValidate(false); });
};

// ── Mining ──
modalInitFns.mining = function(){
  const $ = id => document.getElementById(id);
  // Difficulty button selector
  const diffBtns = document.querySelectorAll('#mineDiffBtns .demo-diff-btn');
  diffBtns.forEach(btn => {
    btn.addEventListener('click', function(){
      diffBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      $('mineDiffSel').value = this.dataset.d;
      resetMine();
    });
  });
  // Step 1: avalanche sandbox
  const ava = $('avaInput');
  let prevAva = '';
  function renderAva(){
    const h = sha256Hex(ava.value);
    const el = $('avaHash');
    if(prevAva && h !== prevAva){
      let diff = 0;
      el.innerHTML = h.split('').map((c,i) => c === prevAva[i] ? '<span style="color:var(--muted);">'+c+'</span>' : (diff++, '<span style="color:var(--orange);font-weight:bold;text-shadow:0 0 8px var(--orange-glow);">'+c+'</span>')).join('');
      $('avaDiff').innerHTML = '<strong>'+diff+' of 64</strong> hex characters changed. Tiny input change, totally different hash.';
    } else {
      el.textContent = h;
    }
    prevAva = h;
  }
  ava.addEventListener('input', renderAva);
  renderAva();

  // Step 2: real proof of work
  let nonce = 0, mining = false, startTime = 0, lastNonce = 0, lastTime = 0;
  function showHash(h, target){
    const ok = h.startsWith(target);
    $('mineHash').innerHTML = '<span style="color:' + (ok ? '#4ade80' : '#f87171') + ';font-weight:bold;font-size:15px;">' + h.slice(0, target.length) + '</span><span style="color:var(--muted);">' + h.slice(target.length) + '</span>';
  }
  function stopMining(){
    mining = false;
    if(_timers.mining){ clearInterval(_timers.mining); _timers.mining = null; }
    $('mineBtn').innerHTML = '⛏ Auto-Mine';
  }
  function resetMine(){
    stopMining(); nonce = 0;
    $('mineNonce').textContent = '0';
    $('mineProgress').style.width = '0%';
    $('mineResult').classList.add('hidden');
    $('mineTime').textContent = '0s';
    $('mineHashRate').textContent = '0 H/s';
    $('mineHash').textContent = 'Press Auto-Mine or try a nonce by hand...';
    $('mineStep2').classList.remove('complete');
  }
  function finishMine(h, target){
    stopMining(); showHash(h, target);
    $('mineNonce').textContent = nonce.toLocaleString();
    $('mineProgress').style.width = '100%';
    $('mineResult').classList.remove('hidden');
    $('mineStep2').classList.add('complete');
    $('mineReward').textContent = 'Winning nonce: ' + nonce.toLocaleString() + ' · Reward: 3.125 BTC' + (btcPrice > 0 ? ' (~$' + (3.125*btcPrice).toLocaleString('en',{maximumFractionDigits:0}) + ')' : '') + ' + fees';
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) for(let k=0;k<15;k++) setTimeout(()=>spawnCoin(),k*100);
  }
  $('mineData').addEventListener('input', resetMine);
  $('mineOnceBtn').addEventListener('click', function(){
    if(mining) return;
    const d = parseInt($('mineDiffSel').value), target = '0'.repeat(d);
    nonce++;
    const h = sha256Hex($('mineData').value + '|nonce:' + nonce);
    $('mineNonce').textContent = nonce.toLocaleString();
    if(h.startsWith(target)){ finishMine(h, target); } else { showHash(h, target); }
  });
  $('mineBtn').addEventListener('click', function(){
    if(mining){ stopMining(); return; }
    mining = true; this.innerHTML = '⏹ Stop';
    $('mineResult').classList.add('hidden');
    $('mineStep2').classList.remove('complete');
    startTime = Date.now(); lastTime = startTime; lastNonce = nonce;
    const d = parseInt($('mineDiffSel').value), target = '0'.repeat(d), expected = Math.pow(16, d);
    const data = $('mineData').value;
    _timers.mining = setInterval(() => {
      let lastH = '';
      for(let i = 0; i < 600; i++){
        nonce++;
        lastH = sha256Hex(data + '|nonce:' + nonce);
        if(lastH.startsWith(target)){ finishMine(lastH, target); return; }
      }
      showHash(lastH, target);
      $('mineNonce').textContent = nonce.toLocaleString();
      const now = Date.now();
      $('mineTime').textContent = ((now - startTime)/1000).toFixed(1) + 's';
      if(now - lastTime > 400){
        $('mineHashRate').textContent = Math.floor((nonce - lastNonce) / ((now - lastTime)/1000)).toLocaleString() + ' H/s';
        lastNonce = nonce; lastTime = now;
      }
      $('mineProgress').style.width = Math.min(99, (1 - Math.pow(1 - 1/expected, nonce)) * 100) + '%';
    }, 30);
  });
};

// ── Blockchain (real SHA-256, tamper-able) ──
const CHAIN_TARGET = '000';
let chainBlocks = [], chainEls = [], chainWorkRedone = 0;
function chainHash(b){ return sha256Hex(b.height + '|' + b.prevHash + '|' + b.data + '|' + b.nonce); }
function chainMineSync(b){
  b.nonce = 0;
  while(!chainHash(b).startsWith(CHAIN_TARGET) && b.nonce < 2000000) b.nonce++;
  return b.nonce + 1;
}
function chainInit(){
  if(_timers.remine){ clearInterval(_timers.remine); _timers.remine = null; }
  chainBlocks = []; chainWorkRedone = 0;
  let prev = '0'.repeat(64);
  ['Genesis: Chancellor on brink of second bailout', 'Alice pays Bob 0.5 BTC', 'Carol pays Dan 1.2 BTC'].forEach((data, i) => {
    const b = {height: i, data, prevHash: prev, nonce: 0};
    chainMineSync(b);
    prev = chainHash(b);
    chainBlocks.push(b);
  });
  renderChain();
  const msg = document.getElementById('chainMsg');
  if(msg) msg.textContent = 'Chain mined with real proof of work. Edit any block to break it.';
}
function renderChain(){
  const c = document.getElementById('chainContainer');
  if(!c) return;
  c.innerHTML = ''; chainEls = [];
  chainBlocks.forEach((b, i) => {
    const card = document.createElement('div');
    card.className = 'chain-block';
    // Header with block number and badge
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    head.innerHTML = '<div style="font-size:15px;font-weight:800;color:var(--orange);font-family:Syne,sans-serif;">Block #' + b.height + '</div><span class="cb-badge demo-badge" style="font-size:12px;"></span>';
    card.appendChild(head);
    // Editable data field
    const inputWrap = document.createElement('div');
    inputWrap.style.cssText = 'margin-bottom:12px;';
    inputWrap.innerHTML = '<label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Block data (edit to tamper)</label>';
    const input = document.createElement('input');
    input.className = 'demo-input';
    input.value = b.data;
    input.setAttribute('aria-label', 'Block ' + b.height + ' data');
    inputWrap.appendChild(input);
    card.appendChild(inputWrap);
    // Hash details in grid
    const meta = document.createElement('div');
    meta.style.cssText = 'display:grid;gap:6px;';
    meta.innerHTML =
      '<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:12px;color:var(--muted);min-width:45px;">Nonce:</span><span class="cb-nonce" style="font-family:Space Mono,monospace;font-size:12px;color:var(--text2);"></span></div>' +
      '<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:12px;color:var(--muted);min-width:45px;">Prev:</span><span class="cb-prev" style="font-family:Space Mono,monospace;font-size:12px;word-break:break-all;"></span></div>' +
      '<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:12px;color:var(--muted);min-width:45px;">Hash:</span><span class="cb-hash" style="font-family:Space Mono,monospace;font-size:12px;word-break:break-all;"></span></div>';
    card.appendChild(meta);
    // Re-mine button
    const remineBtn = document.createElement('button');
    remineBtn.className = 'demo-btn demo-btn-orange hidden';
    remineBtn.style.cssText = 'margin-top:12px;font-size:13px;padding:10px;';
    remineBtn.textContent = '⛏ Re-mine this block';
    card.appendChild(remineBtn);
    c.appendChild(card);
    // Chain link between blocks
    if(i < chainBlocks.length - 1){
      const link = document.createElement('div');
      link.className = 'demo-chain-link';
      link.textContent = '⬇';
      c.appendChild(link);
    }
    const els = {card, badge: card.querySelector('.cb-badge'), nonce: card.querySelector('.cb-nonce'), prev: card.querySelector('.cb-prev'), hash: card.querySelector('.cb-hash'), remine: remineBtn};
    input.addEventListener('input', function(){
      b.data = this.value;
      const broken = updateChainView();
      const msg = document.getElementById('chainMsg');
      if(msg && broken) msg.textContent = broken + ' block(s) invalid. Every node rejects this. Re-mine them all to cover your tracks.';
    });
    remineBtn.addEventListener('click', function(){ remineBlock(i); });
    chainEls.push(els);
  });
  updateChainView();
}
function updateChainView(){
  let prevActual = '0'.repeat(64), prevValid = true, invalidCount = 0, firstInvalid = -1;
  chainBlocks.forEach((b, i) => {
    const actual = chainHash(b);
    const powOk = actual.startsWith(CHAIN_TARGET);
    const linkOk = b.prevHash === prevActual;
    const valid = powOk && linkOk && prevValid;
    if(!valid){ invalidCount++; if(firstInvalid < 0) firstInvalid = i; }
    const e = chainEls[i];
    e.nonce.textContent = b.nonce.toLocaleString();
    e.prev.textContent = b.prevHash.slice(0, 20) + '...';
    e.prev.style.color = linkOk ? '#7878a0' : '#f87171';
    e.hash.innerHTML = '<span style="color:' + (powOk ? '#4ade80' : '#f87171') + ';font-weight:bold;">' + actual.slice(0, 3) + '</span><span style="color:' + (valid ? 'var(--orange)' : '#f87171') + ';">' + actual.slice(3, 20) + '...</span>';
    e.badge.textContent = valid ? '✅ VALID' : '❌ INVALID';
    e.badge.className = 'cb-badge demo-badge ' + (valid ? 'demo-badge-valid' : 'demo-badge-invalid');
    e.card.style.borderColor = valid ? 'rgba(74,222,128,0.3)' : '#f87171';
    e.card.style.background = valid ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.06)';
    prevActual = actual; prevValid = valid;
  });
  chainEls.forEach((e, i) => e.remine.classList.toggle('hidden', i !== firstInvalid));
  return invalidCount;
}
function remineBlock(i){
  if(_timers.remine) return;
  const b = chainBlocks[i];
  b.prevHash = i ? chainHash(chainBlocks[i-1]) : '0'.repeat(64);
  b.nonce = 0;
  const e = chainEls[i];
  e.remine.classList.add('hidden');
  const msg = document.getElementById('chainMsg');
  _timers.remine = setInterval(() => {
    let found = chainHash(b).startsWith(CHAIN_TARGET);
    for(let k = 0; k < 900 && !found; k++){
      b.nonce++; chainWorkRedone++;
      found = chainHash(b).startsWith(CHAIN_TARGET);
    }
    e.nonce.textContent = b.nonce.toLocaleString();
    e.hash.textContent = chainHash(b).slice(0, 20) + '...';
    if(found){
      clearInterval(_timers.remine); _timers.remine = null;
      const remaining = updateChainView();
      if(msg) msg.textContent = remaining
        ? 'Block #' + b.height + ' re-mined (' + (b.nonce+1).toLocaleString() + ' tries). ' + remaining + ' more block(s) still broken - the work cascades...'
        : 'Rewritten after ' + chainWorkRedone.toLocaleString() + ' redone hashes - on YOUR copy only. 50,000+ real nodes still hold the original. Now imagine each block costing hundreds of thousands of dollars in electricity.';
    }
  }, 35);
}
modalInitFns.blockchain = function(){
  chainInit();
  document.getElementById('addChainBtn')?.addEventListener('click', function(){
    if(_timers.remine) return;
    if(updateChainView() > 0){
      document.getElementById('chainMsg').textContent = 'Fix the broken blocks first.';
      return;
    }
    const b = {height: chainBlocks.length, data: 'Transaction batch #' + (chainBlocks.length + 1), prevHash: chainHash(chainBlocks[chainBlocks.length - 1]), nonce: 0};
    const tries = chainMineSync(b);
    chainBlocks.push(b);
    renderChain();
    document.getElementById('chainMsg').textContent = 'Block #' + b.height + ' mined after ' + tries.toLocaleString() + ' SHA-256 attempts.';
  });
  document.getElementById('chainResetBtn')?.addEventListener('click', chainInit);
};

// ── Block Anatomy ──
modalInitFns.blocks = function(){
  const parts = [
    {name:'Block Height',val:'#898,422',desc:'Sequential number since the genesis block (Block #0, January 3, 2009). This is how we know exactly where in history this block sits.',color:'var(--orange)'},
    {name:'Timestamp',val:'2026-03-23 14:32:07 UTC',desc:'When this block was mined. Miners set this, but nodes reject timestamps that are too far in the future.',color:'#60a5fa'},
    {name:'Previous Block Hash',val:'00000000000000000003a1f...',desc:'The SHA-256 fingerprint of the block before this one. This single value is what creates the "chain" - changing any past block invalidates every block after it.',color:'#f87171'},
    {name:'Merkle Root',val:'7a3f9d12b891c4e5...',desc:'A tree of hashes that compresses ALL transactions in the block into a single 32-byte value. Any change to any transaction changes this root.',color:'#a78bfa'},
    {name:'Nonce',val:'2,384,912,847',desc:'The winning lottery number. Miners tried billions of nonces until they found one that made the block hash start with enough zeros.',color:'#fbbf24'},
    {name:'Difficulty Target',val:'0x17057e43',desc:'The threshold a hash must be below. This adjusts every 2,016 blocks to keep the 10-minute average. More miners = harder target.',color:'#4ade80'},
    {name:'Transaction Count',val:'4,217 transactions',desc:'Every transaction in this block, from a single BTC payment to complex multi-signature contracts. Each pays a fee to the miner.',color:'#f59e0b'}
  ];
  const el = document.getElementById('blockAnatomy'); if(!el)return;
  el.innerHTML = '';
  parts.forEach(function(p){
    const d = document.createElement('div');
    d.className = 'demo-card';
    d.style.cssText = 'cursor:pointer;border-color:'+p.color+'33;transition:all .3s;';
    d.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<div style="font-size:14px;font-weight:700;color:'+p.color+';font-family:Syne,sans-serif;">'+p.name+'</div>'
      + '<div style="font-family:Space Mono,monospace;font-size:12px;color:var(--muted);">'+p.val+'</div>'
      + '</div>'
      + '<div class="ba-desc" style="max-height:0;overflow:hidden;transition:max-height .3s;font-size:13px;color:var(--text2);line-height:1.6;"></div>';
    let open = false;
    d.addEventListener('click', function(){
      open = !open;
      const desc = d.querySelector('.ba-desc');
      if(open){
        desc.textContent = p.desc;
        desc.style.maxHeight = '120px';
        desc.style.marginTop = '10px';
        d.style.borderColor = p.color;
        d.style.background = p.color + '08';
      } else {
        desc.style.maxHeight = '0';
        desc.style.marginTop = '0';
        d.style.borderColor = p.color + '33';
        d.style.background = '';
      }
    });
    el.appendChild(d);
  });
};

// ── Difficulty (epoch thermostat) ──
let diffState = null;
modalInitFns.difficulty = function(){
  diffState = {hash: 100, diff: 100, epoch: 0};
  const $ = function(id){ return document.getElementById(id); };
  function blockTime(){ return 10 * diffState.diff / diffState.hash; }
  function render(){
    $('diffHash').textContent = Math.round(diffState.hash) + '%';
    $('diffVal').textContent = Math.round(diffState.diff) + '%';
    const bt = blockTime();
    $('diffTime').textContent = bt.toFixed(1) + ' min';
    $('diffTime').style.color = Math.abs(bt - 10) < 0.8 ? '#4ade80' : (bt > 10 ? '#f87171' : '#fbbf24');
  }
  function log(msg, color){
    const el = $('diffLog');
    const d = document.createElement('div');
    d.innerHTML = msg;
    if(color) d.style.color = color;
    el.insertBefore(d, el.firstChild);
  }
  function shock(mult, story){
    diffState.hash = Math.min(300, Math.max(10, diffState.hash * mult));
    $('minerSlider').value = diffState.hash;
    render();
    const bt = blockTime();
    log('⚡ ' + story + ' Hashrate: ' + Math.round(diffState.hash) + '%. Blocks now take ~' + bt.toFixed(1) + ' min. ' + (bt > 11 ? 'Payments crawl...' : bt < 9 ? 'Coins issue too fast...' : ''), bt > 11 ? '#f87171' : bt < 9 ? '#fbbf24' : '#4ade80');
  }
  $('diffBanBtn')?.addEventListener('click', function(){ shock(0.5, 'A major country bans mining overnight.'); });
  $('diffBoomBtn')?.addEventListener('click', function(){ shock(1.6, 'A new ASIC generation comes online.'); });
  $('minerSlider')?.addEventListener('input', function(){
    diffState.hash = parseFloat(this.value);
    render();
  });
  $('diffEpochBtn')?.addEventListener('click', function(){
    const bt = blockTime();
    // Real retarget rule: adjust by measured/expected, clamped to 4x either way
    const factor = Math.min(4, Math.max(0.25, 10 / bt));
    diffState.diff = diffState.diff * factor;
    diffState.epoch++;
    render();
    const newBt = blockTime();
    const dir = factor > 1.005 ? 'increased ' + ((factor - 1) * 100).toFixed(0) + '%' : factor < 0.995 ? 'decreased ' + ((1 - factor) * 100).toFixed(0) + '%' : 'held steady';
    log('📐 Epoch ' + diffState.epoch + ': 2,016 blocks averaged ' + bt.toFixed(1) + ' min → difficulty ' + dir + '. Block time now ' + newBt.toFixed(1) + ' min.', '#f59e0b');
    if(Math.abs(newBt - 10) < 0.5 && Math.abs(bt - 10) >= 0.5){
      log('✅ Equilibrium restored: ~10 minute blocks. No committee met. No vote was held. The protocol healed itself - exactly what happened after China banned mining in 2021.', '#4ade80');
    }
  });
  render();
};

// ── Transactions (balance-the-transaction puzzle) ──
const TX_GOAL = 0.3;
let txPuzzleCoins, txPuzzleSel;
function resetTxPuzzle(){
  txPuzzleCoins = [
    {id:'t1',amt:0.18,label:'From Alice'},
    {id:'t2',amt:0.22,label:'Mining pool payout'},
    {id:'t3',amt:0.09,label:'Sold a laptop'},
    {id:'t4',amt:0.35,label:'From Bob'}
  ];
  txPuzzleSel = new Set();
}
function renderTxCoins(){
  const el = document.getElementById('txCoins'); if(!el) return;
  el.innerHTML = '';
  txPuzzleCoins.forEach(function(u){
    const sel = txPuzzleSel.has(u.id);
    const d = document.createElement('div');
    d.className = 'demo-coin' + (sel ? ' selected' : '');
    d.innerHTML = '<div style="font-size:22px;">' + (sel ? '✅' : '🪙') + '</div>'
      + '<div style="flex:1;"><div class="demo-coin-amt" style="color:' + (sel ? 'var(--orange)' : 'var(--text)') + ';">' + u.amt.toFixed(4) + '</div>'
      + '<div class="demo-coin-label">' + u.label + '</div></div>';
    d.addEventListener('click', function(){
      if(txPuzzleSel.has(u.id)) txPuzzleSel.delete(u.id); else txPuzzleSel.add(u.id);
      renderTxCoins(); updateTxMath();
    });
    el.appendChild(d);
  });
}
function txFeeVerdict(inTotal, change){
  const fee = inTotal - TX_GOAL - change;
  if(inTotal < TX_GOAL) return {fee, color:'#f87171', msg:'Selected coins do not cover 0.3000 yet.', valid:false};
  if(fee < 0) return {fee, color:'#f87171', msg:'Outputs exceed inputs. Every node rejects this instantly.', valid:false};
  if(fee === 0) return {fee, color:'#fbbf24', msg:'Zero fee. No miner will ever include this. It sits in the mempool forever.', valid:false};
  if(fee > 0.01) return {fee, color:'#f87171', msg:'You are tipping the miner ' + fee.toFixed(4) + ' BTC. Real users have lost fortunes this way. Send more back to yourself as change.', valid:false};
  if(fee < 0.00005) return {fee, color:'#fbbf24', msg:'Fee is dust. This might confirm eventually, but nodes may drop it. Leave a little more.', valid:false};
  return {fee, color:'#4ade80', msg:'Reasonable fee. Miners will happily include this.', valid:true};
}
function updateTxMath(){
  const el = document.getElementById('txMath'); if(!el) return;
  const selected = txPuzzleCoins.filter(function(u){ return txPuzzleSel.has(u.id); });
  if(!selected.length){ el.innerHTML = '<span style="color:var(--muted);">Select coins above to begin.</span>'; return; }
  const inTotal = selected.reduce(function(x,u){ return x+u.amt; },0);
  const change = parseFloat(document.getElementById('txChange').value) || 0;
  const v = txFeeVerdict(inTotal, change);
  el.innerHTML = '<div style="display:grid;gap:4px;">'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Inputs (' + selected.length + ' coin' + (selected.length>1?'s':'') + ')</span><span style="color:var(--orange);font-family:Space Mono,monospace;font-weight:700;">' + inTotal.toFixed(4) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">To Carol</span><span style="color:#4ade80;font-family:Space Mono,monospace;">-' + TX_GOAL.toFixed(4) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Change to you</span><span style="color:#60a5fa;font-family:Space Mono,monospace;">-' + change.toFixed(4) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--glass-border);padding-top:6px;margin-top:4px;"><span style="color:var(--muted);font-weight:700;">Miner fee (what is left)</span><span style="color:' + v.color + ';font-family:Space Mono,monospace;font-weight:700;">' + v.fee.toFixed(4) + '</span></div>'
    + '<div style="color:' + v.color + ';font-size:12px;margin-top:4px;">' + v.msg + '</div>'
    + '</div>';
}
modalInitFns.transactions = function(){
  resetTxPuzzle();
  renderTxCoins();
  updateTxMath();
  document.getElementById('txChange')?.addEventListener('input', updateTxMath);
  document.getElementById('broadcastTxBtn')?.addEventListener('click', function(){
    const r = document.getElementById('txBroadcastResult');
    const selected = txPuzzleCoins.filter(function(u){ return txPuzzleSel.has(u.id); });
    r.classList.remove('hidden');
    if(!selected.length){
      r.className = 'demo-result demo-result-fail';
      r.innerHTML = '<div class="demo-result-title">❌ No inputs</div><div class="demo-result-detail">Select coins to fund the payment.</div>';
      return;
    }
    const inTotal = selected.reduce(function(x,u){ return x+u.amt; },0);
    const change = parseFloat(document.getElementById('txChange').value) || 0;
    const v = txFeeVerdict(inTotal, change);
    if(!v.valid){
      r.className = 'demo-result demo-result-fail';
      r.innerHTML = '<div class="demo-result-title">❌ Rejected</div><div class="demo-result-detail">' + v.msg + '</div>';
      return;
    }
    r.className = 'demo-result demo-result-ok';
    r.innerHTML = '<div class="demo-result-title">🎉 Transaction confirmed!</div>'
      + '<div class="demo-result-detail">Carol receives 0.3000. You get ' + change.toFixed(4) + ' back as a brand new coin. The miner keeps ' + v.fee.toFixed(4) + ' as the tip that got you included in a block.<br/><br/>This is every Bitcoin transaction ever made: inputs in, outputs out, the difference is the fee. There is no account, no balance - just coins being melted down and re-minted.</div>';
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) for(let k=0;k<10;k++) setTimeout(function(){spawnCoin();},k*90);
  });
};

// ── UTXOs ──
let utxoCoins, utxoSelected;
function resetUtxoWallet(){
  utxoCoins = [
    {id:'u1',amt:0.25,label:'From Alice',txid:'a3f2...8e1d'},
    {id:'u2',amt:0.10,label:'Mining reward',txid:'7b91...c4f0'},
    {id:'u3',amt:0.05,label:'Change from purchase',txid:'e5d6...12ab'},
    {id:'u4',amt:0.42,label:'Payment from Bob',txid:'1c8f...d903'},
    {id:'u5',amt:0.008,label:'Dust from swap',txid:'f012...6e7a'}
  ];
  utxoSelected = new Set();
}
function renderCoinPicker(){
  const el = document.getElementById('utxoWallet'); if(!el)return;
  el.innerHTML = ''; let total = 0;
  utxoCoins.forEach(function(u){
    total += u.amt;
    const sel = utxoSelected.has(u.id);
    const d = document.createElement('div');
    d.className = 'demo-coin' + (sel ? ' selected' : '');
    d.innerHTML = '<div style="font-size:24px;transition:transform .2s;">' + (sel ? '✅' : '🪙') + '</div>'
      + '<div style="flex:1;"><div class="demo-coin-amt" style="color:' + (sel ? 'var(--orange)' : 'var(--text)') + ';">' + u.amt.toFixed(4) + ' BTC</div>'
      + '<div class="demo-coin-label">' + u.label + '</div></div>';
    d.addEventListener('click',function(){
      if(utxoSelected.has(u.id)) utxoSelected.delete(u.id); else utxoSelected.add(u.id);
      renderCoinPicker(); updateSpendPlan();
    });
    el.appendChild(d);
  });
  document.getElementById('utxoBalance').textContent = total.toFixed(4)+' BTC';
}
function updateSpendPlan(){
  const plan = document.getElementById('utxoPlan'); if(!plan) return;
  const sendAmt = parseFloat(document.getElementById('utxoSend').value) || 0;
  const selected = utxoCoins.filter(function(u){return utxoSelected.has(u.id);});
  const selectedTotal = selected.reduce(function(s,u){return s+u.amt;},0);
  const fee = 0.0005;
  if(!selected.length){ plan.innerHTML = '<span style="color:var(--muted);">Select coins above to build your spending plan.</span>'; return; }
  const change = selectedTotal - sendAmt - fee;
  const enough = change >= 0;
  plan.innerHTML = '<div style="color:var(--orange);font-weight:700;font-family:Syne,sans-serif;font-size:14px;margin-bottom:8px;">Spending Plan</div>'
    + selected.map(function(u){return '<div style="display:flex;gap:8px;align-items:center;"><span style="font-size:16px;">🪙</span><span style="color:var(--text);font-family:Space Mono,monospace;">'+u.amt.toFixed(4)+' BTC</span><span style="color:var(--muted);font-size:12px;">('+u.label+')</span></div>';}).join('')
    + '<div style="border-top:1px solid var(--glass-border);margin:10px 0;padding-top:10px;display:grid;gap:4px;">'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Input total:</span><span style="color:var(--orange);font-family:Space Mono,monospace;font-weight:700;">'+selectedTotal.toFixed(4)+' BTC</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Send:</span><span style="color:#4ade80;font-family:Space Mono,monospace;">'+sendAmt.toFixed(4)+' BTC</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Miner fee:</span><span style="color:#fbbf24;font-family:Space Mono,monospace;">'+fee.toFixed(4)+' BTC</span></div>'
    + '<div style="display:flex;justify-content:space-between;font-weight:700;"><span style="color:var(--muted);">Change back:</span><span style="color:'+(enough ? '#60a5fa' : '#f87171')+';font-family:Space Mono,monospace;">'+(enough ? change.toFixed(4)+' BTC' : 'INSUFFICIENT')+'</span></div>'
    + '</div>';
}
modalInitFns.outputs = function(){
  resetUtxoWallet();
  renderCoinPicker();
  document.getElementById('utxoSend')?.addEventListener('input', updateSpendPlan);
  document.getElementById('spendUtxoBtn')?.addEventListener('click',function(){
    const sendAmt = parseFloat(document.getElementById('utxoSend').value);
    const log = document.getElementById('utxoLog');
    const selected = utxoCoins.filter(function(u){return utxoSelected.has(u.id);});
    if(!selected.length){
      log.classList.remove('hidden');log.className='demo-result demo-result-fail';
      log.innerHTML='<div class="demo-result-title">❌ No Coins Selected</div><div class="demo-result-detail">Tap coins to select them for spending.</div>';return;
    }
    if(!sendAmt||sendAmt<=0){
      log.classList.remove('hidden');log.className='demo-result demo-result-fail';
      log.innerHTML='<div class="demo-result-title">❌ Invalid Amount</div><div class="demo-result-detail">Enter an amount to send.</div>';return;
    }
    const selectedTotal = selected.reduce(function(s,u){return s+u.amt;},0);
    const fee = 0.0005, change = selectedTotal - sendAmt - fee;
    if(change<0){
      log.classList.remove('hidden');log.className='demo-result demo-result-fail';
      log.innerHTML='<div class="demo-result-title">❌ Insufficient Coins</div><div class="demo-result-detail">Selected: '+selectedTotal.toFixed(4)+' BTC. Need: '+(sendAmt+fee).toFixed(4)+' BTC.</div>';return;
    }
    utxoCoins = utxoCoins.filter(function(u){return !utxoSelected.has(u.id);});
    if(change>0.00001) utxoCoins.push({id:'c'+Date.now(),amt:parseFloat(change.toFixed(5)),label:'Change back to you',txid:genHex(4)+'...'+genHex(4)});
    utxoSelected = new Set();
    log.classList.remove('hidden');log.className='demo-result demo-result-ok';
    log.innerHTML='<div class="demo-result-title">✅ Transaction Broadcast!</div><div class="demo-result-detail">Spent '+selected.length+' coin'+(selected.length>1?'s':'')+' ('+selectedTotal.toFixed(4)+' BTC) | Sent: '+sendAmt.toFixed(4)+' | Fee: '+fee.toFixed(4)+(change>0.00001?' | Change: '+change.toFixed(4):'')+'</div>';
    renderCoinPicker();
    document.getElementById('utxoPlan').innerHTML='<span style="color:#4ade80;">Transaction sent. Select coins for another payment.</span>';
  });
};

// ── Locks ──
modalInitFns.locks = function(){
  const vaults=[
    {id:0,name:'0.5 BTC',lockType:'P2PKH',keyId:0},
    {id:1,name:'0.1 BTC',lockType:'Multisig 2-of-2',keyId:1},
    {id:2,name:'1.0 BTC',lockType:'P2WPKH (SegWit)',keyId:2},
    {id:3,name:'0.25 BTC',lockType:'Time-locked (2027)',keyId:3}
  ];
  const keys=[
    {id:0,label:'Key A (bc1q...f3a9)',color:'#f59e0b'},
    {id:1,label:'Key B (bc1q...d721)',color:'#4ade80'},
    {id:2,label:'Key C (bc1q...9abc)',color:'#60a5fa'},
    {id:3,label:'Key D (Time: 2030)',color:'#f87171'}
  ];
  const vEl=document.getElementById('lockVaults'),kEl=document.getElementById('lockKeys');
  let selectedKey=null;

  keys.forEach(k=>{
    const d=document.createElement('div');
    d.className='demo-coin';
    d.style.borderColor=k.color+'44';
    d.innerHTML='<div style="width:28px;height:28px;border-radius:50%;background:'+k.color+'22;border:2px solid '+k.color+';display:flex;align-items:center;justify-content:center;font-size:14px;">🔑</div>'
      +'<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:'+k.color+';">'+k.label+'</div></div>';
    d.addEventListener('click',function(){
      selectedKey=k.id;
      kEl.querySelectorAll('.demo-coin').forEach(el=>{el.style.opacity='0.4';el.classList.remove('selected');});
      d.style.opacity='1';d.classList.add('selected');
      d.style.borderColor=k.color;
    });
    kEl.appendChild(d);
  });

  vaults.forEach(v=>{
    const d=document.createElement('div');
    d.className='demo-card';
    d.style.cssText='cursor:pointer;text-align:center;transition:all .3s;';
    d.innerHTML='<div style="font-size:36px;margin-bottom:6px;">🔒</div>'
      +'<div style="font-size:16px;font-weight:700;color:var(--orange);font-family:Space Mono,monospace;">'+v.name+'</div>'
      +'<div style="font-size:12px;color:var(--muted);margin-top:4px;">'+v.lockType+'</div>';
    d.addEventListener('click',function(){
      const r=document.getElementById('lockResult');r.classList.remove('hidden');
      if(selectedKey===null){
        r.className='demo-result';r.style.background='rgba(251,191,36,0.08)';r.style.border='2px solid #fbbf24';r.style.color='#fbbf24';
        r.innerHTML='<div class="demo-result-title">⚠️ No Key Selected</div><div class="demo-result-detail">Pick a key from your keyring first.</div>';
        return;
      }
      const correct=(selectedKey===v.keyId);
      if(v.lockType.includes('Time')&&correct){
        r.className='demo-result demo-result-fail';
        r.innerHTML='<div class="demo-result-title">⏰ Time-Locked!</div><div class="demo-result-detail">This UTXO cannot be spent until 2030. The correct key matches, but the timelock has not expired. Nodes reject this transaction.</div>';
      } else if(correct){
        r.className='demo-result demo-result-ok';
        r.innerHTML='<div class="demo-result-title">🔓 Unlocked!</div><div class="demo-result-detail">Your key matched the lock script. This UTXO can be spent.</div>';
        d.querySelector('div').textContent='🔓';
        d.style.borderColor='#4ade80';d.style.background='rgba(74,222,128,0.06)';
      } else {
        r.className='demo-result demo-result-fail';
        r.innerHTML='<div class="demo-result-title">❌ Wrong Key</div><div class="demo-result-detail">The key does not match the lock script. Every node on the network rejects this transaction.</div>';
      }
      selectedKey=null;kEl.querySelectorAll('.demo-coin').forEach(el=>{el.style.opacity='1';el.classList.remove('selected');});
    });
    vEl.appendChild(d);
  });
};

// ── Key Flow (seed phrase experiment) ──
let seedOriginal = '', seedOriginalAddr = '';
function deriveWallet(seed){
  const priv = sha256Hex(seed.trim().replace(/\s+/g,' ').toLowerCase());
  const pub = '02' + sha256Hex(priv).substring(0, 62);
  const addrHash = sha256Hex(pub);
  const b32 = '023456789acdefghjklmnpqrstuvwxyz';
  const addr = 'bc1q' + Array.from(addrHash.substring(0, 38)).map(function(c){ return b32[parseInt(c, 16) % 32] || b32[0]; }).join('');
  return {priv: priv, pub: pub, addr: addr};
}
function renderSeedExperiment(){
  const input = document.getElementById('seedInput'); if(!input) return;
  const w = deriveWallet(input.value);
  document.getElementById('seedPriv').textContent = w.priv;
  document.getElementById('seedPub').textContent = w.pub;
  document.getElementById('seedAddr').textContent = w.addr;
  const verdict = document.getElementById('seedVerdict');
  if(w.addr === seedOriginalAddr){
    verdict.className = 'demo-result demo-result-ok';
    verdict.innerHTML = '<div style="font-size:15px;font-weight:700;">✅ SAME WALLET</div><div class="demo-result-detail">These exact words always derive this exact address. Lose your phone, your laptop, your house - with these 12 words, your bitcoin comes back. That is wallet recovery.</div>';
  } else {
    verdict.className = 'demo-result demo-result-fail';
    verdict.innerHTML = '<div style="font-size:15px;font-weight:700;">⚠️ DIFFERENT WALLET</div><div class="demo-result-detail">You changed the words, so this is now a completely different wallet with a different address - your coins are not here. Restore the original words exactly and watch your wallet come back.</div>';
  }
}
function newSeedExperiment(){
  const words = Array.from({length:12}, function(){ return bip39Words[Math.floor(Math.random()*bip39Words.length)]; }).join(' ');
  document.getElementById('seedInput').value = words;
  seedOriginal = words;
  seedOriginalAddr = deriveWallet(words).addr;
  renderSeedExperiment();
}
modalInitFns.keys = function(){
  newSeedExperiment();
  document.getElementById('seedInput')?.addEventListener('input', renderSeedExperiment);
  document.getElementById('seedShuffleBtn')?.addEventListener('click', newSeedExperiment);
};

// ── Private Keys / Entropy ──
let entropyData=[], entropyCount=0;
function collectEntropy(e){
  const box=document.getElementById('entropyBox');
  const rect=box.getBoundingClientRect();
  const x=Math.floor(e.clientX-rect.left), y=Math.floor(e.clientY-rect.top);
  entropyData.push(x^y^(Date.now()%256));
  entropyCount=Math.min(100,entropyCount+1);
  document.getElementById('entropyPct').textContent=entropyCount+'%';
  document.getElementById('entropyBar').style.width=entropyCount+'%';
  const ep=document.getElementById('entropyPrompt');
  if(ep) ep.style.display=entropyCount>20?'none':'flex';
  if(entropyCount>=30){
    document.getElementById('privateKeyDisplay').textContent=sha256Hex(entropyData.join(','));
  }
  const ks=document.getElementById('keyStrength');
  if(entropyCount>=100){ks.textContent='\uD83D\uDD12 Excellent entropy! SHA-256 hashed into a 256-bit key.';ks.style.color='#4ade80';}
  else ks.textContent=entropyCount<50?'Keep moving...':entropyCount<80?'Almost there...':'Nearly enough!';
}
modalInitFns.privatekeys = function(){
  entropyData=[];entropyCount=0;
  const box = document.getElementById('entropyBox');
  box?.addEventListener('mousemove',collectEntropy);
  // Touch support: map finger movement to the same entropy collector
  box?.addEventListener('touchmove',function(e){
    e.preventDefault(); // keep the page from scrolling while collecting entropy
    const t = e.touches[0];
    if(t) collectEntropy({clientX:t.clientX, clientY:t.clientY});
  },{passive:false});
};

// ── Public Keys (one-way street game) ──
let pkTargetAddr = '', pkAttempts = 0;
function pkDerive(secret){
  const priv = sha256Hex(secret);
  const pub = '02' + sha256Hex(priv).substring(0, 62);
  const addrHash = sha256Hex(pub);
  const b32 = '023456789acdefghjklmnpqrstuvwxyz';
  return 'bc1q' + Array.from(addrHash.substring(0, 38)).map(function(c){ return b32[parseInt(c, 16) % 32] || b32[0]; }).join('');
}
modalInitFns.publickeys = function(){
  pkAttempts = 0;
  const forward = document.getElementById('pkSecret');
  function renderForward(){ document.getElementById('pkForwardAddr').textContent = pkDerive(forward.value); }
  forward?.addEventListener('input', renderForward);
  renderForward();
  // Secret target the user will never hit
  pkTargetAddr = pkDerive('satoshi-secret-' + Math.random().toString(36).slice(2) + Date.now());
  document.getElementById('pkTargetAddr').textContent = pkTargetAddr;
  const guess = document.getElementById('pkGuess');
  const result = document.getElementById('pkGuessResult');
  guess?.addEventListener('input', function(){
    if(!this.value){ result.innerHTML = ''; return; }
    pkAttempts++;
    const derived = pkDerive(this.value);
    if(derived === pkTargetAddr){
      result.innerHTML = '<span style="color:#4ade80;">MATCH! You broke SHA-256. Contact every cryptographer on Earth immediately.</span>';
      return;
    }
    let msg = 'Attempt ' + pkAttempts.toLocaleString() + ': ' + derived.substring(0, 24) + '... <span style="color:#f87171;">no match</span>';
    if(pkAttempts >= 8){
      msg += '<br/><span style="color:var(--text2);font-family:Inter,sans-serif;font-size:12px;">Keep going. At a billion guesses per second it takes about 10<sup>60</sup> years to search the space. The universe is 10<sup>10</sup> years old. This impossibility is what secures two trillion dollars.</span>';
    }
    result.innerHTML = msg;
  });
};

// ── Signatures ──
let _sigKeys = null, _sigData = null;
function buf2hex(buf){ return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join(''); }
modalInitFns.signatures = async function(){
  _sigKeys = null; _sigData = null;
  try {
    const kp = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const rawPriv = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
    const rawPub = await crypto.subtle.exportKey('spki', kp.publicKey);
    _sigKeys = {priv:kp.privateKey, pub:kp.publicKey, rawPriv:new Uint8Array(rawPriv), rawPub:new Uint8Array(rawPub)};
    document.getElementById('sigPrivKey').textContent = buf2hex(rawPriv).substring(0,48)+'...';
    document.getElementById('sigPubKey').textContent = buf2hex(rawPub).substring(0,48)+'...';
    document.getElementById('sigStep1').classList.add('complete');
  } catch(e){
    document.getElementById('sigPrivKey').textContent = 'Web Crypto unavailable';
    document.getElementById('sigPubKey').textContent = 'Web Crypto unavailable';
    return;
  }
  document.getElementById('signMsgBtn')?.addEventListener('click', async function(){
    const msg = document.getElementById('sigMessage').value;
    if(!msg || !_sigKeys) return;
    const enc = new TextEncoder().encode(msg);
    const sig = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, _sigKeys.priv, enc);
    _sigData = {message:msg, signature:new Uint8Array(sig)};
    document.getElementById('sigOutput').classList.remove('hidden');
    document.getElementById('sigVal').textContent = buf2hex(sig);
    document.getElementById('sigStep2').classList.add('complete');
    const vz = document.getElementById('sigVerifyZone');
    vz.classList.remove('hidden');
    document.getElementById('sigVerifyMsg').value = msg;
    document.getElementById('verifyResult').classList.add('hidden');
  });
  document.getElementById('verifyBtn')?.addEventListener('click', async function(){
    if(!_sigKeys || !_sigData) return;
    const verifyMsg = document.getElementById('sigVerifyMsg').value;
    const enc = new TextEncoder().encode(verifyMsg);
    let valid = false;
    try { valid = await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'}, _sigKeys.pub, _sigData.signature, enc); }
    catch(e){ valid = false; }
    const r = document.getElementById('verifyResult');
    r.classList.remove('hidden');
    const changed = verifyMsg !== _sigData.message;
    if(valid){
      r.className = 'demo-result demo-result-ok';
      document.getElementById('verifyTitle').textContent = '✅ VALID';
      document.getElementById('verifyDetail').textContent = 'The public key confirms this message was signed by the private key holder.';
      document.getElementById('sigStep3').classList.add('complete');
    } else {
      r.className = 'demo-result demo-result-fail';
      document.getElementById('sigStep3').classList.remove('complete');
      document.getElementById('verifyTitle').textContent = '❌ INVALID';
      document.getElementById('verifyDetail').textContent = changed
        ? 'The message was altered. Even one character change makes the signature worthless. Every node rejects this.'
        : 'The signature bytes were corrupted. The math no longer checks out. Nodes reject this transaction.';
    }
  });
  document.getElementById('tamperSigBtn')?.addEventListener('click', function(){
    if(!_sigData) return;
    const corrupted = new Uint8Array(_sigData.signature);
    const idx = Math.floor(Math.random() * corrupted.length);
    corrupted[idx] ^= (1 << Math.floor(Math.random() * 8));
    _sigData.signature = corrupted;
    document.getElementById('sigVal').textContent = buf2hex(corrupted);
    document.getElementById('verifyResult').classList.add('hidden');
    document.getElementById('sigStep3').classList.remove('complete');
  });
};

// ── Case Against Bitcoin (Honest Skeptic verdict game) ──
modalInitFns.caseagainst = function(){
  const claims = [
    {c:'Bitcoin is far too volatile to function as money today.', v:'fair', why:'Four drawdowns above 75% in fifteen years is real. Volatility is falling as the asset grows, but today it is a fair criticism.'},
    {c:'If you make one mistake in self-custody, nobody can help you.', v:'fair', why:'Roughly a fifth of all bitcoin is estimated lost forever. Irreversibility is the design, and the responsibility is fully yours. Fair.'},
    {c:'Bitcoin uses as much electricity as a mid-size country.', v:'fair', why:'Cambridge estimates 100-180 TWh per year. The number is real. The debate is whether the security it buys is worth it - a values question.'},
    {c:'A few whales own almost all the bitcoin, so the little guy has no chance.', v:'overstated', why:'Address statistics count exchange wallets holding millions of customers as single whales. Concentration is real but shrinks every cycle - this claim overstates it.'},
    {c:'Governments can shut Bitcoin down whenever they decide to.', v:'overstated', why:'China tried repeatedly and the network never missed a block. Governments can attack the on-ramps and the price, but killing the network itself has failed every time it was tried. Overstated - though hostile coordination remains the honest tail risk.'}
  ];
  const game = document.getElementById('skepticGame');
  let answered = 0, agreed = 0;
  game.innerHTML = '';
  claims.forEach(function(cl, i){
    const card = document.createElement('div');
    card.className = 'demo-step' + (i === 0 ? ' active' : '');
    card.innerHTML = '<div style="font-size:14px;font-weight:600;color:var(--text);line-height:1.6;margin-bottom:12px;">"' + cl.c + '"</div>'
      + '<div style="display:grid;gap:8px;grid-template-columns:1fr 1fr 1fr;">'
      + '<button class="sk-opt demo-btn demo-btn-ghost" data-v="overstated" style="font-size:12px;padding:10px;">Overstated</button>'
      + '<button class="sk-opt demo-btn demo-btn-ghost" data-v="fair" style="font-size:12px;padding:10px;">Fair</button>'
      + '<button class="sk-opt demo-btn demo-btn-ghost" data-v="understated" style="font-size:12px;padding:10px;">Understated</button>'
      + '</div>'
      + '<div class="sk-why demo-desc hidden" style="padding:12px;border-radius:10px;margin-top:10px;line-height:1.6;"></div>';
    card.querySelectorAll('.sk-opt').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(btn.disabled) return;
        const match = btn.dataset.v === cl.v;
        answered++; if(match) agreed++;
        card.querySelectorAll('.sk-opt').forEach(function(b){
          b.disabled = true; b.style.cursor = 'default';
          if(b.dataset.v === cl.v){ b.style.borderColor = '#a78bfa'; b.style.color = '#a78bfa'; b.style.background = 'rgba(167,139,250,0.1)'; }
        });
        if(!match){ btn.style.borderColor = '#f87171'; btn.style.color = '#f87171'; }
        const why = card.querySelector('.sk-why');
        why.classList.remove('hidden');
        why.style.background = 'rgba(167,139,250,0.06)';
        why.style.border = '1px solid rgba(167,139,250,0.3)';
        why.innerHTML = '<strong style="color:#a78bfa;">Evidence verdict: ' + cl.v.toUpperCase() + '.</strong> ' + cl.why;
        if(answered === claims.length){
          const sc = document.getElementById('skepticScore');
          sc.classList.remove('hidden');
          sc.className = 'demo-result ' + (agreed >= 3 ? 'demo-result-ok' : 'demo-result-fail');
          sc.innerHTML = '<div class="demo-result-title">Your judgment matched the evidence on ' + agreed + ' of ' + claims.length + '</div>'
            + '<div class="demo-result-detail">The point is not the score. The point is that some criticisms of Bitcoin are FAIR - and knowing which ones separates an investor from a gambler. Never put in money you cannot watch drop 70%.</div>';
        }
      });
    });
    game.appendChild(card);
  });
};

// ── Consensus & Upgrades ──
modalInitFns.consensus = function(){
  const legacyParts=[{label:'Version',bytes:4,color:'#60a5fa'},{label:'Inputs',bytes:41,color:'#a78bfa'},{label:'Outputs',bytes:34,color:'#fbbf24'},{label:'Signature',bytes:107,color:'#f87171'},{label:'Locktime',bytes:4,color:'#94a3b8'}];
  const segwitParts=[{label:'Version',bytes:4,color:'#60a5fa'},{label:'Marker',bytes:2,color:'#f59e0b'},{label:'Inputs',bytes:41,color:'#a78bfa'},{label:'Outputs',bytes:31,color:'#fbbf24'},{label:'Witness',bytes:55,color:'rgba(74,222,128,0.6)'},{label:'Locktime',bytes:4,color:'#94a3b8'}];
  function renderParts(el,parts,total){
    el.innerHTML='';
    parts.forEach(p=>{const d=document.createElement('div');d.style.cssText=`width:${(p.bytes/total*100).toFixed(1)}%;min-width:4px;height:24px;background:${p.color};display:inline-block;`;d.title=`${p.label}: ${p.bytes}B`;el.appendChild(d);});
    const lbl=document.createElement('div');lbl.className='flex flex-wrap gap-1 mt-2';
    parts.forEach(p=>{const s=document.createElement('span');s.style.cssText='font-size:12px;color:var(--muted);display:flex;align-items:center;gap:3px;';s.innerHTML=`<span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block;"></span>${p.label} (${p.bytes}B)`;lbl.appendChild(s);});
    el.appendChild(lbl);
  }
  renderParts(document.getElementById('legacyBlocks'),legacyParts,250);
  renderParts(document.getElementById('segwitBlocks'),segwitParts,137);
};

// ── Bitcoin Lore Quiz ──
modalInitFns.lore = function(){
  const questions=[
    {q:'Bitcoin whitepaper published',a:'2008',opts:['2007','2008','2009','2010']},
    {q:'Genesis block mined',a:'2009',opts:['2008','2009','2010','2011']},
    {q:'Bitcoin Pizza Day (10,000 BTC)',a:'2010',opts:['2009','2010','2011','2012']},
    {q:'Bitcoin reaches $1',a:'2011',opts:['2010','2011','2012','2013']},
    {q:'Satoshi\'s last message',a:'2011',opts:['2010','2011','2012','2013']},
    {q:'First halving',a:'2012',opts:['2011','2012','2013','2014']},
    {q:'HODL meme is born',a:'2013',opts:['2012','2013','2014','2015']},
    {q:'SegWit activates',a:'2017',opts:['2016','2017','2018','2019']},
    {q:'El Salvador adopts BTC',a:'2021',opts:['2020','2021','2022','2023']},
    {q:'Spot Bitcoin ETFs approved',a:'2024',opts:['2023','2024','2025','2026']}
  ];
  const quiz=document.getElementById('loreQuiz');
  if(!quiz)return;
  quiz.innerHTML='';
  questions.forEach((q,i)=>{
    const div=document.createElement('div');
    div.style.cssText='padding:10px 14px;border-radius:10px;background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.15);';
    div.innerHTML=`<div style="font-size:12px;font-weight:700;color:var(--orange);margin-bottom:6px;">${q.q}</div><div style="display:flex;gap:6px;flex-wrap:wrap;">${q.opts.map(o=>`<button class="lore-opt" data-qi="${i}" data-val="${o}" style="padding:6px 14px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:var(--text2);font-size:12px;font-family:'Space Mono',monospace;cursor:pointer;">${o}</button>`).join('')}</div>`;
    quiz.appendChild(div);
  });
  const answers={};
  quiz.addEventListener('click',e=>{
    const btn=e.target.closest('.lore-opt');
    if(!btn)return;
    const qi=btn.dataset.qi;
    answers[qi]=btn.dataset.val;
    btn.parentElement.querySelectorAll('.lore-opt').forEach(b=>{b.style.background='rgba(245,158,11,0.08)';b.style.borderColor='rgba(245,158,11,0.2)';b.style.color='var(--text2)';});
    btn.style.background='rgba(245,158,11,0.25)';btn.style.borderColor='var(--orange)';btn.style.color='var(--orange)';
  });
  document.getElementById('loreCheck')?.addEventListener('click',()=>{
    let correct=0;
    questions.forEach((q,i)=>{
      const btns=quiz.querySelectorAll(`[data-qi="${i}"]`);
      btns.forEach(b=>{
        if(b.dataset.val===q.a){b.style.background='rgba(74,222,128,0.2)';b.style.borderColor='#4ade80';b.style.color='#4ade80';}
        else if(b.dataset.val===answers[i]&&answers[i]!==q.a){b.style.background='rgba(248,113,113,0.2)';b.style.borderColor='#f87171';b.style.color='#f87171';}
      });
      if(answers[i]===q.a)correct++;
    });
    const res=document.getElementById('loreResult');
    if(res){res.classList.remove('hidden');res.innerHTML=`<div style="font-size:24px;font-weight:700;color:var(--orange);">${correct}/${questions.length}</div><div class="text-xs mt-1" style="color:var(--muted);">${correct===10?'Perfect! You are a true Bitcoiner.':correct>=7?'Impressive! You know your history.':correct>=4?'Not bad! Keep learning.':'Time to re-read the lore section!'}</div>`;}
  });
};

// ── Perspective (Future Simulator) ──
function runFutureSim(){
  const years = parseInt(document.getElementById('futureYears')?.value) || 10;
  const adoption = parseFloat(document.getElementById('adoptionRate')?.value) || 0.20;
  const deflation = parseFloat(document.getElementById('deflationRate')?.value) || 0.08;

  // Update year label
  const yl = document.getElementById('futureYearsLabel');
  if(yl) yl.textContent = years + ' years';

  // Gold: BTC starts at ~34 oz gold today, grows with adoption
  const goldBase = 34;
  const goldFuture = Math.round(goldBase * Math.pow(1 + adoption, years));
  const goldMax = Math.round(goldBase * Math.pow(1 + 0.30, 30)); // max for bar scale
  const gf = document.getElementById('goldFuture');
  if(gf) gf.textContent = '~' + goldFuture.toLocaleString() + ' oz gold';
  const gbm = document.getElementById('goldBarMax');
  if(gbm) gbm.textContent = goldMax.toLocaleString() + ' oz';
  const gbf = document.getElementById('goldBarFill');
  if(gbf) gbf.style.width = Math.min(100, (goldFuture / goldMax) * 100).toFixed(1) + '%';

  // Goods priced in sats - deflation makes them cheaper
  const goods = [
    {name:'\uD83C\uDF5E Loaf of bread', icon:'\uD83C\uDF5E', satsToday:500},
    {name:'\u26FD Gallon of gas', icon:'\u26FD', satsToday:800},
    {name:'\u2615 Coffee', icon:'\u2615', satsToday:350},
    {name:'\uD83C\uDFE0 Average home', icon:'\uD83C\uDFE0', satsToday:750000000},
    {name:'\uD83D\uDE97 New car', icon:'\uD83D\uDE97', satsToday:65000000},
    {name:'\uD83D\uDCF1 Smartphone', icon:'\uD83D\uDCF1', satsToday:15000000}
  ];
  const el = document.getElementById('futureGoods');
  if(!el) return;
  el.innerHTML = '';
  goods.forEach(g => {
    const futureSats = Math.round(g.satsToday * Math.pow(1 - deflation, years));
    const pctDrop = ((1 - futureSats / g.satsToday) * 100).toFixed(0);
    const d = document.createElement('div');
    d.className = 'flex items-center gap-3 p-2 rounded-lg';
    d.style.cssText = 'border:1px solid var(--glass-border);background:rgba(0,0,0,0.2);';
    const fmtToday = g.satsToday >= 1000000 ? (g.satsToday/1000000).toFixed(1)+'M' : g.satsToday >= 1000 ? (g.satsToday/1000).toFixed(0)+'k' : g.satsToday;
    const fmtFuture = futureSats >= 1000000 ? (futureSats/1000000).toFixed(1)+'M' : futureSats >= 1000 ? (futureSats/1000).toFixed(0)+'k' : futureSats;
    d.innerHTML = '<div style="font-size:20px;flex-shrink:0;">' + g.icon + '</div>' +
      '<div style="flex:1;"><div style="font-size:12px;color:var(--text);">' + g.name + '</div>' +
      '<div style="font-size:12px;color:var(--muted);">Today: <span style="color:var(--orange);font-family:Space Mono,monospace;">' + fmtToday + ' sats</span></div></div>' +
      '<div style="text-align:right;"><div style="font-family:Space Mono,monospace;font-size:13px;font-weight:bold;color:#4ade80;">' + fmtFuture + ' sats</div>' +
      '<div style="font-size:12px;color:#4ade80;">\u2193 ' + pctDrop + '% cheaper</div></div>';
    el.appendChild(d);
  });

  const msg = document.getElementById('deflationMsg');
  if(msg) msg.textContent = 'In ' + years + ' years, everything costs ' + Math.round((1 - Math.pow(1-deflation, years))*100) + '% less in Bitcoin. Your savings buy more every year.';
}

modalInitFns.perspective = function(){
  runFutureSim();
  document.getElementById('futureYears')?.addEventListener('input', runFutureSim);
  document.getElementById('adoptionRate')?.addEventListener('change', runFutureSim);
  document.getElementById('deflationRate')?.addEventListener('change', runFutureSim);
};

// ── Inflation Modal ──
function runInflSim(){
  const savings = parseFloat(document.getElementById('inflSavings')?.value) || 50000;
  const years = parseInt(document.getElementById('inflSimYears')?.value) || 10;
  document.getElementById('inflSimYearsLabel').textContent = years + ' years';
  const official = savings * Math.pow(1 - 0.03, years);
  const real = savings * Math.pow(1 - 0.10, years);
  document.getElementById('cpiOfficial').textContent = '$' + Math.round(official).toLocaleString();
  document.getElementById('cpiReal').textContent = '$' + Math.round(real).toLocaleString();
  document.getElementById('cpiOfficialLost').textContent = '$' + Math.round(savings - official).toLocaleString();
  document.getElementById('cpiRealLost').textContent = '$' + Math.round(savings - real).toLocaleString();
  document.getElementById('cpiGap').textContent = '$' + Math.round(official - real).toLocaleString();
}

modalInitFns.inflation = function(){
  runInflSim();
  document.getElementById('inflSavings')?.addEventListener('input', runInflSim);
  document.getElementById('inflSimYears')?.addEventListener('input', runInflSim);
  // Build tricks
  const tricks = [
    {name:'Substitution', icon:'\uD83E\uDD69\u2192\uD83C\uDF54', desc:'Steak too expensive? They assume you eat hamburger instead and measure that price. Your standard of living drops; CPI doesn\'t.'},
    {name:'Hedonic Adjustment', icon:'\uD83D\uDCF1\u2728', desc:'Your $1,200 phone costs the same as last year, but the BLS says it\'s "cheaper" because the camera improved. Your wallet disagrees.'},
    {name:'Geometric Weighting', icon:'\uD83D\uDCC9\u2696\uFE0F', desc:'Items that rise in price automatically get less weight in the index. Rising costs literally shrink in the statistics.'},
    {name:'Owner\'s Equiv. Rent', icon:'\uD83C\uDFE0\uD83D\uDCA8', desc:'Instead of measuring actual home prices (which soared 100%+), CPI uses a fictional "rental equivalent" that barely moved.'},
    {name:'Excluding Energy & Food', icon:'\u26FD\uD83C\uDF3D', desc:'"Core CPI" strips out the two things you spend the most on \u2014 food and energy \u2014 because they\'re "too volatile." Convenient.'}
  ];
  const el = document.getElementById('inflTricks');
  if(!el) return;
  el.innerHTML = '';
  tricks.forEach(t => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-xl cursor-pointer';
    div.setAttribute('role','button');
    div.setAttribute('tabindex','0');
    div.style.cssText = 'border:1px solid var(--glass-border);transition:all .2s;';
    div.innerHTML = '<div class="flex items-center gap-2 mb-1"><span style="font-size:16px;">' + t.icon + '</span><span style="color:var(--orange);font-size:12px;font-weight:700;">' + t.name + '</span></div><div style="display:none;font-size:12px;color:var(--muted);line-height:1.5;" class="trick-detail">' + t.desc + '</div>';
    const toggle = function(){ const d = this.querySelector('.trick-detail'); const vis = d.style.display === 'none'; d.style.display = vis?'block':'none'; this.style.background = vis?'var(--orange-dim)':''; this.style.borderColor = vis?'var(--orange)':'var(--glass-border)'; };
    div.addEventListener('click', toggle);
    div.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle.call(this); }});
    el.appendChild(div);
  });
};

// ── Deflation Modal ──
// When tech deflation rises, the fiat system MUST print more to service debt.
// Monetary inflation auto-adjusts: base 3% + techDefl * 1.3 (clamped to slider max).
let deflManualOverride = false;

function calcForcedInflation(techDefl){
  // Fiat debt system needs at least enough printing to mask deflation + service $300T debt
  return Math.min(20, Math.max(4, Math.round(techDefl * 1.3 + 3)));
}

function runDeflSim(){
  const techDefl = parseInt(document.getElementById('techDeflation')?.value) || 5;
  const monInfl = parseInt(document.getElementById('monetaryInflation')?.value) || 7;
  const cpi = monInfl - techDefl;
  document.getElementById('techDeflLabel').textContent = techDefl + '%';
  document.getElementById('monInflLabel').textContent = monInfl + '%';
  document.getElementById('deflDisp').textContent = '-' + techDefl + '%';
  document.getElementById('inflDisp').textContent = '+' + monInfl + '%';
  document.getElementById('cpiDisp').textContent = (cpi >= 0 ? '+' : '') + cpi + '%';
  document.getElementById('cpiDisp').style.color = cpi > 0 ? 'var(--orange)' : '#4ade80';
  document.getElementById('btcDeflBenefit').textContent = techDefl + '%';

  // Show the "forced printing" indicator
  const forceEl = document.getElementById('forcedPrintNote');
  if(forceEl){
    const forced = calcForcedInflation(techDefl);
    if(monInfl <= forced){
      forceEl.innerHTML = '\u26a0\ufe0f <span style="color:#f87171;font-weight:600;">Debt system response:</span> At ' + techDefl + '% tech deflation, central banks <em>must</em> print at least ' + forced + '% to prevent the $300T debt pyramid from collapsing. They have no choice \u2014 deflation kills debt-based money.';
      forceEl.style.display = 'block';
      forceEl.style.borderColor = 'rgba(248,113,113,0.4)';
    } else {
      forceEl.innerHTML = '\uD83D\uDD0D The system is printing ' + monInfl + '% \u2014 more than the ' + forced + '% minimum needed. The excess (' + (monInfl - forced) + '%) is pure hidden wealth transfer from savers to money printers.';
      forceEl.style.display = 'block';
      forceEl.style.borderColor = 'rgba(245,158,11,0.3)';
    }
  }

  const exp = document.getElementById('deflExplanation');
  if(cpi > 0) exp.innerHTML = '<span style="color:#f87171;">Money printing wins.</span> Technology reduced costs by ' + techDefl + '%, but ' + monInfl + '% money printing overwhelmed it. You experience ' + cpi + '% price increases. The ' + techDefl + '% productivity gain was stolen.';
  else if(cpi === 0) exp.innerHTML = '<span style="color:var(--orange);">Perfect balance \u2014 on paper.</span> Prices appear stable, but technology created ' + techDefl + '% deflation that you should be enjoying as cheaper goods. Instead, money printing absorbed it entirely.';
  else exp.innerHTML = '<span style="color:#4ade80;">Technology wins!</span> Even with ' + monInfl + '% money printing, technology\u2019s ' + techDefl + '% deflation is strong enough to push prices down ' + Math.abs(cpi) + '%. This rarely happens under fiat.';

  // Winners/losers
  const wl = document.getElementById('deflWinners');
  if(!wl) return;
  const stolen = techDefl;
  wl.innerHTML = '';
  [{who:'\uD83C\uDFE6 Central banks & first receivers',verdict:'WIN',color:'#f87171',why:'Get new money before prices adjust. Capture ' + stolen + '% of productivity.'},{who:'\uD83D\uDC77 Workers & savers',verdict:'LOSE',color:'#60a5fa',why:'Should enjoy ' + stolen + '% cheaper goods. Instead get ' + (cpi>0?cpi+'% price increases':'flat prices') + '.'},{who:'\u20BF Bitcoin holders',verdict:'WIN',color:'#f59e0b',why:'Fixed supply means 0% monetary inflation. Full ' + stolen + '% deflation passes through.'}].forEach(g => {
    const d = document.createElement('div');
    d.className = 'flex items-center gap-3 p-2 rounded-lg';
    d.style.cssText = 'border:1px solid ' + g.color + '44;background:' + g.color + '0a;';
    d.innerHTML = '<div style="flex:1;"><div style="color:' + g.color + ';font-size:12px;font-weight:bold;">' + g.who + '</div><div style="font-size:12px;color:var(--muted);">' + g.why + '</div></div><div style="font-family:Space Mono,monospace;font-size:12px;font-weight:bold;color:' + g.color + ';">' + g.verdict + '</div>';
    wl.appendChild(d);
  });
}

modalInitFns.deflation = function(){
  deflManualOverride = false;
  runDeflSim();

  const techSlider = document.getElementById('techDeflation');
  const monSlider = document.getElementById('monetaryInflation');

  // When tech deflation changes, FORCE monetary inflation up (debt system must respond)
  techSlider?.addEventListener('input', function(){
    const techDefl = parseInt(this.value);
    const forced = calcForcedInflation(techDefl);
    const currentMon = parseInt(monSlider.value);
    // Always push monetary inflation to at least the forced minimum
    if(currentMon < forced || !deflManualOverride){
      monSlider.value = forced;
      deflManualOverride = false;
    }
    runDeflSim();
  });

  // User CAN drag monetary slider up (override), but it can never go below forced min
  monSlider?.addEventListener('input', function(){
    deflManualOverride = true;
    const techDefl = parseInt(techSlider.value);
    const forced = calcForcedInflation(techDefl);
    if(parseInt(this.value) < forced){
      this.value = forced; // snap back - system won\u2019t allow it
    }
    runDeflSim();
  });
};


// ── Quick Address Generator (Wallets section) ──
document.getElementById('main-content').addEventListener('click', function handler(e){
  if(e.target.id === 'quickAddrBtn'){
    const chars = '023456789acdefghjklmnpqrstuvwxyz';
    let addr = 'bc1q';
    for(let i = 0; i < 38; i++) addr += chars[Math.floor(Math.random() * chars.length)];
    document.getElementById('quickAddr').textContent = addr;
    document.getElementById('quickAddrOutput').classList.remove('hidden');
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      for(let i = 0; i < 5; i++) setTimeout(() => spawnCoin(), i * 100);
    }
  }
  if(e.target.id === 'copyAddrBtn' || e.target.closest('#copyAddrBtn')){
    const addr = document.getElementById('walletAddress').textContent;
    navigator.clipboard.writeText(addr).then(() => {
      const fb = document.getElementById('copyFeedback');
      fb.classList.remove('hidden');
      setTimeout(() => fb.classList.add('hidden'), 2000);
    }).catch(()=>{});
  }
  if(e.target.id === 'copyQuickAddrBtn' || e.target.closest('#copyQuickAddrBtn')){
    const addr = document.getElementById('quickAddr').textContent;
    navigator.clipboard.writeText(addr).then(() => {
      const fb = document.getElementById('quickAddrFeedback');
      fb.classList.remove('hidden');
      setTimeout(() => fb.classList.add('hidden'), 2000);
    }).catch(()=>{});
  }
});

// ── Digital Money Timeline Modal ──
modalInitFns.digimoney = function(){
  const projects = [
    {year:'1989',name:'DigiCash (eCash)',icon:'\uD83D\uDCB3',pioneer:'David Chaum',innovation:'Blind signatures \u2014 anonymous digital payments',fatal:'Centralized company. DigiCash went bankrupt in 1998. System died.',lesson:'Digital money can\u2019t depend on a single company.',color:'#94a3b8'},
    {year:'1996',name:'e-gold',icon:'\uD83E\uDE99',pioneer:'Douglas Jackson',innovation:'Digital accounts backed by physical gold in vaults',fatal:'Centralized vault. US government shut it down in 2007.',lesson:'Even gold-backed money fails if there\u2019s a single throat to choke.',color:'#fbbf24'},
    {year:'1997',name:'HashCash',icon:'\u26CF',pioneer:'Adam Back',innovation:'Proof of Work \u2014 requiring computational work to earn something',fatal:'Not a currency. Only anti-spam tool. No ledger, no money.',lesson:'Proof of Work is a powerful primitive, but needs a full system around it.',color:'#60a5fa'},
    {year:'1998',name:'b-money',icon:'\uD83D\uDCDD',pioneer:'Wei Dai',innovation:'Proposed decentralized ledger + proof of work for money creation',fatal:'Never built. Remained a theoretical proposal.',lesson:'Brilliant concept, but code beats theory. You have to ship it.',color:'#a78bfa'},
    {year:'1998',name:'Bit Gold',icon:'\u2728',pioneer:'Nick Szabo',innovation:'Chained proof-of-work puzzles creating digital scarcity',fatal:'Never implemented. Couldn\u2019t solve the double-spending problem without a trusted party.',lesson:'Bitcoin\u2019s closest ancestor. Needed one more breakthrough.',color:'#f59e0b'},
    {year:'2004',name:'RPOW',icon:'\uD83D\uDD17',pioneer:'Hal Finney',innovation:'First working proof-of-work currency. Reusable tokens.',fatal:'Central server. Single point of failure.',lesson:'Proof of work can create value, but the server problem remained unsolved.',color:'#4ade80'},
    {year:'2006',name:'Liberty Reserve',icon:'\uD83C\uDFE6',pioneer:'Arthur Budovsky',innovation:'Digital currency with $6B+ in transactions',fatal:'Centralized in Costa Rica. US government seized it in 2013.',lesson:'Scale doesn\u2019t protect you. If there\u2019s a company, there\u2019s a target.',color:'#f87171'}
  ];
  const el = document.getElementById('digiTimeline');
  if(!el) return;
  el.innerHTML = '';
  projects.forEach(p => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-xl cursor-pointer';
    div.setAttribute('role','button');
    div.setAttribute('tabindex','0');
    div.style.cssText = 'border:1px solid '+p.color+'44;background:'+p.color+'08;transition:all .2s;';
    div.innerHTML = '<div class="flex items-center gap-2 mb-1"><span style="font-size:18px;">'+p.icon+'</span><span style="color:'+p.color+';font-size:12px;font-weight:700;font-family:Space Mono,monospace;">'+p.year+'</span><span style="color:var(--text);font-size:12px;font-weight:600;">'+p.name+'</span><span style="font-size:12px;color:var(--muted);">by '+p.pioneer+'</span></div><div style="display:none;font-size:12px;color:var(--muted);line-height:1.6;" class="digi-detail"><span style="color:#4ade80;">\u2713 Innovation: </span>'+p.innovation+'<br><span style="color:#f87171;">\u2717 Fatal flaw: </span>'+p.fatal+'<br><span style="color:var(--orange);">\uD83D\uDCA1 Lesson: </span>'+p.lesson+'</div>';
    const toggle = function(){ const d=this.querySelector('.digi-detail'); const vis=d.style.display==='none'; d.style.display=vis?'block':'none'; this.style.borderColor=vis?p.color:p.color+'44'; };
    div.addEventListener('click', toggle);
    div.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle.call(this); }});
    el.appendChild(div);
  });
};

// ── Satoshi Skill Stack ──
modalInitFns.satoshi = function(){
  const skills=[
    {skill:'Cryptography',why:'Combined SHA-256, ECDSA, and Merkle trees into a novel system no one had assembled before.',icon:'\uD83D\uDD10'},
    {skill:'C++ Systems Programming',why:'Wrote ~36,000 lines of networking-heavy code that has run for 17 years without a critical failure.',icon:'\uD83D\uDCBB'},
    {skill:'Economics & Monetary Theory',why:'Designed a deflationary monetary policy with game-theoretic incentives that align selfish actors toward honesty.',icon:'\uD83C\uDFE6'},
    {skill:'Distributed Systems',why:'Solved the Byzantine Generals Problem for digital money - enabling consensus without trust.',icon:'\uD83C\uDF10'},
    {skill:'Privacy & OpSec',why:'Remained anonymous despite billions in motivation to identify them. No metadata leaks in 17 years.',icon:'\uD83D\uDD75\uFE0F'},
    {skill:'Game Theory',why:'Created incentive structures where attacking the network costs more than cooperating. Still unbroken.',icon:'\uD83C\uDFAF'}
  ];
  const el=document.getElementById('satoshiSkills');
  if(!el)return;
  el.innerHTML='';
  skills.forEach(s=>{
    const d=document.createElement('div');
    d.style.cssText='padding:12px 14px;border-radius:10px;background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.15);cursor:pointer;';
    d.innerHTML=`<div style="display:flex;align-items:center;gap:10px;"><div style="font-size:18px;">${s.icon}</div><div><div style="font-size:12px;font-weight:700;color:var(--orange);">${s.skill}</div><div class="skill-why" style="font-size:12px;color:var(--text3);line-height:1.5;margin-top:4px;display:none;">${s.why}</div></div></div>`;
    d.addEventListener('click',()=>{const w=d.querySelector('.skill-why');w.style.display=w.style.display==='none'?'block':'none';});
    el.appendChild(d);
  });
};

// ── Whitepaper Accordion (event delegation, works on page load) ──
(function(){
  const acc = document.getElementById('whitepaperAccordion');
  if(!acc) return;
  acc.addEventListener('click', function(e){
    const header = e.target.closest('.wp-header');
    if(!header) return;
    const sec = header.closest('.wp-section');
    if(!sec) return;
    const body = sec.querySelector('.wp-body');
    const isOpen = sec.classList.contains('open');
    sec.classList.toggle('open');
    body.style.display = isOpen ? 'none' : 'block';
  });
  acc.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const header = e.target.closest('.wp-header');
    if(!header) return;
    e.preventDefault();
    header.click();
  });
})();

// ── Whitepaper Interactive Lesson ──
modalInitFns.whitepaper = function(){
  // Build a "Section Matcher" quiz inside the modal
  const quizData = [
    {section:'Abstract',q:'What is the core innovation Satoshi proposes?',options:['A faster database','Peer-to-peer cash without trusted third parties','A new programming language','A faster internet protocol'],answer:1},
    {section:'Transactions',q:'How does the whitepaper define an electronic coin?',options:['A file stored on your computer','A number in a bank database','A chain of digital signatures','A physical token'],answer:2},
    {section:'Proof-of-Work',q:'What existing system inspired Bitcoin\'s proof-of-work?',options:['CAPTCHA','Hashcash (Adam Back, 1997)','Visa\'s payment network','RSA encryption'],answer:1},
    {section:'Incentive',q:'What keeps miners honest according to Satoshi?',options:['Government regulation','Reputation scores','It\'s more profitable to follow rules than to cheat','A central authority'],answer:2},
    {section:'Timestamp Server',q:'What does the timestamp server prove?',options:['Who owns a coin','That data existed at a specific time','The price of bitcoin','How fast the network is'],answer:1},
    {section:'Network',q:'How many steps does Satoshi describe for running the network?',options:['3','5','7','12'],answer:1},
    {section:'Privacy',q:'How does the whitepaper describe Bitcoin\'s privacy model?',options:['Fully anonymous','Transactions public, identities private','Completely private','Same as banking'],answer:1},
    {section:'Calculations',q:'What happens to an attacker\'s odds with each new block?',options:['They stay the same','They increase linearly','They drop exponentially','They fluctuate randomly'],answer:2},
    {section:'SPV',q:'What does Simplified Payment Verification allow?',options:['Mining without hardware','Verifying payments without a full node','Reversing transactions','Creating new bitcoin'],answer:1},
    {section:'Reclaiming Disk Space',q:'What data structure enables pruning old transactions?',options:['Linked list','Binary search tree','Merkle tree','Hash table'],answer:2}
  ];
  const container = document.getElementById('wpQuiz');
  if(!container) return;
  let current = 0;
  let score = 0;
  function renderQ(){
    if(current >= quizData.length){
      container.innerHTML = `<div style="text-align:center;padding:20px;"><div style="font-size:36px;margin-bottom:12px;">${score >= 8 ? '\uD83C\uDFC6' : score >= 5 ? '\uD83D\uDC4D' : '\uD83D\uDCDA'}</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px;">${score}/${quizData.length} Correct</div><p style="font-size:13px;color:var(--text3);margin-bottom:16px;">${score >= 8 ? 'Excellent! You understand the whitepaper well.' : score >= 5 ? 'Good foundation! Review the sections you missed.' : 'Keep studying - re-read the sections above and try again!'}</p><button onclick="this.closest('[id=wpQuiz]').dataset.reset='1';modalInitFns.whitepaper();" class="btn-orange" style="font-size:13px;padding:10px 24px;">Try Again</button></div>`;
      return;
    }
    const d = quizData[current];
    container.innerHTML = `<div style="font-family:'Space Mono',monospace;font-size:12px;color:var(--muted);margin-bottom:6px;">Question ${current+1}/${quizData.length} - Section: ${d.section}</div><div style="font-size:14px;font-weight:600;margin-bottom:14px;">${d.q}</div><div id="wpOpts" style="display:flex;flex-direction:column;gap:6px;"></div>`;
    const opts = document.getElementById('wpOpts');
    d.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.style.cssText = 'text-align:left;padding:10px 14px;border-radius:8px;background:rgba(18,18,42,0.8);border:1px solid rgba(245,158,11,0.12);color:var(--text3);font-size:13px;cursor:pointer;transition:all .15s;';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        opts.querySelectorAll('button').forEach(b => { b.style.pointerEvents='none'; b.style.opacity='0.5'; });
        btn.style.opacity = '1';
        if(i === d.answer){
          score++;
          btn.style.borderColor = '#4ade80';
          btn.style.background = 'rgba(74,222,128,0.1)';
          btn.style.color = '#4ade80';
        } else {
          btn.style.borderColor = '#f87171';
          btn.style.background = 'rgba(248,113,113,0.1)';
          btn.style.color = '#f87171';
          opts.children[d.answer].style.opacity = '1';
          opts.children[d.answer].style.borderColor = '#4ade80';
          opts.children[d.answer].style.color = '#4ade80';
        }
        setTimeout(() => { current++; renderQ(); }, 1200);
      });
      btn.addEventListener('mouseenter', () => { if(btn.style.pointerEvents!=='none') btn.style.borderColor='rgba(245,158,11,0.4)'; });
      btn.addEventListener('mouseleave', () => { if(btn.style.pointerEvents!=='none') btn.style.borderColor='rgba(245,158,11,0.12)'; });
      opts.appendChild(btn);
    });
  }
  if(container.dataset.reset === '1'){
    current = 0; score = 0; container.dataset.reset = '';
  }
  renderQ();
};

// ── Altcoins Comparison Modal ──
modalInitFns.altcoins = function(){
  const cryptos = [
    {name:'Ethereum',icon:'\u25C7',ticker:'ETH',
     supply:'No hard cap \u2014 changed 5+ times',supplyBtc:'21M forever \u2014 never changed',
     founder:'Vitalik Buterin (known, active, influential)',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared 2011)',
     premine:'72M ETH pre-mined (~60% of initial supply)',premineBtc:'0 pre-mine. Satoshi mined alongside everyone else.',
     control:'Ethereum Foundation + core devs decide roadmap',controlBtc:'No foundation. Consensus of ~60,000 independent nodes.',
     outages:'Rolled back entire blockchain (DAO hack, 2016)',outagesBtc:'Zero rollbacks. Zero downtime since Jan 3, 2009.',
     consensus:'Proof of Stake \u2014 rich get richer',consensusBtc:'Proof of Work \u2014 real-world energy cost'},
    {name:'Solana',icon:'\u25CE',ticker:'SOL',
     supply:'No hard cap. ~4.6% annual inflation.',supplyBtc:'21M forever \u2014 never changed',
     founder:'Anatoly Yakovenko (known, active)',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared)',
     premine:'~48% to insiders & VCs at deep discounts',premineBtc:'0 pre-mine. Fair launch.',
     control:'Solana Labs + Solana Foundation',controlBtc:'No company. No foundation. Pure decentralization.',
     outages:'7+ total network outages (chain literally stopped)',outagesBtc:'Zero outages in 17 years.',
     consensus:'Proof of Stake + Proof of History',consensusBtc:'Proof of Work \u2014 battle-tested 17 years'},
    {name:'XRP (Ripple)',icon:'\u25C9',ticker:'XRP',
     supply:'100B pre-created. Company holds ~40B+',supplyBtc:'21M mined over 131 years via proof of work',
     founder:'Chris Larsen, Jed McCaleb, Arthur Britto',founderBtc:'Satoshi Nakamoto (unknown, gone)',
     premine:'100% pre-mined. All tokens created at genesis by company.',premineBtc:'0 pre-mine. Every coin earned through work.',
     control:'Ripple Labs (private company)',controlBtc:'No company. Open-source, community-governed.',
     outages:'Validators controlled by Ripple-approved list',outagesBtc:'Anyone can run a node. Permissionless.',
     consensus:'Ripple Protocol \u2014 trusted validator list',consensusBtc:'Proof of Work \u2014 trustless, permissionless'},
    {name:'BNB',icon:'\u25C6',ticker:'BNB',
     supply:'Fixed but controlled by Binance (quarterly burns)',supplyBtc:'21M forever. No one controls the schedule.',
     founder:'Changpeng Zhao (CZ) / Binance',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared)',
     premine:'100% created by Binance. 40% to team/founders.',premineBtc:'0 pre-mine. Fair launch.',
     control:'Binance (single company, single CEO)',controlBtc:'No company. ~60,000 independent node operators.',
     outages:'Chain halted multiple times by Binance decision',outagesBtc:'Never halted. Cannot be halted.',
     consensus:'Proof of Staked Authority \u2014 21 validators chosen by Binance',consensusBtc:'Proof of Work \u2014 open to anyone'},
    {name:'Cardano',icon:'\u25CB',ticker:'ADA',
     supply:'45B cap, but controlled by 3 organizations',supplyBtc:'21M cap enforced by code, not organizations',
     founder:'Charles Hoskinson (Ethereum co-founder)',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared)',
     premine:'~16% to IOHK/Emurgo/Foundation insiders',premineBtc:'0 pre-mine. No insider allocation.',
     control:'IOHK, Emurgo, Cardano Foundation (3 entities)',controlBtc:'No entity. Decentralized consensus.',
     outages:'No major outages, but minimal real-world usage after 8+ years',outagesBtc:'Processes billions in value daily for 17 years.',
     consensus:'Proof of Stake (Ouroboros)',consensusBtc:'Proof of Work \u2014 real energy, real security'},
    {name:'Tether (USDT)',icon:'\u20AE',ticker:'USDT',
     supply:'Unlimited \u2014 Tether Ltd mints at will',supplyBtc:'21M forever \u2014 never changed',
     founder:'Brock Pierce, Reeve Collins, Craig Sellars / iFinex',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared)',
     premine:'100% centrally issued. No mining, no distribution.',premineBtc:'0 pre-mine. Every coin earned through work.',
     control:'Tether Limited (single private company)',controlBtc:'No company. Open-source, community-governed.',
     outages:'Frozen $1.5B+ in user funds across hundreds of addresses',outagesBtc:'Zero funds frozen. No freeze capability exists.',
     consensus:'None \u2014 centrally issued IOU, not a blockchain',consensusBtc:'Proof of Work \u2014 trustless, permissionless'},
    {name:'USDC',icon:'\u25C9',ticker:'USDC',
     supply:'Unlimited \u2014 Circle mints and burns at will',supplyBtc:'21M forever \u2014 never changed',
     founder:'Jeremy Allaire / Circle (backed by Goldman Sachs)',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared)',
     premine:'100% centrally issued. Corporate stablecoin.',premineBtc:'0 pre-mine. Fair launch.',
     control:'Circle (single company). Can freeze any address.',controlBtc:'No company. No one can freeze funds.',
     outages:'De-pegged to $0.87 during SVB collapse (2023). $3.3B stuck.',outagesBtc:'Zero outages. Zero de-pegs. 17 years uptime.',
     consensus:'None \u2014 centralized ledger with blockchain wrappers',consensusBtc:'Proof of Work \u2014 real energy, real security'},
    {name:'Dogecoin',icon:'\u00D0',ticker:'DOGE',
     supply:'No cap. ~5B new DOGE minted per year, forever.',supplyBtc:'21M hard cap. Supply decreases every 4 years.',
     founder:'Billy Markus & Jackson Palmer (created as a joke)',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared)',
     premine:'No pre-mine, but infinite inflation by design.',premineBtc:'0 pre-mine. Disinflationary by design.',
     control:'No active development team. Price driven by Elon Musk tweets.',controlBtc:'Thousands of developers. Price driven by fundamentals.',
     outages:'No major outages, but no meaningful usage either.',outagesBtc:'Processes billions in value daily for 17 years.',
     consensus:'Proof of Work (Scrypt) \u2014 merge-mined with Litecoin',consensusBtc:'Proof of Work (SHA-256) \u2014 most secure network on Earth'},
    {name:'TRON',icon:'\u25D3',ticker:'TRX',
     supply:'~88B total. Controlled by Justin Sun.',supplyBtc:'21M forever \u2014 never changed',
     founder:'Justin Sun (SEC charged with fraud, 2023)',founderBtc:'Satoshi Nakamoto (pseudonymous, disappeared)',
     premine:'~34% to foundation & insiders at ICO.',premineBtc:'0 pre-mine. Fair launch.',
     control:'Justin Sun controls foundation, validators, and direction.',controlBtc:'No single person. Decentralized consensus.',
     outages:'27 Super Representatives \u2014 most tied to Sun or allies.',outagesBtc:'~60,000 independent nodes worldwide.',
     consensus:'Delegated Proof of Stake \u2014 27 block producers',consensusBtc:'Proof of Work \u2014 open to anyone'},
    {name:'Litecoin',icon:'\u0141',ticker:'LTC',
     supply:'84M cap (Bitcoin copy with 4x supply)',supplyBtc:'21M cap \u2014 the original.',
     founder:'Charlie Lee (sold all LTC at 2017 peak)',founderBtc:'Satoshi Nakamoto (never sold, disappeared)',
     premine:'No pre-mine (fair launch).',premineBtc:'0 pre-mine. Fair launch.',
     control:'Litecoin Foundation, but largely abandoned by founder.',controlBtc:'No foundation. Active global community.',
     outages:'No major outages, but declining relevance & hashrate.',outagesBtc:'Growing hashrate. All-time highs year after year.',
     consensus:'Proof of Work (Scrypt)',consensusBtc:'Proof of Work (SHA-256) \u2014 most secure network on Earth'}
  ];
  const btnsEl = document.getElementById('altcoinBtns');
  const compareEl = document.getElementById('altcoinCompare');
  const rowsEl = document.getElementById('altcoinRows');
  if(!btnsEl) return;
  btnsEl.innerHTML = '';
  cryptos.forEach(cr => {
    const btn = document.createElement('button');
    btn.className = 'seed-word cursor-pointer';
    btn.style.cssText = 'padding:8px 14px;font-size:12px;border-color:rgba(248,113,113,0.3);color:#f87171;transition:all .2s;';
    btn.textContent = cr.icon + ' ' + cr.name;
    btn.addEventListener('click', function(){
      compareEl.classList.remove('hidden');
      document.getElementById('altcoinIcon').textContent = cr.icon;
      document.getElementById('altcoinName').textContent = cr.name;
      rowsEl.innerHTML = '';
      const fields = [
        {label:'Supply Policy',btc:cr.supplyBtc,alt:cr.supply},
        {label:'Founder',btc:cr.founderBtc,alt:cr.founder},
        {label:'Pre-mine / Insider Allocation',btc:cr.premineBtc,alt:cr.premine},
        {label:'Who Controls It?',btc:cr.controlBtc,alt:cr.control},
        {label:'Outages / Rollbacks',btc:cr.outagesBtc,alt:cr.outages},
        {label:'Consensus Mechanism',btc:cr.consensusBtc,alt:cr.consensus}
      ];
      fields.forEach(f => {
        const row = document.createElement('div');
        row.className = 'p-3 rounded-xl';
        row.style.cssText = 'background:rgba(0,0,0,0.2);border:1px solid var(--glass-border);';
        row.innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px;">'+f.label+'</div><div class="grid grid-cols-2 gap-3 text-xs"><div style="color:#4ade80;">\u2705 '+f.btc+'</div><div style="color:#f87171;">\u274C '+f.alt+'</div></div>';
        rowsEl.appendChild(row);
      });
      btnsEl.querySelectorAll('button').forEach(b => b.style.opacity = '0.4');
      this.style.opacity = '1';
      this.style.borderColor = '#f87171';
      this.style.background = 'rgba(248,113,113,0.15)';
    });
    btnsEl.appendChild(btn);
  });
};

// ── Pizza Divisibility Modal ──
function runPizzaSim(){
  const price = parseInt(document.getElementById('pizzaBtcPrice')?.value) || 1000000;
  document.getElementById('pizzaPriceLabel').textContent = '$' + price.toLocaleString();
  const satPrice = price / 100000000;
  document.getElementById('pizzaPerSat').textContent = '$' + satPrice.toFixed(satPrice < 0.01 ? 4 : 2);
  document.getElementById('pizzaPerPersonUSD').textContent = '$' + Math.round(262500 * satPrice).toLocaleString();
  const goods = [
    {name:'\u2615 Coffee',usd:5},{name:'\uD83C\uDF5E Bread',usd:4},{name:'\u26FD Gallon of gas',usd:3.50},
    {name:'\uD83C\uDF55 Pizza',usd:15},{name:'\uD83D\uDCF1 iPhone',usd:1200},{name:'\uD83D\uDE97 Used car',usd:25000},
    {name:'\uD83C\uDFE0 Median home',usd:420000},{name:'\uD83C\uDFEB College tuition (1yr)',usd:45000}
  ];
  const el = document.getElementById('pizzaGoods');
  if(!el) return;
  el.innerHTML = '';
  goods.forEach(g => {
    const sats = Math.round(g.usd / satPrice);
    const fmt = sats >= 1000000 ? (sats/1000000).toFixed(2)+'M' : sats >= 1000 ? (sats/1000).toFixed(1)+'k' : sats;
    const d = document.createElement('div');
    d.className = 'flex items-center justify-between p-2 rounded-lg';
    d.style.cssText = 'border:1px solid var(--glass-border);background:rgba(0,0,0,0.2);';
    d.innerHTML = '<div style="font-size:13px;color:var(--text);">' + g.name + ' <span style="color:var(--muted);font-size:12px;">($' + g.usd.toLocaleString() + ')</span></div><div style="font-family:Space Mono,monospace;font-size:13px;font-weight:bold;color:var(--orange);">' + fmt + ' sats</div>';
    el.appendChild(d);
  });
}
modalInitFns.pizza = function(){
  runPizzaSim();
  document.getElementById('pizzaBtcPrice')?.addEventListener('input', runPizzaSim);
};

// ── Myths Modal ──
// ── Tulip Mania Interactive Lesson ──
modalInitFns.tulips = function(){
  const facts = [
    {text:'Supply is mathematically capped and can never be changed.',answer:'bitcoin'},
    {text:'Supply could be increased by anyone with soil and patience.',answer:'tulip'},
    {text:'Market lasted roughly 3 years before total collapse.',answer:'tulip'},
    {text:'Has survived 475+ declared "deaths" over 17 years.',answer:'bitcoin'},
    {text:'Prices driven entirely by social status among Dutch elites.',answer:'tulip'},
    {text:'Secured by roughly 1,000 EH/s of computing power worldwide.',answer:'bitcoin'},
    {text:'Futures contracts traded on items that hadn\'t been dug up yet.',answer:'tulip'},
    {text:'Can be sent to anyone on Earth in under 10 minutes.',answer:'bitcoin'},
    {text:'The underlying asset physically rotted within weeks.',answer:'tulip'},
    {text:'Adopted as legal tender by a sovereign nation.',answer:'bitcoin'},
    {text:'Trading was limited to a handful of Dutch cities.',answer:'tulip'},
    {text:'Runs 24/7 on a decentralized global network with 99.99% uptime.',answer:'bitcoin'}
  ];
  const container = document.getElementById('tulipQuiz');
  if(!container) return;
  let idx = 0, score = 0;
  function render(){
    if(idx >= facts.length){
      container.innerHTML = `<div style="text-align:center;padding:20px;"><div style="font-size:36px;margin-bottom:12px;">${score >= 10 ? '\uD83C\uDFC6' : score >= 7 ? '\uD83D\uDC4D' : '\uD83C\uDF37'}</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px;">${score}/${facts.length} Correct</div><p style="font-size:13px;color:var(--text3);margin-bottom:16px;">${score >= 10 ? 'You clearly know the difference!' : score >= 7 ? 'Solid - you won\'t fall for the comparison.' : 'Review the section above and try again!'}</p><button onclick="document.getElementById('tulipQuiz').dataset.reset='1';modalInitFns.tulips();" class="btn-orange" style="font-size:13px;padding:10px 24px;">Try Again</button></div>`;
      return;
    }
    const f = facts[idx];
    container.innerHTML = `<div style="font-family:'Space Mono',monospace;font-size:12px;color:var(--muted);margin-bottom:6px;">${idx+1}/${facts.length}</div><div style="font-size:14px;font-weight:600;margin-bottom:14px;line-height:1.6;">"${f.text}"</div><div style="display:flex;gap:10px;justify-content:center;"><button id="tulipBtn" style="padding:12px 24px;border-radius:8px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);color:#f87171;font-size:13px;cursor:pointer;font-weight:600;">\uD83C\uDF37 Tulip</button><button id="btcBtn" style="padding:12px 24px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:var(--orange);font-size:13px;cursor:pointer;font-weight:600;">\u20BF Bitcoin</button></div>`;
    const handle = (choice) => {
      const correct = choice === f.answer;
      if(correct) score++;
      const btn = choice === 'tulip' ? document.getElementById('tulipBtn') : document.getElementById('btcBtn');
      btn.style.background = correct ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)';
      btn.style.borderColor = correct ? '#4ade80' : '#f87171';
      btn.style.color = correct ? '#4ade80' : '#f87171';
      document.getElementById('tulipBtn').style.pointerEvents = 'none';
      document.getElementById('btcBtn').style.pointerEvents = 'none';
      setTimeout(() => { idx++; render(); }, 900);
    };
    document.getElementById('tulipBtn').addEventListener('click', () => handle('tulip'));
    document.getElementById('btcBtn').addEventListener('click', () => handle('bitcoin'));
  }
  if(container.dataset.reset === '1'){ idx = 0; score = 0; container.dataset.reset = ''; }
  render();
};

modalInitFns.myths = function(){
  const myths = [
    {myth:'No intrinsic value',attack:'It\'s just code! You can\'t hold it!',counter:'Nothing has intrinsic value \u2014 value is always subjective. A dollar bill is cotton with ink. Gold is a shiny metal. Value comes from useful properties + network agreement. Bitcoin has: provable scarcity, portability, divisibility, censorship resistance, and the largest computing network on Earth securing it.',verdict:'Bitcoin has more verifiable monetary properties than any asset in history.'},
    {myth:'Only for criminals',attack:'Drug dealers and ransomware!',counter:'Less than 0.5% of crypto volume is illicit (Chainalysis 2024). Cash is used in far more crime \u2014 and is truly untraceable. Bitcoin is a public ledger. Every transaction is recorded forever. Law enforcement loves blockchain forensics.',verdict:'Bitcoin is the worst possible tool for crime and the best possible tool for transparency.'},
    {myth:'Wastes energy',attack:'It uses as much electricity as a country!',counter:'Bitcoin uses ~150 TWh/year. The traditional financial system uses an estimated ~260 TWh/year \u2014 2-3x more when you count 80,000+ bank branches, millions of ATMs, armored truck fleets, and massive data centers. Over 50% of Bitcoin mining uses sustainable energy. Much mining captures stranded/wasted energy (methane flaring, hydro overflow). And that\'s before counting the military energy needed to enforce fiat reserve currency status.',verdict:'Bitcoin secures a $2T network with less energy than the system it replaces \u2014 and no employees.'},
    {myth:'Too volatile',attack:'It dropped 80% in 2022!',counter:'Zoom out. Every 4-year cycle low > previous cycle high. $0 \u2192 $100K in 16 years. Volatility decreases over time as market cap grows. The dollar lost 97% since 1913 \u2014 that\'s not "stable," it\'s a slow crash in one direction.',verdict:'Bitcoin\'s volatility is the price of the fastest monetary adoption in history. It\'s temporary.'},
    {myth:'Government will ban it',attack:'They\'ll just make it illegal!',counter:'China banned it twice \u2014 hash rate recovered in weeks. India reversed its ban. Nigeria\'s ban increased P2P adoption. The US approved spot Bitcoin ETFs. You can\'t ban math. Bitcoin is a protocol, like email.',verdict:'Governments that tried to ban the internet failed. Banning Bitcoin is harder.'},
    {myth:'No yield',attack:'It just sits there! At least bonds pay interest!',counter:'Show me yield and I\'ll show you risk. Every yield is someone else\'s promise to repay \u2014 with money they may need to print. Bond yield? Gov\'t inflates it away. Bank savings? They lend 90% of your deposit. FTX "yield"? Fraud. Bitcoin has zero counterparty risk. No one can default on it, dilute it, or freeze it. Its ~55% CAGR over 10 years comes from adoption, not from someone else\'s liability.',verdict:'The absence of yield IS the feature. It means no one else has to keep a promise for your money to hold value.'}
  ];
  const el = document.getElementById('mythCards');
  if(!el) return;
  el.innerHTML = '';
  myths.forEach((m, i) => {
    const div = document.createElement('div');
    div.className = 'glass p-4 rounded-xl';
    div.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="background:rgba(248,113,113,0.15);color:#f87171;font-size:12px;font-weight:700;padding:3px 8px;border-radius:4px;">MYTH #'+(i+1)+'</span><span style="font-weight:700;font-size:13px;color:var(--text);">"'+m.myth+'"</span></div><div style="display:flex;gap:8px;margin-bottom:8px;"><div style="flex:1;padding:8px;border-radius:8px;background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);font-size:12px;color:#f87171;"><strong>\uD83D\uDDE3 Attack:</strong> '+m.attack+'</div></div><button class="btn-orange text-xs py-2 px-4 w-full myth-reveal-btn" style="font-size:12px;">Debunk This Myth \u2192</button><div class="myth-reveal hidden mt-3"><div style="padding:10px;border-radius:8px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:8px;"><strong style="color:#4ade80;">\u2705 Reality:</strong> '+m.counter+'</div><div style="padding:8px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid var(--glass-border);font-size:12px;color:var(--orange);font-weight:600;text-align:center;">'+m.verdict+'</div></div>';
    const btn = div.querySelector('.myth-reveal-btn');
    const reveal = div.querySelector('.myth-reveal');
    btn.addEventListener('click', function(){ reveal.classList.toggle('hidden'); this.textContent = reveal.classList.contains('hidden') ? 'Debunk This Myth \u2192' : 'Hide \u2191'; });
    el.appendChild(div);
  });
};

// ── Money Printer Game ──
let printerTotal = 0, printerClicks = 0;
document.getElementById('main-content').addEventListener('click', function(e){
  if(e.target.id === 'printerBtn' || e.target.closest('#printerBtn')){
    printerClicks++;
    const amounts = [500000000000, 800000000000, 1200000000000, 1500000000000, 2000000000000, 300000000000, 600000000000, 900000000000, 4600000000000];
    printerTotal += amounts[Math.floor(Math.random() * amounts.length)];
    document.getElementById('printerTotal').textContent = '$' + (printerTotal / 1000000000000).toFixed(2) + ' TRILLION';
    document.getElementById('printerTotal').style.transform = 'scale(1.1)';
    setTimeout(() => document.getElementById('printerTotal').style.transform = 'scale(1)', 150);
    document.getElementById('printerClicks').textContent = printerClicks + ' click' + (printerClicks!==1?'s':'') + ' \u2022 ' + printerClicks + ' keystroke' + (printerClicks!==1?'s':'') + ' \u2022 0 effort';
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      for(let i=0;i<3;i++) setTimeout(()=>spawnCoin(),i*60);
    }
  }
});

// ── Fiat Graveyard Modal (Apocalypse Simulator) ──
modalInitFns.fiatgraveyard = function(){
  const stages = [
    {stage:'Stage 1: Denial',icon:'\uD83D\uDE36',action:'Government insists "the economy is strong." Fed lowers interest rates. Deficits grow.',consequence:'Temporary relief. Markets rally. Public relaxes. Debt doubles.',historical:'Weimar 1919: "Temporary measures." Zimbabwe 2000: "The economy is fine."'},
    {stage:'Stage 2: Print',icon:'\uD83D\uDDA8\uFE0F',action:'Fed buys government bonds with newly created money. Trillions enter the system. QE becomes permanent.',consequence:'Asset prices soar. Stocks, housing, crypto all moon. Ordinary goods start rising. Wages don\u2019t keep up.',historical:'Weimar 1921: Printing accelerates. Venezuela 2014: Central bank monetizes debt.'},
    {stage:'Stage 3: Controls',icon:'\uD83D\uDD12',action:'Government imposes price controls, capital controls, withdrawal limits. Banks restrict wire transfers.',consequence:'Black markets emerge. Real economy goes underground. Trust in institutions collapses.',historical:'Rome 301 AD: Diocletian\u2019s price edict. Venezuela 2016: price controls cause empty shelves.'},
    {stage:'Stage 4: Confiscation',icon:'\uD83D\uDEA8',action:'Government seizes assets: gold, retirement accounts (forced into government bonds), property. "Emergency measures."',consequence:'Savings trapped. Private wealth absorbed by the state. FDR did this in 1933 with gold.',historical:'USA 1933: Gold confiscation (Executive Order 6102). Cyprus 2013: Bank deposits seized. Poland 2014: Pension funds nationalized.'},
    {stage:'Stage 5: Collapse & Reset',icon:'\uD83D\uDCA5',action:'Currency hyperinflates or is abandoned. Government introduces a "new" currency at a devastating exchange rate. 1,000,000 old = 1 new.',consequence:'Lifetime savings wiped out. Middle class destroyed. Power consolidates. Cycle begins again with new currency.',historical:'Weimar 1923: Rentenmark replaces Mark (1 trillion:1). Zimbabwe 2009: Dollar abandoned. Venezuela: 3 redenominations, 14 zeros removed.'}
  ];
  const el = document.getElementById('collapseStages');
  if(!el) return;
  el.innerHTML = '';
  stages.forEach((s,i) => {
    const d = document.createElement('div');
    d.className = 'p-3 rounded-xl cursor-pointer';
    d.setAttribute('role','button');d.setAttribute('tabindex','0');
    d.style.cssText = 'border:1px solid rgba(248,113,113,'+(0.15+i*0.05)+');background:rgba(248,113,113,'+(0.02+i*0.015)+');transition:all .2s;';
    d.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-size:16px;">'+s.icon+'</span><span style="color:#f87171;font-size:12px;font-weight:700;">'+s.stage+'</span></div><div style="display:none;font-size:12px;color:var(--muted);line-height:1.6;" class="stage-detail"><div style="margin-bottom:6px;"><strong style="color:var(--text);">What they do:</strong> '+s.action+'</div><div style="margin-bottom:6px;"><strong style="color:#f87171;">What happens:</strong> '+s.consequence+'</div><div><strong style="color:var(--orange);">Historical precedent:</strong> '+s.historical+'</div></div>';
    const toggle = function(){ const det=this.querySelector('.stage-detail'); const vis=det.style.display==='none'; det.style.display=vis?'block':'none'; };
    d.addEventListener('click',toggle);
    d.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle.call(this);}});
    el.appendChild(d);
  });

  // Assets impact
  const assets = [
    {name:'Savings Account',icon:'\uD83C\uDFE6',fiat:'Purchasing power drops 30-90%. Withdrawal limits imposed. Interest rate below inflation.',btc:'Self-custodied. No withdrawal limits. Appreciates as fiat collapses.',color:'#f87171'},
    {name:'Stocks / 401k',icon:'\uD83D\uDCC8',fiat:'Market nominally rises (in worthless dollars). Real returns negative. Government may force conversion to treasury bonds.',btc:'Bitcoin has historically outperformed all stock indices over any 4-year period.',color:'#f97316'},
    {name:'Real Estate',icon:'\uD83C\uDFE0',fiat:'Nominally rises but property taxes skyrocket. Government may impose wealth taxes or occupancy mandates. Illiquid.',btc:'Portable. Crosses borders. Can\u2019t be taxed by geography. Instantly liquid 24/7.',color:'#fbbf24'},
    {name:'Gold',icon:'\uD83E\uDE99',fiat:'Historically strong but confiscatable (FDR 1933). Heavy, hard to verify, hard to divide, hard to transport across borders.',btc:'Same scarcity thesis but digital: weightless, verifiable, divisible to 8 decimals, borderless.',color:'#f59e0b'}
  ];
  const aEl = document.getElementById('collapseAssets');
  if(aEl){ aEl.innerHTML=''; assets.forEach(a=>{ const d=document.createElement('div'); d.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px;border-radius:10px;border:1px solid var(--glass-border);'; d.innerHTML='<div style="padding:8px;border-radius:8px;background:rgba(248,113,113,0.05);"><div style="font-size:12px;font-weight:700;color:'+a.color+';">'+a.icon+' '+a.name+' (Fiat Collapse)</div><div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5;">'+a.fiat+'</div></div><div style="padding:8px;border-radius:8px;background:rgba(245,158,11,0.05);"><div style="font-size:12px;font-weight:700;color:var(--orange);">\u20BF Same Asset in Bitcoin</div><div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5;">'+a.btc+'</div></div>'; aEl.appendChild(d); }); }

  // Historical comparisons
  const comps = [
    {name:'Weimar Germany',year:'1923',whatHappened:'Printed to pay war debts. Prices doubled every 3.7 days. Savings destroyed. Middle class wiped out.',usdParallel:'US printing to service $35T debt. $4.6T created 2020-21. Same mechanism, slower timeline.'},
    {name:'Zimbabwe',year:'2008',whatHappened:'Printed to fund government. 79.6 billion% monthly inflation. Currency abandoned entirely.',usdParallel:'US debt-to-GDP ratio (120%+) now exceeds Zimbabwe\u2019s at the start of its crisis.'},
    {name:'Venezuela',year:'2018',whatHappened:'Oil revenue collapsed. Printed to fill gap. 1,000,000%+ inflation. Citizens fled or turned to Bitcoin/USD.',usdParallel:'If US loses reserve currency status (petrodollar weakening, BRICS alternatives), the same dynamic applies.'}
  ];
  const cEl = document.getElementById('collapseCompare');
  if(cEl){ cEl.innerHTML=''; comps.forEach(co=>{ const d=document.createElement('div'); d.className='p-3 rounded-xl'; d.style.cssText='border:1px solid var(--glass-border);background:rgba(0,0,0,0.2);'; d.innerHTML='<div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:4px;">'+co.name+' ('+co.year+')</div><div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:6px;">'+co.whatHappened+'</div><div style="font-size:12px;color:var(--orange);line-height:1.5;padding:6px 8px;border-radius:6px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);"><strong>USD parallel:</strong> '+co.usdParallel+'</div>'; cEl.appendChild(d); }); }
};

// ── Mint Bitcoin Button ──
document.getElementById('main-content').addEventListener('click', function(e){
  if(e.target.id === 'mintBtcBtn' || e.target.closest('#mintBtcBtn')){
    const r = document.getElementById('mintBtcResult');
    r.classList.remove('hidden');
    const msgs = [
      {title:'Oops! You need:',items:['~143,000,000 TH/s of SHA-256 hashing power','A warehouse of Antminer S21 Pro ASICs (~$7,000 each)','~$35,000\u2013$50,000 in electricity per block','Approximately 1.8 megawatts of continuous power','10 minutes of thermodynamic work competing against the entire planet']},
      {title:'Nice try! To create just ONE Bitcoin you\'d need:',items:['The equivalent electricity of powering 900 US homes for 10 minutes','~$40,000 in energy costs at current rates','Specialized chips that do nothing but calculate SHA-256 hashes','To win a global lottery against miners spending $50+ billion/year','And even then, you can\u2019t create "extra" \u2014 only mine the next scheduled block reward']},
      {title:'Sorry! Bitcoin doesn\'t work like fiat:',items:['No CEO can vote to "mint more"','No emergency meeting can change the supply','No government can pressure anyone to create extra','The code enforces 21 million. Period. Forever.','You\u2019d need to convince 60,000+ independent node operators worldwide to change their software. Good luck.']}
    ];
    const msg = msgs[Math.floor(Math.random()*msgs.length)];
    r.innerHTML = '<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:15px;color:#f87171;margin-bottom:10px;">\u274C '+msg.title+'</div>' + msg.items.map(item => '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;"><span style="color:var(--orange);font-size:12px;flex-shrink:0;">\u26A1</span><span style="font-size:12px;color:var(--text2);line-height:1.5;">'+item+'</span></div>').join('') + '<div style="margin-top:12px;padding:10px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);text-align:center;font-size:12px;color:var(--orange);"><strong>The Fed creates $1 trillion with a keystroke. Creating 1 Bitcoin requires more energy than a small town uses in a day.</strong> That\u2019s the difference.</div>';
  }
});

// ── Live Debt Clock ──
(function(){
  var BASE_DEBT = 40_550_000_000_000; // Treasury total public debt outstanding, early Nov 2026
  var BASE_DATE = new Date('2026-11-03').getTime();
  var GROWTH_PER_MS = 7_000_000_000 / 86_400_000; // ~$7B per day (Mar 2025 - Nov 2026 average)
  var US_CITIZENS = 342_000_000;
  var US_TAXPAYERS = 130_000_000;
  var openTime = Date.now();

  function fmtD(n){ return '$' + Math.floor(n).toLocaleString('en-US'); }

  function tick(){
    var elapsed = Date.now() - BASE_DATE;
    var debt = BASE_DEBT + (elapsed * GROWTH_PER_MS);
    var el = document.getElementById('debtClock');
    if(el) el.textContent = fmtD(debt);
    var cp = document.getElementById('debtPerCitizen');
    if(cp) cp.textContent = fmtD(debt / US_CITIZENS);
    var tp = document.getElementById('debtPerTaxpayer');
    if(tp) tp.textContent = fmtD(debt / US_TAXPAYERS);
    var sinceEl = document.getElementById('debtSinceOpen');
    if(sinceEl){
      var added = (Date.now() - openTime) * GROWTH_PER_MS;
      sinceEl.textContent = fmtD(added);
    }
    requestAnimationFrame(tick);
  }
  if(document.getElementById('debtClock')) tick();
})();

// ── Interest vs Defense Chart ──
(function(){
  var cvs = document.getElementById('interestVsDefenseChart');
  if(!cvs) return;
  var ctx = cvs.getContext('2d');

  // Historical + projected data (billions)
  // Sources: CBO Budget Projections, Treasury Dept
  var years =   [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
  var interest = [223,  240,  263,  325,  375,  345,  352,  475,  659,  882,  952, 1030, 1120, 1200, 1350, 1500, 1550, 1600, 1650, 1700, 1750];
  var defense =  [596,  585,  590,  623,  676,  714,  742,  766,  805,  849,  874,  895,  915,  935,  955,  975,  995, 1015, 1035, 1055, 1075];
  var revenue =  [3250, 3270, 3320, 3330, 3460, 3420, 4050, 4900, 4440, 4920, 5000, 5150, 5300, 5450, 5600, 5750, 5900, 6050, 6200, 6350, 6500];
  var projStart = 10; // index where projections begin (2025)

  function draw(){
    var dpr = window.devicePixelRatio || 1;
    var rect = cvs.getBoundingClientRect();
    cvs.width = rect.width * dpr;
    cvs.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    var W = rect.width, H = rect.height;
    var pad = {top:20, right:20, bottom:30, left:50};
    var gW = W - pad.left - pad.right;
    var gH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Scale
    var maxVal = Math.max(...revenue) * 1.05;
    function x(i){ return pad.left + (i / (years.length - 1)) * gW; }
    function y(v){ return pad.top + gH - (v / maxVal) * gH; }

    // Grid lines
    ctx.strokeStyle = 'rgba(245,158,11,0.08)';
    ctx.lineWidth = 0.5;
    for(var g = 0; g <= 5; g++){
      var gy = pad.top + (g / 5) * gH;
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
      var lbl = ((5 - g) / 5 * maxVal / 1000).toFixed(1) + 'T';
      ctx.fillStyle = '#6b7280'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
      ctx.fillText('$' + lbl, pad.left - 6, gy + 3);
    }

    // Year labels
    ctx.textAlign = 'center';
    for(var yi = 0; yi < years.length; yi += 2){
      ctx.fillStyle = '#6b7280'; ctx.font = '9px monospace';
      ctx.fillText(years[yi], x(yi), H - 8);
    }

    // Projection zone
    ctx.fillStyle = 'rgba(248,113,113,0.04)';
    ctx.fillRect(x(projStart), pad.top, W - pad.right - x(projStart), gH);
    ctx.fillStyle = '#6b7280'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText('PROJECTED →', x(projStart) + 4, pad.top + 12);

    function drawLine(data, color, dashProj){
      // Solid portion
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath();
      for(var i = 0; i <= Math.min(projStart, data.length - 1); i++){
        if(i === 0) ctx.moveTo(x(i), y(data[i])); else ctx.lineTo(x(i), y(data[i]));
      }
      ctx.stroke();
      // Dashed projection
      if(dashProj && projStart < data.length - 1){
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x(projStart), y(data[projStart]));
        for(var j = projStart + 1; j < data.length; j++) ctx.lineTo(x(j), y(data[j]));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw lines: revenue (blue), defense (orange), interest (red)
    drawLine(revenue, '#60a5fa', true);
    drawLine(defense, '#f59e0b', true);
    drawLine(interest, '#f87171', true);

    // Crossover label
    ctx.fillStyle = '#f87171'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('INTEREST > DEFENSE', x(9) + 20, y(interest[9]) - 10);
  }

  draw();
  window.addEventListener('resize', draw);
})();

// ── Personal Inflation Calculator ──
(function(){
  const items = [
    {name:'Groceries',icon:'\uD83D\uDED2',real:8.5,cpi:2.8,note:'Shrinkflation + substitution hide real increases'},
    {name:'Rent / Housing',icon:'\uD83C\uDFE0',real:14.2,cpi:3.1,note:'CPI uses "owner equivalent rent" instead of actual prices'},
    {name:'Health Insurance',icon:'\uD83C\uDFE5',real:12.0,cpi:2.5,note:'Deductibles and copays rose while CPI stayed flat'},
    {name:'College Tuition',icon:'\uD83C\uDF93',real:7.8,cpi:2.2,note:'Financial aid masks sticker price inflation'},
    {name:'Gasoline',icon:'\u26FD',real:9.5,cpi:3.5,note:'Stripped from "core CPI" as "too volatile"'},
    {name:'Childcare',icon:'\uD83D\uDC76',real:11.0,cpi:2.7,note:'Not adequately weighted in CPI basket'},
    {name:'Electricity',icon:'\u26A1',real:6.5,cpi:2.8,note:'Regional spikes averaged away nationally'},
    {name:'Used Cars',icon:'\uD83D\uDE97',real:10.5,cpi:2.1,note:'Hedonic adjustments claim "better features" offset price'},
    {name:'Dining Out',icon:'\uD83C\uDF7D',real:7.0,cpi:3.0,note:'Portion sizes shrank; CPI doesn\u2019t measure that'},
    {name:'Internet / Phone',icon:'\uD83D\uDCF1',real:4.5,cpi:0.5,note:'Hedonically adjusted for "faster speeds"'},
    {name:'TVs / Electronics',icon:'\uD83D\uDCFA',real:-3.0,cpi:-8.0,note:'Tech deflation - screens got bigger and cheaper'},
    {name:'Clothing',icon:'\uD83D\uDC55',real:0.8,cpi:0.2,note:'Offshored to low-wage countries; quality declined'},
    {name:'Toys',icon:'\uD83E\uDDF8',real:-1.5,cpi:-4.0,note:'Mass manufacturing made toys cheaper than ever'},
    {name:'Software',icon:'\uD83D\uDCBB',real:-2.0,cpi:-5.0,note:'Free apps replaced paid software; CPI loves this'}
  ];
  const container = document.getElementById('personalInflItems');
  if(!container) return;
  let selected = new Set();
  items.forEach((item,i) => {
    const btn = document.createElement('button');
    btn.style.cssText = 'padding:8px 14px;border-radius:10px;border:1px solid var(--glass-border);background:rgba(0,0,0,0.2);font-size:12px;color:var(--text3);cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;';
    btn.innerHTML = '<span>'+item.icon+'</span><span>'+item.name+'</span>';
    btn.addEventListener('click', function(){
      if(selected.has(i)){ selected.delete(i); this.style.borderColor='var(--glass-border)'; this.style.background='rgba(0,0,0,0.2)'; this.style.color='var(--text3)'; }
      else { selected.add(i); this.style.borderColor='var(--orange)'; this.style.background='rgba(245,158,11,0.1)'; this.style.color='var(--orange)'; }
      updatePersonalInfl();
    });
    container.appendChild(btn);
  });
  function updatePersonalInfl(){
    const result = document.getElementById('personalInflResult');
    const rateEl = document.getElementById('personalInflRate');
    const breakdown = document.getElementById('personalInflBreakdown');
    if(selected.size === 0){ result.classList.add('hidden'); return; }
    result.classList.remove('hidden');
    let totalReal = 0;
    const sel = [...selected].map(i=>items[i]);
    sel.forEach(s => totalReal += s.real);
    const avgReal = (totalReal / sel.length).toFixed(1);
    rateEl.textContent = '~'+avgReal+'%';
    breakdown.innerHTML = '';
    sel.forEach(s => {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid var(--glass-border);background:rgba(0,0,0,0.2);';
      d.innerHTML = '<span style="font-size:16px;">'+s.icon+'</span><div style="flex:1;"><div style="font-size:12px;color:var(--text);">'+s.name+'</div><div style="font-size:12px;color:var(--muted);">'+s.note+'</div></div><div style="text-align:right;"><div style="font-size:12px;color:#60a5fa;">CPI: '+s.cpi+'%</div><div style="font-size:12px;font-weight:700;color:#f87171;">Real: '+s.real+'%</div></div>';
      breakdown.appendChild(d);
    });
  }
})();

// ═══════════════════════════════════════
// ═══════════════════════════════════════
//   PRICE CHART MODAL (BTC/USD & BTC/Gold)
// ═══════════════════════════════════════
var _chartData = null;

function openPriceChart(type){
  var overlay = document.getElementById('priceChartOverlay');
  var titleEl = document.getElementById('priceChartTitle');
  var cvs = document.getElementById('priceChartCanvas');
  var infoEl = document.getElementById('priceChartInfo');
  var loadEl = document.getElementById('priceChartLoading');

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadEl.style.display = 'block';
  loadEl.textContent = 'Loading chart data...';
  cvs.style.display = 'none';
  infoEl.textContent = '';
  _chartData = null;

  if(type === 'btcusd'){
    titleEl.textContent = 'BTC / USD - Full History';
    fetchChartData(cvs, infoEl, loadEl, 'usd', 'USD', titleEl);
  } else {
    titleEl.textContent = 'BTC / Gold (oz) - Full History';
    fetchChartData(cvs, infoEl, loadEl, 'gold', 'oz Gold', titleEl);
  }
}

function closePriceChart(){
  document.getElementById('priceChartOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _chartData = null;
  var cvs = document.getElementById('priceChartCanvas');
  if(cvs){ cvs.onmousemove = null; cvs.onmouseleave = null; cvs.ontouchmove = null; }
}

async function fetchChartData(cvs, infoEl, loadEl, vsCurrency, label, titleEl){
  try {
    var prices = null;

    // Strategy 1: CoinGecko days=max (weekly data points for full history)
    try {
      var r1 = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily');
      if(r1.ok){
        var p1 = await r1.json();
        if(p1.prices && p1.prices.length > 500) prices = p1.prices;
      }
    } catch(e){ console.warn('CoinGecko max failed:', e); }

    // Strategy 2: CoinCap weekly interval (single request, full history)
    if(!prices){
      try {
        await new Promise(function(resolve){ setTimeout(resolve, 400); });
        var startMs = new Date('2010-07-01').getTime();
        var endMs = Date.now();
        var r2 = await fetch('https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=' + startMs + '&end=' + endMs);
        if(r2.ok){
          var p2 = await r2.json();
          if(p2.data && p2.data.length > 500){
            prices = p2.data.map(function(d){ return [d.time, parseFloat(d.priceUsd)]; });
          }
        }
      } catch(e){ console.warn('CoinCap full failed:', e); }
    }

    // Strategy 3: CoinCap in 4-year chunks with weekly interval
    if(!prices){
      try {
        var allData = [];
        var chunks = [
          ['2010-07-01','2014-01-01'],['2014-01-01','2018-01-01'],
          ['2018-01-01','2022-01-01'],['2022-01-01','2030-01-01']
        ];
        for(var ci = 0; ci < chunks.length; ci++){
          var cs = new Date(chunks[ci][0]).getTime();
          var ce = Math.min(new Date(chunks[ci][1]).getTime(), Date.now());
          var cr = await fetch('https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=' + cs + '&end=' + ce);
          if(cr.ok){
            var cp = await cr.json();
            if(cp.data) allData = allData.concat(cp.data);
          }
          if(ci < chunks.length - 1) await new Promise(function(resolve){ setTimeout(resolve, 500); });
        }
        if(allData.length > 200){
          prices = allData.map(function(d){ return [d.time, parseFloat(d.priceUsd)]; });
        }
      } catch(e){ console.warn('CoinCap chunked failed:', e); }
    }

    // Strategy 4: CoinCap 10-year with weekly interval (smaller payload)
    if(!prices){
      try {
        var tenYrStart = Date.now() - (10 * 365.25 * 24 * 60 * 60 * 1000);
        var tenYrEnd = Date.now();
        var r4w = await fetch('https://api.coincap.io/v2/assets/bitcoin/history?interval=w1&start=' + Math.floor(tenYrStart) + '&end=' + Math.floor(tenYrEnd));
        if(r4w.ok){
          var p4w = await r4w.json();
          if(p4w.data && p4w.data.length > 100){
            prices = p4w.data.map(function(d){ return [d.time, parseFloat(d.priceUsd)]; });
          }
        }
      } catch(e){ console.warn('CoinCap weekly 10yr failed:', e); }
    }

    // Strategy 5: CoinGecko 3650 days (~10 years) as fallback
    if(!prices){
      try {
        await new Promise(function(resolve){ setTimeout(resolve, 500); });
        var r4 = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=3650&interval=daily');
        if(r4.ok){
          var p4 = await r4.json();
          if(p4.prices && p4.prices.length > 50) prices = p4.prices;
        }
      } catch(e){ console.warn('CoinGecko 3650 fallback failed:', e); }
    }

    // Strategy 5: CoinGecko 365 days as absolute last resort
    if(!prices){
      try {
        await new Promise(function(resolve){ setTimeout(resolve, 500); });
        var r5 = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365');
        if(r5.ok){
          var p5 = await r5.json();
          if(p5.prices && p5.prices.length > 50) prices = p5.prices;
        }
      } catch(e){ console.warn('CoinGecko 365 fallback failed:', e); }
    }

    if(!prices || prices.length < 2){
      loadEl.textContent = 'Chart data unavailable. API rate limit - try again in 60s.';
      return;
    }

    var series;
    if(vsCurrency === 'gold'){
      // Divide BTC/USD by gold price to get BTC/Gold(oz)
      // Note: uses current gold price for the ratio - approximate for historical data
      var gp = goldPrice || 3100;
      series = prices.map(function(p){ return [p[0], p[1] / gp]; });
    } else {
      series = prices;
    }

    loadEl.style.display = 'none';
    cvs.style.display = 'block';

    _chartData = {series: series, label: label, cvs: cvs};
    renderChart(cvs, series, label, -1);

    var first = series[0], last = series[series.length - 1];
    var startDate = new Date(first[0]).toLocaleDateString('en-US',{year:'numeric',month:'short'});
    var endDate = new Date(last[0]).toLocaleDateString('en-US',{year:'numeric',month:'short'});
    var startYear = new Date(first[0]).getFullYear();
    if(titleEl){
      var prefix = label === 'oz Gold' ? 'BTC / Gold (oz)' : 'BTC / USD';
      titleEl.textContent = prefix + ' \u2014 Since ' + startYear;
    }
    var change = ((last[1] - first[1]) / first[1] * 100);
    var fmtV = function(v){ return label === 'oz Gold' ? v.toFixed(1) + ' oz' : '$' + v.toLocaleString('en-US',{maximumFractionDigits:0}); };
    infoEl.innerHTML = '<span style="color:#8888b8;">' + startDate + ' \u2192 ' + endDate + '</span> &nbsp; <span style="color:#f59e0b;">' + fmtV(first[1]) + ' \u2192 ' + fmtV(last[1]) + '</span> &nbsp; <span style="color:' + (change >= 0 ? '#4ade80' : '#f87171') + ';">(' + (change >= 0 ? '+' : '') + change.toFixed(0) + '%)</span>';

    cvs.onmousemove = function(e){
      var rect = cvs.getBoundingClientRect();
      handleChartHover(e.clientX - rect.left, rect.width);
    };
    cvs.ontouchmove = function(e){
      e.preventDefault();
      var rect = cvs.getBoundingClientRect();
      handleChartHover(e.touches[0].clientX - rect.left, rect.width);
    };
    cvs.onmouseleave = function(){
      if(_chartData) renderChart(_chartData.cvs, _chartData.series, _chartData.label, -1);
    };

  } catch(e){
    console.warn('Chart fetch failed:', e);
    loadEl.innerHTML = 'Chart data unavailable.<br><span style="font-size:12px;color:var(--muted);margin-top:8px;display:block;">Try refreshing in 60 seconds.</span>';
  }
}

function handleChartHover(mx, displayWidth){
  if(!_chartData) return;
  var d = _chartData;
  var padLeft = 70, padRight = 16;
  var cw = displayWidth - padLeft - padRight;
  if(mx < padLeft || mx > padLeft + cw) return;
  var pct = (mx - padLeft) / cw;
  var idx = Math.min(d.series.length - 1, Math.max(0, Math.round(pct * (d.series.length - 1))));
  renderChart(d.cvs, d.series, d.label, idx);
}

function renderChart(cvs, series, label, hoverIdx){
  var c = cvs.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var parentW = cvs.parentElement.getBoundingClientRect().width;
  var W = Math.min(parentW - 32, 800);
  var H = Math.min(320, W * 0.45);
  cvs.width = W * dpr;
  cvs.height = H * dpr;
  cvs.style.width = W + 'px';
  cvs.style.height = H + 'px';
  c.scale(dpr, dpr);

  var pad = {top:20, right:16, bottom:40, left:70};
  var cw = W - pad.left - pad.right;
  var ch = H - pad.top - pad.bottom;

  var minV = Infinity, maxV = -Infinity;
  for(var i = 0; i < series.length; i++){
    if(series[i][1] < minV) minV = series[i][1];
    if(series[i][1] > maxV) maxV = series[i][1];
  }
  if(maxV === minV) maxV = minV + 1;
  var timeMin = series[0][0], timeMax = series[series.length-1][0];
  var timeRange = timeMax - timeMin;

  c.clearRect(0, 0, W, H);

  // Grid
  c.strokeStyle = 'rgba(245,158,11,0.08)';
  c.lineWidth = 1;
  for(var g = 0; g <= 5; g++){
    var gy = pad.top + (ch / 5) * g;
    c.beginPath(); c.moveTo(pad.left, gy); c.lineTo(pad.left + cw, gy); c.stroke();
    var val = maxV - (maxV - minV) * (g / 5);
    c.fillStyle = '#8888b8';
    c.font = '10px "Space Mono", monospace';
    c.textAlign = 'right';
    var yLbl = label === 'oz Gold' ? val.toFixed(0) + ' oz' : (val >= 1000 ? '$' + (val/1000).toFixed(0) + 'k' : '$' + val.toFixed(0));
    c.fillText(yLbl, pad.left - 8, gy + 3);
  }

  // X-axis years
  c.textAlign = 'center';
  c.fillStyle = '#6868a8';
  var startYr = new Date(timeMin).getFullYear();
  var endYr = new Date(timeMax).getFullYear();
  var step = Math.max(1, Math.floor((endYr - startYr) / 8));
  for(var yr = startYr + 1; yr <= endYr; yr += step){
    var t = new Date(yr, 0, 1).getTime();
    var xx = pad.left + ((t - timeMin) / timeRange) * cw;
    if(xx > pad.left + 20 && xx < pad.left + cw - 20){
      c.fillText(yr.toString(), xx, H - pad.bottom + 20);
    }
  }

  function px(i){ return pad.left + ((series[i][0] - timeMin) / timeRange) * cw; }
  function py(i){ return pad.top + ch - ((series[i][1] - minV) / (maxV - minV)) * ch; }

  // Gradient fill
  var grad = c.createLinearGradient(0, pad.top, 0, pad.top + ch);
  grad.addColorStop(0, 'rgba(245,158,11,0.22)');
  grad.addColorStop(1, 'rgba(245,158,11,0.01)');
  c.beginPath();
  c.moveTo(px(0), pad.top + ch);
  for(var i = 0; i < series.length; i++) c.lineTo(px(i), py(i));
  c.lineTo(px(series.length-1), pad.top + ch);
  c.closePath();
  c.fillStyle = grad;
  c.fill();

  // Line
  c.beginPath();
  c.strokeStyle = '#f59e0b';
  c.lineWidth = 2;
  c.lineJoin = 'round';
  for(var i = 0; i < series.length; i++){
    if(i === 0) c.moveTo(px(i), py(i));
    else c.lineTo(px(i), py(i));
  }
  c.stroke();

  // Hover crosshair + tooltip
  if(hoverIdx >= 0 && hoverIdx < series.length){
    var hx = px(hoverIdx), hy = py(hoverIdx);

    c.beginPath();
    c.strokeStyle = 'rgba(245,158,11,0.3)';
    c.lineWidth = 1;
    c.setLineDash([4,4]);
    c.moveTo(hx, pad.top);
    c.lineTo(hx, pad.top + ch);
    c.stroke();
    c.setLineDash([]);

    c.beginPath();
    c.arc(hx, hy, 5, 0, Math.PI*2);
    c.fillStyle = '#f59e0b';
    c.fill();
    c.strokeStyle = '#0b0b18';
    c.lineWidth = 2;
    c.stroke();

    var pt = series[hoverIdx];
    var dateStr = new Date(pt[0]).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
    var valStr = label === 'oz Gold' ? pt[1].toFixed(1) + ' oz' : '$' + pt[1].toLocaleString('en-US',{maximumFractionDigits:0});

    var tw = 170, th = 42;
    var ttx = hx + 14, tty = hy - 50;
    if(ttx + tw > W - pad.right) ttx = hx - tw - 14;
    if(tty < pad.top) tty = hy + 14;

    c.fillStyle = 'rgba(11,11,24,0.93)';
    c.strokeStyle = 'rgba(245,158,11,0.5)';
    c.lineWidth = 1;
    c.beginPath();
    if(c.roundRect) c.roundRect(ttx, tty, tw, th, 6);
    else c.rect(ttx, tty, tw, th);
    c.fill();
    c.stroke();

    c.font = '10px "Space Mono", monospace';
    c.textAlign = 'left';
    c.fillStyle = '#b8b8d8';
    c.fillText(dateStr, ttx + 10, tty + 16);
    c.fillStyle = '#f59e0b';
    c.font = 'bold 13px "Space Mono", monospace';
    c.fillText(valStr, ttx + 10, tty + 34);
  }
}

// ── SigLab: real Bitcoin crypto for the Signet lab ──
// Every function verified byte-for-byte against @noble/secp256k1 and bitcoinjs-lib.
const SigLab = (function(){
// Pure-JS Bitcoin crypto for the Signet lab. No dependencies.
// SHA-256 (bytes), HMAC-SHA256, RIPEMD-160, secp256k1 ECDSA (RFC 6979, low-s),
// bech32 (BIP 173), BIP 143 P2WPKH sighash, and transaction serialization.

// ── SHA-256 over bytes ──
function sha256Bytes(bytes){
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const rotr = (x,n) => (x>>>n) | (x<<(32-n));
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  const len = bytes.length;
  const bitLen = len * 8;
  const padded = new Uint8Array(((len + 8) >> 6 << 6) + 64);
  padded.set(bytes);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(padded.length - 4, bitLen >>> 0);
  const w = new Array(64);
  for(let off = 0; off < padded.length; off += 64){
    for(let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i*4);
    for(let i = 16; i < 64; i++){
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15]>>>3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2]>>>10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for(let i = 0; i < 64; i++){
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h=g; g=f; f=e; e=(d + t1)|0; d=c; c=b; b=a; a=(t1 + t2)|0;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0; h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  [h0,h1,h2,h3,h4,h5,h6,h7].forEach((x,i) => odv.setUint32(i*4, x >>> 0));
  return out;
}
function dsha256(bytes){ return sha256Bytes(sha256Bytes(bytes)); }

// ── HMAC-SHA256 ──
function hmacSha256(key, msg){
  if(key.length > 64) key = sha256Bytes(key);
  const ipad = new Uint8Array(64 + msg.length);
  const opad = new Uint8Array(64 + 32);
  for(let i = 0; i < 64; i++){
    ipad[i] = (key[i] || 0) ^ 0x36;
    opad[i] = (key[i] || 0) ^ 0x5c;
  }
  ipad.set(msg, 64);
  opad.set(sha256Bytes(ipad), 64);
  return sha256Bytes(opad);
}

// ── RIPEMD-160 ──
function ripemd160(bytes){
  const rl = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13];
  const rr = [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11];
  const sl = [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6];
  const sr = [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];
  const rotl = (x,n) => (x<<n) | (x>>>(32-n));
  function f(j,x,y,z){
    if(j < 16) return x ^ y ^ z;
    if(j < 32) return (x & y) | (~x & z);
    if(j < 48) return (x | ~y) ^ z;
    if(j < 64) return (x & z) | (y & ~z);
    return x ^ (y | ~z);
  }
  const KL = [0x00000000,0x5a827999,0x6ed9eba1,0x8f1bbcdc,0xa953fd4e];
  const KR = [0x50a28be6,0x5c4dd124,0x6d703ef3,0x7a6d76e9,0x00000000];
  let h0=0x67452301,h1=0xefcdab89,h2=0x98badcfe,h3=0x10325476,h4=0xc3d2e1f0;
  const len = bytes.length;
  const padded = new Uint8Array(((len + 8) >> 6 << 6) + 64);
  padded.set(bytes);
  padded[len] = 0x80;
  const bitLen = len * 8;
  const dv = new DataView(padded.buffer);
  // RIPEMD-160 uses little-endian length
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);
  for(let off = 0; off < padded.length; off += 64){
    const X = new Array(16);
    for(let i = 0; i < 16; i++) X[i] = dv.getUint32(off + i*4, true);
    let al=h0,bl=h1,cl=h2,dl=h3,el=h4;
    let ar=h0,br=h1,cr=h2,dr=h3,er=h4;
    for(let j = 0; j < 80; j++){
      const round = Math.floor(j / 16);
      let t = (al + f(j, bl, cl, dl) + X[rl[j]] + KL[round]) | 0;
      t = (rotl(t, sl[j]) + el) | 0;
      al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = t;
      t = (ar + f(79 - j, br, cr, dr) + X[rr[j]] + KR[round]) | 0;
      t = (rotl(t, sr[j]) + er) | 0;
      ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = t;
    }
    const t = (h1 + cl + dr) | 0;
    h1 = (h2 + dl + er) | 0;
    h2 = (h3 + el + ar) | 0;
    h3 = (h4 + al + br) | 0;
    h4 = (h0 + bl + cr) | 0;
    h0 = t;
  }
  const out = new Uint8Array(20);
  const odv = new DataView(out.buffer);
  [h0,h1,h2,h3,h4].forEach((x,i) => odv.setUint32(i*4, x >>> 0, true));
  return out;
}
function hash160(bytes){ return ripemd160(sha256Bytes(bytes)); }

// ── byte helpers ──
function bytesToHex(b){ return Array.from(b).map(x => x.toString(16).padStart(2,'0')).join(''); }
function hexToBytes(h){ const out = new Uint8Array(h.length/2); for(let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i*2,2),16); return out; }
function bytesToBig(b){ let n = 0n; for(const x of b) n = (n << 8n) | BigInt(x); return n; }
function bigToBytes32(n){ const out = new Uint8Array(32); for(let i = 31; i >= 0; i--){ out[i] = Number(n & 0xffn); n >>= 8n; } return out; }
function concatBytes(...arrs){
  const total = arrs.reduce((s,a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for(const a of arrs){ out.set(a, off); off += a.length; }
  return out;
}

// ── secp256k1 ──
const SECP = {
  p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
  n: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
  gx: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
  gy: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n
};
function mod(a, m){ const r = a % m; return r < 0n ? r + m : r; }
function modInv(a, m){
  let [old_r, r] = [mod(a, m), m];
  let [old_s, s] = [1n, 0n];
  while(r !== 0n){
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return mod(old_s, m);
}
// Affine point ops; null = point at infinity
function pointAdd(P, Q){
  if(!P) return Q;
  if(!Q) return P;
  const p = SECP.p;
  if(P[0] === Q[0]){
    if(mod(P[1] + Q[1], p) === 0n) return null;
    // double
    const lam = mod(3n * P[0] * P[0] * modInv(2n * P[1], p), p);
    const x = mod(lam * lam - 2n * P[0], p);
    return [x, mod(lam * (P[0] - x) - P[1], p)];
  }
  const lam = mod((Q[1] - P[1]) * modInv(Q[0] - P[0], p), p);
  const x = mod(lam * lam - P[0] - Q[0], p);
  return [x, mod(lam * (P[0] - x) - P[1], p)];
}
function pointMul(k, P){
  let R = null, A = P;
  while(k > 0n){
    if(k & 1n) R = pointAdd(R, A);
    A = pointAdd(A, A);
    k >>= 1n;
  }
  return R;
}
function pubkeyFromPriv(privBytes){
  const d = bytesToBig(privBytes);
  const P = pointMul(d, [SECP.gx, SECP.gy]);
  const prefix = (P[1] & 1n) ? 0x03 : 0x02;
  return concatBytes(new Uint8Array([prefix]), bigToBytes32(P[0]));
}
// RFC 6979 deterministic nonce
function rfc6979k(privBytes, hashBytes){
  const n = SECP.n;
  const h1 = mod(bytesToBig(hashBytes), n);
  const x = privBytes;
  const hb = bigToBytes32(h1);
  let V = new Uint8Array(32).fill(1);
  let K = new Uint8Array(32).fill(0);
  K = hmacSha256(K, concatBytes(V, new Uint8Array([0]), x, hb));
  V = hmacSha256(K, V);
  K = hmacSha256(K, concatBytes(V, new Uint8Array([1]), x, hb));
  V = hmacSha256(K, V);
  while(true){
    V = hmacSha256(K, V);
    const k = bytesToBig(V);
    if(k >= 1n && k < n) return k;
    K = hmacSha256(K, concatBytes(V, new Uint8Array([0])));
    V = hmacSha256(K, V);
  }
}
function ecdsaSign(privBytes, hashBytes){
  const n = SECP.n;
  const d = bytesToBig(privBytes);
  const z = mod(bytesToBig(hashBytes), n);
  let k = rfc6979k(privBytes, hashBytes);
  const R = pointMul(k, [SECP.gx, SECP.gy]);
  const r = mod(R[0], n);
  let ss = mod(modInv(k, n) * mod(z + r * d, n), n);
  if(ss > n / 2n) ss = n - ss; // low-s (BIP 62)
  return {r, s: ss};
}
function derEncode(sig){
  function trimInt(n){
    let b = [];
    let x = n;
    while(x > 0n){ b.unshift(Number(x & 0xffn)); x >>= 8n; }
    if(b.length === 0) b = [0];
    if(b[0] & 0x80) b.unshift(0);
    return new Uint8Array(b);
  }
  const rb = trimInt(sig.r), sb = trimInt(sig.s);
  return concatBytes(
    new Uint8Array([0x30, 4 + rb.length + sb.length, 0x02, rb.length]), rb,
    new Uint8Array([0x02, sb.length]), sb
  );
}

// ── bech32 (BIP 173, witness v0) ──
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function bech32Polymod(values){
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for(const v of values){
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for(let i = 0; i < 5; i++) if((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function bech32HrpExpand(hrp){
  const out = [];
  for(const c of hrp) out.push(c.charCodeAt(0) >> 5);
  out.push(0);
  for(const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}
function bech32Encode(hrp, data){
  const values = bech32HrpExpand(hrp).concat(data);
  const polymod = bech32Polymod(values.concat([0,0,0,0,0,0])) ^ 1;
  const checksum = [];
  for(let i = 0; i < 6; i++) checksum.push((polymod >> (5 * (5 - i))) & 31);
  return hrp + '1' + data.concat(checksum).map(d => BECH32_CHARSET[d]).join('');
}
function convertBits(data, from, to){
  let acc = 0, bits = 0;
  const out = [];
  for(const v of data){
    acc = (acc << from) | v;
    bits += from;
    while(bits >= to){
      bits -= to;
      out.push((acc >> bits) & ((1 << to) - 1));
    }
  }
  if(bits > 0) out.push((acc << (to - bits)) & ((1 << to) - 1));
  return out;
}
function p2wpkhAddress(pubkey, hrp){
  const kh = hash160(pubkey);
  return bech32Encode(hrp, [0].concat(convertBits(Array.from(kh), 8, 5)));
}

// ── Transaction building (P2WPKH inputs -> P2WPKH outputs, BIP 143) ──
function u32le(n){ const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; }
function u64le(n){
  const b = new Uint8Array(8);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, n % 0x100000000, true);
  dv.setUint32(4, Math.floor(n / 0x100000000), true);
  return b;
}
function varint(n){
  if(n < 0xfd) return new Uint8Array([n]);
  const b = new Uint8Array(3); b[0] = 0xfd; new DataView(b.buffer).setUint16(1, n, true); return b;
}
function txidToBytesLE(txidHex){ return hexToBytes(txidHex).reverse(); }

// utxos: [{txid, vout, value}], all locked to our own key
// outputs: [{keyhash(20b Uint8Array), value}]
function buildSignedTx(privBytes, pubkey, utxos, outputs){
  const keyhash = hash160(pubkey);
  const SEQ = 0xfffffffd; // opt-in RBF
  const version = u32le(2);
  const locktime = u32le(0);

  const outpoints = concatBytes(...utxos.map(u => concatBytes(txidToBytesLE(u.txid), u32le(u.vout))));
  const sequences = concatBytes(...utxos.map(() => u32le(SEQ)));
  const outsSer = concatBytes(...outputs.map(o => concatBytes(u64le(o.value), new Uint8Array([0x16, 0x00, 0x14]), o.keyhash)));
  const hashPrevouts = dsha256(outpoints);
  const hashSequence = dsha256(sequences);
  const hashOutputs = dsha256(outsSer);
  const scriptCode = concatBytes(new Uint8Array([0x19, 0x76, 0xa9, 0x14]), keyhash, new Uint8Array([0x88, 0xac]));

  const witnesses = utxos.map(u => {
    const preimage = concatBytes(
      version, hashPrevouts, hashSequence,
      txidToBytesLE(u.txid), u32le(u.vout),
      scriptCode, u64le(u.value), u32le(SEQ),
      hashOutputs, locktime, u32le(1) // SIGHASH_ALL
    );
    const sighash = dsha256(preimage);
    const der = derEncode(ecdsaSign(privBytes, sighash));
    const sigWithType = concatBytes(der, new Uint8Array([1]));
    return concatBytes(
      new Uint8Array([2]),                       // 2 witness items
      new Uint8Array([sigWithType.length]), sigWithType,
      new Uint8Array([pubkey.length]), pubkey
    );
  });

  const inputsSer = concatBytes(...utxos.map(u => concatBytes(
    txidToBytesLE(u.txid), u32le(u.vout), new Uint8Array([0]), u32le(SEQ)
  )));

  const noWitness = concatBytes(version, varint(utxos.length), inputsSer, varint(outputs.length), outsSer, locktime);
  const full = concatBytes(
    version, new Uint8Array([0x00, 0x01]),
    varint(utxos.length), inputsSer,
    varint(outputs.length), outsSer,
    concatBytes(...witnesses),
    locktime
  );
  const txid = bytesToHex(dsha256(noWitness).reverse());
  return {hex: bytesToHex(full), txid};
}



  return { pubkeyFromPriv, p2wpkhAddress, buildSignedTx, hash160, bytesToHex, hexToBytes, bytesToBig, SECP };
})();

// ── Signet Lab UI ──
const SIGNET_API = 'https://mempool.space/signet/api';
const SIGNET_EXPLORER = 'https://mempool.space/signet';
let slWalletState = null, slUtxos = [];
try { slWalletState = JSON.parse(localStorage.getItem('abc_signet_v1') || 'null'); } catch(e){}
function slSaveWallet(){ try { localStorage.setItem('abc_signet_v1', JSON.stringify(slWalletState)); } catch(e){} }
function slEl(id){ return document.getElementById(id); }
function slStatus(id, msg, color){
  const el = slEl(id); if(!el) return;
  el.innerHTML = msg;
  el.style.color = color || 'var(--muted)';
}
function slRenderWallet(){
  if(!slEl('slAddr')) return;
  if(slWalletState && slWalletState.priv){
    slEl('slWalletBox').classList.remove('hidden');
    slEl('slCreateBtn').classList.add('hidden');
    slEl('slAddr').textContent = slWalletState.addr;
    slEl('slStep2').classList.remove('hidden');
    slEl('slStep3').classList.remove('hidden');
    slEl('slStep4').classList.remove('hidden');
    slEl('slStep5').classList.remove('hidden');
    if(slWalletState.lastTxid){
      slEl('slTxLink').innerHTML = 'Last broadcast: <a href="' + SIGNET_EXPLORER + '/tx/' + slWalletState.lastTxid + '" target="_blank" rel="noopener" style="color:var(--orange);">' + slWalletState.lastTxid.substring(0, 20) + '...</a>';
    }
  } else {
    slEl('slWalletBox').classList.add('hidden');
    slEl('slCreateBtn').classList.remove('hidden');
    slEl('slStep2').classList.add('hidden');
    slEl('slStep3').classList.add('hidden');
    slEl('slStep4').classList.add('hidden');
    slEl('slStep5').classList.add('hidden');
  }
}
function slCreateWallet(){
  let priv, d;
  do {
    priv = new Uint8Array(32);
    crypto.getRandomValues(priv);
    d = SigLab.bytesToBig(priv);
  } while(d === 0n || d >= SigLab.SECP.n);
  const pub = SigLab.pubkeyFromPriv(priv);
  slWalletState = {
    priv: SigLab.bytesToHex(priv),
    pub: SigLab.bytesToHex(pub),
    addr: SigLab.p2wpkhAddress(pub, 'tb'),
    lastTxid: null
  };
  slSaveWallet();
  slRenderWallet();
  slStatus('slCreateStatus', 'Wallet created. The private key lives only in YOUR browser - this site has no server to send it to.', '#4ade80');
}
async function slCheckBalance(){
  if(!slWalletState) return;
  slStatus('slBalStatus', 'Checking the real Signet blockchain...');
  try {
    const res = await fetch(SIGNET_API + '/address/' + slWalletState.addr + '/utxo');
    if(!res.ok) throw new Error('API returned ' + res.status);
    slUtxos = await res.json();
    const total = slUtxos.reduce(function(sum, u){ return sum + u.value; }, 0);
    if(!slUtxos.length){
      slStatus('slBalStatus', 'No coins yet. Faucets can take a minute - and unconfirmed coins appear here too, so try again shortly.', '#fbbf24');
      return;
    }
    const confirmed = slUtxos.filter(function(u){ return u.status && u.status.confirmed; }).length;
    slStatus('slBalStatus',
      '<strong style="color:#4ade80;">' + total.toLocaleString() + ' sats</strong> across ' + slUtxos.length + ' coin' + (slUtxos.length > 1 ? 's' : '') + ' (' + confirmed + ' confirmed). These are real UTXOs on a real blockchain - <a href="' + SIGNET_EXPLORER + '/address/' + slWalletState.addr + '" target="_blank" rel="noopener" style="color:var(--orange);">see them on the explorer</a>.',
      '#4ade80');
  } catch(e){
    slStatus('slBalStatus', 'Could not reach mempool.space (' + e.message + '). Check your connection and try again.', '#f87171');
  }
}
async function slSendTx(){
  if(!slWalletState || !slUtxos.length){
    slStatus('slSendStatus', 'Check your balance first - you need at least one coin to spend.', '#fbbf24');
    return;
  }
  const total = slUtxos.reduce(function(sum, u){ return sum + u.value; }, 0);
  const fee = 200 + 80 * slUtxos.length;
  if(total <= fee + 294){
    slStatus('slSendStatus', 'Balance too small to cover the fee. Get more from the faucet.', '#fbbf24');
    return;
  }
  try {
    slStatus('slSendStatus', 'Signing with your private key (RFC 6979 ECDSA, BIP 143 sighash)...');
    const priv = SigLab.hexToBytes(slWalletState.priv);
    const pub = SigLab.hexToBytes(slWalletState.pub);
    const keyhash = SigLab.hash160(pub);
    const inputs = slUtxos.map(function(u){ return {txid: u.txid, vout: u.vout, value: u.value}; });
    const tx = SigLab.buildSignedTx(priv, pub, inputs, [{keyhash: keyhash, value: total - fee}]);
    slStatus('slSendStatus', 'Broadcasting to the Signet network...');
    const res = await fetch(SIGNET_API + '/tx', { method: 'POST', body: tx.hex });
    const text = await res.text();
    if(!res.ok) throw new Error(text.substring(0, 120));
    slWalletState.lastTxid = text.trim();
    slSaveWallet();
    slStatus('slSendStatus',
      '<strong style="color:#4ade80;">Broadcast accepted!</strong> You just spent ' + slUtxos.length + ' coin' + (slUtxos.length > 1 ? 's' : '') + ' back to yourself and paid a ' + fee + ' sat fee to a real miner.<br/>TXID: <a href="' + SIGNET_EXPLORER + '/tx/' + slWalletState.lastTxid + '" target="_blank" rel="noopener" style="color:var(--orange);font-family:Space Mono,monospace;word-break:break-all;">' + slWalletState.lastTxid + '</a>',
      '#4ade80');
    slEl('slTxLink').innerHTML = '';
    slUtxos = [];
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) for(let k = 0; k < 12; k++) setTimeout(function(){ spawnCoin(); }, k * 90);
  } catch(e){
    slStatus('slSendStatus', 'Broadcast failed: ' + e.message, '#f87171');
  }
}
async function slCheckConfirm(){
  if(!slWalletState || !slWalletState.lastTxid){
    slStatus('slConfirmStatus', 'Broadcast a transaction first.', '#fbbf24');
    return;
  }
  slStatus('slConfirmStatus', 'Asking the network...');
  try {
    const res = await fetch(SIGNET_API + '/tx/' + slWalletState.lastTxid + '/status');
    const st = await res.json();
    if(st.confirmed){
      slStatus('slConfirmStatus',
        '<strong style="color:#4ade80;">CONFIRMED in block ' + st.block_height.toLocaleString() + '!</strong> Your transaction is now part of a real blockchain, mined with real proof of work, verifiable by anyone on Earth forever: <a href="' + SIGNET_EXPLORER + '/block/' + st.block_hash + '" target="_blank" rel="noopener" style="color:var(--orange);">see the block</a>. You have now done the thing this entire course is about.',
        '#4ade80');
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) for(let k = 0; k < 20; k++) setTimeout(function(){ spawnCoin(); }, k * 80);
    } else {
      slStatus('slConfirmStatus', 'Still in the mempool, waiting for a miner. Signet blocks arrive about every 10 minutes - come back and check again.', '#fbbf24');
    }
  } catch(e){
    slStatus('slConfirmStatus', 'Lookup failed: ' + e.message, '#f87171');
  }
}
function slReset(){
  if(!confirm('Discard this practice wallet? Any test coins on it will be unreachable.')) return;
  slWalletState = null; slUtxos = [];
  try { localStorage.removeItem('abc_signet_v1'); } catch(e){}
  slRenderWallet();
  slStatus('slCreateStatus', '');
}
function slToggleKey(){
  const el = slEl('slPrivReveal');
  if(el.textContent.indexOf('tap to reveal') >= 0){
    el.textContent = slWalletState.priv;
  } else {
    el.textContent = '(tap to reveal - never do this with real bitcoin)';
  }
}
slEl('slCreateBtn')?.addEventListener('click', slCreateWallet);
slEl('slCheckBtn')?.addEventListener('click', slCheckBalance);
slEl('slSendBtn')?.addEventListener('click', slSendTx);
slEl('slConfirmBtn')?.addEventListener('click', slCheckConfirm);
slEl('slResetBtn')?.addEventListener('click', slReset);
slEl('slPrivReveal')?.addEventListener('click', slToggleKey);
slEl('slCopyBtn')?.addEventListener('click', async function(){
  try { await navigator.clipboard.writeText(slWalletState.addr); this.textContent = 'Copied!'; setTimeout(() => { this.textContent = 'Copy'; }, 1500); } catch(e){}
});
slRenderWallet();

// ── Transaction dissector (Step 5) ──
const SL_COLORS = {version:'#60a5fa', segwit:'#a78bfa', count:'#7878a0', outpoint:'#f59e0b', script:'#34d399', seq:'#fbbf24', value:'#4ade80', sig:'#f87171', pubkey:'#fb923c', locktime:'#94a3b8'};
function slParseRawTx(hex){
  // Bespoke parser for the lab's own shape: v2 segwit, all-P2WPKH, small counts
  let p = 0;
  const seg = [];
  function take(nChars, label, colorKey, note){
    const chunk = hex.substr(p, nChars);
    p += nChars;
    seg.push({label: label, hex: chunk, color: SL_COLORS[colorKey], note: note});
    return chunk;
  }
  take(8, 'Version', 'version', 'Little-endian 2. Version 2 transactions can use relative timelocks (BIP 68).');
  take(4, 'SegWit marker + flag', 'segwit', 'The bytes 00 01 announce: witnesses live in a separate section. Pre-2017 nodes still see a valid (unsigned-looking) transaction - that is how SegWit stayed backward compatible.');
  const nIn = parseInt(take(2, 'Input count', 'count', 'How many coins this transaction melts down.'), 16);
  for(let i = 0; i < nIn; i++){
    take(64, 'Input ' + (i+1) + ': previous txid', 'outpoint', 'The transaction that created the coin you are spending - stored byte-reversed, as Bitcoin displays txids backwards from how they are hashed.');
    take(8, 'Input ' + (i+1) + ': output index', 'count', 'Which output of that transaction is being spent (little-endian).');
    take(2, 'Input ' + (i+1) + ': scriptSig length', 'script', '00 - empty! For SegWit inputs the unlocking proof moved to the witness section below.');
    take(8, 'Input ' + (i+1) + ': sequence', 'seq', 'fdffffff signals opt-in Replace-By-Fee: you may rebroadcast with a higher fee while unconfirmed.');
  }
  const nOut = parseInt(take(2, 'Output count', 'count', 'How many brand-new coins this transaction mints.'), 16);
  for(let i = 0; i < nOut; i++){
    const valHex = take(16, 'Output ' + (i+1) + ': amount', 'value', '');
    let sats = 0n;
    for(let b = 7; b >= 0; b--) sats = (sats << 8n) | BigInt(parseInt(valHex.substr(b*2, 2), 16));
    seg[seg.length-1].note = 'Little-endian 8 bytes: ' + sats.toLocaleString() + ' satoshis, locked to the script that follows.';
    take(2, 'Output ' + (i+1) + ': script length', 'count', '16 hex = 22 bytes of locking script.');
    take(4, 'Output ' + (i+1) + ': script opcodes', 'script', 'OP_0 then push-20-bytes: "this is a version-0 witness program" - the P2WPKH pattern.');
    take(40, 'Output ' + (i+1) + ': pubkey hash', 'script', 'HASH160 of the recipient public key. The coin now belongs to whoever can present a key that hashes to exactly this, plus a valid signature.');
  }
  for(let i = 0; i < nIn; i++){
    take(2, 'Witness ' + (i+1) + ': item count', 'count', 'Two items unlock a P2WPKH coin: a signature and a public key.');
    const sigLen = parseInt(take(2, 'Witness ' + (i+1) + ': signature length', 'count', ''), 16);
    take(sigLen * 2, 'Witness ' + (i+1) + ': ECDSA signature', 'sig', 'DER-encoded (r, s) pair your private key produced, ending in 01 (SIGHASH_ALL: this signature commits to ALL inputs and outputs - change anything and it dies). This is the only place your authority appears, and it reveals nothing about the key itself.');
    take(2, 'Witness ' + (i+1) + ': pubkey length', 'count', '');
    take(66, 'Witness ' + (i+1) + ': public key', 'pubkey', '33-byte compressed public key (02/03 prefix + x-coordinate). Nodes hash it with SHA-256 then RIPEMD-160 and check it matches the pubkey hash the coin was locked to.');
  }
  take(8, 'Locktime', 'locktime', '00000000 - valid immediately. A nonzero value would forbid mining before a given block height or time.');
  if(p !== hex.length) throw new Error('parse mismatch');
  return seg;
}
function slFmtSats(n){ return Number(n).toLocaleString() + ' sats'; }
function slDissectRender(tx, hex, segs){
  const feeRate = (tx.fee / (tx.weight / 4)).toFixed(1);
  let h = '';
  // Overview
  h += '<div class="demo-plan" style="margin-bottom:12px;"><div style="color:var(--orange);font-weight:700;font-family:Syne,sans-serif;margin-bottom:8px;">Transaction overview</div><div style="display:grid;gap:5px;font-size:12px;">'
    + '<div><span style="color:var(--muted);">TXID:</span> <span style="font-family:Space Mono,monospace;word-break:break-all;">' + tx.txid + '</span><br/><span style="color:var(--muted);font-size:12px;">This is the double SHA-256 of the transaction (without witnesses) - its fingerprint, not a serial number nobody assigned it.</span></div>'
    + '<div><span style="color:var(--muted);">Size:</span> ' + tx.size + ' bytes raw, but only <strong style="color:#4ade80;">' + Math.ceil(tx.weight/4) + ' vbytes</strong> for fees - witnesses are 75% discounted. That discount is SegWit\'s fee cut in action.</div>'
    + '<div><span style="color:var(--muted);">Fee:</span> <strong style="color:#fbbf24;">' + slFmtSats(tx.fee) + '</strong> (' + feeRate + ' sat/vB) - the difference between what went in and what came out. Nobody set it; it is simply the remainder, claimed by the miner.</div>'
    + '</div></div>';
  // Inputs
  h += '<div class="demo-plan" style="margin-bottom:12px;border-color:rgba(245,158,11,0.35);"><div style="color:var(--orange);font-weight:700;font-family:Syne,sans-serif;margin-bottom:8px;">Inputs - the coins you melted down (' + tx.vin.length + ')</div>';
  tx.vin.forEach(function(vin, i){
    h += '<div style="font-size:12px;padding:10px 0;' + (i ? 'border-top:1px solid var(--glass-border);' : '') + '">'
      + '<div><span style="color:var(--muted);">Coin ' + (i+1) + ':</span> <strong style="color:var(--orange);">' + slFmtSats(vin.prevout.value) + '</strong> created by tx <span style="font-family:Space Mono,monospace;">' + vin.txid.substring(0,16) + '...</span> output #' + vin.vout + '</div>'
      + '<div style="color:var(--muted);font-size:12px;margin-top:4px;">This coin is now destroyed forever. Its full value flowed into this transaction, and the network marks it spent - the same coin can never fund two transactions. That single rule is what "solving double-spending" means.</div>'
      + '</div>';
  });
  h += '</div>';
  // Outputs
  h += '<div class="demo-plan" style="margin-bottom:12px;border-color:rgba(74,222,128,0.35);"><div style="color:#4ade80;font-weight:700;font-family:Syne,sans-serif;margin-bottom:8px;">Outputs - the brand-new coins you minted (' + tx.vout.length + ')</div>';
  tx.vout.forEach(function(vout, i){
    h += '<div style="font-size:12px;padding:10px 0;' + (i ? 'border-top:1px solid var(--glass-border);' : '') + '">'
      + '<div><strong style="color:#4ade80;">' + slFmtSats(vout.value) + '</strong> locked to <span style="font-family:Space Mono,monospace;word-break:break-all;">' + (vout.scriptpubkey_address || vout.scriptpubkey) + '</span></div>'
      + '<div style="color:var(--muted);font-size:12px;margin-top:4px;">Script: <span style="font-family:Space Mono,monospace;">' + vout.scriptpubkey + '</span> - OP_0 plus a 20-byte hash. Not "an account balance" - a padlock. Only a public key hashing to those exact 20 bytes, plus a valid signature, ever opens it.</div>'
      + '</div>';
  });
  h += '</div>';
  // Raw bytes
  if(segs){
    h += '<div class="demo-plan" style="margin-bottom:12px;"><div style="color:var(--orange);font-weight:700;font-family:Syne,sans-serif;margin-bottom:8px;">The raw bytes - all ' + (hex.length/2) + ' of them</div>'
      + '<div style="font-family:Space Mono,monospace;font-size:12px;word-break:break-all;line-height:1.8;background:rgba(0,0,0,0.45);padding:12px;border-radius:10px;">'
      + segs.map(function(g){ return '<span style="color:' + g.color + ';">' + g.hex + '</span>'; }).join('')
      + '</div>'
      + '<div style="margin-top:12px;display:grid;gap:8px;">'
      + segs.filter(function(g){ return g.note; }).map(function(g){
          return '<div style="font-size:12px;line-height:1.6;"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + g.color + ';margin-right:6px;"></span><strong style="color:' + g.color + ';">' + g.label + ':</strong> <span style="color:var(--text2);">' + g.note + '</span></div>';
        }).join('')
      + '</div></div>';
  }
  return h;
}
function slBlockRender(block, txIndex){
  let h = '<div class="demo-plan" style="border-color:rgba(96,165,250,0.4);"><div style="color:#60a5fa;font-weight:700;font-family:Syne,sans-serif;margin-bottom:8px;">The block that sealed it: #' + block.height.toLocaleString() + '</div>';
  h += '<div style="font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:10px;">Your transaction is ' + (txIndex >= 0 ? 'number <strong style="color:#60a5fa;">' + (txIndex + 1) + ' of ' + block.tx_count + '</strong>' : 'one of ' + block.tx_count) + ' in this block. The 80-byte header below is what the miner actually hashed ' + '- everything else hangs off it.</div>';
  const rows = [
    ['Block hash', block.id, 'The double SHA-256 of the 80-byte header. Count the leading zeros - that IS the proof of work, the same game you played in the mining demo, at incomprehensible difficulty.'],
    ['1. Version', '0x' + (block.version >>> 0).toString(16), 'Header field one. Modern miners also use spare version bits to signal readiness for protocol upgrades (BIP 9).'],
    ['2. Previous block hash', block.previousblockhash, 'The chain link. This header commits to the entire history before it - alter any past block and this field stops matching, all the way to the tip.'],
    ['3. Merkle root', block.merkle_root, 'All ' + block.tx_count + ' transactions, pair-hashed repeatedly down to one 32-byte fingerprint. YOUR txid is one of the leaves - change one byte of your transaction and this root, and therefore the block hash, changes. That is how one hash protects thousands of transactions.'],
    ['4. Timestamp', new Date(block.timestamp * 1000).toUTCString(), 'When the miner claims to have built it. Nodes tolerate small drift but reject blocks from the future.'],
    ['5. Bits (target)', '0x' + block.bits.toString(16), 'The difficulty target in compact form - the block hash had to be below the number this encodes. Retuned every 2,016 blocks by the thermostat you played with.'],
    ['6. Nonce', block.nonce.toLocaleString(), 'The winning lottery ticket. The miner churned through nonces until the header hashed under the target - your Auto-Mine button, industrialized.']
  ];
  h += '<div style="display:grid;gap:9px;">' + rows.map(function(r){
    return '<div style="font-size:12px;line-height:1.6;"><strong style="color:#60a5fa;">' + r[0] + ':</strong> <span style="font-family:Space Mono,monospace;word-break:break-all;color:var(--text);">' + r[1] + '</span><br/><span style="color:var(--muted);">' + r[2] + '</span></div>';
  }).join('') + '</div></div>';
  return h;
}
async function slDissect(){
  const out = slEl('slDissectOut');
  if(!slWalletState || !slWalletState.lastTxid){
    out.innerHTML = '<div class="demo-desc" style="color:#fbbf24;">Broadcast a transaction in step 3 first - then there will be something to dissect.</div>';
    return;
  }
  out.innerHTML = '<div class="demo-desc">Pulling your transaction back off the blockchain...</div>';
  try {
    const txid = slWalletState.lastTxid;
    const [txRes, hexRes] = await Promise.all([
      fetch(SIGNET_API + '/tx/' + txid),
      fetch(SIGNET_API + '/tx/' + txid + '/hex')
    ]);
    if(!txRes.ok) throw new Error('tx lookup returned ' + txRes.status);
    const tx = await txRes.json();
    const hex = (await hexRes.text()).trim();
    let segs = null;
    try { segs = slParseRawTx(hex); } catch(e){ segs = null; }
    let html = slDissectRender(tx, hex, segs);
    if(tx.status && tx.status.confirmed){
      try {
        const blockRes = await fetch(SIGNET_API + '/block/' + tx.status.block_hash);
        const block = await blockRes.json();
        let txIndex = -1;
        try {
          const idsRes = await fetch(SIGNET_API + '/block/' + tx.status.block_hash + '/txids');
          const ids = await idsRes.json();
          txIndex = ids.indexOf(txid);
        } catch(e){}
        html += slBlockRender(block, txIndex);
      } catch(e){
        html += '<div class="demo-desc" style="color:#fbbf24;">Could not load the block details (' + e.message + ') - try again in a moment.</div>';
      }
    } else {
      html += '<div class="demo-plan" style="border-color:rgba(251,191,36,0.4);"><div style="font-size:12px;color:#fbbf24;line-height:1.7;">&#9203; Still unconfirmed - the block header dissection unlocks once a miner includes it. Check step 4, then pull it apart again.</div></div>';
    }
    out.innerHTML = html;
  } catch(e){
    out.innerHTML = '<div class="demo-desc" style="color:#f87171;">Could not fetch the transaction (' + e.message + '). Check your connection and try again.</div>';
  }
}
slEl('slDissectBtn')?.addEventListener('click', slDissect);

// ── Final Exam + Certificate ──
const EXAM_EXTRA = [
  {sec:'money', q:'What made gold win over shells, salt, and cattle as money for 5,000 years?', ok:'It best combined scarcity, durability, divisibility, and portability', wrong:['Governments declared it valuable','It was the prettiest metal']},
  {sec:'year1971', q:'What changed about the US dollar in 1971?', ok:'It lost its last link to gold, becoming purely faith-based money', wrong:['It became backed by oil instead','Paper bills were introduced for the first time']},
  {sec:'inflation', q:'Who benefits FIRST when new money is printed?', ok:'Whoever receives it earliest - banks and asset owners - before prices adjust', wrong:['Everyone equally at the same time','Savers, because their accounts grow']},
  {sec:'fiatgraveyard', q:'What has happened to every purely faith-based currency in history so far?', ok:'Each one eventually lost most or all of its value', wrong:['Most stabilized after a rough first century','They were all replaced by gold again']},
  {sec:'satoshi', q:'Why does Satoshi’s disappearance make Bitcoin STRONGER?', ok:'There is no leader to pressure, subpoena, or corrupt', wrong:['It created mystery that markets love','It let exchanges take over development']},
  {sec:'altcoins', q:'What is the decentralization test this course applies to any cryptocurrency?', ok:'Can anyone change the rules or halt the network? If yes, it fails', wrong:['Is it listed on major exchanges?','Does it have more than 1,000 developers?']},
  {sec:'mining', q:'Roughly how many bitcoin will ever exist?', ok:'21 million, enforced by every node', wrong:['100 million, set by miners','It grows 2% per year forever']},
  {sec:'blocks', q:'What does the halving do every four years?', ok:'Cuts the new bitcoin issued per block in half', wrong:['Doubles the block size','Halves transaction fees']},
  {sec:'wallets', q:'What does a Bitcoin wallet actually store?', ok:'Your keys - the coins themselves live on the blockchain', wrong:['Your actual bitcoin, like a digital purse','A copy of the whole blockchain']},
  {sec:'exchanges', q:'"Not your keys, not your coins" warns about what?', ok:'Bitcoin left on an exchange is an IOU that can vanish if the exchange fails', wrong:['Losing your password to the exchange','Buying at the wrong price']},
  {sec:'sending', q:'You sent bitcoin to the wrong address. What can be done?', ok:'Nothing - transactions are irreversible by design, so verify before sending', wrong:['Support can reverse it within 24 hours','Miners will refund it for a fee']},
  {sec:'privatekeys', q:'Where is the SAFEST place for the seed phrase protecting your savings?', ok:'Written physically, stored securely offline, never photographed or typed online', wrong:['A screenshot in your camera roll','A note in your email drafts']},
  {sec:'lightning', q:'What problem does the Lightning Network solve?', ok:'Instant, near-free payments by settling many transfers off-chain and anchoring to Bitcoin', wrong:['It increases the 21 million supply cap','It replaces miners with validators']},
  {sec:'caseagainst', q:'What is the honest response to "Bitcoin has crashed 75%+ four times"?', ok:'True - which is exactly why you only invest what you can watch drop without selling', wrong:['False - Bitcoin has never crashed','Crashes cannot happen after the ETFs']}
];
let examQs = [], examIdx = 0, examCorrect = 0, examMissed = [];
function examBuildPool(){
  const pool = [];
  Object.keys(quickChecks).forEach(function(k){
    const qc = quickChecks[k];
    pool.push({sec: k, q: qc.q, ok: qc.ok, wrong: qc.wrong});
  });
  EXAM_EXTRA.forEach(function(x){ pool.push(x); });
  pool.sort(function(){ return Math.random() - 0.5; });
  return pool.slice(0, 25);
}
function examRenderQ(){
  const item = examQs[examIdx];
  document.getElementById('examNum').textContent = examIdx + 1;
  document.getElementById('examProgress').style.width = (examIdx / 25 * 100) + '%';
  document.getElementById('examQ').textContent = item.q;
  const opts = [{t: item.ok, ok: true}].concat(item.wrong.map(function(w){ return {t: w, ok: false}; }));
  opts.sort(function(){ return Math.random() - 0.5; });
  const box = document.getElementById('examOpts');
  box.innerHTML = '';
  opts.forEach(function(o){
    const b = document.createElement('button');
    b.className = 'demo-btn demo-btn-ghost';
    b.style.cssText = 'font-size:14px;padding:14px 16px;text-align:left;justify-content:flex-start;line-height:1.5;';
    b.textContent = o.t;
    b.addEventListener('click', function(){
      if(box.dataset.locked) return;
      box.dataset.locked = '1';
      if(o.ok){ examCorrect++; } else { examMissed.push(item.sec); }
      b.style.borderColor = 'var(--orange)';
      setTimeout(function(){
        delete box.dataset.locked;
        examIdx++;
        if(examIdx < examQs.length) examRenderQ(); else examFinish();
      }, 250);
    });
    box.appendChild(b);
  });
}
function examFinish(){
  document.getElementById('examArea').classList.add('hidden');
  const r = document.getElementById('examResult');
  r.classList.remove('hidden');
  const passed = examCorrect >= 20;
  try { localStorage.setItem('abc_exam_v1', JSON.stringify({passed: passed, score: examCorrect, date: new Date().toISOString().slice(0,10)})); } catch(e){}
  if(passed){
    r.innerHTML = '<div class="demo-result demo-result-ok"><div class="demo-result-title">🎓 PASSED - ' + examCorrect + ' / 25</div><div class="demo-result-detail">You did not just read about Bitcoin. You understand it - and you proved it. Mint your certificate below.</div></div>';
    document.getElementById('certArea').classList.remove('hidden');
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) for(let k = 0; k < 20; k++) setTimeout(function(){ spawnCoin(); }, k * 80);
  } else {
    const secs = Array.from(new Set(examMissed));
    r.innerHTML = '<div class="demo-result demo-result-fail"><div class="demo-result-title">' + examCorrect + ' / 25 - not yet</div><div class="demo-result-detail">You need 20. This is a study plan, not a verdict. Revisit the lessons below, then try again - unlimited attempts.</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:12px;">'
      + secs.map(function(sc){ return '<button class="demo-btn demo-btn-ghost" style="width:auto;font-size:12px;padding:8px 14px;" onclick="showSection(\'' + sc + '\')">' + (sectionNames[sc] || sc) + '</button>'; }).join('')
      + '</div><button class="demo-btn demo-btn-orange" style="margin-top:14px;" onclick="examStart()">Try again</button></div>';
  }
}
function examStart(){
  examQs = examBuildPool(); examIdx = 0; examCorrect = 0; examMissed = [];
  document.getElementById('examIntro').classList.add('hidden');
  document.getElementById('examResult').classList.add('hidden');
  document.getElementById('certArea').classList.add('hidden');
  document.getElementById('examArea').classList.remove('hidden');
  examRenderQ();
}
document.getElementById('examStartBtn')?.addEventListener('click', examStart);
(function(){
  try {
    const prev = JSON.parse(localStorage.getItem('abc_exam_v1') || 'null');
    if(prev && prev.passed){
      const el = document.getElementById('examPrevResult');
      if(el) el.innerHTML = 'You passed on ' + prev.date + ' with ' + prev.score + '/25. Retake any time, or scroll down to re-mint your certificate.';
      document.getElementById('certArea')?.classList.remove('hidden');
    }
  } catch(e){}
})();
// ── Certificate ──
async function certMint(){
  const name = (document.getElementById('certName').value || 'A Curious Student').trim().substring(0, 40);
  let score = 25, dateStr = new Date().toISOString().slice(0,10);
  try { const prev = JSON.parse(localStorage.getItem('abc_exam_v1') || 'null'); if(prev){ score = prev.score; dateStr = prev.date; } } catch(e){}
  let blockH = null;
  try {
    const res = await fetch('https://mempool.space/api/blocks/tip/height');
    blockH = Number(await res.json());
  } catch(e){
    const el = document.getElementById('blockHeight');
    if(el && /\d/.test(el.textContent)) blockH = parseInt(el.textContent.replace(/,/g,''), 10);
  }
  const certId = sha256Hex('a-bit-curious|' + name + '|' + dateStr + '|' + score + '/25|block:' + (blockH || 'unknown'));
  const cv = document.getElementById('certCanvas');
  const c = cv.getContext('2d');
  // Background
  c.fillStyle = '#0b0b18'; c.fillRect(0, 0, 1200, 850);
  const grad = c.createRadialGradient(600, 340, 60, 600, 400, 700);
  grad.addColorStop(0, 'rgba(245,158,11,0.14)'); grad.addColorStop(1, 'rgba(245,158,11,0)');
  c.fillStyle = grad; c.fillRect(0, 0, 1200, 850);
  c.strokeStyle = '#f59e0b'; c.lineWidth = 3; c.strokeRect(30, 30, 1140, 790);
  c.strokeStyle = 'rgba(245,158,11,0.3)'; c.lineWidth = 1; c.strokeRect(42, 42, 1116, 766);
  c.textAlign = 'center';
  c.fillStyle = '#f59e0b'; c.font = 'bold 90px Georgia, serif'; c.fillText('₿', 600, 155);
  c.fillStyle = '#7878a0'; c.font = '600 20px Syne, sans-serif'; c.fillText('A  B I T  C U R I O U S', 600, 205);
  c.fillStyle = '#f5f5fa'; c.font = 'bold 44px Syne, sans-serif'; c.fillText('Certificate of Completion', 600, 280);
  c.fillStyle = '#7878a0'; c.font = '18px Inter, sans-serif'; c.fillText('This certifies that', 600, 350);
  c.fillStyle = '#fcd34d'; c.font = 'bold 58px Syne, sans-serif'; c.fillText(name, 600, 425);
  c.fillStyle = '#b8b8d8'; c.font = '19px Inter, sans-serif';
  c.fillText('completed the full interactive course on money and Bitcoin:', 600, 485);
  c.fillText('monetary history, cryptography, mining, self-custody, and the Lightning Network,', 600, 515);
  c.fillText('including hands-on use of the Bitcoin Signet network with real cryptographic keys.', 600, 545);
  c.fillStyle = '#f59e0b'; c.font = 'bold 26px Space Mono, monospace';
  c.fillText('Final exam: ' + score + ' / 25', 600, 615);
  c.fillStyle = '#7878a0'; c.font = '17px Space Mono, monospace';
  c.fillText(dateStr + (blockH ? '  ·  issued at Bitcoin block ' + blockH.toLocaleString() : ''), 600, 655);
  c.fillStyle = '#4a4a6a'; c.font = '13px Space Mono, monospace';
  c.fillText('Certificate ID (SHA-256): ' + certId.substring(0, 40), 600, 740);
  c.fillText(certId.substring(40) + '  ·  verify at www.a-bit-curious.com', 600, 762);
  document.getElementById('certOutput').classList.remove('hidden');
  document.getElementById('certHash').textContent = certId;
  document.getElementById('certBlockNote').textContent = blockH ? ' (issued at Bitcoin block ' + blockH.toLocaleString() + ').' : '.';
  cv.scrollIntoView({behavior: 'smooth', block: 'center'});
}
document.getElementById('certMintBtn')?.addEventListener('click', certMint);
document.getElementById('certDownloadBtn')?.addEventListener('click', function(){
  const a = document.createElement('a');
  a.download = 'a-bit-curious-certificate.png';
  a.href = document.getElementById('certCanvas').toDataURL('image/png');
  a.click();
});

// ── Wallet decision tree (Your First $10) ──
(function(){
  const tree = document.getElementById('wdTree');
  if(!tree) return;
  const QS = [
    {q:'How much bitcoin will this wallet eventually hold?', opts:[{t:'Pocket money (under $100)', v:'small'},{t:'Real savings ($100 - $5,000)', v:'mid'},{t:'Serious wealth (over $5,000)', v:'large'}]},
    {q:'How would you describe your comfort with technology?', opts:[{t:'Hold my hand, please', v:'easy'},{t:'I can follow instructions carefully', v:'ok'}]},
    {q:'How often will you send or spend from it?', opts:[{t:'Regularly', v:'often'},{t:'Rarely - mostly holding', v:'rarely'}]}
  ];
  const answers = [];
  function recommend(){
    const [amt, tech, freq] = answers;
    let title, body;
    if(amt === 'small'){
      title = 'A reputable custodial app (training wheels)';
      body = 'For pocket money, a major regulated exchange app or a Lightning wallet is fine - the convenience outweighs the custody risk at this size. Graduate to self-custody as the amount grows.';
    } else if(amt === 'large'){
      title = 'A hardware wallet (cold storage)';
      body = 'At this size, keys belong offline on a dedicated signing device from a well-known maker (Coldcard, Trezor, and similar - none of them sponsor this site). Above roughly $50k, research multisig or collaborative custody so no single mistake is fatal.';
    } else if(freq === 'rarely' || tech === 'ok'){
      title = 'A hardware wallet, or a well-known software wallet';
      body = 'Real savings deserve real keys. A hardware wallet is the gold standard; a long-established open-source software wallet on a clean phone is an acceptable step while you learn. Never a browser extension full of tokens.';
    } else {
      title = 'A well-known open-source software wallet';
      body = 'A mobile wallet with a strong reputation and years of history gives you true self-custody with an approachable interface. Write the seed on paper, and plan to add a hardware wallet as the balance grows.';
    }
    const r = document.getElementById('wdResult');
    r.classList.remove('hidden');
    r.className = 'demo-result demo-result-ok';
    r.innerHTML = '<div class="demo-result-title" style="font-size:17px;">Recommended: ' + title + '</div><div class="demo-result-detail">' + body + '</div>'
      + '<button class="demo-btn demo-btn-ghost" style="margin-top:12px;font-size:12px;" onclick="wdRestart()">Answer again</button>';
  }
  let step = 0;
  function render(){
    const q = QS[step];
    tree.innerHTML = '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:12px;">' + q.q + '</div>'
      + '<div style="display:grid;gap:8px;">' + q.opts.map(function(o, i){ return '<button class="demo-btn demo-btn-ghost wd-opt" data-i="' + i + '" style="font-size:13px;padding:12px 14px;text-align:left;justify-content:flex-start;">' + o.t + '</button>'; }).join('') + '</div>';
    tree.querySelectorAll('.wd-opt').forEach(function(b){
      b.addEventListener('click', function(){
        answers[step] = q.opts[parseInt(b.dataset.i)].v;
        step++;
        if(step < QS.length) render(); else { tree.innerHTML = ''; recommend(); }
      });
    });
  }
  window.wdRestart = function(){
    step = 0; answers.length = 0;
    document.getElementById('wdResult').classList.add('hidden');
    render();
  };
  render();
})();
// ── Withdrawal checklist ──
(function(){
  const box = document.getElementById('wdChecklist');
  if(!box) return;
  const items = [
    'Send a SMALL test amount first, always',
    'Verify the first 6 and last 6 characters of the address after pasting',
    'Seed phrase is on paper or metal - never photographed, never typed online',
    'One trusted person knows WHERE my backup lives (not what it says)',
    'I am not rushing. Nobody is pressuring me to move fast'
  ];
  let done = 0;
  items.forEach(function(t){
    const d = document.createElement('div');
    d.className = 'demo-coin';
    d.innerHTML = '<div style="font-size:18px;" class="wdc-mark">⬜</div><div style="flex:1;font-size:13px;color:var(--text2);line-height:1.5;">' + t + '</div>';
    d.addEventListener('click', function(){
      const m = d.querySelector('.wdc-mark');
      const checked = m.textContent === '✅';
      m.textContent = checked ? '⬜' : '✅';
      d.classList.toggle('selected', !checked);
      done += checked ? -1 : 1;
      document.getElementById('wdChecklistDone').textContent = done === items.length ? 'All five, every time, forever. That is the whole discipline.' : '';
    });
    box.appendChild(d);
  });
})();
// ── Scam drill ──
(function(){
  const game = document.getElementById('scamGame');
  if(!game) return;
  const MSGS = [
    {from:'SMS from +1 (838) 555-0147', msg:'Coinbase Alert: A withdrawal of 0.85 BTC has been initiated. If this was NOT you, call our fraud line immediately: +1-888-555-0122', scam:true, why:'Exchanges do not text phone numbers to call. The "fraud line" is the scammer, who will walk you into moving coins to a "safe" wallet they control. Urgency + phone number = scam.'},
    {from:'Popup after a wallet app update', msg:'Security update complete. Please re-validate your wallet by entering your 12-word recovery phrase below.', scam:true, why:'Nothing legitimate EVER asks for the seed phrase. Not updates, not support, not validation. This is rule number one, and it has no exceptions.'},
    {from:'Email from your exchange', msg:'New sign-in to your account from Chrome on Windows, Berlin, Germany. If this was you, no action is needed. If not, review your account security in the app.', scam:false, why:'Legitimate: purely informational, demands nothing, contains no link to click or number to call, and directs you to open the app YOURSELF. Still - go to the app directly, never through email links.'},
    {from:'YouTube live stream: "Tesla Event 2026"', msg:'LIVE GIVEAWAY: Elon is doubling all Bitcoin sent to the address below for the next 20 minutes. Send 0.1 BTC, receive 0.2 BTC back. Verified by Tesla.', scam:true, why:'The giveaway doubler is the single most profitable Bitcoin scam in history. Nobody doubles money. The countdown exists to stop you from thinking.'},
    {from:'X/Twitter DM', msg:'Hello, I am from Ledger Support. We detected an issue syncing your device. Please connect your wallet at ledger-sync-portal.com so we can resolve it for you.', scam:true, why:'Support never contacts you first, and wallet makers never need you to "connect" anywhere. The site harvests everything you enter.'},
    {from:'Your wallet app changelog', msg:'Version 2.4: improved fee estimation for high-congestion periods, two bug fixes, updated translations.', scam:false, why:'Legitimate: a boring changelog inside the app you installed, asking for nothing. Boring is what real software sounds like.'},
    {from:'Your own screen, mid-transaction', msg:'You copied bc1q7x2f...k9d4 from your exchange, but the address field shows bc1qm3rp...w2z8 after pasting.', scam:true, why:'Clipboard malware silently swaps addresses as you paste. This is why the checklist says verify first 6 and last 6 characters, every single time.'},
    {from:'WhatsApp, after two weeks of friendly chat', msg:'You are so easy to talk to! By the way, my aunt runs a private crypto trading desk - I have made 40% monthly. I could get you access if you want, minimum is only $2,000.', scam:true, why:'This is pig butchering: weeks of manufactured friendship, then an "exclusive platform" that shows fake profits until you try to withdraw. It steals more per victim than any other scam.'}
  ];
  let idx = 0, right = 0;
  MSGS.sort(function(){ return Math.random() - 0.5; });
  MSGS.forEach(function(m, i){
    const card = document.createElement('div');
    card.className = 'demo-step' + (i === 0 ? ' active' : '');
    card.innerHTML = '<div style="font-size:12px;color:var(--muted);font-family:Space Mono,monospace;margin-bottom:6px;">' + m.from + '</div>'
      + '<div style="padding:14px;border-radius:10px;background:rgba(0,0,0,0.35);border:1px solid var(--glass-border);font-size:13px;color:var(--text);line-height:1.7;margin-bottom:12px;">' + m.msg + '</div>'
      + '<div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;">'
      + '<button class="sd-opt demo-btn demo-btn-red" data-v="scam" style="font-size:13px;padding:12px;">🚨 Scam</button>'
      + '<button class="sd-opt demo-btn demo-btn-green" data-v="legit" style="font-size:13px;padding:12px;">✅ Legitimate</button>'
      + '</div>'
      + '<div class="sd-why demo-desc hidden" style="padding:12px;border-radius:10px;margin-top:10px;line-height:1.65;"></div>';
    card.querySelectorAll('.sd-opt').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(btn.disabled) return;
        const saidScam = btn.dataset.v === 'scam';
        const correct = saidScam === m.scam;
        if(correct) right++;
        idx++;
        card.querySelectorAll('.sd-opt').forEach(function(b){ b.disabled = true; b.style.cursor = 'default'; b.style.opacity = '0.55'; });
        btn.style.opacity = '1';
        const why = card.querySelector('.sd-why');
        why.classList.remove('hidden');
        why.style.background = correct ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)';
        why.style.border = '1px solid ' + (correct ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)');
        why.innerHTML = '<strong style="color:' + (correct ? '#4ade80' : '#f87171') + ';">' + (correct ? 'Correct - ' : 'Missed it - ') + (m.scam ? 'SCAM.' : 'LEGITIMATE.') + '</strong> ' + m.why;
        if(idx === MSGS.length){
          const sc = document.getElementById('scamScore');
          sc.classList.remove('hidden');
          sc.className = 'demo-result ' + (right >= 7 ? 'demo-result-ok' : 'demo-result-fail');
          sc.innerHTML = '<div class="demo-result-title">' + right + ' / ' + MSGS.length + ' caught</div><div class="demo-result-detail">'
            + (right === MSGS.length ? 'Perfect. You are harder to rob than 99% of the internet.' : right >= 7 ? 'Strong. Review the ones you missed - real scammers only need you to miss once.' : 'This drill just saved you real money. Read every explanation above, then run it again - in the wild there are no second chances.')
            + '</div>';
        }
      });
    });
    game.appendChild(card);
  });
})();

// ── Debt by administration chart (Full Faith & Credit) ──
(function(){
  const chart = document.getElementById('debtPartyChart');
  if(!chart) return;
  // Gross federal debt in $T at fiscal-year ends spanning each term (Treasury Historical Debt Outstanding)
  const PRES = [
    {name:'Reagan', party:'R', years:'1981-89', added: 1.86, pct: 186, crisis: 0},
    {name:'Bush Sr.', party:'R', years:'1989-93', added: 1.55, pct: 54, crisis: 0},
    {name:'Clinton', party:'D', years:'1993-01', added: 1.40, pct: 32, crisis: 0},
    {name:'Bush Jr.', party:'R', years:'2001-09', added: 6.10, pct: 105, crisis: 0.7, note:'2008 bank rescue'},
    {name:'Obama', party:'D', years:'2009-17', added: 8.33, pct: 70, crisis: 1.5, note:'GFC stimulus + response'},
    {name:'Trump', party:'R', years:'2017-21', added: 8.19, pct: 40, crisis: 3.5, note:'COVID relief bills'},
    {name:'Biden', party:'D', years:'2021-25', added: 7.79, pct: 27, crisis: 1.9, note:'COVID relief (ARPA)'}
  ];
  const COLORS = {R:'#f87171', D:'#60a5fa'};
  function render(adjusted){
    const vals = PRES.map(function(p){ return adjusted ? p.added - p.crisis : p.added; });
    const max = Math.max.apply(null, vals);
    chart.innerHTML = '';
    PRES.forEach(function(p, i){
      const v = vals[i];
      const row = document.createElement('div');
      row.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
        + '<span><strong style="color:' + COLORS[p.party] + ';">' + p.name + '</strong> <span style="color:var(--muted);font-size:12px;">(' + (p.party === 'R' ? 'Republican' : 'Democrat') + ', ' + p.years + ')</span></span>'
        + '<span style="font-family:Space Mono,monospace;color:' + COLORS[p.party] + ';font-weight:700;">+$' + v.toFixed(2) + 'T <span style="color:var(--muted);font-weight:400;font-size:12px;">(+' + p.pct + '%)</span></span></div>'
        + '<div style="height:14px;border-radius:7px;background:rgba(255,255,255,0.05);overflow:hidden;">'
        + '<div style="height:100%;border-radius:7px;width:' + (v / max * 100).toFixed(1) + '%;background:' + COLORS[p.party] + ';opacity:0.85;transition:width .5s cubic-bezier(.4,0,.2,1);"></div></div>'
        + (adjusted && p.crisis ? '<div style="font-size:12px;color:var(--muted);margin-top:2px;">excludes ~$' + p.crisis.toFixed(1) + 'T ' + p.note + '</div>' : '');
      chart.appendChild(row);
    });
    // In-progress term
    const cur = document.createElement('div');
    cur.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
      + '<span><strong style="color:' + COLORS.R + ';">Trump (2nd term)</strong> <span style="color:var(--muted);font-size:12px;">(Republican, 2025- )</span></span>'
      + '<span style="font-family:Space Mono,monospace;color:var(--muted);font-size:12px;">in progress - watch the clock above</span></div>'
      + '<div style="height:14px;border-radius:7px;background:rgba(255,255,255,0.05);border:1px dashed rgba(248,113,113,0.5);"></div>';
    chart.appendChild(cur);
    // Party tallies over completed terms since 1981 (24 years each)
    const rTotal = PRES.filter(function(p){ return p.party === 'R'; }).reduce(function(t, p){ return t + (adjusted ? p.added - p.crisis : p.added); }, 0);
    const dTotal = PRES.filter(function(p){ return p.party === 'D'; }).reduce(function(t, p){ return t + (adjusted ? p.added - p.crisis : p.added); }, 0);
    document.getElementById('debtPartyTally').innerHTML =
      '<div style="padding:14px;border-radius:12px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.3);text-align:center;">'
      + '<div style="font-size:12px;color:var(--muted);">Republican presidents, 24 years</div>'
      + '<div style="font-family:Space Mono,monospace;font-size:22px;font-weight:700;color:#f87171;">+$' + rTotal.toFixed(1) + 'T</div></div>'
      + '<div style="padding:14px;border-radius:12px;background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.3);text-align:center;">'
      + '<div style="font-size:12px;color:var(--muted);">Democratic presidents, 24 years</div>'
      + '<div style="font-family:Space Mono,monospace;font-size:22px;font-weight:700;color:#60a5fa;">+$' + dTotal.toFixed(1) + 'T</div></div>';
  }
  const allBtn = document.getElementById('debtAllBtn');
  const adjBtn = document.getElementById('debtAdjBtn');
  allBtn.addEventListener('click', function(){ allBtn.classList.add('active'); adjBtn.classList.remove('active'); render(false); });
  adjBtn.addEventListener('click', function(){ adjBtn.classList.add('active'); allBtn.classList.remove('active'); render(true); });
  render(false);
})();

// ═══════════════════════════════════════
//   INIT (deep link routing)
// ═══════════════════════════════════════
// Back/forward navigation: re-render the section the hash points at
window.addEventListener('popstate', function(){
  const sec = location.hash.slice(1);
  if(sectionOrder.includes(sec) && sec !== currentSection && !isTransitioning){
    abcRoutingInitial = true; // hash already matches target - don't push a duplicate history entry
    showSection(sec);
  }
});
// First render: URL hash wins, then last visited lesson, then welcome
(function(){
  const fromHash = location.hash.slice(1);
  const initial = sectionOrder.includes(fromHash) ? fromHash
    : (abcLastSection && sectionOrder.includes(abcLastSection) ? abcLastSection : 'welcome');
  currentSection = initial; // instant render, skip the transition animation on load
  showSection(initial);
})();

// ── Bibliography reference link handler ──
// Intercept clicks on [N] superscript links, switch to bibliography section, then scroll to ref
document.addEventListener('click', function(e){
  var link = e.target.closest('a[href^="#ref-"]');
  if(!link) return;
  e.preventDefault();
  var refId = link.getAttribute('href').slice(1); // "ref-1"
  showSection('bibliography');
  // Wait for section to become visible, then scroll to the reference
  requestAnimationFrame(function(){
    setTimeout(function(){
      var el = document.getElementById(refId);
      if(el){
        el.scrollIntoView({behavior:'smooth', block:'center'});
        // Flash highlight
        el.style.transition = 'background 0.3s, border-color 0.3s';
        el.style.background = 'rgba(245,158,11,0.15)';
        el.style.borderColor = 'var(--orange)';
        setTimeout(function(){
          el.style.background = '';
          el.style.borderColor = '';
        }, 2000);
      }
    }, 100);
  });
});

/* ═══ Am I Too Late? - Interactive Market Cap Calculator ═══ */
(function(){
  const BTC_CIRCULATING = 19_800_000;
  const CURRENT_MCAP = 1_700_000_000_000;
  const CURRENT_PRICE = 87_000;
  const ASSETS = {gold:18_000_000_000_000, realEstate:100_000_000_000_000, bonds:130_000_000_000_000, art:6_000_000_000_000};

  function fmt$(n){
    if(n>=1e12) return '$'+(n/1e12).toFixed(1)+'T';
    if(n>=1e9) return '$'+(n/1e9).toFixed(0)+'B';
    return '$'+n.toLocaleString('en-US');
  }

  function updateCalc(){
    var gp=+document.getElementById('goldCapture').value;
    var rp=+document.getElementById('realEstateCapture').value;
    var bp=+document.getElementById('bondsCapture').value;
    var ap=+document.getElementById('artCapture').value;
    document.getElementById('goldPctLabel').textContent=gp+'%';
    document.getElementById('realEstatePctLabel').textContent=rp+'%';
    document.getElementById('bondsPctLabel').textContent=bp+'%';
    document.getElementById('artPctLabel').textContent=ap+'%';
    var captured=ASSETS.gold*(gp/100)+ASSETS.realEstate*(rp/100)+ASSETS.bonds*(bp/100)+ASSETS.art*(ap/100);
    var impliedMcap=CURRENT_MCAP+captured;
    var impliedPrice=Math.round(impliedMcap/BTC_CIRCULATING);
    var multiple=(impliedPrice/CURRENT_PRICE).toFixed(1);
    document.getElementById('impliedMarketCap').textContent=fmt$(impliedMcap);
    document.getElementById('impliedPrice').textContent='$'+impliedPrice.toLocaleString('en-US');
    document.getElementById('impliedMultiple').textContent=multiple+'x';
    var multEl=document.getElementById('impliedMultiple');
    if(parseFloat(multiple)>=5) multEl.style.color='#4ade80';
    else if(parseFloat(multiple)>=2) multEl.style.color='var(--orange-bright)';
    else multEl.style.color='var(--orange)';
  }

  window.setScenario=function(g,r,b,a){
    document.getElementById('goldCapture').value=g;
    document.getElementById('realEstateCapture').value=r;
    document.getElementById('bondsCapture').value=b;
    document.getElementById('artCapture').value=a;
    updateCalc();
  };

  ['goldCapture','realEstateCapture','bondsCapture','artCapture'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.addEventListener('input',updateCalc);
  });
})();

// ═══════════════════════════════════════
//   OFFLINE SUPPORT
// ═══════════════════════════════════════
if('serviceWorker' in navigator && location.protocol === 'https:'){
  window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}); });
}
