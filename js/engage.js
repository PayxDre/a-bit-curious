// ═══════════════════════════════════════════════════════════════
//   ENGAGE: inline guided labs, predictions, journey, progress
//   Loads after app.js and uses its globals (sectionOrder, showSection,
//   getModalContent, modalInitFns, quickChecks, _timers, currentSection).
// ═══════════════════════════════════════════════════════════════
'use strict';

// ── Persistent state ──
const ENGAGE_KEY = 'abc_engage_v1';
const engage = (function(){
  let s = {};
  try { s = JSON.parse(localStorage.getItem(ENGAGE_KEY) || '{}') || {}; } catch(e){ s = {}; }
  s.done = s.done || {};        // demo id -> true once the mission is complete
  s.pred = s.pred || {};        // demo id -> index of the option the learner predicted
  s.journey = s.journey || {};  // artifacts carried between the chapter V/VI labs
  s.depth = s.depth || 'core';  // 'core' hides go-deeper blocks, 'deep' shows everything
  return s;
})();
function engageSave(){
  try { localStorage.setItem(ENGAGE_KEY, JSON.stringify(engage)); } catch(e){}
}

// ── Lab definitions: one prediction + one takeaway per demo ──
// a = index of the correct option. `why` is shown once the learner has experimented.
const LABS = {
  money: {title:'See inflation eat a mattress', q:'You hide $10,000 under a mattress for 30 years while prices rise 3% a year. What can it buy at the end?', opts:['About the same as today','About $7,000 worth','About $4,100 worth'], a:2, why:'Inflation compounds. Three percent a year sounds harmless, yet it removes more than half of your purchasing power over a working lifetime. Money that can be printed leaks value while you sleep.'},
  inflation: {title:'Find your real inflation rate', q:'If prices really rise 7% a year instead of the official 3%, how long until your money buys half as much?', opts:['About 10 years','About 23 years','About 35 years'], a:0, why:'Divide 72 by the inflation rate to get the halving time. At 3% your savings halve in 24 years. At 7% it takes about 10. A few points of hidden inflation changes your whole life plan.'},
  deflation: {title:'Play tug of war with prices', q:'Technology makes a product 5% cheaper to produce every year, while the money supply grows 7% a year. What happens to its price?', opts:['It falls 5% a year','It stays flat','It rises about 2% a year'], a:2, why:'Prices are a tug of war between falling costs and a growing money supply. The printing wins, so the gains technology should have handed you never reach the price tag.'},
  fiatgraveyard: {title:'Run a currency into the ground', q:'Across the hundreds of paper currencies ever issued, roughly how long did the average one last?', opts:['About 27 years','About 100 years','About 250 years'], a:0, why:'Every paper currency follows the same arc: a promise, a temptation to print, then a slide. The dollar is old for a paper currency, not immune.'},
  pizza: {title:'Slice a bitcoin', q:'One bitcoin can be divided into how many of its smallest unit, the satoshi?', opts:['1,000','1 million','100 million'], a:2, why:'You never need to buy a whole coin. A fixed supply can serve the whole world because each coin divides into 100 million satoshis, and you can hold as few as you like.'},
  digimoney: {title:'Walk the road to Bitcoin', q:'DigiCash, e-gold and the other digital monies before Bitcoin all died. What did they have in common?', opts:['Their cryptography was broken','Nobody wanted digital money','Each depended on one company or server that could be shut down'], a:2, why:'Every earlier attempt had a centre: a company, a server, a founder. Remove the centre and there is nothing to shut down. That single design choice is what Bitcoin changed.'},
  satoshi: {title:'Profile the creator', q:'Roughly 1.1 million bitcoin are believed to belong to Satoshi. What has happened to them?', opts:['They were sold in the 2013 rally','They have never moved','They were donated to developers'], a:1, why:'The creator walked away from one of the largest fortunes on Earth and has never touched it. Bitcoin has no founder to pressure, subpoena or bribe.'},
  whitepaper: {title:'Match the whitepaper', q:'How long is the document that launched Bitcoin?', opts:['9 pages','90 pages','900 pages'], a:0, why:'Nine pages. Almost every idea in it already existed. The breakthrough was the arrangement: incentives that make honest behaviour the profitable choice.'},
  altcoins: {title:'Put the alternatives to the test', q:'Which of these has Bitcoin never had?', opts:['A public ledger','A stash of coins set aside for insiders before launch','Open-source code'], a:1, why:'Most other coins launched with a team, a treasury and coins reserved for insiders. Whoever holds those can change the rules. Bitcoin has no such party.'},
  myths: {title:'Bust the myths', q:'What share of cryptocurrency transaction volume is linked to illicit activity?', opts:['Less than 1%','About 25%','More than half'], a:0, why:'Most Bitcoin myths were true of a headline once and false of the data since. Checking the number yourself is the habit this course is trying to build.'},
  tulips: {title:'Tulip or Bitcoin?', q:'Dutch tulip mania is the classic bubble. How long did it last before collapsing for good?', opts:['About 3 years','About 17 years','About 50 years'], a:0, why:'A bubble pops once and stays popped. Bitcoin has fallen more than 75% four times and gone on to a new high each time. Whatever it is, it does not behave like tulips.'},
  caseagainst: {title:'Weigh the case against', q:'How many times has the price of bitcoin fallen more than 75% from a peak?', opts:['Never','Once','Four times'], a:2, why:'The strongest criticisms are real and you should be able to state them. Understanding the risks is what lets you size a position you can actually hold through a crash.'},
  network: {title:'Try to spend the same coin twice', q:'You broadcast the same coin to two different shops at the same instant. What happens?', opts:['Both payments go through','Whichever one gets mined first wins and the other is dropped','Both are cancelled and the coin is frozen'], a:1, why:'There is no referee. Nodes relay what they hear first, and the next block settles which version becomes history. That is why a merchant waits for a confirmation.'},
  node: {title:'Be the referee', q:'A miner with enormous hash power sends your node a block that pays itself double the allowed reward. What does your node do?', opts:['Accepts it, because miners set the rules','Rejects it','Waits for other nodes to vote'], a:1, why:'Miners propose blocks. Nodes decide whether they are valid. Hash power cannot buy an exception to the rules, because every node checks every block alone.'},
  mining: {title:'Mine a block yourself', q:'You change a single letter of the text fed into SHA-256. How much of the hash changes?', opts:['Just one character','About half of it, with no pattern','Nothing, until a whole word changes'], a:1, why:'A hash cannot be steered, so the only way to find one that starts with zeros is to guess. Finding it costs real work. Checking it costs one hash. That asymmetry is proof of work.'},
  blockchain: {title:'Tamper with history', q:'You secretly edit one transaction in block 2 of a five-block chain. Which blocks become invalid?', opts:['Only block 2','Blocks 2, 3, 4 and 5','All five'], a:1, why:'Each block contains the hash of the one before it. Change anything and every later block stops matching, so rewriting history means redoing all the work since, faster than everyone else combined.'},
  blocks: {title:'Edit a block header', q:'A block can hold thousands of transactions. How big is the part miners actually hash?', opts:['80 bytes','About 1 megabyte','The whole block, up to 4 megabytes'], a:0, why:'Six fields, eighty bytes. The merkle root stands in for every transaction, so a tiny header commits to the entire block and to all history before it.'},
  difficulty: {title:'Break the network, watch it heal', q:'Half the world\'s miners switch off overnight. What happens to block times?', opts:['Nothing, blocks keep arriving every 10 minutes','They slow to about 20 minutes, then return to 10 after the next adjustment','The network halts until the miners return'], a:1, why:'No committee sets the pace. Every 2,016 blocks the protocol measures how long they took and retunes the puzzle, so Bitcoin keeps time no matter who joins or leaves.'},
  transactions: {title:'Build a transaction', q:'You spend a 0.5 BTC coin to pay someone 0.3 BTC, and forget to add a change output. What happens to the other 0.2?', opts:['It stays in your wallet','The miner keeps it as the fee','It bounces back automatically'], a:1, why:'A transaction spends whole coins. Whatever the outputs do not claim becomes the fee. Wallets handle this for you, but now you know what they are doing.'},
  outputs: {title:'Pay with coins, not a balance', q:'Your wallet holds two coins: 0.5 and 0.2 BTC. You pay 0.3. What does the wallet really do?', opts:['Subtracts 0.3 from your balance','Spends the whole 0.5 coin and sends 0.2 back to you as change','Shaves 0.3 off the 0.5 coin and keeps the rest in place'], a:1, why:'There is no balance on the blockchain, only unspent coins. Your wallet adds them up for display, then melts whole coins down and mints new ones every time you pay.'},
  locks: {title:'Build a 2-of-3 vault', q:'A wallet needs any 2 of 3 keys to spend. You lose one key in a fire. Are the coins gone?', opts:['Yes, all three are needed to recover','No, the two remaining keys still spend','Only if it was the first key'], a:1, why:'A lock is a small program, not just one key. Multisig removes the single point of failure: one lost key is survivable and one stolen key is useless.'},
  keys: {title:'Run the seed phrase experiment', q:'You change one word of a 12-word seed phrase. What do you get?', opts:['The same wallet with a slightly different address','A completely different wallet','An error, because seeds have a fixed order'], a:1, why:'The words are the wallet. Every key and address is computed from them, so the same words always rebuild the same wallet and any other words build a different one.'},
  privatekeys: {title:'Make a key from pure randomness', q:'How many possible Bitcoin private keys are there?', opts:['About a trillion','About as many as grains of sand on Earth','Roughly as many as atoms in the visible universe'], a:2, why:'A private key is just a very large random number. Nobody guards the key space. It is safe only because it is too vast to search, which is why real randomness matters so much.'},
  publickeys: {title:'Go one way only', q:'Someone knows your public key. Can they work out your private key?', opts:['Yes, with a fast enough computer','No, the maths only runs in one direction','Only after you have spent from it'], a:1, why:'Multiplying on the curve is easy. Undoing it would take longer than the age of the universe. That one-way street is what lets you publish an address without risk.'},
  signatures: {title:'Sign it, then forge it', q:'You sign a message, then change one character of the message. Does the old signature still verify?', opts:['Yes','No','On some nodes but not others'], a:1, why:'A signature covers the exact message. It proves the key holder approved precisely this, without ever revealing the key. Change anything and it fails everywhere.'},
  consensus: {title:'Upgrade without a boss', q:'In 2017 Bitcoin gained a major upgrade, SegWit, without forcing anyone to update. How?', opts:['A soft fork: old nodes still see the new blocks as valid','Exchanges held a vote','Developers pushed an automatic update'], a:0, why:'Nobody can push an update to your node. Changes that tighten the rules stay compatible with old software, so upgrades spread only as fast as users choose to adopt them.'},
  perspective: {title:'Simulate a hard-money future', q:'Under a money with a fixed supply, as the economy grows more productive, prices would tend to...', opts:['Rise','Stay flat','Fall'], a:2, why:'If money cannot be diluted, productivity gains show up as lower prices. Saving is rewarded instead of punished. That is the change this whole course has been building toward.'},
  lightning: {title:'Open a payment channel', q:'You buy 50 coffees through one Lightning channel. How many transactions end up on the blockchain?', opts:['50','2','None'], a:1, why:'Only the open and the close touch the blockchain. Everything between is two parties re-signing who owns what. The base layer stays small and secure while payments become instant.'},
  powvpos: {title:'Take the new-node test', q:'A brand-new node is offered two competing histories. Under proof of work, how does it pick the real one without trusting anybody?', opts:['It asks a well-known server','It follows the chain with the most accumulated work','It follows the chain with the most signatures'], a:1, why:'Work is the one kind of evidence that cannot be faked after the fact. A node can weigh two histories alone, with no trusted party, because forging the heavier one means actually spending the energy.'},
  attackvectors: {title:'Play the attacker', q:'An attacker controls 10% of all hash power. You wait for 6 confirmations. What are the odds they can reverse your payment?', opts:['About 1 in 4','About 1 in 100','About 1 in 4,000'], a:2, why:'A minority attacker is in a race they lose a little more with every block. Confirmations are not bureaucracy. Each one is another layer of work an attacker would have to redo.'},
  exchanges: {title:'Start a run on the exchange', q:'An exchange shows every customer a full balance but holds only 60% of the coins. When does anybody find out?', opts:['Straight away, balances are checked against the blockchain','Only when enough customers try to withdraw at once','Never, the exchange can always buy more'], a:1, why:'A balance on an exchange is a promise. It looks identical whether the coins are there or not, right up to the moment withdrawals stop. Coins you hold the keys to are not in that queue.'},
  goldvsbtc: {title:'Score gold against bitcoin', q:'Gold\'s supply grows every year as more is mined. By roughly how much?', opts:['It does not grow at all','About 1.5 to 2% a year','About 10% a year'], a:1, why:'Gold earned its place by being hard to make more of. Bitcoin takes the same idea to its limit, and adds the things gold cannot do. What gold still has is five thousand years of proof.'},
  lore: {title:'Test your Bitcoin history', q:null, why:'You now know the folklore as well as the mechanics.'}
};

// ── Lab rendering ──
let mountedLab = null;

function labStepRail(hasPredict, hasCheck){
  const steps = [];
  if(hasPredict) steps.push(['predict','Predict']);
  steps.push(['try','Experiment']);
  steps.push(['why','What you saw']);
  if(hasCheck) steps.push(['check','Check']);
  return '<ol class="lab-rail" aria-label="Lab steps">' + steps.map(function(s, i){
    return '<li class="lab-rail-step" data-step="' + s[0] + '"><span class="lab-rail-num">' + (i + 1) + '</span><span>' + s[1] + '</span></li>';
  }).join('') + '</ol>';
}

function setRail(host, active, doneList){
  host.querySelectorAll('.lab-rail-step').forEach(function(li){
    li.classList.toggle('active', li.dataset.step === active);
    li.classList.toggle('done', doneList.indexOf(li.dataset.step) >= 0);
  });
}

function unmountLab(){
  if(!mountedLab) return;
  if(_timers.mining){ clearInterval(_timers.mining); _timers.mining = null; }
  if(_timers.remine){ clearInterval(_timers.remine); _timers.remine = null; }
  mountedLab.innerHTML = '';
  delete mountedLab.dataset.mounted;
  mountedLab = null;
}

function mountLab(sectionId){
  const sec = document.getElementById('sec-' + sectionId);
  const host = sec && sec.querySelector('.inline-demo');
  if(mountedLab && mountedLab !== host) unmountLab();
  if(!host || host.dataset.mounted) return;
  const id = host.dataset.demo;
  const lab = LABS[id] || {};
  const hasPredict = !!lab.q;
  const alreadyDone = !!engage.done[id];
  const hasCheck = (typeof quickChecks !== 'undefined' && !!quickChecks[id]) || (typeof EXTRA_CHECKS !== 'undefined' && !!EXTRA_CHECKS[id]);

  host.dataset.mounted = '1';
  mountedLab = host;
  host.innerHTML =
    '<section class="lab" aria-label="Interactive lab: ' + (lab.title || id) + '">'
    + '<div class="lab-head"><span class="lab-tag">&#129514; Hands-on lab</span>'
    + '<span class="lab-title">' + (lab.title || '') + '</span>'
    + (alreadyDone ? '<span class="lab-badge" title="Mission complete">&#10003; Complete</span>' : '') + '</div>'
    + labStepRail(hasPredict, hasCheck)
    + (hasPredict ? '<div class="lab-predict"></div>' : '')
    + '<div class="lab-body' + (hasPredict && engage.pred[id] === undefined ? ' locked' : '') + '"></div>'
    + '<div class="lab-why hidden" aria-live="polite"></div>'
    + '<div class="lab-check"></div>'
    + '</section>';

  const body = host.querySelector('.lab-body');
  body.innerHTML = getModalContent(id);
  // The quick check is the last step, so lift it out of the experiment area
  const qc = body.querySelector('#quickCheck');
  if(qc) host.querySelector('.lab-check').appendChild(qc);
  host.querySelector('.lab-check').classList.add('hidden');

  if(hasPredict) renderPredict(host, id);
  const fn = modalInitFns[id];
  if(fn){ try { fn(); } catch(e){ console.warn('lab init failed:', id, e); } }
  if(typeof journeyApply === 'function') journeyApply(id, host);

  const progressed = { predicted: !hasPredict || engage.pred[id] !== undefined, tried: false };
  setRail(host, progressed.predicted ? 'try' : 'predict', progressed.predicted && hasPredict ? ['predict'] : []);

  function onFirstUse(){
    if(progressed.tried || body.classList.contains('locked')) return;
    progressed.tried = true;
    // Give the learner a moment with the result before explaining it
    setTimeout(function(){ revealWhy(host, id, hasCheck); }, 1200);
  }
  body.addEventListener('click', onFirstUse);
  body.addEventListener('input', onFirstUse);
  body.addEventListener('pointerdown', onFirstUse);
}

function renderPredict(host, id){
  const lab = LABS[id];
  const box = host.querySelector('.lab-predict');
  const chosen = engage.pred[id];
  if(chosen !== undefined){
    box.innerHTML = '<div class="lab-predict-done">Your prediction: <strong>' + lab.opts[chosen] + '</strong></div>';
    return;
  }
  box.innerHTML = '<div class="lab-predict-q"><span class="lab-predict-label">Before you touch anything, predict:</span>' + lab.q + '</div>'
    + '<div class="lab-predict-opts">' + lab.opts.map(function(o, i){
        return '<button type="button" class="lab-opt" data-i="' + i + '">' + o + '</button>';
      }).join('') + '</div>'
    + '<button type="button" class="lab-skip">Skip the prediction</button>';
  box.addEventListener('click', function(e){
    const opt = e.target.closest('.lab-opt');
    const skip = e.target.closest('.lab-skip');
    if(!opt && !skip) return;
    engage.pred[id] = opt ? parseInt(opt.dataset.i, 10) : -1;
    engageSave();
    host.querySelector('.lab-body').classList.remove('locked');
    box.innerHTML = opt
      ? '<div class="lab-predict-done">Locked in: <strong>' + lab.opts[engage.pred[id]] + '</strong>. Now find out.</div>'
      : '<div class="lab-predict-done">No prediction this time. Go ahead and experiment.</div>';
    setRail(host, 'try', ['predict']);
  });
}

function revealWhy(host, id, hasCheck){
  if(!host.dataset.mounted) return;
  const lab = LABS[id] || {};
  const why = host.querySelector('.lab-why');
  const chosen = engage.pred[id];
  let verdict = '';
  if(lab.q && chosen !== undefined && chosen >= 0){
    verdict = chosen === lab.a
      ? '<div class="lab-verdict ok">&#10003; Your prediction was right: ' + lab.opts[lab.a] + '.</div>'
      : '<div class="lab-verdict no">Your prediction: ' + lab.opts[chosen] + '. What actually happens: <strong>' + lab.opts[lab.a] + '</strong>.</div>';
  } else if(lab.q){
    verdict = '<div class="lab-verdict">The answer: <strong>' + lab.opts[lab.a] + '</strong>.</div>';
  }
  why.innerHTML = '<div class="lab-why-label">What you just saw</div>' + verdict + '<p>' + (lab.why || '') + '</p>';
  why.classList.remove('hidden');
  const check = host.querySelector('.lab-check');
  if(hasCheck){
    check.classList.remove('hidden');
    setRail(host, 'check', ['predict','try','why']);
  } else {
    setRail(host, 'why', ['predict','try','why']);
    completeLab(host, id);
  }
}

function completeLab(host, id){
  const first = !engage.done[id];
  engage.done[id] = true;
  engageSave();
  if(host && !host.querySelector('.lab-badge')){
    const b = document.createElement('span');
    b.className = 'lab-badge'; b.innerHTML = '&#10003; Complete';
    host.querySelector('.lab-head').appendChild(b);
  }
  if(host) setRail(host, '', ['predict','try','why','check']);
  if(first && typeof onLabComplete === 'function') onLabComplete(id);
}

// Quick check answers inside an inline lab (the modal has its own handler in app.js)
document.addEventListener('click', function(e){
  const btn = e.target.closest('.inline-demo .qc-opt');
  if(!btn || btn.disabled) return;
  const box = btn.closest('#quickCheck');
  const ok = btn.dataset.ok === '1';
  box.querySelectorAll('.qc-opt').forEach(function(b){
    b.disabled = true; b.style.cursor = 'default';
    if(b.dataset.ok === '1'){ b.style.borderColor = '#4ade80'; b.style.color = '#4ade80'; b.style.background = 'rgba(74,222,128,0.08)'; }
  });
  if(!ok){ btn.style.borderColor = '#f87171'; btn.style.color = '#f87171'; btn.style.background = 'rgba(248,113,113,0.08)'; }
  const ex = box.querySelector('.qc-explain');
  ex.classList.remove('hidden');
  ex.style.background = ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)';
  ex.style.border = '1px solid ' + (ok ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)');
  ex.innerHTML = (ok ? '<strong style="color:#4ade80;">Correct.</strong> ' : '<strong style="color:#f87171;">Not quite.</strong> ') + box.dataset.why;
  const host = btn.closest('.inline-demo');
  completeLab(host, host.dataset.demo);
});

// ── Mount the lab whenever its lesson becomes the visible one ──
function mountWhenVisible(id){
  let tries = 0;
  (function wait(){
    const sec = document.getElementById('sec-' + id);
    if(currentSection === id && sec && sec.classList.contains('active')){
      mountLab(id);
      if(typeof onSectionShown === 'function') onSectionShown(id);
      return;
    }
    if(++tries < 120) setTimeout(wait, 50);
  })();
}
(function(){
  const original = showSection;
  window.showSection = showSection = function(id){
    const before = currentSection;
    const blocked = isTransitioning; // app.js ignores navigation mid-transition
    original(id);
    if(blocked) return;
    if(id !== before) unmountLab();
    mountWhenVisible(id);
  };
  mountWhenVisible(currentSection);
})();
