# 🚀 Быстрый деплой на Vercel

## Способ 1: Самый быстрый (2 минуты)

### Шаг 1: Загрузить проект на GitHub
```bash
# Инициализируем git
git init
git add .
git commit -m "Add attack-defense game"

# Если хотите нового репо:
# git remote add origin https://github.com/YOUR_USERNAME/attack-defense-game
# git push -u origin main

# Или просто push в существующий
git push
```

### Шаг 2: Деплой на Vercel
1. Откройте [https://vercel.com](https://vercel.com)
2. Нажмите **"New Project"**
3. Выберите репозиторий
4. Нажмите **"Import"**
5. На экране "Configure Project":
   - Пропустите (оставьте по умолчанию)
   - Нажмите **"Environment Variables"**
   
### Шаг 3: Добавить Firebase переменные
В "Environment Variables" добавьте 4 переменные:

```
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = myproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL = https://myproject.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = myproject-12345
```

(Откройте Firebase Console в другой вкладке, скопируйте значения)

### Шаг 4: Деплой
Нажмите **"Deploy"** и ждите 2-3 минуты

✅ Готово! Вы получите ссылку типа: `https://attack-defense-game.vercel.app`

---

## Способ 2: Через Vercel CLI

```bash
# Установить CLI
npm install -g vercel

# Логин
vercel login

# Деплой
vercel

# Следуйте инструкциям:
# - Link to existing project? → No (создать новый)
# - Scope? → Your account
# - Project name? → attack-defense-game
# - Framework? → Next.js
# - Deploy? → Yes
```

---

## Получить Firebase конфиг

1. Откройте [https://console.firebase.google.com](https://console.firebase.google.com)
2. Создайте новый проект (если нет)
3. Перейдите в **Project Settings** (⚙️)
4. На вкладке **"Your apps"** создайте или выберите Web app
5. Копируйте конфиг:

```javascript
{
  apiKey: "AIzaSyD...",
  authDomain: "myproject.firebaseapp.com",
  databaseURL: "https://myproject.firebaseio.com",
  projectId: "myproject-12345",
  ...
}
```

Нужны только первые 4 значения!

---

## Проверить деплой

1. Откройте ссылку (например `https://attack-defense-game.vercel.app`)
2. Если видите "⚠️ Firebase не настроен" - это нормально, нужно добавить env vars
3. Если видите кнопки "Создать" и "Войти" - всё работает! ✅

---

## Redeploy после изменений

```bash
git add .
git commit -m "Fix bug"
git push

# Vercel автоматически задеплоит! (2-3 минуты)
```

---

## Если что-то не работает

### ❌ Ошибка: "Firebase not configured"
**Решение**: Проверьте Environment Variables на Vercel Dashboard
- Settings → Environment Variables
- Должны быть 4 переменные

### ❌ Ошибка: "Cannot read database"
**Решение**: 
- В Firebase Console включите Realtime Database
- Проверьте что `databaseURL` содержит `.firebaseio.com`

### ❌ Ошибка: "Deploy failed"
**Решение**:
- Проверьте консоль на Vercel Dashboard
- Обновите Next.js: `npm install next@latest`
- Попробуйте еще раз: `git push`

---

## После деплоя

- ✅ Поделитесь ссылкой с учениками
- ✅ Тестируйте на мобильных устройствах
- ✅ Используйте в классе!

**Готово! 🎉**
