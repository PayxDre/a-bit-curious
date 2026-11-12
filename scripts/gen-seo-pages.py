#!/usr/bin/env python3
"""Generate everything that is derived from the course itself.

Reads sectionOrder, sectionNames and DATA_VERIFIED from app.js and the lesson
markup from index.html, then writes:

  lessons/<slug>/index.html  full-text, crawlable page for every lesson
  sitemap.xml                with lastmod
  for-bots/knowledge.json    lesson count + updated date (fails on missing lessons)
  llms.txt                   chapter lesson counts

CI runs this and fails on any diff, so none of these can drift from the app.

Run from the repo root:  python3 scripts/gen-seo-pages.py
"""
import html as htmllib
import json
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

NOISE = [
    r'<svg\b.*?</svg>', r'<script\b.*?</script>', r'<style\b.*?</style>', r'<button\b.*?</button>',
    r'<canvas\b.*?</canvas>', r'<sup\b.*?</sup>', r'<input\b[^>]*>', r'<!--.*?-->',
    r'<span class="tooltip-box">.*?</span>',
]


def lesson_blocks(section_html):
    """Turn one lesson's app markup into a list of ('h'|'p', text) blocks."""
    h = section_html
    for pat in NOISE:
        h = re.sub(pat, ' ', h, flags=re.DOTALL)
    # Drop the "up next" bridge card at the end of each lesson
    h = re.sub(r'<!-- Bridge.*$', ' ', h, flags=re.DOTALL)
    h = re.sub(r'<div class="text-sm font-bold[^"]*"[^>]*>(.*?)</div>', r'\n@@H@@\1\n', h, flags=re.DOTALL)
    h = re.sub(r'<h[23][^>]*>(.*?)</h[23]>', r'\n@@T@@\1\n', h, flags=re.DOTALL)
    h = re.sub(r'</(p|div|li|tr|h\d)>|<br\s*/?>', '\n', h)
    h = re.sub(r'<[^>]+>', '', h)
    blocks = []
    for line in h.split('\n'):
        line = re.sub(r'\s+', ' ', htmllib.unescape(line)).strip()
        if line.startswith('@@T@@'):
            continue  # lesson title is the page <h1>
        if line.startswith('@@H@@'):
            t = line[5:].strip()
            if 3 < len(t) < 90:
                blocks.append(('h', t))
        elif len(line) >= 90:
            blocks.append(('p', line))
    # A heading with no paragraph after it is a widget label, not prose
    out = []
    for i, (kind, t) in enumerate(blocks):
        if kind == 'h' and (i + 1 >= len(blocks) or blocks[i + 1][0] == 'h'):
            continue
        out.append((kind, t))
    return out


def esc(t):
    return htmllib.escape(t, quote=True)


def main():
    with open('app.js', encoding='utf-8') as f:
        js = f.read()
    with open('index.html', encoding='utf-8') as f:
        html = f.read()

    m = re.search(r"const sectionOrder = \[([^\]]+)\]", js)
    order = re.findall(r"'([a-z0-9]+)'", m.group(1))
    m = re.search(r"const sectionNames = \{(.*?)\};", js, re.DOTALL)
    names = dict(re.findall(r"([a-z0-9]+):\s*'((?:[^'\\]|\\.)*)'", m.group(1)))
    verified = re.search(r"const DATA_VERIFIED = '(\d{4}-\d{2}-\d{2})'", js).group(1)

    missing = [s for s in order if s not in DESCRIPTIONS]
    if missing:
        print('FAIL: missing descriptions for: ' + ', '.join(missing))
        return 1

    # Slice index.html into per-lesson markup
    starts = sorted((mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="section-content[^"]*" id="sec-([a-z0-9]+)"', html))
    end_of_main = html.index('</main>')
    sections = {}
    for i, (pos, slug) in enumerate(starts):
        nxt = starts[i + 1][0] if i + 1 < len(starts) else end_of_main
        sections[slug] = html[pos:nxt]
    absent = [s for s in order if s not in sections]
    if absent:
        print('FAIL: lessons in sectionOrder with no markup: ' + ', '.join(absent))
        return 1

    def title(slug):
        return names.get(slug, slug).replace("\\'", "'").replace('\\u20BF', 'B')

    n_lessons = len(order) - 1
    urls = [SITE + '/']
    for idx, slug in enumerate(order):
        name = esc(title(slug))
        desc = esc(DESCRIPTIONS[slug])
        url = SITE + '/lessons/' + slug + '/'
        urls.append(url)
        os.makedirs('lessons/' + slug, exist_ok=True)
        parts = []
        for kind, text in lesson_blocks(sections[slug]):
            parts.append(('  <h2>%s</h2>' if kind == 'h' else '  <p>%s</p>') % esc(text))
        article = '\n'.join(parts)
        nav = []
        if idx > 0:
            nav.append('<a href="/lessons/%s/">&#8592; %s</a>' % (order[idx - 1], esc(title(order[idx - 1]))))
        if idx + 1 < len(order):
            nav.append('<a href="/lessons/%s/">%s &#8594;</a>' % (order[idx + 1], esc(title(order[idx + 1]))))
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
{{"@context":"https://schema.org","@type":"LearningResource","name":"{name}","description":"{desc}","url":"{url}","dateModified":"{verified}","isAccessibleForFree":true,"inLanguage":"en","isPartOf":{{"@type":"Course","name":"A Bit Curious - The Interactive Guide to Bitcoin","url":"{SITE}/"}}}}
</script>
<style>
  *{{box-sizing:border-box;margin:0;padding:0;}}
  body{{background:#0b0b18;color:#e2e2f0;font-family:system-ui,sans-serif;padding:32px 20px 64px;}}
  main{{max-width:720px;margin:0 auto;}}
  .brand{{font-size:13px;letter-spacing:.14em;color:#8888b8;margin-bottom:18px;}}
  .brand a{{color:inherit;text-decoration:none;}}
  h1{{font-size:32px;line-height:1.25;margin-bottom:12px;color:#f59e0b;}}
  h2{{font-size:19px;line-height:1.35;margin:30px 0 10px;color:#fff;}}
  p{{font-size:16px;line-height:1.75;color:#c8c8e0;margin-bottom:16px;}}
  .lede{{font-size:18px;color:#e2e2f0;margin-bottom:22px;}}
  a.cta{{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:800;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin:6px 0 28px;}}
  .note{{font-size:13px;color:#8888b8;}}
  nav{{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:36px;padding-top:20px;border-top:1px solid rgba(245,158,11,.25);}}
  nav a{{color:#f59e0b;text-decoration:none;font-size:15px;padding:10px 0;}}
</style>
</head>
<body>
<main>
  <div class="brand"><a href="/">A &#8383;IT CURIOUS</a> &middot; lesson {idx + 1} of {len(order)}</div>
  <h1>{name}</h1>
  <p class="lede">{desc}</p>
  <a class="cta" href="/#{slug}">Open the interactive lesson &#8594;</a>
{article}
  <a class="cta" href="/#{slug}">Try it yourself in the interactive lesson &#8594;</a>
  <p class="note">Free &bull; no account &bull; part of a {n_lessons}-lesson interactive Bitcoin course &bull; figures last verified {verified}</p>
  <nav>{''.join(nav)}</nav>
</main>
</body>
</html>
'''
        with open('lessons/' + slug + '/index.html', 'w', encoding='utf-8') as f:
            f.write(page)

    with open('sitemap.xml', 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write('  <url><loc>' + u + '</loc><lastmod>' + verified + '</lastmod></url>\n')
        f.write('</urlset>\n')

    # for-bots/knowledge.json: every lesson must be present; header fields are derived
    kpath = 'for-bots/knowledge.json'
    with open(kpath, encoding='utf-8') as f:
        ktext = f.read()
    known = set(re.findall(r'\{"slug":"([a-z0-9]+)"', ktext))
    gaps = [s for s in order if s != 'welcome' and s not in known]
    if gaps:
        print('FAIL: for-bots/knowledge.json has no entry for: ' + ', '.join(gaps))
        return 1
    ktext = re.sub(r'"lessons": \d+', '"lessons": %d' % n_lessons, ktext, count=1)
    ktext = re.sub(r'"updated": "[^"]+"', '"updated": "%s"' % verified, ktext, count=1)
    json.loads(ktext)
    with open(kpath, 'w', encoding='utf-8') as f:
        f.write(ktext)

    # llms.txt: each chapter heading states the number of bullets beneath it
    with open('llms.txt', encoding='utf-8') as f:
        lines = f.read().split('\n')
    head_idx, count = None, 0
    def flush():
        if head_idx is not None:
            lines[head_idx] = re.sub(r'\(\d+ lessons?\)', '(%d lessons)' % count, lines[head_idx])
    for i, line in enumerate(lines):
        if line.startswith('### ') or line.startswith('## '):
            flush()
            head_idx, count = (i, 0) if line.startswith('### ') else (None, 0)
        elif line.startswith('- [') and head_idx is not None:
            count += 1
    flush()
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    # The lesson count is quoted in several places; all must agree with the app
    for path in ('index.html', 'llms.txt', 'for-bots/index.html', 'robots.txt'):
        with open(path, encoding='utf-8') as f:
            for n in re.findall(r'(?<!\()\b(\d{2}) (?:interactive |visual |structured )?lessons\b', f.read()):
                if int(n) != n_lessons:
                    print('FAIL: %s says "%s lessons" but the course has %d' % (path, n, n_lessons))
                    return 1

    print('OK: %d lesson pages, sitemap.xml (%d URLs), knowledge.json and llms.txt in sync' % (len(order), len(urls)))
    return 0

if __name__ == '__main__':
    sys.exit(main())
