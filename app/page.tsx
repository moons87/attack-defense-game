'use client'

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Firebase
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, push } from "firebase/database";

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
  { name: "Фишинг", layer: "Қызметкерлер", strength: 0.6 },
  { name: "Құпиясөзді іріктеу", layer: "Қосымша", strength: 0.5 },
  { name: "Осалдық", layer: "Сервер", strength: 0.7 },
  { name: "Деректерге қол жеткізу", layer: "Деректер базасы", strength: 0.8 }
];

const defenses = [
  { name: "Оқыту", layer: "Қызметкерлер", strength: 0.7 },
  { name: "Аутентификация", layer: "Қосымша", strength: 0.6 },
  { name: "Жаңартулар", layer: "Сервер", strength: 0.65 },
  { name: "Қолжетімділікті басқару", layer: "Деректер базасы", strength: 0.75 }
];

interface GameState {
  redVotes: Record<string, any>;
  blueVotes: Record<string, any>;
  logs: string[];
  hp: number;
  round: number;
  votingEndsAt?: number;
  players?: Record<string, {name: string, role: string}>;
  lastBattle?: {
    attackName: string;
    defenseName: string;
    success: boolean;
    timestamp: number;
  };
}

export default function App() {
  const [role, setRole] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [userId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [timeLeft, setTimeLeft] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [animatingBattle, setAnimatingBattle] = useState(false);
  const [showBattleResult, setShowBattleResult] = useState(false);
  const isResolving = useRef(false);

  const [choice, setChoice] = useState<any>(null);

  const [gameState, setGameState] = useState<GameState>({
    redVotes: {},
    blueVotes: {},
    logs: [],
    hp: 100,
    round: 1,
    votingEndsAt: 0,
    players: {}
  });

  if (!isFirebaseConfigured) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-900 font-bold mb-2">⚠️ Қате: Firebase бапталмаған</h2>
        <p className="text-red-700 text-sm mb-3">Қосымша жұмыс істеуі үшін Firebase орта айнымалыларын қосу керек:</p>
        <code className="bg-red-100 p-2 rounded text-xs block">
          NEXT_PUBLIC_FIREBASE_API_KEY<br/>
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN<br/>
          NEXT_PUBLIC_FIREBASE_DATABASE_URL<br/>
          NEXT_PUBLIC_FIREBASE_PROJECT_ID
        </code>
        <p className="text-red-700 text-sm mt-3">Бұл мәндерді <code className="bg-red-100 px-1">.env.local</code> файлына қосыңыз</p>
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

  useEffect(() => {
    if (!gameState.votingEndsAt) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((gameState.votingEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.votingEndsAt]);

  useEffect(() => {
    if (gameState.lastBattle) {
      const timeSince = Date.now() - gameState.lastBattle.timestamp;
      if (timeSince < 4000) {
        setAnimatingBattle(true);
        setShowBattleResult(false);
        
        const resultTimer = setTimeout(() => {
          setShowBattleResult(true);
        }, Math.max(0, 1500 - timeSince));

        const endTimer = setTimeout(() => {
          setAnimatingBattle(false);
        }, 4000 - timeSince);
        
        return () => {
          clearTimeout(resultTimer);
          clearTimeout(endTimer);
        };
      } else {
        setAnimatingBattle(false);
      }
    }
  }, [gameState.lastBattle]);

  // Автоматическое подведение итогов по истечении таймера
  useEffect(() => {
    if (role === "admin" && timeLeft === 0 && (gameState.votingEndsAt || 0) > 0) {
      if (Date.now() < (gameState.votingEndsAt || 0)) return; // таймер әлі аяқталмаған
      if (isResolving.current) return;
      isResolving.current = true;
      resolveRound();
    } else if ((gameState.votingEndsAt || 0) === 0) {
      isResolving.current = false;
    }
  }, [timeLeft, role, gameState.votingEndsAt]);

  const createRoom = () => {
    if (!db) {
      alert("Firebase инициализацияланбаған. .env.local тексеріңіз");
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
        hp: 100,
        round: 1,
        votingEndsAt: 0,
        players: {}
      }).catch((error) => {
        console.error("Бөлме құру қатесі:", error);
        alert("Бөлме құру мүмкін болмады: " + error.message);
      });
    } catch (error: any) {
      console.error("Қате:", error);
      alert("Қате: " + error.message);
    }
  };

  const joinRoom = () => {
    if (!db) {
      alert("Firebase инициализацияланбаған. .env.local тексеріңіз");
      return;
    }
    if (!roomId) return;
    setConnected(true);
  };

  const submitVote = () => {
    if (!choice || timeLeft <= 0) return;
    if (!db) {
      alert("Firebase инициализацияланбаған");
      return;
    }

    const path = role === "red" ? "redVotes" : "blueVotes";
    const hasVoted = role === 'red' ? !!(gameState.redVotes || {})[userId] : !!(gameState.blueVotes || {})[userId];
    if (hasVoted) return;

    set(ref(db, `rooms/${roomId}/${path}/${userId}`), choice).catch((error) => {
      console.error("Дауыс жіберу қатесі:", error);
      alert("Дауыс жіберу мүмкін болмады: " + error.message);
    });
  };

  const startVoting = () => {
    if (!db) return;
    set(ref(db, `rooms/${roomId}/votingEndsAt`), Date.now() + 30000);
    set(ref(db, `rooms/${roomId}/redVotes`), {});
    set(ref(db, `rooms/${roomId}/blueVotes`), {});
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
      alert("Firebase инициализацияланбаған");
      return;
    }

    let attackName = getWinner(gameState.redVotes);
    let defenseName = getWinner(gameState.blueVotes);

    if (!attackName) {
      attackName = attacks[Math.floor(Math.random() * attacks.length)].name;
    }
    if (!defenseName) {
      defenseName = defenses[Math.floor(Math.random() * defenses.length)].name;
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

    const log = `Раунд ${gameState.round || 1} | 🎯 ${attack.name} vs ${defense.name} → ${success ? "✅ СӘТТІЛІК (-20 HP)" : "🛡️ ҚОРҒАНЫС"}`;
    const newHp = success ? Math.max(0, (gameState.hp || 100) - 20) : (gameState.hp || 100);

    update(ref(db, `rooms/${roomId}`), {
      redVotes: null,
      blueVotes: null,
      logs: [log, ...(gameState.logs || [])],
      hp: newHp,
      round: (gameState.round || 1) + 1,
      votingEndsAt: 0,
      lastBattle: {
        attackName: attack.name,
        defenseName: defense.name,
        success: success,
        timestamp: Date.now()
      }
    }).catch((error) => {
      console.error("Қорытындылау қатесі:", error);
      alert("Қорытындылау мүмкін болмады: " + error.message);
    });
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">🎮 Шабуыл және Қорғаныс</h1>
          <p className="text-gray-600 text-center mb-6">Киберқауіпсіздік сабақтарына арналған интерактивті ойын</p>
          
          <div className="space-y-4">
            <Button onClick={createRoom} className="w-full bg-green-600 hover:bg-green-700">
              ✨ Жаңа бөлме құру
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">немесе</span>
              </div>
            </div>

            <div>
              <input 
                placeholder="Бөлме коды..."
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button onClick={joinRoom} className="w-full">
              📍 Бөлмеге кіру
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectRole = (selectedRole: string) => {
    if (!playerName.trim() && selectedRole !== "admin") {
      alert("Өтінеміз, атыңызды енгізіңіз");
      return;
    }
    setRole(selectedRole);
    if (selectedRole !== "admin" && db) {
      set(ref(db, `rooms/${roomId}/players/${userId}`), {
        name: playerName.trim(),
        role: selectedRole
      });
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-2 text-center text-indigo-600">Бөлме: {roomId}</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Сіздің атыңыз:</label>
            <input 
              type="text"
              placeholder="Атыңызды енгізіңіз..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <p className="text-gray-600 text-center mb-4">Рөлді таңдаңыз:</p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => selectRole("red")} 
              className="w-full bg-red-600 hover:bg-red-700"
            >
              🔴 Шабуылдаушы (Қызыл команда)
            </Button>
            <Button 
              onClick={() => selectRole("blue")} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              🔵 Қорғаушы (Көк команда)
            </Button>
            <div className="pt-4 border-t border-gray-200 mt-4">
              <Button 
                onClick={() => selectRole("admin")} 
                className="w-full bg-purple-600 hover:bg-purple-700"
                variant="outline"
              >
                👨‍🏫 Мұғалім (Әкімші)
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (animatingBattle && gameState.lastBattle) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 text-white p-4">
        <h2 className="text-4xl font-bold mb-12 animate-pulse text-indigo-400">⚡ Қорытындылау ⚡</h2>
        
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-4xl mb-12 space-y-8 md:space-y-0">
          <div className="text-center flex-1 w-full">
            <p className="text-red-500 text-2xl font-bold mb-4">🔴 Шабуыл</p>
            <div className="bg-red-900 bg-opacity-50 border-2 border-red-500 p-6 rounded-lg text-3xl font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              {gameState.lastBattle.attackName}
            </div>
          </div>
          
          <div className="text-6xl font-black text-yellow-500 mx-8">VS</div>
          
          <div className="text-center flex-1 w-full">
            <p className="text-blue-500 text-2xl font-bold mb-4">🔵 Қорғаныс</p>
            <div className="bg-blue-900 bg-opacity-50 border-2 border-blue-500 p-6 rounded-lg text-3xl font-bold shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              {gameState.lastBattle.defenseName}
            </div>
          </div>
        </div>

        <div className="h-24 flex items-center justify-center transition-opacity duration-500" style={{ opacity: showBattleResult ? 1 : 0 }}>
             {gameState.lastBattle.success ? (
               <div className="text-4xl md:text-5xl font-black text-center text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">❌ СӘТТІ БҰЗУ (-20 HP)</div>
             ) : (
               <div className="text-4xl md:text-5xl font-black text-center text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">🛡️ ШАБУЫЛ ҚАЙТАРЫЛДЫ</div>
             )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-600 mb-4 md:mb-0">🎮 Шабуыл және Қорғаныс <span className="text-gray-500 text-xl ml-2">| Раунд {gameState.round || 1}</span></h1>
          
          <div className="flex flex-col items-center md:items-end">
             <span className="font-bold mb-1 text-gray-700">Компания денсаулығы (HP)</span>
             <div className="w-64 bg-gray-200 rounded-full h-8 border-2 border-gray-300 overflow-hidden relative shadow-inner">
               <div 
                 className={`h-full transition-all duration-1000 ${
                   (gameState.hp || 0) > 50 ? 'bg-green-500' : (gameState.hp || 0) > 20 ? 'bg-yellow-500' : 'bg-red-500'
                 }`} 
                 style={{ width: `${Math.max(0, Math.min(100, gameState.hp || 0))}%` }}
               ></div>
               <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 drop-shadow-md">
                 {gameState.hp || 0} / 100
               </span>
             </div>
          </div>
        </div>
        
        <div className="text-center mb-6 p-3 bg-white rounded-lg border-2 border-indigo-300 shadow-sm flex flex-col sm:flex-row justify-center items-center sm:space-x-8">
          <div>
            <p className="text-sm text-gray-600">Бөлме коды:</p>
            <p className="text-2xl font-bold text-indigo-600">{roomId}</p>
          </div>
          {(gameState.votingEndsAt || 0) > 0 && (
            <div className="mt-2 sm:mt-0 sm:border-l-2 sm:border-indigo-100 sm:pl-8">
              <p className="text-sm text-gray-600">Дауыс беруге қалған уақыт:</p>
              <p className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-indigo-600'}`}>00:{timeLeft.toString().padStart(2, '0')}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {(role === "red" || role === "blue") && (
              <Card className="bg-white">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">
                    {role === "red" ? "🔴 Шабуыл таңда" : "🔵 Қорғанысты таңда"}
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
                          <div className="text-xs opacity-75">{item.layer} (күш: {item.strength})</div>
                        </div>
                      </Button>
                    ))}
                  </div>

                  {(() => {
                    const hasVoted = role === 'red' ? !!(gameState.redVotes || {})[userId] : !!(gameState.blueVotes || {})[userId];
                    return (
                      <Button
                        onClick={submitVote}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={!choice || hasVoted || timeLeft <= 0}
                      >
                        {hasVoted ? "✅ Дауыс қабылданды" : timeLeft <= 0 ? "⏳ Дауыс беру жабылды" : "✅ Дауыс беру"}
                      </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {role === "admin" && (
              <Card className="bg-white border-2 border-purple-300">
                <CardContent className="p-6">
                  <Button
                    onClick={startVoting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3 mb-3"
                  >
                    ⏱️ Дауыс беруді бастау (30с)
                  </Button>

                  <Button
                    onClick={resolveRound}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
                  >
                    ▶️ Раунд қорытындысын шығару
                  </Button>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>🔴 Шабуыл дауыстары: {Object.keys(gameState.redVotes || {}).length}</p>
                    <p>🔵 Қорғаныс дауыстары: {Object.keys(gameState.blueVotes || {}).length}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">📋 Ойын тарихы</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(gameState.logs || []).length === 0 ? (
                    <p className="text-gray-400">Ойын енді басталды...</p>
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

          <div className="lg:col-span-1">
            <Card className="bg-white sticky top-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <span className="mr-2">👥</span> Лобби
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-red-600 mb-2 border-b border-red-200 pb-1 flex justify-between">
                      <span>🔴 Шабуылдаушылар</span>
                      <span>{Object.values(gameState.players || {}).filter(p => p.role === 'red').length}</span>
                    </h3>
                    <ul className="text-sm space-y-2">
                      {Object.values(gameState.players || {}).filter(p => p.role === 'red').map((p, i) => (
                        <li key={i} className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0"></div>
                          <span className="truncate">{p.name}</span>
                        </li>
                      ))}
                      {Object.values(gameState.players || {}).filter(p => p.role === 'red').length === 0 && (
                        <li className="text-gray-400 italic">Ойыншылар жоқ</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-600 mb-2 border-b border-blue-200 pb-1 flex justify-between">
                      <span>🔵 Қорғаушылар</span>
                      <span>{Object.values(gameState.players || {}).filter(p => p.role === 'blue').length}</span>
                    </h3>
                    <ul className="text-sm space-y-2">
                      {Object.values(gameState.players || {}).filter(p => p.role === 'blue').map((p, i) => (
                        <li key={i} className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 flex-shrink-0"></div>
                          <span className="truncate">{p.name}</span>
                        </li>
                      ))}
                      {Object.values(gameState.players || {}).filter(p => p.role === 'blue').length === 0 && (
                        <li className="text-gray-400 italic">Ойыншылар жоқ</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
