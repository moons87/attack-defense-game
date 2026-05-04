# 🎮 Атака и Защита - Интерактивная игра для уроков кибербезопасности

Это многопользовательская игра для обучения основам кибербезопасности. Идеально подходит для проведения интерактивных уроков.

## 🎯 Возможности

- **Real-time синхронизация** через Firebase
- **Две команды**: Атакующие (Red Team) и Защитники (Blue Team)
- **Роль учителя**: для управления ходом игры
- **История игры**: логирование всех атак и защит
- **Система очков**: отслеживание побед каждой команды

## 📋 Требования

- Node.js 16+ 
- Firebase Realtime Database
- Git (для деплоя на Vercel)

## 🚀 Быстрый старт

### 1. Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

### 2. Настройка Firebase

1. Перейти на [Firebase Console](https://console.firebase.google.com)
2. Создать новый проект
3. Включить Realtime Database
4. Скопировать конфиг и добавить в `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=ххх
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## 🌐 Деплой на Vercel

### Вариант 1: Через Vercel Dashboard

1. **Пушь проект на GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/attack-defense-game
   git push -u origin main
   ```

2. **Откройте [vercel.com](https://vercel.com)**
   - Нажмите "New Project"
   - Выберите репозиторий
   - На этапе "Environment Variables" добавьте:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Нажмите "Deploy"

### Вариант 2: Через CLI

```bash
npm install -g vercel
vercel login
vercel
```

Следуйте инструкциям и добавьте переменные окружения.

## 🎮 Как играть на уроке

### Подготовка

1. Откройте приложение на проекторе (создайте новую комнату)
2. Раздайте код комнаты ученикам
3. Распределите учеников на две команды: Атаку и Защиту

### Ход игры

**Red Team (Атакующие)**
- Выбирают одну атаку
- Голосуют за нее

**Blue Team (Защитники)**
- Выбирают одну защиту  
- Голосуют за нее

**Учитель (Admin)**
- Нажимает "Подвести итог раунда"
- Система автоматически:
  - Определяет победителей голосования в каждой команде
  - Рассчитывает вероятность успеха атаки
  - Объявляет результат (УСПЕХ или ЗАЩИТА)
  - Обновляет счет

## 📊 Система атак и защит

### Атаки (Red Team)
- **Фишинг** → Слой: Сотрудники (Strength: 0.6)
- **Подбор пароля** → Слой: Приложение (Strength: 0.5)
- **Уязвимость** → Слой: Сервер (Strength: 0.7)
- **Доступ к данным** → Слой: БД (Strength: 0.8)

### Защиты (Blue Team)
- **Обучение** → Слой: Сотрудники (Strength: 0.7)
- **Аутентификация** → Слой: Приложение (Strength: 0.6)
- **Обновления** → Слой: Сервер (Strength: 0.65)
- **Контроль доступа** → Слой: БД (Strength: 0.75)

## 🔧 Технический стек

- **Frontend**: React 18, Next.js 14, Tailwind CSS
- **Backend**: Firebase Realtime Database
- **Deployment**: Vercel

## 📝 Структура проекта

```
.
├── app/
│   ├── layout.tsx        # Основной layout
│   ├── page.tsx          # Главная игра
│   └── globals.css       # Глобальные стили
├── components/
│   └── ui/
│       ├── card.tsx      # Card компонент
│       └── button.tsx    # Button компонент
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── .env.local
```

## 🛡️ Безопасность

- Все Firebase конфиги - **публичные** (начинаются с `NEXT_PUBLIC_`)
- Используется только Realtime Database (без аутентификации)
- Для боевого использования рекомендуется добавить Firebase Auth

## 📧 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера (F12)
2. Убедитесь, что Firebase конфиг верный
3. Проверьте, что Database URL содержит `.firebaseio.com`

## 📜 Лицензия

MIT
