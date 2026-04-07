from math import sqrt, exp, pi, cos, radians
from typing import Dict, Any, Optional


# ─── Constants ────────────────────────────────────────────────────────────────
Rd = 287.05   # J/(kg·K)  dry air gas constant
Rv = 461.5    # J/(kg·K)  water vapour gas constant
K  = 0.04     # calibration constant for temp-gradient → velocity (adjust experimentally)


# ─── Core physics ─────────────────────────────────────────────────────────────

def saturation_vapor_pressure(T_kelvin: float) -> float:
    """Magnus formula — returns Psat in Pa."""
    T = T_kelvin - 273.15
    return 610.78 * exp((17.27 * T) / (T + 237.3))


def air_density(T_kelvin: float, P_total: float, humidity_pct: float) -> float:
    """
    Humidity-corrected air density (kg/m³).
    ρ = Pd/(Rd·T) + Pv/(Rv·T)
    """
    RH   = humidity_pct / 100.0
    Psat = saturation_vapor_pressure(T_kelvin)
    Pv   = RH * Psat
    Pd   = P_total - Pv
    return (Pd / (Rd * T_kelvin)) + (Pv / (Rv * T_kelvin))


def velocity_from_temp_gradient(T1: float, T2: float, rho: float,
                                 k: float = K) -> float:
    """
    Estimate air velocity from temperature gradient (no pressure sensor).
    v = sqrt(2·k·(T1 - T2) / ρ)
    Returns 0 if ΔT ≤ 0.
    """
    delta = T1 - T2
    if delta <= 0 or rho <= 0:
        return 0.0
    return sqrt((2 * k * delta) / rho)


def airflow(velocity: float, diameter_m: float) -> float:
    """Volumetric flow rate Q = A · v  (m³/s)."""
    A = pi * (diameter_m / 2) ** 2
    return A * velocity


def mass_flow_rate(rho: float, Q: float) -> float:
    """ṁ = ρ · Q  (kg/s)."""
    return rho * Q


def dynamic_pressure(rho: float, v: float) -> float:
    """q = ½ρv²  (Pa)."""
    return 0.5 * rho * v * v


def reynolds_number(rho: float, v: float, D: float,
                    mu: Optional[float] = None) -> float:
    """Re = ρvD/μ.  μ estimated from Sutherland if not provided."""
    if mu is None:
        mu = dynamic_viscosity(273.15)   # fallback
    if mu == 0 or D == 0:
        return 0.0
    return (rho * v * D) / mu


def dynamic_viscosity(T_kelvin: float) -> float:
    """Sutherland's law — returns μ in Pa·s."""
    mu0, T0, S = 1.716e-5, 273.15, 110.4
    return mu0 * ((T_kelvin / T0) ** 1.5) * ((T0 + S) / (T_kelvin + S))


def velocity_components(v: float, theta_deg: float = 0.0,
                         phi_deg: float = 0.0) -> Dict[str, float]:
    """
    Decompose scalar velocity into 3-D components.
    theta = azimuth (horizontal angle from x-axis)
    phi   = elevation angle from horizontal plane
    """
    theta = radians(theta_deg)
    phi   = radians(phi_deg)
    return {
        "vx": round(v * cos(phi) * cos(theta), 6),
        "vy": round(v * cos(phi) * cos(radians(90 - theta_deg)), 6),
        "vz": round(v * cos(radians(90 - phi_deg)), 6),
    }


# ─── Main entry point (called from /iot/data and /simulations) ───────────────

def compute_iot_physics(
    temperature: float,          # °C  (inside / T1)
    temperature_outside: float,  # °C  (outside / T2) — can equal temperature if unknown
    humidity: float,             # %
    pressure: float = 101325.0,  # Pa  (total atmospheric)
    pipe_diameter_m: float = 0.05,  # m  (default 5 cm pipe)
    flow_angle_deg: float = 0.0,
    k_calibration: float = K,
) -> Dict[str, Any]:
    """
    Full physics pipeline from raw sensor readings.
    Returns a dict of all derived quantities.
    """
    T1 = temperature + 273.15
    T2 = temperature_outside + 273.15

    rho  = air_density(T1, pressure, humidity)
    mu   = dynamic_viscosity(T1)
    v    = velocity_from_temp_gradient(T1, T2, rho, k_calibration)
    Q    = airflow(v, pipe_diameter_m)
    mdot = mass_flow_rate(rho, Q)
    q    = dynamic_pressure(rho, v)
    Re   = reynolds_number(rho, v, pipe_diameter_m, mu)
    regime = "laminar" if Re < 2300 else ("transition" if Re < 4000 else "turbulent")
    vcomp = velocity_components(v, flow_angle_deg)

    return {
        # inputs echoed
        "temperature_C":      round(temperature, 3),
        "temperature_out_C":  round(temperature_outside, 3),
        "humidity_pct":       round(humidity, 3),
        "pressure_Pa":        round(pressure, 2),
        # derived
        "air_density_kg_m3":  round(rho, 5),
        "dynamic_viscosity":  round(mu, 8),
        "velocity_m_s":       round(v, 4),
        "airflow_m3_s":       round(Q, 6),
        "mass_flow_kg_s":     round(mdot, 6),
        "dynamic_pressure_Pa":round(q, 4),
        "reynolds_number":    round(Re, 1),
        "flow_regime":        regime,
        "velocity_components": vcomp,
    }


# ─── Legacy Monte-Carlo (kept for /simulations endpoint) ─────────────────────

def run_simulation(parameters: Dict[str, Any]) -> Dict[str, Any]:
    import numpy as np
    iterations = parameters.get("iterations", 1000)
    mean       = parameters.get("mean", 0)
    std_dev    = parameters.get("std_dev", 1)
    data = np.random.normal(mean, std_dev, iterations)
    return {
        "mean":        float(np.mean(data)),
        "median":      float(np.median(data)),
        "std_dev":     float(np.std(data)),
        "min":         float(np.min(data)),
        "max":         float(np.max(data)),
        "data_points": data.tolist()[:100],
    }
