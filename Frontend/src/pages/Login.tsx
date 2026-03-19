import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  // ✅ Validation
  const validate = (): boolean => {
    const e: Partial<LoginForm> = {};

    if (!form.username.trim()) {
      e.username = "Username is required";
    }

    if (!form.password || form.password.length < 6) {
      e.password = "Password must be at least 6 characters";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ✅ Handle Login
  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setApiError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", form.username);
      formData.append("password", form.password);

      const response = await fetch("http://127.0.0.1:8000/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        setApiError(err.detail || "Invalid username or password");
        setLoading(false);
        return;
      }

      const data = await response.json();

      localStorage.setItem("token", data.access_token);

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate("/simulation");
      }, 1500);

    } catch (error) {
      setApiError("Cannot connect to server. Make sure backend is running.");
      setLoading(false);
    }
  };

  // ✅ Input handler
  const handleChange =
    (field: keyof LoginForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));

      setApiError("");
    };

  return (
    <div className={styles.container}>
      <h2>Login</h2>

      <input
        type="text"
        placeholder="Username"
        value={form.username}
        onChange={handleChange("username")}
        className={errors.username ? styles.errorInput : ""}
      />
      {errors.username && <p className={styles.error}>{errors.username}</p>}

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange("password")}
        className={errors.password ? styles.errorInput : ""}
      />
      {errors.password && <p className={styles.error}>{errors.password}</p>}

      {apiError && <p className={styles.error}>{apiError}</p>}
      {success && <p className={styles.success}>Login successful!</p>}

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Loading..." : "Login"}
      </button>

      <p>
        Don't have an account?{" "}
        <span onClick={() => navigate("/register")} style={{ color: "blue", cursor: "pointer" }}>
          Register
        </span>
      </p>
    </div>
  );
}