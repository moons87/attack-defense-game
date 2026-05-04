'use client'

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Firebase
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
};

const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.databaseURL;

let db: any = null;
if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

// --- Данные ---
const attacks = [
  { name: "Фишинг", layer: "Сотрудники", strength: 0.6 },
  { name: "Подбор пароля", layer: "Приложение", strength: 0.5 },
  { name: "Уязвимость", layer: "Сервер", strength: 0.7 },
  { name: "Доступ к данным", layer: "База данных", strength: 0.8 }
];

const defenses = [
  { name: "Обучение", layer: "Сотрудники", strength: 0.7 },
  { name: "Аутентификация", layer: "Приложение", strength: 0.6 },
  { name: "Обновления", layer: "Сервер", strength: 0.65 },
  { name: "Контроль доступа", layer: "База данных", strength: 0.75 }
];

interface GameState {
  redVotes: Record<string, any>;
  blueVotes: Record<string, any>;
  logs: string[];
  score: { attack: number; defense: number };
}

export default function App() {
  const [role, setRole] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);

  const [choice, setChoice] = useState<any>(null);

  const [gameState, setGameState] = useState<GameState>({
    redVotes: {},
    blueVotes: {},
    logs: [],
    score: { attack: 0, defense: 0 }
  });

  if (!isFirebaseConfigured) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-900 font-bold mb-2">⚠️ Ошибка: Firebase не настроен</h2>
        <p className="text-red-700 text-sm mb-3">Для работы приложения нужно добавить Firebase переменные окружения:</p>
        <code className="bg-red-100 p-2 rounded text-xs block">
          NEXT_PUBLIC_FIREBASE_API_KEY<br/>
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN<br/>
          NEXT_PUBLIC_FIREBASE_DATABASE_URL<br/>
          NEXT_PUBLIC_FIREBASE_PROJECT_ID
        </code>
        <p className="text-red-700 text-sm mt-3">Добавь эти значения в файл <code className="bg-red-100 px-1">.env.local</code></p>
      </div>
    );
  }

  useEffect(() => {
    if (!roomId || !db) return;

    let isMounted = true;
    const roomRef = ref(db, "rooms/" + roomId);

    const unsubscribe = onValue(roomRef, (snap) => {
      if (isMounted) {
        const data = snap.val();
        if (data) setGameState(data);
      }
    }, (error) => {
      if (isMounted) {
        console.error("Firebase error:", error);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomId]);

  const createRoom = () => {
    if (!db) {
      alert("Firebase не инициализирован. Проверь .env.local");
      return;
    }
    
    try {
      const id = Math.random().toString(36).substring(2, 7);
      setRoomId(id);
      setConnected(true);

      set(ref(db, "rooms/" + id), {
        redVotes: {},
        blueVotes: {},
        logs: [],
        score: { attack: 0, defense: 0 }
      }).catch((error) => {
        console.error("Ошибка создания комнаты:", error);
        alert("Не удалось создать комнату: " + error.message);
      });
    } catch (error: any) {
      console.error("Ошибка:", error);
      alert("Ошибка: " + error.message);
    }
  };

  const joinRoom = () => {
    if (!db) {
      alert("Firebase не инициализирован. Проверь .env.local");
      return;
    }
    if (!roomId) return;
    setConnected(true);
  };

  const submitVote = () => {
    if (!choice) return;
    if (!db) {
      alert("Firebase не инициализирован");
      return;
    }

    const path = role === "red" ? "redVotes" : "blueVotes";

    push(ref(db, `rooms/${roomId}/${path}`), choice).catch((error) => {
      console.error("Ошибка отправки голоса:", error);
      alert("Не удалось отправить голос: " + error.message);
    });
    setChoice(null);
  };

  const getWinner = (votes: Record<string, any>) => {
    const count: Record<string, number> = {};

    Object.values(votes || {}).forEach((v: any) => {
      count[v.name] = (count[v.name] || 0) + 1;
    });

    let winner = null;
    let max = 0;

    Object.keys(count).forEach((k) => {
      if (count[k] > max) {
        max = count[k];
        winner = k;
      }
    });

    return winner;
  };

  const resolveRound = () => {
    if (!db) {
      alert("Firebase не инициализирован");
      return;
    }

    const attackName = getWinner(gameState.redVotes);
    const defenseName = getWinner(gameState.blueVotes);

    if (!attackName || !defenseName) {
      alert("Обе команды должны сделать выбор!");
      return;
    }

    const attack = attacks.find((a) => a.name === attackName);
    const defense = defenses.find((d) => d.name === defenseName);

    if (!attack || !defense) return;

    let chance = attack.strength;
    if (attack.layer === defense.layer) {
      chance -= defense.strength;
    }

    chance = Math.max(0, Math.min(1, chance));

    const roll = Math.random();
    const success = roll < chance;

    const log = `🎯 ${attack.name} vs ${defense.name} → ${success ? "✅ УСПЕХ" : "🛡️ ЗАЩИТА"}`;

    set(ref(db, `rooms/${roomId}`), {
      redVotes: {},
      blueVotes: {},
      logs: [log, ...(gameState.logs || [])],
      score: {
        attack: gameState.score.attack + (success ? 1 : 0),
        defense: gameState.score.defense + (!success ? 1 : 0)
      }
    }).catch((error) => {
      console.error("Ошибка при подведении итога:", error);
      alert("Не удалось подвести итог: " + error.message);
    });
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">🎮 Атака и Защита</h1>
          <p className="text-gray-600 text-center mb-6">Интерактивная игра для уроков кибербезопасности</p>
          
          <div className="space-y-4">
            <Button onClick={createRoom} className="w-full bg-green-600 hover:bg-green-700">
              ✨ Создать новую комнату
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">или</span>
              </div>
            </div>

            <div>
              <input 
                placeholder="Код комнаты..."
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button onClick={joinRoom} className="w-full">
              📍 Войти в комнату
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-2 text-center text-indigo-600">Комната: {roomId}</h2>
          <p className="text-gray-600 text-center mb-6">Выбери роль:</p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setRole("red")} 
              className="w-full bg-red-600 hover:bg-red-700"
            >
              🔴 Атакующий (Red Team)
            </Button>
            <Button 
              onClick={() => setRole("blue")} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              🔵 Защитник (Blue Team)
            </Button>
            <Button 
              onClick={() => setRole("admin")} 
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              👨‍🏫 Учитель (Admin)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-indigo-600">🎮 Атака и Защита</h1>
          <div className="text-lg font-semibold">
            <span className="text-red-600">🔴 {gameState.score.attack}</span>
            <span className="mx-4">-</span>
            <span className="text-blue-600">🔵 {gameState.score.defense}</span>
          </div>
        </div>
        
        <div className="text-center mb-4 p-2 bg-white rounded-lg border-2 border-indigo-300">
          <p className="text-sm text-gray-600">Код комнаты:</p>
          <p className="text-2xl font-bold text-indigo-600">{roomId}</p>
        </div>

        {(role === "red" || role === "blue") && (
          <Card className="mb-6 bg-white">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {role === "red" ? "🔴 Выбери атаку" : "🔵 Выбери защиту"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {(role === "red" ? attacks : defenses).map((item) => (
                  <Button 
                    key={item.name} 
                    onClick={() => setChoice(item)}
                    className={`text-left ${choice?.name === item.name ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                    variant={choice?.name === item.name ? 'default' : 'outline'}
                  >
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs opacity-75">{item.layer} (strength: {item.strength})</div>
                    </div>
                  </Button>
                ))}
              </div>

              <Button 
                onClick={submitVote}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={!choice}
              >
                ✅ Отправить голос
              </Button>
            </CardContent>
          </Card>
        )}

        {role === "admin" && (
          <Card className="mb-6 bg-white border-2 border-purple-300">
            <CardContent className="p-6">
              <Button 
                onClick={resolveRound}
                className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
              >
                ▶️ Подвести итог раунда
              </Button>
              <div className="mt-4 text-sm text-gray-600">
                <p>🔴 Голосов атаки: {Object.keys(gameState.redVotes || {}).length}</p>
                <p>🔵 Голосов защиты: {Object.keys(gameState.blueVotes || {}).length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">📋 История игры</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(gameState.logs || []).length === 0 ? (
                <p className="text-gray-400">Игра только начинается...</p>
              ) : (
                (gameState.logs || []).map((log, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded text-sm font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
