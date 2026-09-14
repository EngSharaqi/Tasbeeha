# [Tasbeeha | تسبيحة](https://tasbeeha.vercel.app/)

## مسبحة إلكترونية وأذكار الصباح والمساء وحصن المسلم

Tasbeeha is a free, simple online **tasbeeh counter** (electronic sebha) for Muslims. It shows you a zekr from the morning and evening azkar and Hisn Al-Muslim, with its virtue (fadl) and how many times to repeat it. Tap the counter to make tasbeeh, pick another zekr, reset the counter, and share an image when you finish.

تسبيحة مسبحة إلكترونية مجانية بعدّاد تسبيح، فيها أذكار الصباح والمساء وأذكار النوم والصلاة وأدعية حصن المسلم مع فضل كل ذكر وعدد تكراره.

**Link:** https://tasbeeha.vercel.app/

### Azkar pages (SEO)

Every category in `azkar.js` also has a static, crawlable page under `/azkar` (e.g. [أذكار الصباح](https://tasbeeha.vercel.app/azkar/azkar_alsabah)), so the full text of each zekr can be found from search engines. After editing `azkar.js`, regenerate the pages and `sitemap.xml`:

```bash
node scripts/build-seo.mjs
```
