import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Firebase
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
};

const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.databaseURL;

let db = null;
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

export default function App() {
  const [role, setRole] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);

  const [choice, setChoice] = useState(null);

  const [gameState, setGameState] = useState({
    redVotes: {},
    blueVotes: {},
    logs: [],
    score: { attack: 0, defense: 0 }
  });

  if (!isFirebaseConfigured) {
    return <div className="p-6">⚠️ Настрой Firebase</div>;
  }

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, "rooms/" + roomId);

    return onValue(roomRef, (snap) => {
      const data = snap.val();
      if (data) setGameState(data);
    });
  }, [roomId]);

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 7);
    setRoomId(id);
    setConnected(true);

    set(ref(db, "rooms/" + id), {
      redVotes: {},
      blueVotes: {},
      logs: [],
      score: { attack: 0, defense: 0 }
    });
  };

  const joinRoom = () => {
    if (!roomId) return;
    setConnected(true);
  };

  const submitVote = () => {
    if (!choice) return;

    const path = role === "red" ? "redVotes" : "blueVotes";

    push(ref(db, `rooms/${roomId}/${path}`), choice);
  };

  const getWinner = (votes) => {
    const count = {};

    Object.values(votes || {}).forEach((v) => {
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
    const attackName = getWinner(gameState.redVotes);
    const defenseName = getWinner(gameState.blueVotes);

    if (!attackName || !defenseName) return;

    const attack = attacks.find((a) => a.name === attackName);
    const defense = defenses.find((d) => d.name === defenseName);

    let chance = attack.strength;
    if (attack.layer === defense.layer) {
      chance -= defense.strength;
    }

    chance = Math.max(0, Math.min(1, chance));

    const roll = Math.random();
    const success = roll < chance;

    const log = `🎯 ${attack.name} vs ${defense.name} → ${success ? "УСПЕХ" : "ЗАЩИТА"}`;

    set(ref(db, `rooms/${roomId}`), {
      redVotes: {},
      blueVotes: {},
      logs: [log, ...(gameState.logs || [])],
      score: {
        attack: gameState.score.attack + (success ? 1 : 0),
        defense: gameState.score.defense + (!success ? 1 : 0)
      }
    });
  };

  if (!connected) {
    return (
      <div className="p-6 flex flex-col gap-4 items-center">
        <Button onClick={createRoom}>Создать</Button>
        <input value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <Button onClick={joinRoom}>Войти</Button>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="p-6 flex flex-col gap-3 items-center">
        <div>Комната: {roomId}</div>
        <Button onClick={() => setRole("red")}>Red</Button>
        <Button onClick={() => setRole("blue")}>Blue</Button>
        <Button onClick={() => setRole("admin")}>Admin</Button>
      </div>
    );
  }

  return (
    <div className="p-6 grid gap-6">
      <div className="flex gap-4">
        <div>🔴 {gameState.score.attack}</div>
        <div>🔵 {gameState.score.defense}</div>
      </div>

      {(role === "red" || role === "blue") && (
        <Card>
          <CardContent className="p-4">
            <h2>{role === "red" ? "Атака" : "Защита"}</h2>

            {(role === "red" ? attacks : defenses).map((item) => (
              <Button key={item.name} onClick={() => setChoice(item)} className="m-1">
                {item.name}
              </Button>
            ))}

            <Button onClick={submitVote}>Голосовать</Button>
          </CardContent>
        </Card>
      )}

      {role === "admin" && (
        <Button onClick={resolveRound}>▶ Подвести итог</Button>
      )}

      <Card>
        <CardContent className="p-4">
          <h2>Логи</h2>
          {gameState.logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
