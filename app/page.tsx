'use client'

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Data
const attacks = [
  { name: "Фишинг", layer: "Сотрудники", strength: 0.6 },
  { name: "Пароли", layer: "Приложение", strength: 0.5 },
  { name: "Уязвимость", layer: "Сервер", strength: 0.7 }
];

const defenses = [
  { name: "Обучение", layer: "Сотрудники", strength: 0.7 },
  { name: "2FA", layer: "Приложение", strength: 0.6 },
  { name: "Патчи", layer: "Сервер", strength: 0.65 }
];

export default function App() {
  const [role, setRole] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [choice, setChoice] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [timer, setTimer] = useState(30);

  const userId = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("uid");
    if (!id) {
      id = Math.random().toString(36).slice(2);
      localStorage.setItem("uid", id);
    }
    return id;
  }, []);

  const [state, setState] = useState<any>({
    redVotes: {},
    blueVotes: {},
    logs: [],
    score: { attack: 0, defense: 0 },
    round: 1
  });

  useEffect(() => {
    if (!roomId) return;
    return onValue(ref(db, "rooms/" + roomId), snap => {
      const data = snap.val();
      if (data) {
        setState(data);
        setHasVoted(false);
        setTimer(30);
      }
    });
  }, [roomId]);

  // ⏱️ Timer
  useEffect(() => {
    if (role !== "admin") return;

    if (timer <= 0) {
      resolveRound();
      return;
    }

    const t = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, role]);

  const createRoom = () => {
    const id = Math.random().toString(36).slice(2, 7);
    setRoomId(id);
    setConnected(true);

    set(ref(db, "rooms/" + id), {
      redVotes: {},
      blueVotes: {},
      logs: [],
      score: { attack: 0, defense: 0 },
      round: 1
    });
  };

  const submitVote = () => {
    if (!choice || hasVoted) return;
    const path = role === "red" ? "redVotes" : "blueVotes";
    set(ref(db, `rooms/${roomId}/${path}/${userId}`), choice);
    setHasVoted(true);
  };

  const countVotes = (votes: any) => {
    const res: any = {};
    Object.values(votes || {}).forEach((v: any) => {
      res[v.name] = (res[v.name] || 0) + 1;
    });
    return res;
  };

  const getWinner = (votes: any) => {
    const counts = countVotes(votes);
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  };

  const resolveRound = () => {
    const aName = getWinner(state.redVotes);
    const dName = getWinner(state.blueVotes);
    if (!aName || !dName) return;

    const attack = attacks.find(a => a.name === aName)!;
    const defense = defenses.find(d => d.name === dName)!;

    let chance = attack.strength;
    if (attack.layer === defense.layer) chance -= defense.strength;

    const success = Math.random() < Math.max(0, Math.min(1, chance));

    const log = `Раунд ${state.round}: ${aName} vs ${dName} → ${success ? "🔥 УСПЕХ" : "🛡️ ЗАЩИТА"}`;

    set(ref(db, `rooms/${roomId}`), {
      redVotes: {},
      blueVotes: {},
      logs: [log, ...state.logs],
      score: {
        attack: state.score.attack + (success ? 1 : 0),
        defense: state.score.defense + (!success ? 1 : 0)
      },
      round: state.round + 1
    });
  };

  // --- UI ---
  if (!connected) {
    return (
      <div className="p-6">
        <Button onClick={createRoom}>Создать игру</Button>
        <input value={roomId} onChange={e => setRoomId(e.target.value)} />
        <Button onClick={() => setConnected(true)}>Войти</Button>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="p-6">
        <h2>Комната: {roomId}</h2>
        <Button onClick={() => setRole("red")}>Red</Button>
        <Button onClick={() => setRole("blue")}>Blue</Button>
        <Button onClick={() => setRole("admin")}>Admin</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1>Раунд {state.round}</h1>
      <h2>⏱️ {timer}</h2>

      <div>
        🔴 {state.score.attack} | 🔵 {state.score.defense}
      </div>

      {(role === "red" || role === "blue") && (
        <>
          {(role === "red" ? attacks : defenses).map(a => (
            <Button key={a.name} onClick={() => setChoice(a)}>{a.name}</Button>
          ))}

          <Button disabled={!choice || hasVoted} onClick={submitVote}>
            {hasVoted ? "Голос принят" : "Голосовать"}
          </Button>
        </>
      )}

      {role === "admin" && (
        <>
          <Button onClick={resolveRound}>▶ Итог</Button>

          <div>
            <h3>Голоса атаки:</h3>
            {JSON.stringify(countVotes(state.redVotes))}

            <h3>Голоса защиты:</h3>
            {JSON.stringify(countVotes(state.blueVotes))}
          </div>
        </>
      )}

      <div>
        {state.logs.map((l: string, i: number) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
