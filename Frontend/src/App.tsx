import { useEffect, useState } from "react";

export default function Simulation() {
  const [message, setMessage] = useState("Loading...");
  const [data, setData] = useState<any>(null);

  // 🔹 Example: Fetch data from backend
  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then((resData) => {
        setMessage("Backend Connected ✅");
        setData(resData);
      })
      .catch(() => {
        setMessage("Failed to connect ❌");
      });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Simulation Page 🚀</h1>

      <p>Status: {message}</p>

      {/* Show backend data */}
      {data && (
        <div>
          <h3>Backend Response:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      {/* Dummy simulation UI */}
      <div style={{ marginTop: "20px" }}>
        <h2>Simulation Controls</h2>

        <button onClick={() => alert("Simulation Started")}>
          ▶ Start Simulation
        </button>

        <button
          onClick={() => alert("Simulation Stopped")}
          style={{ marginLeft: "10px" }}
        >
          ⏹ Stop Simulation
        </button>
      </div>
    </div>
  );
}