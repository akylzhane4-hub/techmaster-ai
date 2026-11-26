TechMaster AI — прототип (КТ 3)

index.html — готовый сайт одним файлом (3D-кирпичи three.js и шрифты грузятся с CDN).
netlify/functions/ask.mjs — серверная функция: через неё сайт обращается к ИИ Google Gemini.
netlify.toml — настройки для Netlify.
src/ — исходники: page_noscript.html (страница), hero.js (3D), build.py (сборка index.html).

ИИ:
- На Netlify анализ партии и диагностику дефектов выполняет Google Gemini
  (нужна переменная окружения GEMINI_API_KEY в настройках проекта).
- Если ключа нет или ИИ не ответил — включается офлайн-режим: проверка по правилам.

Как выложить:
1. GitHub → новый репозиторий → загрузить ВСЕ файлы из этой папки, сохранив папку netlify/functions
   (если папка не загрузилась: Add file → Create new file → имя netlify/functions/ask.mjs → вставить код).
2. Netlify → Add new project → Import an existing project → GitHub → выбрать репозиторий → Deploy.
3. Project configuration → Environment variables → GEMINI_API_KEY = ваш ключ (Contains secret values).
4. Deploys → Trigger deploy → Deploy project.
5. General → Visitor access → Public → Save.
6. Проверка: https://<сайт>.netlify.app/api/status должен показать {"ai":true}.
