#!/usr/bin/env python3
"""Generate static, crawlable reading pages for every lesson, plus sitemap.xml.

Reads sectionOrder, sectionNames, the chapter grouping, and each lesson's
summary text straight from index.html so the pages can never drift from the
real course. Each page is the lesson's prose (interactive widgets stripped),
a glossary built from its tooltip definitions, and links into the app at /#<slug>.

Standard library only. Run from the repo root:  python3 scripts/gen-seo-pages.py
"""
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

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

# ─── Minimal DOM built with the standard-library parser ───

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
# Interactive or decorative elements that carry no readable lesson text
DROP = {'svg', 'script', 'style', 'button', 'input', 'select', 'textarea', 'canvas', 'label', 'noscript', 'template', 'iframe', 'form'}
INLINE_KEEP = {'strong', 'em', 'b', 'i', 'sup', 'sub', 'code', 's', 'u', 'mark', 'small'}
BLOCK = {'div', 'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
         'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'section', 'aside', 'header', 'footer', 'figure'}
MIN_LOOSE_TEXT = 60  # a bare-text <div> this long is prose (caption, step description), not a widget label


class Node:
    __slots__ = ('tag', 'attrs', 'children')

    def __init__(self, tag, attrs):
        self.tag = tag
        self.attrs = attrs
        self.children = []

    def classes(self):
        return (self.attrs.get('class') or '').split()


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('root', {})
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, dict(attrs)))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def find_sections(node, out):
    for child in node.children:
        if isinstance(child, Node):
            sec_id = child.attrs.get('id') or ''
            if sec_id.startswith('sec-') and 'section-content' in child.classes():
                out[sec_id[4:]] = child
            else:
                find_sections(child, out)
    return out


def find_first(node, cls):
    for child in node.children:
        if isinstance(child, Node):
            if cls in child.classes():
                return child
            hit = find_first(child, cls)
            if hit:
                return hit
    return None


def skipped(node):
    cls = node.classes()
    return (node.tag in DROP or 'tooltip-box' in cls
            or (node.tag == 'div' and 'hidden' in cls)
            or 'section-title' in cls or 'section-subtitle' in cls)


def plain(node):
    if isinstance(node, str):
        return node
    if node.tag in DROP or 'tooltip-box' in node.classes():
        return ''
    sep = ' ' if node.tag in BLOCK else ''
    return sep + ''.join(plain(c) for c in node.children) + sep


def squash(text):
    return re.sub(r'\s+', ' ', text).strip()


def has_block_content(node):
    for child in node.children:
        if isinstance(child, Node) and not skipped(child):
            if child.tag in BLOCK or has_block_content(child):
                return True
    return False


# ─── Rendering a lesson section into clean article HTML ───

class Renderer:
    def __init__(self, order):
        self.order = set(order)
        self.terms = {}

    def link(self, href):
        if href.startswith('#ref-'):
            return '/lessons/bibliography/' + href
        if href.startswith('#') and href[1:] in self.order:
            return '/lessons/' + href[1:] + '/'
        if href.startswith(('https://', 'http://')):
            return href
        return None

    def inline(self, node):
        if isinstance(node, str):
            return html.escape(node, quote=False)
        cls = node.classes()
        if node.tag in DROP or 'tooltip-box' in cls:
            return ''
        if 'tooltip-word' in cls:
            box = find_first(node, 'tooltip-box')
            term = squash(plain(node))
            if box is not None and term and len(term) <= 60:
                definition = squash(''.join(plain(c) for c in box.children))
                if definition:
                    self.terms.setdefault(term.lower(), (term, definition))
        inner = ''.join(self.inline(c) for c in node.children)
        if node.tag == 'br':
            return '<br>'
        if node.tag == 'a':
            href = self.link(node.attrs.get('href') or '')
            if href is None:
                return inner
            rel = ' rel="noopener"' if href.startswith('http') else ''
            return '<a href="' + html.escape(href) + '"' + rel + '>' + inner + '</a>'
        if node.tag in INLINE_KEEP:
            return '<' + node.tag + '>' + inner + '</' + node.tag + '>'
        if node.tag in BLOCK:
            return ' ' + inner + ' '
        return inner

    def wrap(self, tag, node, attrs=''):
        body = squash(self.inline(node))
        if not squash(plain(node)):
            return []
        return ['<' + tag + attrs + '>' + body + '</' + tag + '>']

    def blocks(self, node):
        if skipped(node):
            return []
        cls = node.classes()
        node_id = node.attrs.get('id') or ''
        if re.fullmatch(r'ref-\d+', node_id):
            return self.wrap('p', node, ' id="' + node_id + '" class="ref"')
        if node.tag == 'p':
            return self.wrap('p', node)
        if 'highlight-box' in cls:
            return self.wrap('p', node, ' class="note"')
        if node.tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            return self.wrap('h2', node)
        if node.tag == 'blockquote':
            return self.wrap('blockquote', node)
        if node.tag in ('ul', 'ol'):
            items = [li for li in node.children if isinstance(li, Node) and li.tag == 'li']
            rendered = [x for li in items for x in self.wrap('li', li)]
            return ['<' + node.tag + '>' + ''.join(rendered) + '</' + node.tag + '>'] if rendered else []
        if node.tag == 'table':
            return self.table(node)
        if not has_block_content(node) and len(squash(plain(node))) >= MIN_LOOSE_TEXT:
            return self.wrap('p', node)
        out = []
        label = None
        for child in node.children:
            if not isinstance(child, Node) or skipped(child):
                continue
            if self.is_label(child):
                label = child
                continue
            rendered = self.blocks(child)
            # A short card title directly above prose becomes that prose's subheading
            if label is not None and rendered and rendered[0].startswith('<p') and ' id="ref-' not in rendered[0]:
                out.extend(self.wrap('h3', label))
            label = None
            out.extend(rendered)
        return out

    @staticmethod
    def is_label(node):
        if node.tag not in ('div', 'span', 'strong', 'b') or has_block_content(node):
            return False
        text = squash(plain(node))
        return len(text) < MIN_LOOSE_TEXT and re.search(r'[A-Za-z]{3}', text) is not None

    def table(self, node):
        rows = []

        def collect(n):
            for c in n.children:
                if isinstance(c, Node):
                    if c.tag == 'tr':
                        cells = [x for x in c.children if isinstance(x, Node) and x.tag in ('td', 'th')]
                        rows.append(''.join('<' + x.tag + '>' + squash(self.inline(x)) + '</' + x.tag + '>' for x in cells))
                    else:
                        collect(c)
        collect(node)
        return ['<table>' + ''.join('<tr>' + r + '</tr>' for r in rows) + '</table>'] if rows else []


def chapters_from_sidebar(src):
    m = re.search(r'<aside id="left-sidebar".*?</aside>', src, re.DOTALL)
    chapters, current = [], ('Start here', [])
    chapters.append(current)
    for g in re.finditer(r'class="nav-group-label"[^>]*>(.*?)</div>|data-section="([a-z0-9]+)"', m.group(0)):
        if g.group(1):
            current = (html.unescape(g.group(1)), [])
            chapters.append(current)
        else:
            current[1].append(g.group(2))
    return chapters


PAGE_CSS = '''
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0b0b18;color:#e2e2f0;font-family:'Inter',system-ui,sans-serif;font-size:17px;line-height:1.75;}
  a{color:#fbbf24;}
  .top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(245,158,11,0.28);background:#0f0f26;}
  .brand{font-family:'Syne',system-ui,sans-serif;font-weight:800;color:#fff;text-decoration:none;font-size:17px;}
  .brand span{color:#f59e0b;}
  .top .open{font-size:14px;font-weight:600;text-decoration:none;}
  main{max-width:720px;margin:0 auto;padding:32px 20px 48px;}
  .crumbs{font-size:13px;color:#8888b8;margin-bottom:10px;}
  .crumbs a{color:#8888b8;}
  h1{font-family:'Syne',system-ui,sans-serif;font-size:clamp(30px,6vw,42px);line-height:1.15;color:#fbbf24;margin-bottom:8px;}
  .sub{font-family:'Space Mono',ui-monospace,monospace;font-size:13px;color:#8888b8;margin-bottom:24px;}
  article p,article li,article blockquote{margin-bottom:18px;}
  article h2,.terms h2{font-family:'Syne',system-ui,sans-serif;font-size:22px;color:#fff;margin:32px 0 12px;}
  article h3{font-size:17px;color:#fbbf24;margin:24px 0 6px;}
  article ul,article ol{padding-left:24px;}
  article sup{font-size:11px;}
  article sup a{text-decoration:none;}
  .note{border-left:3px solid #f59e0b;background:rgba(245,158,11,0.08);padding:14px 16px;border-radius:8px;}
  .ref{font-size:14px;color:#b8b8d8;margin-bottom:10px;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;display:block;overflow-x:auto;}
  td,th{border:1px solid rgba(255,255,255,0.1);padding:6px 10px;text-align:left;vertical-align:top;}
  th{color:#fbbf24;}
  .cta-box{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:14px;padding:18px 20px;margin:0 0 32px;}
  .cta-box p{font-size:15px;color:#b8b8d8;margin-bottom:12px;}
  a.cta{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:800;padding:12px 24px;border-radius:12px;text-decoration:none;font-size:15px;}
  .terms dt{font-weight:700;color:#fff;margin-top:14px;}
  .terms dd{color:#b8b8d8;font-size:15px;}
  .pager{display:flex;justify-content:space-between;gap:16px;margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;}
  .pager a{text-decoration:none;}
  footer{max-width:720px;margin:0 auto;padding:0 20px 48px;font-size:14px;}
  footer h2{font-family:'Syne',system-ui,sans-serif;font-size:18px;color:#fff;margin:24px 0 8px;}
  footer h3{font-size:13px;color:#8888b8;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 4px;}
  footer ul{list-style:none;display:flex;flex-wrap:wrap;gap:4px 16px;}
'''


def clean_name(raw):
    return raw.replace("\\'", "'").replace('\\u20BF', 'B')


def render_page(slug, idx, order, names, chapter_of, chapters, section, desc):
    renderer = Renderer(order)
    title_name = names[slug]
    url = SITE + '/lessons/' + slug + '/'
    sub_node = find_first(section, 'section-subtitle')
    subtitle = squash(plain(sub_node)).lstrip('/ ').strip() if sub_node is not None else ''
    body = '\n'.join(renderer.blocks(section))
    lesson_count = len(order) - 1
    e = html.escape

    def t(s):
        return html.escape(s, quote=False)

    terms = ''
    if renderer.terms:
        terms = ('<section class="terms"><h2>Key terms</h2><dl>'
                 + ''.join('<dt>' + t(term) + '</dt><dd>' + t(d) + '</dd>' for term, d in renderer.terms.values())
                 + '</dl></section>')

    pager = []
    if idx > 0:
        p = order[idx - 1]
        pager.append('<a rel="prev" href="/lessons/' + p + '/">&#8592; ' + t(names[p]) + '</a>')
    else:
        pager.append('<span></span>')
    if idx < len(order) - 1:
        n = order[idx + 1]
        pager.append('<a rel="next" href="/lessons/' + n + '/">' + t(names[n]) + ' &#8594;</a>')
    pager_html = ''.join(pager)

    index_html = ''.join(
        '<h3>' + t(ch) + '</h3><ul>'
        + ''.join('<li><a href="/lessons/' + s + '/">' + t(names[s]) + '</a></li>' for s in slugs if s in names)
        + '</ul>'
        for ch, slugs in chapters if slugs)

    ld = {
        '@context': 'https://schema.org', '@type': 'LearningResource',
        'name': title_name, 'description': desc, 'url': url,
        'isAccessibleForFree': True, 'inLanguage': 'en', 'educationalLevel': 'Beginner',
        'isPartOf': {'@type': 'Course', 'name': 'A Bit Curious - The Interactive Guide to Bitcoin', 'url': SITE + '/'},
    }
    ld_json = json.dumps(ld, ensure_ascii=False).replace('</', '<\\/')
    chapter = chapter_of.get(slug, '')
    crumb = '<a href="/">A Bit Curious</a>' + (' &rsaquo; ' + t(chapter) if chapter else '')

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{t(title_name)} - A Bit Curious</title>
<meta name="description" content="{e(desc)}"/>
<meta name="theme-color" content="#0b0b18"/>
<link rel="canonical" href="{url}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="A Bit Curious"/>
<meta property="og:url" content="{url}"/>
<meta property="og:title" content="{e(title_name)} - A Bit Curious"/>
<meta property="og:description" content="{e(desc)}"/>
<meta property="og:image" content="{SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{e(title_name)} - A Bit Curious"/>
<meta name="twitter:description" content="{e(desc)}"/>
<link rel="icon" type="image/png" href="/icon-192.png"/>
<link rel="stylesheet" href="/styles.css"/>
<script type="application/ld+json">
{ld_json}
</script>
<style>{PAGE_CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="/">A <span>&#8383;</span>it Curious</a>
  <a class="open" href="/#{slug}">Interactive version &#8594;</a>
</header>
<main>
  <nav class="crumbs" aria-label="Breadcrumb">{crumb}</nav>
  <h1>{t(title_name)}</h1>
  <p class="sub">{t(subtitle)}</p>
  <div class="cta-box">
    <p>{t(desc)} This is the reading version - the interactive lesson has the live demos, quizzes, and progress tracking.</p>
    <a class="cta" href="/#{slug}">Start the interactive lesson &#8594;</a>
  </div>
  <article>
{body}
  </article>
  {terms}
  <nav class="pager" aria-label="Lessons">{pager_html}</nav>
</main>
<footer>
  <h2>All {lesson_count} lessons</h2>
  {index_html}
</footer>
</body>
</html>
'''


def main():
    with open('index.html', encoding='utf-8') as f:
        src = f.read()

    m = re.search(r"const sectionOrder = \[([^\]]+)\]", src)
    order = re.findall(r"'([a-z0-9]+)'", m.group(1))

    m = re.search(r"const sectionNames = \{(.*?)\};", src, re.DOTALL)
    names = {k: clean_name(v) for k, v in re.findall(r"([a-z0-9]+):\s*'((?:[^'\\]|\\.)*)'", m.group(1))}
    for slug in order:
        names.setdefault(slug, slug)

    missing = [s for s in order if s not in DESCRIPTIONS]
    if missing:
        print('FAIL: missing descriptions for: ' + ', '.join(missing))
        return 1

    builder = TreeBuilder()
    builder.feed(src)
    sections = find_sections(builder.root, {})
    no_section = [s for s in order if s not in sections]
    if no_section:
        print('FAIL: no <div class="section-content" id="sec-..."> for: ' + ', '.join(no_section))
        return 1

    chapters = chapters_from_sidebar(src)
    chapter_of = {s: ch for ch, slugs in chapters for s in slugs if ch != 'Start here'}

    urls = [SITE + '/']
    for idx, slug in enumerate(order):
        urls.append(SITE + '/lessons/' + slug + '/')
        page = render_page(slug, idx, order, names, chapter_of, chapters, sections[slug], DESCRIPTIONS[slug])
        os.makedirs('lessons/' + slug, exist_ok=True)
        with open('lessons/' + slug + '/index.html', 'w', encoding='utf-8', newline='\n') as f:
            f.write(page)

    with open('sitemap.xml', 'w', encoding='utf-8', newline='\n') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write('  <url><loc>' + u + '</loc></url>\n')
        f.write('</urlset>\n')

    print('OK: ' + str(len(order)) + ' lesson pages + sitemap.xml (' + str(len(urls)) + ' URLs)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
