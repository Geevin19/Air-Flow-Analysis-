
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simulationAPI } from '../services/api';

export default function Simulation() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // -------- Structured raw inputs (for cylindrical air flow through a pipe) --------
  const materialRoughnessM: Record<string, number> = useMemo(
    () => ({
      // Typical absolute roughness values (order-of-magnitude). Users can always override.
      Steel: 0.000045,
      Copper: 0.0000015,
      PVC: 0.0000015,
      'Ductile Iron': 0.00026,
      'Galvanized Steel': 0.00015,
    }),
    [],
  );

  const [pipeLengthM, setPipeLengthM] = useState(10);
  const [pipeInnerDiameterM, setPipeInnerDiameterM] = useState(0.5);
  const [pipeMaterial, setPipeMaterial] = useState<string>('Steel');
  const [pipeAbsoluteRoughnessM, setPipeAbsoluteRoughnessM] = useState<number>(
    materialRoughnessM['Steel'],
  );

  const [airPropertyMode, setAirPropertyMode] = useState<'assume_tp' | 'explicit'>('assume_tp');
  const [airTemperatureC, setAirTemperatureC] = useState(20);
  const [airPressurePa, setAirPressurePa] = useState(101325);
  const [airDensityKgM3, setAirDensityKgM3] = useState(1.204);
  const [airDynamicViscosityPaS, setAirDynamicViscosityPaS] = useState(1.81e-5);

  const [volumetricFlowRateM3S, setVolumetricFlowRateM3S] = useState(0.25);
  const [minorLossKTotal, setMinorLossKTotal] = useState(0.5);
  const [includeMinorLosses, setIncludeMinorLosses] = useState(true);

  const [velocityProfileMode, setVelocityProfileMode] = useState<'auto_by_re' | 'laminar' | 'turbulent'>(
    'auto_by_re',
  );
  const [crossSectionSamples, setCrossSectionSamples] = useState(50); // user requested 50

  // -------- Derived preview computations (client-side) --------
  const computed = useMemo(() => {
    const D = pipeInnerDiameterM;
    const L = pipeLengthM;
    const Q = volumetricFlowRateM3S;
    const eps = pipeAbsoluteRoughnessM;
    const n = Math.max(3, Math.floor(crossSectionSamples));

    const validGeometry = Number.isFinite(D) && D > 0 && Number.isFinite(L) && L > 0;
    const validFlow = Number.isFinite(Q) && Q > 0;
    const validFluids =
      airPropertyMode === 'explicit'
        ? [airDensityKgM3, airDynamicViscosityPaS].every((x) => Number.isFinite(x) && x > 0)
        : Number.isFinite(airTemperatureC) &&
          Number.isFinite(airPressurePa) &&
          airTemperatureC > -273.15 &&
          airPressurePa > 0;

    if (!validGeometry || !validFlow || !validFluids) {
      return {
        isValid: false,
        D,
        L,
        Q,
        eps,
        n,
        rho: NaN,
        mu: NaN,
        area: NaN,
        Vavg: NaN,
        Re: NaN,
        frictionFactor: NaN,
        flowRegime: 'unknown' as 'laminar' | 'transition' | 'turbulent' | 'unknown',
        pressureDropPa: NaN,
        velocityProfile: [] as Array<{ rNorm: number; u: number }>,
      };
    }

    const area = Math.PI * Math.pow(D / 2, 2);
    const Vavg = Q / area;

    let rho = airDensityKgM3;
    let mu = airDynamicViscosityPaS;

    if (airPropertyMode === 'assume_tp') {
      // Simple ideal gas density + Sutherland viscosity for air.
      const T = airTemperatureC + 273.15;
      const R = 287.05; // J/(kg*K)
      rho = airPressurePa / (R * T);

      // Sutherland's law constants for air
      const mu0 = 1.716e-5; // Pa*s at T0
      const T0 = 273.15; // K
      const S = 111; // K
      mu = mu0 * ((T0 + S) / (T + S)) * Math.pow(T / T0, 1.5);
    }

    // Reynolds number (based on average velocity)
    const Re = (rho * Vavg * D) / mu;

    const flowRegime =
      Re < 2300 ? 'laminar' : Re <= 4000 ? ('transition' as const) : ('turbulent' as const);

    // Friction factor (Darcy-Weisbach) using laminar definition or Haaland correlation.
    let frictionFactor: number;
    if (Re < 2300) {
      frictionFactor = 64 / Re;
    } else {
      // Haaland: valid for turbulent flow with roughness.
      const relRough = eps / D;
      const term = Math.pow(relRough / 3.7, 1.11) + 6.9 / Re;
      frictionFactor = Math.pow(-1.8 * Math.log10(term), -2);
    }

    const dpMajor = frictionFactor * (L / D) * (rho * Math.pow(Vavg, 2) / 2);
    const dpMinor = includeMinorLosses ? minorLossKTotal * (rho * Math.pow(Vavg, 2) / 2) : 0;
    const pressureDropPa = dpMajor + dpMinor;

    const selectedProfile =
      velocityProfileMode === 'auto_by_re'
        ? flowRegime === 'laminar' || flowRegime === 'transition'
          ? 'laminar'
          : 'turbulent'
        : velocityProfileMode;

    const profile: Array<{ rNorm: number; u: number }> = [];

    // Build a normalized radial velocity profile (no swirl), sampled at evenly spaced r.
    // We scale each profile so that its cross-section average velocity matches Vavg.
    for (let i = 0; i < n; i++) {
      const rNorm = n === 1 ? 0 : i / (n - 1); // 0=centerline, 1=wall
      let u: number;

      if (selectedProfile === 'laminar') {
        // Fully developed laminar profile:
        // u(r) = umax * (1 - (r/R)^2), with average u_avg = umax/2 => umax = 2*u_avg
        const umax = 2 * Vavg;
        u = umax * (1 - Math.pow(rNorm, 2));
      } else {
        // Turbulent 1/7 power-law variant:
        // u(r) = umax * (1 - r/R)^(1/7), and for this form u_avg = umax*(49/60)
        // => umax = u_avg*(60/49)
        const umax = Vavg * (60 / 49);
        u = umax * Math.pow(1 - rNorm, 1 / 7);
      }

      // Numerical safety near the wall
      if (!Number.isFinite(u) || u < 0) u = 0;
      profile.push({ rNorm, u });
    }

    return {
      isValid: true,
      D,
      L,
      Q,
      eps,
      n,
      rho,
      mu,
      area,
      Vavg,
      Re,
      frictionFactor,
      flowRegime: flowRegime === 'transition' ? 'transition' : flowRegime,
      pressureDropPa,
      velocityProfile: profile,
      selectedProfile,
    };
  }, [
    airDynamicViscosityPaS,
    airDensityKgM3,
    airPressurePa,
    airPropertyMode,
    airTemperatureC,
    crossSectionSamples,
    includeMinorLosses,
    minorLossKTotal,
    pipeAbsoluteRoughnessM,
    pipeInnerDiameterM,
    pipeLengthM,
    velocityProfileMode,
    volumetricFlowRateM3S,
  ]);

  const generatedParameters = useMemo(() => {
    const D = pipeInnerDiameterM;
    const R = D / 2;

    // We include both user-provided and derived fields in the JSON so the backend can
    // use them immediately (even if it later improves its own computations).
    return {
      type: 'cylindrical_air_flow',
      pipe: {
        length_m: pipeLengthM,
        inner_diameter_m: D,
        inner_radius_m: R,
        material: pipeMaterial,
        absolute_roughness_m: pipeAbsoluteRoughnessM,
      },
      air: {
        property_mode: airPropertyMode,
        temperature_C: airTemperatureC,
        pressure_Pa: airPressurePa,
        density_kg_m3: computed.rho,
        dynamic_viscosity_Pa_s: computed.mu,
      },
      flow: {
        volumetric_flow_rate_m3_s: volumetricFlowRateM3S,
        average_velocity_m_s: computed.Vavg,
        reynolds_number: computed.Re,
        flow_regime: computed.flowRegime,
        velocity_profile_model: computed.isValid
          ? computed.selectedProfile
          : velocityProfileMode === 'laminar'
            ? 'laminar'
            : 'turbulent',
      },
      losses: {
        include_minor_losses: includeMinorLosses,
        minor_loss_K_total: minorLossKTotal,
        friction_factor_darcy: computed.frictionFactor,
        pressure_drop_Pa: computed.pressureDropPa,
      },
      cross_section: {
        samples: Math.max(3, Math.floor(crossSectionSamples)),
        // Helps backend map the radial sampling to expected array lengths.
      },
    };
  }, [
    airPropertyMode,
    airPressurePa,
    airTemperatureC,
    computed.flowRegime,
    computed.frictionFactor,
    computed.isValid,
    computed.mu,
    computed.pressureDropPa,
    computed.Re,
    computed.rho,
    computed.selectedProfile,
    computed.Vavg,
    crossSectionSamples,
    includeMinorLosses,
    minorLossKTotal,
    pipeAbsoluteRoughnessM,
    pipeInnerDiameterM,
    pipeLengthM,
    pipeMaterial,
    volumetricFlowRateM3S,
    velocityProfileMode,
  ]);

  const submit = async () => {
    setError(null);
    setResult(null);

    if (!name.trim()) {
      setError('Please enter a simulation name.');
      return;
    }

    const localPreview = {
      preview_type: 'cylindrical_air_flow',
      computed_at: new Date().toISOString(),
      metrics: {
        average_velocity_m_s: computed.Vavg,
        reynolds_number: computed.Re,
        friction_factor_darcy: computed.frictionFactor,
        pressure_drop_Pa: computed.pressureDropPa,
        flow_regime: computed.flowRegime,
        velocity_profile_model: computed.isValid ? computed.selectedProfile : velocityProfileMode,
      },
      velocity_profile: computed.velocityProfile,
      inputs: generatedParameters,
    };

    setSubmitting(true);
    try {
      const response = await simulationAPI.create({
        name: name.trim(),
        parameters: generatedParameters,
      });
      setResult({
        local_preview: localPreview,
        backend_response: response.data,
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to run simulation.');
      setResult({
        local_preview: localPreview,
        backend_error: e?.response?.data || { message: e?.message },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const localPreview = result?.local_preview;
  const backendResponse = result?.backend_response;

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <h1 style={styles.logo}>SmartTracker</h1>
          <span style={styles.badge}>Simulation • Pipe Inputs</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </nav>

      <main style={styles.main}>
        <div style={styles.hero}>
          <div style={styles.heroTitle}>Cylindrical Air Flow Simulator</div>
          <div style={styles.heroSubtitle}>
            Enter pipe + air + flow conditions, then review a live (client-side) realistic preview.
            Your JSON is still sent to the backend `POST /simulations`.
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2 style={styles.title}>Run Simulation</h2>
            <p style={styles.subtitle}>
              Enter pipe + air + flow parameters. The backend receives the computed JSON automatically.
            </p>

            <div style={styles.formRow}>
              <label style={styles.label}>Simulation name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ventilation - Baseline"
                style={styles.input}
              />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>Pipe Geometry</div>

              <div style={styles.twoCols}>
                  <RangeField
                    label="Length (m)"
                    value={pipeLengthM}
                    min={0.5}
                    max={30}
                    step={0.1}
                    formatValue={(v) => v.toFixed(1)}
                    onChange={(v) => setPipeLengthM(v)}
                  />
                  <RangeField
                    label="Inner diameter (m)"
                    value={pipeInnerDiameterM}
                    min={0.05}
                    max={0.8}
                    step={0.001}
                    formatValue={(v) => v.toFixed(3)}
                    onChange={(v) => setPipeInnerDiameterM(v)}
                  />
              </div>

              <div style={styles.twoCols}>
                <div style={styles.formRowSmall}>
                  <label style={styles.labelSm}>Material</label>
                  <select
                    value={pipeMaterial}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPipeMaterial(next);
                      const roughness = materialRoughnessM[next];
                      if (typeof roughness === 'number') setPipeAbsoluteRoughnessM(roughness);
                    }}
                    style={styles.input}
                  >
                    {Object.keys(materialRoughnessM).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRowSmall}>
                  <label style={styles.labelSm}>Abs. roughness (m)</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={pipeAbsoluteRoughnessM}
                    onChange={(e) => setPipeAbsoluteRoughnessM(parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.note}>
                Roughness is used for friction factor (Darcy-Weisbach).
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>Air Properties</div>

              <div style={styles.twoCols}>
                <div style={styles.formRowSmall}>
                  <label style={styles.labelSm}>Mode</label>
                  <select
                    value={airPropertyMode}
                    onChange={(e) => setAirPropertyMode(e.target.value as any)}
                    style={styles.input}
                  >
                    <option value="assume_tp">Assume from Temperature/Pressure</option>
                    <option value="explicit">Use Explicit Density/Viscosity</option>
                  </select>
                </div>
                <RangeField
                  label="Dynamic viscosity (Pa·s)"
                  value={airDynamicViscosityPaS}
                  min={1e-6}
                  max={5e-5}
                  step={1e-7}
                  disabled={airPropertyMode !== 'explicit'}
                  formatValue={(v) => v.toExponential(2)}
                  onChange={(v) => setAirDynamicViscosityPaS(v)}
                />
              </div>

              <div style={styles.twoCols}>
                <RangeField
                  label="Temperature (C)"
                  value={airTemperatureC}
                  min={-10}
                  max={60}
                  step={0.1}
                  disabled={airPropertyMode !== 'assume_tp'}
                  formatValue={(v) => v.toFixed(1)}
                  onChange={(v) => setAirTemperatureC(v)}
                />
                <RangeField
                  label="Pressure (Pa)"
                  value={airPressurePa}
                  min={50000}
                  max={200000}
                  step={500}
                  disabled={airPropertyMode !== 'assume_tp'}
                  formatValue={(v) => Math.round(v).toLocaleString()}
                  onChange={(v) => setAirPressurePa(v)}
                />
              </div>

              <RangeField
                label="Density (kg/m³)"
                value={airDensityKgM3}
                min={0.5}
                max={2.0}
                step={0.001}
                disabled={airPropertyMode !== 'explicit'}
                formatValue={(v) => v.toFixed(3)}
                onChange={(v) => setAirDensityKgM3(v)}
              />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>Flow Conditions</div>

              <div style={styles.twoCols}>
                <RangeField
                  label="Flow rate (m³/s)"
                  value={volumetricFlowRateM3S}
                  min={0.01}
                  max={2.5}
                  step={0.001}
                  formatValue={(v) => v.toFixed(3)}
                  onChange={(v) => setVolumetricFlowRateM3S(v)}
                />
                <div style={styles.formRowSmall}>
                  <label style={styles.labelSm}>Velocity profile model</label>
                  <select value={velocityProfileMode} onChange={(e) => setVelocityProfileMode(e.target.value as any)} style={styles.input}>
                    <option value="auto_by_re">Auto (by Reynolds)</option>
                    <option value="laminar">Laminar (parabolic)</option>
                    <option value="turbulent">Turbulent (1/7 power)</option>
                  </select>
                </div>
              </div>

              <div style={styles.twoCols}>
                <RangeField
                  label="Minor losses (K total)"
                  value={minorLossKTotal}
                  min={0}
                  max={10}
                  step={0.05}
                  disabled={!includeMinorLosses}
                  formatValue={(v) => v.toFixed(2)}
                  onChange={(v) => setMinorLossKTotal(v)}
                />
                <div style={styles.formRowSmall}>
                  <label style={styles.labelSm}>Include minor losses</label>
                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={includeMinorLosses}
                      onChange={(e) => setIncludeMinorLosses(e.target.checked)}
                    />
                    <span style={styles.checkboxText}>Yes</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>Cross-Section Sampling</div>

              <div style={styles.twoCols}>
                <RangeField
                  label="Samples across radius"
                  value={crossSectionSamples}
                  min={10}
                  max={120}
                  step={1}
                  formatValue={(v) => String(Math.round(v))}
                  onChange={(v) => setCrossSectionSamples(Math.round(v))}
                />
              </div>
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            <div style={styles.actions}>
              <button onClick={submit} style={styles.primaryButton} disabled={submitting}>
                {submitting ? 'Running...' : 'Run'}
              </button>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Live Preview (Client-Side)</h3>
            {!computed.isValid ? (
              <div style={styles.previewPlaceholder}>Enter valid pipe/air/flow inputs to see results.</div>
            ) : (
              <>
                <div style={styles.realtimeCanvasWrap}>
                  <RealTimeTubeSim
                    diameterM={computed.D}
                    lengthM={computed.L}
                    regime={computed.flowRegime}
                    velocityMps={computed.Vavg}
                    pressureDropPa={computed.pressureDropPa}
                    profileMode={
                      computed.selectedProfile || (computed.flowRegime === 'laminar' ? 'laminar' : 'turbulent')
                    }
                  />
                </div>
                <div style={styles.metricsGrid}>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Average velocity</div>
                    <div style={styles.metricValue}>
                      {isFinite(computed.Vavg) ? computed.Vavg.toFixed(4) : '—'} m/s
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Reynolds number</div>
                    <div style={styles.metricValue}>
                      {isFinite(computed.Re) ? computed.Re.toFixed(0) : '—'}
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Friction factor (Darcy)</div>
                    <div style={styles.metricValue}>
                      {isFinite(computed.frictionFactor) ? computed.frictionFactor.toFixed(5) : '—'}
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Pressure drop</div>
                    <div style={styles.metricValue}>
                      {isFinite(computed.pressureDropPa)
                        ? `${(computed.pressureDropPa / 1000).toFixed(3)} kPa`
                        : '—'}
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Flow regime</div>
                    <div style={styles.metricValue}>{computed.flowRegime}</div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Velocity profile</div>
                    <div style={styles.metricValue}>
                      {computed.selectedProfile === 'laminar' ? 'Parabolic' : '1/7 power'}
                    </div>
                  </div>
                </div>

                <div style={styles.chartWrap}>
                  <div style={styles.chartTitle}>Velocity across pipe cross-section</div>
                  <RadialVelocityChart
                    profile={computed.velocityProfile}
                    title="u(r)"
                    subtitle={`samples=${computed.n}`}
                  />
                  <div style={styles.chartFoot}>
                    r=0 (center) to r=R (wall). Profile is scaled to match the computed average velocity.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {result ? (
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Latest Result</h3>

            {localPreview ? (
              <>
                <div style={styles.pipeVizWrap}>
                  <div style={styles.pipeVizHeader}>
                    <div style={styles.pipeVizTitle}>Pipe Visual</div>
                    <div style={styles.pipeVizMeta}>
                      u={localPreview?.metrics?.average_velocity_m_s
                        ? Number(localPreview.metrics.average_velocity_m_s).toFixed(2)
                        : '—'}{' '}
                      m/s • D=
                      {localPreview?.inputs?.pipe?.inner_diameter_m
                        ? Number(localPreview.inputs.pipe.inner_diameter_m).toFixed(3)
                        : '—'}{' '}
                      m
                    </div>
                  </div>
                  <PipeVisualization
                    diameterM={Number(localPreview?.inputs?.pipe?.inner_diameter_m) || 0}
                    lengthM={Number(localPreview?.inputs?.pipe?.length_m) || 0}
                    regime={localPreview?.metrics?.flow_regime || 'unknown'}
                    velocityMps={Number(localPreview?.metrics?.average_velocity_m_s) || 0}
                    pressureDropPa={Number(localPreview?.metrics?.pressure_drop_Pa) || 0}
                  />
                </div>

                <div style={styles.metricsGrid}>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Average velocity</div>
                    <div style={styles.metricValue}>
                      {Number(localPreview?.metrics?.average_velocity_m_s).toFixed(4)} m/s
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Reynolds number</div>
                    <div style={styles.metricValue}>
                      {isFinite(Number(localPreview?.metrics?.reynolds_number))
                        ? Number(localPreview.metrics.reynolds_number).toFixed(0)
                        : '—'}
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Friction factor (Darcy)</div>
                    <div style={styles.metricValue}>
                      {isFinite(Number(localPreview?.metrics?.friction_factor_darcy))
                        ? Number(localPreview.metrics.friction_factor_darcy).toFixed(5)
                        : '—'}
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Pressure drop</div>
                    <div style={styles.metricValue}>
                      {isFinite(Number(localPreview?.metrics?.pressure_drop_Pa))
                        ? `${(Number(localPreview.metrics.pressure_drop_Pa) / 1000).toFixed(3)} kPa`
                        : '—'}
                    </div>
                  </div>
                </div>

                {Array.isArray(localPreview?.velocity_profile) && localPreview.velocity_profile.length > 0 ? (
                  <div style={styles.chartWrap}>
                    <div style={styles.chartTitle}>Velocity across pipe cross-section</div>
                    <RadialVelocityChart
                      profile={localPreview.velocity_profile}
                      title="u(r)"
                      subtitle={`samples=${localPreview?.inputs?.cross_section?.samples || localPreview.velocity_profile.length}`}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {backendResponse?.results ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#1f2a44', marginBottom: 8 }}>
                  Backend output (placeholder)
                </div>
                <div style={styles.metricsGrid}>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Mean</div>
                    <div style={styles.metricValue}>
                      {isFinite(Number(backendResponse.results.mean)) ? Number(backendResponse.results.mean).toFixed(4) : '—'}
                    </div>
                  </div>
                  <div style={styles.metric}>
                    <div style={styles.metricLabel}>Median</div>
                    <div style={styles.metricValue}>
                      {isFinite(Number(backendResponse.results.median)) ? Number(backendResponse.results.median).toFixed(4) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  badge: {
    fontSize: '12px',
    padding: '6px 10px',
    borderRadius: '999px',
    backgroundColor: '#eef2ff',
    color: '#3949ab',
    fontWeight: 700,
  },
  backButton: {
    padding: '10px 14px',
    backgroundColor: '#1a1a1a',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
  },
  main: {
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: 'white',
    padding: '28px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    marginBottom: '20px',
  },
  title: {
    fontSize: '26px',
    margin: '0 0 8px 0',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: '14px',
    margin: '0 0 22px 0',
    color: '#6c757d',
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 800,
    margin: '0 0 12px 0',
    color: '#1a1a1a',
  },
  formRow: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #dee2e6',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: '240px',
    padding: '12px 14px',
    border: '1px solid #dee2e6',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    outline: 'none',
    resize: 'vertical',
  },
  hint: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#6c757d',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
  primaryButton: {
    padding: '12px 18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 800,
  },
  error: {
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '10px',
  },
  pre: {
    margin: 0,
    padding: '14px',
    backgroundColor: '#0b1020',
    color: '#e6edf3',
    borderRadius: '12px',
    overflowX: 'auto',
    fontSize: '12px',
    lineHeight: 1.5,
  },
  hero: {
    padding: '26px 28px',
    borderRadius: '16px',
    background:
      'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%)',
    border: '1px solid rgba(102,126,234,0.18)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    marginBottom: '18px',
  },
  heroTitle: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#1a1a1a',
    marginBottom: '6px',
  },
  heroSubtitle: {
    fontSize: '13px',
    color: '#5e6a7a',
    lineHeight: 1.6,
    maxWidth: 840,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '520px 1fr',
    gap: '18px',
  },
  section: {
    marginTop: '18px',
    backgroundColor: '#fcfcff',
    border: '1px solid #eef0f6',
    borderRadius: '12px',
    padding: '14px',
  },
  sectionHeader: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#1f2a44',
    marginBottom: '12px',
  },
  twoCols: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  formRowSmall: {
    marginBottom: '10px',
  },
  labelSm: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 800,
    color: '#2a3553',
    marginBottom: '6px',
  },
  note: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
    lineHeight: 1.5,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '6px',
  },
  smallHint: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: 700,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '8px',
  },
  checkboxText: {
    fontSize: '13px',
    color: '#2a3553',
    fontWeight: 700,
  },
  previewPlaceholder: {
    padding: '14px 0',
    color: '#6c757d',
    fontSize: '13px',
    lineHeight: 1.6,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    marginTop: '10px',
    marginBottom: '12px',
  },
  metric: {
    backgroundColor: '#f8f9ff',
    border: '1px solid #eef0f6',
    borderRadius: '12px',
    padding: '12px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: 800,
    marginBottom: '6px',
  },
  metricValue: {
    fontSize: '15px',
    color: '#1a1a1a',
    fontWeight: 900,
    lineHeight: 1.2,
    wordBreak: 'break-word',
  },
  chartWrap: {
    backgroundColor: '#fcfcff',
    border: '1px solid #eef0f6',
    borderRadius: '12px',
    padding: '14px',
    marginTop: '12px',
  },
  chartTitle: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#1f2a44',
    marginBottom: '8px',
  },
  chartFoot: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '8px',
    lineHeight: 1.5,
  },
  pipeVizWrap: {
    backgroundColor: '#fcfcff',
    border: '1px solid #eef0f6',
    borderRadius: '12px',
    padding: '14px',
    marginTop: '8px',
  },
  pipeVizHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: '10px',
    alignItems: 'baseline',
  },
  pipeVizTitle: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#1f2a44',
  },
  pipeVizMeta: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: 800,
    textAlign: 'right',
  },
  pipeVizSvg: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  realtimeCanvasWrap: {
    background: 'linear-gradient(180deg, rgba(11,16,32,0.75) 0%, rgba(11,16,32,0.25) 100%)',
    borderRadius: '14px',
    border: '1px solid rgba(102,126,234,0.22)',
    overflow: 'hidden',
    height: '360px',
    position: 'relative',
    marginTop: '8px',
  },
  sliderBlock: {
    padding: '12px 12px',
    borderRadius: '12px',
    backgroundColor: '#fcfcff',
    border: '1px solid #eef0f6',
    marginBottom: '12px',
  },
  sliderTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#1f2a44',
  },
  sliderValue: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#6c757d',
  },
  sliderRange: {
    width: '100%',
  },
};

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  formatValue?: (v: number) => string;
}) {
  const valueText = formatValue ? formatValue(value) : String(value);

  return (
    <div style={styles.sliderBlock}>
      <div style={styles.sliderTop}>
        <div style={styles.sliderLabel}>{label}</div>
        <div style={styles.sliderValue}>{valueText}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.sliderRange}
        aria-disabled={disabled}
      />
    </div>
  );
}

function RealTimeTubeSim({
  diameterM,
  lengthM,
  regime,
  velocityMps,
  pressureDropPa,
  profileMode,
}: {
  diameterM: number;
  lengthM: number;
  regime: string;
  velocityMps: number;
  pressureDropPa: number;
  profileMode: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const paramsRef = useRef({
    diameterM,
    lengthM,
    regime,
    velocityMps,
    pressureDropPa,
    profileMode,
  });

  useEffect(() => {
    paramsRef.current = {
      diameterM,
      lengthM,
      regime,
      velocityMps,
      pressureDropPa,
      profileMode,
    };
  }, [diameterM, lengthM, regime, velocityMps, pressureDropPa, profileMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const resizeObserver = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    });

    const parent = canvas.parentElement;
    if (parent) resizeObserver.observe(parent);

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
      const n = parseInt(full, 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return { r, g, b };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const mixRgb = (a: string, b: string, t: number, alpha = 1) => {
      const A = hexToRgb(a);
      const B = hexToRgb(b);
      const r = lerp(A.r, B.r, t);
      const g = lerp(A.g, B.g, t);
      const bb = lerp(A.b, B.b, t);
      return `rgba(${r.toFixed(0)},${g.toFixed(0)},${bb.toFixed(0)},${alpha})`;
    };
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    const pointOnQuad = (xA: number, yA: number, xC: number, yC: number, xB: number, yB: number, t: number) => {
      const u = 1 - t;
      const x = u * u * xA + 2 * u * t * xC + t * t * xB;
      const y = u * u * yA + 2 * u * t * yC + t * t * yB;
      return { x, y };
    };

    const quadDeriv = (xA: number, yA: number, xC: number, yC: number, xB: number, yB: number, t: number) => {
      // P'(t) for quadratic Bezier
      const u = 1 - t;
      const dx = 2 * u * (xC - xA) + 2 * t * (xB - xC);
      const dy = 2 * u * (yC - yA) + 2 * t * (yB - yC);
      return { dx, dy };
    };

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);

      const { diameterM, lengthM, regime, velocityMps, pressureDropPa, profileMode } = paramsRef.current;
      const parent = canvas.parentElement;
      const wCss = parent ? parent.getBoundingClientRect().width : canvas.width / dpr;
      const hCss = parent ? parent.getBoundingClientRect().height : canvas.height / dpr;
      const w = Math.max(1, wCss);
      const h = Math.max(1, hCss);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, 'rgba(2,6,23,0.90)');
      bg.addColorStop(1, 'rgba(2,6,23,0.35)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = 'rgba(102,126,234,0.25)';
      ctx.lineWidth = 1;
      const gridStep = Math.max(30, Math.round(w / 18));
      for (let gx = 0; gx <= w; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const intensity = clamp01((velocityMps - 0.03) / 3.5); // 0..1
      const dpKPa = Math.max(0, pressureDropPa / 1000);
      const dpNorm = clamp01(dpKPa / 50);

      const regimeColor =
        regime === 'laminar'
          ? '#5b7cfa'
          : regime === 'transition'
            ? '#8c4bff'
            : regime === 'turbulent'
              ? '#f97316'
              : '#94a3b8';

      const cool = '#60a5fa';
      const tNow = ts / 1000;
      const speed = (0.10 + 0.55 * intensity) * (0.4 + Math.min(2, lengthM / 10));
      const waveCenter = (tNow * speed + 0.1) % 1;

      // Tube geometry mapped to canvas
      const xA = w * 0.10;
      const xB = w * 0.93;
      const y = h * 0.55;
      const xC = (xA + xB) / 2;
      const yC = y - h * (0.09 + 0.05 * intensity);

      const dClamped = Math.max(0.02, Math.min(0.9, diameterM));
      const radiusOuter = Math.max(8, (dClamped / 0.9) * (h * 0.22));
      const radiusBore = radiusOuter * 0.58;

      // Tube shell
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 18 + 35 * intensity;
      ctx.shadowColor = mixRgb(cool, regimeColor, 0.65, 1);

      ctx.strokeStyle = mixRgb(cool, regimeColor, 0.35 + 0.55 * dpNorm, 0.25);
      ctx.lineWidth = radiusOuter * 1.45;
      ctx.beginPath();
      ctx.moveTo(xA, y);
      ctx.quadraticCurveTo(xC, yC, xB, y);
      ctx.stroke();

      ctx.strokeStyle = mixRgb(cool, regimeColor, 0.55 + 0.35 * intensity, 0.55);
      ctx.lineWidth = radiusOuter * 1.08;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(xA, y);
      ctx.quadraticCurveTo(xC, yC, xB, y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(2,6,23,0.65)';
      ctx.lineWidth = radiusBore * 0.95;
      ctx.beginPath();
      ctx.moveTo(xA, y);
      ctx.quadraticCurveTo(xC, yC, xB, y);
      ctx.stroke();
      ctx.restore();

      // Volume-ish slices
      const slices = 30;
      const bands = 3; // radial bands

      for (let i = 0; i < slices; i++) {
        const t = (i + 0.5) / slices;
        const p = pointOnQuad(xA, y, xC, yC, xB, y, t);
        const d = quadDeriv(xA, y, xC, yC, xB, y, t);
        const angle = Math.atan2(d.dy, d.dx);

        const axialDist = Math.abs(t - waveCenter);
        const axialBand = 0.10 + 0.16 * (0.3 + intensity * 0.7);
        const brightness = clamp01(1 - axialDist / axialBand);

        const axialBoost = 0.35 + 0.65 * brightness;

        for (let b = 0; b < bands; b++) {
          const rNorm = (b + 0.35) / bands; // 0..1-ish
          let uNorm: number;
          if (profileMode === 'laminar') {
            uNorm = clamp01(1 - rNorm * rNorm);
          } else {
            // treat as turbulent-ish
            uNorm = clamp01(Math.pow(1 - rNorm, 1 / 7));
          }

          const alpha = (0.08 + 0.22 * uNorm) * axialBoost * (0.35 + 0.65 * dpNorm);
          const colorMix = clamp01(0.25 * dpNorm + 0.55 * intensity + 0.25 * uNorm);
          const fill = mixRgb(cool, regimeColor, colorMix, alpha);

          const rx = radiusBore * (0.18 + 0.28 * rNorm);
          const ry = radiusBore * (0.08 + 0.18 * rNorm);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.scale(1, 0.65);
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.restore();
        }
      }

      // Tiny “contour” lines
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = 'rgba(102,126,234,0.55)';
      ctx.lineWidth = 1;
      const rings = 5;
      for (let b = 0; b < rings; b++) {
        const rr = radiusBore * (0.18 + b * 0.16);
        for (let i = 0; i < 6; i++) {
          const t = (i + 1) / 7;
          const p = pointOnQuad(xA, y, xC, yC, xB, y, t);
          const d = quadDeriv(xA, y, xC, yC, xB, y, t);
          const angle = Math.atan2(d.dy, d.dx);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.scale(1, 0.65);
          ctx.beginPath();
          ctx.ellipse(0, 0, rr, rr * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label="Real-time cylindrical airflow simulation"
      role="img"
    />
  );
}

function PipeVisualization({
  diameterM,
  lengthM,
  regime,
  velocityMps,
  pressureDropPa,
}: {
  diameterM: number;
  lengthM: number;
  regime: string;
  velocityMps: number;
  pressureDropPa: number;
}) {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

  const w = 420;
  const h = 180;

  const xStart = 70;
  const y = 92;
  const lengthPortion = clamp01(lengthM / 30); // 0..1
  const xEnd = xStart + (w - 2 * xStart) * clamp(0.35 + 0.65 * lengthPortion, 0.35, 1);

  const dClamped = clamp(diameterM, 0.05, 0.8);
  const outerStroke = 10 + ((dClamped - 0.05) / (0.8 - 0.05)) * 24; // ~10..34
  const innerStroke = Math.max(outerStroke - 6, 6);

  const intensity = clamp01((velocityMps - 0.05) / 8); // ~0..1 for typical ventilation
  const particlesBase = regime === 'laminar' ? 7 : regime === 'transition' ? 10 : 14;
  const particlesCount = particlesBase + Math.round(intensity * (regime === 'turbulent' ? 10 : 7));

  const regimeColor =
    regime === 'laminar'
      ? '#5b7cfa'
      : regime === 'transition'
        ? '#8c4bff'
        : regime === 'turbulent'
          ? '#f97316'
          : '#94a3b8';

  const dashDurationS = Math.max(0.7, 5.5 - intensity * 4.5);

  // Quadratic curve control point (gives depth so it feels like a “real” pipe).
  const xA = xStart;
  const yA = y;
  const xC = (xStart + xEnd) / 2;
  const yC = y - 14 - intensity * 6;
  const xB = xEnd;
  const yB = y;

  const pathD = `M ${xA} ${yA} Q ${xC} ${yC} ${xB} ${yB}`;

  const pointOnQuad = (t: number) => {
    // B(t) = (1-t)^2*A + 2(1-t)*t*C + t^2*B
    const u = 1 - t;
    const x = u * u * xA + 2 * u * t * xC + t * t * xB;
    const yy = u * u * yA + 2 * u * t * yC + t * t * yB;
    return { x, y: yy };
  };

  const opacity = regime === 'laminar' ? 0.55 : regime === 'transition' ? 0.7 : 0.85;

  const kPa = pressureDropPa / 1000;

  // Flow particles spacing: bias slightly toward the inlet for “directional” feel.
  const particles = Array.from({ length: particlesCount }, (_, i) => {
    const t = (i + 0.5) / particlesCount;
    const tBias = Math.pow(t, 0.85);
    const p = pointOnQuad(tBias);
    const r = 1.6 + intensity * (regime === 'laminar' ? 2.2 : 3.2) * (0.35 + 0.65 * (1 - t));
    const alpha = 0.18 + intensity * 0.65 * (1 - t * 0.95);
    return { ...p, r, alpha };
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={styles.pipeVizSvg}
        role="img"
        aria-label="Pipe visualization"
      >
        <defs>
          <linearGradient id="pipeGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={regimeColor} stopOpacity="0.85" />
            <stop offset="0.7" stopColor={regimeColor} stopOpacity="0.25" />
            <stop offset="1" stopColor="#94a3b8" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="dashGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor={regimeColor} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Outer shell */}
        <path d={pathD} stroke="#e5e7eb" strokeWidth={outerStroke + 5} strokeLinecap="round" opacity="0.35" fill="none" />
        {/* Inner “pipe” */}
        <path d={pathD} stroke="url(#pipeGlow)" strokeWidth={outerStroke} strokeLinecap="round" opacity={opacity} fill="none" />
        {/* Inner bore */}
        <path d={pathD} stroke="#0b1020" strokeWidth={innerStroke} strokeLinecap="round" opacity="0.22" fill="none" />

        {/* Inlet/outlet */}
        <circle cx={xA} cy={yA} r={outerStroke * 0.46} fill={regimeColor} opacity={0.16} />
        <circle cx={xB} cy={yB} r={outerStroke * 0.46} fill={regimeColor} opacity={0.16} />

        {/* Flow direction cue */}
        <g>
          <style>
            {`
              .pipeFlowDash {
                stroke-dasharray: 7 10;
                animation: pipeDash ${dashDurationS}s linear infinite;
              }
              @keyframes pipeDash {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: -120; }
              }
            `}
          </style>
          <path
            d={pathD}
            stroke="url(#dashGlow)"
            strokeWidth={Math.max(3, innerStroke * 0.25)}
            strokeLinecap="round"
            fill="none"
            className="pipeFlowDash"
            opacity={0.9}
          />
        </g>

        {/* Particles along the pipe */}
        {particles.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={p.r} fill={regimeColor} opacity={p.alpha} />
        ))}

        {/* Labels */}
        <text x={xStart} y={30} fontSize="12" fill="#1f2a44" fontWeight={900}>
          L={lengthM.toFixed(1)}m
        </text>
        <text x={xStart} y={46} fontSize="11" fill="#6c757d" fontWeight={800}>
          D={diameterM.toFixed(3)}m
        </text>
        <text x={xStart} y={62} fontSize="11" fill="#6c757d" fontWeight={800}>
          dp={isFinite(kPa) ? kPa.toFixed(3) : '—'} kPa
        </text>
        <text x={xEnd} y={62} fontSize="11" fill="#6c757d" fontWeight={800} textAnchor="end">
          {regime}
        </text>
      </svg>
    </div>
  );
}

function RadialVelocityChart({
  profile,
  title,
  subtitle,
}: {
  profile: Array<{ rNorm: number; u: number }>;
  title: string;
  subtitle?: string;
}) {
  const w = 360;
  const h = 180;
  const pad = 18;

  const maxU = Math.max(...profile.map((p) => p.u), 0);
  const scaleY = (u: number) => {
    if (maxU <= 0) return h - pad;
    const t = u / maxU;
    return (h - pad) - t * (h - 2 * pad);
  };
  const scaleX = (rNorm: number) => pad + rNorm * (w - 2 * pad);

  const pts = profile.map((p) => ({ x: scaleX(p.rNorm), y: scaleY(p.u) }));

  const line = pts
    .map((p, idx) => {
      const cmd = idx === 0 ? 'M' : 'L';
      return `${cmd} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    })
    .join(' ');

  const area = `M ${pad} ${h - pad} ${pts.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')} L ${w - pad} ${
    h - pad
  } Z`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#1f2a44' }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: '#6c757d', fontWeight: 800 }}>{subtitle}</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="velFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#667eea" stopOpacity="0.35" />
            <stop offset="1" stopColor="#764ba2" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Axes */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e6e8ef" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e6e8ef" strokeWidth="1" />

        {/* Area + line */}
        <path d={area} fill="url(#velFill)" />
        <path d={line} fill="none" stroke="#667eea" strokeWidth="2.5" strokeLinecap="round" />

        {/* Wall/center labels */}
        <text x={pad} y={h - 4} fontSize="10" fill="#6c757d" fontWeight={800}>
          r=0
        </text>
        <text x={w - pad} y={h - 4} fontSize="10" fill="#6c757d" fontWeight={800} textAnchor="end">
          r=R
        </text>
      </svg>
    </div>
  );
}

