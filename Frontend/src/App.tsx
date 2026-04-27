import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Simulation from "./pages/Simulation";
import LandingPage from "./pages/LandingPage";
import LiveIoT from "./pages/LiveIoT";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgotPassword";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerIoT from "./pages/ManagerIoT";
import Calculator from "./pages/Calculator";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/iot" element={<ManagerIoT />} />
        <Route path="/simulation" element={<Simulation />} />
        <Route path="/iot-live" element={<LiveIoT />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
