// ═══════════════════════════════════════════════════════════════
//   DEMOS: interactives added after the original set
//   Lightning channel, new-node test (PoW vs PoS), 51% attack odds,
//   exchange run, gold vs bitcoin scorecard, block header editor,
//   2-of-3 multisig vault.
//   Loads after app.js (uses sha256Hex, btcPrice, quickChecks,
//   quickCheckHTML, modalInitFns, getModalContent) and before engage.js.
// ═══════════════════════════════════════════════════════════════
'use strict';

const EXTRA_DEMOS = {};
function xdHead(title, sub){
  return '<div class="demo-title">' + title + '</div><p class="demo-desc" style="margin:0 0 16px;">' + sub + '</p>';
}
function xdStep(n, label, inner){
  return '<div class="demo-step active"><div class="demo-step-head"><div class="demo-num">' + n + '</div><div class="demo-step-label">' + label + '</div></div>' + inner + '</div>';
}
function xdFmt(n){ return Math.round(n).toLocaleString('en-US'); }
function xdUsd(n){
  if(n >= 1e9) return '$' + (n / 1e9).toFixed(1) + ' billion';
  if(n >= 1e6) return '$' + (n / 1e6).toFixed(1) + ' million';
  return '$' + xdFmt(n);
}

// ── Quick checks for the new demos (also feed the final exam pool) ──
Object.assign(quickChecks, {
  lightning: {q:'Why can you not send more through a channel than your side of it holds?', ok:'A channel only slides the coins locked inside it back and forth - your side is your spendable balance', wrong:['Lightning nodes charge a penalty above a set limit','Miners cap the size of Lightning payments'], why:'Opening a channel locks a fixed amount of bitcoin on-chain. Every payment just moves the dividing line between the two sides. Nothing is created, so nothing can be overspent.'},
  powvpos: {q:'A brand-new proof-of-stake node is offered two histories, both correctly signed. What does it need to choose?', ok:'A recent checkpoint from a source it already trusts', wrong:['Nothing - the longer list of signatures wins','More electricity than the attacker'], why:'Old signing keys cost nothing to reuse, so signatures alone cannot rank two histories. Proof-of-stake designs handle this with trusted checkpoints. Proof of work needs none: the work itself is the evidence.'},
  attackvectors: {q:'Why do exchanges wait for more confirmations on a large deposit than a shop does for a coffee?', ok:'Each confirmation makes a reversal exponentially less likely, and a bigger payment justifies a bigger attack', wrong:['Large transactions take longer to download','Miners process small payments first'], why:'An attacker only tries a reversal worth more than it costs. Six confirmations push the odds for a 10% attacker to about 1 in 4,000, which is why six became the convention for large sums.'},
  exchanges: {q:'An exchange shows you a balance of 1 BTC. What do you actually own?', ok:'A promise from the exchange to hand over 1 BTC if you ask and it is able to', wrong:['One specific bitcoin recorded in your name on the blockchain','A share of the exchange itself'], why:'The number on the screen is an entry in the company\'s own database. The coins sit in wallets the exchange controls. It becomes your bitcoin only when you withdraw it to keys you hold.'},
  goldvsbtc: {q:'On which property does gold still clearly beat bitcoin?', ok:'Track record: five thousand years against under twenty', wrong:['Portability','Ease of verifying it is genuine'], why:'Bitcoin wins on scarcity, divisibility, portability and verifiability. Gold wins on history and on price stability today. An honest comparison says both.'},
  blocks: {q:'A miner swaps one transaction in a block that is already mined. What breaks first?', ok:'The merkle root changes, so the header hash changes and the proof of work is void', wrong:['Nothing, until another miner complains','Only the timestamp needs updating'], why:'The header does not list transactions. It holds one fingerprint of all of them. Touch any transaction and that fingerprint, the header hash and the proof of work all fall together.'}
});

// ═══════════════ 1. LIGHTNING CHANNEL ═══════════════
EXTRA_DEMOS.lightning = {
  html: xdHead('&#9889; Open a Lightning channel', 'You and a caf&eacute; lock coins into a shared channel. After that, payments just slide the balance between you. Watch what reaches the blockchain.')
    + xdStep(1, 'Open the channel', '<p class="demo-desc" style="margin:0 0 12px;">Opening is a normal on-chain transaction. It locks 100,000 sats of yours into the channel.</p><button type="button" class="demo-btn demo-btn-orange" id="lnOpen">Open channel with 100,000 sats</button>')
    + '<div id="lnLive" class="hidden">'
    + xdStep(2, 'Pay back and forth, instantly',
        '<div class="xd-bar" aria-hidden="true"><div class="xd-bar-you" id="lnBarYou"></div><div class="xd-bar-them" id="lnBarThem"></div></div>'
      + '<div class="xd-row"><div><span class="xd-k">You</span> <strong id="lnYou">100,000</strong> sats</div><div><strong id="lnThem">0</strong> sats <span class="xd-k">Caf&eacute;</span></div></div>'
      + '<div class="xd-btns"><button type="button" class="demo-btn demo-btn-ghost" id="lnPay1">Buy a coffee (4,000)</button><button type="button" class="demo-btn demo-btn-ghost" id="lnPay2">Buy lunch (22,000)</button><button type="button" class="demo-btn demo-btn-ghost" id="lnRefund">Caf&eacute; refunds 4,000</button></div>'
      + '<div id="lnMsg" class="demo-desc" aria-live="polite"></div>')
    + xdStep(3, 'Close and settle', '<p class="demo-desc" style="margin:0 0 12px;">Closing writes only the final balances to the blockchain.</p><button type="button" class="demo-btn demo-btn-green" id="lnClose">Close the channel</button>')
    + '</div>'
    + '<div class="xd-stats"><div class="demo-stat"><div class="demo-stat-val" id="lnCount">0</div><div class="demo-stat-label">Lightning payments</div></div><div class="demo-stat"><div class="demo-stat-val" id="lnChain">0</div><div class="demo-stat-label">On-chain transactions</div></div><div class="demo-stat"><div class="demo-stat-val" id="lnWait">-</div><div class="demo-stat-label">Wait per payment</div></div></div>'
    + '<div id="lnResult" class="demo-result hidden" aria-live="polite"></div>',
  init: function(){
    const $ = function(i){ return document.getElementById(i); };
    const CAP = 100000;
    let you = CAP, them = 0, count = 0, chain = 0, open = false;
    function draw(){
      $('lnYou').textContent = xdFmt(you); $('lnThem').textContent = xdFmt(them);
      $('lnBarYou').style.width = (you / CAP * 100) + '%'; $('lnBarThem').style.width = (them / CAP * 100) + '%';
      $('lnCount').textContent = count; $('lnChain').textContent = chain;
    }
    function pay(amount, toThem){
      if(!open) return;
      if(toThem && amount > you){ $('lnMsg').innerHTML = '<span style="color:#f87171;">Not enough on your side.</span> You hold ' + xdFmt(you) + ' sats in this channel, so ' + xdFmt(amount) + ' cannot be sent. A channel never creates coins.'; return; }
      if(!toThem && amount > them){ $('lnMsg').innerHTML = '<span style="color:#f87171;">The caf&eacute; has nothing to send back yet.</span> Its side of the channel is empty until you pay it.'; return; }
      if(toThem){ you -= amount; them += amount; } else { you += amount; them -= amount; }
      count++;
      $('lnWait').textContent = '< 1 sec';
      $('lnMsg').innerHTML = 'Payment ' + count + ' settled instantly. Both of you signed a new balance. <strong>Nothing was sent to the blockchain.</strong>';
      draw();
    }
    $('lnOpen').addEventListener('click', function(){
      if(open) return;
      open = true; chain = 1;
      this.disabled = true; this.textContent = 'Channel open (1 on-chain transaction)';
      $('lnLive').classList.remove('hidden');
      $('lnWait').textContent = '~10 min, once';
      draw();
    });
    $('lnPay1').addEventListener('click', function(){ pay(4000, true); });
    $('lnPay2').addEventListener('click', function(){ pay(22000, true); });
    $('lnRefund').addEventListener('click', function(){ pay(4000, false); });
    $('lnClose').addEventListener('click', function(){
      if(!open) return;
      open = false; chain = 2; draw();
      ['lnPay1','lnPay2','lnRefund','lnClose'].forEach(function(i){ $(i).disabled = true; });
      const r = $('lnResult');
      r.classList.remove('hidden');
      r.style.cssText = 'background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.35);text-align:left;';
      r.innerHTML = '<strong style="color:#4ade80;">Channel closed.</strong> You made <strong>' + count + ' payment' + (count === 1 ? '' : 's') + '</strong> and the blockchain recorded <strong>2 transactions</strong>: the open and the close. You leave with ' + xdFmt(you) + ' sats, the caf&eacute; with ' + xdFmt(them) + '. That is how Bitcoin scales to everyday spending without making the base layer bigger.';
    });
    draw();
  }
};

// ═══════════════ 2. NEW-NODE TEST: POW VS POS ═══════════════
EXTRA_DEMOS.powvpos = {
  html: xdHead('&#9878;&#65039; The new-node test', 'You are a brand-new node that trusts nobody. An attacker hands you a forged history alongside the real one. See what it takes to fool you in each system.')
    + '<label class="demo-desc" for="ppBlocks" style="display:block;margin:0 0 6px;">How much history does the attacker rewrite? <strong id="ppN" style="color:var(--orange);">100</strong> blocks</label>'
    + '<input type="range" id="ppBlocks" min="1" max="1000" value="100" style="width:100%;accent-color:var(--orange);"/>'
    + '<div class="xd-two">'
    + '<div class="xd-card"><div class="xd-card-h" style="color:var(--orange);">&#9935;&#65039; Proof of work</div><div class="demo-desc">Forging blocks means redoing their work.</div><div class="xd-big" id="ppPowCost">-</div><div class="demo-desc" id="ppPowNote"></div><button type="button" class="demo-btn demo-btn-ghost" id="ppPowBtn">Offer the forged chain</button><div class="demo-desc" id="ppPowOut" aria-live="polite"></div></div>'
    + '<div class="xd-card"><div class="xd-card-h" style="color:#a78bfa;">&#129689; Proof of stake</div><div class="demo-desc">Forging blocks means signing them with keys that once held stake.</div><div class="xd-big" id="ppPosCost" style="color:#a78bfa;">-</div><div class="demo-desc" id="ppPosNote"></div><button type="button" class="demo-btn demo-btn-ghost" id="ppPosBtn">Offer the forged chain</button><div class="demo-desc" id="ppPosOut" aria-live="polite"></div></div>'
    + '</div>',
  init: function(){
    const $ = function(i){ return document.getElementById(i); };
    const slider = $('ppBlocks');
    function perBlock(){ return 3.125 * (typeof btcPrice !== 'undefined' && btcPrice > 0 ? btcPrice : 100000); }
    function draw(){
      const n = parseInt(slider.value, 10);
      $('ppN').textContent = xdFmt(n);
      $('ppPowCost').textContent = xdUsd(n * perBlock());
      $('ppPowNote').textContent = 'Rough floor: honest miners spend about one block reward (' + xdUsd(perBlock()) + ') of energy and hardware per block. The forger must match it for every block, and outrun the live network while doing so.';
      $('ppPosCost').textContent = '~$0';
      $('ppPosNote').textContent = 'Signing ' + xdFmt(n) + ' blocks takes seconds on a laptop. Slashing only threatens stake the signer still has. Keys that have since withdrawn have nothing left to lose.';
      $('ppPowOut').textContent = ''; $('ppPosOut').textContent = '';
    }
    slider.addEventListener('input', draw);
    $('ppPowBtn').addEventListener('click', function(){
      $('ppPowOut').innerHTML = '<strong style="color:#4ade80;">Rejected, with no help from anyone.</strong> Your node adds up the work in each chain and follows the heavier one. The forgery is only accepted if the attacker really did burn more energy than the whole honest network.';
    });
    $('ppPosBtn').addEventListener('click', function(){
      $('ppPosOut').innerHTML = '<strong style="color:#fbbf24;">Your node cannot tell them apart alone.</strong> Both histories carry valid signatures. To pick the real one you need a recent checkpoint from someone you already trust. Proof-of-stake networks accept this trade-off and call it weak subjectivity.';
    });
    draw();
  }
};

// ═══════════════ 3. 51% ATTACK ODDS ═══════════════
// Probability an attacker with share q ever catches up from z blocks behind (Bitcoin whitepaper, section 11)
function attackerSuccess(q, z){
  if(q >= 0.5) return 1;
  const p = 1 - q, lambda = z * (q / p);
  let sum = 1;
  for(let k = 0; k <= z; k++){
    let poisson = Math.exp(-lambda);
    for(let i = 1; i <= k; i++) poisson *= lambda / i;
    sum -= poisson * (1 - Math.pow(q / p, z - k));
  }
  return Math.max(0, Math.min(1, sum));
}
EXTRA_DEMOS.attackvectors = {
  html: xdHead('&#128163; Try to reverse a payment', 'You are the attacker. Choose how much of the world\'s hash power you control and how many confirmations your victim waits for. The odds come straight from the formula in the Bitcoin whitepaper.')
    + '<label class="demo-desc" for="avShare" style="display:block;margin:0 0 6px;">Your share of all hash power: <strong id="avShareV" style="color:#f87171;">10%</strong></label>'
    + '<input type="range" id="avShare" min="1" max="60" value="10" style="width:100%;accent-color:#f87171;"/>'
    + '<label class="demo-desc" for="avConf" style="display:block;margin:14px 0 6px;">Confirmations the victim waits for: <strong id="avConfV" style="color:#4ade80;">1</strong></label>'
    + '<input type="range" id="avConf" min="0" max="12" value="1" style="width:100%;accent-color:#4ade80;"/>'
    + '<div class="xd-stats" style="margin-top:16px;"><div class="demo-stat"><div class="demo-stat-val" id="avProb">-</div><div class="demo-stat-label">Chance the reversal succeeds</div></div><div class="demo-stat"><div class="demo-stat-val" id="avOdds">-</div><div class="demo-stat-label">In other words</div></div><div class="demo-stat"><div class="demo-stat-val" id="avCost">-</div><div class="demo-stat-label">Rough cost per hour of trying</div></div></div>'
    + '<div class="xd-meter" aria-hidden="true"><div id="avMeter"></div></div>'
    + '<div id="avMsg" class="demo-desc" aria-live="polite"></div>',
  init: function(){
    const $ = function(i){ return document.getElementById(i); };
    function draw(){
      const q = parseInt($('avShare').value, 10) / 100, z = parseInt($('avConf').value, 10);
      const pr = attackerSuccess(q, z);
      $('avShareV').textContent = Math.round(q * 100) + '%'; $('avConfV').textContent = z;
      $('avProb').textContent = pr >= 0.9995 ? '100%' : (pr >= 0.01 ? (pr * 100).toFixed(1) + '%' : (pr * 100).toPrecision(2) + '%');
      $('avOdds').textContent = pr >= 0.9995 ? 'Certain' : (pr > 0.5 ? 'More likely than not' : '1 in ' + xdFmt(1 / pr));
      const price = (typeof btcPrice !== 'undefined' && btcPrice > 0) ? btcPrice : 100000;
      // The attacker's hash power relative to the honest remainder, priced at what honest miners earn
      $('avCost').textContent = xdUsd(q / (1 - q) * 3.125 * price * 6);
      $('avMeter').style.width = Math.max(0.5, pr * 100) + '%';
      $('avMeter').style.background = pr > 0.5 ? '#f87171' : pr > 0.01 ? '#fbbf24' : '#4ade80';
      let m;
      if(q >= 0.5) m = '<strong style="color:#f87171;">With a majority you eventually win any race.</strong> That is the 51% attack. It still cannot steal coins you do not hold or mint new ones: nodes reject invalid blocks no matter who mines them. All it buys is the power to reverse your own recent payments, at enormous ongoing cost.';
      else if(z === 0) m = 'With zero confirmations there is no work to undo. This is why an unconfirmed payment is only as good as your trust in the sender.';
      else if(pr < 0.001) m = '<strong style="color:#4ade80;">Effectively impossible.</strong> Each extra confirmation multiplies the work you must redo while the honest network keeps pulling ahead.';
      else m = 'Slide the confirmations up and watch the odds collapse. A minority attacker falls further behind with every block.';
      $('avMsg').innerHTML = m;
    }
    $('avShare').addEventListener('input', draw); $('avConf').addEventListener('input', draw);
    draw();
  }
};

// ═══════════════ 4. EXCHANGE RUN ═══════════════
EXTRA_DEMOS.exchanges = {
  html: xdHead('&#127974; Run on the exchange', 'An exchange owes its customers 1,000 BTC. Customers see their full balances on screen. You decide how much the exchange really holds, then start a rumour.')
    + '<label class="demo-desc" for="exRes" style="display:block;margin:0 0 6px;">Coins the exchange actually holds: <strong id="exResV" style="color:var(--orange);">600 BTC (60%)</strong></label>'
    + '<input type="range" id="exRes" min="20" max="100" step="5" value="60" style="width:100%;accent-color:var(--orange);"/>'
    + '<label class="xd-toggle"><input type="checkbox" id="exSelf"/> <span>You already withdrew your 1 BTC to your own wallet</span></label>'
    + '<div class="xd-bar" aria-hidden="true" style="margin-top:14px;"><div class="xd-bar-you" id="exBar" style="background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div></div>'
    + '<div class="xd-row"><div><span class="xd-k">In the vault</span> <strong id="exVault">600</strong> BTC</div><div><span class="xd-k">Still owed</span> <strong id="exOwed">1,000</strong> BTC</div></div>'
    + '<div class="xd-btns"><button type="button" class="demo-btn demo-btn-red" id="exRun">A rumour spreads: 150 BTC of withdrawals</button><button type="button" class="demo-btn demo-btn-ghost" id="exReset">Reset</button></div>'
    + '<div id="exMsg" class="demo-result hidden" aria-live="polite" style="text-align:left;"></div>',
  init: function(){
    const $ = function(i){ return document.getElementById(i); };
    let vault, owed, frozen;
    function reset(){
      vault = parseInt($('exRes').value, 10) * 10; owed = 1000; frozen = false;
      $('exRun').disabled = false; $('exRes').disabled = false; $('exSelf').disabled = false;
      $('exMsg').classList.add('hidden');
      draw();
    }
    function draw(){
      const pct = parseInt($('exRes').value, 10);
      $('exResV').textContent = xdFmt(pct * 10) + ' BTC (' + pct + '%)';
      $('exVault').textContent = xdFmt(vault); $('exOwed').textContent = xdFmt(owed);
      $('exBar').style.width = (vault / 1000 * 100) + '%';
    }
    $('exRes').addEventListener('input', reset);
    $('exReset').addEventListener('click', reset);
    $('exRun').addEventListener('click', function(){
      if(frozen) return;
      $('exRes').disabled = true; $('exSelf').disabled = true;
      const want = Math.min(150, owed);
      const paid = Math.min(want, vault);
      vault -= paid; owed -= paid;
      draw();
      const self = $('exSelf').checked;
      const m = $('exMsg'); m.classList.remove('hidden');
      if(paid < want || (vault === 0 && owed > 0)){
        frozen = true; this.disabled = true;
        m.style.cssText = 'text-align:left;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.4);';
        m.innerHTML = '<strong style="color:#f87171;">Withdrawals halted.</strong> The vault is empty and customers are still owed ' + xdFmt(owed) + ' BTC. Their screens showed full balances until this exact moment. '
          + (self ? '<strong style="color:#4ade80;">Your 1 BTC is untouched</strong>, because it was never in the vault. You held the keys.' : '<strong>Your 1 BTC is now a place in a bankruptcy queue.</strong> Tick the box above and run it again.');
      } else if(owed === 0){
        frozen = true; this.disabled = true;
        m.style.cssText = 'text-align:left;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.35);';
        m.innerHTML = '<strong style="color:#4ade80;">Everyone was paid in full.</strong> An exchange holding 100% of what it owes survives any run. From the outside you could not have told this one apart from the others, which is the whole problem.';
      } else {
        m.style.cssText = 'text-align:left;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.35);';
        m.innerHTML = 'Paid out ' + xdFmt(paid) + ' BTC. Everything looks normal. ' + xdFmt(vault) + ' BTC left in the vault against ' + xdFmt(owed) + ' BTC still owed. Keep going.';
      }
    });
    reset();
  }
};

// ═══════════════ 5. GOLD VS BITCOIN SCORECARD ═══════════════
EXTRA_DEMOS.goldvsbtc = {
  html: xdHead('&#129351; Score the two monies', 'Seven properties decide how good a money is. For each one, pick the winner before you see the reasoning. One of them is closer than fans of either side admit.')
    + '<div id="gbRows"></div><div id="gbScore" class="demo-result hidden" aria-live="polite" style="text-align:left;"></div>',
  init: function(){
    const ROWS = [
      {p:'Scarcity', w:'btc', why:'Gold\'s supply grows about 1.5 to 2% a year and mining speeds up when the price rises. Bitcoin\'s supply is fixed at 21 million and no price can change it.'},
      {p:'Track record', w:'gold', why:'Gold has held value for five thousand years across every empire. Bitcoin has under twenty years. Nothing but time can close this gap.'},
      {p:'Divisibility', w:'btc', why:'Shaving a gold coin is slow and lossy. A bitcoin divides into 100 million units with no loss and no tools.'},
      {p:'Portability', w:'btc', why:'A billion dollars of gold weighs several tonnes and needs armed transport. A billion dollars of bitcoin crosses the world in minutes and can be carried as twelve memorised words.'},
      {p:'Verifiability', w:'btc', why:'Testing gold properly means assays or melting, and tungsten-filled bars have fooled professionals. Any node verifies a bitcoin payment in milliseconds.'},
      {p:'Price stability today', w:'gold', why:'Gold moves a few percent in a bad month. Bitcoin has fallen more than 75% four times. Bitcoin is far more volatile, and anyone who tells you otherwise is selling something.'},
      {p:'Resistance to seizure', w:'btc', why:'In 1933 the US ordered citizens to hand over their gold, and vaults made that enforceable. Properly held bitcoin cannot be taken without the keys.'}
    ];
    const box = document.getElementById('gbRows');
    let answered = 0, right = 0;
    ROWS.forEach(function(r, i){
      const row = document.createElement('div');
      row.className = 'xd-rank';
      row.innerHTML = '<div class="xd-rank-p">' + r.p + '</div><div class="xd-rank-b"><button type="button" class="demo-btn demo-btn-ghost" data-w="gold">Gold</button><button type="button" class="demo-btn demo-btn-ghost" data-w="btc">Bitcoin</button></div><div class="xd-rank-why hidden"></div>';
      row.addEventListener('click', function(e){
        const b = e.target.closest('button');
        if(!b || row.dataset.done) return;
        row.dataset.done = '1'; answered++;
        const ok = b.dataset.w === r.w; if(ok) right++;
        row.querySelectorAll('button').forEach(function(x){
          x.disabled = true;
          if(x.dataset.w === r.w){ x.style.borderColor = '#4ade80'; x.style.color = '#4ade80'; }
          else if(x === b){ x.style.borderColor = '#f87171'; x.style.color = '#f87171'; }
        });
        const w = row.querySelector('.xd-rank-why');
        w.classList.remove('hidden');
        w.innerHTML = '<strong style="color:' + (r.w === 'btc' ? 'var(--orange)' : '#fbbf24') + ';">' + (r.w === 'btc' ? 'Bitcoin' : 'Gold') + '.</strong> ' + r.why;
        if(answered === ROWS.length){
          const s = document.getElementById('gbScore'); s.classList.remove('hidden');
          s.style.cssText = 'text-align:left;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.35);';
          s.innerHTML = '<strong style="color:var(--orange);">You called ' + right + ' of 7.</strong> Final tally: Bitcoin 5, gold 2. Bitcoin is the better-engineered money. Gold is the proven one. Bitcoin\'s remaining job is to earn the track record, one block at a time.';
        }
      });
      box.appendChild(row);
    });
  }
};

// ═══════════════ 6. BLOCK HEADER EDITOR ═══════════════
function xdMerkle(txs){
  let layer = txs.map(function(t){ return sha256Hex(t); });
  if(!layer.length) return sha256Hex('');
  while(layer.length > 1){
    if(layer.length % 2) layer.push(layer[layer.length - 1]);
    const next = [];
    for(let i = 0; i < layer.length; i += 2) next.push(sha256Hex(layer[i] + layer[i + 1]));
    layer = next;
  }
  return layer[0];
}
EXTRA_DEMOS.blocks = {
  html: xdHead('&#128230; Edit a block header', 'This block is already mined: its hash starts with three zeros. Change anything, even one letter of one transaction, and watch the proof of work die. Every hash below is real SHA-256.')
    + xdStep(1, 'The transactions (not in the header)', '<div id="bhTxs"></div><p class="demo-desc">These are squeezed into a single fingerprint, the merkle root.</p>')
    + xdStep(2, 'The six header fields',
        '<div class="xd-fields">'
      + '<div class="xd-field"><span>Version</span><code>0x20000000</code></div>'
      + '<div class="xd-field"><span>Previous block hash</span><code id="bhPrev"></code></div>'
      + '<div class="xd-field"><span>Merkle root</span><code id="bhRoot"></code></div>'
      + '<div class="xd-field"><span>Timestamp</span><input type="number" class="demo-input" id="bhTime" aria-label="Timestamp"/></div>'
      + '<div class="xd-field"><span>Target</span><code>hash must start with 000</code></div>'
      + '<div class="xd-field"><span>Nonce</span><input type="number" class="demo-input" id="bhNonce" aria-label="Nonce"/></div>'
      + '</div>')
    + '<div class="xd-hash" id="bhHashBox" aria-live="polite"><div class="demo-desc" style="margin:0 0 4px;">Block hash</div><code id="bhHash"></code><div id="bhStatus" style="margin-top:8px;font-weight:700;"></div></div>'
    + '<div class="xd-btns"><button type="button" class="demo-btn demo-btn-orange" id="bhMine">&#9935; Re-mine the block</button></div>'
    + '<p class="demo-desc">Real Bitcoin hashes the 80-byte binary header twice. Here the same six fields are hashed once as text so you can read them. The behaviour is identical.</p>'
    + '<div style="margin-top:18px;"><div class="demo-step-label" style="margin-bottom:10px;">Field guide: tap a part to see what it is for</div><div class="space-y-2" id="blockAnatomy"></div></div>',
  init: function(){
    const $ = function(i){ return document.getElementById(i); };
    const prev = '00000000000000000001a7c2' + sha256Hex('previous block').slice(24);
    const txs = ['Coinbase: 3.125 BTC to the miner', 'Alice pays Bob 0.5 BTC', 'Carol pays Dan 1.2 BTC', 'Erin pays Frank 0.03 BTC'];
    let time = 1794000000, nonce = 0;
    function header(n){ return ['0x20000000', prev, xdMerkle(txs), time, '000', n].join('|'); }
    function mine(){ let n = 0; while(!sha256Hex(header(n)).startsWith('000')) n++; return n; }
    nonce = mine();
    $('bhPrev').textContent = prev.slice(0, 28) + '...';
    $('bhTime').value = time; $('bhNonce').value = nonce;
    const txBox = $('bhTxs');
    txs.forEach(function(t, i){
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'demo-input'; inp.value = t; inp.style.marginBottom = '8px';
      inp.setAttribute('aria-label', 'Transaction ' + (i + 1));
      inp.addEventListener('input', function(){ txs[i] = inp.value; draw(true); });
      txBox.appendChild(inp);
    });
    function draw(flashRoot){
      const root = xdMerkle(txs);
      $('bhRoot').textContent = root.slice(0, 28) + '...';
      if(flashRoot){ $('bhRoot').classList.remove('xd-flash'); void $('bhRoot').offsetWidth; $('bhRoot').classList.add('xd-flash'); }
      const h = sha256Hex(header(nonce));
      const ok = h.startsWith('000');
      $('bhHash').innerHTML = '<span style="color:' + (ok ? '#4ade80' : '#f87171') + ';">' + h.slice(0, 3) + '</span>' + h.slice(3);
      $('bhStatus').innerHTML = ok ? '<span style="color:#4ade80;">&#10003; Valid proof of work</span>' : '<span style="color:#f87171;">&#10007; Invalid. The hash no longer starts with 000, so every node rejects this block.</span>';
      $('bhHashBox').style.borderColor = ok ? 'rgba(74,222,128,0.45)' : 'rgba(248,113,113,0.5)';
    }
    $('bhTime').addEventListener('input', function(){ time = parseInt(this.value, 10) || 0; draw(false); });
    $('bhNonce').addEventListener('input', function(){ nonce = parseInt(this.value, 10) || 0; draw(false); });
    $('bhMine').addEventListener('click', function(){
      nonce = mine(); $('bhNonce').value = nonce; draw(false);
      $('bhStatus').innerHTML += '<div class="demo-desc" style="font-weight:400;">Found nonce ' + xdFmt(nonce) + ' after ' + xdFmt(nonce + 1) + ' attempts. On the real network that search costs millions of dollars of electricity, and every later block would need redoing as well.</div>';
    });
    draw(false);
  }
};

// ═══════════════ 7. 2-OF-3 MULTISIG VAULT ═══════════════
EXTRA_DEMOS.locks = {
  html: '<div style="margin-top:22px;padding-top:20px;border-top:1px solid var(--glass-border);">'
    + xdHead('&#128273; Build a 2-of-3 vault', 'A lock can demand more than one key. This vault opens with any two of three keys kept in different places. Break things and see who can still spend.')
    + '<div class="xd-btns" style="margin-bottom:12px;"><button type="button" class="demo-btn demo-btn-ghost" data-ms="fire">House fire</button><button type="button" class="demo-btn demo-btn-ghost" data-ms="thief">Phone stolen</button><button type="button" class="demo-btn demo-btn-ghost" data-ms="both">Fire and theft</button><button type="button" class="demo-btn demo-btn-ghost" data-ms="reset">Reset</button></div>'
    + '<div id="msKeys" class="xd-keys"></div>'
    + '<div class="xd-two"><div class="xd-card"><div class="xd-card-h" style="color:var(--orange);">2-of-3 vault</div><div id="msMulti" class="demo-desc" aria-live="polite"></div></div><div class="xd-card"><div class="xd-card-h" style="color:var(--muted);">Ordinary single-key wallet (phone only)</div><div id="msSingle" class="demo-desc" aria-live="polite"></div></div></div>'
    + '</div>',
  init: function(){
    const KEYS = [{n:'Phone', where:'in your pocket'}, {n:'Hardware wallet', where:'at home'}, {n:'Paper backup', where:'in a bank box'}];
    const STATES = ['safe', 'lost', 'stolen'];
    const LABEL = {safe:'&#128994; You have it', lost:'&#9899; Lost', stolen:'&#128308; Thief has it'};
    let st = ['safe', 'safe', 'safe'];
    const box = document.getElementById('msKeys');
    function draw(){
      box.innerHTML = '';
      KEYS.forEach(function(k, i){
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'xd-key xd-key-' + st[i];
        b.innerHTML = '<strong>' + k.n + '</strong><span>' + k.where + '</span><em>' + LABEL[st[i]] + '</em>';
        b.setAttribute('aria-label', k.n + ': ' + st[i] + '. Tap to change.');
        b.addEventListener('click', function(){ st[i] = STATES[(STATES.indexOf(st[i]) + 1) % 3]; draw(); });
        box.appendChild(b);
      });
      const mine = st.filter(function(x){ return x === 'safe'; }).length;
      const theirs = st.filter(function(x){ return x === 'stolen'; }).length;
      let m;
      if(theirs >= 2) m = '<strong style="color:#f87171;">Thief can spend.</strong> Two keys in the wrong hands opens the vault. This is why the three keys live in three different places.';
      else if(mine >= 2) m = '<strong style="color:#4ade80;">You can spend. The thief cannot.</strong> ' + (theirs === 1 ? 'One stolen key is useless alone. Move the coins to a fresh vault at your leisure.' : (mine === 2 ? 'One key is gone and nothing is lost. Replace it when convenient.' : 'All three keys are where they should be.'));
      else m = '<strong style="color:#fbbf24;">Nobody can spend.</strong> You hold only one key and no thief holds two. The coins are stuck, but not stolen.';
      document.getElementById('msMulti').innerHTML = m;
      const s = st[0];
      document.getElementById('msSingle').innerHTML = s === 'safe' ? '<strong style="color:#4ade80;">Fine, for now.</strong> Everything rests on one device.' : s === 'lost' ? '<strong style="color:#f87171;">Coins gone forever.</strong> One loss was enough.' : '<strong style="color:#f87171;">Coins stolen.</strong> One theft was enough.';
    }
    document.querySelectorAll('[data-ms]').forEach(function(b){
      b.addEventListener('click', function(){
        const k = b.dataset.ms;
        st = k === 'fire' ? ['safe','lost','safe'] : k === 'thief' ? ['stolen','safe','safe'] : k === 'both' ? ['stolen','lost','safe'] : ['safe','safe','safe'];
        draw();
      });
    });
    draw();
  }
};

// ── Register with the app's demo system ──
(function(){
  const baseContent = getModalContent;
  const baseInit = { blocks: modalInitFns.blocks, locks: modalInitFns.locks };
  getModalContent = function(section){
    const x = EXTRA_DEMOS[section];
    if(!x) return baseContent(section);
    // The vault extends the original lock-and-key demo instead of replacing it
    if(section === 'locks'){
      const base = baseContent('locks');
      const cut = base.lastIndexOf('<div class="demo-step" id="quickCheck"');
      return cut >= 0 ? base.slice(0, cut) + x.html + base.slice(cut) : base + x.html;
    }
    return x.html + quickCheckHTML(section);
  };
  Object.keys(EXTRA_DEMOS).forEach(function(k){
    const init = EXTRA_DEMOS[k].init;
    if(k === 'locks'){ modalInitFns.locks = function(){ baseInit.locks(); init(); }; }
    else if(k === 'blocks'){ modalInitFns.blocks = function(){ init(); if(baseInit.blocks) baseInit.blocks(); }; }
    else modalInitFns[k] = init;
  });
})();
