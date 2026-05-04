import json, os, re
from datetime import datetime, timezone, timedelta
from pathlib import Path

import anthropic
import requests
from bs4 import BeautifulSoup

KST = timezone(timedelta(hours=9))
NOW = datetime.now(KST)
TODAY = NOW.strftime("%Y-%m-%d")
UPDATES_PATH = Path("data/updates.json")

PAGES = [
    ("보도자료",  "https://www.kidp.or.kr/?menuno=1019"),
    ("사업부소식", "https://www.kidp.or.kr/?menuno=1202"),
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; KIDPBot/1.0)"}


def fetch_items(label, url):
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        items = []
        for row in soup.select("table tbody tr, .board-list li, .list-wrap li")[:20]:
            title_el = row.select_one("td.subject a, .tit a, .title a, a")
            date_el  = row.select_one("td.date, .date, .reg-date")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            date  = date_el.get_text(strip=True) if date_el else TODAY
            href  = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = "https://www.kidp.or.kr" + href
            if title and len(title) > 5:
                items.append({"title": title, "date": date, "source": label, "url": href})
        return items
    except Exception as e:
        print(f"[{label}] 크롤링 오류: {e}")
        return []


def already_exists(title, existing):
    return any(e.get("title") == title for e in existing)


def summarize_batch(client, new_items):
    if not new_items:
        return []

    items_text = "\n".join(
        f"[{i+1}] ({item['source']}) {item['date']} — {item['title']}"
        for i, item in enumerate(new_items)
    )

    prompt = f"""당신은 한국디자인진흥원(KIDP) 면접 준비를 돕는 어시스턴트입니다.
아래는 KIDP 홈페이지에 새로 올라온 게시물 목록입니다.

{items_text}

각 항목에 대해 다음 형식으로 JSON 배열을 반환하세요:
[
  {{
    "index": 1,
    "summary": "2~3줄 핵심 요약. 면접관이 물어볼 수 있는 내용 위주로.",
    "tag": "태그 (다음 중 하나: 최대 화두 / 핵심 사업 / 글로벌 / 사회적 이슈 / 2026 신규 / 글로벌 트렌드 / 산업부 연계 / 공공)"
  }},
  ...
]

JSON만 반환하고 다른 설명은 쓰지 마세요."""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    text = msg.content[0].text.strip()
    # JSON 블록만 추출
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        return []

    summaries = json.loads(match.group())
    results = []
    for s in summaries:
        idx = s.get("index", 0) - 1
        if 0 <= idx < len(new_items):
            item = new_items[idx].copy()
            item["summary"] = s.get("summary", "")
            item["tag"]     = s.get("tag", "")
            item["fetchedAt"] = NOW.isoformat()
            results.append(item)
    return results


def main():
    # 기존 updates.json 로드
    if UPDATES_PATH.exists():
        with open(UPDATES_PATH) as f:
            data = json.load(f)
    else:
        data = {"updates": []}

    existing = data.get("updates", [])

    # 크롤링
    all_new = []
    for label, url in PAGES:
        items = fetch_items(label, url)
        for item in items:
            if not already_exists(item["title"], existing):
                all_new.append(item)

    print(f"새 항목: {len(all_new)}개")

    if not all_new:
        # 새 항목 없어도 lastFetched 갱신
        data["lastFetched"] = NOW.isoformat()
        with open(UPDATES_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("새 항목 없음. 시간만 갱신.")
        return

    # Claude로 요약
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    summarized = summarize_batch(client, all_new)

    # 최신 순으로 앞에 추가 (최대 200개 유지)
    data["updates"] = (summarized + existing)[:200]
    data["lastFetched"] = NOW.isoformat()

    with open(UPDATES_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"완료: {len(summarized)}개 추가됨")


if __name__ == "__main__":
    main()
