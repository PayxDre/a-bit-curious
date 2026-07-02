#!/usr/bin/env python3
"""Generate static SEO landing pages for every lesson, plus sitemap.xml.

Reads sectionOrder and sectionNames straight from index.html so the pages
can never drift from the real course. Each page is a small self-contained
landing with unique copy and a link into the app at /#<slug>.

Run from the repo root:  python3 scripts/gen-seo-pages.py
"""
import os
import re
import sys

SITE = 'https://www.a-bit-curious.com'

DESCRIPTIONS = {
    'welcome': 'Start the free interactive Bitcoin course: 5,000 years of monetary history, real cryptography demos, and zero fluff.',
    'money': 'What is money, really? The six properties of sound money, why gold won for 5,000 years, and the test every currency must pass.',
    'inflation': 'Why your money buys less every year: money supply growth, the hidden tax of inflation, and what official CPI leaves out.',
    'faithcredit': 'What actually backs the US dollar? National debt, interest costs, and what "full faith and credit" means for your savings.',
    'year1971': 'In 1971 the dollar lost its last link to gold. See what happened to wages, housing, and the wealth gap ever since.',
    'deflation': 'Technology makes things cheaper. Money printing fights it. Understand the tug of war that decides what your savings buy.',
    'fiatgraveyard': 'Every purely faith-based currency in history has failed or been debased. Walk the graveyard, from imperial China to Venezuela.',
    'pizza': 'Two pizzas for 10,000 BTC: the first real Bitcoin purchase and what it teaches about divisibility and dilution.',
    'digimoney': 'DigiCash, Hashcash, b-money, Bit Gold: the failed digital monies before Bitcoin and the lesson each one taught.',
    'satoshi': 'Who is Satoshi Nakamoto, why they vanished, and why Bitcoin is stronger because its creator cannot be found.',
    'whitepaper': 'The nine pages that started it all: a guided tour of the Bitcoin whitepaper in plain English.',
    'altcoins': 'Bitcoin vs everything else: founder stakes, supply changes, outages, and the one decentralization test most coins fail.',
    'powvpos': 'Proof of work vs proof of stake, explained honestly: what each secures, what each costs, and why Bitcoin chose work.',
    'myths': 'The classic Bitcoin myths - crime, energy, bans, no intrinsic value - examined against the actual data.',
    'tulips': 'Is Bitcoin a tulip mania? Compare the 1637 bubble with 17 years of Bitcoin drawdowns and recoveries.',
    'quantum': 'Will quantum computers break Bitcoin? What the qubit math actually says, and how Bitcoin would upgrade.',
    'caseagainst': 'The strongest arguments AGAINST Bitcoin, presented at full strength: volatility, lost coins, energy, concentration, and state risk.',
    'goldvsbtc': 'Bitcoin vs gold across every property of money, plus what the BTC/gold ratio reveals when you stop pricing in dollars.',
    'adoption': 'Who actually uses Bitcoin: individuals, companies, ETFs, and nation states - the adoption picture in data.',
    'wallets': 'A wallet holds keys, not coins. Hot vs cold, custodial vs self-custody, and how to choose your first one.',
    'exchanges': 'How to buy bitcoin safely: choosing an exchange, understanding IOUs, and why coins on exchanges are promises.',
    'firstbitcoin': 'Your first $10 of bitcoin, safely: a wallet decision quiz, a five-step training path, and the withdrawal checklist.',
    'sending': 'How sending Bitcoin works: addresses, fees, confirmations, and why transactions cannot be reversed.',
    'security': 'The simple habits that cover 95% of Bitcoin security risks: seed phrases, backups, and multisig basics.',
    'scamdrill': 'Train against the scams that actually steal bitcoin: fake support, seed phishing, giveaway doublers, and pig butchering - scored drill.',
    'network': 'The peer-to-peer network no one can switch off: how transactions propagate and why there is no headquarters.',
    'node': 'What a Bitcoin node does, why running one makes you sovereign, and how a $75 computer verifies a trillion-dollar system.',
    'mining': 'Mine a block yourself with real SHA-256 hashing in your browser and feel exactly what proof of work is.',
    'blockchain': 'Tamper with a real hash-linked blockchain and watch every block after your edit break - then try to cover your tracks.',
    'blocks': 'Inside a Bitcoin block: height, timestamps, the merkle root, the nonce, and the header that chains history together.',
    'difficulty': 'Bitcoin retunes its own difficulty every 2,016 blocks. Shock the network in a simulator and watch it heal.',
    'attackvectors': '51% attacks, Sybil attacks, and every other way people try to break Bitcoin - and why they fail in practice.',
    'transactions': 'Build a transaction yourself: inputs, outputs, change, and the fee - the puzzle every wallet solves for you.',
    'outputs': 'UTXOs explained: why your wallet has coins instead of a balance, and how coin selection actually works.',
    'locks': 'Every coin is locked by a script. See how keys, multisig, and timelocks decide who can spend what.',
    'keys': 'Twelve words ARE a wallet: edit a seed phrase live and watch keys and addresses re-derive deterministically.',
    'privatekeys': 'What makes a private key safe: 256 bits of real entropy, and why bad randomness has been robbed before.',
    'publickeys': 'One-way cryptography you can feel: derive addresses instantly, then try to reverse one and see why you cannot.',
    'signatures': 'Real ECDSA in your browser: sign a message, tamper with it, and watch verification catch every single change.',
    'signetlab': 'Use real Bitcoin on the Signet test network: generate keys, receive coins, sign and broadcast a genuine transaction.',
    'consensus': 'How a leaderless network changes its rules: soft forks, SegWit, Taproot, and the blocksize war.',
    'lightning': 'The Lightning Network: instant, nearly free Bitcoin payments and how payment channels actually work.',
    'toolate': 'Is it too late to buy Bitcoin? Market cap math, adoption curves, and the honest version of the answer.',
    'perspective': 'The payoff: what a world that saves in hard money looks like, and what it changes for your future.',
    'finalexam': 'The final exam: 25 questions across the whole course, an 80% bar, and a certificate you can anchor into Bitcoin itself.',
    'lore': 'Bitcoin lore: pizza day, the landfill fortune, Hal Finney, and the folklore of the hardest money ever made.',
    'bibliography': 'Every source behind the course: books, papers, primary data, and where to go deeper.',
}

def main():
    with open('index.html', encoding='utf-8') as f:
        html = f.read()

    m = re.search(r"const sectionOrder = \[([^\]]+)\]", html)
    order = re.findall(r"'([a-z0-9]+)'", m.group(1))

    m = re.search(r"const sectionNames = \{(.*?)\};", html, re.DOTALL)
    names = dict(re.findall(r"([a-z0-9]+):\s*'((?:[^'\\]|\\.)*)'", m.group(1)))

    missing = [s for s in order if s not in DESCRIPTIONS]
    if missing:
        print('FAIL: missing descriptions for: ' + ', '.join(missing))
        return 1

    urls = [SITE + '/']
    for slug in order:
        name = names.get(slug, slug).replace("\\'", "'").replace('\\u20BF', 'B')
        desc = DESCRIPTIONS[slug]
        url = SITE + '/lessons/' + slug + '/'
        urls.append(url)
        os.makedirs('lessons/' + slug, exist_ok=True)
        page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{name} - A Bit Curious</title>
<meta name="description" content="{desc}"/>
<link rel="canonical" href="{url}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="{url}"/>
<meta property="og:title" content="{name} - A Bit Curious"/>
<meta property="og:description" content="{desc}"/>
<meta property="og:image" content="{SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" type="image/png" href="/icon-192.png"/>
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"LearningResource","name":"{name}","description":"{desc}","url":"{url}","isAccessibleForFree":true,"inLanguage":"en","isPartOf":{{"@type":"Course","name":"A Bit Curious - The Interactive Guide to Bitcoin","url":"{SITE}/"}}}}
</script>
<style>
  *{{box-sizing:border-box;margin:0;padding:0;}}
  body{{background:#0b0b18;color:#f5f5fa;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}}
  main{{max-width:560px;text-align:center;}}
  .brand{{font-size:13px;letter-spacing:.14em;color:#7878a0;margin-bottom:18px;}}
  h1{{font-size:30px;line-height:1.25;margin-bottom:14px;background:linear-gradient(135deg,#f59e0b,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}}
  p{{font-size:15px;line-height:1.7;color:#b8b8d8;margin-bottom:26px;}}
  a.cta{{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:800;padding:14px 30px;border-radius:12px;text-decoration:none;font-size:15px;}}
  .free{{font-size:12px;color:#7878a0;margin-top:12px;}}
</style>
</head>
<body>
<main>
  <div class="brand">A &#8383;IT CURIOUS</div>
  <h1>{name}</h1>
  <p>{desc}</p>
  <a class="cta" href="/#{slug}">Start this interactive lesson &#8594;</a>
  <div class="free">Free &bull; no account &bull; part of a {len(order) - 1}-lesson interactive Bitcoin course</div>
</main>
</body>
</html>
'''
        with open('lessons/' + slug + '/index.html', 'w', encoding='utf-8') as f:
            f.write(page)

    with open('sitemap.xml', 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write('  <url><loc>' + u + '</loc></url>\n')
        f.write('</urlset>\n')

    print('OK: ' + str(len(order)) + ' lesson pages + sitemap.xml (' + str(len(urls)) + ' URLs)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
